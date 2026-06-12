import { useEffect, useState } from 'react'
import { supabase, syncAndRecalc } from '../lib/supabase'
import { getVenue } from '../lib/venues'
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
  const { isAdmin, player } = usePlayer()
  const [matches, setMatches] = useState([])
  const [filter, setFilter]   = useState('finished')
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [syncing, setSyncing]   = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [groupBy, setGroupBy]   = useState('group')
  const [predDist, setPredDist] = useState({}) // 'group' or 'day'

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

    // Fetch prediction distribution for finished matches (room-scoped)
    var finishedIds = (data || []).filter(function(m){return m.status==='FINISHED'}).map(function(m){return m.id})
    if (finishedIds.length > 0 && player) {
      var roomPlayersRes = await supabase.from('players').select('id').eq('room_code', player.room_code).limit(500)
      var rpIds = (roomPlayersRes.data || []).map(function(p){ return p.id })
      var preds = []
      if (rpIds.length) {
        var dFrom = 0
        while (true) {
          var dPage = await supabase.from('predictions').select('match_id,home_goals,away_goals,player_id')
            .in('match_id', finishedIds).in('player_id', rpIds).not('home_goals','is',null).range(dFrom, dFrom + 999)
          if (!dPage.data || dPage.data.length === 0) break
          preds = preds.concat(dPage.data)
          if (dPage.data.length < 1000) break
          dFrom += 1000
        }
      }
      var dist = {}
      preds.forEach(function(p) {
        if (!dist[p.match_id]) dist[p.match_id] = { home: 0, draw: 0, away: 0, total: 0 }
        var d = dist[p.match_id]
        d.total++
        if (p.home_goals > p.away_goals) d.home++
        else if (p.home_goals < p.away_goals) d.away++
        else d.draw++
      })
      setPredDist(dist)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      var result = await syncAndRecalc()
      if (result.sync.ok) {
        var msg = new Date().toLocaleTimeString()
        if (result.sync.updated > 0) msg += ' · ' + result.sync.updated + ' matches updated'
        if (result.sync.unmatched && result.sync.unmatched.length > 0) {
          msg += ' · UNMATCHED: ' + result.sync.unmatched.slice(0,3).join(', ')
        }
        if (result.recalcedRooms > 0) msg += ' · scores recalculated'
        setLastSync(msg)
        loadMatches()
      } else {
        alert('Sync failed: ' + result.sync.error)
      }
    } catch(e) { alert('Sync error: ' + (e.message || e)) }
    setSyncing(false)
  }

  // Auto-sync from API every 90 seconds
  useEffect(function() {
    var id = setInterval(function() {
      if (!demoMode && !syncing) {
        syncAndRecalc().then(function() { loadMatches() }).catch(function(){})
      }
    }, 90000)
    return function() { clearInterval(id) }
  }, [demoMode, syncing, filter])

  // Group matches by phase or by day
  const grouped = matches.reduce((acc, m) => {
    var k
    if (groupBy === 'day' && m.kickoff) {
      k = new Date(m.kickoff).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })
    } else {
      k = m.phase
    }
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
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <div className="tabs" style={{marginBottom:0}}>
              <button className={`tab${groupBy==='group'?' active':''}`} onClick={()=>setGroupBy('group')} style={{fontSize:11,padding:'4px 10px'}}>By Group</button>
              <button className={`tab${groupBy==='day'?' active':''}`} onClick={()=>setGroupBy('day')} style={{fontSize:11,padding:'4px 10px'}}>By Day</button>
            </div>
            {(apiKey || isAdmin) && !demoMode && (
              <button className="btn btn-sm" onClick={handleSync} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync from API'}
              </button>
            )}
          </div>
        </div>

        {lastSync && (
          <div className="alert alert-info" style={{marginBottom:'1.25rem',fontSize:13}}>
            Last sync: {lastSync}
          </div>
        )}

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
            <div className="card-title">{groupBy === 'group' ? (PHASE_LABELS[phase] || phase) : phase}</div>
            {ms.map(m => (
              <div key={m.id}>
              <div className="match-row">
                <div className="team-home">
                  <div style={{fontWeight:600,fontSize:13}}>{m.home_team||'TBD'}</div>
                </div>

                <div className="match-center" style={{minWidth:80}}>
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
                  {m.kickoff && (
                    <div style={{fontSize:10,color:'var(--c-muted)',marginTop:2}}>
                      {new Date(m.kickoff).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                      {' '}
                      {new Date(m.kickoff).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})} ET
                    </div>
                  )}
                  <div style={{marginTop:3}}>
                    <span className={`match-status status-${m.status==='IN_PLAY'?'live':m.status==='FINISHED'?'finished':'upcoming'}`}>
                      {m.status==='IN_PLAY'?'LIVE':m.status==='FINISHED'?'FT':m.kickoff?'Upcoming':'TBD'}
                    </span>
                  </div>
                  {m.match_number && getVenue(m.match_number) && (
                    <div style={{fontSize:9,color:'var(--c-hint)',marginTop:2}}>{getVenue(m.match_number)}</div>
                  )}
                </div>

                <div className="team-away">
                  <div style={{fontWeight:600,fontSize:13}}>{m.away_team||'TBD'}</div>
                </div>
              </div>
              {predDist[m.id] && (
                <div style={{display:'flex',justifyContent:'center',gap:12,fontSize:10,color:'var(--c-muted)',paddingBottom:6}}>
                  <span>{predDist[m.id].home} picked {m.home_team}</span>
                  <span>{predDist[m.id].draw} drew</span>
                  <span>{predDist[m.id].away} picked {m.away_team}</span>
                </div>
              )}
              </div>
            ))}
            {groupBy === 'group' && phase.startsWith('GROUP') && ms.some(function(m){return m.home_goals != null}) && (function() {
              var teams = {}
              ms.forEach(function(m) {
                if (m.home_goals == null) return
                if (!teams[m.home_team]) teams[m.home_team] = {name:m.home_team,p:0,w:0,d:0,l:0,gf:0,ga:0}
                if (!teams[m.away_team]) teams[m.away_team] = {name:m.away_team,p:0,w:0,d:0,l:0,gf:0,ga:0}
                var h = teams[m.home_team], a = teams[m.away_team]
                h.p++; a.p++; h.gf += m.home_goals; h.ga += m.away_goals; a.gf += m.away_goals; a.ga += m.home_goals
                if (m.home_goals > m.away_goals) { h.w++; a.l++ }
                else if (m.home_goals < m.away_goals) { a.w++; h.l++ }
                else { h.d++; a.d++ }
              })
              var sorted = Object.values(teams).map(function(t){ t.gd = t.gf - t.ga; t.pts = t.w*3 + t.d; return t })
                .sort(function(a,b){ return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf })
              return (
                <div style={{marginTop:12,borderTop:'1px solid var(--c-border)',paddingTop:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--c-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Standings</div>
                  <table style={{width:'100%',fontSize:12}}>
                    <thead><tr style={{color:'var(--c-muted)'}}>
                      <th style={{textAlign:'left',fontWeight:600}}>Team</th>
                      <th style={{textAlign:'center',width:28}}>P</th>
                      <th style={{textAlign:'center',width:28}}>W</th>
                      <th style={{textAlign:'center',width:28}}>D</th>
                      <th style={{textAlign:'center',width:28}}>L</th>
                      <th style={{textAlign:'center',width:32}}>GD</th>
                      <th style={{textAlign:'center',width:32,fontWeight:700}}>Pts</th>
                    </tr></thead>
                    <tbody>
                      {sorted.map(function(t,i) {
                        return (
                          <tr key={t.name} style={{fontWeight: i < 2 ? 600 : 400, color: i < 2 ? 'var(--c-text)' : 'var(--c-muted)'}}>
                            <td>{t.name}</td>
                            <td style={{textAlign:'center'}}>{t.p}</td>
                            <td style={{textAlign:'center'}}>{t.w}</td>
                            <td style={{textAlign:'center'}}>{t.d}</td>
                            <td style={{textAlign:'center'}}>{t.l}</td>
                            <td style={{textAlign:'center'}}>{t.gd > 0 ? '+'+t.gd : t.gd}</td>
                            <td style={{textAlign:'center',fontWeight:700}}>{t.pts}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}
