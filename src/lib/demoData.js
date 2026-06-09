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

// Realistic group stage results - all 72 matches
// Format: { id, hg, ag }
const GROUP_RESULTS = [
  // Group A: Mexico, South Africa, Belgium, Saudi Arabia
  {id:1,hg:2,ag:0},{id:2,hg:1,ag:1},{id:3,hg:0,ag:2},{id:4,hg:3,ag:1},{id:5,hg:2,ag:2},{id:6,hg:1,ag:0},
  // Group B: USA, OFC1, Morocco, Uruguay
  {id:7,hg:3,ag:0},{id:8,hg:1,ag:2},{id:9,hg:2,ag:1},{id:10,hg:0,ag:1},{id:11,hg:1,ag:1},{id:12,hg:2,ag:0},
  // Group C: Canada, Netherlands, Senegal, Serbia
  {id:13,hg:1,ag:1},{id:14,hg:2,ag:0},{id:15,hg:0,ag:2},{id:16,hg:3,ag:1},{id:17,hg:1,ag:0},{id:18,hg:2,ag:2},
  // Group D: Brazil, Nigeria, Australia, Poland
  {id:19,hg:4,ag:0},{id:20,hg:1,ag:1},{id:21,hg:3,ag:1},{id:22,hg:0,ag:2},{id:23,hg:2,ag:0},{id:24,hg:1,ag:1},
  // Group E: Argentina, Japan, Ecuador, Cameroon
  {id:25,hg:2,ag:1},{id:26,hg:1,ag:0},{id:27,hg:0,ag:0},{id:28,hg:3,ag:2},{id:29,hg:1,ag:1},{id:30,hg:2,ag:0},
  // Group F: Spain, Croatia, Tunisia, DR Congo
  {id:31,hg:3,ag:0},{id:32,hg:2,ag:1},{id:33,hg:1,ag:1},{id:34,hg:0,ag:2},{id:35,hg:2,ag:0},{id:36,hg:1,ag:3},
  // Group G: England, Iran, Colombia, Switzerland
  {id:37,hg:6,ag:2},{id:38,hg:1,ag:0},{id:39,hg:0,ag:1},{id:40,hg:3,ag:0},{id:41,hg:1,ag:2},{id:42,hg:0,ag:0},
  // Group H: France, South Korea, Chile, Iraq
  {id:43,hg:4,ag:1},{id:44,hg:2,ag:0},{id:45,hg:1,ag:1},{id:46,hg:2,ag:1},{id:47,hg:0,ag:2},{id:48,hg:3,ag:2},
  // Group I: Portugal, Ghana, Costa Rica, Czech Republic
  {id:49,hg:3,ag:2},{id:50,hg:0,ag:0},{id:51,hg:2,ag:1},{id:52,hg:1,ag:0},{id:53,hg:1,ag:2},{id:54,hg:3,ag:1},
  // Group J: Germany, Qatar, Sweden, Bosnia
  {id:55,hg:4,ag:0},{id:56,hg:2,ag:1},{id:57,hg:0,ag:3},{id:58,hg:2,ag:0},{id:59,hg:1,ag:1},{id:60,hg:3,ag:2},
  // Group K: Italy, Egypt, Venezuela, Turkey
  {id:61,hg:2,ag:0},{id:62,hg:1,ag:1},{id:63,hg:0,ag:2},{id:64,hg:3,ag:0},{id:65,hg:1,ag:2},{id:66,hg:2,ag:1},
  // Group L: Denmark, Ivory Coast, Peru, New Zealand
  {id:67,hg:2,ag:1},{id:68,hg:3,ag:0},{id:69,hg:1,ag:1},{id:70,hg:0,ag:2},{id:71,hg:2,ag:0},{id:72,hg:1,ag:1},
]

