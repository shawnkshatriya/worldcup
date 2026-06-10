export default async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_API_KEY
  if (!apiKey) {
    return res.status(400).json({ ok: false, error: 'Add FOOTBALL_DATA_API_KEY to Vercel environment variables (Settings → Environment Variables)' })
  }

  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/2000/matches', {
      headers: { 'X-Auth-Token': apiKey }
    })

    if (!response.ok) {
      const txt = await response.text()
      return res.status(502).json({ ok: false, error: 'API ' + response.status + ': ' + txt.slice(0, 200) })
    }

    const data = await response.json()
    return res.status(200).json({ ok: true, matches: data.matches || [] })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
