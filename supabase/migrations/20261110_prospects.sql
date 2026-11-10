-- Potential customers found in public data (OpenStreetMap, later registers)
create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'osm',
  source_id text not null unique,
  country text not null check (country in ('PL','SK','CZ','HU','AT')),
  name text not null,
  sector text not null default 'other',
  street text,
  city text,
  postal_code text,
  lat double precision not null,
  lng double precision not null,
  nearest_depot text,
  distance_km int,
  website text,
  phone text,
  email text,
  score int not null default 0,
  status text not null default 'new'
    check (status in ('new','to_call','called','interested','meeting','customer','not_interested','unreachable')),
  next_action date,
  contact_name text,
  contact_role text,
  contact_phone text,
  contact_email text,
  notes text,
  customer_id uuid references public.customers(id) on delete set null,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prospects_country_score_idx on public.prospects(country, score desc);
create index prospects_status_idx on public.prospects(status);
create index prospects_next_action_idx on public.prospects(next_action) where next_action is not null;

create table public.prospect_activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  kind text not null check (kind in ('call','visit','email','note')),
  outcome text,
  note text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index prospect_activities_prospect_idx on public.prospect_activities(prospect_id, created_at desc);

alter table public.prospects enable row level security;
alter table public.prospect_activities enable row level security;
create policy "admins all" on public.prospects for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins all" on public.prospect_activities for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.prospect_summary()
returns table (country text, status text, n bigint)
language sql stable security invoker set search_path = '' as $$
  select country, status, count(*) from public.prospects group by 1, 2;
$$;
revoke all on function public.prospect_summary from public, anon;
grant execute on function public.prospect_summary to authenticated;
