// Edge Function: sync-scores
// Fetches from football-data.org (server-side, shared cache), writes results
// to the matches table. All 250 users share one cached fetch — no rate limit issues.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache results for 60 seconds so hammering refresh doesn't spike the API
let lastFetch = 0
let lastResult: any = null

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const now = Date.now()
  const CACHE_MS = 60_000

  if (lastResult && now - lastFetch < CACHE_MS) {
    return new Response(JSON.stringify({ ok: true, cached: true, ...lastResult }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }

  const FD_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')
  const WC_ID = 2000

  if (!FD_KEY) {
    return new Response(JSON.stringify({ ok: false, error: 'No API key configured' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }

  try {
    const res = await fetch(`https://api.football-data.org/v4/competitions/${WC_ID}/matches`, {
      headers: { 'X-Auth-Token': FD_KEY }
    })

    if (!res.ok) {
      const txt = await res.text()
      return new Response(JSON.stringify({ ok: false, error: `API error ${res.status}: ${txt.slice(0, 200)}` }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    const { matches } = await res.json()
    const finished = matches.filter((m: any) => m.status === 'FINISHED' || m.status === 'IN_PLAY')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let updated = 0
    for (const m of finished) {
      const score = m.score?.fullTime
      if (!score || score.home == null) continue

      const { error } = await admin.from('matches').update({
        home_goals: score.home,
        away_goals: score.away,
        home_goals_et: m.score?.extraTime?.home ?? null,
        away_goals_et: m.score?.extraTime?.away ?? null,
        home_goals_pen: m.score?.penalties?.home ?? null,
        away_goals_pen: m.score?.penalties?.away ?? null,
        status: m.status,
        updated_at: new Date().toISOString()
      }).eq('id', m.id)

      if (!error) updated++
    }

    lastFetch = now
    lastResult = { updated, total: finished.length }

    return new Response(JSON.stringify({ ok: true, cached: false, updated, total: finished.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
