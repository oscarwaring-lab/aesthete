-- Tighten Row Level Security on aesthetic_profiles.
--
-- The original "Anyone reads shared profiles" policy (001_init.sql) authorised
-- any row whose share_slug was non-null. Because every profile is inserted with
-- a slug, that policy — combined with the anon SELECT grant — let the public
-- anon key read EVERY user's profile. Shared reports are served server-side via
-- the service-role client (src/app/share/[slug]/page.tsx), so neither the broad
-- policy nor the anon grant is needed.
--
-- This migration documents the fix already applied to the live database:
-- remove the over-broad policy, revoke anon SELECT, and scope reads to the
-- authenticated owner only.

DROP POLICY IF EXISTS "Anyone reads shared profiles"
  ON public.aesthetic_profiles;

REVOKE SELECT ON public.aesthetic_profiles FROM anon;

-- The 001_init policy of the same name is replaced here (scoped TO authenticated).
-- Drop first so this migration replays cleanly from a fresh database.
DROP POLICY IF EXISTS "Users read own profiles"
  ON public.aesthetic_profiles;

CREATE POLICY "Users read own profiles"
  ON public.aesthetic_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
