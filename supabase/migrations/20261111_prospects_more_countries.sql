-- Eastern Germany, Lithuania and Latvia join the prospect list
alter table public.prospects drop constraint prospects_country_check;
alter table public.prospects add constraint prospects_country_check check (country in ('PL','SK','CZ','HU','AT','DE','LT','LV'));
