import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { player_id, player_name, email, category, message, rating } = await req.json()

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Save to Supabase
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await admin.from('feedback').insert({ player_id, player_name, email, category, message, rating })

    // Send email via Resend
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_KEY) {
      const stars = '⭐'.repeat(rating || 0)
      const html = `
        <h2>New WC26 Predictor Feedback</h2>
        <p><strong>From:</strong> ${player_name || 'Unknown'} (${email || 'no email'})</p>
        <p><strong>Category:</strong> ${category || 'General'}</p>
        <p><strong>Rating:</strong> ${stars || 'None given'}</p>
        <hr/>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'WC26 Predictor <feedback@resend.dev>',
          to: ['skshatriya7@gmail.com'],
          subject: `[WC26] ${category || 'Feedback'} from ${player_name || 'a player'}`,
          html,
        })
      })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
