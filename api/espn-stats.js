// Aggregate goalscorers + assists across all finished World Cup matches from ESPN.
// Walks the scoreboard for finished events, pulls each summary's key events.
// Display-only. Cached server-side to limit ESPN calls.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200') // 10 min cache
  try {
    // 1. Get all events in the tournament window (Jun 11 - Jul 19 2026)
    var sbUrl = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=200'
    var sbRes = await fetch(sbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!sbRes.ok) return res.status(200).json({ ok: false, error: 'scoreboard ' + sbRes.status })
    var sb = await sbRes.json()

    var finishedIds = (sb.events || []).filter(function(ev) {
      var comp = ev.competitions && ev.competitions[0]
      var state = comp && comp.status && comp.status.type && comp.status.type.state
      return state === 'post'
    }).map(function(ev){ return ev.id })

    if (finishedIds.length === 0) return res.status(200).json({ ok: true, goals: [], assists: [] })

    var goalTally = {}  // name -> { name, team, goals }
    var assistTally = {} // name -> { name, team, assists }

    function bump(tally, name, team, key) {
      if (!name) return
      if (!tally[name]) tally[name] = { name: name, team: team, value: 0 }
      tally[name].value++
    }

    // 2. Fetch each finished match summary (cap to avoid timeout - most recent 40)
    var toFetch = finishedIds.slice(-40)
    var summaries = await Promise.all(toFetch.map(function(id) {
      return fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=' + id, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        .then(function(r){ return r.ok ? r.json() : null })
        .catch(function(){ return null })
    }))

    summaries.forEach(function(sum) {
      if (!sum) return
      var evs = sum.keyEvents || []
      evs.forEach(function(ev) {
        var t = (ev.type && ev.type.text) || ''
        var isGoal = ev.scoringPlay === true || (/goal/i.test(t) && !/disallowed|var|no goal/i.test(t))
        if (!isGoal) return
        var team = ev.team && ev.team.displayName
        // athletesInvolved: [0] = scorer, [1] = assist (ESPN convention)
        var involved = ev.athletesInvolved || ev.participants || []
        var scorer = involved[0] && (involved[0].displayName || (involved[0].athlete && involved[0].athlete.displayName))
        var assister = involved[1] && (involved[1].displayName || (involved[1].athlete && involved[1].athlete.displayName))
        if (!/own goal/i.test(t)) bump(goalTally, scorer, team)
        if (assister) bump(assistTally, assister, team)
      })
    })

    var goals = Object.keys(goalTally).map(function(k){ return { name: goalTally[k].name, team: goalTally[k].team, goals: goalTally[k].value } }).sort(function(a,b){ return b.goals - a.goals })
    var assists = Object.keys(assistTally).map(function(k){ return { name: assistTally[k].name, team: assistTally[k].team, assists: assistTally[k].value } }).sort(function(a,b){ return b.assists - a.assists })

    return res.status(200).json({ ok: true, goals: goals, assists: assists, matchesScanned: toFetch.length })
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) })
  }
}
