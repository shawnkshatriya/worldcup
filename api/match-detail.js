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
    // 1. Find the ESPN event by matching team names on the scoreboard.
    // Query a 3-day window around the kickoff to handle UTC/local day shifts.
    var sbUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
    if (dateStr && dateStr.length === 8) {
      var y = +dateStr.slice(0,4), mo = +dateStr.slice(4,6), da = +dateStr.slice(6,8)
      var center = new Date(Date.UTC(y, mo-1, da))
      var start = new Date(center); start.setUTCDate(center.getUTCDate()-1)
      var end = new Date(center); end.setUTCDate(center.getUTCDate()+1)
      function fmt(d){ return '' + d.getUTCFullYear() + String(d.getUTCMonth()+1).padStart(2,'0') + String(d.getUTCDate()).padStart(2,'0') }
      sbUrl += '?dates=' + fmt(start) + '-' + fmt(end)
    } else if (dateStr) {
      sbUrl += '?dates=' + dateStr
    }
    var sbRes = await fetch(sbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!sbRes.ok) return res.status(200).json({ ok: false, error: 'scoreboard ' + sbRes.status })
    var sb = await sbRes.json()

    var events = sb.events || []
    function norm(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g, '') }
    // Compact alias map -> canonical normalized key (handles ESPN vs our DB names)
    var ALIASES = {
      'drcongo':'drcongo','congodr':'drcongo','democraticrepublicofcongo':'drcongo','democraticrepublicofthecongo':'drcongo',
      'southkorea':'southkorea','korearepublic':'southkorea','republicofkorea':'southkorea',
      'czechia':'czechia','czechrepublic':'czechia',
      'capeverde':'capeverde','caboverde':'capeverde','capeverdeislands':'capeverde',
      'ivorycoast':'ivorycoast','cotedivoire':'ivorycoast',
      'iran':'iran','iriran':'iran',
      'unitedstates':'unitedstates','usa':'unitedstates','unitedstatesofamerica':'unitedstates',
      'turkey':'turkey','turkiye':'turkey',
      'curacao':'curacao',
      'saudiarabia':'saudiarabia','saudiarabiaksa':'saudiarabia',
      'bosniaandherzegovina':'bosnia','bosniaherzegovina':'bosnia','bosnia':'bosnia',
    }
    function canon(s) { var n = norm(s); return ALIASES[n] || n }
    var target = events.find(function(ev) {
      var comp = ev.competitions && ev.competitions[0]
      if (!comp) return false
      var teams = (comp.competitors || []).map(function(c) { return canon(c.team && c.team.displayName) })
      return teams.includes(canon(home)) && teams.includes(canon(away))
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
    var evs = sum.keyEvents || (sum.commentary || [])
    evs.forEach(function(ev) {
      var t = (ev.type && ev.type.text) || ''
      var isGoal = ev.scoringPlay === true || (/goal/i.test(t) && !/disallowed|var|no goal/i.test(t))
      if (!isGoal) return
      // Try every path ESPN uses for the scorer
      var scorer = null
      var pools = [ev.athletesInvolved, ev.participants].filter(Boolean)
      for (var pi = 0; pi < pools.length && !scorer; pi++) {
        var arr = pools[pi]
        if (arr && arr[0]) {
          var a0 = arr[0]
          scorer = a0.displayName || a0.shortName ||
                   (a0.athlete && (a0.athlete.displayName || a0.athlete.shortName))
        }
      }
      if (!scorer && ev.text) scorer = ev.text.replace(/^goal!?\s*/i, '').trim()
      goals.push({
        player: scorer || 'Unknown',
        minute: (ev.clock && ev.clock.displayValue) || (ev.time && ev.time.displayValue) || '',
        team: ev.team && ev.team.displayName,
        ownGoal: /own goal/i.test(t),
        penalty: /penalty/i.test(t),
      })
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
      // debug: shape of first key event, helps diagnose missing scorer names
      _debug: (evs && evs[0]) ? Object.keys(evs[0]) : null,
    })
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) })
  }
}
