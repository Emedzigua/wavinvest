-- Email history. For now: emails written in the admin and opened in the mail
-- app (via = 'mailto'). Later the connected mailbox adds sent and received ones.
create table public.emails (
  id uuid primary key default gen_random_uuid(),
  direction text not null default 'out' check (direction in ('out', 'in')),
  via text not null default 'mailto' check (via in ('mailto', 'mailbox')),
  to_email text,
  from_email text,
  subject text not null default '',
  body text not null default '',
  customer_id uuid references public.customers(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz not null default now()
);
create index emails_created_idx on public.emails(created_at desc);
create index emails_customer_idx on public.emails(customer_id);
alter table public.emails enable row level security;
create policy "admins all" on public.emails for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
