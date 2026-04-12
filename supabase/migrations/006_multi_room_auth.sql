-- ============================================================
-- Migration 006 — Allow one user to join multiple rooms
-- Run in Supabase SQL Editor
-- ============================================================

-- Drop the old unique constraint that only allowed one room per auth user
drop index if exists players_auth_id_idx;

-- Add composite unique: one player row per (auth_id, room_code) pair
-- This lets the same email/auth account join Work Pool AND Personal Pool
create unique index if not exists players_auth_room_idx on players(auth_id, room_code)
  where auth_id is not null;

-- Also enforce email uniqueness per room (one account per room per email)
-- This prevents the same person joining the same room twice with different names
create unique index if not exists players_email_room_idx on players(email, room_code)
  where email is not null;
