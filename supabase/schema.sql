-- HAUSS MUSIC — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.

create extension if not exists "pgcrypto";

-- ===================================================================
-- Tables
-- ===================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  display_name text,
  full_name text,
  profile_picture text,
  profile_banner text,
  bio text,
  user_type text not null default 'ouvinte', -- ouvinte | artista | gravadora | staff
  role text not null default 'user',          -- user | admin
  verified boolean not null default false,
  profile_completed boolean not null default false,
  managed_artists uuid[] not null default '{}',
  representatives uuid[] not null default '{}',
  social_links jsonb not null default '{}',
  google_id text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  featuring text,
  album text,
  type text default 'single',
  cover_url text,
  background_video_url text,
  audio_url text,
  duration numeric,
  genre text,
  lyrics jsonb,
  plays numeric not null default 0,
  is_favorite boolean not null default false,
  rating numeric not null default 0,
  rating_count numeric not null default 0,
  artist_id uuid,
  label_id uuid,
  label_name text,
  label_logo text,
  published_by_label boolean not null default false,
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  artist_id uuid,
  artist_email text,
  featuring text,
  description text,
  cover_url text,
  background_video_url text,
  type text not null default 'single',
  genre text,
  release_date date,
  tracks jsonb not null default '[]',
  status text not null default 'draft', -- draft | published | hidden
  is_featured boolean not null default false,
  is_scheduled boolean not null default false,
  scheduled_datetime text,
  label_id uuid,
  label_name text,
  label_logo text,
  published_by_label boolean not null default false,
  likes numeric not null default 0,
  plays numeric not null default 0,
  rating numeric not null default 0,
  rating_count numeric not null default 0,
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_url text,
  song_ids uuid[] not null default '{}',
  is_public boolean not null default true,
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  artist_name text not null,
  release_date date,
  link_url text,
  is_active boolean not null default true,
  priority numeric not null default 0,
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  profile_picture text,
  representatives uuid[] not null default '{}',
  managed_artists uuid[] not null default '{}',
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  display_name text,
  email text,
  profile_picture text,
  verified boolean not null default false,
  user_type text not null default 'artista',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  following_id uuid not null,
  following_name text,
  created_by text,
  created_date timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  item_type text not null, -- post | song
  rating numeric not null,
  comment text,
  created_by text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null,
  item_type text not null, -- post | song
  created_by text,
  created_date timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

-- ===================================================================
-- New-user provisioning: auto-create a profile row for every signup
-- (email/password or Google), and grant admin to the very first user
-- and to a fixed allowlist of emails.
-- ===================================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
  admin_emails text[] := array['steffanbaum123@gmail.com'];
  chosen_name text;
