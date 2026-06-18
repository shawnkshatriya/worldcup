import { createClient } from '@supabase/supabase-js'
import { resolveTeam } from './teams.js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,        // keep session in localStorage across refreshes
      autoRefreshToken: true,      // silently refresh the access token before it expires
      detectSessionInUrl: true,    // handle auth redirects
      storageKey: 'wc26-auth',     // stable key so the session survives
      flowType: 'pkce',
    },
  }
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
      .eq('players.room_code', roomCode).order('id', { ascending: true }).range(from, from + pageSize - 1)
    if (pPage.error || !pPage.data || pPage.data.length === 0) break
    predictions = predictions.concat(pPage.data)
    if (pPage.data.length < pageSize) break
    from += pageSize
  }

  var weights = wRes.data
  var matches = mRes.data
  if (!weights || !matches || !predictions) return

  // Dedupe predictions: keep the most recent row per (player_id, match_id).
  // Without this, duplicate rows cause nondeterministic scoring (blank/zero points).
  var predByKey = {}
  for (var pi = 0; pi < predictions.length; pi++) {
    var pp = predictions[pi]
    var key = pp.player_id + '_' + pp.match_id
    var existing = predByKey[key]
    if (!existing) { predByKey[key] = pp; continue }
    // Prefer the row with a non-null score; then the latest submitted_at; then highest id
    var ppHasScore = pp.home_goals != null
    var exHasScore = existing.home_goals != null
    if (ppHasScore && !exHasScore) { predByKey[key] = pp; continue }
    if (!ppHasScore && exHasScore) continue
    var ppTime = new Date(pp.submitted_at || 0).getTime()
    var exTime = new Date(existing.submitted_at || 0).getTime()
    if (ppTime > exTime || (ppTime === exTime && String(pp.id) > String(existing.id))) predByKey[key] = pp
  }
  var dedupedPredictions = Object.keys(predByKey).map(function(k){ return predByKey[k] })

  // Score each prediction
  var upserts = []
  for (var i = 0; i < dedupedPredictions.length; i++) {
    var pred = dedupedPredictions[i]
    var match = matches.find(function(m) { return String(m.id) === String(pred.match_id) })
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
    var chunkSize = 500
    for (var u = 0; u < upserts.length; u += chunkSize) {
      var chunk = upserts.slice(u, u + chunkSize)
      await supabase.from('scores').upsert(chunk, { onConflict: 'player_id,match_id' })
    }
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
  // Teams where football-data.org name differs from our DB name
  'Korea Republic': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Korea DPR': 'North Korea',
  'Türkiye': 'Turkey',
  'Turkiye': 'Turkey',
  'Curaçao': 'Curacao',
  "Côte d'Ivoire": 'Ivory Coast',
  'Czech Republic': 'Czechia',
  'Cabo Verde': 'Cape Verde',
  'Cape Verde Islands': 'Cape Verde',
  'Congo DR': 'DR Congo',
  'DR Congo (Kinshasa)': 'DR Congo',
  'Democratic Republic of the Congo': 'DR Congo',
  'IR Iran': 'Iran',
  'USA': 'United States',
  'United States of America': 'United States',
  'Saudi Arabia (KSA)': 'Saudi Arabia',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  // ESPN-specific variants (ESPN displayName differs from football-data)
  'Democratic Republic of Congo': 'DR Congo',
  'Congo DR (Kinshasa)': 'DR Congo',
  'Korea, Republic of': 'South Korea',
  'South Korea': 'South Korea',
  "Cote d'Ivoire": 'Ivory Coast',
  'Ivory Coast': 'Ivory Coast',
  'Iran (Islamic Republic of)': 'Iran',
  'United States of America (USA)': 'United States',
  'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
  'Czechia': 'Czechia',
  'Cape Verde': 'Cape Verde',
  'Türkiÿe': 'Turkey',
}

// All 48 DB team names - identity mapping so normalized lookup always resolves
var ALL_TEAMS = ['Algeria','Argentina','Australia','Austria','Belgium','Bosnia and Herzegovina','Brazil','Canada','Cape Verde','Colombia','Croatia','Curacao','Czechia','DR Congo','Ecuador','Egypt','England','France','Germany','Ghana','Haiti','Iran','Iraq','Ivory Coast','Japan','Jordan','Mexico','Morocco','Netherlands','New Zealand','Norway','Panama','Paraguay','Portugal','Qatar','Saudi Arabia','Scotland','Senegal','South Africa','South Korea','Spain','Sweden','Switzerland','Tunisia','Turkey','United States','Uruguay','Uzbekistan']
ALL_TEAMS.forEach(function(t) { if (!TEAM_NAME_MAP[t]) TEAM_NAME_MAP[t] = t })

