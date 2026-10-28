-- Phones/browsers of admins that want a notification for new quote requests
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  keys jsonb not null,
  device text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "admins all" on public.push_subscriptions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Web-push signing keys (VAPID), generated once with `web-push generate-vapid-keys`.
-- The private key never leaves the database/server side.
create table private.push_config (id int primary key default 1 check (id = 1), public_key text not null, private_key text not null);
-- insert into private.push_config (public_key, private_key) values ('<public>', '<private>');

create or replace function public.push_targets(p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from private.app_secrets
    where name = 'quote_form' and sha256 = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  ) then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'config', (select to_jsonb(c) - 'id' from private.push_config c),
    'subscriptions', coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'keys', keys)) from public.push_subscriptions), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.push_targets from public;
grant execute on function public.push_targets to anon, authenticated;

create or replace function public.push_config_admin()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return (select to_jsonb(c) - 'id' from private.push_config c);
end;
$$;
revoke all on function public.push_config_admin from public, anon;
grant execute on function public.push_config_admin to authenticated;

create or replace function public.drop_push_subscription(p_secret text, p_endpoint text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from private.app_secrets
    where name = 'quote_form' and sha256 = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  ) then
    raise exception 'forbidden';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;
revoke all on function public.drop_push_subscription from public;
grant execute on function public.drop_push_subscription to anon, authenticated;
