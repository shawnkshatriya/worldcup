// Gemini AI match preview - generates a short "what to watch" blurb per match.
// Display-only garnish. Fails gracefully if no key or API error.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800') // cache 1 day
  var home = req.query.home
  var away = req.query.away
  if (!home || !away) return res.status(400).json({ ok: false, error: 'home and away required' })

  var apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(200).json({ ok: false, error: 'no key' })

  var prompt = 'You are a sharp football pundit. Write a 2-sentence preview of the ' +
    'World Cup 2026 match ' + home + ' vs ' + away + '.\n\n' +
    'RULES:\n' +
    '- Reference something SPECIFIC: a key player, playing style, FIFA ranking gap, recent form, or historical meeting between these exact teams.\n' +
    '- NO generic filler. Banned openers: "Get ready", "Fans can expect", "This match promises", "Football fans", "an exciting clash".\n' +
    '- Start with a concrete fact or the sharper team. Be punchy and confident.\n' +
    '- If one side is a heavy favorite, say so and why. If it is a toss-up, say what decides it.\n' +
    '- Plain text only, no markdown. Exactly 2 sentences.'

  async function callGemini(useSearch) {
    var body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    }
    if (useSearch) body.tools = [{ google_search: {} }]
    var r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!r.ok) return { error: 'gemini ' + r.status }
    var data = await r.json()
    var parts = data.candidates && data.candidates[0] && data.candidates[0].content &&
                data.candidates[0].content.parts
    var text = parts ? parts.map(function(p){ return p.text || '' }).join(' ').trim() : ''
    return { text: text }
  }

  try {
    // Try with search grounding first; if it fails or returns empty, retry plain
    var res1 = await callGemini(true)
    var preview = res1.text
    if (!preview) {
      var res2 = await callGemini(false)
      preview = res2.text
    }
    if (!preview) return res.status(200).json({ ok: false, error: res1.error || 'empty' })
    return res.status(200).json({ ok: true, preview: preview })
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) })
  }
}
