import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { playerId, adminSecret } = await req.json()

    // Verify admin secret
    if (adminSecret !== Deno.env.get('ADMIN_SECRET')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!playerId) {
      return new Response(JSON.stringify({ error: 'playerId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create admin client with service role key (has full access)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Get the auth_id for this player
    const { data: player, error: fetchError } = await adminClient
      .from('players')
      .select('auth_id, name')
      .eq('id', playerId)
      .single()

    if (fetchError || !player) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Delete the player row (cascades to predictions and scores)
    await adminClient.from('players').delete().eq('id', playerId)

    // 3. Delete from auth.users — this is the key step that prevents re-creation
    if (player.auth_id) {
      const { error: authError } = await adminClient.auth.admin.deleteUser(player.auth_id)
      if (authError) {
        console.error('Auth delete error:', authError)
        // Don't fail the whole request — player row is already gone
      }
    }

    return new Response(JSON.stringify({ ok: true, deleted: player.name }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('delete-player error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
