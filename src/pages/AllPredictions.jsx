import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

const PHASES = ['GROUP_A','GROUP_B','GROUP_C','GROUP_D','GROUP_E','GROUP_F',
  'GROUP_G','GROUP_H','GROUP_I','GROUP_J','GROUP_K','GROUP_L',
  'ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL']

const PHASE_LABELS = {
  GROUP_A:'Group A',GROUP_B:'Group B',GROUP_C:'Group C',GROUP_D:'Group D',
  GROUP_E:'Group E',GROUP_F:'Group F',GROUP_G:'Group G',GROUP_H:'Group H',
  GROUP_I:'Group I',GROUP_J:'Group J',GROUP_K:'Group K',GROUP_L:'Group L',
  ROUND_OF_32:'Round of 32',ROUND_OF_16:'Round of 16',
  QUARTER_FINALS:'Quarter-finals',SEMI_FINALS:'Semi-finals',
  THIRD_PLACE:'3rd place',FINAL:'Final',
}

const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']

const LOCK_BUFFER_MS = 15 * 60 * 1000  // 15 minutes

function isMatchRevealed(match) {
  if (match.status === 'IN_PLAY' || match.status === 'FINISHED') return true
  if (match.kickoff) {
    var kickoff = new Date(match.kickoff)
    if (new Date() >= new Date(kickoff.getTime() - LOCK_BUFFER_MS)) return true
  }
  return false
}

