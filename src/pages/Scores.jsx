import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchTodayMatches, fetchLiveScores, syncMatchResults } from '../lib/supabase'

const PHASE_LABELS = {
  GROUP_A:'Group A', GROUP_B:'Group B', GROUP_C:'Group C', GROUP_D:'Group D',
  GROUP_E:'Group E', GROUP_F:'Group F', GROUP_G:'Group G', GROUP_H:'Group H',
  GROUP_I:'Group I', GROUP_J:'Group J', GROUP_K:'Group K', GROUP_L:'Group L',
  ROUND_OF_32:'Round of 32', ROUND_OF_16:'Round of 16',
  QUARTER_FINALS:'Quarter-finals', SEMI_FINALS:'Semi-finals',
  THIRD_PLACE:'3rd place', FINAL:'Final',
}

export default function Scores() {
  const [matches, setMatches] = useState([])
  const [filter, setFilter] = useState('today')
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [apiKey] = useState(!!import.meta.env.VITE_FOOTBALL_API_KEY)

  useEffect(() => {
    loadMatches()
    const interval = setInterval(loadMatches, 60000)
    return () => clearInterval(interval)
  }, [filter])

  async function loadMatches() {
    setLoading(true)
    let query = supabase.from('matches').select('*').order('kickoff')

    if (filter === 'today') {
      const today = new Date()
      const start = new Date(today.setHours(0,0,0,0)).toISOString()
      const end   = new Date(today.setHours(23,59,59,999)).toISOString()
      query = query.gte('kickoff', start).lte('kickoff', end)
    } else if (filter === 'live') {
      query = query.eq('status', 'IN_PLAY')
    } else if (filter === 'finished') {
      query = query.eq('status', 'FINISHED').order('kickoff', {ascending:false}).limit(20)
    } else if (filter === 'upcoming') {
      const now = new Date().toISOString()
      query = query.eq('status','SCHEDULED').gte('kickoff', now).limit(20)
    }

    const { data } = await query
    setMatches(data || [])
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/sync-scores`, {
        method: 'POST',
        headers: { 'apikey': anonKey, 'Content-Type': 'application/json' }
      })
      const result = await res.json()
      if (result.ok) {
        setLastSync(new Date().toLocaleTimeString() + (result.cached ? ' (cached)' : ''))
        await loadMatches()
      } else {
        alert('Sync failed: ' + result.error)
      }
    } catch(e) {
      alert('Network error syncing scores')
    }
    setSyncing(false)
  }

  const grouped = matches.reduce((acc, m) => {
    const key = m.phase
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <h1>Live scores</h1>
        <p>
          Powered by football-data.org
          {lastSync && <span style={{color:'var(--c-muted)',marginLeft:8}}>Last sync: {lastSync}</span>}
        </p>
      </div>
      <div className="page-body">
        {!apiKey && (
          <div className="alert alert-warn">
            Add <code>VITE_FOOTBALL_API_KEY</code> to your <code>.env</code> to enable live sync from football-data.org (free at football-data.org/client/register).
            Scores can also be entered manually in the Admin panel.
          </div>
        )}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem',flexWrap:'wrap',gap:8}}>
          <div className="tabs" style={{marginBottom:0}}>
            {['today','live','upcoming','finished','all'].map(f => (
              <button key={f} className={`tab${filter===f?' active':''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          {apiKey && (
            <button className="btn btn-sm" onClick={handleSync} disabled={syncing}>{syncing ? "Syncing..." : "Sync from API"}</button>
          )}
        </div>

        {loading && <p style={{color:'var(--c-muted)'}}>Loading...</p>}

        {!loading && matches.length === 0 && (
          <div className="alert alert-info">
            {filter === 'today' ? 'No matches today. Check back on June 11, 2026!' : 'No matches found for this filter.'}
          </div>
        )}

        {Object.entries(grouped).map(([phase, ms]) => (
          <div className="card" key={phase}>
            <div className="card-title">{PHASE_LABELS[phase] || phase}</div>
            {ms.map(m => (
              <div key={m.id} className="match-row">
                <div className="team-home">
                  <div style={{fontWeight:500}}>{m.home_team}</div>
                  <div style={{fontSize:12,color:'var(--c-muted)'}}>
                    {m.kickoff && new Date(m.kickoff).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>

                <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:700,minWidth:32,textAlign:'center'}}>
                  {m.home_goals ?? '—'}
                </div>

                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <span className="score-sep">vs</span>
                  <span className={`match-status status-${m.status==='IN_PLAY'?'live':m.status==='FINISHED'?'finished':'upcoming'}`}>
                    {m.status === 'IN_PLAY' ? 'LIVE' : m.status === 'FINISHED' ? 'FT' : 'Soon'}
                  </span>
                  {m.home_goals_pen != null && (
                    <span style={{fontSize:11,color:'var(--c-muted)'}}>
                      (pen: {m.home_goals_pen}–{m.away_goals_pen})
                    </span>
                  )}
                </div>

                <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:700,minWidth:32,textAlign:'center'}}>
                  {m.away_goals ?? '—'}
                </div>

                <div className="team-away" style={{textAlign:'right'}}>
                  <div style={{fontWeight:500}}>{m.away_team}</div>
                  <div style={{fontSize:12,color:'var(--c-muted)',marginTop:2}}>
                    {m.home_goals_et != null && <span>AET: {m.home_goals_et}–{m.away_goals_et}</span>}
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
