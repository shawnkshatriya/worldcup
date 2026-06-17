-- Track where each match result came from, to enforce scoring authority:
-- 'admin' (manual entry) > 'football-data' (official) > 'espn' (fast/unofficial)
-- A higher-authority source must never be overwritten by a lower one.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_source text;

-- Existing finished matches: assume football-data (the previous source of truth)
UPDATE matches SET result_source = 'football-data'
WHERE status = 'FINISHED' AND home_goals IS NOT NULL AND result_source IS NULL;
