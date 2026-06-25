// FIFA 2026 World Cup knockout bracket linkage.
// Defines which matches feed into which - so a pick cascades through the tree.
//
// 2026 format: R32 (matches 73-88) -> R16 (89-96) -> QF (97-100) -> SF (101-102)
//   -> 3rd place (103) -> Final (104)
//
// Standard FIFA bracket pairing: consecutive match winners feed the next round.
// M73 winner + M74 winner -> M89, M75+M76 -> M90, etc.
//
// NOTE: This uses the conventional sequential bracket structure. If your DB uses
// different match numbers, the linkage is derived dynamically in buildBracketTree().

// Maps each KO phase to the next, with how matches combine.
export const KO_ROUND_ORDER = ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','FINAL']

// Exact FIFA 2026 bracket linkage by MATCH NUMBER.
// Format: { [matchNumber]: { feedsInto: nextMatchNumber, slot: 'home'|'away' } }
// Derived from FIFA's official knockout schedule.
//   M89 = W74(home) + W77(away)    M90 = W73(home) + W75(away)
//   M91 = W76(home) + W78(away)    M92 = W79(home) + W80(away)
//   M93 = W83(home) + W84(away)    M94 = W81(home) + W82(away)
//   M95 = W86(home) + W88(away)    M96 = W85(home) + W87(away)
//   M97 = W89 + W90   M98 = W93 + W94   M99 = W91 + W92   M100 = W95 + W96
//   M101 = W97 + W98  M102 = W99 + W100
//   M104 = W101 + W102  (Final);  M103 = L101 + L102 (3rd place - handled separately)
const FIFA_LINKAGE = {
  // R32 -> R16
  74: { feedsInto: 89, slot: 'home' }, 77: { feedsInto: 89, slot: 'away' },
  73: { feedsInto: 90, slot: 'home' }, 75: { feedsInto: 90, slot: 'away' },
  76: { feedsInto: 91, slot: 'home' }, 78: { feedsInto: 91, slot: 'away' },
  79: { feedsInto: 92, slot: 'home' }, 80: { feedsInto: 92, slot: 'away' },
  83: { feedsInto: 93, slot: 'home' }, 84: { feedsInto: 93, slot: 'away' },
  81: { feedsInto: 94, slot: 'home' }, 82: { feedsInto: 94, slot: 'away' },
  86: { feedsInto: 95, slot: 'home' }, 88: { feedsInto: 95, slot: 'away' },
  85: { feedsInto: 96, slot: 'home' }, 87: { feedsInto: 96, slot: 'away' },
  // R16 -> QF
  89: { feedsInto: 97, slot: 'home' }, 90: { feedsInto: 97, slot: 'away' },
  93: { feedsInto: 98, slot: 'home' }, 94: { feedsInto: 98, slot: 'away' },
  91: { feedsInto: 99, slot: 'home' }, 92: { feedsInto: 99, slot: 'away' },
  95: { feedsInto: 100, slot: 'home' }, 96: { feedsInto: 100, slot: 'away' },
  // QF -> SF
  97: { feedsInto: 101, slot: 'home' }, 98: { feedsInto: 101, slot: 'away' },
  99: { feedsInto: 102, slot: 'home' }, 100: { feedsInto: 102, slot: 'away' },
  // SF -> Final
  101: { feedsInto: 104, slot: 'home' }, 102: { feedsInto: 104, slot: 'away' },
}

// Visual bracket order per round (by match_number), so paired matches sit adjacent
// and each match lines up with the one it feeds into.
// Derived by walking the tree from the Final backwards:
//   Final(104) = SF101 + SF102
//   SF101 = QF97 + QF98 ; SF102 = QF99 + QF100
//   QF97 = R16:89+90 ; QF98 = 93+94 ; QF99 = 91+92 ; QF100 = 95+96
//   R16:89=R32 74+77 ; 90=73+75 ; 91=76+78 ; 92=79+80 ; 93=83+84 ; 94=81+82 ; 95=86+88 ; 96=85+87
export const BRACKET_ORDER = {
  ROUND_OF_32: [74,77, 73,75, 76,78, 79,80, 83,84, 81,82, 86,88, 85,87],
  ROUND_OF_16: [89,90, 91,92, 93,94, 95,96],
  QUARTER_FINALS: [97,99, 98,100],
  SEMI_FINALS: [101,102],
  FINAL: [104],
}

