// Proxy for football-data.org top scorers (Golden Boot race)
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  const apiKey = process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_API_KEY
  if (!apiKey) return res.status(400).json({ ok:false, error:'No API key' })
  try {
    const r = await fetch('https://api.football-data.org/v4/competitions/2000/scorers?limit=20', {
      headers: { 'X-Auth-Token': apiKey }
    })
    if (!r.ok) return res.status(502).json({ ok:false, error:'API '+r.status })
    const data = await r.json()
    const scorers = (data.scorers || []).map(s => ({
      name: s.player?.name,
      team: s.team?.name,
      goals: s.goals || 0,
      assists: s.assists || 0,
      penalties: s.penalties || 0,
    }))
    return res.status(200).json({ ok:true, scorers })
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e) })
  }
}