export function mapTeamName(name) {
  // Primary: comprehensive alias resolver (handles accents, punctuation, all known variants)
  var r = resolveTeam(name)
  if (r.matched) return r.name
  // Fallback: legacy explicit map
  if (TEAM_NAME_MAP[name]) return TEAM_NAME_MAP[name]
  var n = (name || '').toLowerCase().replace(/[^a-z]/g, '')
  for (var key in TEAM_NAME_MAP) {
    if (key.toLowerCase().replace(/[^a-z]/g, '') === n) return TEAM_NAME_MAP[key]
  }
  return name
}

// --- Sync matches via Vercel serverless proxy --------------------------------

// Update a match; if result_source column is missing, retry without it.
async function safeMatchUpdate(id, updateData) {
  var res = await supabase.from('matches').update(updateData).eq('id', id).select()
  if (res.error && updateData.result_source) {
    var copy = Object.assign({}, updateData)
    delete copy.result_source
    res = await supabase.from('matches').update(copy).eq('id', id).select()
  }
  return res
}

// Fetch matches with result_source; if the column doesn't exist yet (migration
// not run), fall back to a query without it so sync never hard-fails.
async function fetchMatchesForSync(extraCols) {
  var cols = 'id, home_team, away_team, home_goals, away_goals, status' + (extraCols ? ', ' + extraCols : '')
  var res = await supabase.from('matches').select(cols + ', result_source')
  if (res.error) {
    // Likely the result_source column is missing - retry without it
    res = await supabase.from('matches').select(cols)
    if (res.data) res.data.forEach(function(m){ m.result_source = m.result_source || null })
  }
  return res.data || []
}

// Authority ranking: higher number wins. Admin entry is final.
var SOURCE_RANK = { 'espn': 1, 'football-data': 2, 'admin': 3 }

function canOverwrite(existingSource, newSource) {
  // Can write if new source has rank >= existing (equal allows score corrections from same source)
  var ex = SOURCE_RANK[existingSource] || 0
  var nw = SOURCE_RANK[newSource] || 0
  return nw >= ex
}

