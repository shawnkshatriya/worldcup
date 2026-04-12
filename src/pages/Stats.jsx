import { useEffect, useState, useMemo } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { supabase } from '../lib/supabase'

const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']
const GROUP_NAMES = { GROUP_A:'A',GROUP_B:'B',GROUP_C:'C',GROUP_D:'D',GROUP_E:'E',GROUP_F:'F', GROUP_G:'G',GROUP_H:'H',GROUP_I:'I',GROUP_J:'J',GROUP_K:'K',GROUP_L:'L' }

function HBar({ label, value, max, color='var(--c-accent)', suffix='', note='' }) {
  const pct = max > 0 ? Math.max((value/max)*100, value>0?2:0) : 0
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
      <div style={{width:120,fontSize:12,color:'var(--c-muted)',textAlign:'right',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
      <div style={{flex:1,height:20,background:'var(--c-surface2)',borderRadius:4,overflow:'hidden',position:'relative'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:4,transition:'width 0.6s'}}/>
      </div>
      <div style={{width:55,fontSize:12,fontWeight:700,color:'var(--c-text)',textAlign:'right',flexShrink:0}}>{value}{suffix}</div>
      {note && <div style={{fontSize:11,color:'var(--c-muted)',flexShrink:0}}>{note}</div>}
    </div>
  )
}

function Donut({ slices, size=130 }) {
  const total = slices.reduce((a,s)=>a+s.value,0)
  if (!total) return <p style={{color:'var(--c-muted)',fontSize:13}}>No data yet</p>
  let cum = -Math.PI/2
  const cx=size/2,cy=size/2,r=size*0.38,inner=size*0.22
  const paths = slices.map(s=>{
    const angle=(s.value/total)*2*Math.PI
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum); cum+=angle
    const x2=cx+r*Math.cos(cum),y2=cy+r*Math.sin(cum)
    const xi1=cx+inner*Math.cos(cum-angle),yi1=cy+inner*Math.sin(cum-angle)
    const xi2=cx+inner*Math.cos(cum),yi2=cy+inner*Math.sin(cum)
    const large=angle>Math.PI?1:0
    return {...s,d:`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`,pct:Math.round(s.value/total*100)}
  })
  return (
    <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p,i)=><path key={i} d={p.d} fill={p.color} opacity={0.9}/>)}
        <circle cx={cx} cy={cy} r={inner-2} fill="var(--c-surface)"/>
        <text x={cx} y={cy-4} textAnchor="middle" style={{fontSize:10,fill:'var(--c-muted)',fontFamily:'var(--font-body)'}}>{total}</text>
        <text x={cx} y={cy+10} textAnchor="middle" style={{fontSize:9,fill:'var(--c-hint)',fontFamily:'var(--font-body)'}}>total</text>
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        {paths.map((p,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:12}}>
            <div style={{width:10,height:10,borderRadius:2,background:p.color,flexShrink:0}}/>
            <span style={{color:'var(--c-muted)',flex:1}}>{p.label}</span>
            <span style={{fontWeight:700,paddingLeft:8}}>{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Column chart with labels
function ColChart({ data, color='var(--c-accent)', height=100 }) {
  const maxV = Math.max(...data.map(d=>d.value),1)
  return (
    <div style={{width:'100%'}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:3,height,marginBottom:4}}>
        {data.map((d,i)=>{
          const h = Math.max((d.value/maxV)*(height-16), d.value>0?4:0)
          return (
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              {d.value>0 && <div style={{fontSize:9,color:'var(--c-muted)',fontWeight:600,lineHeight:1}}>{d.value}</div>}
              <div style={{width:'100%',height:h,background:color,borderRadius:'3px 3px 0 0',minHeight:d.value>0?4:0}}/>
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',gap:3,borderTop:'1px solid var(--c-border)',paddingTop:3}}>
        {data.map((d,i)=>(
          <div key={i} style={{flex:1,textAlign:'center',fontSize:9,color:'var(--c-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.label}</div>
        ))}
      </div>
    </div>
  )
}

// Line chart with value labels on last point
function LineChart({ series, height=80, showLast=true }) {
  // series: [{label, color, points:[{x,y,label}]}]
  if (!series?.length || !series[0]?.points?.length) return <p style={{color:'var(--c-muted)',fontSize:12}}>Not enough data</p>
  const W=300, H=height, pad=8
  const allVals = series.flatMap(s=>s.points.map(p=>p.y))
  const minV=Math.min(...allVals,0), maxV=Math.max(...allVals,1)
  const range=maxV-minV||1
  const nPts = series[0].points.length

  function toX(i) { return pad + (i/(nPts-1))*(W-pad*2) }
  function toY(v) { return H - pad - ((v-minV)/range)*(H-pad*2) }

  return (
    <div style={{width:'100%',overflowX:'auto'}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H+20}`} style={{overflow:'visible',display:'block'}}>
        {/* Y axis labels */}
        {[0,50,100].map(v=>{
          const yp = H - pad - (v/100)*(H-pad*2)
          if (maxV<=100) return (
            <g key={v}>
              <line x1={pad} y1={yp} x2={W-pad} y2={yp} stroke="var(--c-border)" strokeWidth="0.5" strokeDasharray="3,3"/>
              <text x={pad-2} y={yp+3} textAnchor="end" style={{fontSize:8,fill:'var(--c-hint)',fontFamily:'var(--font-body)'}}>{v}%</text>
            </g>
          )
          return null
        })}

        {series.map((s,si)=>{
          const pts = s.points
          const pathD = pts.map((p,i)=>`${i===0?'M':'L'} ${toX(i).toFixed(1)} ${toY(p.y).toFixed(1)}`).join(' ')
          const lastPt = pts[pts.length-1]
          const lx = toX(pts.length-1), ly = toY(lastPt.y)
          return (
            <g key={si}>
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
              {pts.map((p,i)=><circle key={i} cx={toX(i)} cy={toY(p.y)} r="2.5" fill={s.color}/>)}
              {showLast && (
                <text x={lx+4} y={ly+4} style={{fontSize:9,fill:s.color,fontFamily:'var(--font-body)',fontWeight:'bold'}}>{lastPt.y}{maxV<=100?'%':''}</text>
              )}
            </g>
          )
        })}

        {/* X axis labels */}
        {series[0].points.map((p,i)=>{
          if (i===0||i===nPts-1||i===Math.floor(nPts/2)) return (
            <text key={i} x={toX(i)} y={H+16} textAnchor="middle" style={{fontSize:8,fill:'var(--c-hint)',fontFamily:'var(--font-body)'}}>{p.label}</text>
          )
          return null
        })}
      </svg>
    </div>
  )
}

export default function Stats() {
  const { player, isAdmin } = usePlayer()
  const roomCode = player?.room_code || 'DEFAULT'
  const [loading,setLoading] = useState(true)
  const [tab,setTab]         = useState('tournament')
  const [players,setPlayers] = useState([])
  const [scores,setScores]   = useState([])
  const [matches,setMatches] = useState([])
  const [predictions,setPreds]= useState([])

  useEffect(()=>{ loadAll() },[])

  async function loadAll() {
    setLoading(true)
    const [{data:pl},{data:sc},{data:ma},{data:pr}] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code', roomCode).order('created_at'),
      supabase.from('scores').select('*'),
      supabase.from('matches').select('*').order('match_number'),
      supabase.from('predictions').select('*'),
    ])
    setPlayers(pl||[]); setScores(sc||[]); setMatches(ma||[]); setPreds(pr||[])
    setLoading(false)
  }

  const finished = useMemo(()=>matches.filter(m=>m.home_goals!=null),[matches])

  const playerStats = useMemo(()=>players.map((p,idx)=>{
    const ps=scores.filter(s=>s.player_id===p.id)
    const pp=predictions.filter(pr=>pr.player_id===p.id&&pr.home_goals!=null)
    const scored=ps.length
    const total  =ps.reduce((a,s)=>a+(s.pts_total||0),0)
    const correct=ps.filter(s=>s.pts_result>0||s.pts_exact>0).length
    const diff   =ps.filter(s=>s.pts_diff>0).length
    const exact  =ps.filter(s=>s.pts_exact>0).length
    const approx =ps.filter(s=>s.pts_approx>0).length
    return { id:p.id,name:p.name,color:AVATAR_COLORS[idx%AVATAR_COLORS.length],
      total,correct,diff,exact,approx,preds:pp.length,scored,
      pctWL:   scored>0?Math.round(correct/scored*100):0,
      pctDiff: scored>0?Math.round(diff/scored*100):0,
      pctExact:scored>0?Math.round(exact/scored*100):0,
    }
  }),[players,scores,predictions])

  const sorted   = [...playerStats].sort((a,b)=>b.total-a.total)
  const maxPts   = sorted[0]?.total||1
  const leader   = sorted[0]
  const topScorer= useMemo(()=>{
    const tg={}
    finished.forEach(m=>{ tg[m.home_team]=(tg[m.home_team]||0)+m.home_goals; tg[m.away_team]=(tg[m.away_team]||0)+m.away_goals })
    const top=Object.entries(tg).sort((a,b)=>b[1]-a[1])[0]
    return top?{name:top[0],goals:top[1]}:null
  },[finished])

  const totalGoals=finished.reduce((a,m)=>a+m.home_goals+m.away_goals,0)
  const avgGoals  =finished.length>0?(totalGoals/finished.length).toFixed(2):'0.00'
  const scoreless =finished.filter(m=>m.home_goals===0&&m.away_goals===0).length
  const highScoring=finished.filter(m=>m.home_goals+m.away_goals>=4).length

  const groupGoals={},groupCounts={}
  finished.forEach(m=>{ const g=GROUP_NAMES[m.phase]; if(!g) return; groupGoals[g]=(groupGoals[g]||0)+m.home_goals+m.away_goals; groupCounts[g]=(groupCounts[g]||0)+1 })

  const topTeams=useMemo(()=>{
    const tg={}
    finished.forEach(m=>{ tg[m.home_team]=(tg[m.home_team]||0)+m.home_goals; tg[m.away_team]=(tg[m.away_team]||0)+m.away_goals })
    return Object.entries(tg).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,12)
  },[finished])

  const goalsHist=Array.from({length:9},(_,i)=>({
    label:i===8?'8+':String(i),
    value:finished.filter(m=>{ const t=m.home_goals+m.away_goals; return i===8?t>=8:t===i }).length
  }))

  const poolCorrect=scores.filter(s=>s.pts_result>0||s.pts_exact>0).length
  const poolAccuracy=scores.length>0?Math.round(poolCorrect/scores.length*100):0
  const poolExactRate=scores.length>0?Math.round(scores.filter(s=>s.pts_exact>0).length/scores.length*100):0

  // Accuracy over time
  const accuracyOverTime=useMemo(()=>{
    const pts=[]
    for(let i=1;i<=Math.min(finished.length,20);i++){
      const ids=new Set(finished.slice(0,i).map(m=>m.id))
      const rel=scores.filter(s=>ids.has(s.match_id))
      const corr=rel.filter(s=>s.pts_result>0||s.pts_exact>0).length
      pts.push({label:`M${i}`,y:rel.length>0?Math.round(corr/rel.length*100):0})
    }
    return pts
  },[finished,scores])

  // Points over time top 3
  const ptsOverTime=useMemo(()=>{
    return sorted.slice(0,3).map(pl=>({
      label:pl.name, color:pl.color,
      points: finished.slice(0,20).map((m,i)=>{
        const cumPts=scores.filter(s=>s.player_id===pl.id&&finished.slice(0,i+1).some(x=>x.id===s.match_id)).reduce((a,s)=>a+(s.pts_total||0),0)
        return {label:`M${i+1}`,y:cumPts}
      })
    }))
  },[sorted,finished,scores])

  if (loading) return (
    <div><div className="page-header"><div className="page-header-inner"><h1>Stats</h1></div></div>
    <div className="page-body"><p style={{color:'var(--c-muted)'}}>Loading...</p></div></div>
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Stats &amp; Insights</h1>
          <p>{finished.length} of 104 matches played · {totalGoals} total goals</p>
        </div>
      </div>
      <div className="page-body">

        {/* Summary banner */}
        <div className="metrics" style={{marginBottom:'1.25rem'}}>
          <div className="metric"><div className="metric-label">Matches played</div><div className="metric-value">{finished.length}<span style={{fontSize:16,color:'var(--c-muted)',fontWeight:400}}>/104</span></div></div>
          <div className="metric"><div className="metric-label">Total goals</div><div className="metric-value" style={{color:'var(--c-accent)'}}>{totalGoals}</div></div>
          <div className="metric"><div className="metric-label">Avg goals/match</div><div className="metric-value">{avgGoals}</div></div>
          <div className="metric"><div className="metric-label">Pool accuracy</div><div className="metric-value" style={{color:'var(--c-success)'}}>{poolAccuracy}<span style={{fontSize:16,fontWeight:400}}>%</span></div></div>
          {topScorer && <div className="metric"><div className="metric-label">Top scoring nation</div><div className="metric-value" style={{fontSize:20}}>{topScorer.name}</div><div style={{fontSize:11,color:'var(--c-muted)'}}>{topScorer.goals} goals</div></div>}
          {leader && <div className="metric"><div className="metric-label">Pool leader</div><div className="metric-value" style={{fontSize:20}}>{leader.name}</div><div style={{fontSize:11,color:'var(--c-muted)'}}>{leader.total} pts</div></div>}
        </div>

        <div className="tabs">
          {['tournament','players','charts','funfacts'].map(t=>(
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
              {t==='funfacts'?'Fun Facts':t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* TOURNAMENT */}
        {tab==='tournament' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1.25rem'}}>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Goals per match distribution</div>
              {!finished.length?<p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>:<ColChart data={goalsHist} color="var(--c-accent)" height={100}/>}
              <p style={{fontSize:11,color:'var(--c-muted)',marginTop:6}}>Total goals in each match</p>
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Match outcomes</div>
              {!finished.length?<p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>:
                <Donut slices={[
                  {label:'Home win',value:finished.filter(m=>m.home_goals>m.away_goals).length,color:'var(--c-accent)'},
                  {label:'Away win',value:finished.filter(m=>m.home_goals<m.away_goals).length,color:'var(--c-info)'},
                  {label:'Draw',    value:finished.filter(m=>m.home_goals===m.away_goals).length,color:'var(--c-muted)'},
                ]} size={130}/>
              }
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Goals by group</div>
              {!Object.keys(groupGoals).length?<p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>:
                Object.entries(groupGoals).sort((a,b)=>b[1]-a[1]).map(([g,v])=>(
                  <HBar key={g} label={`Group ${g}`} value={v} max={Math.max(...Object.values(groupGoals))}
                    color="var(--c-accent2)" suffix=" gls"
                    note={groupCounts[g]?`${(v/groupCounts[g]).toFixed(1)}/m`:''}/>
                ))
              }
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Top scoring nations 🏆</div>
              {!topTeams.length?<p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>:
                topTeams.map((t,i)=>(
                  <HBar key={t.label} label={t.label} value={t.value} max={topTeams[0].value}
                    color={i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':'var(--c-accent)'}/>
                ))
              }
            </div>

            <div className="card" style={{marginBottom:0,gridColumn:'span 2'}}>
              <div className="card-title">Match facts</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
                {[
                  {label:'Finished',   value:finished.length},
                  {label:'Total goals',value:totalGoals},
                  {label:'Avg/match',  value:avgGoals},
                  {label:'High-scoring (4+)',value:highScoring},
                  {label:'Scoreless (0-0)',   value:scoreless},
                  {label:'Pool predictions',  value:predictions.filter(p=>p.home_goals!=null).length},
                ].map(s=>(
                  <div key={s.label} className="metric" style={{marginBottom:0}}>
                    <div className="metric-label">{s.label}</div>
                    <div className="metric-value" style={{fontSize:28}}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PLAYERS */}
        {tab==='players' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div className="metrics">
              <div className="metric"><div className="metric-label">Players</div><div className="metric-value">{players.length}</div></div>
              <div className="metric"><div className="metric-label">Pool accuracy</div><div className="metric-value" style={{color:'var(--c-success)'}}>{poolAccuracy}%</div></div>
              <div className="metric"><div className="metric-label">Exact score rate</div><div className="metric-value" style={{color:'var(--c-accent2)'}}>{poolExactRate}%</div></div>
              {leader&&<div className="metric"><div className="metric-label">Leader</div><div className="metric-value" style={{fontSize:20}}>{leader.name}</div><div style={{fontSize:11,color:'var(--c-muted)'}}>{leader.total} pts</div></div>}
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Points race</div>
              {sorted.map((p,i)=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{width:28,textAlign:'center',fontSize:i<3?22:14,color:i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':'var(--c-muted)'}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div className="avatar" style={{width:28,height:28,fontSize:10,fontWeight:700,background:`${p.color}22`,color:p.color,flexShrink:0}}>{p.name.slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:500}}>{p.name}</span>
                      <span style={{fontSize:13,fontWeight:700,fontFamily:'var(--font-display)',marginLeft:8}}>{p.total} pts</span>
                    </div>
                    <div style={{height:8,background:'var(--c-surface2)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${maxPts>0?Math.max((p.total/maxPts)*100,p.total>0?2:0):0}%`,
                        background:i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':p.color,
                        borderRadius:4,transition:'width 0.6s'}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {[
              {label:'% W/L correct',  key:'pctWL',   color:'var(--c-accent)',  suffix:'%'},
              {label:'% goal diff',    key:'pctDiff',  color:'var(--c-info)',    suffix:'%'},
              {label:'% exact scores', key:'pctExact', color:'var(--c-accent2)', suffix:'%'},
            ].map(metric=>(
              <div key={metric.key} className="card" style={{marginBottom:0}}>
                <div className="card-title">{metric.label}</div>
                {[...playerStats].sort((a,b)=>b[metric.key]-a[metric.key]).map(p=>(
                  <HBar key={p.id} label={p.name} value={p[metric.key]} max={100} color={metric.color} suffix={metric.suffix}/>
                ))}
              </div>
            ))}

            <div className="card" style={{marginBottom:0,padding:0,overflow:'hidden'}}>
              <div style={{padding:'1.25rem 1.5rem 0.5rem'}}><div className="card-title" style={{marginBottom:0}}>Full breakdown</div></div>
              <div style={{overflowX:'auto'}}>
                <table>
                  <thead><tr>
                    <th>Player</th>
                    <th style={{textAlign:'right'}}>Pts</th>
                    <th style={{textAlign:'right'}}>Correct</th>
                    <th style={{textAlign:'right'}}>% W/L</th>
                    <th style={{textAlign:'right'}}>Diff</th>
                    <th style={{textAlign:'right'}}>% Diff</th>
                    <th style={{textAlign:'right'}}>Exact</th>
                    <th style={{textAlign:'right'}}>% Exact</th>
                    <th style={{textAlign:'right'}}>Approx Bonus</th>
                  </tr></thead>
                  <tbody>
                    {sorted.map((p,i)=>{
                      function Pct({v}) {
                        const bg=v>=60?'rgba(34,197,94,0.1)':v>=40?'rgba(240,165,0,0.1)':'rgba(239,68,68,0.1)'
                        const col=v>=60?'var(--c-success)':v>=40?'var(--c-accent2)':'var(--c-danger)'
                        return <span style={{fontSize:11,fontWeight:700,padding:'2px 6px',borderRadius:20,background:bg,color:col}}>{v}%</span>
                      }
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:i<3?16:12}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
                              <div className="avatar" style={{width:24,height:24,fontSize:9,background:`${p.color}22`,color:p.color}}>{p.name.slice(0,2).toUpperCase()}</div>
                              <span style={{fontSize:13,fontWeight:500}}>{p.name}</span>
                            </div>
                          </td>
                          <td style={{textAlign:'right',fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-accent)'}}>{p.total}</td>
                          <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.correct}</td>
                          <td style={{textAlign:'right'}}><Pct v={p.pctWL}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.diff}</td>
                          <td style={{textAlign:'right'}}><Pct v={p.pctDiff}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.exact}</td>
                          <td style={{textAlign:'right'}}><Pct v={p.pctExact}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.approx}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CHARTS */}
        {tab==='charts' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1.25rem'}}>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Pool accuracy over time</div>
              <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:12}}>% of predictions that were correct across all players, match by match</p>
              <LineChart series={[{label:'Accuracy',color:'var(--c-success)',points:accuracyOverTime}]} showLast={true}/>
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Points race — top 3</div>
              <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:12}}>Cumulative points per match for the top 3 players</p>
              <LineChart series={ptsOverTime} height={100} showLast={true}/>
              <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>
                {ptsOverTime.map(s=>(
                  <div key={s.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                    <div style={{width:16,height:3,background:s.color,borderRadius:2}}/>
                    <span style={{color:'var(--c-muted)'}}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Points breakdown (pool total)</div>
              {!scores.length?<p style={{color:'var(--c-muted)',fontSize:13}}>No scores yet</p>:
                <Donut slices={[
                  {label:'Correct result',value:scores.reduce((a,s)=>a+(s.pts_result||0),0),color:'var(--c-accent)'},
                  {label:'Goal diff',     value:scores.reduce((a,s)=>a+(s.pts_diff||0),0),  color:'var(--c-info)'},
                  {label:'Exact score',   value:scores.reduce((a,s)=>a+(s.pts_exact||0),0), color:'var(--c-accent2)'},
                  {label:'Approx bonus',  value:scores.reduce((a,s)=>a+(s.pts_approx||0),0),color:'var(--c-success)'},
                ].filter(s=>s.value>0)} size={140}/>
              }
              <p style={{fontSize:11,color:'var(--c-muted)',marginTop:10}}>Correct results should outnumber exact scores — every exact score also counts as a correct result, so the donut shows where points actually came from.</p>
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">% W/L correct by player</div>
              {[...playerStats].sort((a,b)=>b.pctWL-a.pctWL).map(p=>(
                <HBar key={p.id} label={p.name} value={p.pctWL} max={100} color="var(--c-accent)" suffix="%"/>
              ))}
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Exact score specialists</div>
              {[...playerStats].sort((a,b)=>b.exact-a.exact).map(p=>(
                <HBar key={p.id} label={p.name} value={p.exact} max={Math.max(...playerStats.map(x=>x.exact),1)} color="var(--c-accent2)"/>
              ))}
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Goals per match histogram</div>
              <ColChart data={goalsHist} color="var(--c-accent)" height={120}/>
            </div>

          </div>
        )}

        {/* FUN FACTS */}
        {tab==='funfacts' && (()=>{
          const second=sorted[1], last=sorted[sorted.length-1]
          const mostExact=[...playerStats].sort((a,b)=>b.exact-a.exact)[0]
          const mostCorr=[...playerStats].sort((a,b)=>b.correct-a.correct)[0]
          const gap=leader&&second?leader.total-second.total:0
          const avgPts=playerStats.length?Math.round(playerStats.reduce((a,p)=>a+p.total,0)/playerStats.length):0
          const facts=[
            leader?.total>0&&{icon:'👑',text:gap>5?`${leader.name} is running away — ${gap} pts clear of ${second?.name||'second'}`
              :gap===0&&second?`${leader.name} and ${second.name} are level at the top!`
              :`${leader.name} leads with ${leader.total} pts, just ${gap} ahead`},
            last&&last.id!==leader?.id&&leader?.total>0&&{icon:'📉',text:`${last.name} is last — ${leader.total-last.total} pts off the pace. Prayers needed.`},
            mostExact?.exact>=3&&{icon:'💎',text:`${mostExact.name} is a psychic — ${mostExact.exact} exact scores.`},
            mostExact?.exact===1&&{icon:'💎',text:`${mostExact.name} has exactly one exact score. Cherish it.`},
            mostCorr?.correct>0&&{icon:'🎯',text:`${mostCorr.name} picks winners best — ${mostCorr.correct} correct results`},
            avgPts>0&&{icon:'📊',text:`Pool average is ${avgPts} pts.`},
            totalGoals>0&&{icon:'⚽',text:`${totalGoals} goals in ${finished.length} matches — ${avgGoals} per game`},
            scoreless>0&&{icon:'🥱',text:`${scoreless} match${scoreless>1?'es have':' has'} ended 0-0.`},
            topScorer&&{icon:'🔥',text:`${topScorer.name} lead the tournament scoring with ${topScorer.goals} goals`},
          ].filter(Boolean)
          return (
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Fun facts</div>
              {!facts.length?<p style={{color:'var(--c-muted)',fontSize:13}}>Seed demo data to unlock facts.</p>
                :facts.map((f,i)=>(
                  <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid var(--c-border)',fontSize:13,alignItems:'flex-start'}}>
                    <span style={{fontSize:18,flexShrink:0}}>{f.icon}</span>
                    <span style={{color:'var(--c-muted)',lineHeight:1.6}}>{f.text}</span>
                  </div>
                ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