// KO round results with real team names
const KO_RESULTS = [
  // Round of 32
  {id:73,hg:2,ag:1,home:'Brazil',       away:'Senegal'},
  {id:74,hg:1,ag:0,home:'France',       away:'Colombia'},
  {id:75,hg:2,ag:2,home:'Argentina',    away:'Serbia',    hpen:4,apen:2},
  {id:76,hg:1,ag:0,home:'England',      away:'Nigeria'},
  {id:77,hg:3,ag:1,home:'Spain',        away:'Costa Rica'},
  {id:78,hg:0,ag:1,home:'Portugal',     away:'Uruguay'},
  {id:79,hg:2,ag:0,home:'Germany',      away:'Denmark'},
  {id:80,hg:1,ag:1,home:'Netherlands',  away:'Ghana',     hpen:5,apen:4},
  {id:81,hg:2,ag:0,home:'USA',          away:'Peru'},
  {id:82,hg:1,ag:2,home:'Mexico',       away:'Japan'},
  {id:83,hg:3,ag:0,home:'Canada',       away:'Saudi Arabia'},
  {id:84,hg:0,ag:1,home:'Croatia',      away:'Ecuador'},
  {id:85,hg:2,ag:1,home:'Italy',        away:'South Korea'},
  {id:86,hg:1,ag:0,home:'Morocco',      away:'Chile'},
  {id:87,hg:2,ag:1,home:'Switzerland',  away:'Ivory Coast'},
  {id:88,hg:3,ag:2,home:'Sweden',       away:'Turkey'},
  // Round of 16
  {id:89,hg:2,ag:0,home:'Brazil',       away:'France'},
  {id:90,hg:1,ag:2,home:'Argentina',    away:'England'},
  {id:91,hg:2,ag:1,home:'Spain',        away:'Uruguay'},
  {id:92,hg:0,ag:1,home:'Germany',      away:'Netherlands'},
  {id:93,hg:3,ag:1,home:'USA',          away:'Japan'},
  {id:94,hg:2,ag:0,home:'Canada',       away:'Ecuador'},
  {id:95,hg:1,ag:1,home:'Italy',        away:'Morocco',   hpen:4,apen:3},
  {id:96,hg:2,ag:1,home:'Switzerland',  away:'Sweden'},
  // Quarter-finals
  {id:97, hg:2,ag:1,home:'Brazil',      away:'England'},
  {id:98, hg:1,ag:0,home:'Spain',       away:'Netherlands'},
  {id:99, hg:2,ag:0,home:'USA',         away:'Canada'},
  {id:100,hg:1,ag:2,home:'Italy',       away:'Switzerland'},
  // Semi-finals
  {id:101,hg:3,ag:1,home:'Brazil',      away:'Spain'},
  {id:102,hg:2,ag:1,home:'USA',         away:'Switzerland'},
  // 3rd place + Final
  {id:103,hg:2,ag:1,home:'Spain',       away:'Switzerland'},
  {id:104,hg:3,ag:2,home:'Brazil',      away:'USA'},
]

const ALL_RESULTS = [...GROUP_RESULTS, ...KO_RESULTS]

