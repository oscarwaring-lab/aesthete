create table public.aesthetic_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'complete',
  dna jsonb not null,
  raw_model_output text,
  image_count int not null default 0,
  model text not null default 'gpt-4o',
  prompt_version text not null default 'v1',
  share_slug text unique,
  created_at timestamptz not null default now()
);

alter table public.aesthetic_profiles enable row level security;

create policy "Users read own profiles"
  on public.aesthetic_profiles for select
  using (auth.uid() = user_id);

-- Public read access for shared reports (anon role, slug-gated).
-- The /share/[slug] page queries by share_slug without an authenticated user.
create policy "Anyone reads shared profiles"
  on public.aesthetic_profiles for select
  using (share_slug is not null);

create index on public.aesthetic_profiles(user_id, created_at desc);
create index on public.aesthetic_profiles(share_slug);

-- Table-level privileges. RLS policies above only filter rows; they do NOT
-- grant access. Without these the service_role insert and the
-- authenticated/anon selects fail with "permission denied for table"
-- (Postgres error 42501).
grant select, insert, update, delete on public.aesthetic_profiles to service_role;
grant select on public.aesthetic_profiles to authenticated; -- gated to own rows by RLS
grant select on public.aesthetic_profiles to anon;          -- gated to shared rows by RLS
