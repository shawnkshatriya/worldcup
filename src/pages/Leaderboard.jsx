import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']
const MEDALS = ['🥇','🥈','🥉']
const MEDAL_COLORS = ['var(--c-gold)','var(--c-silver)','var(--c-bronze)']

export default function Leaderboard() {
  const { player } = usePlayer()
  const roomCode = player?.room_code || 'DEFAULT'
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [totalFinished, setFinished] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data:players }, { data:scores }, { data:predictions }, { count:finished }] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code', roomCode).limit(500),
      supabase.from('scores').select('*').limit(5000),
      supabase.from('predictions').select('player_id,match_id,home_goals,away_goals').limit(5000),
      supabase.from('matches').select('*',{count:'exact',head:true}).eq('status','FINISHED'),
    ])
    setFinished(finished||0)
    if (!players) { setLoading(false); return }

    const built = players.map((p,idx) => {
      const ps = scores?.filter(s=>s.player_id===p.id)||[]
      const pp = predictions?.filter(pr=>pr.player_id===p.id&&pr.home_goals!=null)||[]
      const scored = ps.length
      const correct= ps.filter(s=>s.pts_result>0||s.pts_exact>0).length
      const diff   = ps.filter(s=>s.pts_diff>0).length
      const exact  = ps.filter(s=>s.pts_exact>0).length
      const approx = ps.reduce((a,s)=>a+(s.pts_approx||0),0)
      const ko     = ps.reduce((a,s)=>a+(s.pts_ko_team||0),0)
      return {
        ...p, color:AVATAR_COLORS[idx%AVATAR_COLORS.length],
        pts:    ps.reduce((a,s)=>a+(s.pts_total||0),0),
        correct, diff, exact, approx, ko,
        preds:  pp.length, scored,
        pctWL:  scored>0?Math.round(correct/scored*100):0,
        pctDiff:scored>0?Math.round(diff/scored*100):0,
        pctExact:scored>0?Math.round(exact/scored*100):0,
      }
    }).sort((a,b)=>b.pts-a.pts)

    setRows(built)
    setLoading(false)
  }

  const maxPts = rows[0]?.pts||1

  function PctBadge({ val }) {
    const color = val>=60?'var(--c-success)':val>=40?'var(--c-accent2)':'var(--c-danger)'
    const bg    = val>=60?'rgba(34,197,94,0.1)':val>=40?'rgba(240,165,0,0.1)':'rgba(239,68,68,0.1)'
    return (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,background:bg,color,whiteSpace:'nowrap'}}>
        {val}%
      </span>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Leaderboard</h1>
          <p>{totalFinished} of 104 matches played</p>
        </div>
      </div>
      <div className="page-body">
        {loading && <p style={{color:'var(--c-muted)'}}>Loading...</p>}

        {!loading && rows.length === 0 && (
          <div className="alert alert-info">No players yet - invite friends to join!</div>
        )}

        {!loading && rows.length > 0 && (
          <>
            {/* Podium - top 3 */}
            {rows.length >= 3 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:'1.5rem',alignItems:'flex-end'}}>
                {/* 2nd */}
                {[1,0,2].map(rank => {
                  const p = rows[rank]
                  if (!p) return <div key={rank}/>
                  const isFirst = rank===0
                  const medal = MEDALS[rank]
                  const mc    = MEDAL_COLORS[rank]
                  const h     = isFirst?140:110
                  return (
                    <div key={p.id} style={{
                      display:'flex',flexDirection:'column',alignItems:'center',
                      background:'var(--c-surface)',
                      border:`1px solid var(--c-border)`,
                      borderTop:`4px solid ${mc}`,
                      borderRadius:'var(--radius-lg)',
                      padding:'1.25rem 0.75rem 1rem',
                      minHeight:h,
                      justifyContent:'center',
                      boxShadow: isFirst?`0 0 0 1px ${mc}33`:'none',
                    }}>
                      <div style={{fontSize:36,marginBottom:4,lineHeight:1}}>{medal}</div>
                      <div className="avatar" style={{
                        width:isFirst?48:38,height:isFirst?48:38,
                        fontSize:isFirst?16:13,fontWeight:700,
                        background:`${p.color}22`,color:p.color,
                        marginBottom:8,
                      }}>{p.name.slice(0,2).toUpperCase()}</div>
                      <div style={{fontSize:isFirst?14:12,fontWeight:700,textAlign:'center',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{p.name}</div>
                      <div style={{fontFamily:'var(--font-display)',fontSize:isFirst?38:30,color:mc,lineHeight:1}}>{p.pts}</div>
                      <div style={{fontSize:10,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>pts</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{minWidth:700}}>
                  <thead>
                    <tr>
                      <th style={{width:44}}>#</th>
                      <th>Player</th>
                      <th style={{textAlign:'right'}}>Points</th>
                      <th style={{textAlign:'right'}}>% W/L</th>
                      <th style={{textAlign:'right'}}>W/L count</th>
                      <th style={{textAlign:'right'}}>% Diff</th>
                      <th style={{textAlign:'right'}}>Diff count</th>
                      <th style={{textAlign:'right'}}>% Exact</th>
                      <th style={{textAlign:'right'}}>Exact count</th>
                      <th style={{textAlign:'right'}}>Approx Bonus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p,i) => {
                      const isMe = player?.id===p.id
                      const barW = maxPts>0?Math.max((p.pts/maxPts)*100,p.pts>0?2:0):0
                      return (
                        <tr key={p.id} style={isMe?{background:'rgba(200,16,46,0.04)'}:{}}>
                          <td style={{textAlign:'center'}}>
                            {i<3
                              ? <span style={{fontSize:22}}>{MEDALS[i]}</span>
                              : <span style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-muted)'}}>{i+1}</span>
                            }
                          </td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div className="avatar" style={{background:`${p.color}18`,color:p.color}}>
                                {p.name.slice(0,2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{fontWeight:600,fontSize:13}}>
                                  {p.name}
                                  {isMe&&<span style={{marginLeft:6,fontSize:9,color:'var(--c-accent)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>You</span>}
                                </div>
                                <div style={{width:100,height:4,background:'var(--c-surface2)',borderRadius:2,overflow:'hidden',marginTop:4}}>
                                  <div style={{height:'100%',width:`${barW}%`,
                                    background:i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':p.color,
                                    borderRadius:2,transition:'width 0.6s'}}/>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{textAlign:'right'}}>
                            <span style={{fontFamily:'var(--font-display)',fontSize:24,color:i<3?MEDAL_COLORS[i]:'var(--c-text)'}}>{p.pts}</span>
                          </td>
                          <td style={{textAlign:'right'}}><PctBadge val={p.pctWL}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:13}}>{p.correct}</td>
                          <td style={{textAlign:'right'}}><PctBadge val={p.pctDiff}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:13}}>{p.diff}</td>
                          <td style={{textAlign:'right'}}><PctBadge val={p.pctExact}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:13}}>{p.exact}</td>
                          <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:13}}>{p.approx}</td>
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
