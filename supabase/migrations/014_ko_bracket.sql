-- Migration 014: KO bracket picks + advancement scoring weights

-- Add advancement weight columns to scoring_weights
ALTER TABLE scoring_weights
  ADD COLUMN IF NOT EXISTS ko_r32_adv int default 3,
  ADD COLUMN IF NOT EXISTS ko_r16_adv int default 5,
  ADD COLUMN IF NOT EXISTS ko_qf_adv int default 7,
  ADD COLUMN IF NOT EXISTS ko_sf_adv int default 9,
  ADD COLUMN IF NOT EXISTS ko_final_adv int default 15,
  ADD COLUMN IF NOT EXISTS ko_third_adv int default 7,
  ADD COLUMN IF NOT EXISTS ko_score_exact int default 4,
  ADD COLUMN IF NOT EXISTS ko_score_diff int default 2,
  ADD COLUMN IF NOT EXISTS ko_score_result int default 1,
  ADD COLUMN IF NOT EXISTS ko_penalty_bonus int default 2,
  ADD COLUMN IF NOT EXISTS ko_consolation int default 1;

-- KO bracket picks: each player picks the winner of each KO match
-- Locked at first KO kickoff; scores predicted separately via predictions table
CREATE TABLE IF NOT EXISTS ko_bracket_picks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id int not null references matches(id) on delete cascade,
  picked_team text not null,
  room_code text not null references rooms(code) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(player_id, match_id)
);

ALTER TABLE ko_bracket_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read bracket picks" ON ko_bracket_picks FOR SELECT USING (true);
CREATE POLICY "insert bracket picks" ON ko_bracket_picks FOR INSERT WITH CHECK (true);
CREATE POLICY "update bracket picks" ON ko_bracket_picks FOR UPDATE USING (true);

-- KO scores: computed advancement + score bonus points per player per KO match
CREATE TABLE IF NOT EXISTS ko_scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id int not null references matches(id) on delete cascade,
  room_code text not null references rooms(code) on delete cascade,
  pts_adv int default 0,
  pts_score int default 0,
  pts_penalty int default 0,
  pts_consolation int default 0,
  pts_total int default 0,
  correct_team boolean default false,
  correct_score boolean default false,
  calculated_at timestamptz default now(),
  unique(player_id, match_id)
);

ALTER TABLE ko_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read ko scores" ON ko_scores FOR SELECT USING (true);
CREATE POLICY "insert ko scores" ON ko_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "update ko scores" ON ko_scores FOR UPDATE USING (true);
