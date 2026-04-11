import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

const AVATAR_COLORS = [
  '#C8102E','#003DA5','#F0A500','#22C55E','#a855f7',
  '#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6'
]

export default function Leaderboard() {
  const { player } = usePlayer()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [totalFinished, setTotalFinished] = useState(0)

  useEffect(() => { loadLeaderboard() }, [])

  async function loadLeaderboard() {
    setLoading(true)
    const [
      { data: players },
      { data: scores },
      { data: predictions },
      { count: finished },
    ] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code','DEFAULT'),
      supabase.from('scores').select('player_id,pts_result,pts_diff,pts_exact,pts_approx,pts_ko_team,pts_total'),
      supabase.from('predictions').select('player_id,match_id,home_goals,away_goals'),
      supabase.from('matches').select('*', { count:'exact', head:true }).eq('status','FINISHED'),
    ])

    setTotalFinished(finished || 0)
    if (!players) { setLoading(false); return }

    const rows = players.map((p, idx) => {
      const ps = scores?.filter(s => s.player_id === p.id) || []
      const pp = predictions?.filter(pr => pr.player_id === p.id && pr.home_goals != null) || []
      const scoredPs = ps.filter(s => s.pts_result > 0 || s.pts_exact > 0 || s.pts_diff > 0)

      return {
        ...p,
        color:   AVATAR_COLORS[idx % AVATAR_COLORS.length],
        pts:     ps.reduce((a,s) => a + (s.pts_total||0), 0),
        correct: ps.filter(s => s.pts_result > 0 || s.pts_exact > 0).length,
        diff:    ps.filter(s => s.pts_diff > 0).length,
        exact:   ps.filter(s => s.pts_exact > 0).length,
        approx:  ps.reduce((a,s) => a + (s.pts_approx||0), 0),
        ko:      ps.reduce((a,s) => a + (s.pts_ko_team||0), 0),
        preds:   pp.length,
        scored:  ps.length, // matches with a scored prediction
      }
    }).sort((a,b) => b.pts - a.pts)

    setRows(rows)
    setLoading(false)
  }

  const maxPts   = rows[0]?.pts || 1
  const RANK_CLS = ['rank-1','rank-2','rank-3','rank-n']

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Leaderboard</h1>
          <p>Updated after each match result · {totalFinished} matches played so far</p>
        </div>
      </div>
      <div className="page-body">
        {loading && <p style={{color:'var(--c-muted)'}}>Loading...</p>}

        {!loading && rows.length === 0 && (
          <div className="alert alert-info">No players yet — invite your friends to join!</div>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* Top 3 podium cards */}
            {rows.length >= 3 && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:'1.25rem'}}>
                {[rows[1], rows[0], rows[2]].map((p, podiumIdx) => {
                  const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3
                  const medals = ['var(--c-silver)', 'var(--c-gold)', 'var(--c-bronze)']
                  const heights = ['80px', '100px', '70px']
                  if (!p) return <div key={podiumIdx} />
                  return (
                    <div key={p.id} style={{
                      display:'flex', flexDirection:'column', alignItems:'center',
                      background:'var(--c-surface)', border:'1px solid var(--c-border)',
                      borderRadius:'var(--radius-lg)', padding:'1rem 0.5rem',
                      borderTop: `3px solid ${medals[podiumIdx]}`,
                    }}>
                      <div className="avatar" style={{
                        width:44, height:44, fontSize:15, fontWeight:700,
                        background:`${p.color}22`, color:p.color, marginBottom:8
                      }}>
                        {p.name.slice(0,2).toUpperCase()}
                      </div>
                      <div style={{fontFamily:'var(--font-display)', fontSize:32, color:medals[podiumIdx], lineHeight:1}}>{actualRank}</div>
                      <div style={{fontSize:13, fontWeight:600, marginTop:4, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:90}}>{p.name}</div>
                      <div style={{fontFamily:'var(--font-display)', fontSize:24, color:'var(--c-text)', marginTop:4}}>{p.pts}</div>
                      <div style={{fontSize:10, color:'var(--c-muted)', textTransform:'uppercase', letterSpacing:'0.06em'}}>pts</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <div className="card" style={{padding:0, overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{minWidth:640}}>
                  <thead>
                    <tr>
                      <th style={{width:40}}>#</th>
                      <th>Player</th>
                      <th style={{textAlign:'right'}}>Points</th>
                      <th style={{textAlign:'right'}}>Correct</th>
                      <th style={{textAlign:'right'}}>% correct</th>
                      <th style={{textAlign:'right'}}>Goal diff</th>
                      <th style={{textAlign:'right'}}>Exact</th>
                      <th style={{textAlign:'right'}}>Approx</th>
                      <th style={{textAlign:'right'}}>KO</th>
                      <th style={{textAlign:'right'}}>Predicted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p, i) => {
                      const isMe = player?.id === p.id
                      const pct  = p.scored > 0 ? Math.round((p.correct / p.scored) * 100) : 0
                      const barW = maxPts > 0 ? Math.max((p.pts / maxPts) * 100, p.pts > 0 ? 2 : 0) : 0

                      return (
                        <tr key={p.id} style={isMe ? {background:'rgba(200,16,46,0.04)'} : {}}>
                          <td>
                            <span className={`rank-badge ${RANK_CLS[Math.min(i,3)]}`}>{i+1}</span>
                          </td>
                          <td>
                            <div style={{display:'flex', alignItems:'center', gap:10}}>
                              <div className="avatar" style={{background:`${p.color}18`, color:p.color}}>
                                {p.name.slice(0,2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{fontWeight:500, fontSize:13}}>
                                  {p.name}
                                  {isMe && <span style={{marginLeft:6, fontSize:10, color:'var(--c-accent)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em'}}>You</span>}
                                </div>
                                {/* Points bar */}
                                <div style={{width:120, height:4, background:'var(--c-surface2)', borderRadius:2, overflow:'hidden', marginTop:4}}>
                                  <div style={{
                                    height:'100%',
                                    width:`${barW}%`,
                                    background: i === 0 ? 'var(--c-gold)' : i === 1 ? 'var(--c-silver)' : i === 2 ? 'var(--c-bronze)' : p.color,
                                    borderRadius:2,
                                    transition:'width 0.6s ease',
                                  }} />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{textAlign:'right'}}>
                            <span style={{fontFamily:'var(--font-display)', fontSize:22, fontWeight:400}}>{p.pts}</span>
                          </td>
                          <td style={{textAlign:'right', color:'var(--c-muted)'}}>{p.correct}</td>
                          <td style={{textAlign:'right'}}>
                            {p.scored > 0 ? (
                              <span style={{
                                fontSize:12, fontWeight:700, padding:'2px 8px',
                                borderRadius:20,
                                background: pct >= 60 ? 'rgba(34,197,94,0.1)' : pct >= 40 ? 'rgba(240,165,0,0.1)' : 'rgba(239,68,68,0.1)',
                                color: pct >= 60 ? 'var(--c-success)' : pct >= 40 ? 'var(--c-accent2)' : 'var(--c-danger)',
                              }}>{pct}%</span>
                            ) : <span style={{color:'var(--c-hint)'}}>—</span>}
                          </td>
                          <td style={{textAlign:'right', color:'var(--c-muted)'}}>{p.diff}</td>
                          <td style={{textAlign:'right', color:'var(--c-muted)'}}>{p.exact}</td>
                          <td style={{textAlign:'right', color:'var(--c-muted)'}}>{p.approx}</td>
                          <td style={{textAlign:'right', color:'var(--c-muted)'}}>{p.ko}</td>
                          <td style={{textAlign:'right', color:'var(--c-muted)', fontSize:12}}>{p.preds} / 104</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
