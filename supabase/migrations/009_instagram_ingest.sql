-- Instagram account connection + per-post performance ingest.
--
-- Foundation for the DNA-consistency ↔ conversion correlation test: we need a
-- creator's real post outcomes sitting next to the aesthetic we already score.
-- Nothing here is user-facing yet — this migration is connect + ingest + store.
--
-- Three tables:
--   instagram_connections  one row per connected IG Business/Creator account
--   post_metrics           one row per media item, refreshed on each sync
--   account_metrics        daily account-level series (per-post is unavailable)
--
-- SECURITY POSTURE, in one place:
--   * access_token is stored ENCRYPTED (AES-256-GCM, src/lib/instagram/token-cipher.ts).
--     The column holds ciphertext, never a usable token.
--   * On top of that, `authenticated` is granted SELECT on a COLUMN LIST that
--     omits access_token, so even the ciphertext is unreachable with the anon
--     key. Only service_role (server-only) can read it. See the grants at the
--     bottom of this file — that is the part worth re-reading before changing
--     any query against instagram_connections.
--   * RLS scopes every row to its owning user on all three tables.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. instagram_connections
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.instagram_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Optional link to the aesthetic profile this account's DNA was derived from.
  -- Nullable because a creator can connect before (or without) running an
  -- analysis; ON DELETE SET NULL so deleting a profile never drops the
  -- connection or its harvested metrics.
  profile_id uuid references public.aesthetic_profiles(id) on delete set null,

  ig_user_id text not null,
  ig_username text,

  -- AES-256-GCM ciphertext, formatted "v1.<iv>.<tag>.<ciphertext>" (base64url).
  -- NEVER a plaintext token. Additional authenticated data is bound to
  -- ig_user_id, so a ciphertext lifted onto another row fails to decrypt.
  access_token text not null,

  -- Long-lived tokens last 60 days and are refreshable while valid. Null only
  -- if Instagram omitted expires_in.
  token_expires_at timestamptz,

  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,

  -- One connection per (user, IG account): reconnecting updates in place rather
  -- than accumulating stale tokens for the same account.
  unique (user_id, ig_user_id)
);

create index if not exists instagram_connections_user_id_idx
  on public.instagram_connections (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. post_metrics
-- ─────────────────────────────────────────────────────────────────────────────
-- One row per media item. A sync upserts on (ig_connection_id, ig_media_id), so
-- re-syncing refreshes counts in place — insights for a given post keep moving
-- for days after it is published, and we want the latest reading, not a pile of
-- duplicates.
--
-- Every metric column is NULLABLE ON PURPOSE. Instagram serves insights per
-- media type and keeps changing which metric exists for which type; a metric the
-- API declines for a given post is stored as NULL, which is a different fact
-- from a real zero and must stay distinguishable in the correlation analysis.
create table if not exists public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  ig_connection_id uuid not null
    references public.instagram_connections(id) on delete cascade,

  ig_media_id text not null,
  permalink text,
  media_type text,          -- IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type text,  -- FEED | REELS | STORY — the format confound, kept
                            -- so posts can be segmented by format when analysed.
  caption text,
  posted_at timestamptz,

  -- Raw media references as Instagram returned them. media_url is the video file
  -- itself on VIDEO/REELS, which is not scorable; thumbnail_url is its poster.
  media_url text,
  thumbnail_url text,

  -- The scorable frames for this post, in order: the image for IMAGE, the poster
  -- frame for VIDEO/REELS, and every child frame for a CAROUSEL_ALBUM. This is
  -- the column the later DNA-consistency scorer reads — derived at ingest so the
  -- scorer never has to re-learn which field is an image for which media type.
  --
  -- NOTE: these are Instagram-hosted CDN URLs and they EXPIRE (days, not months).
  -- Anything that needs them durably must copy the bytes into our own storage,
  -- exactly as the analysis route already does for uploaded source images.
  image_urls text[] not null default '{}',

  reach int,

  -- `impressions` was deprecated in favour of `views` (all versions, from
  -- 2025-04-21). One column holds whichever the API actually served, and
  -- impressions_or_views_metric records which one it was — mixing the two
  -- silently would corrupt any reach-normalised comparison built on this table.
  impressions_or_views int,
  impressions_or_views_metric text,

  saved int,
  likes int,
  comments int,
  shares int,
  total_interactions int,

  -- Whatever /insights returned, unmodelled. Metric availability shifts under us
  -- and a re-fetch of an old post is not possible, so keep the raw reading.
  insights_raw jsonb,

  ingested_at timestamptz not null default now(),

  unique (ig_connection_id, ig_media_id)
);

