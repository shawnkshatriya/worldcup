// Fetches upcoming KO matches from ESPN scoreboard across the R32 date range.
// Used to fill team names into KO bracket slots before football-data confirms them.
// ESPN usually has confirmed team names within hours of qualification.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600') // cache 5 min

  var matches = []
  var errors = []

  // Fetch R32 window: June 28 – July 4 (days when R32 matches are played)
  var dates = [
    '20260628','20260629','20260630',
    '20260701','20260702','20260703','20260704'
  ]

  for (var i = 0; i < dates.length; i++) {
    try {
      var url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=' + dates[i]
      var r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      })
      if (!r.ok) { errors.push(dates[i] + ':' + r.status); continue }
      var sb = await r.json()
      var evts = sb.events || []
      for (var j = 0; j < evts.length; j++) {
        var ev = evts[j]
        var comp = ev.competitions && ev.competitions[0]
        if (!comp) continue
        var competitors = comp.competitors || []
        var home = competitors.find(function(c){ return c.homeAway === 'home' }) || competitors[0]
        var away = competitors.find(function(c){ return c.homeAway === 'away' }) || competitors[1]
        if (!home || !away) continue
        var homeTeam = home.team && home.team.displayName
        var awayTeam = away.team && away.team.displayName
        // Skip if either team is a placeholder
        var isPlaceholder = function(n){ return !n || n.length < 2 || /winner|loser|runner|tbd|place|group [a-z]/i.test(n) }
        if (isPlaceholder(homeTeam) || isPlaceholder(awayTeam)) continue
        matches.push({
          date: ev.date,
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          status: comp.status && comp.status.type && comp.status.type.state,
        })
      }
    } catch (e) {
      errors.push(dates[i] + ':' + String(e))
    }
  }

  return res.status(200).json({ ok: true, matches: matches, errors: errors })
}
