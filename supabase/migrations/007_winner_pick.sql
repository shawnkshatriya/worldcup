-- ============================================================
-- Migration 007 — Tournament winner bonus pick
-- Run in Supabase SQL Editor
-- ============================================================

-- Store each player's tournament winner prediction per room
create table if not exists winner_picks (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid references players(id) on delete cascade,
  room_code   text references rooms(code) on delete cascade,
  team        text not null,
  pts_awarded int default 0,
  created_at  timestamptz default now(),
  unique(player_id, room_code)
);

alter table winner_picks disable row level security;

-- Add winner bonus points to scoring_weights
alter table scoring_weights
  add column if not exists winner_bonus int default 20;
