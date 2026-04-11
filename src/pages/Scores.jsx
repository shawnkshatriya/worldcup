import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PHASE_LABELS = {
  GROUP_A:'Group A', GROUP_B:'Group B', GROUP_C:'Group C', GROUP_D:'Group D',
  GROUP_E:'Group E', GROUP_F:'Group F', GROUP_G:'Group G', GROUP_H:'Group H',
  GROUP_I:'Group I', GROUP_J:'Group J', GROUP_K:'Group K', GROUP_L:'Group L',
  ROUND_OF_32:'Round of 32', ROUND_OF_16:'Round of 16',
  QUARTER_FINALS:'Quarter-finals', SEMI_FINALS:'Semi-finals',
  THIRD_PLACE:'3rd place', FINAL:'Final',
}

export default function Scores() {
  const [matches, setMatches]   = useState([])
  const [filter, setFilter]     = useState('finished')
  const [loading, setLoading]   = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [syncing, setSyncing]   = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const hasApiKey = !!import.meta.env.VITE_FOOTBALL_API_KEY

  useEffect(() => { loadMatches() }, [filter])

  async function loadMatches() {
    setLoading(true)
    let query = supabase.from('matches').select('*').order('match_number')

    if (filter === 'live') {
      query = query.eq('status','IN_PLAY')
    } else if (filter === 'finished') {
      query = query.eq('status','FINISHED').order('kickoff',{ascending:false}).limit(30)
    } else if (filter === 'upcoming') {
      query = query.eq('status','SCHEDULED').order('kickoff').limit(20)
    }
    // 'all' = no extra filter, all matches

    const { data } = await query
    const matches = data||[]
    setMatches(matches)

    // Detect demo mode: any finished matches exist
    const hasFinished = matches.some(m=>m.status==='FINISHED')
    setDemoMode(hasFinished)
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey     = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/sync-scores`, {
        method: 'POST',
        headers: { 'apikey': anonKey, 'Content-Type': 'application/json' }
      })
      const result = await res.json()
      if (result.ok) {
        setLastSync(new Date().toLocaleTimeString() + (result.cached?' (cached)':''))
        await loadMatches()
      } else {
        alert('Sync failed: ' + result.error)
      }
    } catch { alert('Network error syncing scores') }
    setSyncing(false)
  }

  // Group matches by phase
  const grouped = matches.reduce((acc,m) => {
    if (!acc[m.phase]) acc[m.phase] = []
    acc[m.phase].push(m)
    return acc
  }, {})

  const finishedCount = matches.filter(m=>m.status==='FINISHED').length
  const totalGoals    = matches.filter(m=>m.home_goals!=null).reduce((a,m)=>a+m.home_goals+m.away_goals,0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Live Scores</h1>
          <p>
            {demoMode
              ? `Demo mode — ${finishedCount} matches played · ${totalGoals} total goals`
              : 'Powered by football-data.org · Tournament starts June 11, 2026'}
            {lastSync && <span style={{color:'var(--c-muted)',marginLeft:8}}>· Synced {lastSync}</span>}
          </p>
        </div>
      </div>
      <div className="page-body">

        {!hasApiKey && !demoMode && (
          <div className="alert alert-warn" style={{marginBottom:'1.25rem'}}>
            Add <code>VITE_FOOTBALL_API_KEY</code> to Vercel env vars for live sync. Get a free key at football-data.org.
            Or seed demo data from Admin → Dev to test this page.
          </div>
        )}

        {demoMode && (
          <div className="alert alert-info" style={{marginBottom:'1.25rem'}}>
            Demo mode active — showing generated match results. Clear demo data to reset.
          </div>
        )}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap',gap:8}}>
          <div className="tabs" style={{marginBottom:0}}>
            {['finished','upcoming','all'].map(f=>(
              <button key={f} className={`tab${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
                {f==='finished'?'Finished':f==='upcoming'?'Upcoming':'All'}
              </button>
            ))}
          </div>
          {hasApiKey && (
            <button className="btn btn-sm" onClick={handleSync} disabled={syncing}>
              {syncing?'Syncing...':'Sync from API'}
            </button>
          )}
        </div>

        {loading && <p style={{color:'var(--c-muted)'}}>Loading...</p>}

        {!loading && matches.length === 0 && (
          <div className="alert alert-info">
            {filter==='finished'
              ? 'No finished matches yet. Tournament starts June 11 — or seed demo data to preview.'
              : 'No matches found for this filter.'}
          </div>
        )}

        {!loading && Object.entries(grouped).map(([phase, ms]) => (
          <div className="card" key={phase} style={{marginBottom:'1rem'}}>
            <div className="card-title">{PHASE_LABELS[phase]||phase}</div>
            {ms.map(m => (
              <div key={m.id} className="match-row">
                <div className="team-home">
                  <div style={{fontWeight:600,fontSize:13}}>{m.home_team}</div>
                  {m.kickoff && (
                    <div style={{fontSize:11,color:'var(--c-muted)',marginTop:2}}>
                      {new Date(m.kickoff).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                      {' '}
                      {new Date(m.kickoff).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
                    </div>
                  )}
                </div>

                <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:400,minWidth:32,textAlign:'center',color:'var(--c-text)'}}>
                  {m.home_goals!=null ? m.home_goals : <span style={{color:'var(--c-hint)',fontSize:16}}>?</span>}
                </div>

                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                  <span style={{color:'var(--c-hint)',fontSize:13}}>–</span>
                  <span className={`match-status ${m.status==='IN_PLAY'?'status-live':m.status==='FINISHED'?'status-finished':'status-upcoming'}`}>
                    {m.status==='IN_PLAY'?'LIVE':m.status==='FINISHED'?'FT':'Soon'}
                  </span>
                  {m.home_goals_pen!=null && (
                    <span style={{fontSize:10,color:'var(--c-muted)'}}>pen {m.home_goals_pen}–{m.away_goals_pen}</span>
                  )}
                </div>

                <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:400,minWidth:32,textAlign:'center',color:'var(--c-text)'}}>
                  {m.away_goals!=null ? m.away_goals : <span style={{color:'var(--c-hint)',fontSize:16}}>?</span>}
                </div>

                <div className="team-away" style={{textAlign:'right'}}>
                  <div style={{fontWeight:600,fontSize:13}}>{m.away_team}</div>
                  {m.home_goals_et!=null && (
                    <div style={{fontSize:10,color:'var(--c-muted)',marginTop:2}}>AET: {m.home_goals_et}–{m.away_goals_et}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