begin
  select not exists(select 1 from public.profiles) into is_first;
  chosen_name := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  insert into public.profiles (id, email, username, display_name, full_name, profile_picture, role, user_type, profile_completed)
  values (
    new.id,
    new.email,
    lower(new.raw_user_meta_data->>'username'),
    chosen_name,
    chosen_name,
    new.raw_user_meta_data->>'avatar_url',
    case when is_first or new.email = any(admin_emails) then 'admin' else 'user' end,
    'ouvinte',
    coalesce(new.raw_user_meta_data->>'avatar_url' is not null, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- keep updated_date current on every UPDATE
create or replace function public.set_updated_date()
returns trigger as $$
begin
  new.updated_date = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','songs','posts','playlists','banners','labels','artists','ratings','app_settings']
  loop
    execute format('drop trigger if exists set_updated_date on public.%I', t);
    execute format('create trigger set_updated_date before update on public.%I for each row execute procedure public.set_updated_date()', t);
  end loop;
end $$;

-- ===================================================================
-- Row Level Security
-- Pragmatic policy set for a small app: anyone can read published
-- content; any signed-in user can create/edit; admin-only tables are
-- locked to the 'admin' role. Tighten further later if you need
-- per-owner write restrictions.
-- ===================================================================

create or replace function public.is_admin()
returns boolean as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer set search_path = public;

alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.posts enable row level security;
alter table public.playlists enable row level security;
alter table public.banners enable row level security;
alter table public.labels enable row level security;
alter table public.artists enable row level security;
alter table public.follows enable row level security;
alter table public.ratings enable row level security;
alter table public.user_favorites enable row level security;
alter table public.app_settings enable row level security;

-- profiles: public read; users edit their own row, admins edit any
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (auth.uid() = id or public.is_admin());

-- songs / posts / playlists: public read; authenticated create; owner or admin edit/delete
drop policy if exists "songs_select" on public.songs;
create policy "songs_select" on public.songs for select using (true);
drop policy if exists "songs_insert" on public.songs;
create policy "songs_insert" on public.songs for insert with check (auth.role() = 'authenticated');
drop policy if exists "songs_update" on public.songs;
create policy "songs_update" on public.songs for update using (created_by = auth.jwt()->>'email' or public.is_admin());
drop policy if exists "songs_delete" on public.songs;
create policy "songs_delete" on public.songs for delete using (created_by = auth.jwt()->>'email' or public.is_admin());

drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select using (true);
drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert with check (auth.role() = 'authenticated');
drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts for update using (created_by = auth.jwt()->>'email' or public.is_admin());
drop policy if exists "posts_delete" on public.posts;
create policy "posts_delete" on public.posts for delete using (created_by = auth.jwt()->>'email' or public.is_admin());

drop policy if exists "playlists_select" on public.playlists;
create policy "playlists_select" on public.playlists for select using (true);
drop policy if exists "playlists_insert" on public.playlists;
create policy "playlists_insert" on public.playlists for insert with check (auth.role() = 'authenticated');
drop policy if exists "playlists_update" on public.playlists;
create policy "playlists_update" on public.playlists for update using (created_by = auth.jwt()->>'email' or public.is_admin());
drop policy if exists "playlists_delete" on public.playlists;
create policy "playlists_delete" on public.playlists for delete using (created_by = auth.jwt()->>'email' or public.is_admin());

-- banners / app_settings / labels: public read, admin-only writes
drop policy if exists "banners_select" on public.banners;
create policy "banners_select" on public.banners for select using (true);
drop policy if exists "banners_write" on public.banners;
create policy "banners_write" on public.banners for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select" on public.app_settings for select using (true);
drop policy if exists "app_settings_write" on public.app_settings;
create policy "app_settings_write" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "labels_select" on public.labels;
create policy "labels_select" on public.labels for select using (true);
drop policy if exists "labels_write" on public.labels;
create policy "labels_write" on public.labels for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "artists_select" on public.artists;
create policy "artists_select" on public.artists for select using (true);
drop policy if exists "artists_write" on public.artists;
create policy "artists_write" on public.artists for all using (public.is_admin()) with check (public.is_admin());

-- follows / ratings / favorites: public read, own rows write/delete
drop policy if exists "follows_select" on public.follows;
create policy "follows_select" on public.follows for select using (true);
drop policy if exists "follows_insert" on public.follows;
create policy "follows_insert" on public.follows for insert with check (auth.role() = 'authenticated');
drop policy if exists "follows_delete" on public.follows;
create policy "follows_delete" on public.follows for delete using (created_by = auth.jwt()->>'email' or public.is_admin());

drop policy if exists "ratings_select" on public.ratings;
create policy "ratings_select" on public.ratings for select using (true);
drop policy if exists "ratings_insert" on public.ratings;
create policy "ratings_insert" on public.ratings for insert with check (auth.role() = 'authenticated');
drop policy if exists "ratings_update" on public.ratings;
create policy "ratings_update" on public.ratings for update using (created_by = auth.jwt()->>'email' or public.is_admin());
drop policy if exists "ratings_delete" on public.ratings;
create policy "ratings_delete" on public.ratings for delete using (created_by = auth.jwt()->>'email' or public.is_admin());

drop policy if exists "favorites_select" on public.user_favorites;
create policy "favorites_select" on public.user_favorites for select using (true);
drop policy if exists "favorites_insert" on public.user_favorites;
create policy "favorites_insert" on public.user_favorites for insert with check (auth.role() = 'authenticated');
drop policy if exists "favorites_delete" on public.user_favorites;
create policy "favorites_delete" on public.user_favorites for delete using (created_by = auth.jwt()->>'email' or public.is_admin());

-- ===================================================================
-- Storage: a public bucket for uploaded media (covers, banners, audio)
-- ===================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media_authenticated_upload" on storage.objects;
create policy "media_authenticated_upload" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');
drop policy if exists "media_authenticated_update" on storage.objects;
create policy "media_authenticated_update" on storage.objects for update using (bucket_id = 'media' and auth.role() = 'authenticated');

-- ===================================================================
-- Realtime: let the client subscribe to changes (Follow/Post used by the app)
-- ===================================================================
alter publication supabase_realtime add table public.follows;
alter publication supabase_realtime add table public.posts;
