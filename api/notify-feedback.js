export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(400).json({ error: 'RESEND_API_KEY not set' })

  const { name, rating, message, type } = req.body || {}

  const html = `
    <h2>New ${type || 'feedback'} from WC26 Predictor</h2>
    <p><strong>From:</strong> ${name || 'Anonymous'}</p>
    <p><strong>Rating:</strong> ${'⭐'.repeat(rating || 0)} (${rating}/5)</p>
    <p><strong>Type:</strong> ${type || 'general'}</p>
    <hr/>
    <p>${(message || 'No message').replace(/\n/g, '<br/>')}</p>
  `

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'WC26 Predictor <noreply@shawnkshatriya.com>',
        to: ['skshatriya7@gmail.com'],
        subject: `WC26 ${type || 'Feedback'}: ${rating ? rating + '/5' : ''} from ${name || 'Anonymous'}`,
        html: html,
      }),
    })
    const data = await resp.json()
    return res.status(200).json({ ok: true, id: data.id })
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
