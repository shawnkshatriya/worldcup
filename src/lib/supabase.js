import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// --- Scoring engine ----------------------------------------------------------

export function calcMatchPoints(prediction, result, weights, phase) {
  if (!prediction || result.home_goals == null || result.away_goals == null) return null
  if (prediction.home_goals == null || prediction.away_goals == null) return null

  var ph = Number(prediction.home_goals)
  var pa = Number(prediction.away_goals)
  var rh = Number(result.home_goals)
  var ra = Number(result.away_goals)

  var predResult = Math.sign(ph - pa)
  var realResult = Math.sign(rh - ra)
  var predDiff   = ph - pa
  var realDiff   = rh - ra
  var isExact         = ph === rh && pa === ra
  var isCorrectResult = predResult === realResult
  var isCorrectDiff   = isCorrectResult && predDiff === realDiff

  var isKO = phase && !phase.startsWith('GROUP')
  var w = isKO
    ? { result: weights.ko_result, diff: weights.ko_diff, exact: weights.ko_exact, approx: 0 }
    : { result: weights.group_result, diff: weights.group_diff, exact: weights.group_exact, approx: weights.group_approx }

  var pts_result = 0, pts_diff = 0, pts_exact = 0, pts_approx = 0, pts_ko_team = 0

  // All points stack: correct result → goal diff → exact score
  if (isCorrectResult) {
    pts_result = w.result

    if (isCorrectDiff) {
      pts_diff = w.diff
    }

    if (isExact) {
      pts_exact = w.exact
    }

    // Approx bonus: group only, not exact, not correct diff, 4+ goals, within 1 each way
    if (!isKO && w.approx > 0 && !isExact && !isCorrectDiff) {
      var totalReal = rh + ra
      if (totalReal >= 4 && Math.abs(ph - rh) <= 1 && Math.abs(pa - ra) <= 1) {
        pts_approx = w.approx
      }
    }
  }

  // KO team bonus is tracked separately, not in per-match scoring
  var pts_ko_team = 0

  return {
    pts_result: pts_result,
    pts_diff: pts_diff,
    pts_exact: pts_exact,
    pts_approx: pts_approx,
    pts_ko_team: pts_ko_team,
    pts_total: pts_result + pts_diff + pts_exact + pts_approx + pts_ko_team
  }
}

// --- Recalculate all scores for a room ---------------------------------------

export async function recalcPlayerScores(roomCode) {
  var wRes = await supabase.from('scoring_weights').select('*').eq('room_code', roomCode).single()
  var mRes = await supabase.from('matches').select('*').eq('status', 'FINISHED')

  // Paginate predictions to bypass Supabase 1000-row cap
  var predictions = []
  var from = 0
  var pageSize = 1000
  while (true) {
    var pPage = await supabase.from('predictions').select('*, players!inner(room_code)')
      .eq('players.room_code', roomCode).range(from, from + pageSize - 1)
    if (!pPage.data || pPage.data.length === 0) break
    predictions = predictions.concat(pPage.data)
    if (pPage.data.length < pageSize) break
    from += pageSize
  }

  var weights = wRes.data
  var matches = mRes.data
  if (!weights || !matches || !predictions) return

  // Score each prediction
  var upserts = []
  for (var i = 0; i < predictions.length; i++) {
    var pred = predictions[i]
    var match = matches.find(function(m) { return m.id === pred.match_id })
    if (!match) continue
    var pts = calcMatchPoints(pred, match, weights, match.phase)
    if (!pts) continue
    upserts.push({
      player_id: pred.player_id,
      match_id: pred.match_id,
      pts_result: pts.pts_result,
      pts_diff: pts.pts_diff,
      pts_exact: pts.pts_exact,
      pts_approx: pts.pts_approx,
      pts_ko_team: pts.pts_ko_team,
      pts_total: pts.pts_total,
      calculated_at: new Date().toISOString()
    })
  }

  if (upserts.length) {
    await supabase.from('scores').upsert(upserts, { onConflict: 'player_id,match_id' })
  }

  // --- Winner pick bonus ---
  // Find the FINAL match
  var finalMatch = matches.find(function(m) { return m.phase === 'FINAL' })
  if (finalMatch && finalMatch.home_goals != null) {
    // Determine the champion
    var champion = null
    var finalist = null
    if (finalMatch.home_goals_pen != null) {
      champion = finalMatch.home_goals_pen > finalMatch.away_goals_pen ? finalMatch.home_team : finalMatch.away_team
      finalist = finalMatch.home_goals_pen > finalMatch.away_goals_pen ? finalMatch.away_team : finalMatch.home_team
    } else {
      champion = finalMatch.home_goals > finalMatch.away_goals ? finalMatch.home_team : finalMatch.away_team
      finalist = finalMatch.home_goals > finalMatch.away_goals ? finalMatch.away_team : finalMatch.home_team
    }

    // Get all winner picks for this room
    var wpRes = await supabase.from('winner_picks').select('*').eq('room_code', roomCode)
    var picks = wpRes.data || []

    for (var j = 0; j < picks.length; j++) {
      var pick = picks[j]
      var bonus = 0
      if (pick.team === champion) {
        bonus = weights.winner_bonus || 20
      } else if (pick.team === finalist) {
        bonus = weights.finalist_bonus || 10
      }
      if (bonus !== pick.pts_awarded) {
        await supabase.from('winner_picks').update({ pts_awarded: bonus }).eq('id', pick.id)
      }
    }
  }
}

