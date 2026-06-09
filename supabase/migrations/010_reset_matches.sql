-- ============================================================
-- Migration 010 — Complete WC26 fixture reset
-- Replaces all matches with correct groups, teams, and times.
-- Source: FIFA.com via bracketmundial2026.com
-- All kickoff times in UTC (ET + 4h during EDT)
-- ============================================================

-- Clear dependent data
delete from scores;
delete from predictions;
delete from winner_picks;
delete from matches;

-- Add ko_predictions_open if not exists
alter table rooms add column if not exists ko_predictions_open boolean default false;

-- Insert all 104 matches
insert into matches (id, phase, match_number, home_team, away_team, kickoff, status) values
-- === GROUP STAGE ===
-- Group A
(1,  'GROUP_A', 1,  'Mexico',       'South Africa',  '2026-06-11T19:00:00Z', 'SCHEDULED'),
(2,  'GROUP_A', 2,  'South Korea',  'Czechia',        '2026-06-12T02:00:00Z', 'SCHEDULED'),
(25, 'GROUP_A', 25, 'Czechia',      'South Africa',   '2026-06-18T16:00:00Z', 'SCHEDULED'),
(28, 'GROUP_A', 28, 'Mexico',       'South Korea',    '2026-06-19T01:00:00Z', 'SCHEDULED'),
(53, 'GROUP_A', 53, 'Czechia',      'Mexico',         '2026-06-25T01:00:00Z', 'SCHEDULED'),
(54, 'GROUP_A', 54, 'South Africa', 'South Korea',    '2026-06-25T01:00:00Z', 'SCHEDULED'),
-- Group B
(3,  'GROUP_B', 3,  'Canada',       'Bosnia and Herzegovina', '2026-06-12T19:00:00Z', 'SCHEDULED'),
(8,  'GROUP_B', 8,  'Qatar',        'Switzerland',    '2026-06-13T19:00:00Z', 'SCHEDULED'),
(26, 'GROUP_B', 26, 'Switzerland',  'Bosnia and Herzegovina', '2026-06-18T19:00:00Z', 'SCHEDULED'),
(27, 'GROUP_B', 27, 'Canada',       'Qatar',          '2026-06-18T22:00:00Z', 'SCHEDULED'),
(51, 'GROUP_B', 51, 'Switzerland',  'Canada',         '2026-06-24T19:00:00Z', 'SCHEDULED'),
(52, 'GROUP_B', 52, 'Bosnia and Herzegovina','Qatar',  '2026-06-24T19:00:00Z', 'SCHEDULED'),
-- Group C
(7,  'GROUP_C', 7,  'Brazil',       'Morocco',        '2026-06-13T22:00:00Z', 'SCHEDULED'),
(5,  'GROUP_C', 5,  'Haiti',        'Scotland',       '2026-06-14T01:00:00Z', 'SCHEDULED'),
(30, 'GROUP_C', 30, 'Scotland',     'Morocco',        '2026-06-19T22:00:00Z', 'SCHEDULED'),
(29, 'GROUP_C', 29, 'Brazil',       'Haiti',          '2026-06-20T00:30:00Z', 'SCHEDULED'),
(49, 'GROUP_C', 49, 'Scotland',     'Brazil',         '2026-06-24T22:00:00Z', 'SCHEDULED'),
(50, 'GROUP_C', 50, 'Morocco',      'Haiti',          '2026-06-24T22:00:00Z', 'SCHEDULED'),
-- Group D
(4,  'GROUP_D', 4,  'United States','Paraguay',       '2026-06-13T01:00:00Z', 'SCHEDULED'),
(6,  'GROUP_D', 6,  'Australia',    'Turkey',         '2026-06-14T04:00:00Z', 'SCHEDULED'),
(32, 'GROUP_D', 32, 'United States','Australia',      '2026-06-19T19:00:00Z', 'SCHEDULED'),
(31, 'GROUP_D', 31, 'Turkey',       'Paraguay',       '2026-06-20T03:00:00Z', 'SCHEDULED'),
(59, 'GROUP_D', 59, 'Turkey',       'United States',  '2026-06-26T02:00:00Z', 'SCHEDULED'),
(60, 'GROUP_D', 60, 'Paraguay',     'Australia',      '2026-06-26T02:00:00Z', 'SCHEDULED'),
-- Group E
(10, 'GROUP_E', 10, 'Germany',      'Curacao',        '2026-06-14T17:00:00Z', 'SCHEDULED'),
(9,  'GROUP_E', 9,  'Ivory Coast',  'Ecuador',        '2026-06-14T23:00:00Z', 'SCHEDULED'),
(33, 'GROUP_E', 33, 'Germany',      'Ivory Coast',    '2026-06-20T20:00:00Z', 'SCHEDULED'),
(34, 'GROUP_E', 34, 'Ecuador',      'Curacao',        '2026-06-21T00:00:00Z', 'SCHEDULED'),
(55, 'GROUP_E', 55, 'Curacao',      'Ivory Coast',    '2026-06-25T20:00:00Z', 'SCHEDULED'),
(56, 'GROUP_E', 56, 'Ecuador',      'Germany',        '2026-06-25T20:00:00Z', 'SCHEDULED'),
-- Group F
(11, 'GROUP_F', 11, 'Netherlands',  'Japan',          '2026-06-14T20:00:00Z', 'SCHEDULED'),
(12, 'GROUP_F', 12, 'Sweden',       'Tunisia',        '2026-06-15T02:00:00Z', 'SCHEDULED'),
(35, 'GROUP_F', 35, 'Netherlands',  'Sweden',         '2026-06-20T17:00:00Z', 'SCHEDULED'),
(36, 'GROUP_F', 36, 'Tunisia',      'Japan',          '2026-06-21T04:00:00Z', 'SCHEDULED'),
(57, 'GROUP_F', 57, 'Japan',        'Sweden',         '2026-06-25T23:00:00Z', 'SCHEDULED'),
(58, 'GROUP_F', 58, 'Tunisia',      'Netherlands',    '2026-06-25T23:00:00Z', 'SCHEDULED'),
-- Group G
(16, 'GROUP_G', 16, 'Belgium',      'Egypt',          '2026-06-15T19:00:00Z', 'SCHEDULED'),
(15, 'GROUP_G', 15, 'Iran',         'New Zealand',    '2026-06-16T01:00:00Z', 'SCHEDULED'),
(39, 'GROUP_G', 39, 'Belgium',      'Iran',           '2026-06-21T19:00:00Z', 'SCHEDULED'),
(40, 'GROUP_G', 40, 'New Zealand',  'Egypt',          '2026-06-22T01:00:00Z', 'SCHEDULED'),
(63, 'GROUP_G', 63, 'Egypt',        'Iran',           '2026-06-27T03:00:00Z', 'SCHEDULED'),
(64, 'GROUP_G', 64, 'New Zealand',  'Belgium',        '2026-06-27T03:00:00Z', 'SCHEDULED'),
-- Group H
(14, 'GROUP_H', 14, 'Spain',        'Cape Verde',     '2026-06-15T16:00:00Z', 'SCHEDULED'),
(13, 'GROUP_H', 13, 'Saudi Arabia', 'Uruguay',        '2026-06-15T22:00:00Z', 'SCHEDULED'),
(38, 'GROUP_H', 38, 'Spain',        'Saudi Arabia',   '2026-06-21T16:00:00Z', 'SCHEDULED'),
(37, 'GROUP_H', 37, 'Uruguay',      'Cape Verde',     '2026-06-21T22:00:00Z', 'SCHEDULED'),
(65, 'GROUP_H', 65, 'Cape Verde',   'Saudi Arabia',   '2026-06-27T00:00:00Z', 'SCHEDULED'),
(66, 'GROUP_H', 66, 'Uruguay',      'Spain',          '2026-06-27T00:00:00Z', 'SCHEDULED'),
-- Group I
(17, 'GROUP_I', 17, 'France',       'Senegal',        '2026-06-16T19:00:00Z', 'SCHEDULED'),
(18, 'GROUP_I', 18, 'Iraq',         'Norway',         '2026-06-16T22:00:00Z', 'SCHEDULED'),
(41, 'GROUP_I', 41, 'Norway',       'Senegal',        '2026-06-23T00:00:00Z', 'SCHEDULED'),
(42, 'GROUP_I', 42, 'France',       'Iraq',           '2026-06-22T21:00:00Z', 'SCHEDULED'),
(61, 'GROUP_I', 61, 'Norway',       'France',         '2026-06-26T19:00:00Z', 'SCHEDULED'),
(62, 'GROUP_I', 62, 'Senegal',      'Iraq',           '2026-06-26T19:00:00Z', 'SCHEDULED'),
-- Group J
(19, 'GROUP_J', 19, 'Argentina',    'Algeria',        '2026-06-17T01:00:00Z', 'SCHEDULED'),
(20, 'GROUP_J', 20, 'Austria',      'Jordan',         '2026-06-17T04:00:00Z', 'SCHEDULED'),
(43, 'GROUP_J', 43, 'Argentina',    'Austria',        '2026-06-22T17:00:00Z', 'SCHEDULED'),
(44, 'GROUP_J', 44, 'Jordan',       'Algeria',        '2026-06-23T03:00:00Z', 'SCHEDULED'),
(69, 'GROUP_J', 69, 'Algeria',      'Austria',        '2026-06-28T02:00:00Z', 'SCHEDULED'),
(70, 'GROUP_J', 70, 'Jordan',       'Argentina',      '2026-06-28T02:00:00Z', 'SCHEDULED'),
-- Group K
(23, 'GROUP_K', 23, 'Portugal',     'DR Congo',       '2026-06-17T17:00:00Z', 'SCHEDULED'),
(24, 'GROUP_K', 24, 'Uzbekistan',   'Colombia',       '2026-06-18T02:00:00Z', 'SCHEDULED'),
(47, 'GROUP_K', 47, 'Portugal',     'Uzbekistan',     '2026-06-23T17:00:00Z', 'SCHEDULED'),
(48, 'GROUP_K', 48, 'Colombia',     'DR Congo',       '2026-06-24T02:00:00Z', 'SCHEDULED'),
(71, 'GROUP_K', 71, 'Colombia',     'Portugal',       '2026-06-27T23:30:00Z', 'SCHEDULED'),
(72, 'GROUP_K', 72, 'DR Congo',     'Uzbekistan',     '2026-06-27T23:30:00Z', 'SCHEDULED'),
-- Group L
(22, 'GROUP_L', 22, 'England',      'Croatia',        '2026-06-17T20:00:00Z', 'SCHEDULED'),
(21, 'GROUP_L', 21, 'Ghana',        'Panama',         '2026-06-17T23:00:00Z', 'SCHEDULED'),
(45, 'GROUP_L', 45, 'England',      'Ghana',          '2026-06-23T20:00:00Z', 'SCHEDULED'),
(46, 'GROUP_L', 46, 'Panama',       'Croatia',        '2026-06-23T23:00:00Z', 'SCHEDULED'),
(67, 'GROUP_L', 67, 'Panama',       'England',        '2026-06-27T21:00:00Z', 'SCHEDULED'),
(68, 'GROUP_L', 68, 'Croatia',      'Ghana',          '2026-06-27T21:00:00Z', 'SCHEDULED'),

