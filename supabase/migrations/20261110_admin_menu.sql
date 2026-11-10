-- Which sidebar tabs each admin sees (null = all)
alter table public.admins add column menu text[];

create or replace function public.set_admin_menu(p_menu text[])
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from unnest(p_menu) m where m not in ('overview','customers','prospects','quotes','invoices','mail')) then
    raise exception 'invalid menu item';
  end if;
  update public.admins set menu = p_menu where user_id = (select auth.uid());
end;
$$;
revoke all on function public.set_admin_menu from public, anon;
grant execute on function public.set_admin_menu to authenticated;