export default function AllPredictions() {
  const { player, isAdmin, loading: playerLoading } = usePlayer()
  const roomCode = player?.room_code || 'DEFAULT'
  const [phase, setPhase] = useState('GROUP_A')
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState([])
  const [predictions, setPredictions] = useState({})
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState('group')
  const [allMatches, setAllMatches] = useState([])
  const [activeDay, setActiveDay] = useState(null)

  useEffect(() => {
    if (playerLoading) return
    if (!player) { setLoading(false); return }
    loadPoolData()
  }, [player, playerLoading])
  useEffect(() => { loadMatchData() }, [phase, groupBy, activeDay])

  async function loadPoolData() {
    const { data: playerData } = await supabase.from('players').select('id,name').eq('room_code', roomCode).order('created_at').limit(500)
    setPlayers(playerData || [])

    var playerIds = (playerData || []).map(function(p){ return p.id })
    if (playerIds.length === 0) return

    // Fetch predictions only for this room's players (much smaller, faster)
    var allPreds = []
    var from = 0
    var pageSize = 1000
    while (true) {
      var { data: page } = await supabase.from('predictions')
        .select('match_id,player_id,home_goals,away_goals')
        .in('player_id', playerIds)
        .range(from, from + pageSize - 1)
      if (!page || page.length === 0) break
      allPreds = allPreds.concat(page)
      if (page.length < pageSize) break
      from += pageSize
    }

    const predMap = {}
    for (const p of allPreds) {
      const mid = String(p.match_id)
      if (!predMap[mid]) predMap[mid] = {}
      predMap[mid][String(p.player_id)] = { hg: p.home_goals, ag: p.away_goals }
    }
    setPredictions(predMap)

    // Scores for this room's players only
    var allScores = []
    from = 0
    while (true) {
      var { data: sPage } = await supabase.from('scores')
        .select('match_id,player_id,pts_total')
        .in('player_id', playerIds)
        .range(from, from + pageSize - 1)
      if (!sPage || sPage.length === 0) break
      allScores = allScores.concat(sPage)
      if (sPage.length < pageSize) break
      from += pageSize
    }

    const scoreMap = {}
    for (const s of allScores) {
      if (!scoreMap[String(s.match_id)]) scoreMap[String(s.match_id)] = {}
      scoreMap[String(s.match_id)][String(s.player_id)] = s.pts_total || 0
    }
    setScores(scoreMap)
  }

  async function loadMatchData() {
    setLoading(true)
    var matchQuery
    if (groupBy === 'day') {
      matchQuery = supabase.from('matches').select('*').order('kickoff')
    } else {
      matchQuery = supabase.from('matches').select('*').eq('phase', phase).order('match_number')
    }
    const { data: matchData } = await matchQuery
    var allM = matchData || []
    if (groupBy === 'day') {
      setAllMatches(allM)
      if (!activeDay && allM.length > 0 && allM[0].kickoff) {
        var firstDay = new Date(allM[0].kickoff).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})
        setActiveDay(firstDay)
      }
      var filtered = allM.filter(function(m) {
        if (!m.kickoff || !activeDay) return false
        return new Date(m.kickoff).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) === activeDay
      })
      setMatches(filtered)
    } else {
      setMatches(allM)
    }
    setLoading(false)
  }

  function getPredBg(pred, match) {
    if (!pred || pred.hg == null || match.home_goals == null) return 'transparent'
    const predResult = Math.sign(pred.hg - pred.ag)
    const realResult = Math.sign(match.home_goals - match.away_goals)
    if (pred.hg === match.home_goals && pred.ag === match.away_goals) return 'rgba(240,165,0,0.18)'
    if (predResult === realResult) return 'rgba(34,197,94,0.1)'
    return 'rgba(239,68,68,0.08)'
  }

  function getPredBorder(pred, match) {
    if (!pred || pred.hg == null || match.home_goals == null) return '1px solid var(--c-border)'
    const predResult = Math.sign(pred.hg - pred.ag)
    const realResult = Math.sign(match.home_goals - match.away_goals)
    if (pred.hg === match.home_goals && pred.ag === match.away_goals) return '1px solid rgba(240,165,0,0.4)'
    if (predResult === realResult) return '1px solid rgba(34,197,94,0.25)'
    return '1px solid rgba(239,68,68,0.2)'
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>All Predictions</h1>
          <p>Predictions are revealed as each match locks (15 min before kickoff).</p>
        </div>
      </div>
      <div className="page-body">

        {/* View toggle */}
        <div className="tabs" style={{marginBottom:'0.75rem'}}>
          <button className={'tab' + (groupBy==='group'?' active':'')} onClick={function(){setGroupBy('group')}} style={{fontSize:11,padding:'4px 10px'}}>By Group</button>
          <button className={'tab' + (groupBy==='day'?' active':'')} onClick={function(){setGroupBy('day')}} style={{fontSize:11,padding:'4px 10px'}}>By Day</button>
        </div>

        {/* Phase tabs (group mode) */}
        {groupBy === 'group' && (
          <div style={{overflowX:'auto',paddingBottom:4,marginBottom:'1.25rem'}}>
            <div className="tabs" style={{width:'max-content'}}>
              {PHASES.map(p => (
                <button key={p} className={`tab${phase===p?' active':''}`} onClick={() => setPhase(p)}>
                  {PHASE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Day tabs */}
        {groupBy === 'day' && (
          <div style={{overflowX:'auto',paddingBottom:4,marginBottom:'1.25rem'}}>
            <div className="tabs" style={{width:'max-content'}}>
              {[...new Set(allMatches.filter(function(m){return m.kickoff}).map(function(m){return new Date(m.kickoff).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}))].map(function(day) {
                return (
                  <button key={day} className={'tab' + (activeDay===day?' active':'')} onClick={function(){setActiveDay(day)}} style={{fontSize:11,padding:'4px 8px'}}>
                    {day.replace(', 2026','')}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {loading && <p style={{color:'var(--c-muted)'}}>Loading...</p>}

        {!loading && matches.length === 0 && (
          <div className="alert alert-info">No matches for this phase yet.</div>
        )}

        {!loading && matches.length > 0 && players.length > 0 && (
          <div className="card" style={{overflowX:'auto',padding:0}}>
            {/* Legend */}
            <div style={{display:'flex',gap:16,padding:'12px 16px',borderBottom:'1px solid var(--c-border)',flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:12,color:'var(--c-muted)',fontWeight:600}}>Legend:</span>
              {[
                {color:'rgba(240,165,0,0.25)',border:'1px solid rgba(240,165,0,0.4)',label:'Exact score'},
                {color:'rgba(34,197,94,0.12)',border:'1px solid rgba(34,197,94,0.25)',label:'Correct result'},
                {color:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',label:'Wrong'},
                {color:'transparent',border:'1px solid var(--c-border)',label:'No result yet'},
              ].map(l => (
                <div key={l.label} style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                  <div style={{width:20,height:16,borderRadius:3,background:l.color,border:l.border}}/>
                  <span style={{color:'var(--c-muted)'}}>{l.label}</span>
                </div>
              ))}
            </div>

            <table style={{minWidth: players.length * 90 + 200}}>
              <thead>
                <tr>
                  <th style={{minWidth:180,position:'sticky',left:0,background:'var(--c-surface)',zIndex:2}}>Match</th>
                  <th style={{minWidth:80,textAlign:'center'}}>Result</th>
                  {players.map((p,i) => (
                    <th key={p.id} style={{minWidth:90,textAlign:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                        <div className="avatar" style={{
                          width:24,height:24,fontSize:9,fontWeight:700,
                          background:`${AVATAR_COLORS[i%AVATAR_COLORS.length]}22`,
                          color:AVATAR_COLORS[i%AVATAR_COLORS.length]
                        }}>
                          {p.name.slice(0,2).toUpperCase()}
                        </div>
                        <span style={{fontSize:10,color:'var(--c-muted)',maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {p.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map(m => (
                  <tr key={m.id}>
                    <td style={{position:'sticky',left:0,background:'var(--c-surface)',zIndex:1,borderBottom:'1px solid var(--c-border)'}}>
                      <div style={{fontSize:12,fontWeight:500,lineHeight:1.4}}>
                        <span>{m.home_team}</span>
                        <span style={{color:'var(--c-muted)',margin:'0 4px'}}>vs</span>
                        <span>{m.away_team}</span>
                      </div>
                      {m.kickoff && (
                        <div style={{fontSize:10,color:'var(--c-muted)',marginTop:2}}>
                          {new Date(m.kickoff).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                          {' '}
                          {new Date(m.kickoff).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})} ET
                        </div>
                      )}
                      {isMatchRevealed(m) && predictions[String(m.id)] && (function() {
                        var counts = {}
                        Object.values(predictions[String(m.id)]).forEach(function(p) {
                          if (p && p.hg != null) { var k = p.hg + '-' + p.ag; counts[k] = (counts[k]||0) + 1 }
                        })
                        var top = Object.entries(counts).sort(function(a,b){return b[1]-a[1]})[0]
                        if (!top) return null
                        return <div style={{fontSize:9,color:'var(--c-accent2)',marginTop:2}}>Most picked: {top[0]} ({top[1]})</div>
                      })()}
                    </td>
                    <td style={{textAlign:'center',fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'var(--c-text)'}}>
                      {m.home_goals != null ? `${m.home_goals}-${m.away_goals}` : <span style={{color:'var(--c-hint)',fontSize:12}}>TBD</span>}
                    </td>
                    {players.map(p => {
                      const revealed = isAdmin || isMatchRevealed(m)
                      const pred = predictions[String(m.id)]?.[String(p.id)]
                      const pts = scores[String(m.id)]?.[String(p.id)]
                      return (
                        <td key={p.id} style={{
                          textAlign:'center',
                          background: revealed ? getPredBg(pred, m) : 'transparent',
                          border: revealed ? getPredBorder(pred, m) : '1px solid var(--c-border)',
                          borderRadius:4,
                          padding:'6px 4px',
                        }}>
                          {!revealed ? (
                            <span style={{color:'var(--c-hint)',fontSize:11}}>🔒</span>
                          ) : pred && pred.hg != null ? (
                            <div>
                              <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,lineHeight:1}}>
                                {pred.hg}-{pred.ag}
                              </div>
                              {pts != null && (
                                <div style={{fontSize:10,color:'var(--c-muted)',marginTop:2}}>+{pts}pts</div>
                              )}
                            </div>
                          ) : (
                            <span style={{color:'var(--c-hint)',fontSize:11}}>-</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