function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function generatePrediction(result, playerIndex, matchId) {
  // Player 0 (Shawn) is best predictor, Player 7 (Drew) worst
  const accuracies = [0.85, 0.72, 0.64, 0.58, 0.50, 0.43, 0.36, 0.28]
  const acc  = accuracies[Math.min(playerIndex, 7)]
  const rnd  = seededRand(playerIndex * 1337 + matchId * 7)
  const rnd2 = seededRand(playerIndex * 2671 + matchId * 13)

  if (rnd < acc * 0.22) {
    // Exact score
    return { hg: result.hg, ag: result.ag }
  } else if (rnd < acc) {
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

  log('Step 1/5 - Clearing old demo data...')
  await clearDemoData()

  log('Step 2/5 - Creating 8 demo players...')
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

  log('Step 3/5 - Writing all 104 match results...')
  let written = 0
  for (const r of ALL_RESULTS) {
    const updateData = {
      home_goals:     r.hg,
      away_goals:     r.ag,
      home_goals_et:  null,
      away_goals_et:  null,
      home_goals_pen: r.hpen ?? null,
      away_goals_pen: r.apen ?? null,
      status:         'FINISHED',
      updated_at:     new Date().toISOString(),
    }
    // For KO matches, also update team names
    if (r.home) {
      updateData.home_team = r.home
      updateData.away_team = r.away
    }
    const { error } = await supabase.from('matches').update(updateData).eq('id', r.id)
    if (!error) written++
    else console.warn(`Match ${r.id} update failed:`, error.message)
  }
  log(`  Set ${written} / 104 match results`)

  log('Step 4/5 - Generating predictions for all 104 matches...')
  const { data: weights } = await supabase
    .from('scoring_weights').select('*').eq('room_code','DEFAULT').single()
  if (!weights) throw new Error('No scoring weights - run migrations first')

  const { data: allMatches } = await supabase
    .from('matches').select('*').in('id', ALL_RESULTS.map(r => r.id))
  if (!allMatches?.length) throw new Error('Matches not found in DB. Did you run migration 004_ko_matches.sql?')

  const allPreds = [], allScores = []
  for (let pi = 0; pi < insertedPlayers.length; pi++) {
    const player = insertedPlayers[pi]
    for (const result of ALL_RESULTS) {
      const match = allMatches.find(m => m.id === result.id)
      if (!match) continue
      const pred = generatePrediction(result, pi, result.id)
      allPreds.push({
        player_id:  player.id,
        match_id:   result.id,
        home_goals: pred.hg,
        away_goals: pred.ag,
      })
      const pts = calcMatchPoints(
        { home_goals: pred.hg, away_goals: pred.ag },
        { home_goals: result.hg, away_goals: result.ag },
        weights, match.phase
      )
      if (pts) allScores.push({
        player_id:   player.id,
        match_id:    result.id,
        pts_result:  pts.pts_result,
        pts_diff:    pts.pts_diff,
        pts_exact:   pts.pts_exact,
        pts_approx:  pts.pts_approx,
        pts_ko_team: 0,
        pts_total:   pts.pts_total,
        calculated_at: new Date().toISOString(),
      })
    }
  }

  const CHUNK = 50
  for (let i = 0; i < allPreds.length; i += CHUNK) {
    const { error } = await supabase.from('predictions').insert(allPreds.slice(i, i + CHUNK))
    if (error) throw new Error(`Prediction insert failed at chunk ${i}: ${error.message}`)
  }
  log(`  Inserted ${allPreds.length} predictions (${insertedPlayers.length} players x ${allMatches.length} matches)`)

  log('Step 5/5 - Saving scores...')
  for (let i = 0; i < allScores.length; i += CHUNK) {
    const { error } = await supabase.from('scores')
      .upsert(allScores.slice(i, i + CHUNK), { onConflict: 'player_id,match_id' })
    if (error) throw new Error(`Score upsert failed: ${error.message}`)
  }
  log(`  Saved ${allScores.length} score records`)
  log('')
  log('v Done! All 104 matches, 8 players, predictions + scores loaded.')
  log('  &rarr; Check Dashboard, Leaderboard, Stats, Fun Zone, All Predictions, Live Scores')

  return {
    players:     insertedPlayers.length,
    predictions: allPreds.length,
    scores:      allScores.length,
    matches:     allMatches.length,
  }
}

export async function clearDemoData() {
  const emails = DEMO_PLAYERS.map(p => p.email)
  const { data: found } = await supabase.from('players').select('id').in('email', emails)
  if (found?.length) {
    const ids = found.map(p => p.id)
    // Delete in correct order
    await supabase.from('scores').delete().in('player_id', ids)
    await supabase.from('predictions').delete().in('player_id', ids)
    await supabase.from('players').delete().in('id', ids)
  }
  // Reset ALL 104 matches back to SCHEDULED in batches
  const allIds = ALL_RESULTS.map(r => r.id)
  for (let i = 0; i < allIds.length; i += 20) {
    await supabase.from('matches').update({
      home_goals: null, away_goals: null,
      home_goals_et: null, away_goals_et: null,
      home_goals_pen: null, away_goals_pen: null,
      status: 'SCHEDULED',
    }).in('id', allIds.slice(i, i + 20))
  }
  // Also reset KO match team names back to TBD
  const koIds = KO_RESULTS.map(r => r.id)
  for (let i = 0; i < koIds.length; i += 10) {
    await supabase.from('matches').update({ home_team: 'TBD', away_team: 'TBD' })
      .in('id', koIds.slice(i, i + 10))
  }
}
