-- Small key/value store for site-wide facts. The API records "lastEditAt" whenever the admin
-- saves a change, so the publish screen can tell when a preview is missing newer edits.
--
-- Safe to run more than once.
-- Run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f migrations/002-site-state.sql

begin;

create table if not exists "SiteState" (
  key text primary key,
  value timestamptz not null default now()
);

-- Only the API (service role, which bypasses RLS) may read or write it
alter table "SiteState" enable row level security;

insert into "SiteState" (key) values ('lastEditAt') on conflict (key) do nothing;

commit;

notify pgrst, 'reload schema';
