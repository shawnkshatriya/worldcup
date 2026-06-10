-- ============================================================
-- Migration 011 — Performance indexes for 250+ users
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

create index if not exists idx_predictions_player on predictions(player_id);
create index if not exists idx_predictions_match on predictions(match_id);
create index if not exists idx_predictions_player_match on predictions(player_id, match_id);
create index if not exists idx_scores_player on scores(player_id);
create index if not exists idx_scores_match on scores(match_id);
create index if not exists idx_scores_player_match on scores(player_id, match_id);
create index if not exists idx_players_room on players(room_code);
create index if not exists idx_players_auth on players(auth_id);
create index if not exists idx_matches_phase on matches(phase);
create index if not exists idx_matches_status on matches(status);
create index if not exists idx_winner_picks_room on winner_picks(room_code);
create index if not exists idx_winner_picks_player on winner_picks(player_id);