// --- Recalculate ALL rooms at once -------------------------------------------

export async function recalcAllRooms() {
  var res = await supabase.from('rooms').select('code')
  var rooms = res.data || []
  for (var i = 0; i < rooms.length; i++) {
    await recalcPlayerScores(rooms[i].code)
  }
  return rooms.length
}

// --- Team name mapping (football-data.org → our DB names) -------------------
var TEAM_NAME_MAP = {
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Türkiye': 'Turkey',
  'Curaçao': 'Curacao',
  "Côte d'Ivoire": 'Ivory Coast',
  'Ivory Coast': 'Ivory Coast',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Czech Republic': 'Czechia',
  'Cabo Verde': 'Cape Verde',
  'Congo DR': 'DR Congo',
  'Democratic Republic of the Congo': 'DR Congo',
  'Korea DPR': 'North Korea',
}

function mapTeamName(name) {
  return TEAM_NAME_MAP[name] || name
}

// --- Sync matches via Vercel serverless proxy --------------------------------

export async function syncMatchResults() {
  try {
    var res = await fetch('/api/sync')
    var data = await res.json()

    if (!data.ok) {
      return { ok: false, error: data.error || 'Sync failed' }
    }

    var matches = data.matches || []
    var updated = 0

    for (var i = 0; i < matches.length; i++) {
      var m = matches[i]
      var score = m.score && m.score.fullTime
      var isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
      if (!score || score.home == null) {
        if (!isLive) continue
        score = { home: 0, away: 0 }
      }

      var homeTeam = mapTeamName(m.homeTeam.name || m.homeTeam.shortName)
      var awayTeam = mapTeamName(m.awayTeam.name || m.awayTeam.shortName)

      var updateData = {
        home_goals: score.home,
        away_goals: score.away,
        home_goals_et: m.score.extraTime ? m.score.extraTime.home : null,
        away_goals_et: m.score.extraTime ? m.score.extraTime.away : null,
        home_goals_pen: m.score.penalties ? m.score.penalties.home : null,
        away_goals_pen: m.score.penalties ? m.score.penalties.away : null,
        status: m.status || 'SCHEDULED',
        updated_at: new Date().toISOString(),
      }

      var result = await supabase.from('matches')
        .update(updateData)
        .eq('home_team', homeTeam)
        .eq('away_team', awayTeam)

      if (!result.error) updated++
    }

    return { ok: true, updated: updated, total: matches.length }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// --- Sync + auto-recalc (one-click for admins) -------------------------------

export async function syncAndRecalc() {
  var syncResult = await syncMatchResults()
  if (syncResult.ok && syncResult.updated > 0) {
    var roomCount = await recalcAllRooms()
    return { sync: syncResult, recalcedRooms: roomCount }
  }
  return { sync: syncResult, recalcedRooms: 0 }
}
