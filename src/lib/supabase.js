import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// --- Scoring engine - mirrors Hermann Baum Excel Variant 2 logic -------------
//
// Points are mutually exclusive tiers - you earn the HIGHEST tier you hit,
// plus the approx bonus only when you don't already have result+diff correct:
//
//  Exact score                  &rarr; exact pts only (no result, no diff, no approx)
//  Correct result + correct diff  &rarr; result + diff pts (no approx)
//  Correct result only           &rarr; result pts (+ approx if applicable)
//  Wrong result                  &rarr; 0 (+ approx if applicable)
//
// Approx bonus fires when ALL of:
//   1. Not an exact score
//   2. Not a correct goal difference (to avoid rewarding twice for close misses)
//   3. Total real goals >= 4 (high-scoring game)
//   4. Both predicted goals within 1 of actual (each)

export function calcMatchPoints(prediction, result, weights, phase) {
  if (!prediction || result.home_goals == null || result.away_goals == null) return null
  if (prediction.home_goals == null || prediction.away_goals == null) return null

  const ph = Number(prediction.home_goals)
  const pa = Number(prediction.away_goals)
  const rh = Number(result.home_goals)
  const ra = Number(result.away_goals)

  const predResult = Math.sign(ph - pa)
  const realResult = Math.sign(rh - ra)
  const predDiff   = ph - pa
  const realDiff   = rh - ra
  const isExact         = ph === rh && pa === ra
  const isCorrectResult = predResult === realResult
  const isCorrectDiff   = isCorrectResult && predDiff === realDiff

  const isKO = !phase.startsWith('GROUP')
  const w = isKO
    ? { result: weights.ko_result, diff: weights.ko_diff, exact: weights.ko_exact, approx: 0 }
    : { result: weights.group_result, diff: weights.group_diff, exact: weights.group_exact, approx: weights.group_approx }

  // All points STACK - earn every bonus you qualify for
  let pts_result = 0, pts_diff = 0, pts_exact = 0, pts_approx = 0

  if (isCorrectResult) {
    pts_result = w.result          // Always award result pts if correct
    if (isCorrectDiff) {
      pts_diff = w.diff            // Stack diff pts on top
    }
    if (isExact) {
      pts_exact = w.exact          // Stack exact pts on top of result + diff
    }
    // Approx bonus: group stage, high-scoring, within 1 each - stacks with result
    if (!isKO && w.approx > 0 && !isExact) {
      const totalReal = rh + ra
      if (totalReal >= 4 && Math.abs(ph - rh) <= 1 && Math.abs(pa - ra) <= 1) {
        pts_approx = w.approx
      }
    }
  }

  return {
    pts_result,
    pts_diff,
    pts_exact,
    pts_approx,
    pts_total: pts_result + pts_diff + pts_exact + pts_approx
  }
}

export async function recalcPlayerScores(roomCode) {
  const { data: weights } = await supabase
    .from('scoring_weights').select('*').eq('room_code', roomCode).single()

  const { data: matches } = await supabase
    .from('matches').select('*').eq('status', 'FINISHED')

  const { data: predictions } = await supabase
    .from('predictions').select('*, players!inner(room_code)').eq('players.room_code', roomCode)

  if (!weights || !matches || !predictions) return

  const upserts = []
  for (const pred of predictions) {
    const match = matches.find(m => m.id === pred.match_id)
    if (!match) continue
    const pts = calcMatchPoints(pred, match, weights, match.phase)
    if (!pts) continue
    upserts.push({
      player_id: pred.player_id,
      match_id:  pred.match_id,
      pts_result:  pts.pts_result,
      pts_diff:    pts.pts_diff,
      pts_exact:   pts.pts_exact,
      pts_approx:  pts.pts_approx,
      pts_ko_team: 0,
      pts_total:   pts.pts_total,
      calculated_at: new Date().toISOString()
    })
  }

  if (upserts.length) {
    await supabase.from('scores').upsert(upserts, { onConflict: 'player_id,match_id' })
  }
}

// --- Cached API sync (calls edge function, not football-data directly) -------
export async function syncMatchResults() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(`${supabaseUrl}/functions/v1/sync-scores`, {
    method: 'POST',
    headers: { 'apikey': anonKey, 'Content-Type': 'application/json' }
  })
  return res.json()
}