-- === KNOCKOUT STAGE ===
-- Round of 32
(73, 'ROUND_OF_32', 73, null, null, '2026-06-28T19:00:00Z', 'SCHEDULED'),
(74, 'ROUND_OF_32', 74, null, null, '2026-06-29T20:30:00Z', 'SCHEDULED'),
(75, 'ROUND_OF_32', 75, null, null, '2026-06-30T01:00:00Z', 'SCHEDULED'),
(76, 'ROUND_OF_32', 76, null, null, '2026-06-29T17:00:00Z', 'SCHEDULED'),
(77, 'ROUND_OF_32', 77, null, null, '2026-06-30T21:00:00Z', 'SCHEDULED'),
(78, 'ROUND_OF_32', 78, null, null, '2026-06-30T17:00:00Z', 'SCHEDULED'),
(79, 'ROUND_OF_32', 79, null, null, '2026-07-01T01:00:00Z', 'SCHEDULED'),
(80, 'ROUND_OF_32', 80, null, null, '2026-07-01T16:00:00Z', 'SCHEDULED'),
(81, 'ROUND_OF_32', 81, null, null, '2026-07-02T00:00:00Z', 'SCHEDULED'),
(82, 'ROUND_OF_32', 82, null, null, '2026-07-01T20:00:00Z', 'SCHEDULED'),
(83, 'ROUND_OF_32', 83, null, null, '2026-07-02T23:00:00Z', 'SCHEDULED'),
(84, 'ROUND_OF_32', 84, null, null, '2026-07-02T19:00:00Z', 'SCHEDULED'),
(85, 'ROUND_OF_32', 85, null, null, '2026-07-03T03:00:00Z', 'SCHEDULED'),
(86, 'ROUND_OF_32', 86, null, null, '2026-07-03T22:00:00Z', 'SCHEDULED'),
(87, 'ROUND_OF_32', 87, null, null, '2026-07-04T01:30:00Z', 'SCHEDULED'),
(88, 'ROUND_OF_32', 88, null, null, '2026-07-03T18:00:00Z', 'SCHEDULED'),
-- Round of 16
(89, 'ROUND_OF_16', 89, null, null, '2026-07-04T21:00:00Z', 'SCHEDULED'),
(90, 'ROUND_OF_16', 90, null, null, '2026-07-04T17:00:00Z', 'SCHEDULED'),
(91, 'ROUND_OF_16', 91, null, null, '2026-07-05T20:00:00Z', 'SCHEDULED'),
(92, 'ROUND_OF_16', 92, null, null, '2026-07-06T00:00:00Z', 'SCHEDULED'),
(93, 'ROUND_OF_16', 93, null, null, '2026-07-06T19:00:00Z', 'SCHEDULED'),
(94, 'ROUND_OF_16', 94, null, null, '2026-07-07T00:00:00Z', 'SCHEDULED'),
(95, 'ROUND_OF_16', 95, null, null, '2026-07-07T16:00:00Z', 'SCHEDULED'),
(96, 'ROUND_OF_16', 96, null, null, '2026-07-07T20:00:00Z', 'SCHEDULED'),
-- Quarterfinals
(97,  'QUARTER_FINALS', 97,  null, null, '2026-07-09T20:00:00Z', 'SCHEDULED'),
(98,  'QUARTER_FINALS', 98,  null, null, '2026-07-10T19:00:00Z', 'SCHEDULED'),
(99,  'QUARTER_FINALS', 99,  null, null, '2026-07-11T21:00:00Z', 'SCHEDULED'),
(100, 'QUARTER_FINALS', 100, null, null, '2026-07-12T01:00:00Z', 'SCHEDULED'),
-- Semifinals
(101, 'SEMI_FINALS', 101, null, null, '2026-07-14T19:00:00Z', 'SCHEDULED'),
(102, 'SEMI_FINALS', 102, null, null, '2026-07-15T19:00:00Z', 'SCHEDULED'),
-- Third place
(103, 'THIRD_PLACE', 103, null, null, '2026-07-18T21:00:00Z', 'SCHEDULED'),
-- Final
(104, 'FINAL', 104, null, null, '2026-07-19T19:00:00Z', 'SCHEDULED')
on conflict (id) do nothing;
