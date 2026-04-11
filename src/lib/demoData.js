// ─── Demo data seeder ───────────────────────────────────────────────────────
// Seeds fake players, predictions, match results and scores entirely in
// Supabase so every page of the app shows realistic data.
// Cleared cleanly with clearDemoData().

import { supabase, calcMatchPoints } from './supabase'

export const DEMO_PLAYERS = [
  { name: 'Shawn (You)',  email: 'demo+shawn@test.com'  },
  { name: 'Alex',        email: 'demo+alex@test.com'    },
  { name: 'Jordan',      email: 'demo+jordan@test.com'  },
  { name: 'Sam',         email: 'demo+sam@test.com'     },
  { name: 'Morgan',      email: 'demo+morgan@test.com'  },
  { name: 'Casey',       email: 'demo+casey@test.com'   },
  { name: 'Riley',       email: 'demo+riley@test.com'   },
  { name: 'Drew',        email: 'demo+drew@test.com'    },
]

// Realistic WC-style results for first 24 group matches
const DEMO_RESULTS = [
  { id: 1,  hg: 2, ag: 0 }, { id: 2,  hg: 1, ag: 1 },
  { id: 3,  hg: 3, ag: 1 }, { id: 4,  hg: 0, ag: 2 },
  { id: 5,  hg: 1, ag: 0 }, { id: 6,  hg: 2, ag: 2 },
  { id: 7,  hg: 4, ag: 1 }, { id: 8,  hg: 0, ag: 0 },
  { id: 9,  hg: 1, ag: 3 }, { id: 10, hg: 2, ag: 1 },
  { id: 11, hg: 0, ag: 1 }, { id: 12, hg: 3, ag: 0 },
  { id: 13, hg: 1, ag: 1 }, { id: 14, hg: 2, ag: 0 },
  { id: 15, hg: 1, ag: 2 }, { id: 16, hg: 0, ag: 3 },
  { id: 17, hg: 2, ag: 1 }, { id: 18, hg: 1, ag: 0 },
  { id: 19, hg: 3, ag: 2 }, { id: 20, hg: 1, ag: 1 },
  { id: 21, hg: 0, ag: 2 }, { id: 22, hg: 2, ag: 0 },
  { id: 23, hg: 1, ag: 1 }, { id: 24, hg: 4, ag: 0 },
]

// Seeded random so results are deterministic per player+match combo
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// Each player predicts with varying accuracy
function generatePrediction(result, playerIndex, matchId) {
  const accuracies = [0.82, 0.70, 0.62, 0.58, 0.50, 0.44, 0.38, 0.30]
  const accuracy = accuracies[playerIndex] || 0.40
  const rnd = seededRand(playerIndex * 1000 + matchId)
  const rnd2 = seededRand(playerIndex * 2000 + matchId)

  if (rnd < accuracy * 0.25) {
    // Exact score
    return { hg: result.hg, ag: result.ag }
  } else if (rnd < accuracy) {
    // Correct result, different score
    const offset = Math.floor(rnd2 * 2)
    if (result.hg > result.ag) return { hg: Math.max(1, result.hg - offset), ag: Math.max(0, result.ag) }
    if (result.hg < result.ag) return { hg: Math.max(0, result.hg), ag: Math.max(1, result.ag - offset) }
    const v = Math.floor(rnd2 * 3) + 1
    return { hg: v, ag: v }
  } else {
    // Wrong result
    if (result.hg > result.ag) return { hg: Math.floor(rnd2 * 2), ag: Math.floor(rnd2 * 3) + 1 }
    if (result.hg < result.ag) return { hg: Math.floor(rnd2 * 3) + 1, ag: Math.floor(rnd2 * 2) }
    return { hg: Math.floor(rnd2 * 3) + 1, ag: 0 }
  }
}

export async function seedDemoData(onProgress) {
  const log = onProgress || (() => {})

  log('Clearing old demo data...')
  await clearDemoData()

  // 1. Insert demo players
  log('Creating demo players...')
  const { data: insertedPlayers, error: playerError } = await supabase
    .from('players')
    .insert(DEMO_PLAYERS.map(p => ({
      name: p.name,
      email: p.email,
      room_code: 'DEFAULT',
      auth_id: null, // demo players have no auth
    })))
    .select()

  if (playerError) throw new Error(`Player insert failed: ${playerError.message}`)

  // 2. Set match results
  log('Setting match results...')
  for (const r of DEMO_RESULTS) {
    await supabase.from('matches').update({
      home_goals: r.hg,
      away_goals: r.ag,
      status: 'FINISHED',
      updated_at: new Date().toISOString()
    }).eq('id', r.id)
  }

  // 3. Get weights
  const { data: weights } = await supabase
    .from('scoring_weights').select('*').eq('room_code', 'DEFAULT').single()

  // 4. Get the finished matches we just set
  const { data: finishedMatches } = await supabase
    .from('matches').select('*').in('id', DEMO_RESULTS.map(r => r.id))

  // 5. Generate predictions + scores for each player
  log('Generating predictions and scores...')
  const allPredictions = []
  const allScores = []

  for (let pi = 0; pi < insertedPlayers.length; pi++) {
    const player = insertedPlayers[pi]
    // Re-seed random per player for consistency
    for (const result of DEMO_RESULTS) {
      const match = finishedMatches.find(m => m.id === result.id)
      if (!match) continue

      const pred = generatePrediction(result, pi, result.id)
      allPredictions.push({
        player_id: player.id,
        match_id: result.id,
        home_goals: pred.hg,
        away_goals: pred.ag,
      })

      const pts = calcMatchPoints(
        { home_goals: pred.hg, away_goals: pred.ag },
        { home_goals: result.hg, away_goals: result.ag },
        weights,
        match.phase
      )
      if (pts) {
        allScores.push({
          player_id: player.id,
          match_id: result.id,
          ...pts,
          calculated_at: new Date().toISOString()
        })
      }
    }
  }

  // Batch insert predictions
  const CHUNK = 50
  for (let i = 0; i < allPredictions.length; i += CHUNK) {
    await supabase.from('predictions').insert(allPredictions.slice(i, i + CHUNK))
  }

  // Batch insert scores
  for (let i = 0; i < allScores.length; i += CHUNK) {
    await supabase.from('scores').upsert(allScores.slice(i, i + CHUNK), { onConflict: 'player_id,match_id' })
  }

  // Ensure scores are fully upserted before returning
  log('Scores computed and saved.')
  log('Done! Navigate to Leaderboard and Stats to see live data.')
  return { players: insertedPlayers.length, predictions: allPredictions.length, scores: allScores.length }
}

export async function clearDemoData() {
  // Remove all demo players (cascades to predictions + scores)
  const demoEmails = DEMO_PLAYERS.map(p => p.email)
  await supabase.from('players').delete().in('email', demoEmails)

  // Reset match results back to SCHEDULED
  await supabase.from('matches').update({
    home_goals: null, away_goals: null,
    home_goals_et: null, away_goals_et: null,
    home_goals_pen: null, away_goals_pen: null,
    status: 'SCHEDULED'
  }).in('id', DEMO_RESULTS.map(r => r.id))
}
