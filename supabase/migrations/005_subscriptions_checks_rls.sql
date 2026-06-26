-- Enable Row Level Security on user_subscriptions and continuity_checks.
--
-- These two tables were created outside version control and were not covered by
-- any prior migration, so their RLS posture was unverifiable from the codebase.
-- Both are queried directly with the public anon key from the browser
-- (src/app/dashboard/page.tsx and src/app/dashboard/check/[profileId]/page.tsx),
-- so per-user RLS is the only thing isolating one user's billing and continuity
-- data from another's.
--
-- This migration documents the policies already applied to the live database.
-- Writes to user_subscriptions remain service-role only (no authenticated
-- INSERT/UPDATE policy), so tier and analyses_limit cannot be altered client-side.

ALTER TABLE public.user_subscriptions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.continuity_checks
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own checks"
  ON public.continuity_checks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own checks"
  ON public.continuity_checks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
