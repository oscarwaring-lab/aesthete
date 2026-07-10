-- Per-user profiles table + one-time welcome-email guard.
--
-- Until now this codebase had no per-user `profiles` table — only
-- aesthetic_profiles (many rows per user), user_subscriptions and
-- continuity_checks. The post-confirmation welcome email in
-- src/app/auth/callback/route.ts needs a durable, per-user "have we welcomed
-- this person yet?" flag, so this migration introduces public.profiles (one row
-- per auth user, id == auth.users.id) carrying welcome_email_sent_at.
--
-- SAFE AGAINST AN OUT-OF-BAND TABLE: user_subscriptions and continuity_checks
-- were created directly against the live database, outside version control
-- (see 005_subscriptions_checks_rls.sql), so a `profiles` table may already
-- exist here too. Every statement below is written to be idempotent and to
-- handle both "brand new" and "already exists, possibly without the column":
--   * CREATE TABLE IF NOT EXISTS  — creates it only when missing.
--   * ALTER TABLE ... ADD COLUMN IF NOT EXISTS — adds the guard column to a
--     pre-existing table that lacks it; a no-op when step 1 just created it.
--
-- ONE-TIME BACKFILL: step 5 stamps welcome_email_sent_at = now() on all
-- existing rows so current users never receive a retro welcome. This is a
-- deliberate one-shot data operation — do NOT re-run this migration against a
-- live database, or it would also stamp (and thus suppress the welcome for) any
-- brand-new users who have signed up since but not yet been welcomed.

-- 1. Table. id IS the auth user id; cascade so a deleted user drops their row.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  welcome_email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2. Guard column, for the case where profiles already existed without it.
alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz;

-- 3. Auto-create a profile row for every new signup. SECURITY DEFINER so the
--    trigger inserts regardless of which role wrote to auth.users; the pinned
--    search_path prevents search-path hijacking of an unqualified name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Backfill a profile row for every user that already exists (idempotent).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 5. One-time: mark all existing users as already welcomed so none of them get
--    a retro welcome email. New rows created by the trigger from now on keep
--    welcome_email_sent_at = NULL and are therefore eligible.
update public.profiles
  set welcome_email_sent_at = now()
  where welcome_email_sent_at is null;

-- 6. Row Level Security. Enable, then grant users read-only access to their own
--    row. There is intentionally NO insert/update/delete policy for users:
--    welcome_email_sent_at is stamped exclusively by the service-role client in
--    the auth callback, never from a user session, so it cannot be forged or
--    cleared to farm duplicate welcome emails.
alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- 7. Table-level privileges. RLS filters rows but does not grant access, so the
--    grants are still required. service_role bypasses RLS and performs the
--    trusted writes (trigger insert + callback stamp). authenticated gets
--    SELECT only, scoped to its own row by the policy above. anon gets nothing.
grant select, insert, update, delete on public.profiles to service_role;
grant select on public.profiles to authenticated;
