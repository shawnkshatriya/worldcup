// Achievement definitions + engine

export const ACHIEVEMENTS = [
  { id:'first_blood',   icon:'⚽', name:'First Blood',       desc:'Got your first correct result',                      tier:'bronze', check: s => s.correct >= 1 },
  { id:'eager',         icon:'⚡', name:'Eager Beaver',      desc:'Submitted 50+ predictions',                         tier:'bronze', check: s => s.preds >= 50 },
  { id:'hat_trick',     icon:'🎩', name:'Hat Trick',         desc:'3 exact scores',                                    tier:'silver', check: s => s.exact >= 3 },
  { id:'diff_king',     icon:'📐', name:'Diff King',         desc:'10 correct goal differences',                       tier:'silver', check: s => s.diff >= 10 },
  { id:'high_roller',   icon:'🎲', name:'High Roller',       desc:'5 approx bonuses on big-scoring games',             tier:'silver', check: s => s.approx >= 5 },
  { id:'ko_hunter',     icon:'🎯', name:'KO Hunter',         desc:'5 KO round team bonuses',                           tier:'silver', check: s => s.ko >= 5 },
  { id:'completionist', icon:'📋', name:'Completionist',     desc:'Predicted all 104 matches',                         tier:'gold',   check: s => s.preds >= 104 },
  { id:'psychic',       icon:'🔮', name:'Psychic',           desc:'5 exact scores — seriously how',                    tier:'gold',   check: s => s.exact >= 5 },
  { id:'consistent',   icon:'📈', name:'Mr Consistent',     desc:'100+ total points',                                 tier:'gold',   check: s => s.total >= 100 },
  { id:'oracle',        icon:'🧿', name:'Oracle',            desc:'10 exact scores. Statistically impossible.',        tier:'gold',   check: s => s.exact >= 10 },
  { id:'leader',        icon:'👑', name:'Leader',            desc:'Top of the table',                                  tier:'gold',   check: (_s, rank) => rank === 1 },
  { id:'podium',        icon:'🏅', name:'Podium',            desc:'Top 3 in the standings',                            tier:'silver', check: (_s, rank) => rank <= 3 },
  { id:'comeback',      icon:'🔥', name:'The Comeback',      desc:'Climbed 3+ places in one matchday',                 tier:'gold',   check: (_s, rank, prev) => prev && prev - rank >= 3 },
  { id:'bottler',       icon:'😬', name:'The Bottler',       desc:'Was #1, then wasn\'t',                              tier:'bronze', check: (_s, rank, prev) => prev === 1 && rank > 1 },
  { id:'unlucky',       icon:'💔', name:'Unlucky',           desc:'10 correct results, zero exact scores',             tier:'bronze', check: s => s.correct >= 10 && s.exact === 0 },
  { id:'entertainer',  icon:'🎭', name:'Entertainer',       desc:'5 correct draws',                                   tier:'bronze', check: s => s.draws >= 5 },
  { id:'nailed_nil',    icon:'🥅', name:'Nil Hero',          desc:'Predicted a 0-0 correctly',                         tier:'bronze', check: s => s.correct00 >= 1 },
]

export const TIER_COLORS = {
  bronze: { bg:'rgba(180,83,9,0.12)',   border:'rgba(180,83,9,0.3)',   text:'#b45309' },
  silver: { bg:'rgba(148,163,184,0.12)',border:'rgba(148,163,184,0.3)',text:'#94a3b8' },
  gold:   { bg:'rgba(240,165,0,0.12)',  border:'rgba(240,165,0,0.3)',  text:'#f0a500' },
}

export function computeAchievements(playerStats, rank, prevRank) {
  return ACHIEVEMENTS.filter(a => {
    try { return a.check(playerStats, rank, prevRank) } catch { return false }
  })
}

// ── Commentary engine ────────────────────────────────────────────────────────

