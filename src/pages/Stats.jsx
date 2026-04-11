import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']

const GROUP_NAMES = {
  GROUP_A:'A',GROUP_B:'B',GROUP_C:'C',GROUP_D:'D',GROUP_E:'E',GROUP_F:'F',
  GROUP_G:'G',GROUP_H:'H',GROUP_I:'I',GROUP_J:'J',GROUP_K:'K',GROUP_L:'L',
}

// Horizontal bar
function HBar({ label, value, max, color='var(--c-accent)', suffix='', sublabel='' }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
      <div style={{width:110,fontSize:12,color:'var(--c-muted)',textAlign:'right',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
      <div style={{flex:1,height:22,background:'var(--c-surface2)',borderRadius:4,overflow:'hidden',position:'relative'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:4,transition:'width 0.6s ease'}} />
        {sublabel && pct > 20 && (
          <div style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:600,pointerEvents:'none'}}>{sublabel}</div>
        )}
      </div>
      <div style={{width:50,fontSize:12,fontWeight:700,color:'var(--c-text)',textAlign:'right',flexShrink:0}}>{value}{suffix}</div>
    </div>
  )
}

// Donut chart
function Donut({ slices, size=120 }) {
  const total = slices.reduce((a,s)=>a+s.value,0)
  if (total===0) return <p style={{color:'var(--c-muted)',fontSize:13}}>No data yet</p>
  let cum = -Math.PI/2
  const cx=size/2,cy=size/2,r=size*0.38,inner=size*0.22
  const paths = slices.map(s=>{
    const angle=(s.value/total)*2*Math.PI
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum)
    cum+=angle
    const x2=cx+r*Math.cos(cum),y2=cy+r*Math.sin(cum)
    const xi1=cx+inner*Math.cos(cum-angle),yi1=cy+inner*Math.sin(cum-angle)
    const xi2=cx+inner*Math.cos(cum),yi2=cy+inner*Math.sin(cum)
    const large=angle>Math.PI?1:0
    return {...s,d:`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`,pct:Math.round(s.value/total*100)}
  })
  return (
    <div style={{display:'flex',alignItems:'center',gap:16}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p,i)=><path key={i} d={p.d} fill={p.color} opacity={0.9}/>)}
        <circle cx={cx} cy={cy} r={inner-2} fill="var(--c-surface)"/>
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
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

