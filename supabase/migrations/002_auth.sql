-- ============================================================
-- Migration 002 — Link players to Supabase Auth
-- Run AFTER 001_schema.sql in Supabase SQL Editor
-- ============================================================

-- Add auth_id column to players (links to auth.users)
alter table players add column if not exists auth_id uuid references auth.users(id) on delete cascade;
alter table players add column if not exists email text;

-- Make auth_id unique (one player per auth user)
create unique index if not exists players_auth_id_idx on players(auth_id);

-- Update RLS: players can only read/write their own row by auth_id
drop policy if exists "player self insert" on players;
drop policy if exists "public read players" on players;

-- Anyone can read player names (for leaderboard)
create policy "public read players" on players for select using (true);

-- Only the authenticated user can insert their own player row
create policy "player self insert" on players
  for insert with check (auth.uid() = auth_id);

-- Only the authenticated user can update their own player row
create policy "player self update" on players
  for update using (auth.uid() = auth_id);

-- Predictions: only owner can insert/update their own
drop policy if exists "player insert predictions" on predictions;
drop policy if exists "player update own predictions" on predictions;

create policy "player insert predictions" on predictions
  for insert with check (
    player_id in (select id from players where auth_id = auth.uid())
  );

create policy "player update own predictions" on predictions
  for update using (
    player_id in (select id from players where auth_id = auth.uid())
  );

-- ============================================================
-- Fix cascade deletes so removing a player row automatically
-- removes their predictions and scores too.
-- Run this if individual/purge deletes still leave orphans.
-- ============================================================

alter table predictions drop constraint if exists predictions_player_id_fkey;
alter table predictions
  add constraint predictions_player_id_fkey
  foreign key (player_id) references players(id) on delete cascade;

alter table scores drop constraint if exists scores_player_id_fkey;
alter table scores
  add constraint scores_player_id_fkey
  foreign key (player_id) references players(id) on delete cascade;
