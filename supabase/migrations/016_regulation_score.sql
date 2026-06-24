-- Migration 016: store 90-minute (regulation) score separately for KO matches.
-- KO scoreline predictions are judged on the 90-min result, but home_goals/away_goals
-- store the full-time score which includes extra time. These columns hold the 90-min result.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_goals_reg int,
  ADD COLUMN IF NOT EXISTS away_goals_reg int;
