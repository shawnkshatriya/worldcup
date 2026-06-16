// Fast live scores from ESPN scoreboard (all matches for today).
// Display-only: overrides the headline score for in-play matches so the
// number updates as fast as the goals feed. Scoring still uses football-data.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
  var dateStr = req.query.date // YYYYMMDD

  try {
    var url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
    if (dateStr) url += '?dates=' + dateStr
    var r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) return res.status(200).json({ ok: false, error: 'scoreboard ' + r.status })
    var sb = await r.json()

    var matches = (sb.events || []).map(function(ev) {
      var comp = ev.competitions && ev.competitions[0]
      if (!comp) return null
      var comps = comp.competitors || []
      var homeC = comps.find(function(c){ return c.homeAway === 'home' }) || comps[0]
      var awayC = comps.find(function(c){ return c.homeAway === 'away' }) || comps[1]
      if (!homeC || !awayC) return null
      return {
        home: homeC.team && homeC.team.displayName,
        away: awayC.team && awayC.team.displayName,
        homeScore: Number(homeC.score),
        awayScore: Number(awayC.score),
        state: comp.status && comp.status.type && comp.status.type.state, // pre / in / post
        clock: comp.status && comp.status.displayClock,
        detail: comp.status && comp.status.type && comp.status.type.shortDetail,
      }
    }).filter(Boolean)

    return res.status(200).json({ ok: true, matches: matches })
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) })
  }
}
