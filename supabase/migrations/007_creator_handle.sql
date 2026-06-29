-- Optional creator-handle attribution.
--
-- When an analysis is run on a specific creator's feed, Oscar can tag it with
-- that creator's Instagram handle (stored without the leading @). The report
-- then reads "Curated by Aesthete for @handle", so a shared report feels
-- personally made for that creator.
--
-- Always optional and nullable: existing rows keep creator_handle = null and
-- render exactly as before. The handle never feeds DNA generation or scoring —
-- it is purely cosmetic metadata. Table-level grants from 001_init.sql already
-- cover this new column, so no extra GRANT is needed.
alter table public.aesthetic_profiles
  add column if not exists creator_handle text;
