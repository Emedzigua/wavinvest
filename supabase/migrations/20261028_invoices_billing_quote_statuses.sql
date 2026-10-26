-- Quote categories: new → opened → replied → archived
alter table public.quotes drop constraint quotes_status_check;
update public.quotes set status = 'archived' where status in ('won', 'lost');
alter table public.quotes add constraint quotes_status_check check (status in ('new','opened','replied','archived'));

-- Company tax IDs for invoices
alter table public.customers
  add column ico text,
  add column dic text,
  add column ic_dph text;

-- Our billing details, printed on every invoice
alter table public.settings
  add column billing jsonb not null default '{
    "name": "WAV Invest s.r.o.",
    "street": "Štefana Moyzesa 30",
    "postal_code": "071 01",
    "city": "Michalovce",
    "country": "Slovensko",
    "ico": "", "dic": "", "ic_dph": "",
    "register": "",
    "iban": "", "swift": "", "bank": "",
    "email": "info@wavinvest.eu",
    "phone": "+421 910 279 990",
    "due_days": 14,
    "note": ""
  }'::jsonb;

-- Invoices keep a copy of both parties and all lines, so a printed invoice
-- never changes when customer data or prices change later.
-- eu_supply: goods to a VAT payer in another EU country, exempt under § 43 ZDPH
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  buyer jsonb not null,
  seller jsonb not null,
  items jsonb not null default '[]'::jsonb,
  issue_date date not null default current_date,
  delivery_date date not null default current_date,
  due_date date not null,
  currency text not null default 'EUR',
  vat_rate numeric(5,2) not null default 23,
  eu_supply boolean not null default false,
  subtotal numeric(12,2) not null default 0,
  vat numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'issued' check (status in ('issued','paid','cancelled')),
  paid_at date,
  note text,
  created_at timestamptz not null default now()
);
create index invoices_issue_idx on public.invoices(issue_date desc);
create index invoices_customer_idx on public.invoices(customer_id);
alter table public.invoices enable row level security;
create policy "admins all" on public.invoices for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Next number in the year's series: 20260001, 20260002, …
create or replace function public.next_invoice_number(p_year int) returns text
language sql security invoker set search_path = '' as $$
  select p_year::text || lpad((coalesce(max(right(number, 4)::int), 0) + 1)::text, 4, '0')
  from public.invoices where number like p_year::text || '____' and number ~ '^\d{8}$';
$$;
revoke all on function public.next_invoice_number from public, anon;
grant execute on function public.next_invoice_number to authenticated;