create index if not exists post_metrics_connection_posted_idx
  on public.post_metrics (ig_connection_id, posted_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. account_metrics
-- ─────────────────────────────────────────────────────────────────────────────
-- Account-level daily series for the things Instagram does NOT expose per post.
-- Link clicks in particular are account-level only; attributing them to a single
-- post is not possible through the API and must not be faked downstream.
create table if not exists public.account_metrics (
  id uuid primary key default gen_random_uuid(),
  ig_connection_id uuid not null
    references public.instagram_connections(id) on delete cascade,

  date date not null,
  profile_views int,
  link_clicks int,
  followers_count int,

  ingested_at timestamptz not null default now(),

  -- One row per account per day; a re-sync overwrites that day's reading.
  unique (ig_connection_id, date)
);

create index if not exists account_metrics_connection_date_idx
  on public.account_metrics (ig_connection_id, date desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase does NOT surface a missing policy as an error — an RLS-enabled table
-- with no policy simply returns zero rows, and an RLS-disabled table returns
-- everyone's. Both fail quietly, so every policy below is spelled out and each
-- is verified by a cross-user SELECT after this migration is applied.

alter table public.instagram_connections enable row level security;

drop policy if exists "Users read own instagram connections"
  on public.instagram_connections;
create policy "Users read own instagram connections"
  on public.instagram_connections for select
  to authenticated
  using (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy for `authenticated`, deliberately. Connections
-- are written only by the OAuth callback through the service-role client. A user
-- must not be able to forge a row, repoint profile_id, or overwrite a token.

alter table public.post_metrics enable row level security;

-- Ownership is indirect: a post belongs to whoever owns its connection. The
-- subquery is itself filtered by the policy above, so it can only ever match the
-- caller's own connections. It needs SELECT on instagram_connections(id, user_id),
-- which the column grants below provide.
drop policy if exists "Users read own post metrics" on public.post_metrics;
create policy "Users read own post metrics"
  on public.post_metrics for select
  to authenticated
  using (
    exists (
      select 1
      from public.instagram_connections c
      where c.id = post_metrics.ig_connection_id
        and c.user_id = auth.uid()
    )
  );

alter table public.account_metrics enable row level security;

drop policy if exists "Users read own account metrics" on public.account_metrics;
create policy "Users read own account metrics"
  on public.account_metrics for select
  to authenticated
  using (
    exists (
      select 1
      from public.instagram_connections c
      where c.id = account_metrics.ig_connection_id
        and c.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Table- and column-level privileges
-- ─────────────────────────────────────────────────────────────────────────────
-- RLS filters rows; it does not grant access. Grants are still required (see the
-- note in 001_init.sql). anon gets nothing at all on these tables.

grant select, insert, update, delete on public.instagram_connections to service_role;
grant select, insert, update, delete on public.post_metrics            to service_role;
grant select, insert, update, delete on public.account_metrics         to service_role;

-- THE TOKEN GUARD. `authenticated` is granted SELECT on an explicit column list
-- that omits access_token, so the token ciphertext cannot be read with the
-- public anon key even by the row's owner — encryption and privilege both have
-- to fail before a token leaks.
--
-- CONSEQUENCE, and it is intentional: `select('*')` on this table from a
-- browser client FAILS with "permission denied for column access_token" rather
-- than quietly returning it. Client-side reads must name their columns. Server
-- code that needs the token uses the service-role client.
grant select (
  id,
  user_id,
  profile_id,
  ig_user_id,
  ig_username,
  token_expires_at,
  connected_at,
  last_synced_at
) on public.instagram_connections to authenticated;

grant select on public.post_metrics    to authenticated; -- gated to own rows by RLS
grant select on public.account_metrics to authenticated; -- gated to own rows by RLS
