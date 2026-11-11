-- What the website lists under "What we sell"; edited in the admin (Produkty na webe)
create table public.site_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  sort int not null default 0,
  active boolean not null default true,
  image text,
  -- Which price list item a quote for this product belongs to
  quote_key text not null default 'mixed' check (quote_key in ('epal','collars','mixed')),
  -- Texts per language: {"sk": {"name","tagline","description","image_alt","specs": [[label, value]]}, "en": …}
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_products enable row level security;
create policy "visitors read active" on public.site_products for select to anon using (active);
create policy "signed in read" on public.site_products for select to authenticated using (active or (select public.is_admin()));
create policy "admins write" on public.site_products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Product photos, publicly readable, managed by admins
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "admins read product images" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admins upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admins change product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- The admin menu knows the new tab
create or replace function public.set_admin_menu(p_menu text[])
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from unnest(p_menu) m where m not in ('overview','customers','prospects','quotes','invoices','mail','products')) then
    raise exception 'invalid menu item';
  end if;
  update public.admins set menu = p_menu where user_id = (select auth.uid());
end;
$$;
-- The two starting products (EPAL pallets, collars) were copied from the language files with all five translations.
