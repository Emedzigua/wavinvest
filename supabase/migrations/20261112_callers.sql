-- Callers: people who phone prospects in the countries assigned to them.
-- They sign in with a short login name (stored as <login>@callers.wavinvest.eu) and only
-- ever reach prospects through the security-definer functions below, never the tables.

create table public.callers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login text not null unique check (login ~ '^[a-z0-9._-]{2,32}$'),
  name text not null,
  countries text[] not null default '{}',
  language text not null default 'sk' check (language in ('sk','cs','pl','de','hu','en')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.callers enable row level security;
create policy "admins all" on public.callers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "caller reads self" on public.callers for select to authenticated
  using (user_id = (select auth.uid()));

-- What the call found out, and who is calling a company right now
alter table public.prospects
  add column pallets_per_month int,
  add column current_supplier text,
  add column email_consent_at timestamptz,
  add column call_attempts int not null default 0,
  add column claimed_by uuid references auth.users(id) on delete set null,
  add column claimed_at timestamptz;
create index prospects_queue_idx on public.prospects(country, status, score desc) where phone is not null;

create or replace function public.is_caller()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.callers where user_id = (select auth.uid()) and active);
$$;
revoke all on function public.is_caller from public, anon;
grant execute on function public.is_caller to authenticated;

-- Admin creates a caller account
create or replace function public.create_caller(p_login text, p_name text, p_password text, p_countries text[], p_language text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(p_login) || '@callers.wavinvest.eu';
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
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
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if length(p_password) < 8 then raise exception 'password too short'; end if;
  if not exists (select 1 from public.callers where user_id = p_user) then raise exception 'not a caller'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
  where id = p_user;
end $$;

-- Switching a caller off also blocks the login itself
create or replace function public.set_caller_active(p_user uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.callers set active = p_active where user_id = p_user;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end where id = p_user;
  if not p_active then
    update public.prospects set claimed_by = null, claimed_at = null where claimed_by = p_user;
  end if;
end $$;

-- The company a caller should phone now: their open one, else callbacks due today, else the best new one
create or replace function public.caller_next()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_countries text[];
  v_id uuid;
begin
  select countries into v_countries from public.callers where user_id = v_me and active;
  if v_countries is null then raise exception 'forbidden'; end if;

  select id into v_id from public.prospects
  where claimed_by = v_me and claimed_at > now() - interval '30 minutes' and country = any(v_countries)
  limit 1;

  if v_id is null then
    update public.prospects set claimed_by = v_me, claimed_at = now()
    where id = (
      select id from public.prospects
      where country = any(v_countries)
        and phone is not null
        and customer_id is null
        and (status = 'new' or (status in ('to_call','called') and (next_action is null or next_action <= current_date)))
        and (claimed_by is null or claimed_at < now() - interval '30 minutes')
      order by (status <> 'new') desc, score desc
      limit 1
      for update skip locked
    )
    returning id into v_id;
  end if;
  if v_id is null then return null; end if;

  return (
    select jsonb_build_object(
      'id', p.id, 'name', p.name, 'country', p.country, 'sector', p.sector, 'street', p.street, 'city', p.city,
      'distance_km', p.distance_km, 'nearest_depot', p.nearest_depot, 'phone', p.phone, 'web_phones', p.web_phones,
      'website', p.website, 'email', p.email, 'web_emails', p.web_emails, 'web_signals', p.web_signals,
      'contact_name', p.contact_name, 'contact_role', p.contact_role, 'contact_phone', p.contact_phone,
      'contact_email', p.contact_email, 'pallets_per_month', p.pallets_per_month, 'current_supplier', p.current_supplier,
      'status', p.status, 'call_attempts', p.call_attempts,
      'history', coalesce((
        select jsonb_agg(jsonb_build_object('at', a.created_at, 'outcome', a.outcome, 'note', a.note) order by a.created_at desc)
        from (select * from public.prospect_activities where prospect_id = p.id order by created_at desc limit 5) a
      ), '[]'::jsonb)
    )
    from public.prospects p where p.id = v_id
  );
end $$;

-- What happened on the call
create or replace function public.caller_log(
  p_id uuid, p_outcome text, p_next date, p_contact_name text, p_contact_role text, p_contact_phone text,
  p_contact_email text, p_pallets int, p_supplier text, p_email_consent boolean, p_note text)
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
end $$;

-- Skip a company for now (it comes back in three days)
create or replace function public.caller_skip(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.prospects p join public.callers c on c.user_id = (select auth.uid())
                 where p.id = p_id and c.active and p.country = any(c.countries)) then
    raise exception 'forbidden';
  end if;
  update public.prospects set claimed_by = null, claimed_at = null,
    status = case when status = 'new' then 'to_call' else status end, next_action = current_date + 3
  where id = p_id;
end $$;

-- How many calls the signed-in caller made today
create or replace function public.caller_today()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.prospect_activities
  where user_id = (select auth.uid()) and created_at >= date_trunc('day', now());
$$;

revoke all on function public.create_caller, public.set_caller_password, public.set_caller_active,
  public.caller_next, public.caller_log, public.caller_skip, public.caller_today from public, anon;
grant execute on function public.create_caller, public.set_caller_password, public.set_caller_active,
  public.caller_next, public.caller_log, public.caller_skip, public.caller_today to authenticated;

-- The admin menu knows the new tab
create or replace function public.set_admin_menu(p_menu text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from unnest(p_menu) m where m not in ('overview','customers','prospects','quotes','invoices','mail','products','callers')) then
    raise exception 'invalid menu item';
  end if;
  update public.admins set menu = p_menu where user_id = (select auth.uid());
end;
$$;

-- Duplicate records share a phone number: a number already being called or worked on is not offered again
create index if not exists prospects_phone_idx on public.prospects(phone) where phone is not null;
-- (caller_next was then replaced with the same function plus this filter in its queue query:)
--   and not exists (select 1 from public.prospects q where q.phone = p.phone and q.id <> p.id
--     and (q.status <> 'new' or (q.claimed_by is not null and q.claimed_at > now() - interval '30 minutes')))
