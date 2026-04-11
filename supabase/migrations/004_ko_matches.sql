-- ============================================================
-- Migration 004 — Insert KO round placeholder matches (73-104)
-- These get team names assigned after group stage
-- Run in Supabase SQL Editor
-- ============================================================

insert into matches (id, phase, match_number, home_team, away_team, kickoff) values
-- Round of 32 (matches 73-88)
(73, 'ROUND_OF_32', 73, 'TBD', 'TBD', '2026-07-04 18:00:00+00'),
(74, 'ROUND_OF_32', 74, 'TBD', 'TBD', '2026-07-04 22:00:00+00'),
(75, 'ROUND_OF_32', 75, 'TBD', 'TBD', '2026-07-05 18:00:00+00'),
(76, 'ROUND_OF_32', 76, 'TBD', 'TBD', '2026-07-05 22:00:00+00'),
(77, 'ROUND_OF_32', 77, 'TBD', 'TBD', '2026-07-06 18:00:00+00'),
(78, 'ROUND_OF_32', 78, 'TBD', 'TBD', '2026-07-06 22:00:00+00'),
(79, 'ROUND_OF_32', 79, 'TBD', 'TBD', '2026-07-07 18:00:00+00'),
(80, 'ROUND_OF_32', 80, 'TBD', 'TBD', '2026-07-07 22:00:00+00'),
(81, 'ROUND_OF_32', 81, 'TBD', 'TBD', '2026-07-08 18:00:00+00'),
(82, 'ROUND_OF_32', 82, 'TBD', 'TBD', '2026-07-08 22:00:00+00'),
(83, 'ROUND_OF_32', 83, 'TBD', 'TBD', '2026-07-09 18:00:00+00'),
(84, 'ROUND_OF_32', 84, 'TBD', 'TBD', '2026-07-09 22:00:00+00'),
(85, 'ROUND_OF_32', 85, 'TBD', 'TBD', '2026-07-10 18:00:00+00'),
(86, 'ROUND_OF_32', 86, 'TBD', 'TBD', '2026-07-10 22:00:00+00'),
(87, 'ROUND_OF_32', 87, 'TBD', 'TBD', '2026-07-11 18:00:00+00'),
(88, 'ROUND_OF_32', 88, 'TBD', 'TBD', '2026-07-11 22:00:00+00'),
-- Round of 16 (matches 89-96)
(89, 'ROUND_OF_16', 89, 'TBD', 'TBD', '2026-07-13 18:00:00+00'),
(90, 'ROUND_OF_16', 90, 'TBD', 'TBD', '2026-07-13 22:00:00+00'),
(91, 'ROUND_OF_16', 91, 'TBD', 'TBD', '2026-07-14 18:00:00+00'),
(92, 'ROUND_OF_16', 92, 'TBD', 'TBD', '2026-07-14 22:00:00+00'),
(93, 'ROUND_OF_16', 93, 'TBD', 'TBD', '2026-07-15 18:00:00+00'),
(94, 'ROUND_OF_16', 94, 'TBD', 'TBD', '2026-07-15 22:00:00+00'),
(95, 'ROUND_OF_16', 95, 'TBD', 'TBD', '2026-07-16 18:00:00+00'),
(96, 'ROUND_OF_16', 96, 'TBD', 'TBD', '2026-07-16 22:00:00+00'),
-- Quarter-finals (matches 97-100)
(97,  'QUARTER_FINALS', 97,  'TBD', 'TBD', '2026-07-17 18:00:00+00'),
(98,  'QUARTER_FINALS', 98,  'TBD', 'TBD', '2026-07-17 22:00:00+00'),
(99,  'QUARTER_FINALS', 99,  'TBD', 'TBD', '2026-07-18 18:00:00+00'),
(100, 'QUARTER_FINALS', 100, 'TBD', 'TBD', '2026-07-18 22:00:00+00'),
-- Semi-finals (matches 101-102)
(101, 'SEMI_FINALS', 101, 'TBD', 'TBD', '2026-07-14 22:00:00+00'),
(102, 'SEMI_FINALS', 102, 'TBD', 'TBD', '2026-07-15 22:00:00+00'),
-- 3rd place + Final (matches 103-104)
(103, 'THIRD_PLACE', 103, 'TBD', 'TBD', '2026-07-18 18:00:00+00'),
(104, 'FINAL',       104, 'TBD', 'TBD', '2026-07-19 20:00:00+00')
on conflict (id) do nothing;
