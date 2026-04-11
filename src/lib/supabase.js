import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ─── Scoring engine (mirrors Excel Variant 2 logic) ─────────────────────────

export function calcMatchPoints(prediction, result, weights, phase) {
  if (!prediction || result.home_goals == null || result.away_goals == null) return null
  if (prediction.home_goals == null || prediction.away_goals == null) return null

  const ph = prediction.home_goals
  const pa = prediction.away_goals
  const rh = result.home_goals
  const ra = result.away_goals

  const predResult = Math.sign(ph - pa)   // -1 | 0 | 1
  const realResult = Math.sign(rh - ra)
  const predDiff   = ph - pa
  const realDiff   = rh - ra

  const isKO = !phase.startsWith('GROUP')
  const w = isKO
    ? { result: weights.ko_result, diff: weights.ko_diff, exact: weights.ko_exact, approx: 0 }
    : { result: weights.group_result, diff: weights.group_diff, exact: weights.group_exact, approx: weights.group_approx }

  let pts_result = 0, pts_diff = 0, pts_exact = 0, pts_approx = 0

  // Exact score
  if (ph === rh && pa === ra) {
    pts_exact  = w.exact
    pts_result = 0   // exact implies correct result — no double-dip
    pts_diff   = 0
  } else {
    // Correct W/D/L
    if (predResult === realResult) pts_result = w.result
    // Correct goal difference (but not exact score) — only when result direction also matches
    if (predResult === realResult && predDiff === realDiff) pts_diff = w.diff
    // Approximation bonus: predicted within 1 goal each in high-scoring games (>=4 total goals)
    if (!isKO && w.approx > 0) {
      const totalReal = rh + ra
      if (totalReal >= 4 && Math.abs(ph - rh) <= 1 && Math.abs(pa - ra) <= 1) {
        pts_approx = w.approx
      }
    }
  }

  return { pts_result, pts_diff, pts_exact, pts_approx, pts_total: pts_result + pts_diff + pts_exact + pts_approx }
}

export async function recalcPlayerScores(roomCode) {
  const { data: weights } = await supabase
    .from('scoring_weights')
    .select('*')
    .eq('room_code', roomCode)
    .single()

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'FINISHED')

  const { data: predictions } = await supabase
    .from('predictions')
    .select('*, players!inner(room_code)')
    .eq('players.room_code', roomCode)

  if (!weights || !matches || !predictions) return

  const upserts = []
  for (const pred of predictions) {
    const match = matches.find(m => m.id === pred.match_id)
    if (!match) continue
    const pts = calcMatchPoints(pred, match, weights, match.phase)
    if (!pts) continue
    upserts.push({
      player_id: pred.player_id,
      match_id: pred.match_id,
      ...pts,
      calculated_at: new Date().toISOString()
    })
  }

  if (upserts.length) {
    await supabase.from('scores').upsert(upserts, { onConflict: 'player_id,match_id' })
  }
}

// ─── football-data.org API wrapper ──────────────────────────────────────────

const FD_BASE = 'https://api.football-data.org/v4'
const FD_KEY  = import.meta.env.VITE_FOOTBALL_API_KEY
const WC2026  = 2000  // football-data.org competition ID for WC 2026

export async function fetchLiveScores() {
  const res = await fetch(`${FD_BASE}/competitions/${WC2026}/matches?status=LIVE`, {
    headers: { 'X-Auth-Token': FD_KEY }
  })
  if (!res.ok) return []
  const { matches } = await res.json()
  return matches
}

export async function fetchTodayMatches() {
  const today = new Date().toISOString().split('T')[0]
  const res = await fetch(`${FD_BASE}/competitions/${WC2026}/matches?dateFrom=${today}&dateTo=${today}`, {
    headers: { 'X-Auth-Token': FD_KEY }
  })
  if (!res.ok) return []
  const { matches } = await res.json()
  return matches
}

export async function fetchAllMatches() {
  const res = await fetch(`${FD_BASE}/competitions/${WC2026}/matches`, {
    headers: { 'X-Auth-Token': FD_KEY }
  })
  if (!res.ok) return []
  const { matches } = await res.json()
  return matches
}

// Push football-data.org results into Supabase matches table
export async function syncMatchResults() {
  const matches = await fetchAllMatches()
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const score = m.score?.fullTime
    if (!score) continue
    await supabase.from('matches').update({
      home_goals: score.home,
      away_goals: score.away,
      home_goals_et: m.score?.extraTime?.home ?? null,
      away_goals_et: m.score?.extraTime?.away ?? null,
      home_goals_pen: m.score?.penalties?.home ?? null,
      away_goals_pen: m.score?.penalties?.away ?? null,
      status: m.status,
      updated_at: new Date().toISOString()
    }).eq('id', m.id)
  }
}
