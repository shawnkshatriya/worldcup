// ESPN match detail proxy (unofficial API) - goalscorers, stats, lineups.
// This is a DISPLAY-ONLY garnish layer. Scoring relies on football-data.org.
// If ESPN changes or breaks, this fails gracefully and the app still works.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  var home = req.query.home
  var away = req.query.away
  var dateStr = req.query.date // YYYYMMDD

  if (!home || !away) return res.status(400).json({ ok: false, error: 'home and away required' })

  try {
    // 1. Find the ESPN event by matching team names on the scoreboard for that date
    var sbUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
    if (dateStr) sbUrl += '?dates=' + dateStr
    var sbRes = await fetch(sbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!sbRes.ok) return res.status(200).json({ ok: false, error: 'scoreboard ' + sbRes.status })
    var sb = await sbRes.json()

    var events = sb.events || []
    function norm(s) { return (s || '').toLowerCase().replace(/[^a-z]/g, '') }
    var target = events.find(function(ev) {
      var comp = ev.competitions && ev.competitions[0]
      if (!comp) return false
      var teams = (comp.competitors || []).map(function(c) { return norm(c.team && c.team.displayName) })
      return teams.includes(norm(home)) && teams.includes(norm(away))
    })

    if (!target) return res.status(200).json({ ok: false, error: 'event not found' })

    // Extract live score + clock from the scoreboard event (faster than football-data)
    var liveScore = null
    var comp0 = target.competitions && target.competitions[0]
    if (comp0) {
      var compsArr = comp0.competitors || []
      var homeComp = compsArr.find(function(c){ return norm(c.team && c.team.displayName) === norm(home) })
      var awayComp = compsArr.find(function(c){ return norm(c.team && c.team.displayName) === norm(away) })
      if (homeComp && awayComp) {
        liveScore = {
          home: Number(homeComp.score),
          away: Number(awayComp.score),
          clock: comp0.status && comp0.status.displayClock,
          period: comp0.status && comp0.status.period,
          state: comp0.status && comp0.status.type && comp0.status.type.state, // pre / in / post
          detail: comp0.status && comp0.status.type && comp0.status.type.shortDetail,
        }
      }
    }

    // 2. Fetch the summary for that event
    var sumRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=' + target.id, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!sumRes.ok) return res.status(200).json({ ok: false, error: 'summary ' + sumRes.status })
    var sum = await sumRes.json()

    // 3. Extract goalscorers (key events)
    var goals = []
    ;(sum.keyEvents || sum.commentary || []).forEach(function(ev) {
      var t = (ev.type && ev.type.text) || ''
      if (/goal/i.test(t) && !/disallowed|var/i.test(t)) {
        goals.push({
          player: ev.athletesInvolved && ev.athletesInvolved[0] ? ev.athletesInvolved[0].displayName : (ev.text || '').split(' ')[0],
          minute: ev.clock && ev.clock.displayValue ? ev.clock.displayValue : (ev.time && ev.time.displayValue) || '',
          team: ev.team && ev.team.displayName,
          ownGoal: /own goal/i.test(t),
          penalty: /penalty/i.test(t),
        })
      }
    })

    // 4. Extract match stats (possession, shots, etc.)
    var stats = []
    var boxscore = sum.boxscore
    if (boxscore && boxscore.teams && boxscore.teams.length === 2) {
      var t0 = boxscore.teams[0], t1 = boxscore.teams[1]
      var s0 = (t0.statistics || []), s1 = (t1.statistics || [])
      s0.forEach(function(stat, i) {
        var match1 = s1.find(function(x) { return x.name === stat.name })
        stats.push({
          label: stat.label || stat.name,
          home: stat.displayValue,
          away: match1 ? match1.displayValue : '-',
        })
      })
    }

    // 5. Lineups / formations
    var lineups = null
    if (sum.rosters && sum.rosters.length === 2) {
      lineups = sum.rosters.map(function(r) {
        return {
          team: r.team && r.team.displayName,
          formation: r.formation,
          starters: (r.roster || []).filter(function(p) { return p.starter }).map(function(p) {
            return { name: p.athlete && p.athlete.displayName, pos: p.position && p.position.abbreviation }
          }),
        }
      })
    }

    return res.status(200).json({
      ok: true,
      eventId: target.id,
      liveScore: liveScore,
      goals: goals,
      stats: stats,
      lineups: lineups,
    })
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) })
  }
}
