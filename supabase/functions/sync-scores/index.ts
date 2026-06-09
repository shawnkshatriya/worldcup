// Edge Function: sync-scores
// Fetches from football-data.org, UPSERTS all matches.
// First run: populates the full schedule. Subsequent runs: updates live/finished scores.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    return new Response(JSON.stringify({ ok: false, error: 'No API key configured. Set FOOTBALL_DATA_API_KEY in Supabase Edge Function secrets.' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }

  try {
    const res = await fetch(`https://api.football-data.org/v4/competitions/${WC_ID}/matches`, {
      headers: { 'X-Auth-Token': FD_KEY }
    })

    if (!res.ok) {
      const txt = await res.text()
      return new Response(JSON.stringify({ ok: false, error: `API ${res.status}: ${txt.slice(0, 200)}` }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    const { matches } = await res.json()

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Map API phase names to our schema
    const phaseMap: Record<string, string> = {
      'GROUP_STAGE': '', // will use group info
      'ROUND_OF_32': 'ROUND_OF_32',
      'LAST_32': 'ROUND_OF_32',
      'ROUND_OF_16': 'ROUND_OF_16',
      'LAST_16': 'ROUND_OF_16',
      'QUARTER_FINALS': 'QUARTER_FINALS',
      'SEMI_FINALS': 'SEMI_FINALS',
      'THIRD_PLACE': 'THIRD_PLACE',
      'FINAL': 'FINAL',
    }

    let upserted = 0
    let updated = 0

    for (const m of matches) {
      const score = m.score?.fullTime
      let phase = phaseMap[m.stage] || m.stage

      // For group stage, use the group name (GROUP_A, GROUP_B, etc.)
      if (m.stage === 'GROUP_STAGE' && m.group) {
        phase = m.group.replace('Group ', 'GROUP_').replace(' ', '_').toUpperCase()
        // football-data.org returns "GROUP_A" format already
        if (!phase.startsWith('GROUP_')) phase = 'GROUP_' + m.group.replace('Group ', '').toUpperCase()
      }

      const row: any = {
        id: m.id,
        phase: phase,
        match_number: m.matchday || null,
        home_team: m.homeTeam?.name || m.homeTeam?.shortName || null,
        away_team: m.awayTeam?.name || m.awayTeam?.shortName || null,
        kickoff: m.utcDate || null,
        status: m.status || 'SCHEDULED',
        updated_at: new Date().toISOString(),
      }

      // Add scores if available
      if (score && score.home != null) {
        row.home_goals = score.home
        row.away_goals = score.away
        row.home_goals_et = m.score?.extraTime?.home ?? null
        row.away_goals_et = m.score?.extraTime?.away ?? null
        row.home_goals_pen = m.score?.penalties?.home ?? null
        row.away_goals_pen = m.score?.penalties?.away ?? null
        updated++
      }

      const { error } = await admin.from('matches').upsert(row, { onConflict: 'id' })
      if (!error) upserted++
    }

    lastFetch = now
    lastResult = { upserted, updated, total: matches.length }

    return new Response(JSON.stringify({ ok: true, cached: false, upserted, updated, total: matches.length }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
