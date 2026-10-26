-- Warehouses we ship from, and an optional transport rate per km
alter table public.settings
  add column depots jsonb not null default '[
    {"id":"rzeszow","name":"Rzeszów","address":"Rzeszów, Polska","lat":50.0412,"lng":21.9991},
    {"id":"andrychow","name":"Andrychów","address":"Andrychów, Polska","lat":49.8549,"lng":19.3384}
  ]'::jsonb,
  add column transport_per_km numeric(10,2) not null default 0;

-- Per customer: chosen warehouse and road distances from every warehouse
-- distances = { "<depot id>": { "km": 312, "min": 245, "road": true } }
alter table public.customers
  add column depot text not null default 'rzeszow',
  add column distances jsonb,
  add column geo_query text;

alter table public.quotes
  add column lat double precision,
  add column lng double precision,
  add column distances jsonb,
  add column geo_query text;

-- Secret shared with the website server, so the quote function can't be
-- called directly with the public key (bots would skip the captcha).
-- The value itself lives only in the QUOTE_FORM_SECRET env variable; store its SHA-256 here:
--   update private.app_secrets set sha256 = encode(extensions.digest('<secret>', 'sha256'), 'hex') where name = 'quote_form';
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.app_secrets (name text primary key, sha256 text not null);
insert into private.app_secrets values ('quote_form', '<sha256 of QUOTE_FORM_SECRET>');

drop function public.submit_quote(text, text, text, text, text, int, text, text, text);

create or replace function public.submit_quote(
  p_secret text,
  p_name text, p_company text, p_email text, p_phone text, p_product text,
  p_quantity int, p_location text, p_message text, p_language text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_customer uuid;
  v_quote uuid;
begin
  if not exists (
    select 1 from private.app_secrets
    where name = 'quote_form' and sha256 = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  ) then
    raise exception 'forbidden';
  end if;

  if length(coalesce(p_name,'')) not between 1 and 200
     or length(coalesce(p_company,'')) not between 1 and 200
     or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 200
     or length(coalesce(p_location,'')) not between 1 and 300
     or length(coalesce(p_message,'')) > 5000
     or length(coalesce(p_phone,'')) > 50
     or p_product not in ('epal','collars','mixed')
     or p_quantity not between 1 and 10000000 then
    raise exception 'invalid quote';
  end if;

  -- Flood limits: 5 per email and 60 in total per hour
  if (select count(*) from public.quotes where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.quotes where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate limited';
  end if;

  select c.customer_id into v_customer from public.contacts c
    where lower(c.email) = lower(trim(p_email)) limit 1;
  if v_customer is null then
    select id into v_customer from public.customers
      where lower(company_name) = lower(trim(p_company)) limit 1;
  end if;

  if v_customer is null then
    insert into public.customers (company_name, city, status, source, language)
      values (trim(p_company), trim(p_location), 'inactive', 'quote', p_language)
      returning id into v_customer;
  end if;

  if not exists (select 1 from public.contacts where customer_id = v_customer and lower(email) = lower(trim(p_email))) then
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