// Column histogram
function ColChart({ data, color='var(--c-accent)' }) {
  const maxV = Math.max(...data.map(d=>d.value),1)
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-end',gap:4,height:80,marginBottom:4}}>
        {data.map((d,i)=>{
          const h = Math.max((d.value/maxV)*76, d.value>0?4:0)
          return (
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div style={{fontSize:10,color:'var(--c-muted)',fontWeight:600}}>{d.value||''}</div>
              <div style={{width:'100%',height:h,background:color,borderRadius:'3px 3px 0 0',minHeight:d.value>0?4:0}}/>
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',gap:4}}>
        {data.map((d,i)=>(
          <div key={i} style={{flex:1,textAlign:'center',fontSize:9,color:'var(--c-muted)',overflow:'hidden',textOverflow:'ellipsis'}}>{d.label}</div>
        ))}
      </div>
    </div>
  )
}

// Simple line chart SVG
function LineChart({ points, color='var(--c-accent)', height=60, width=300 }) {
  if (!points || points.length < 2) return <p style={{color:'var(--c-muted)',fontSize:12}}>Not enough data</p>
  const vals = points.map(p=>p.value)
  const min = Math.min(...vals), max = Math.max(...vals,1)
  const range = max-min||1
  const pts = points.map((p,i)=>{
    const x = (i/(points.length-1))*width
    const y = height - ((p.value-min)/range)*(height-8)-4
    return [x,y]
  })
  const path = pts.map((p,i)=>(i===0?`M`:`L`)+` ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{overflow:'visible'}}>
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {pts.map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="3" fill={color}/>
        ))}
      </svg>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
        {points.filter((_,i)=>i===0||i===points.length-1||i===Math.floor(points.length/2)).map((p,i)=>(
          <div key={i} style={{fontSize:9,color:'var(--c-muted)'}}>{p.label}</div>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color='var(--c-text)' }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{color, fontSize: String(value).length > 5 ? 24 : 36}}>{value}</div>
      {sub && <div style={{fontSize:11,color:'var(--c-muted)',marginTop:2}}>{sub}</div>}
    </div>
  )
}

export default function Stats() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tournament')
  const [players, setPlayers] = useState([])
  const [scores, setScores] = useState([])
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState([])

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data:pl }, { data:sc }, { data:ma }, { data:pr }] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code','DEFAULT').order('created_at').limit(500),
      supabase.from('scores').select('*').limit(5000),
      supabase.from('matches').select('*').order('match_number').limit(200),
      supabase.from('predictions').select('player_id,match_id,home_goals,away_goals').limit(5000),
    ])
    setPlayers(pl||[])
    setScores(sc||[])
    setMatches(ma||[])
    setPredictions(pr||[])
    setLoading(false)
  }

  const finished = useMemo(() => matches.filter(m=>m.status==='FINISHED'&&m.home_goals!=null), [matches])

  // Player stats
  const playerStats = useMemo(() => {
    return players.map((p,idx) => {
      const ps = scores.filter(s=>s.player_id===p.id)
      const pp = predictions.filter(pr=>pr.player_id===p.id&&pr.home_goals!=null)
      const scored = ps.length
      const total   = ps.reduce((a,s)=>a+(s.pts_total||0),0)
      const correct = ps.filter(s=>s.pts_result>0||s.pts_exact>0).length
      const diff    = ps.filter(s=>s.pts_diff>0).length
      const exact   = ps.filter(s=>s.pts_exact>0).length
      const approx  = ps.filter(s=>s.pts_approx>0).length
      const pctCorr  = scored>0?Math.round(correct/scored*100):0
      const pctDiff  = scored>0?Math.round(diff/scored*100):0
      const pctExact = scored>0?Math.round(exact/scored*100):0
      return { id:p.id, name:p.name, color:AVATAR_COLORS[idx%AVATAR_COLORS.length],
        total, correct, diff, exact, approx, preds:pp.length, scored,
        pctCorr, pctDiff, pctExact }
    })
  }, [players, scores, predictions])

  const sorted = [...playerStats].sort((a,b)=>b.total-a.total)
  const maxPts = sorted[0]?.total||1

  // Tournament stats
  const totalGoals = finished.reduce((a,m)=>a+m.home_goals+m.away_goals,0)
  const avgGoals   = finished.length>0 ? (totalGoals/finished.length).toFixed(2) : '0.00'
  const scoreless  = finished.filter(m=>m.home_goals===0&&m.away_goals===0).length
  const highScoring= finished.filter(m=>m.home_goals+m.away_goals>=4).length

  // Goals by group
  const groupGoals = {}
  const groupCounts= {}
  finished.forEach(m=>{
    const g = GROUP_NAMES[m.phase]
    if (!g) return
    groupGoals[g]  = (groupGoals[g]||0)+m.home_goals+m.away_goals
    groupCounts[g] = (groupCounts[g]||0)+1
  })

  // Goals per match histogram
  const goalsHist = Array.from({length:9},(_,i)=>({
    label: i===8?'8+':String(i),
    value: finished.filter(m=>{const t=m.home_goals+m.away_goals; return i===8?t>=8:t===i}).length
  }))

  // Goals by team
  const teamGoals = {}
  finished.forEach(m=>{
    teamGoals[m.home_team]=(teamGoals[m.home_team]||0)+m.home_goals
    teamGoals[m.away_team]=(teamGoals[m.away_team]||0)+m.away_goals
  })
  const topTeams = Object.entries(teamGoals).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value).slice(0,10)

  // Accuracy over time (by match played order)
  const accuracyOverTime = useMemo(() => {
    const pts = []
    for (let i=1; i<=Math.min(finished.length,20); i++) {
      const matchIds = new Set(finished.slice(0,i).map(m=>m.id))
      const relevant = scores.filter(s=>matchIds.has(s.match_id))
      const correct = relevant.filter(s=>s.pts_result>0||s.pts_exact>0).length
      const pct = relevant.length>0?Math.round(correct/relevant.length*100):0
      pts.push({label:`M${i}`,value:pct})
    }
    return pts
  }, [finished, scores])

  // Points over time per player (top 3)
  const ptsOverTime = useMemo(() => {
    const top3 = sorted.slice(0,3)
    return top3.map(pl=>{
      const pts = []
      let running = 0
      for (let i=0; i<Math.min(finished.length,20); i++) {
        const s = scores.find(s=>s.player_id===pl.id&&s.match_id===finished[i]?.id)
        running += s?.pts_total||0
        pts.push({label:`M${i+1}`,value:running})
      }
      return {name:pl.name,color:pl.color,points:pts}
    })
  }, [sorted, finished, scores])

  const poolTotalPreds = predictions.filter(p=>p.home_goals!=null).length
  const poolCorrect    = scores.filter(s=>s.pts_result>0||s.pts_exact>0).length
  const poolAccuracy   = scores.length>0?Math.round(poolCorrect/scores.length*100):0
  const poolExactRate  = scores.length>0?Math.round(scores.filter(s=>s.pts_exact>0).length/scores.length*100):0

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-header-inner"><h1>Stats</h1></div></div>
      <div className="page-body"><p style={{color:'var(--c-muted)'}}>Loading...</p></div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Stats &amp; Insights</h1>
          <p>{finished.length} matches played · {totalGoals} goals scored · {players.length} players</p>
        </div>
      </div>
      <div className="page-body">

        <div className="tabs">
          <button className={`tab${tab==='tournament'?' active':''}`} onClick={()=>setTab('tournament')}>Tournament</button>
          <button className={`tab${tab==='players'?' active':''}`} onClick={()=>setTab('players')}>Players</button>
          <button className={`tab${tab==='charts'?' active':''}`} onClick={()=>setTab('charts')}>Charts</button>
          <button className={`tab${tab==='funfacts'?' active':''}`} onClick={()=>setTab('funfacts')}>Fun Facts</button>
        </div>

        {/* ── TOURNAMENT ── */}
        {tab==='tournament' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div className="metrics">
              <MetricCard label="Matches played"   value={finished.length} sub={`of ${matches.length} total`} />
              <MetricCard label="Total goals"       value={totalGoals} color="var(--c-accent)" />
              <MetricCard label="Avg goals/match"   value={avgGoals} sub={finished.length>0?'':'No results yet'} />
              <MetricCard label="High-scoring (4+)" value={highScoring} />
              <MetricCard label="Scoreless (0-0)"   value={scoreless} />
              <MetricCard label="Pool accuracy"     value={`${poolAccuracy}%`} color="var(--c-success)" />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.25rem'}}>
              <div className="card" style={{marginBottom:0}}>
                <div className="card-title">Goals per match</div>
                {finished.length===0?<p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>:<ColChart data={goalsHist} color="var(--c-accent)"/>}
                <p style={{fontSize:11,color:'var(--c-muted)',marginTop:8}}>Number of total goals in each match</p>
              </div>

              <div className="card" style={{marginBottom:0}}>
                <div className="card-title">Goals by group</div>
                {Object.keys(groupGoals).length===0?<p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>:(
                  <div>
                    {Object.entries(groupGoals).sort((a,b)=>b[1]-a[1]).map(([g,v])=>(
                      <HBar key={g} label={`Group ${g}`} value={v} max={Math.max(...Object.values(groupGoals))} color="var(--c-accent2)"
                        suffix=" gls" sublabel={groupCounts[g]?`${(v/groupCounts[g]).toFixed(1)}/match`:''} />
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{marginBottom:0}}>
                <div className="card-title">Top scoring teams</div>
                {topTeams.length===0?<p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>:(
                  topTeams.map((t,i)=>(
                    <HBar key={t.label} label={t.label} value={t.value} max={topTeams[0].value}
                      color={i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':'var(--c-accent)'}/>
                  ))
                )}
              </div>

              <div className="card" style={{marginBottom:0}}>
                <div className="card-title">Match outcomes</div>
                {finished.length===0?<p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>:(() => {
                  const homeWins=finished.filter(m=>m.home_goals>m.away_goals).length
                  const awayWins=finished.filter(m=>m.home_goals<m.away_goals).length
                  const draws=finished.filter(m=>m.home_goals===m.away_goals).length
                  return <Donut slices={[
                    {label:'Home win',value:homeWins,color:'var(--c-accent)'},
                    {label:'Away win',value:awayWins,color:'var(--c-info)'},
                    {label:'Draw',   value:draws,    color:'var(--c-muted)'},
                  ]} size={130}/>
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab==='players' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div className="metrics">
              <MetricCard label="Total predictions" value={poolTotalPreds} />
              <MetricCard label="Pool accuracy"     value={`${poolAccuracy}%`} color="var(--c-success)" />
              <MetricCard label="Exact score rate"  value={`${poolExactRate}%`} color="var(--c-accent2)" />
              <MetricCard label="Players"           value={players.length} />
            </div>

            {/* Points race */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Points race</div>
              {sorted.map((p,i)=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{width:24,textAlign:'center',fontFamily:'var(--font-display)',fontSize:18,
                    color:i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':'var(--c-muted)'}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                  </div>
                  <div className="avatar" style={{width:28,height:28,fontSize:10,fontWeight:700,background:`${p.color}22`,color:p.color,flexShrink:0}}>
                    {p.name.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                      <span style={{fontSize:13,fontWeight:700,fontFamily:'var(--font-display)',marginLeft:8,flexShrink:0}}>{p.total} pts</span>
                    </div>
                    <div style={{height:8,background:'var(--c-surface2)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${maxPts>0?Math.max((p.total/maxPts)*100,p.total>0?2:0):0}%`,
                        background:i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':p.color,
                        borderRadius:4,transition:'width 0.6s ease'}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Accuracy by category */}
            {[
              {label:'% correct results', key:'pctCorr',  color:'var(--c-accent)',  suffix:'%'},
              {label:'% correct diff',    key:'pctDiff',  color:'var(--c-info)',    suffix:'%'},
              {label:'% exact scores',    key:'pctExact', color:'var(--c-accent2)', suffix:'%'},
            ].map(metric=>(
              <div key={metric.key} className="card" style={{marginBottom:0}}>
                <div className="card-title">{metric.label}</div>
                {[...playerStats].sort((a,b)=>b[metric.key]-a[metric.key]).map(p=>(
                  <HBar key={p.id} label={p.name} value={p[metric.key]} max={100} color={metric.color} suffix={metric.suffix} />
                ))}
              </div>
            ))}

            {/* Raw counts table */}
            <div className="card" style={{marginBottom:0,padding:0,overflow:'hidden'}}>
              <div style={{padding:'1.25rem 1.5rem 0.5rem'}}>
                <div className="card-title" style={{marginBottom:0}}>Full breakdown</div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th style={{textAlign:'right'}}>Pts</th>
                      <th style={{textAlign:'right'}}>Correct</th>
                      <th style={{textAlign:'right'}}>% correct</th>
                      <th style={{textAlign:'right'}}>Diff</th>
                      <th style={{textAlign:'right'}}>% diff</th>
                      <th style={{textAlign:'right'}}>Exact</th>
                      <th style={{textAlign:'right'}}>% exact</th>
                      <th style={{textAlign:'right'}}>Approx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p,i)=>(
                      <tr key={p.id}>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:14}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':''}</span>
                            <div className="avatar" style={{width:26,height:26,fontSize:9,background:`${p.color}22`,color:p.color}}>{p.name.slice(0,2).toUpperCase()}</div>
                            <span style={{fontSize:13,fontWeight:500}}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{textAlign:'right',fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-accent)'}}>{p.total}</td>
                        <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.correct}</td>
                        <td style={{textAlign:'right'}}>
                          <span style={{fontSize:12,fontWeight:700,padding:'2px 7px',borderRadius:20,
                            background:p.pctCorr>=60?'rgba(34,197,94,0.1)':p.pctCorr>=40?'rgba(240,165,0,0.1)':'rgba(239,68,68,0.1)',
                            color:p.pctCorr>=60?'var(--c-success)':p.pctCorr>=40?'var(--c-accent2)':'var(--c-danger)'}}>
                            {p.pctCorr}%
                          </span>
                        </td>
                        <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.diff}</td>
                        <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:12}}>{p.pctDiff}%</td>
                        <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.exact}</td>
                        <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:12}}>{p.pctExact}%</td>
                        <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.approx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CHARTS ── */}
        {tab==='charts' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.25rem'}}>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Pool accuracy over time</div>
              <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:12}}>% correct predictions across all players as matches were played</p>
              {accuracyOverTime.length<2?<p style={{color:'var(--c-muted)',fontSize:13}}>Need more matches</p>:<LineChart points={accuracyOverTime} color="var(--c-success)"/>}
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Points race over time</div>
              <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:12}}>Cumulative points for top 3 players</p>
              {ptsOverTime.length===0||ptsOverTime[0]?.points.length<2?<p style={{color:'var(--c-muted)',fontSize:13}}>Need more matches</p>:(
                <div>
                  {ptsOverTime.map(pl=>(
                    <div key={pl.name} style={{marginBottom:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <div style={{width:10,height:3,background:pl.color,borderRadius:2}}/>
                        <span style={{fontSize:12,color:'var(--c-muted)'}}>{pl.name}</span>
                      </div>
                      <LineChart points={pl.points} color={pl.color} height={50}/>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">How points are earned (pool total)</div>
              {scores.length===0?<p style={{color:'var(--c-muted)',fontSize:13}}>No scores yet</p>:(() => {
                const totResult=scores.reduce((a,s)=>a+(s.pts_result||0),0)
                const totDiff  =scores.reduce((a,s)=>a+(s.pts_diff||0),0)
                const totExact =scores.reduce((a,s)=>a+(s.pts_exact||0),0)
                const totApprox=scores.reduce((a,s)=>a+(s.pts_approx||0),0)
                const totKO    =scores.reduce((a,s)=>a+(s.pts_ko_team||0),0)
                return <Donut slices={[
                  {label:'Correct result',value:totResult,color:'var(--c-accent)'},
                  {label:'Goal difference',value:totDiff,  color:'var(--c-info)'},
                  {label:'Exact score',   value:totExact,  color:'var(--c-accent2)'},
                  {label:'Approx bonus',  value:totApprox, color:'var(--c-success)'},
                  {label:'KO team',       value:totKO,     color:'#a855f7'},
                ].filter(s=>s.value>0)} size={140}/>
              })()}
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Exact score specialists</div>
              {[...playerStats].sort((a,b)=>b.exact-a.exact).map(p=>(
                <HBar key={p.id} label={p.name} value={p.exact} max={Math.max(...playerStats.map(x=>x.exact),1)} color="var(--c-accent2)"/>
              ))}
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Most correct results (W/D/L)</div>
              <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:12}}>
                Correct result (W/D/L) is easier to get than an exact score — this is always higher than exact count since every exact score also counts as a correct result.
              </p>
              {[...playerStats].sort((a,b)=>b.correct-a.correct).map(p=>(
                <HBar key={p.id} label={p.name} value={p.correct} max={Math.max(...playerStats.map(x=>x.correct),1)} color="var(--c-accent)"/>
              ))}
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">% correct by player</div>
              {[...playerStats].sort((a,b)=>b.pctCorr-a.pctCorr).map(p=>(
                <HBar key={p.id} label={p.name} value={p.pctCorr} max={100} color="var(--c-success)" suffix="%"/>
              ))}
            </div>

          </div>
        )}

        {/* ── FUN FACTS ── */}
        {tab==='funfacts' && (() => {
          const leader  = sorted[0], second = sorted[1], last = sorted[sorted.length-1]
          const mostExact = [...playerStats].sort((a,b)=>b.exact-a.exact)[0]
          const mostCorr  = [...playerStats].sort((a,b)=>b.correct-a.correct)[0]
          const gap = leader&&second?leader.total-second.total:0
          const avgPts = playerStats.length?Math.round(playerStats.reduce((a,p)=>a+p.total,0)/playerStats.length):0
          const facts = [
            leader?.total>0&&{icon:'👑',text:gap>5?`${leader.name} is running away with it — ${gap} pts clear of ${second?.name||'second'}`
              :gap===0&&second?`${leader.name} and ${second.name} are level at the top!`
              :`${leader.name} leads with ${leader.total} pts, just ${gap} ahead`},
            last&&last.id!==leader?.id&&leader?.total>0&&{icon:'📉',text:`${last.name} is last — ${leader.total-last.total} pts off the pace. Prayers needed.`},
            mostExact?.exact>=3&&{icon:'💎',text:`${mostExact.name} is a psychic — ${mostExact.exact} exact scores.`},
            mostExact?.exact===1&&{icon:'💎',text:`${mostExact.name} has exactly one exact score. Cherish it.`},
            mostCorr?.correct>0&&{icon:'🎯',text:`${mostCorr.name} picks winners best — ${mostCorr.correct} correct results`},
            avgPts>0&&{icon:'📊',text:`Pool average is ${avgPts} pts. Above that? You're winning the vibe.`},
            (() => {
              const totCorrect = playerStats.reduce((a,p)=>a+p.correct,0)
              const totExact   = playerStats.reduce((a,p)=>a+p.exact,0)
              const ratio = totCorrect>0?Math.round(totCorrect/Math.max(totExact,1)):0
              return totExact>0&&{icon:'📐',text:`For every exact score there are ~${ratio} correct results — W/L is easier to guess than the exact scoreline`}
            })(),
            totalGoals>0&&{icon:'⚽',text:`${totalGoals} goals in ${finished.length} matches — ${avgGoals} per game`},
            scoreless>0&&{icon:'🥱',text:`${scoreless} match${scoreless>1?'es have':' has'} ended 0-0. Boring.`},
            highScoring>0&&{icon:'🔥',text:`${highScoring} high-scoring match${highScoring>1?'es':''} with 4+ goals`},
          ].filter(Boolean)
          return (
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Fun facts</div>
              {facts.length===0?<p style={{color:'var(--c-muted)',fontSize:13}}>Seed demo data or play some matches to unlock facts.</p>
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
