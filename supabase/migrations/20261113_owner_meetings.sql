-- Two kinds of admin: the developer (everything) and the owner (his business, no prospecting system).
alter table public.admins add column role text not null default 'developer' check (role in ('developer','owner'));

create or replace function public.is_developer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()) and role = 'developer');
$$;
revoke all on function public.is_developer from public, anon;
grant execute on function public.is_developer to authenticated;

-- The prospect database, call history and callers are the developer's only
drop policy "admins all" on public.prospects;
create policy "developer all" on public.prospects for all to authenticated
  using ((select public.is_developer())) with check ((select public.is_developer()));
drop policy "admins all" on public.prospect_activities;
create policy "developer all" on public.prospect_activities for all to authenticated
  using ((select public.is_developer())) with check ((select public.is_developer()));
drop policy "admins all" on public.callers;
create policy "developer all" on public.callers for all to authenticated
  using ((select public.is_developer())) with check ((select public.is_developer()));

create or replace function public.create_caller(p_login text, p_name text, p_password text, p_countries text[], p_language text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(p_login) || '@callers.wavinvest.eu';
begin
  if not public.is_developer() then raise exception 'forbidden'; end if;
  if length(p_password) < 8 then raise exception 'password too short'; end if;
  if exists (select 1 from auth.users where email = v_email) then raise exception 'login taken'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change,
    created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('name', p_name, 'caller', true), '', '', '', '',
    now(), now());
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), now(), now(), now());
  insert into public.callers (user_id, login, name, countries, language)
  values (v_id, lower(p_login), p_name, p_countries, p_language);
  return v_id;
end $$;

create or replace function public.set_caller_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_developer() then raise exception 'forbidden'; end if;
  if length(p_password) < 8 then raise exception 'password too short'; end if;
  if not exists (select 1 from public.callers where user_id = p_user) then raise exception 'not a caller'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
  where id = p_user;
end $$;

create or replace function public.set_caller_active(p_user uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_developer() then raise exception 'forbidden'; end if;
  update public.callers set active = p_active where user_id = p_user;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end where id = p_user;
  if not p_active then
    update public.prospects set claimed_by = null, claimed_at = null where claimed_by = p_user;
  end if;
end $$;

-- Meetings the owner goes to. Company details are copied in, so he never needs the prospect database.
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  address text,
  lat double precision,
  lng double precision,
  contact_name text,
  contact_phone text,
  pallets_per_month int,
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 15 and 480),
  notes text,
  status text not null default 'planned' check (status in ('planned','done','cancelled')),
  result text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meetings_starts_idx on public.meetings(starts_at);
