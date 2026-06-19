-- Persistent best-ever rank per player (for Podium/Leader badges across devices).
ALTER TABLE players ADD COLUMN IF NOT EXISTS best_rank int;
