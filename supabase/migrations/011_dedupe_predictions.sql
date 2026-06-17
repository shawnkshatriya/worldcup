-- Remove duplicate predictions (same player + match), keeping the most recent,
-- then add a unique constraint so duplicates can never happen again.

-- 1. Delete older duplicate rows, keep the latest per (player_id, match_id)
DELETE FROM predictions a
USING predictions b
WHERE a.player_id = b.player_id
  AND a.match_id = b.match_id
  AND a.id < b.id;   -- keeps the row with the largest id (most recent)

-- 2. Add the unique constraint
ALTER TABLE predictions
  ADD CONSTRAINT predictions_player_match_unique UNIQUE (player_id, match_id);
