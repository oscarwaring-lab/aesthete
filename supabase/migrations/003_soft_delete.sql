-- Soft-delete support for aesthetic profiles.
-- Deleted profiles are hidden from all views (dashboard, report, share) but
-- the row is preserved, so analyses_used in user_subscriptions is never
-- decremented — a deleted profile still counts toward the monthly limit.
alter table public.aesthetic_profiles
  add column if not exists deleted_at timestamptz;
