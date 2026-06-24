-- Migration 015: penalty shootout predictions for KO matches
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS home_pens int,
  ADD COLUMN IF NOT EXISTS away_pens int;

-- Hidden bonus for exactly predicting a penalty shootout score
ALTER TABLE scoring_weights
  ADD COLUMN IF NOT EXISTS ko_pen_exact int default 7;
