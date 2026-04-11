import { supabase, calcMatchPoints } from './supabase'

export const DEMO_PLAYERS = [
  { name:'Shawn (Demo)', email:'demo+shawn@wc26.test'  },
  { name:'Alex',         email:'demo+alex@wc26.test'   },
  { name:'Jordan',       email:'demo+jordan@wc26.test' },
  { name:'Sam',          email:'demo+sam@wc26.test'    },
  { name:'Morgan',       email:'demo+morgan@wc26.test' },
  { name:'Casey',        email:'demo+casey@wc26.test'  },
  { name:'Riley',        email:'demo+riley@wc26.test'  },
  { name:'Drew',         email:'demo+drew@wc26.test'   },
]

// All 104 matches seeded with realistic results
function makeResult(id) {
  // Seeded results so they're consistent and varied
  const s = Math.sin(id * 13.7) * 100
  const hg = Math.abs(Math.floor(s % 4))
  const ag = Math.abs(Math.floor(Math.sin(id * 7.3) * 100 % 3))
  return { id, hg, ag }
}

// Generate all 104 match results
const ALL_RESULTS = []
// Group stage: 1-72
for (let id = 1; id <= 72; id++) ALL_RESULTS.push(makeResult(id))
// KO rounds: 73-104
for (let id = 73; id <= 104; id++) ALL_RESULTS.push(makeResult(id))

function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function generatePrediction(result, playerIndex, matchId) {
  const accuracies = [0.85, 0.72, 0.64, 0.58, 0.50, 0.43, 0.36, 0.28]
  const acc  = accuracies[Math.min(playerIndex, 7)]
  const rnd  = seededRand(playerIndex * 1337 + matchId * 7)
  const rnd2 = seededRand(playerIndex * 2671 + matchId * 13)
  if (rnd < acc * 0.22) {
    return { hg: result.hg, ag: result.ag }
  } else if (rnd < acc) {
    const off = Math.floor(rnd2 * 2)
    if (result.hg > result.ag) return { hg: Math.max(1, result.hg - off), ag: Math.max(0, result.ag) }
    if (result.hg < result.ag) return { hg: Math.max(0, result.hg), ag: Math.max(1, result.ag - off) }
    const v = Math.floor(rnd2 * 3) + 1
    return { hg: v, ag: v }
  } else {
    if (result.hg > result.ag) return { hg: Math.floor(rnd2 * 2), ag: Math.floor(rnd2 * 3) + 1 }
    if (result.hg < result.ag) return { hg: Math.floor(rnd2 * 3) + 1, ag: Math.floor(rnd2 * 2) }
    return { hg: Math.floor(rnd2 * 3) + 1, ag: 0 }
  }
}

export async function seedDemoData(onProgress) {
  const log = onProgress || (() => {})

  log('Step 1/5 — Clearing old demo data...')
  await clearDemoData()

  log('Step 2/5 — Creating 8 demo players...')
  const insertedPlayers = []
  for (const p of DEMO_PLAYERS) {
    const { data, error } = await supabase
      .from('players')
      .insert({ name: p.name, email: p.email, room_code: 'DEFAULT', auth_id: null })
      .select().single()
    if (error) throw new Error(`Failed inserting ${p.name}: ${error.message}`)
    insertedPlayers.push(data)
  }
  log(`  Created ${insertedPlayers.length} players`)

  log('Step 3/5 — Writing all 104 match results...')
  let written = 0
  const BATCH = 10
  for (let i = 0; i < ALL_RESULTS.length; i += BATCH) {
    const batch = ALL_RESULTS.slice(i, i + BATCH)
    for (const r of batch) {
      const { error } = await supabase.from('matches').update({
        home_goals: r.hg, away_goals: r.ag,
        home_goals_et: null, away_goals_et: null,
        home_goals_pen: null, away_goals_pen: null,
        status: 'FINISHED', updated_at: new Date().toISOString()
      }).eq('id', r.id)
      if (!error) written++
    }
  }
  log(`  Set ${written} / 104 match results`)

  log('Step 4/5 — Generating predictions for all 104 matches...')
  const { data: weights } = await supabase
    .from('scoring_weights').select('*').eq('room_code','DEFAULT').single()
  if (!weights) throw new Error('No scoring weights — run migrations first')

  const { data: allMatches } = await supabase
    .from('matches').select('*').in('id', ALL_RESULTS.map(r => r.id))
  if (!allMatches?.length) throw new Error('Matches not found after update')

  const allPreds = [], allScores = []
  for (let pi = 0; pi < insertedPlayers.length; pi++) {
    const player = insertedPlayers[pi]
    for (const result of ALL_RESULTS) {
      const match = allMatches.find(m => m.id === result.id)
      if (!match) continue
      const pred = generatePrediction(result, pi, result.id)
      allPreds.push({ player_id: player.id, match_id: result.id, home_goals: pred.hg, away_goals: pred.ag })
      const pts = calcMatchPoints(
        { home_goals: pred.hg, away_goals: pred.ag },
        { home_goals: result.hg, away_goals: result.ag },
        weights, match.phase
      )
      if (pts) allScores.push({
        player_id: player.id, match_id: result.id,
        pts_result: pts.pts_result, pts_diff: pts.pts_diff,
        pts_exact: pts.pts_exact, pts_approx: pts.pts_approx,
        pts_ko_team: 0, pts_total: pts.pts_total,
        calculated_at: new Date().toISOString()
      })
    }
  }

  const CHUNK = 50
  for (let i = 0; i < allPreds.length; i += CHUNK) {
    const { error } = await supabase.from('predictions').insert(allPreds.slice(i, i + CHUNK))
    if (error) throw new Error(`Prediction insert failed at chunk ${i}: ${error.message}`)
  }
  log(`  Inserted ${allPreds.length} predictions (${insertedPlayers.length} players × 104 matches)`)

  log('Step 5/5 — Saving scores...')
  for (let i = 0; i < allScores.length; i += CHUNK) {
    const { error } = await supabase.from('scores')
      .upsert(allScores.slice(i, i + CHUNK), { onConflict: 'player_id,match_id' })
    if (error) throw new Error(`Score upsert failed: ${error.message}`)
  }
  log(`  Saved ${allScores.length} score records`)
  log('')
  log('Done! Check all pages — full 104-match demo is live.')

  return { players: insertedPlayers.length, predictions: allPreds.length, scores: allScores.length }
}

export async function clearDemoData() {
  const emails = DEMO_PLAYERS.map(p => p.email)
  const { data: found } = await supabase.from('players').select('id').in('email', emails)
  if (found?.length) {
    const ids = found.map(p => p.id)
    await supabase.from('scores').delete().in('player_id', ids)
    await supabase.from('predictions').delete().in('player_id', ids)
    await supabase.from('players').delete().in('id', ids)
  }
  // Reset ALL matches back to scheduled
  const allIds = ALL_RESULTS.map(r => r.id)
  for (let i = 0; i < allIds.length; i += 20) {
    await supabase.from('matches').update({
      home_goals: null, away_goals: null, home_goals_et: null,
      away_goals_et: null, home_goals_pen: null, away_goals_pen: null,
      status: 'SCHEDULED'
    }).in('id', allIds.slice(i, i + 20))
  }
}
