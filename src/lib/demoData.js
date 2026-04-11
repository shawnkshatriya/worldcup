import { supabase, calcMatchPoints } from './supabase'

export const DEMO_PLAYERS = [
  { name: 'Shawn (Demo)', email: 'demo+shawn@wc26.test'  },
  { name: 'Alex',         email: 'demo+alex@wc26.test'   },
  { name: 'Jordan',       email: 'demo+jordan@wc26.test' },
  { name: 'Sam',          email: 'demo+sam@wc26.test'    },
  { name: 'Morgan',       email: 'demo+morgan@wc26.test' },
  { name: 'Casey',        email: 'demo+casey@wc26.test'  },
  { name: 'Riley',        email: 'demo+riley@wc26.test'  },
  { name: 'Drew',         email: 'demo+drew@wc26.test'   },
]

// All 72 group stage matches + 16 KO matches for full coverage
// Group stage: ids 1-72, KO round of 32: ids 73-88
const GROUP_RESULTS = [
  // Group A (ids 1-6)
  {id:1,hg:2,ag:0},{id:2,hg:1,ag:1},{id:3,hg:0,ag:2},{id:4,hg:3,ag:1},{id:5,hg:2,ag:2},{id:6,hg:1,ag:0},
  // Group B (ids 7-12)
  {id:7,hg:4,ag:1},{id:8,hg:0,ag:0},{id:9,hg:1,ag:3},{id:10,hg:2,ag:1},{id:11,hg:0,ag:1},{id:12,hg:3,ag:0},
  // Group C (ids 13-18)
  {id:13,hg:1,ag:1},{id:14,hg:2,ag:0},{id:15,hg:1,ag:2},{id:16,hg:0,ag:3},{id:17,hg:2,ag:1},{id:18,hg:1,ag:0},
  // Group D (ids 19-24)
  {id:19,hg:3,ag:2},{id:20,hg:1,ag:1},{id:21,hg:0,ag:2},{id:22,hg:2,ag:0},{id:23,hg:1,ag:1},{id:24,hg:4,ag:0},
  // Group E (ids 25-30)
  {id:25,hg:2,ag:1},{id:26,hg:0,ag:1},{id:27,hg:3,ag:3},{id:28,hg:1,ag:2},{id:29,hg:2,ag:0},{id:30,hg:1,ag:1},
  // Group F (ids 31-36)
  {id:31,hg:1,ag:0},{id:32,hg:2,ag:2},{id:33,hg:0,ag:1},{id:34,hg:3,ag:1},{id:35,hg:1,ag:1},{id:36,hg:2,ag:0},
  // Group G (ids 37-42)
  {id:37,hg:3,ag:0},{id:38,hg:1,ag:1},{id:39,hg:2,ag:1},{id:40,hg:0,ag:2},{id:41,hg:1,ag:0},{id:42,hg:2,ag:3},
  // Group H (ids 43-48)
  {id:43,hg:1,ag:0},{id:44,hg:2,ag:1},{id:45,hg:0,ag:0},{id:46,hg:3,ag:2},{id:47,hg:1,ag:2},{id:48,hg:0,ag:1},
  // Group I (ids 49-54)
  {id:49,hg:2,ag:0},{id:50,hg:1,ag:1},{id:51,hg:3,ag:1},{id:52,hg:0,ag:2},{id:53,hg:1,ag:0},{id:54,hg:2,ag:2},
  // Group J (ids 55-60)
  {id:55,hg:4,ag:2},{id:56,hg:1,ag:0},{id:57,hg:0,ag:1},{id:58,hg:2,ag:1},{id:59,hg:1,ag:1},{id:60,hg:3,ag:0},
  // Group K (ids 61-66)
  {id:61,hg:1,ag:1},{id:62,hg:2,ag:0},{id:63,hg:0,ag:2},{id:64,hg:1,ag:0},{id:65,hg:3,ag:1},{id:66,hg:1,ag:2},
  // Group L (ids 67-72)
  {id:67,hg:2,ag:1},{id:68,hg:0,ag:0},{id:69,hg:1,ag:2},{id:70,hg:3,ag:0},{id:71,hg:1,ag:1},{id:72,hg:2,ag:0},
]

// Round of 32 (ids 73-88) — use update on these as they're KO
const KO_RESULTS = [
  {id:73,hg:2,ag:1},{id:74,hg:0,ag:1},{id:75,hg:3,ag:2},{id:76,hg:1,ag:0},
  {id:77,hg:2,ag:2},{id:78,hg:1,ag:0},{id:79,hg:0,ag:1},{id:80,hg:2,ag:0},
  {id:81,hg:1,ag:1},{id:82,hg:2,ag:1},{id:83,hg:0,ag:2},{id:84,hg:1,ag:0},
  {id:85,hg:3,ag:1},{id:86,hg:0,ag:0},{id:87,hg:1,ag:2},{id:88,hg:2,ag:1},
]

const ALL_RESULTS = [...GROUP_RESULTS, ...KO_RESULTS]

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

  log('Step 3/5 — Writing match results...')
  let written = 0
  for (const r of ALL_RESULTS) {
    const { error } = await supabase.from('matches').update({
      home_goals: r.hg, away_goals: r.ag,
      home_goals_et: null, away_goals_et: null,
      home_goals_pen: null, away_goals_pen: null,
      status: 'FINISHED', updated_at: new Date().toISOString()
    }).eq('id', r.id)
    if (!error) written++
  }
  log(`  Set ${written} match results (${GROUP_RESULTS.length} group + ${KO_RESULTS.length} KO)`)

  log('Step 4/5 — Generating predictions...')
  const { data: weights } = await supabase
    .from('scoring_weights').select('*').eq('room_code','DEFAULT').single()
  if (!weights) throw new Error('No scoring weights found')

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
    if (error) throw new Error(`Prediction insert failed: ${error.message}`)
  }
  log(`  Inserted ${allPreds.length} predictions`)

  log('Step 5/5 — Saving scores...')
  for (let i = 0; i < allScores.length; i += CHUNK) {
    const { error } = await supabase.from('scores')
      .upsert(allScores.slice(i, i + CHUNK), { onConflict: 'player_id,match_id' })
    if (error) throw new Error(`Score upsert failed: ${error.message}`)
  }
  log(`  Saved ${allScores.length} score records`)
  log('')
  log('Done! Check Leaderboard, Stats, Fun Zone, and All Predictions.')

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
  // Reset all match results (group + KO)
  const allIds = ALL_RESULTS.map(r => r.id)
  await supabase.from('matches').update({
    home_goals: null, away_goals: null, home_goals_et: null,
    away_goals_et: null, home_goals_pen: null, away_goals_pen: null,
    status: 'SCHEDULED'
  }).in('id', allIds)
}
