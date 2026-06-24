-- Migration 015: penalty shootout predictions for KO matches
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS home_pens int,
  ADD COLUMN IF NOT EXISTS away_pens int;