alter table public.meetings enable row level security;
create policy "admins all" on public.meetings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- A meeting booked from a prospect (developer or caller): copies what the owner needs
create or replace function private.book_meeting(p_prospect uuid, p_starts timestamptz, p_note text, p_by uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.meetings (prospect_id, title, address, lat, lng, contact_name, contact_phone, pallets_per_month,
    starts_at, notes, created_by)
  select p.id, p.name,
    nullif(concat_ws(', ', p.street, nullif(concat_ws(' ', p.postal_code, p.city), ''), p.country), ''),
    p.lat, p.lng,
    nullif(concat_ws(' · ', p.contact_name, p.contact_role), ''),
    coalesce(p.contact_phone, p.phone), p.pallets_per_month, p_starts, nullif(trim(p_note), ''), p_by
  from public.prospects p where p.id = p_prospect
  returning id into v_id;
  return v_id;
end $$;
revoke all on function private.book_meeting from public, anon, authenticated;

-- Callers: a meeting outcome can carry a time and then lands in the owner's calendar
drop function public.caller_log(uuid, text, date, text, text, text, text, int, text, boolean, text);
create or replace function public.caller_log(
  p_id uuid, p_outcome text, p_next date, p_contact_name text, p_contact_role text, p_contact_phone text,
  p_contact_email text, p_pallets int, p_supplier text, p_email_consent boolean, p_note text, p_time text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_countries text[];
  v_status text;
  v_next date;
  v_attempts int;
begin
  select countries into v_countries from public.callers where user_id = v_me and active;
  if v_countries is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.prospects where id = p_id and country = any(v_countries)) then
    raise exception 'forbidden';
  end if;
  if p_outcome not in ('no_answer','call_back','interested','meeting','not_interested','wrong_number') then
    raise exception 'invalid outcome';
  end if;
  if p_outcome in ('call_back','meeting') and p_next is null then raise exception 'date required'; end if;
  if p_time is not null and p_time !~ '^[0-2][0-9]:[0-5][0-9]$' then raise exception 'invalid time'; end if;

  select call_attempts + 1 into v_attempts from public.prospects where id = p_id;
  v_status := case p_outcome
    when 'no_answer' then case when v_attempts >= 4 then 'unreachable' else 'to_call' end
    when 'call_back' then 'to_call'
    when 'interested' then 'interested'
    when 'meeting' then 'meeting'
    when 'not_interested' then 'not_interested'
    else 'unreachable' end;
  v_next := case p_outcome
    when 'no_answer' then current_date + 2
    when 'interested' then coalesce(p_next, current_date + 1)
    when 'call_back' then p_next
    when 'meeting' then p_next
    else null end;
  if v_status = 'unreachable' then v_next := null; end if;

  insert into public.prospect_activities (prospect_id, kind, outcome, note, user_id)
  values (p_id, 'call', p_outcome, nullif(left(trim(coalesce(p_note, '')), 2000), ''), v_me);

  update public.prospects set
    status = v_status,
    next_action = v_next,
    call_attempts = v_attempts,
    contact_name = coalesce(nullif(left(trim(p_contact_name), 120), ''), contact_name),
    contact_role = coalesce(nullif(left(trim(p_contact_role), 120), ''), contact_role),
    contact_phone = coalesce(nullif(left(trim(p_contact_phone), 50), ''), contact_phone),
    contact_email = coalesce(nullif(lower(left(trim(p_contact_email), 200)), ''), contact_email),
    pallets_per_month = coalesce(p_pallets, pallets_per_month),
    current_supplier = coalesce(nullif(left(trim(p_supplier), 200), ''), current_supplier),
    email_consent_at = case when p_email_consent then coalesce(email_consent_at, now()) else email_consent_at end,
    claimed_by = null, claimed_at = null,
    updated_at = now()
  where id = p_id;

  if p_outcome = 'meeting' then
    perform private.book_meeting(p_id,
      ((p_next + coalesce(p_time, '10:00')::time) at time zone 'Europe/Bratislava'),
      p_note, v_me);
  end if;
end $$;
revoke all on function public.caller_log from public, anon;
grant execute on function public.caller_log to authenticated;

-- The developer books a meeting from a prospect's page
create or replace function public.book_prospect_meeting(p_prospect uuid, p_starts timestamptz, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_developer() then raise exception 'forbidden'; end if;
  update public.prospects set status = 'meeting', next_action = (p_starts at time zone 'Europe/Bratislava')::date, updated_at = now()
  where id = p_prospect;
  return private.book_meeting(p_prospect, p_starts, p_note, (select auth.uid()));
end $$;
revoke all on function public.book_prospect_meeting from public, anon;
grant execute on function public.book_prospect_meeting to authenticated;

-- Each role can only put its own tabs in the menu
create or replace function public.set_admin_menu(p_menu text[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_role text;
begin
  select role into v_role from public.admins where user_id = (select auth.uid());
  if v_role is null then raise exception 'forbidden'; end if;
  if exists (select 1 from unnest(p_menu) m where m not in (
    select unnest(case when v_role = 'owner'
      then array['overview','customers','quotes','invoices','mail','products','meetings']
      else array['overview','customers','prospects','quotes','invoices','mail','products','callers','meetings'] end)
  )) then
    raise exception 'invalid menu item';
  end if;
  update public.admins set menu = p_menu where user_id = (select auth.uid());
end;
$$;

-- The owner's account (created once; password set by the developer, changeable in Settings)
-- insert into auth.users … email info@wavinvest.sk; insert into public.admins (user_id, name, role) values (…, 'Owner', 'owner');
