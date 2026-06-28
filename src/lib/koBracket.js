// KO bracket scoring engine
// Advancement picks locked at first KO kickoff.
// Score predictions (per match) locked 15 min before each match.

import { supabase } from './supabase'

const PHASE_ADV_KEY = {
  'ROUND_OF_32':  'ko_r32_adv',
  'ROUND_OF_16':  'ko_r16_adv',
  'QUARTER_FINALS': 'ko_qf_adv',
  'SEMI_FINALS':  'ko_sf_adv',
  'FINAL':        'ko_final_adv',
  'THIRD_PLACE':  'ko_third_adv',
}

// Is the bracket locked? (First KO match has kicked off)
export async function isKoBracketLocked() {
  var res = await supabase.from('matches')
    .select('kickoff')
    .in('phase', ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'])
    .not('kickoff', 'is', null)
    .order('kickoff', { ascending: true })
    .limit(1)
  if (!res.data || res.data.length === 0) return false
  var ko = new Date(res.data[0].kickoff)
  if (isNaN(ko)) return false
  return ko <= new Date()
}

// Get or load KO weights for a room
async function getKoWeights(roomCode) {
  var res = await supabase.from('scoring_weights').select('*').eq('room_code', roomCode).maybeSingle()
  if (!res.data) return getDefaultKoWeights()
  return res.data
}

export function getDefaultKoWeights() {
  return {
    ko_r32_adv: 3, ko_r16_adv: 5, ko_qf_adv: 7, ko_sf_adv: 9,
    ko_final_adv: 15, ko_third_adv: 7,
    ko_score_exact: 4, ko_score_diff: 2, ko_score_result: 1,
    ko_penalty_bonus: 2, ko_consolation: 2, ko_consolation_diff: 1, ko_pen_exact: 7, ko_pen_consolation: 3,
  }
}

// Score a single KO match for a player.
// match: { id, phase, home_team, away_team, home_goals, away_goals, home_goals_pen, away_goals_pen }
// prediction: { home_goals, away_goals } (scoreline prediction, 90-min)
// bracketPick: picked_team (which team they predicted to win this match)
// weights: from scoring_weights
export function calcKoMatchPoints(match, prediction, bracketPick, weights) {
  var w = weights || getDefaultKoWeights()

  var result = {
    pts_adv: 0,       // advancement points
    pts_score: 0,     // score bonus (only when right team)
    pts_penalty: 0,   // penalty bonus
    pts_consolation: 0, // consolation for right score, wrong team
    pts_total: 0,
    correct_team: false,
    correct_score: false,
  }

  if (!match || match.home_goals == null) return result // match not played yet

  // Determine actual winner (incl. penalties)
  var actualWinner = null
  if (match.home_goals > match.away_goals) actualWinner = match.home_team
  else if (match.away_goals > match.home_goals) actualWinner = match.away_team
  else if (match.home_goals_pen != null && match.away_goals_pen != null) {
    // Went to penalties
    actualWinner = match.home_goals_pen > match.away_goals_pen ? match.home_team : match.away_team
  }

  // A match went to penalties iff penalty scores are recorded.
  var wentToPens = match.home_goals_pen != null && match.away_goals_pen != null
  var advKey = PHASE_ADV_KEY[match.phase]
  var advPts = advKey ? (w[advKey] || 0) : 0

  // Did they pick the right team?
  var pickedCorrectTeam = bracketPick && actualWinner && bracketPick === actualWinner
  result.correct_team = !!pickedCorrectTeam

  if (pickedCorrectTeam) {
    result.pts_adv = advPts
  }

  // Score prediction (judged on the FINAL score, including extra time).
  // home_goals/away_goals are the full-time score. Penalties decide advancement
  // but are NOT part of the scoreline (a 1-1 that goes to pens is judged as 1-1).
  if (prediction && prediction.home_goals != null && prediction.away_goals != null) {
    var predH = prediction.home_goals, predA = prediction.away_goals
    var actH = match.home_goals, actA = match.away_goals
    // Nested (non-exclusive): exact ⊆ correct goal-difference. The correct W/D/L
    // result itself is already rewarded by advancement, so it isn't scored again here.
    var correctDiff = (predH - predA) === (actH - actA)
    var exactScore = predH === actH && predA === actA

    // Penalty bonus (right team only): exactly nailing the penalty shootout score.
    // (Predicting the full-time draw is already rewarded by the regular score bonus.)
    // Wrong-team penalty accuracy is handled by the consolation branch below.
    var predictedDraw = predH === predA
    var nailedPens = predictedDraw && wentToPens &&
        prediction.home_pens != null && prediction.away_pens != null &&
        match.home_goals_pen != null && match.away_goals_pen != null &&
        prediction.home_pens === match.home_goals_pen &&
        prediction.away_pens === match.away_goals_pen
    if (nailedPens && pickedCorrectTeam) {
      result.pts_penalty = (w.ko_pen_exact != null ? w.ko_pen_exact : 7)
    }

    if (pickedCorrectTeam) {
      // Score bonuses (right team). The correct W/D/L result is already rewarded by
      // the advancement points, so only goal-difference and exact score add on top.
      //   exact: adv + diff + exact
      //   diff:  adv + diff
      if (correctDiff)  result.pts_score += (w.ko_score_diff || 2)
      if (exactScore) { result.pts_score += (w.ko_score_exact || 4); result.correct_score = true }
    } else {
      // Wrong team (busted bracket) but you still read the actual match well.
      // Consolation: exact score stacks on goal-difference.
      if (correctDiff)  result.pts_consolation += (w.ko_consolation_diff != null ? w.ko_consolation_diff : 1)
      if (exactScore)   result.pts_consolation += (w.ko_consolation != null ? w.ko_consolation : 2)
      // Even with the wrong team, exactly nailing the penalty shootout score = +3.
      if (nailedPens) {
        result.pts_consolation += (w.ko_pen_consolation != null ? w.ko_pen_consolation : 3)
      }
    }
  }

  result.pts_total = result.pts_adv + result.pts_score + result.pts_penalty + result.pts_consolation
  return result
}

// Recalculate KO bracket scores for all players in a room.
// Writes results to a ko_scores table (separate from the main scores table).
export async function recalcKoBracket(roomCode) {
  var weights = await getKoWeights(roomCode)

  // Get all KO matches
  var matchRes = await supabase.from('matches').select('*')
    .in('phase', ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'])
  var koMatches = matchRes.data || []
  var finishedKO = koMatches.filter(function(m){ return m.status === 'FINISHED' && m.home_goals != null })
  if (finishedKO.length === 0) return { ok: true, updated: 0 }

  // Get all players in room
  var playerRes = await supabase.from('players').select('id').eq('room_code', roomCode)
  var playerIds = (playerRes.data || []).map(function(p){ return p.id })
  if (playerIds.length === 0) return { ok: true, updated: 0 }

  // Get all bracket picks for room
  var picksRes = await supabase.from('ko_bracket_picks').select('*').eq('room_code', roomCode)
  var picks = picksRes.data || []
  var picksByPM = {}
  picks.forEach(function(p){ picksByPM[p.player_id + '_' + p.match_id] = p })

  // Get all score predictions for KO matches
  var matchIds = finishedKO.map(function(m){ return m.id })
  var predRes = await supabase.from('predictions').select('*')
    .in('player_id', playerIds).in('match_id', matchIds)
  var preds = predRes.data || []
  var predsByPM = {}
  preds.forEach(function(p){ predsByPM[p.player_id + '_' + p.match_id] = p })

  // Score each player × match
  var upserts = []
  playerIds.forEach(function(playerId) {
    finishedKO.forEach(function(match) {
      var pick = picksByPM[playerId + '_' + match.id]
      var pred = predsByPM[playerId + '_' + match.id]
      var scored = calcKoMatchPoints(match, pred, pick ? pick.picked_team : null, weights)
      upserts.push({
        player_id: playerId,
        match_id: match.id,
        room_code: roomCode,
        pts_adv: scored.pts_adv,
        pts_score: scored.pts_score,
        pts_penalty: scored.pts_penalty,
        pts_consolation: scored.pts_consolation,
        pts_total: scored.pts_total,
        correct_team: scored.correct_team,
        correct_score: scored.correct_score,
        calculated_at: new Date().toISOString(),
      })
    })
  })

  if (upserts.length > 0) {
    // Chunk + retry (same hardening as the group scorer) so a large or transient
    // failure never silently drops some players' KO scores.
    var chunkSize = 500
    for (var c = 0; c < upserts.length; c += chunkSize) {
      var chunk = upserts.slice(c, c + chunkSize)
      var up = await supabase.from('ko_scores').upsert(chunk, { onConflict: 'player_id,match_id' })
      if (up.error) {
        await new Promise(function(r){ setTimeout(r, 400) })
        var up2 = await supabase.from('ko_scores').upsert(chunk, { onConflict: 'player_id,match_id' })
        if (up2.error) return { ok: false, error: up2.error.message }
      }
    }
  }

  return { ok: true, updated: upserts.length }
}
