import { useEffect, useState } from 'react'
import { supabase, syncAndRecalc } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

const PHASE_LABELS = {
  GROUP_A:'Group A', GROUP_B:'Group B', GROUP_C:'Group C', GROUP_D:'Group D',
  GROUP_E:'Group E', GROUP_F:'Group F', GROUP_G:'Group G', GROUP_H:'Group H',
  GROUP_I:'Group I', GROUP_J:'Group J', GROUP_K:'Group K', GROUP_L:'Group L',
  ROUND_OF_32:'Round of 32', ROUND_OF_16:'Round of 16',
  QUARTER_FINALS:'Quarter-finals', SEMI_FINALS:'Semi-finals',
  THIRD_PLACE:'3rd place', FINAL:'Final',
}

const FILTERS = ['finished','live','upcoming','all']

// Demo mode is active when the known demo seed player exists in the DB.
// This is precise — it won't false-positive once real tournament scores start coming in.
async function checkDemoActive() {
  const { data } = await supabase
    .from('players')
    .select('id')
    .eq('email', 'demo+shawn@wc26.test')
    .limit(1)
  return !!(data?.length)
}

export default function Scores() {
  const { isAdmin } = usePlayer()
  const [matches, setMatches] = useState([])
  const [filter, setFilter]   = useState('finished')
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [syncing, setSyncing]   = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => { loadMatches() }, [filter])

  async function loadMatches() {
    setLoading(true)
    let query = supabase.from('matches').select('*').order('match_number')

    if (filter === 'finished') {
      query = query.eq('status','FINISHED').order('match_number', {ascending:true})
    } else if (filter === 'live') {
      query = query.eq('status','IN_PLAY')
    } else if (filter === 'upcoming') {
      query = query.eq('status','SCHEDULED').limit(30)
    }
    // 'all' - no extra filter

    const [{ data }, isDemo] = await Promise.all([
      query.limit(200),
      checkDemoActive(),
    ])
    setMatches(data || [])
    setDemoMode(isDemo)
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      var result = await syncAndRecalc()
      if (result.sync.ok) {
        var msg = new Date().toLocaleTimeString()
        if (result.sync.cached) msg += ' (cached)'
        if (result.sync.upserted) msg += ' · ' + result.sync.upserted + ' matches synced'
        if (result.recalcedRooms > 0) msg += ' · scores recalculated'
        setLastSync(msg)
        loadMatches()
      } else {
        alert('Sync failed: ' + result.sync.error)
      }
    } catch(e) { alert('Network error syncing scores') }
    setSyncing(false)
  }

  // Auto-poll every 90 seconds during live matches
  useEffect(function() {
    var id = setInterval(function() {
      if (!demoMode && !syncing) loadMatches()
    }, 90000)
    return function() { clearInterval(id) }
  }, [demoMode, syncing, filter])

  // Group by phase
  const grouped = matches.reduce((acc, m) => {
    const k = m.phase
    if (!acc[k]) acc[k] = []
    acc[k].push(m)
    return acc
  }, {})

  const finishedCount = matches.filter(m=>m.status==='FINISHED').length
  const apiKey = !!import.meta.env.VITE_FOOTBALL_API_KEY

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Live Scores</h1>
          <p>
            {demoMode ? `Demo mode — ${finishedCount} simulated matches` : 'Powered by football-data.org'}
            {lastSync && <span style={{color:'var(--c-muted)',marginLeft:8}}>· Synced {lastSync}</span>}
          </p>
        </div>
      </div>
      <div className="page-body">

        {demoMode && (
          <div className="alert alert-warn" style={{marginBottom:'1.25rem'}}>
            Demo mode active — showing simulated match results. Clear demo data from Admin → Dev tab before the tournament starts.
          </div>
        )}

        {!demoMode && !apiKey && (
          <div className="alert alert-info" style={{marginBottom:'1.25rem'}}>
            Add <code>VITE_FOOTBALL_API_KEY</code> to Vercel environment variables to enable live score sync (free at football-data.org).
            Scores can also be entered manually in Admin → Results.
          </div>
        )}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap',gap:8}}>
          <div className="tabs" style={{marginBottom:0}}>
            {FILTERS.map(f => (
              <button key={f} className={`tab${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          {(apiKey || isAdmin) && !demoMode && (
            <button className="btn btn-sm" onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync from API'}
            </button>
          )}
        </div>

        {loading && <p style={{color:'var(--c-muted)'}}>Loading...</p>}

        {!loading && matches.length === 0 && (
          <div className="alert alert-info">
            {filter==='live' ? 'No matches currently in play.' :
             filter==='finished' ? 'No finished matches yet — tournament kicks off 11 June 2026.' :
             filter==='upcoming' ? 'No upcoming matches found.' : 'No matches found.'}
          </div>
        )}

        {Object.entries(grouped).map(([phase, ms]) => (
          <div className="card" key={phase} style={{marginBottom:'1rem'}}>
            <div className="card-title">{PHASE_LABELS[phase] || phase}</div>
            {ms.map(m => (
              <div key={m.id} className="match-row">
                <div className="team-home">
                  <div style={{fontWeight:600,fontSize:13}}>{m.home_team||'TBD'}</div>
                  {m.kickoff && (
                    <div style={{fontSize:11,color:'var(--c-muted)'}}>
                      {new Date(m.kickoff).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                    </div>
                  )}
                </div>

                <div style={{textAlign:'center'}}>
                  {m.home_goals!=null ? (
                    <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:400,lineHeight:1,letterSpacing:'0.04em'}}>
                      {m.home_goals} - {m.away_goals}
                    </div>
                  ) : (
                    <div style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-muted)'}}>vs</div>
                  )}
                  {m.home_goals_pen!=null && (
                    <div style={{fontSize:10,color:'var(--c-muted)'}}>
                      (pen {m.home_goals_pen}-{m.away_goals_pen})
                    </div>
                  )}
                  {m.home_goals_et!=null && m.home_goals_pen==null && (
                    <div style={{fontSize:10,color:'var(--c-muted)'}}>AET</div>
                  )}
                </div>

                <div className="team-away">
                  <div style={{fontWeight:600,fontSize:13}}>{m.away_team||'TBD'}</div>
                  <div style={{marginTop:4}}>
                    <span className={`match-status status-${m.status==='IN_PLAY'?'live':m.status==='FINISHED'?'finished':'upcoming'}`}>
                      {m.status==='IN_PLAY'?'LIVE':m.status==='FINISHED'?'FT':'Soon'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
