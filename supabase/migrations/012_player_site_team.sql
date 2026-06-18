-- Add site and team grouping columns to players for admin-assigned filtering.
ALTER TABLE players ADD COLUMN IF NOT EXISTS site text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS team text;
