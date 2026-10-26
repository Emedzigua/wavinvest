-- Admin accounts: only users listed here can read or change anything
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Global price list (single row)
create table public.settings (
  id int primary key default 1 check (id = 1),
  price_epal numeric(10,2) not null default 0,
  price_collars numeric(10,2) not null default 0,
  vat_rate numeric(5,2) not null default 23,
  currency text not null default 'EUR',
  -- [{ "min_qty": 500, "percent": 3 }, ...]
  discount_tiers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  street text,
  city text,
  postal_code text,
  country text,
  lat double precision,
  lng double precision,
  status text not null default 'inactive' check (status in ('active','inactive','lost')),
  source text not null default 'manual' check (source in ('manual','quote')),
  language text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);
create index contacts_customer_idx on public.contacts(customer_id);
create index contacts_email_idx on public.contacts(lower(email));

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product text not null check (product in ('epal','collars')),
  monthly_qty int not null check (monthly_qty > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  start_date date not null default current_date,
  end_date date,
  -- weekly: on weekdays; biweekly: on weekdays every 2nd week; monthly: on month_day
  schedule text not null default 'weekly' check (schedule in ('weekly','biweekly','monthly')),
  weekdays int[] not null default '{}',
  month_day int check (month_day between 1 and 31),
  notes text,
  created_at timestamptz not null default now()
);
create index contracts_customer_idx on public.contracts(customer_id);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  company text not null,
  email text not null,
  phone text,
  product text not null check (product in ('epal','collars','mixed')),
  quantity int not null check (quantity > 0),
  delivery_location text not null,
  message text,
  language text not null default 'en',
  status text not null default 'new' check (status in ('new','replied','won','lost')),
  created_at timestamptz not null default now(),
  replied_at timestamptz
);
create index quotes_customer_idx on public.quotes(customer_id);
create index quotes_status_idx on public.quotes(status, created_at desc);

-- Row level security: admins only
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.customers enable row level security;
alter table public.contacts enable row level security;
alter table public.contracts enable row level security;
alter table public.quotes enable row level security;

create policy "admins read admins" on public.admins for select to authenticated using ((select public.is_admin()));
create policy "admins all" on public.settings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins all" on public.customers for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins all" on public.contacts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins all" on public.contracts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins all" on public.quotes for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Public quote form: the only thing visitors can do. Saves the request and
-- links it to an existing customer (same contact email or company name)
-- or creates a new inactive one.
create or replace function public.submit_quote(
  p_name text, p_company text, p_email text, p_phone text, p_product text,
  p_quantity int, p_location text, p_message text, p_language text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_customer uuid;
  v_quote uuid;
begin
  if length(coalesce(p_name,'')) not between 1 and 200
     or length(coalesce(p_company,'')) not between 1 and 200
     or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200
     or length(coalesce(p_location,'')) not between 1 and 300
     or length(coalesce(p_message,'')) > 5000
     or length(coalesce(p_phone,'')) > 50
     or p_quantity not between 1 and 10000000 then
    raise exception 'invalid quote';
  end if;

  select c.customer_id into v_customer from public.contacts c
    where lower(c.email) = lower(p_email) limit 1;
  if v_customer is null then
    select id into v_customer from public.customers
      where lower(company_name) = lower(trim(p_company)) limit 1;
  end if;

  if v_customer is null then
    insert into public.customers (company_name, city, status, source, language)
      values (trim(p_company), trim(p_location), 'inactive', 'quote', p_language)
      returning id into v_customer;
  end if;

  if not exists (select 1 from public.contacts where customer_id = v_customer and lower(email) = lower(p_email)) then
    insert into public.contacts (customer_id, name, phone, email)
      values (v_customer, trim(p_name), nullif(trim(p_phone),''), lower(trim(p_email)));
  end if;

  insert into public.quotes (customer_id, name, company, email, phone, product, quantity, delivery_location, message, language)
    values (v_customer, trim(p_name), trim(p_company), lower(trim(p_email)), nullif(trim(p_phone),''),
            p_product, p_quantity, trim(p_location), nullif(trim(p_message),''), coalesce(p_language,'en'))
    returning id into v_quote;
  return v_quote;
end;
$$;

revoke all on function public.submit_quote from public;
grant execute on function public.submit_quote to anon, authenticated;
revoke all on function public.is_admin from public;
revoke execute on function public.is_admin from anon;
grant execute on function public.is_admin to authenticated;
