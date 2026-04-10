// ─── Unit test runner for the scoring engine ────────────────────────────────
import { calcMatchPoints } from './supabase'

const DEFAULT_WEIGHTS = {
  group_result: 3, group_diff: 2, group_exact: 4, group_approx: 1,
  ko_result: 3, ko_diff: 2, ko_exact: 5, ko_team: 2
}

function test(name, fn) {
  try {
    fn()
    return { name, pass: true }
  } catch (e) {
    return { name, pass: false, error: e.message }
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toEqual(expected) {
      const a = JSON.stringify(actual), b = JSON.stringify(expected)
      if (a !== b) throw new Error(`Expected ${b}, got ${a}`)
    }
  }
}

export function runScoringTests() {
  const w = DEFAULT_WEIGHTS
  const results = []

  // ── Group stage tests ────────────────────────────────────────────────────

  results.push(test('Exact score gives full pts (no double-dip)', () => {
    const pts = calcMatchPoints({ home_goals: 2, away_goals: 1 }, { home_goals: 2, away_goals: 1 }, w, 'GROUP_A')
    expect(pts.pts_exact).toBe(4)
    expect(pts.pts_result).toBe(0)
    expect(pts.pts_diff).toBe(0)
    expect(pts.pts_total).toBe(4)
  }))

  results.push(test('Correct result + correct diff = result + diff pts', () => {
    const pts = calcMatchPoints({ home_goals: 3, away_goals: 1 }, { home_goals: 2, away_goals: 0 }, w, 'GROUP_B')
    expect(pts.pts_result).toBe(3)
    expect(pts.pts_diff).toBe(2)
    expect(pts.pts_exact).toBe(0)
    expect(pts.pts_total).toBe(5)
  }))

  results.push(test('Correct result only (different diff)', () => {
    const pts = calcMatchPoints({ home_goals: 2, away_goals: 0 }, { home_goals: 3, away_goals: 1 }, w, 'GROUP_C')
    expect(pts.pts_result).toBe(3)
    expect(pts.pts_diff).toBe(0)
    expect(pts.pts_exact).toBe(0)
    expect(pts.pts_total).toBe(3)
  }))

  results.push(test('Wrong result = 0 pts', () => {
    const pts = calcMatchPoints({ home_goals: 2, away_goals: 0 }, { home_goals: 0, away_goals: 1 }, w, 'GROUP_A')
    expect(pts.pts_total).toBe(0)
  }))

  results.push(test('Correct draw', () => {
    const pts = calcMatchPoints({ home_goals: 1, away_goals: 1 }, { home_goals: 2, away_goals: 2 }, w, 'GROUP_D')
    expect(pts.pts_result).toBe(3)
    expect(pts.pts_diff).toBe(2) // same diff: 0
    expect(pts.pts_exact).toBe(0)
  }))

  results.push(test('Exact draw', () => {
    const pts = calcMatchPoints({ home_goals: 0, away_goals: 0 }, { home_goals: 0, away_goals: 0 }, w, 'GROUP_E')
    expect(pts.pts_exact).toBe(4)
    expect(pts.pts_total).toBe(4)
  }))

  results.push(test('Approx bonus: predicted within 1 goal each on 4+ goal game', () => {
    const pts = calcMatchPoints({ home_goals: 3, away_goals: 2 }, { home_goals: 4, away_goals: 2 }, w, 'GROUP_F')
    expect(pts.pts_approx).toBe(1)
  }))

  results.push(test('No approx bonus on low-scoring game', () => {
    const pts = calcMatchPoints({ home_goals: 1, away_goals: 0 }, { home_goals: 2, away_goals: 1 }, w, 'GROUP_G')
    expect(pts.pts_approx).toBe(0)
  }))

  results.push(test('Approx bonus does not fire if too far off', () => {
    const pts = calcMatchPoints({ home_goals: 1, away_goals: 0 }, { home_goals: 4, away_goals: 2 }, w, 'GROUP_H')
    expect(pts.pts_approx).toBe(0)
  }))

  results.push(test('Wrong direction result, no pts even with close score', () => {
    const pts = calcMatchPoints({ home_goals: 0, away_goals: 1 }, { home_goals: 1, away_goals: 0 }, w, 'GROUP_I')
    expect(pts.pts_total).toBe(0)
  }))

  // ── KO round tests ───────────────────────────────────────────────────────

  results.push(test('KO exact score gives ko_exact pts', () => {
    const pts = calcMatchPoints({ home_goals: 1, away_goals: 0 }, { home_goals: 1, away_goals: 0 }, w, 'ROUND_OF_16')
    expect(pts.pts_exact).toBe(5)
    expect(pts.pts_total).toBe(5)
  }))

  results.push(test('KO correct result only', () => {
    const pts = calcMatchPoints({ home_goals: 2, away_goals: 0 }, { home_goals: 1, away_goals: 0 }, w, 'QUARTER_FINALS')
    expect(pts.pts_result).toBe(3)
    expect(pts.pts_diff).toBe(0)
  }))

  results.push(test('KO no approx bonus', () => {
    const pts = calcMatchPoints({ home_goals: 3, away_goals: 2 }, { home_goals: 4, away_goals: 2 }, w, 'SEMI_FINALS')
    expect(pts.pts_approx).toBe(0)
  }))

  results.push(test('Missing prediction returns null', () => {
    const pts = calcMatchPoints({ home_goals: null, away_goals: null }, { home_goals: 2, away_goals: 1 }, w, 'GROUP_A')
    expect(pts).toBe(null)
  }))

  results.push(test('Missing result returns null', () => {
    const pts = calcMatchPoints({ home_goals: 1, away_goals: 0 }, { home_goals: null, away_goals: null }, w, 'GROUP_A')
    expect(pts).toBe(null)
  }))

  return results
}
