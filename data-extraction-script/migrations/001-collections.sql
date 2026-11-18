-- Multiple collections per artwork.
--
-- Collections become their own table, and each artwork's membership in a collection is a row
-- in "ArtworkCollection" with its own position. A collection's cover image is stored on the
-- collection itself. The old "Artwork".collection / "isCollectionPick" / "viewOrder" columns
-- are left in place (no longer used) so the change can be rolled back; drop them later.
--
-- Safe to run more than once: existing rows are kept, and artworks that already have
-- memberships are not backfilled again.
-- Run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f migrations/001-collections.sql

begin;

create table if not exists "Collection" (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (btrim(name) <> ''),
  "displayOrder" integer not null default 0,
  "coverArtworkId" uuid references "Artwork"(id) on delete set null,
  "createdAt" timestamptz not null default now()
);

create table if not exists "ArtworkCollection" (
  "artworkId" uuid not null references "Artwork"(id) on delete cascade,
  "collectionId" uuid not null references "Collection"(id) on delete cascade,
  "viewOrder" integer,
  primary key ("artworkId", "collectionId")
);

create index if not exists "ArtworkCollection_collectionId_idx" on "ArtworkCollection" ("collectionId");

-- Only the API (service role, which bypasses RLS) may read or write these tables
alter table "Collection" enable row level security;
alter table "ArtworkCollection" enable row level security;

-- New artworks no longer set the legacy text column
alter table "Artwork" alter column collection drop not null;

-- Backfill: one collection per distinct name in the comma-separated legacy column
insert into "Collection" (name)
select distinct btrim(part)
from "Artwork", unnest(string_to_array(collection, ',')) as part
where btrim(part) <> ''
on conflict (name) do nothing;

-- Homepage order as the site sorted it before: years newest first, then other names Z to A.
-- Only collections created by this backfill (displayOrder still 0) are ordered here.
with ordered as (
  select id, row_number() over (
    order by (name ~ '^\d+$') desc,
             case when name ~ '^\d+$' then name::integer end desc nulls last,
             name desc
  ) as position
  from "Collection"
)
update "Collection" c
set "displayOrder" = ordered.position
from ordered
where c.id = ordered.id and c."displayOrder" = 0;

-- Memberships. The old View Order and collection-card flag were set with the first listed
-- collection in mind, so they carry over to that collection only; in the others the artwork
-- goes after the ordered ones and can be placed in the admin.
insert into "ArtworkCollection" ("artworkId", "collectionId", "viewOrder")
select a.id, c.id, case when part.position = 1 then a."viewOrder" end
from "Artwork" a
cross join lateral unnest(string_to_array(a.collection, ',')) with ordinality as part(name, position)
join "Collection" c on c.name = btrim(part.name)
where not exists (select 1 from "ArtworkCollection" ac where ac."artworkId" = a.id)
on conflict do nothing;

-- Covers, from the old per-artwork "collection card" flag
update "Collection" c
set "coverArtworkId" = a.id
from "Artwork" a
join "ArtworkCollection" ac on ac."artworkId" = a.id
where ac."collectionId" = c.id and a."isCollectionPick" and c."coverArtworkId" is null
  and btrim(split_part(a.collection, ',', 1)) = c.name;

commit;

-- Make the new tables visible to the Supabase API immediately
notify pgrst, 'reload schema';
