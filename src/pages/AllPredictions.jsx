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

const TOURNAMENT_START = new Date('2026-06-11T22:00:00Z')

function isTournamentLive() {
  return new Date() >= TOURNAMENT_START
}

export default function AllPredictions() {
  const { player, isAdmin } = usePlayer()
  const [phase, setPhase] = useState('GROUP_A')
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState([])
  const [predictions, setPredictions] = useState({}) // {matchId: {playerId: {hg,ag}}}
  const [scores, setScores] = useState({})           // {matchId: {playerId: pts}}
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // grid | player

  const canView = isAdmin || isTournamentLive()

  useEffect(() => { loadAll() }, [phase])

  async function loadAll() {
    setLoading(true)
    const [{ data: matchData }, { data: playerData }, { data: predData }, { data: scoreData }] = await Promise.all([
      supabase.from('matches').select('*').eq('phase', phase).order('match_number'),
      supabase.from('players').select('id,name').eq('room_code','DEFAULT').limit(500).order('created_at').limit(500),
      supabase.from('predictions').select('*').limit(5000),
      supabase.from('scores').select('*').limit(5000),
    ])

    setMatches(matchData || [])
    setPlayers(playerData || [])

    // Index predictions: {matchId_playerId: pred}
    const predMap = {}
    for (const p of predData || []) {
      if (!predMap[p.match_id]) predMap[p.match_id] = {}
      predMap[p.match_id][p.player_id] = { hg: p.home_goals, ag: p.away_goals }
    }
    setPredictions(predMap)

    // Index scores
    const scoreMap = {}
    for (const s of scoreData || []) {
      if (!scoreMap[s.match_id]) scoreMap[s.match_id] = {}
      scoreMap[s.match_id][s.player_id] = s.pts_total || 0
    }
    setScores(scoreMap)
    setLoading(false)
  }

  if (!canView) {
    return (
      <div>
        <div className="page-header"><div className="page-header-inner"><h1>All Predictions</h1></div></div>
        <div className="page-body">
          <div className="alert alert-info" style={{maxWidth:480}}>
            Predictions from all players will be visible here once the tournament kicks off on June 11, 2026.
            This prevents anyone from copying others before the matches start.
          </div>
        </div>
      </div>
    )
  }

  function getPredBg(pred, match) {
    if (!pred || pred.hg == null || match.home_goals == null) return 'transparent'
    const predResult = Math.sign(pred.hg - pred.ag)
    const realResult = Math.sign(match.home_goals - match.away_goals)
    if (pred.hg === match.home_goals && pred.ag === match.away_goals) return 'rgba(240,165,0,0.18)' // exact — gold
    if (predResult === realResult) return 'rgba(34,197,94,0.1)' // correct result — green
    return 'rgba(239,68,68,0.08)' // wrong — red tint
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
          <p>
            {isAdmin ? 'Admin view — visible before and during tournament' : 'Visible now that the tournament is live'}
          </p>
        </div>
      </div>
      <div className="page-body">

        {/* Phase tabs */}
        <div style={{overflowX:'auto',paddingBottom:4,marginBottom:'1.25rem'}}>
          <div className="tabs" style={{width:'max-content'}}>
            {PHASES.map(p => (
              <button key={p} className={`tab${phase===p?' active':''}`} onClick={() => setPhase(p)}>
                {PHASE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

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
                    <th key={p.id} style={{minWidth:80,textAlign:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                        <div className="avatar" style={{
                          width:24,height:24,fontSize:9,fontWeight:700,
                          background:`${AVATAR_COLORS[i%AVATAR_COLORS.length]}22`,
                          color:AVATAR_COLORS[i%AVATAR_COLORS.length]
                        }}>
                          {p.name.slice(0,2).toUpperCase()}
                        </div>
                        <span style={{fontSize:10,color:'var(--c-muted)',maxWidth:70,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
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
                          {new Date(m.kickoff).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                        </div>
                      )}
                    </td>
                    <td style={{textAlign:'center',fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'var(--c-text)'}}>
                      {m.home_goals != null ? `${m.home_goals}–${m.away_goals}` : <span style={{color:'var(--c-hint)',fontSize:12}}>TBD</span>}
                    </td>
                    {players.map(p => {
                      const pred = predictions[m.id]?.[p.id]
                      const pts = scores[m.id]?.[p.id]
                      return (
                        <td key={p.id} style={{
                          textAlign:'center',
                          background: getPredBg(pred, m),
                          border: getPredBorder(pred, m),
                          borderRadius:4,
                          padding:'6px 4px',
                        }}>
                          {pred && pred.hg != null ? (
                            <div>
                              <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:700,lineHeight:1}}>
                                {pred.hg}–{pred.ag}
                              </div>
                              {pts != null && (
                                <div style={{fontSize:10,color:'var(--c-muted)',marginTop:2}}>+{pts}pts</div>
                              )}
                            </div>
                          ) : (
                            <span style={{color:'var(--c-hint)',fontSize:11}}>—</span>
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
