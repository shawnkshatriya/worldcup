-- ============================================================
-- World Cup 2026 Predictor — Supabase schema
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Players (users in a pool)
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room_code text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Rooms (one pool per group of friends)
create table if not exists rooms (
  code text primary key,
  name text not null,
  invite_token text not null default substring(md5(random()::text), 1, 12),
  max_players int default 50,
  lock_rule text default 'kickoff', -- 'kickoff' | '48h' | 'matchday'
  created_at timestamptz default now()
);

-- Scoring weights (per room, admin-configurable)
create table if not exists scoring_weights (
  room_code text primary key references rooms(code) on delete cascade,
  group_result int default 3,
  group_diff int default 2,
  group_exact int default 4,
  group_approx int default 1,
  ko_team int default 2,
  ko_result int default 3,
  ko_diff int default 2,
  ko_exact int default 5,
  updated_at timestamptz default now()
);

-- Matches (seeded from football-data.org + static fixture list)
create table if not exists matches (
  id int primary key,
  phase text not null,        -- 'GROUP_A'..'GROUP_L', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'
  match_number int,
  home_team text,
  away_team text,
  kickoff timestamptz,
  home_goals int,
  away_goals int,
  home_goals_et int,          -- extra time
  away_goals_et int,
  home_goals_pen int,         -- penalties
  away_goals_pen int,
  status text default 'SCHEDULED', -- SCHEDULED | IN_PLAY | FINISHED
  updated_at timestamptz default now()
);

-- Predictions (one row per player per match)
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id int not null references matches(id) on delete cascade,
  home_goals int,
  away_goals int,
  locked boolean default false,
  submitted_at timestamptz default now(),
  unique(player_id, match_id)
);

-- Computed scores (recalculated after each match result)
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id int not null references matches(id) on delete cascade,
  pts_result int default 0,
  pts_diff int default 0,
  pts_exact int default 0,
  pts_approx int default 0,
  pts_ko_team int default 0,
  pts_total int default 0,
  calculated_at timestamptz default now(),
  unique(player_id, match_id)
);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table players enable row level security;
alter table rooms enable row level security;
alter table scoring_weights enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table scores enable row level security;

-- Everyone can read matches and scores
create policy "public read matches" on matches for select using (true);
create policy "public read scores" on scores for select using (true);
create policy "public read rooms" on rooms for select using (true);
create policy "public read weights" on scoring_weights for select using (true);
create policy "public read players" on players for select using (true);

-- Players can read/write their own predictions
create policy "player read own predictions" on predictions for select using (true);
create policy "player insert predictions" on predictions for insert with check (true);
create policy "player update own predictions" on predictions for update using (true);

-- Players can insert themselves
create policy "player self insert" on players for insert with check (true);

