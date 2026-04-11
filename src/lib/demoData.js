import { supabase, calcMatchPoints } from './supabase'

export const DEMO_PLAYERS = [
  { name: 'Shawn (Demo)', email: 'demo+shawn@test.com'  },
  { name: 'Alex',         email: 'demo+alex@test.com'   },
  { name: 'Jordan',       email: 'demo+jordan@test.com' },
  { name: 'Sam',          email: 'demo+sam@test.com'    },
  { name: 'Morgan',       email: 'demo+morgan@test.com' },
  { name: 'Casey',        email: 'demo+casey@test.com'  },
  { name: 'Riley',        email: 'demo+riley@test.com'  },
  { name: 'Drew',         email: 'demo+drew@test.com'   },
]

// 36 results covering groups A-F (6 matches each)
const DEMO_RESULTS = [
  // Group A
  { id:1,  hg:2, ag:0 }, { id:2,  hg:1, ag:1 },
  { id:3,  hg:0, ag:2 }, { id:4,  hg:3, ag:1 },
  { id:5,  hg:2, ag:2 }, { id:6,  hg:1, ag:0 },
  // Group B
  { id:7,  hg:4, ag:1 }, { id:8,  hg:0, ag:0 },
  { id:9,  hg:1, ag:3 }, { id:10, hg:2, ag:1 },
  { id:11, hg:0, ag:1 }, { id:12, hg:3, ag:0 },
  // Group C
  { id:13, hg:1, ag:1 }, { id:14, hg:2, ag:0 },
  { id:15, hg:1, ag:2 }, { id:16, hg:0, ag:3 },
  { id:17, hg:2, ag:1 }, { id:18, hg:1, ag:0 },
  // Group D
  { id:19, hg:3, ag:2 }, { id:20, hg:1, ag:1 },
  { id:21, hg:0, ag:2 }, { id:22, hg:2, ag:0 },
  { id:23, hg:1, ag:1 }, { id:24, hg:4, ag:0 },
  // Group E
  { id:25, hg:2, ag:1 }, { id:26, hg:0, ag:1 },
  { id:27, hg:3, ag:3 }, { id:28, hg:1, ag:2 },
  { id:29, hg:2, ag:0 }, { id:30, hg:1, ag:1 },
  // Group F
  { id:31, hg:1, ag:0 }, { id:32, hg:2, ag:2 },
  { id:33, hg:0, ag:1 }, { id:34, hg:3, ag:1 },
  { id:35, hg:1, ag:1 }, { id:36, hg:2, ag:0 },
]

function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function generatePrediction(result, playerIndex, matchId) {
  // Player 0 (Shawn) is best, Player 7 (Drew) worst
  const accuracies = [0.85, 0.72, 0.64, 0.58, 0.50, 0.43, 0.36, 0.28]
  const accuracy = accuracies[Math.min(playerIndex, 7)]
  const rnd  = seededRand(playerIndex * 1337 + matchId * 7)
  const rnd2 = seededRand(playerIndex * 2671 + matchId * 13)

  if (rnd < accuracy * 0.22) {
    // Exact score
    return { hg: result.hg, ag: result.ag }
  } else if (rnd < accuracy) {
    // Correct result, different score
    const off = Math.floor(rnd2 * 2)
    if (result.hg > result.ag) return { hg: Math.max(1, result.hg - off), ag: Math.max(0, result.ag) }
    if (result.hg < result.ag) return { hg: Math.max(0, result.hg), ag: Math.max(1, result.ag - off) }
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

  log('Step 1/5 — Clearing any existing demo data...')
  await clearDemoData()

  // ── 1. Insert players one by one so we catch individual errors
  log('Step 2/5 — Creating 8 demo players...')
  const insertedPlayers = []
  for (const p of DEMO_PLAYERS) {
    const { data, error } = await supabase
      .from('players')
      .insert({ name: p.name, email: p.email, room_code: 'DEFAULT', auth_id: null })
      .select()
      .single()
    if (error) throw new Error(`Failed to insert ${p.name}: ${error.message}`)
    insertedPlayers.push(data)
  }
  log(`  Created ${insertedPlayers.length} players`)

  // ── 2. Write match results
  log('Step 3/5 — Writing match results...')
  let matchesWritten = 0
  for (const r of DEMO_RESULTS) {
    const { error } = await supabase.from('matches').update({
      home_goals: r.hg,
      away_goals: r.ag,
      home_goals_et: null,
      away_goals_et: null,
      home_goals_pen: null,
      away_goals_pen: null,
      status: 'FINISHED',
      updated_at: new Date().toISOString()
    }).eq('id', r.id)
    if (!error) matchesWritten++
  }
  log(`  Set ${matchesWritten} match results`)

  // ── 3. Fetch weights and matches
  const { data: weights } = await supabase
    .from('scoring_weights').select('*').eq('room_code','DEFAULT').single()

  const { data: finishedMatches } = await supabase
    .from('matches').select('*').in('id', DEMO_RESULTS.map(r => r.id))

  if (!weights) throw new Error('No scoring weights found — make sure the room is set up')
  if (!finishedMatches?.length) throw new Error('Matches not found after update')

  // ── 4. Generate and insert predictions
  log('Step 4/5 — Generating predictions...')
  const allPredictions = []
  const allScores = []

  for (let pi = 0; pi < insertedPlayers.length; pi++) {
    const player = insertedPlayers[pi]
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
          pts_result:  pts.pts_result,
          pts_diff:    pts.pts_diff,
          pts_exact:   pts.pts_exact,
          pts_approx:  pts.pts_approx,
          pts_ko_team: 0,
          pts_total:   pts.pts_total,
          calculated_at: new Date().toISOString()
        })
      }
    }
  }

  // Insert in chunks
  const CHUNK = 40
  for (let i = 0; i < allPredictions.length; i += CHUNK) {
    const { error } = await supabase.from('predictions').insert(allPredictions.slice(i, i + CHUNK))
    if (error) throw new Error(`Prediction insert failed at chunk ${i}: ${error.message}`)
  }
  log(`  Inserted ${allPredictions.length} predictions`)

  // ── 5. Upsert scores
  log('Step 5/5 — Computing and saving scores...')
  for (let i = 0; i < allScores.length; i += CHUNK) {
    const { error } = await supabase.from('scores')
      .upsert(allScores.slice(i, i + CHUNK), { onConflict: 'player_id,match_id' })
    if (error) throw new Error(`Score upsert failed at chunk ${i}: ${error.message}`)
  }
  log(`  Saved ${allScores.length} score records`)

  log('')
  log('Done! Go check Leaderboard, Stats, and All Predictions.')

  return {
    players: insertedPlayers.length,
    predictions: allPredictions.length,
    scores: allScores.length,
  }
}

export async function clearDemoData() {
  const demoEmails = DEMO_PLAYERS.map(p => p.email)

  // Get demo player IDs first
  const { data: demoPlayers } = await supabase
    .from('players').select('id').in('email', demoEmails)

  if (demoPlayers?.length) {
    const ids = demoPlayers.map(p => p.id)
    // Delete scores and predictions manually (in case cascade isn't set up)
    await supabase.from('scores').delete().in('player_id', ids)
    await supabase.from('predictions').delete().in('player_id', ids)
    await supabase.from('players').delete().in('id', ids)
  }

  // Reset match statuses
  await supabase.from('matches').update({
    home_goals: null, away_goals: null,
    home_goals_et: null, away_goals_et: null,
    home_goals_pen: null, away_goals_pen: null,
    status: 'SCHEDULED'
  }).in('id', DEMO_RESULTS.map(r => r.id))
}
