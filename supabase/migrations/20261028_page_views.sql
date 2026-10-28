-- Anonymous website statistics: no cookies, no IP. `visitor` is a hash that
-- changes every day, so people can be counted per day but never tracked.
create table public.page_views (
  id bigint generated always as identity primary key,
  day date not null default current_date,
  path text not null,
  visitor text not null,
  country text,
  created_at timestamptz not null default now()
);
create index page_views_day_idx on public.page_views(day);
alter table public.page_views enable row level security;
create policy "admins read" on public.page_views for select to authenticated using ((select public.is_admin()));

create or replace function public.track_view(p_path text, p_visitor text, p_country text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if length(coalesce(p_path, '')) not between 1 and 300 or length(coalesce(p_visitor, '')) <> 64 then
    return;
  end if;
  if exists (select 1 from public.page_views where day = current_date and visitor = p_visitor and path = p_path) then
    return;
  end if;
  insert into public.page_views (path, visitor, country) values (p_path, p_visitor, nullif(upper(left(p_country, 2)), ''));
end;
$$;
revoke all on function public.track_view from public;
grant execute on function public.track_view to anon, authenticated;

create or replace function public.visitor_stats(p_days int default 30)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'visitors', (select count(*) from (select distinct day, visitor from public.page_views where day > current_date - p_days) v),
    'views', (select count(*) from public.page_views where day > current_date - p_days)
  );
$$;
revoke all on function public.visitor_stats from public, anon;
grant execute on function public.visitor_stats to authenticated;