function pick(arr, seed) {
  const i = Math.abs(Math.floor(Math.sin(seed + 1) * 10000)) % arr.length
  return arr[i]
}

const EXACT_LINES = [
  '{name} got {score} EXACTLY. How.',
  'Nobody tell {name}\'s boss they could be a professional tipster.',
  '{name} called {score} to the letter. Retire — you\'ve peaked.',
  'Investigating {name}\'s sources. Got {score} exactly.',
  '{name}: {score}. Actual: {score}. Eerie.',
]
const CORRECT_LINES = [
  '{name} called the result. Not exact, but they\'ll take it.',
  '{name} got it right. Quietly pleased with themselves, no doubt.',
  '{name} picked the winner. Solid.',
  'Result goes to {name}. They knew.',
]
const CLOSE_LINES = [
  '{name} was closest — predicted {pred}, actual {score}.',
  'Nearest miss: {name} with {pred} vs the real {score}.',
  '{name} came closest with {pred}. So close yet so far.',
]
const WRONG_LINES = [
  '{name} had {pred}. The score was {score}. Delete.',
  'Someone gently tell {name} it was {score}, not {pred}.',
  '{name} said {pred}. Football disagreed and gave us {score}.',
  '{name}\'s prediction of {pred}: brave, wrong, archived.',
  '{name} went with {pred}. A bold choice. A wrong choice.',
]
const NOBODY_LINES = [
  'Nobody predicted {score}. Everyone loses equally. Beautiful.',
  'The result was {score} — not a single person saw that coming.',
  '{score} and the whole pool is wrong. Football wins again.',
]

export function generateMatchCommentary(match, predictions) {
  if (match.home_goals == null) return []
  const rh = match.home_goals, ra = match.away_goals
  const scoreStr = `${rh}-${ra}`
  const realResult = Math.sign(rh - ra)
  const lines = []
  const seed = match.id * 137

  const exact   = predictions.filter(p => p.hg === rh && p.ag === ra)
  const correct  = predictions.filter(p => p.hg !== rh || p.ag !== ra).filter(p => Math.sign(p.hg - p.ag) === realResult)
  const wrong    = predictions.filter(p => Math.sign(p.hg - p.ag) !== realResult)

  if (exact.length === 0 && correct.length === 0) {
    lines.push({ type:'nobody', text: pick(NOBODY_LINES, seed).replace('{score}', scoreStr) })
  }

  exact.forEach((p, i) => {
    lines.push({ type:'exact', name: p.name, text:
      pick(EXACT_LINES, seed + i)
        .replace(/{name}/g, p.name).replace(/{score}/g, scoreStr)
    })
  })

  correct.slice(0, 3).forEach((p, i) => {
    lines.push({ type:'correct', name: p.name, text:
      pick(CORRECT_LINES, seed + 10 + i)
        .replace(/{name}/g, p.name).replace(/{score}/g, scoreStr)
    })
  })

  // Closest among wrong
  if (wrong.length > 0) {
    const withDist = wrong.map(p => ({
      ...p,
      dist: Math.abs(p.hg - rh) + Math.abs(p.ag - ra)
    })).sort((a, b) => a.dist - b.dist)
    const closest = withDist[0]
    if (closest.dist <= 2) {
      lines.push({ type:'close', name: closest.name, text:
        pick(CLOSE_LINES, seed + 20)
          .replace(/{name}/g, closest.name)
          .replace(/{pred}/g, `${closest.hg}-${closest.ag}`)
          .replace(/{score}/g, scoreStr)
      })
    }
    wrong.slice(0, 2).forEach((p, i) => {
      lines.push({ type:'wrong', name: p.name, text:
        pick(WRONG_LINES, seed + 30 + i)
          .replace(/{name}/g, p.name)
          .replace(/{pred}/g, `${p.hg}-${p.ag}`)
          .replace(/{score}/g, scoreStr)
      })
    })
  }

  return lines
}