// --- ESPN-primary sync (fast finals) ----------------------------------------
// Scores fully-finished matches from ESPN within ~1 min of FT.
// Only writes if the match isn't already scored by a higher authority
// (football-data or admin). football-data later confirms/corrects via cross-check.
export async function syncFromESPN() {
  try {
    var today = new Date()
    var dateStr = '' + today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0')
    var res = await fetch('/api/live-scores?date=' + dateStr)
    var data = await res.json()
    if (!data.ok || !data.matches) return { ok: false, error: data.error || 'ESPN unavailable' }

    var dbMatches = await fetchMatchesForSync()
    function norm(s) { return (s || '').toLowerCase().replace(/[^a-z]/g, '') }

    var updated = 0
    var unmatched = []
    for (var i = 0; i < data.matches.length; i++) {
      var em = data.matches[i]
      // Only score matches ESPN marks fully finished (state 'post')
      if (em.state !== 'post') continue
      if (em.homeScore == null || em.awayScore == null) continue

      var homeRes = resolveTeam(em.home)
      var awayRes = resolveTeam(em.away)
      var homeTeam = homeRes.name
      var awayTeam = awayRes.name
      // If a name couldn't be resolved at all, flag it loudly (new variant we haven't mapped)
      if (!homeRes.matched || !awayRes.matched) {
        unmatched.push('ESPN UNMAPPED NAME: ' + (!homeRes.matched ? em.home : em.away))
        continue
      }
      var dbMatch = dbMatches.find(function(dm) {
        return norm(dm.home_team) === norm(homeTeam) && norm(dm.away_team) === norm(awayTeam)
      })
      if (!dbMatch) {
        unmatched.push('ESPN: ' + em.home + ' vs ' + em.away + ' (→ ' + homeTeam + '/' + awayTeam + ')')
        continue
      }

      // Don't overwrite football-data or admin results
      if (!canOverwrite(dbMatch.result_source, 'espn')) continue
      // Already scored identically by espn - skip
      if (dbMatch.result_source === 'espn' && dbMatch.home_goals === em.homeScore && dbMatch.away_goals === em.awayScore) continue

      var result = await safeMatchUpdate(dbMatch.id, {
        home_goals: em.homeScore,
        away_goals: em.awayScore,
        status: 'FINISHED',
        result_source: 'espn',
        updated_at: new Date().toISOString(),
      })

      if (!result.error && result.data && result.data.length > 0) updated++
    }
    return { ok: true, updated: updated, unmatched: unmatched }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function syncMatchResults() {
  try {
    var res = await fetch('/api/sync')
    var data = await res.json()

    if (!data.ok) {
      return { ok: false, error: data.error || 'Sync failed' }
    }

    var matches = data.matches || []
    var updated = 0

    // Load all DB matches once for robust matching (incl. current source + score)
    var dbMatches = await fetchMatchesForSync('match_number')

    function norm(s) { return (s || '').toLowerCase().replace(/[^a-z]/g, '') }

    var unmatched = []
    var conflicts = []

    for (var i = 0; i < matches.length; i++) {
      var m = matches[i]
      // Try fullTime first, then any available live score field
      var score = null
      if (m.score) {
        if (m.score.fullTime && m.score.fullTime.home != null) score = m.score.fullTime
        else if (m.score.regularTime && m.score.regularTime.home != null) score = m.score.regularTime
      }
      // No usable score - skip (match not started or no data yet)
      if (!score || score.home == null) continue

      var homeTeam = mapTeamName(m.homeTeam.name || m.homeTeam.shortName)
      var awayTeam = mapTeamName(m.awayTeam.name || m.awayTeam.shortName)

      // Find the DB match by normalized team names
      var dbMatch = dbMatches.find(function(dm) {
        return norm(dm.home_team) === norm(homeTeam) && norm(dm.away_team) === norm(awayTeam)
      })

      if (!dbMatch) {
        unmatched.push(homeTeam + ' vs ' + awayTeam)
        continue
      }

      // Authority check: never overwrite admin entry. football-data can overwrite espn.
      if (!canOverwrite(dbMatch.result_source, 'football-data')) {
        // existing is admin - leave it. But flag if scores disagree (info only).
        if (dbMatch.home_goals != null && (dbMatch.home_goals !== score.home || dbMatch.away_goals !== score.away)) {
          conflicts.push(homeTeam + ' ' + score.home + '-' + score.away + ' (API) vs admin ' + dbMatch.home_goals + '-' + dbMatch.away_goals)
        }
        continue
      }

      // Cross-check: if ESPN had set this and football-data disagrees, football-data wins (official)
      if (dbMatch.result_source === 'espn' && dbMatch.home_goals != null &&
          (dbMatch.home_goals !== score.home || dbMatch.away_goals !== score.away)) {
        conflicts.push(homeTeam + ': ESPN had ' + dbMatch.home_goals + '-' + dbMatch.away_goals + ', official ' + score.home + '-' + score.away)
      }

      var updateData = {
        home_goals: score.home,
        away_goals: score.away,
        home_goals_et: m.score.extraTime ? m.score.extraTime.home : null,
        away_goals_et: m.score.extraTime ? m.score.extraTime.away : null,
        home_goals_pen: m.score.penalties ? m.score.penalties.home : null,
        away_goals_pen: m.score.penalties ? m.score.penalties.away : null,
        status: m.status || 'SCHEDULED',
        result_source: 'football-data',
        updated_at: new Date().toISOString(),
      }

      var result = await safeMatchUpdate(dbMatch.id, updateData)

      if (!result.error && result.data && result.data.length > 0) updated++
    }

    var out = { ok: true, updated: updated, total: matches.length }
    if (unmatched.length > 0) out.unmatched = unmatched
    if (conflicts.length > 0) out.conflicts = conflicts
    return out
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// --- Sync + auto-recalc (one-click for admins) -------------------------------

export async function syncAndRecalc() {
  // 1. ESPN first - fast finals (scores fully-finished matches within ~1 min)
  var espnResult = await syncFromESPN().catch(function(){ return { ok: false } })
  // 2. football-data - authoritative; confirms/corrects ESPN, sets live scores
  var syncResult = await syncMatchResults()
  // 3. Recalc if either source wrote something
  var anyOk = syncResult.ok || (espnResult && espnResult.ok)
  if (anyOk) {
    var roomCount = await recalcAllRooms()
    return { sync: syncResult, espn: espnResult, recalcedRooms: roomCount }
  }
  return { sync: syncResult, espn: espnResult, recalcedRooms: 0 }
}