-- ============================================================
-- Seed: WC 2026 Group Stage Fixtures (all 48 group matches)
-- Kickoff times in UTC — adjust to your timezone
-- ============================================================
insert into matches (id, phase, match_number, home_team, away_team, kickoff) values
-- Group A
(1,  'GROUP_A', 1,  'Mexico',       'South Africa', '2026-06-11 22:00:00+00'),
(2,  'GROUP_A', 2,  'Belgium',      'Saudi Arabia', '2026-06-12 02:00:00+00'),
(3,  'GROUP_A', 17, 'South Africa', 'Saudi Arabia', '2026-06-16 22:00:00+00'),
(4,  'GROUP_A', 18, 'Mexico',       'Belgium',      '2026-06-17 01:00:00+00'),
(5,  'GROUP_A', 33, 'South Africa', 'Belgium',      '2026-06-21 22:00:00+00'),
(6,  'GROUP_A', 34, 'Saudi Arabia', 'Mexico',       '2026-06-21 22:00:00+00'),
-- Group B
(7,  'GROUP_B', 3,  'USA',          'OFC1',         '2026-06-12 18:00:00+00'),
(8,  'GROUP_B', 4,  'Morocco',      'Uruguay',      '2026-06-12 22:00:00+00'),
(9,  'GROUP_B', 19, 'OFC1',         'Uruguay',      '2026-06-17 18:00:00+00'),
(10, 'GROUP_B', 20, 'USA',          'Morocco',      '2026-06-17 22:00:00+00'),
(11, 'GROUP_B', 35, 'OFC1',         'Morocco',      '2026-06-22 22:00:00+00'),
(12, 'GROUP_B', 36, 'Uruguay',      'USA',          '2026-06-22 22:00:00+00'),
-- Group C
(13, 'GROUP_C', 5,  'Canada',       'Netherlands',  '2026-06-13 00:00:00+00'),
(14, 'GROUP_C', 6,  'Senegal',      'Serbia',       '2026-06-13 18:00:00+00'),
(15, 'GROUP_C', 21, 'Netherlands',  'Serbia',       '2026-06-18 00:00:00+00'),
(16, 'GROUP_C', 22, 'Canada',       'Senegal',      '2026-06-18 18:00:00+00'),
(17, 'GROUP_C', 37, 'Netherlands',  'Senegal',      '2026-06-23 22:00:00+00'),
(18, 'GROUP_C', 38, 'Serbia',       'Canada',       '2026-06-23 22:00:00+00'),
-- Group D
(19, 'GROUP_D', 7,  'Brazil',       'Nigeria',      '2026-06-13 22:00:00+00'),
(20, 'GROUP_D', 8,  'Australia',    'Poland',       '2026-06-14 02:00:00+00'),
(21, 'GROUP_D', 23, 'Nigeria',      'Poland',       '2026-06-18 22:00:00+00'),
(22, 'GROUP_D', 24, 'Brazil',       'Australia',    '2026-06-19 02:00:00+00'),
(23, 'GROUP_D', 39, 'Nigeria',      'Australia',    '2026-06-24 22:00:00+00'),
(24, 'GROUP_D', 40, 'Poland',       'Brazil',       '2026-06-24 22:00:00+00'),
-- Group E
(25, 'GROUP_E', 9,  'Argentina',    'Japan',        '2026-06-14 18:00:00+00'),
(26, 'GROUP_E', 10, 'Ecuador',      'Cameroon',     '2026-06-14 22:00:00+00'),
(27, 'GROUP_E', 25, 'Japan',        'Cameroon',     '2026-06-19 18:00:00+00'),
(28, 'GROUP_E', 26, 'Argentina',    'Ecuador',      '2026-06-19 22:00:00+00'),
(29, 'GROUP_E', 41, 'Japan',        'Ecuador',      '2026-06-25 22:00:00+00'),
(30, 'GROUP_E', 42, 'Cameroon',     'Argentina',    '2026-06-25 22:00:00+00'),
-- Group F
(31, 'GROUP_F', 11, 'Spain',        'Croatia',      '2026-06-15 00:00:00+00'),
(32, 'GROUP_F', 12, 'Tunisia',      'DR Congo',     '2026-06-15 18:00:00+00'),
(33, 'GROUP_F', 27, 'Croatia',      'DR Congo',     '2026-06-20 00:00:00+00'),
(34, 'GROUP_F', 28, 'Spain',        'Tunisia',      '2026-06-20 18:00:00+00'),
(35, 'GROUP_F', 43, 'Croatia',      'Tunisia',      '2026-06-26 22:00:00+00'),
(36, 'GROUP_F', 44, 'DR Congo',     'Spain',        '2026-06-26 22:00:00+00'),
-- Group G
(37, 'GROUP_G', 13, 'England',      'Iran',         '2026-06-15 22:00:00+00'),
(38, 'GROUP_G', 14, 'Colombia',     'Switzerland',  '2026-06-16 02:00:00+00'),
(39, 'GROUP_G', 29, 'Iran',         'Switzerland',  '2026-06-20 22:00:00+00'),
(40, 'GROUP_G', 30, 'England',      'Colombia',     '2026-06-21 02:00:00+00'),
(41, 'GROUP_G', 45, 'Iran',         'Colombia',     '2026-06-27 22:00:00+00'),
(42, 'GROUP_G', 46, 'Switzerland',  'England',      '2026-06-27 22:00:00+00'),
-- Group H
(43, 'GROUP_H', 15, 'France',       'South Korea',  '2026-06-16 18:00:00+00'),
(44, 'GROUP_H', 16, 'Chile',        'Iraq',         '2026-06-16 22:00:00+00'),
(45, 'GROUP_H', 31, 'South Korea',  'Iraq',         '2026-06-21 18:00:00+00'),
(46, 'GROUP_H', 32, 'France',       'Chile',        '2026-06-21 22:00:00+00'),
(47, 'GROUP_H', 47, 'South Korea',  'Chile',        '2026-06-28 22:00:00+00'),
(48, 'GROUP_H', 48, 'Iraq',         'France',       '2026-06-28 22:00:00+00'),
-- Group I
(49, 'GROUP_I', 49, 'Portugal',     'Ghana',        '2026-06-17 18:00:00+00'),
(50, 'GROUP_I', 50, 'Costa Rica',   'Czech Republic','2026-06-17 22:00:00+00'),
(51, 'GROUP_I', 51, 'Ghana',        'Czech Republic','2026-06-22 18:00:00+00'),
(52, 'GROUP_I', 52, 'Portugal',     'Costa Rica',   '2026-06-22 22:00:00+00'),
(53, 'GROUP_I', 53, 'Ghana',        'Costa Rica',   '2026-06-29 22:00:00+00'),
(54, 'GROUP_I', 54, 'Czech Republic','Portugal',    '2026-06-29 22:00:00+00'),
-- Group J
(55, 'GROUP_J', 55, 'Germany',      'Qatar',        '2026-06-18 18:00:00+00'),
(56, 'GROUP_J', 56, 'Sweden',       'Bosnia-Herzegovina','2026-06-18 22:00:00+00'),
(57, 'GROUP_J', 57, 'Qatar',        'Bosnia-Herzegovina','2026-06-23 18:00:00+00'),
(58, 'GROUP_J', 58, 'Germany',      'Sweden',       '2026-06-23 22:00:00+00'),
(59, 'GROUP_J', 59, 'Qatar',        'Sweden',       '2026-06-30 22:00:00+00'),
(60, 'GROUP_J', 60, 'Bosnia-Herzegovina','Germany', '2026-06-30 22:00:00+00'),
-- Group K
(61, 'GROUP_K', 61, 'Italy',        'Egypt',        '2026-06-19 18:00:00+00'),
(62, 'GROUP_K', 62, 'Venezuela',    'Turkey',       '2026-06-19 22:00:00+00'),
(63, 'GROUP_K', 63, 'Egypt',        'Turkey',       '2026-06-24 18:00:00+00'),
(64, 'GROUP_K', 64, 'Italy',        'Venezuela',    '2026-06-24 22:00:00+00'),
(65, 'GROUP_K', 65, 'Egypt',        'Venezuela',    '2026-07-01 22:00:00+00'),
(66, 'GROUP_K', 66, 'Turkey',       'Italy',        '2026-07-01 22:00:00+00'),
-- Group L
(67, 'GROUP_L', 67, 'Denmark',      'Ivory Coast',  '2026-06-20 18:00:00+00'),
(68, 'GROUP_L', 68, 'Peru',         'New Zealand',  '2026-06-20 22:00:00+00'),
(69, 'GROUP_L', 69, 'Ivory Coast',  'New Zealand',  '2026-06-25 18:00:00+00'),
(70, 'GROUP_L', 70, 'Denmark',      'Peru',         '2026-06-25 22:00:00+00'),
(71, 'GROUP_L', 71, 'Ivory Coast',  'Peru',         '2026-07-02 22:00:00+00'),
(72, 'GROUP_L', 72, 'New Zealand',  'Denmark',      '2026-07-02 22:00:00+00')
-- KO round matches (73-104) will be inserted dynamically after group stage
on conflict (id) do nothing;

-- Seed default room
insert into rooms (code, name, invite_token) values
  ('DEFAULT', 'Friends Cup 2026', 'changeme123')
on conflict (code) do nothing;

insert into scoring_weights (room_code) values ('DEFAULT')
on conflict (room_code) do nothing;
