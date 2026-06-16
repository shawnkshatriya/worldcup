// Gemini AI match preview - generates a short "what to watch" blurb per match.
// Display-only garnish. Fails gracefully if no key or API error.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800') // cache 1 day
  var home = req.query.home
  var away = req.query.away
  if (!home || !away) return res.status(400).json({ ok: false, error: 'home and away required' })

  var apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(200).json({ ok: false, error: 'no key' })

  var prompt = 'Write a punchy 2-3 sentence World Cup 2026 match preview for ' + home + ' vs ' + away +
    '. Focus on what makes this matchup interesting, key storylines, and what to watch for. ' +
    'Be energetic and concise. No markdown, no headers, just the preview text.'

  try {
    var r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
      }),
    })
    if (!r.ok) return res.status(200).json({ ok: false, error: 'gemini ' + r.status })
    var data = await r.json()
    var text = data.candidates && data.candidates[0] && data.candidates[0].content &&
               data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
               data.candidates[0].content.parts[0].text
    if (!text) return res.status(200).json({ ok: false, error: 'empty' })
    return res.status(200).json({ ok: true, preview: text.trim() })
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) })
  }
}
