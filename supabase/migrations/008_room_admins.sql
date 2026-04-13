-- ============================================================
-- Migration 008 — Room admin support
-- Run in Supabase SQL Editor
-- ============================================================

-- Add room admin flag to players
alter table players add column if not exists is_room_admin boolean default false;

-- Index for fast lookup
create index if not exists players_room_admin_idx on players(room_code, is_room_admin) where is_room_admin = true;
