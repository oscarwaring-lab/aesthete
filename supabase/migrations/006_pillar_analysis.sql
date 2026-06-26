-- Content pillar analysis.
--
-- A profile is normally a single "standard" analysis of a creator's whole feed.
-- This migration lets a standard profile carry up to 3 "pillar" analyses
-- alongside it — one per content type (e.g. "Travel", "Portraits", "Lifestyle").
-- Each pillar is its own row in the same table, distinguished by analysis_type
-- and linked back to its parent via parent_profile_id.
--
--   analysis_type     'standard' (default) or 'pillar'
--   pillar_name       human label for a pillar row (null on standard rows)
--   parent_profile_id the standard profile a pillar hangs off (null on standard)
--
-- Existing rows keep analysis_type = 'standard' via the column default, so the
-- dashboard and report pages treat them unchanged. Table-level grants from
-- 001_init.sql already cover these new columns — no extra GRANT is needed.
alter table public.aesthetic_profiles
  add column if not exists analysis_type
    text not null default 'standard',
  add column if not exists pillar_name text,
  add column if not exists parent_profile_id uuid
    references public.aesthetic_profiles(id);