// Sort a round's matches into bracket display order.
// Bracket halves for the mirrored (left/right) layout.
// Left half feeds Semifinal 1 (match 101), right half feeds Semifinal 2 (102).
// The Final (104) sits in the center. Ordered top-to-bottom within each round.
export const BRACKET_SIDES = {
  left: {
    ROUND_OF_32: [74,77, 73,75, 81,82, 83,84],
    ROUND_OF_16: [89,90, 94,93],
    QUARTER_FINALS: [97,98],
    SEMI_FINALS: [101],
  },
  right: {
    ROUND_OF_32: [76,78, 79,80, 86,88, 85,87],
    ROUND_OF_16: [91,92, 95,96],
    QUARTER_FINALS: [99,100],
    SEMI_FINALS: [102],
  },
  center: { FINAL: [104], THIRD_PLACE: [103] },
}

// Order a round's matches for one side of the bracket.
export function orderSideMatches(side, phase, matches) {
  var order = (BRACKET_SIDES[side] || {})[phase]
  if (!order) return []
  var byNum = {}
  matches.forEach(function(m){ byNum[m.match_number] = m })
  return order.map(function(n){ return byNum[n] }).filter(Boolean)
}

export function orderMatchesForBracket(phase, matches) {
  var order = BRACKET_ORDER[phase]
  if (!order) return matches.slice().sort(function(a,b){ return (a.match_number||a.id)-(b.match_number||b.id) })
  var rank = {}
  order.forEach(function(num, i){ rank[num] = i })
  return matches.slice().sort(function(a,b){
    var ra = rank[a.match_number] != null ? rank[a.match_number] : 999
    var rb = rank[b.match_number] != null ? rank[b.match_number] : 999
    return ra - rb
  })
}
export function buildBracketLinkage(matches) {
  var idByNumber = {}
  matches.forEach(function(m){ idByNumber[m.match_number] = m.id })
  var linkage = {}
  matches.forEach(function(m){
    var rule = FIFA_LINKAGE[m.match_number]
    if (rule && idByNumber[rule.feedsInto]) {
      linkage[m.id] = { feedsInto: idByNumber[rule.feedsInto], slot: rule.slot }
    }
  })
  return linkage
}

// Given bracket picks (matchId -> picked_team) and linkage, compute the PREDICTED
// team in each slot of each match (cascading the user's picks forward).
// Returns { [matchId]: { predHome, predAway } }
export function computePredictedTeams(matches, linkage, bracketPicks) {
  var predicted = {} // matchId -> { predHome, predAway }
  matches.forEach(function(m){
    predicted[m.id] = { predHome: m.home_team || null, predAway: m.away_team || null }
  })

  // Process rounds in order so earlier picks cascade forward
  var byPhase = {}
  KO_ROUND_ORDER.forEach(function(ph){ byPhase[ph] = [] })
  matches.forEach(function(m){ if (byPhase[m.phase]) byPhase[m.phase].push(m) })
  KO_ROUND_ORDER.forEach(function(ph){
    byPhase[ph].sort(function(a,b){ return (a.match_number||a.id) - (b.match_number||b.id) })
  })

  for (var r = 0; r < KO_ROUND_ORDER.length; r++) {
    var round = byPhase[KO_ROUND_ORDER[r]]
    for (var i = 0; i < round.length; i++) {
      var m = round[i]
      var pick = bracketPicks[m.id]
      if (!pick) continue
      var link = linkage[m.id]
      if (link && predicted[link.feedsInto]) {
        if (link.slot === 'home') predicted[link.feedsInto].predHome = pick
        else predicted[link.feedsInto].predAway = pick
      }
    }
  }

  // 3rd place match (match_number 103) = the LOSERS of the two semifinals.
  // For each SF, the predicted loser is the predicted matchup team the player did NOT pick.
  var sfMatches = matches.filter(function(m){ return m.phase === 'SEMI_FINALS' })
    .sort(function(a,b){ return (a.match_number||a.id)-(b.match_number||b.id) })
  var thirdMatch = matches.find(function(m){ return m.phase === 'THIRD_PLACE' })
  if (thirdMatch && sfMatches.length === 2) {
    var losers = sfMatches.map(function(sf){
      var slot = predicted[sf.id]
      var pick = bracketPicks[sf.id]
      if (!slot || !pick) return null
      // The loser is whichever predicted team isn't the pick
      if (slot.predHome && slot.predHome !== pick) return slot.predHome
      if (slot.predAway && slot.predAway !== pick) return slot.predAway
      return null
    })
    predicted[thirdMatch.id] = {
      predHome: losers[0] || thirdMatch.home_team || null,
      predAway: losers[1] || thirdMatch.away_team || null,
    }
  }

  return predicted
}
