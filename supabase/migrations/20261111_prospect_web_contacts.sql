-- What the contact finder read from each company's own website
alter table public.prospects
  add column web_emails text[],
  add column web_phones text[],
  add column web_contact_url text,
  add column web_signals text[],
  add column web_checked_at timestamptz,
  add column web_status text;
create index prospects_web_checked_idx on public.prospects(web_checked_at) where website is not null;
