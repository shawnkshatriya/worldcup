-- Migration 017: wrong-team consolation now rewards goal difference too.
-- Exact 90-min score (wrong team) = 2 pts, correct goal difference = 1 pt.
ALTER TABLE scoring_weights
  ADD COLUMN IF NOT EXISTS ko_consolation_diff int default 1,
  ADD COLUMN IF NOT EXISTS ko_pen_consolation int default 3;

UPDATE scoring_weights SET ko_consolation = 2, ko_consolation_diff = 1, ko_pen_consolation = 3;
