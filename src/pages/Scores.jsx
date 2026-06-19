import { useEffect, useState, useRef } from 'react'
import { supabase, syncAndRecalc, mapTeamName } from '../lib/supabase'
import { getVenue, getVenueByMatchup, getKnockoutVenue } from '../lib/venues'
import { usePlayer } from '../hooks/usePlayer'
import Flag from '../components/Flag'
import LiveWhatIf from '../components/LiveWhatIf'
import MatchDetail from '../components/MatchDetail'

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
  const [filter, setFilter]   = useState('all')
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [lastSyncClean, setLastSyncClean] = useState(null)
  const [syncing, setSyncing]   = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [groupBy, setGroupBy]   = useState('day')
  const [predDist, setPredDist] = useState({}) // 'group' or 'day'
  const [myPicks, setMyPicks] = useState({})
  const [whatIfMatch, setWhatIfMatch] = useState(null)
  const [detailMatch, setDetailMatch] = useState(null)
  const [espnLive, setEspnLive] = useState({}) // norm(home)+norm(away) -> {home, away, clock}

  useEffect(() => { loadMatches() }, [filter])

  async function loadMatches() {
    setLoading(true)
    let query = supabase.from('matches').select('*').order('match_number')

    if (filter === 'finished') {
      query = query.eq('status','FINISHED').order('match_number', {ascending:true})
    } else if (filter === 'live') {
      // Include DB-live AND today's scheduled (which ESPN may report as live before DB catches up)
      var todayStart = new Date(); todayStart.setHours(0,0,0,0)
      var todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
      query = query.or('status.in.(IN_PLAY,PAUSED),and(status.eq.SCHEDULED,kickoff.gte.' + todayStart.toISOString() + ',kickoff.lte.' + todayEnd.toISOString() + ')')
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
    // Show distribution for any started/finished match (predictions are locked by then)
    var finishedIds = (data || []).filter(function(m){return m.status==='FINISHED'||m.status==='IN_PLAY'||m.status==='PAUSED'}).map(function(m){return m.id})
    if (finishedIds.length > 0 && player) {
      var roomPlayersRes = await supabase.from('players').select('id').eq('room_code', player.room_code).limit(500)
      var rpIds = (roomPlayersRes.data || []).map(function(p){ return p.id })
      var preds = []
      if (rpIds.length) {
        var dFrom = 0
        while (true) {
          var dPage = await supabase.from('predictions').select('match_id,home_goals,away_goals,player_id')
            .in('match_id', finishedIds).in('player_id', rpIds).not('home_goals','is',null).order('id',{ascending:true}).range(dFrom, dFrom + 999)
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

    // Fetch current user's predictions to show "your pick" + on-track status
    if (player) {
      var { data: myPreds } = await supabase.from('predictions')
        .select('match_id,home_goals,away_goals')
        .eq('player_id', player.id)
        .not('home_goals','is',null)
      var mine = {}
      ;(myPreds || []).forEach(function(p){ mine[String(p.match_id)] = { h:p.home_goals, a:p.away_goals } })
      setMyPicks(mine)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      var result = await syncAndRecalc()
      if (result.sync.ok || (result.espn && result.espn.ok)) {
        var msg = new Date().toLocaleTimeString()
        var espnUp = result.espn && result.espn.updated || 0
        var fdUp = result.sync.updated || 0
        if (espnUp > 0) msg += ' · ' + espnUp + ' via ESPN (fast)'
        if (fdUp > 0) msg += ' · ' + fdUp + ' via official'
        if (result.sync.unmatched && result.sync.unmatched.length > 0) {
          msg += ' · UNMATCHED: ' + result.sync.unmatched.slice(0,3).join(', ')
        }
        if (result.espn && result.espn.unmatched && result.espn.unmatched.length > 0) {
          msg += ' · ESPN UNMATCHED: ' + result.espn.unmatched.slice(0,2).join(', ')
        }
        if (result.sync.conflicts && result.sync.conflicts.length > 0) {
          msg += ' · ⚠ ' + result.sync.conflicts[0]
        }
        if (result.recalcedRooms > 0) msg += ' · recalculated'
        setLastSync(msg)
        // Clean version for non-admins: just a timestamp
        setLastSyncClean(new Date().toLocaleTimeString())
        loadMatches()
      } else {
        alert('Sync failed: ' + result.sync.error)
      }
    } catch(e) { alert('Sync error: ' + (e.message || e)) }
    setSyncing(false)
  }

  // Auto-sync from API every 90 seconds
  const autoSyncing = useRef(false)
  useEffect(function() {
    var id = setInterval(function() {
      if (!demoMode && !syncing && !autoSyncing.current) {
        autoSyncing.current = true
        syncAndRecalc()
          .then(function() { loadMatches() })
          .catch(function(){})
          .finally(function(){ autoSyncing.current = false })
      }
    }, 90000)
    return function() { clearInterval(id) }
  }, [demoMode, syncing, filter])

  // Fast ESPN live-score overlay (every 25s) - keeps the headline score fresh
  // even though football-data sync (scoring source) is slower.
  const anyLive = matches.some(function(m){
    if (m.status==='IN_PLAY' || m.status==='PAUSED') return true
    // Also poll if a scheduled match's kickoff time has passed (likely live, DB just stale)
    if (m.status==='SCHEDULED' && m.kickoff) {
      var ko = new Date(m.kickoff)
      var now = new Date()
      if (now >= ko && now - ko < 2.5*60*60*1000) return true
    }
    return false
  })
  useEffect(function() {
    if (!anyLive) { setEspnLive({}); return }
    function norm(s){ return (s||'').toLowerCase().replace(/[^a-z]/g,'') }
    function pull() {
      var today = new Date()
      var dateStr = '' + today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0')
      fetch('/api/live-scores?date=' + dateStr)
        .then(function(r){ return r.json() })
        .then(function(d){
          if (!d.ok || !d.matches) return
          var map = {}
          d.matches.forEach(function(em){
            if (em.state === 'in') {
              var h = mapTeamName(em.home), a = mapTeamName(em.away)
              map[norm(h)+'|'+norm(a)] = { home: em.homeScore, away: em.awayScore, clock: em.clock }
            }
          })
          setEspnLive(map)
        })
        .catch(function(){})
    }
    pull()
    var id = setInterval(pull, 25000)
    return function() { clearInterval(id) }
  }, [anyLive])

  // When in day view, scroll to today's matches (or the next upcoming day) on load
  useEffect(function() {
    if (groupBy !== 'day' || loading || matches.length === 0) return
    var todayLabel = new Date().toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' })
    var id = 'daygroup-' + todayLabel.replace(/[^a-zA-Z0-9]/g,'')
    var t = setTimeout(function(){
      var el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior:'smooth', block:'start' })
    }, 300)
    return function(){ clearTimeout(t) }
  }, [groupBy, loading, matches.length])
  var nrmTeam = function(s){ return (s||'').toLowerCase().replace(/[^a-z]/g,'') }
  var displayMatches = matches
  if (filter === 'live') {
    // Keep only matches that are live per DB OR per ESPN (hides scheduled-not-yet-started)
    displayMatches = matches.filter(function(m){
      var espnL = espnLive[nrmTeam(m.home_team)+'|'+nrmTeam(m.away_team)]
      return m.status==='IN_PLAY' || m.status==='PAUSED' || !!espnL
    })
  }
  const grouped = displayMatches.reduce((acc, m) => {
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

  // Sort matches within each group by kickoff time (chronological), then match_number
  Object.keys(grouped).forEach(function(k) {
    grouped[k].sort(function(a, b) {
      var ta = a.kickoff ? new Date(a.kickoff).getTime() : 0
      var tb = b.kickoff ? new Date(b.kickoff).getTime() : 0
      if (ta !== tb) return ta - tb
      return (a.match_number || 0) - (b.match_number || 0)
    })
  })

  const finishedCount = matches.filter(m=>m.status==='FINISHED').length
  const apiKey = !!import.meta.env.VITE_FOOTBALL_API_KEY

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Live Scores</h1>
          <p>
            {demoMode ? `Demo mode — ${finishedCount} simulated matches` : 'Live scores via ESPN & football-data'}
            {(isAdmin ? lastSync : lastSyncClean) && <span style={{color:'var(--c-muted)',marginLeft:8}}>· Synced {isAdmin ? lastSync : lastSyncClean}</span>}
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

        {isAdmin && lastSync && (
          <div className="alert alert-info" style={{marginBottom:'1.25rem',fontSize:13}}>
            Last sync: {lastSync}
          </div>
        )}
        {!isAdmin && lastSyncClean && (
          <div style={{marginBottom:'1.25rem',fontSize:12,color:'var(--c-muted)',textAlign:'center'}}>
            Scores updated {lastSyncClean}
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

        {Object.entries(grouped).sort(function(a, b) {
          // Order groups by their earliest match kickoff (chronological days/phases)
          var ea = Math.min.apply(null, a[1].map(function(m){ return m.kickoff ? new Date(m.kickoff).getTime() : Infinity }))
          var eb = Math.min.apply(null, b[1].map(function(m){ return m.kickoff ? new Date(m.kickoff).getTime() : Infinity }))
          return ea - eb
        }).map(([phase, ms]) => (
          <div className="card" key={phase} id={groupBy==='day' ? ('daygroup-'+phase.replace(/[^a-zA-Z0-9]/g,'')) : undefined} style={{marginBottom:'1rem'}}>
            <div className="card-title">{groupBy === 'group' ? (PHASE_LABELS[phase] || phase) : phase}</div>
            {ms.map(m => {
              var nrm = function(s){ return (s||'').toLowerCase().replace(/[^a-z]/g,'') }
              var espnL = espnLive[nrm(m.home_team)+'|'+nrm(m.away_team)]
              // Effective live = DB says live OR ESPN reports it in-play (covers stale DB status)
              var isLiveEff = m.status==='IN_PLAY' || m.status==='PAUSED' || !!espnL
              var isFinishedEff = m.status==='FINISHED'
              return (
              <div key={m.id}>
              <div className="match-row">
                <div className="team-home">
                  <div style={{fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}><span>{m.home_team||'TBD'}</span><Flag team={m.home_team}/></div>
                </div>

                <div className="match-center" style={{minWidth:80}}>
                  {(function() {
                    var live = isLiveEff ? espnL : null
                    var dh = live ? live.home : m.home_goals
                    var da = live ? live.away : m.away_goals
                    if (dh == null) {
                      return <div style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-muted)'}}>vs</div>
                    }
                    return (
                      <div>
                        <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:400,lineHeight:1,letterSpacing:'0.04em'}}>
                          {dh} - {da}
                        </div>
                        {live && live.clock && (
                          <div style={{fontSize:10,color:'var(--c-danger)',fontWeight:700}}>{live.clock}</div>
                        )}
                      </div>
                    )
                  })()}
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
                    <span className={`match-status status-${isLiveEff?'live':isFinishedEff?'finished':'upcoming'}`}>
                      {isLiveEff?(m.status==='PAUSED'?'HT':'LIVE'):isFinishedEff?'FT':m.kickoff?'Upcoming':'TBD'}
                    </span>
                  </div>
                  {(getVenueByMatchup(m.home_team, m.away_team) || getKnockoutVenue(m.match_number) || (m.match_number && getVenue(m.match_number))) && (
                    <div style={{fontSize:9,color:'var(--c-hint)',marginTop:2}}>{getVenueByMatchup(m.home_team, m.away_team) || getKnockoutVenue(m.match_number) || getVenue(m.match_number)}</div>
                  )}
                </div>

                <div className="team-away">
                  <div style={{fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:6}}><Flag team={m.away_team}/><span>{m.away_team||'TBD'}</span></div>
                </div>
              </div>
              {predDist[m.id] && (
                <div style={{display:'flex',justifyContent:'center',gap:12,fontSize:10,color:'var(--c-muted)',paddingBottom:6}}>
                  <span>{predDist[m.id].home} picked {m.home_team}</span>
                  <span>{predDist[m.id].draw} drew</span>
                  <span>{predDist[m.id].away} picked {m.away_team}</span>
                </div>
              )}
              {myPicks[String(m.id)] && (isLiveEff || isFinishedEff) && (espnL ? espnL.home != null : m.home_goals != null) && (function() {
                var pick = myPicks[String(m.id)]
                var rh = (isLiveEff && espnL) ? espnL.home : m.home_goals
                var ra = (isLiveEff && espnL) ? espnL.away : m.away_goals
                var pr = Math.sign(pick.h - pick.a), rr = Math.sign(rh - ra)
                var exact = pick.h === rh && pick.a === ra
                var rightResult = pr === rr
                var status, color
                if (isFinishedEff) {
                  if (exact) { status = '🎯 Exact!'; color = 'var(--c-accent)' }
                  else if (rightResult) { status = '✓ Right result'; color = 'var(--c-success)' }
                  else { status = '✗ Missed'; color = 'var(--c-danger)' }
                } else {
                  // live
                  if (exact) { status = '🎯 On for exact!'; color = 'var(--c-accent)' }
                  else if (rightResult) { status = '✓ On track'; color = 'var(--c-success)' }
                  else { status = '⚠ Behind'; color = 'var(--c-danger)' }
                }
                return (
                  <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8,fontSize:11,paddingBottom:8}}>
                    <span style={{color:'var(--c-muted)'}}>Your pick: <strong style={{color:'var(--c-text)'}}>{pick.h}-{pick.a}</strong></span>
                    <span style={{color:color,fontWeight:700}}>{status}</span>
                    {isLiveEff && (
                      <button
                        onClick={function(){ setWhatIfMatch(whatIfMatch === m.id ? null : m.id) }}
                        style={{fontSize:10,padding:'2px 8px',borderRadius:6,border:'1px solid var(--c-border)',background:'var(--c-surface)',color:'var(--c-accent)',cursor:'pointer',fontWeight:600}}
                      >
                        {whatIfMatch === m.id ? 'Hide' : '📊 What if?'}
                      </button>
                    )}
                  </div>
                )
              })()}
              {whatIfMatch === m.id && isLiveEff && (
                <LiveWhatIf match={m} player={player} roomCode={player.room_code}/>
              )}
              {(isLiveEff || isFinishedEff) && (
                <div style={{textAlign:'center',paddingBottom:8}}>
                  <button
                    onClick={function(){ setDetailMatch(detailMatch === m.id ? null : m.id) }}
                    style={{fontSize:10,padding:'2px 8px',borderRadius:6,border:'1px solid var(--c-border)',background:'var(--c-surface)',color:'var(--c-muted)',cursor:'pointer'}}
                  >
                    {detailMatch === m.id ? 'Hide details' : '⚽ Goals, stats & lineups'}
                  </button>
                </div>
              )}
              {detailMatch === m.id && <MatchDetail match={m}/>}
              </div>
            )})}
            {groupBy === 'group' && phase.startsWith('GROUP') && ms.some(function(m){return m.status === 'FINISHED'}) && (function() {
              var teams = {}
              ms.forEach(function(m) {
                if (m.status !== 'FINISHED' || m.home_goals == null) return
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
                  <div style={{fontSize:11,fontWeight:700,color:'var(--c-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Standings <span style={{color:'var(--c-success)',fontWeight:600,textTransform:'none',letterSpacing:0}}>· green = advancing</span></div>
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
                          <tr key={t.name} style={{fontWeight: i < 2 ? 600 : 400, color: i < 2 ? 'var(--c-text)' : 'var(--c-muted)', background: i < 2 ? 'rgba(34,197,94,0.05)' : 'transparent'}}>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                <span style={{width:14,fontSize:10,color:i<2?'var(--c-success)':'var(--c-hint)'}}>{i+1}</span>
                                <Flag team={t.name} size="sm"/>
                                <span>{t.name}</span>
                              </div>
                            </td>
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
