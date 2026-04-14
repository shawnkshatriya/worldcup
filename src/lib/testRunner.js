// --- Scoring engine unit tests ----------------------------------------------
import { calcMatchPoints } from './supabase'

const W = {
  group_result:3, group_diff:2, group_exact:4, group_approx:1,
  ko_result:3,    ko_diff:2,    ko_exact:5,    ko_team:2
}

function eq(a, b) {
  if (a !== b) throw new Error(`Expected ${b}, got ${a}`)
}

function test(name, fn) {
  try { fn(); return { name, pass:true } }
  catch(e) { return { name, pass:false, error:e.message } }
}

export function runScoringTests() {
  const r = []

  // -- GROUP STAGE ----------------------------------------------------------

  r.push(test('Exact score: 2-1 vs 2-1 &rarr; exact pts only, no stack', () => {
    const p = calcMatchPoints({home_goals:2,away_goals:1},{home_goals:2,away_goals:1},W,'GROUP_A')
    eq(p.pts_exact,4); eq(p.pts_result,0); eq(p.pts_diff,0); eq(p.pts_approx,0); eq(p.pts_total,4)
  }))

  r.push(test('Exact draw: 0-0 vs 0-0 &rarr; exact pts only', () => {
    const p = calcMatchPoints({home_goals:0,away_goals:0},{home_goals:0,away_goals:0},W,'GROUP_B')
    eq(p.pts_exact,4); eq(p.pts_total,4)
  }))

  r.push(test('Correct diff: pred 2-0, result 3-1 - same +2 margin, NO approx', () => {
    // isCorrectDiff=true (both +2 home wins)  &rarr; Tier 2 only, approx blocked
    const p = calcMatchPoints({home_goals:2,away_goals:0},{home_goals:3,away_goals:1},W,'GROUP_C')
    eq(p.pts_result,3); eq(p.pts_diff,2); eq(p.pts_approx,0); eq(p.pts_total,5)
  }))

  r.push(test('Correct diff: draw pred 2-2, result 1-1 - same 0 margin', () => {
    const p = calcMatchPoints({home_goals:2,away_goals:2},{home_goals:1,away_goals:1},W,'GROUP_D')
    eq(p.pts_result,3); eq(p.pts_diff,2); eq(p.pts_approx,0); eq(p.pts_total,5)
  }))

  r.push(test('Correct result only: pred 2-0, result 3-0 - different diff', () => {
    // diff +2 vs +3  &rarr; correct result only, no diff pts
    const p = calcMatchPoints({home_goals:2,away_goals:0},{home_goals:3,away_goals:0},W,'GROUP_E')
    eq(p.pts_result,3); eq(p.pts_diff,0); eq(p.pts_approx,0); eq(p.pts_total,3)
  }))

  r.push(test('Wrong result: pred 2-0, result 0-1 &rarr; zero pts', () => {
    const p = calcMatchPoints({home_goals:2,away_goals:0},{home_goals:0,away_goals:1},W,'GROUP_F')
    eq(p.pts_total,0)
  }))

  r.push(test('Wrong result away win: pred 0-1, result 1-0 &rarr; zero pts', () => {
    const p = calcMatchPoints({home_goals:0,away_goals:1},{home_goals:1,away_goals:0},W,'GROUP_G')
    eq(p.pts_total,0)
  }))

  r.push(test('Approx bonus fires: pred 3-2, result 4-2, total 6 goals', () => {
    // correct result, within 1 each, NOT correct diff (+1 vs +2)  &rarr; approx fires
    const p = calcMatchPoints({home_goals:3,away_goals:2},{home_goals:4,away_goals:2},W,'GROUP_H')
    eq(p.pts_result,3); eq(p.pts_diff,0); eq(p.pts_approx,1); eq(p.pts_total,4)
  }))

  r.push(test('Approx bonus blocked: low-scoring game (3 total goals)', () => {
    const p = calcMatchPoints({home_goals:1,away_goals:0},{home_goals:2,away_goals:1},W,'GROUP_A')
    eq(p.pts_approx,0)
  }))

  r.push(test('Approx bonus blocked: too far off by more than 1', () => {
    const p = calcMatchPoints({home_goals:0,away_goals:1},{home_goals:4,away_goals:2},W,'GROUP_B')
    eq(p.pts_approx,0)
  }))

  r.push(test('Approx bonus blocked: correct diff already rewarded', () => {
    // pred 3-2, result 4-3 - both +1, correct diff, approx must NOT stack
    const p = calcMatchPoints({home_goals:3,away_goals:2},{home_goals:4,away_goals:3},W,'GROUP_C')
    eq(p.pts_result,3); eq(p.pts_diff,2); eq(p.pts_approx,0); eq(p.pts_total,5)
  }))

  // -- KO ROUND ------------------------------------------------------------

  r.push(test('KO exact score &rarr; ko_exact pts, no approx ever', () => {
    const p = calcMatchPoints({home_goals:1,away_goals:0},{home_goals:1,away_goals:0},W,'ROUND_OF_16')
    eq(p.pts_exact,5); eq(p.pts_approx,0); eq(p.pts_total,5)
  }))

  r.push(test('KO correct diff &rarr; ko_result + ko_diff', () => {
    const p = calcMatchPoints({home_goals:2,away_goals:0},{home_goals:3,away_goals:1},W,'QUARTER_FINALS')
    eq(p.pts_result,3); eq(p.pts_diff,2); eq(p.pts_approx,0); eq(p.pts_total,5)
  }))

  r.push(test('KO correct result only', () => {
    const p = calcMatchPoints({home_goals:2,away_goals:0},{home_goals:1,away_goals:0},W,'SEMI_FINALS')
    eq(p.pts_result,3); eq(p.pts_diff,0); eq(p.pts_approx,0); eq(p.pts_total,3)
  }))

  r.push(test('KO wrong result &rarr; zero', () => {
    const p = calcMatchPoints({home_goals:0,away_goals:1},{home_goals:2,away_goals:0},W,'FINAL')
    eq(p.pts_total,0)
  }))

  // -- EDGE CASES -----------------------------------------------------------

  r.push(test('Null prediction &rarr; returns null', () => {
    const p = calcMatchPoints({home_goals:null,away_goals:null},{home_goals:2,away_goals:1},W,'GROUP_A')
    eq(p, null)
  }))

  r.push(test('Null result &rarr; returns null', () => {
    const p = calcMatchPoints({home_goals:1,away_goals:0},{home_goals:null,away_goals:null},W,'GROUP_A')
    eq(p, null)
  }))

  r.push(test('String inputs coerced correctly (DB returns strings)', () => {
    const p = calcMatchPoints({home_goals:'2',away_goals:'1'},{home_goals:'2',away_goals:'1'},W,'GROUP_A')
    eq(p.pts_exact,4); eq(p.pts_total,4)
  }))

  return r
}
