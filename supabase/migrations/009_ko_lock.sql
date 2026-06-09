-- ============================================================
-- Migration 009 — KO prediction lock toggle
-- Adds admin-controlled flag for knockout stage predictions
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

alter table rooms add column if not exists ko_predictions_open boolean default false;
