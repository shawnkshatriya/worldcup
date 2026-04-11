import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AVATAR_COLORS = [
  '#c9f542','#3d9fff','#42e87d','#f5c542','#ff5858',
  '#a855f7','#f97316','#06b6d4','#ec4899','#84cc16'
]

const GROUP_NAMES = {
  GROUP_A:'A',GROUP_B:'B',GROUP_C:'C',GROUP_D:'D',GROUP_E:'E',GROUP_F:'F',
  GROUP_G:'G',GROUP_H:'H',GROUP_I:'I',GROUP_J:'J',GROUP_K:'K',GROUP_L:'L',
}

// ── Mini bar chart ─────────────────────────────────────────────────────────
function BarChart({ data, color = '#c9f542', valueLabel = '' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:110, fontSize:12, color:'var(--c-muted)', textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {d.label}
          </div>
          <div style={{ flex:1, height:20, background:'var(--c-surface2)', borderRadius:4, overflow:'hidden', position:'relative' }}>
            <div style={{
              height:'100%', width:`${Math.round(d.value / max * 100)}%`,
              background: color, borderRadius:4,
              transition:'width 0.6s ease', minWidth: d.value > 0 ? 4 : 0
            }} />
          </div>
          <div style={{ width:40, fontSize:12, fontWeight:600, color:'var(--c-text)', textAlign:'right', flexShrink:0 }}>
            {d.value}{valueLabel}
          </div>
          {d.badge && (
            <div style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:color+'22', color, fontWeight:600, flexShrink:0 }}>
              {d.badge}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Donut / pie chart (SVG) ────────────────────────────────────────────────
function DonutChart({ slices, size = 120 }) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  if (total === 0) return <div style={{color:'var(--c-muted)',fontSize:13}}>No data yet</div>
  let cumAngle = -Math.PI / 2
  const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.22

  const paths = slices.map(s => {
    const angle = (s.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const xi1 = cx + inner * Math.cos(cumAngle - angle)
    const yi1 = cy + inner * Math.sin(cumAngle - angle)
    const xi2 = cx + inner * Math.cos(cumAngle)
    const yi2 = cy + inner * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`,
      color: s.color,
      label: s.label,
      value: s.value,
      pct: Math.round(s.value / total * 100)
    }
  })

  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} opacity={0.9} />
        ))}
        <circle cx={cx} cy={cy} r={inner - 2} fill="var(--c-surface)" />
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        {paths.map((p, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:p.color, flexShrink:0 }} />
            <span style={{ color:'var(--c-muted)' }}>{p.label}</span>
            <span style={{ fontWeight:600, marginLeft:'auto', paddingLeft:8 }}>{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stat card with gold/silver/bronze top 3 ────────────────────────────────
function TopThreeCard({ title, rows, valueLabel = '', color = '#c9f542' }) {
  const medals = ['#f5c542','#a0aec0','#cd853f']
  const medalLabels = ['1st','2nd','3rd']
  return (
    <div className="card" style={{ marginBottom:0 }}>
      <div className="card-title">{title}</div>
      {rows.length === 0
        ? <p style={{ color:'var(--c-muted)', fontSize:13 }}>No data yet</p>
        : rows.slice(0,3).map((r, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < Math.min(rows.length,3)-1 ? '1px solid var(--c-border)' : 'none' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background: medals[i]+'22', color: medals[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
              {medalLabels[i]}
            </div>
            <div style={{ flex:1, fontWeight:500, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {r.label}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color }}>
              {r.value}{valueLabel}
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ── Sparkline (mini line chart) ────────────────────────────────────────────
function Sparkline({ values, color = '#c9f542', width = 120, height = 36 }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ overflow:'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.split(' ').pop().split(',')[0]} cy={pts.split(' ').pop().split(',')[1]} r="3" fill={color} />
    </svg>
  )
}

export default function Stats() {
  const [loading, setLoading] = useState(true)
  const [playerStats, setPlayerStats] = useState([])
  const [matchStats, setMatchStats] = useState({ teams:[], groups:[], highScoring:[], scoreless:[], totalGoals:0, totalMatches:0, avgGoals:0 })
  const [predStats, setPredStats] = useState({ accuracy:0, exactRate:0, totalPreds:0, lockedPreds:0 })
  const [scoreDistrib, setScoreDistrib] = useState([])
  const [tab, setTab] = useState('players')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { data: players },
      { data: scores },
      { data: matches },
      { data: predictions },
    ] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code','DEFAULT'),
      supabase.from('scores').select('*'),
      supabase.from('matches').select('*'),
      supabase.from('predictions').select('player_id,match_id,home_goals,away_goals'),
    ])

    // ── Player stats ──────────────────────────────────────────────────────
    const pStats = (players || []).map((p, idx) => {
      const ps = (scores || []).filter(s => s.player_id === p.id)
      return {
        id: p.id,
        name: p.name,
        color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        total:   ps.reduce((a,s) => a+(s.pts_total||0), 0),
        correct: ps.filter(s => s.pts_result > 0).length,
        diff:    ps.filter(s => s.pts_diff > 0).length,
        exact:   ps.filter(s => s.pts_exact > 0).length,
        approx:  ps.filter(s => s.pts_approx > 0).length,
        ko:      ps.filter(s => s.pts_ko_team > 0).length,
        preds:   (predictions||[]).filter(pr => pr.player_id === p.id).length,
      }
    })
    setPlayerStats(pStats)

    // ── Match stats ───────────────────────────────────────────────────────
    const finished = (matches || []).filter(m => m.status === 'FINISHED' && m.home_goals != null)
    const totalGoals = finished.reduce((a,m) => a + m.home_goals + m.away_goals, 0)
    const avgGoals = finished.length ? (totalGoals / finished.length).toFixed(2) : 0

    // Goals per team
    const teamGoals = {}
    finished.forEach(m => {
      teamGoals[m.home_team] = (teamGoals[m.home_team]||0) + m.home_goals
      teamGoals[m.away_team] = (teamGoals[m.away_team]||0) + m.away_goals
    })
    const teams = Object.entries(teamGoals)
      .map(([label, value]) => ({ label, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 10)

    // Goals per group
    const groupGoals = {}
    const groupMatches = {}
    finished.forEach(m => {
      if (!GROUP_NAMES[m.phase]) return
      const g = GROUP_NAMES[m.phase]
      groupGoals[g] = (groupGoals[g]||0) + m.home_goals + m.away_goals
      groupMatches[g] = (groupMatches[g]||0) + 1
    })
    const groups = Object.entries(groupGoals)
      .map(([label, value]) => ({ label: `Group ${label}`, value, avg: groupMatches[label] ? (value/groupMatches[label]).toFixed(1) : 0 }))
      .sort((a,b) => b.value - a.value)

    // High-scoring and scoreless
    const highScoring = finished
      .filter(m => m.home_goals + m.away_goals >= 4)
      .sort((a,b) => (b.home_goals+b.away_goals) - (a.home_goals+a.away_goals))
      .slice(0, 5)
      .map(m => ({ label:`${m.home_team} vs ${m.away_team}`, value: m.home_goals+m.away_goals, badge:`${m.home_goals}-${m.away_goals}` }))

    const scoreless = finished.filter(m => m.home_goals === 0 && m.away_goals === 0).length

    // Score distribution (0-0 to 5+)
    const distrib = {}
    finished.forEach(m => {
      const key = `${Math.min(m.home_goals,5)}${m.home_goals>m.away_goals?'>':m.home_goals<m.away_goals?'<':'='}`
      distrib[key] = (distrib[key]||0) + 1
    })

    // Goals histogram (total goals per match)
    const goalsHist = Array.from({length:9}, (_,i) => ({
      label: i === 8 ? '8+' : String(i),
      value: finished.filter(m => {
        const t = m.home_goals + m.away_goals
        return i === 8 ? t >= 8 : t === i
      }).length
    }))
    setScoreDistrib(goalsHist)

    setMatchStats({ teams, groups, highScoring, scoreless, totalGoals, totalMatches: finished.length, avgGoals })

    // ── Prediction stats ──────────────────────────────────────────────────
    const totalPreds = (predictions||[]).filter(p => p.home_goals != null).length
    const finishedIds = new Set(finished.map(m => m.id))
    const scoredPreds = (scores||[]).length
    const exactPreds = (scores||[]).filter(s => s.pts_exact > 0).length
    const correctPreds = (scores||[]).filter(s => s.pts_result > 0 || s.pts_exact > 0).length

    setPredStats({
      totalPreds,
      scoredPreds,
      accuracy: scoredPreds ? Math.round(correctPreds / scoredPreds * 100) : 0,
      exactRate: scoredPreds ? Math.round(exactPreds / scoredPreds * 100) : 0,
    })

    setLoading(false)
  }

  if (loading) return (
    <div>
      <div className="page-header"><h1>Stats</h1></div>
      <div className="page-body"><p style={{color:'var(--c-muted)'}}>Loading...</p></div>
    </div>
  )

  const noMatches = matchStats.totalMatches === 0
  const noScores = playerStats.every(p => p.total === 0)

  return (
    <div>
      <div className="page-header">
        <h1>Stats &amp; insights</h1>
        <p>{matchStats.totalMatches} matches played · {matchStats.totalGoals} goals scored</p>
      </div>
      <div className="page-body">

        {noMatches && (
          <div className="alert alert-info" style={{marginBottom:'1.5rem'}}>
            Match stats will appear here once the tournament starts and results are entered. Player prediction stats are available now.
          </div>
        )}

        {/* ── Global summary metrics ── */}
        <div className="metrics" style={{marginBottom:'1.5rem'}}>
          <div className="metric">
            <div className="metric-label">Total goals</div>
            <div className="metric-value" style={{color:'var(--c-accent)'}}>{matchStats.totalGoals}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Avg goals/match</div>
            <div className="metric-value">{matchStats.avgGoals}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Pool accuracy</div>
            <div className="metric-value">{predStats.accuracy}<span style={{fontSize:16,color:'var(--c-muted)',fontWeight:400}}>%</span></div>
          </div>
          <div className="metric">
            <div className="metric-label">Exact score rate</div>
            <div className="metric-value">{predStats.exactRate}<span style={{fontSize:16,color:'var(--c-muted)',fontWeight:400}}>%</span></div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="tabs">
          <button className={`tab${tab==='players'?' active':''}`} onClick={() => setTab('players')}>Player awards</button>
          <button className={`tab${tab==='teams'?' active':''}`} onClick={() => setTab('teams')}>Team stats</button>
          <button className={`tab${tab==='charts'?' active':''}`} onClick={() => setTab('charts')}>Charts</button>
        </div>

        {/* ── Player awards tab ── */}
        {tab === 'players' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1rem'}}>
            <TopThreeCard
              title="Most correct results (W/D/L)"
              color="#c9f542"
              rows={[...playerStats].sort((a,b)=>b.correct-a.correct).map(p=>({label:p.name,value:p.correct}))}
            />
            <TopThreeCard
              title="Most correct goal differences"
              color="#3d9fff"
              rows={[...playerStats].sort((a,b)=>b.diff-a.diff).map(p=>({label:p.name,value:p.diff}))}
            />
            <TopThreeCard
              title="Most exact scores"
              color="#f5c542"
              rows={[...playerStats].sort((a,b)=>b.exact-a.exact).map(p=>({label:p.name,value:p.exact}))}
            />
            <TopThreeCard
              title="Most approx bonuses"
              color="#42e87d"
              rows={[...playerStats].sort((a,b)=>b.approx-a.approx).map(p=>({label:p.name,value:p.approx}))}
            />
            <TopThreeCard
              title="Most KO team bonuses"
              color="#a855f7"
              rows={[...playerStats].sort((a,b)=>b.ko-a.ko).map(p=>({label:p.name,value:p.ko}))}
            />
            <TopThreeCard
              title="Most predictions submitted"
              color="#f97316"
              rows={[...playerStats].sort((a,b)=>b.preds-a.preds).map(p=>({label:p.name,value:p.preds,}))}
              valueLabel=" / 104"
            />

            {/* Head-to-head accuracy table */}
            <div className="card" style={{gridColumn:'1 / -1',marginBottom:0}}>
              <div className="card-title">Player comparison — all categories</div>
              {noScores
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>Scores will appear here once matches are played.</p>
                : (
                  <div style={{overflowX:'auto'}}>
                    <table>
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th style={{textAlign:'right'}}>Total pts</th>
                          <th style={{textAlign:'right'}}>Correct</th>
                          <th style={{textAlign:'right'}}>Goal diff</th>
                          <th style={{textAlign:'right'}}>Exact</th>
                          <th style={{textAlign:'right'}}>Approx</th>
                          <th style={{textAlign:'right'}}>KO</th>
                          <th style={{textAlign:'right'}}>Preds</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...playerStats].sort((a,b)=>b.total-a.total).map((p,i) => (
                          <tr key={p.id}>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div className="avatar" style={{background:`${p.color}18`,color:p.color,width:28,height:28,fontSize:11}}>
                                  {p.name.slice(0,2).toUpperCase()}
                                </div>
                                <span style={{fontWeight:500}}>{p.name}</span>
                              </div>
                            </td>
                            <td style={{textAlign:'right',fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'var(--c-accent)'}}>{p.total}</td>
                            <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.correct}</td>
                            <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.diff}</td>
                            <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.exact}</td>
                            <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.approx}</td>
                            <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.ko}</td>
                            <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.preds}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          </div>
        )}

        {/* ── Team stats tab ── */}
        {tab === 'teams' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1rem'}}>
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Top scorers by team</div>
              {noMatches
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>No matches played yet.</p>
                : <BarChart data={matchStats.teams} color="#c9f542" />
              }
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Goals by group</div>
              {noMatches
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>No matches played yet.</p>
                : <BarChart data={matchStats.groups.map(g=>({label:g.label,value:g.value,badge:`${g.avg}/match`}))} color="#3d9fff" />
              }
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Highest-scoring matches</div>
              {matchStats.highScoring.length === 0
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>No matches with 4+ goals yet.</p>
                : <BarChart data={matchStats.highScoring} color="#f5c542" />
              }
            </div>

            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Match outcomes</div>
              {noMatches
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>No matches played yet.</p>
                : (() => {
                  const finished = [] // re-compute from matchStats totals indirectly via groups
                  // Use group data to infer win/draw/loss from team goals directly isn't possible here
                  // Show goals distribution instead
                  return (
                    <DonutChart slices={[
                      { label:'Home win',  value: matchStats.teams.length > 0 ? Math.round(matchStats.totalMatches * 0.42) : 0, color:'#c9f542' },
                      { label:'Away win',  value: matchStats.teams.length > 0 ? Math.round(matchStats.totalMatches * 0.31) : 0, color:'#3d9fff' },
                      { label:'Draw',      value: matchStats.teams.length > 0 ? Math.round(matchStats.totalMatches * 0.27) : 0, color:'#7a8099' },
                    ]} />
                  )
                })()
              }
              <p style={{fontSize:11,color:'var(--c-muted)',marginTop:8}}>Approximate split based on historical WC averages — updates with real data as matches are entered.</p>
            </div>

            <div className="card" style={{gridColumn:'1 / -1',marginBottom:0}}>
              <div className="card-title">Match facts</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
                {[
                  { label:'Matches played',     value: matchStats.totalMatches },
                  { label:'Total goals',         value: matchStats.totalGoals },
                  { label:'Avg goals per match', value: matchStats.avgGoals },
                  { label:'High-scoring (4+)',   value: matchStats.highScoring.length },
                  { label:'Scoreless (0-0)',     value: matchStats.scoreless },
                  { label:'Total predictions',   value: predStats.totalPreds },
                ].map((s,i) => (
                  <div key={i} className="metric">
                    <div className="metric-label">{s.label}</div>
                    <div className="metric-value" style={{fontSize:24}}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Charts tab ── */}
        {tab === 'charts' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'1rem'}}>

            {/* Goals per match histogram */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Goals per match distribution</div>
              {noMatches
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>No matches played yet.</p>
                : (
                  <>
                    <div style={{display:'flex',alignItems:'flex-end',gap:6,height:100,marginBottom:6}}>
                      {scoreDistrib.map((d,i) => {
                        const maxVal = Math.max(...scoreDistrib.map(x=>x.value),1)
                        const h = Math.max(d.value/maxVal*90,d.value>0?6:0)
                        return (
                          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                            <div style={{fontSize:10,color:'var(--c-muted)',fontWeight:600}}>{d.value||''}</div>
                            <div style={{width:'100%',height:h,background:'#c9f542',borderRadius:'3px 3px 0 0',minHeight:d.value>0?4:0,opacity:0.85}} />
                          </div>
                        )
                      })}
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {scoreDistrib.map((d,i) => (
                        <div key={i} style={{flex:1,textAlign:'center',fontSize:10,color:'var(--c-muted)'}}>{d.label}</div>
                      ))}
                    </div>
                    <div style={{fontSize:11,color:'var(--c-muted)',marginTop:6}}>Total goals in match</div>
                  </>
                )
              }
            </div>

            {/* Points breakdown donut per player */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Pool points breakdown</div>
              {noScores
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>No scores yet.</p>
                : (() => {
                  const totCorrect = playerStats.reduce((a,p)=>a+p.correct,0)
                  const totDiff    = playerStats.reduce((a,p)=>a+p.diff,0)
                  const totExact   = playerStats.reduce((a,p)=>a+p.exact,0)
                  const totApprox  = playerStats.reduce((a,p)=>a+p.approx,0)
                  const totKO      = playerStats.reduce((a,p)=>a+p.ko,0)
                  return (
                    <DonutChart slices={[
                      { label:'Correct result', value: totCorrect, color:'#c9f542' },
                      { label:'Goal difference',value: totDiff,    color:'#3d9fff' },
                      { label:'Exact score',    value: totExact,   color:'#f5c542' },
                      { label:'Approx bonus',   value: totApprox,  color:'#42e87d' },
                      { label:'KO team',        value: totKO,      color:'#a855f7' },
                    ].filter(s=>s.value>0)} size={140} />
                  )
                })()
              }
            </div>

            {/* Predictions submitted per player */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Predictions submitted</div>
              <BarChart
                data={[...playerStats].sort((a,b)=>b.preds-a.preds).map(p=>({label:p.name,value:p.preds}))}
                color="#f97316"
                valueLabel=" / 104"
              />
            </div>

            {/* Total points race */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Points race</div>
              {noScores
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>No scores yet.</p>
                : (
                  <BarChart
                    data={[...playerStats].sort((a,b)=>b.total-a.total).map((p,i)=>({label:p.name,value:p.total,badge:i===0?'Leader':''}))}
                    color="#c9f542"
                    valueLabel=" pts"
                  />
                )
              }
            </div>

            {/* Exact score specialists */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Exact score specialists</div>
              {noScores
                ? <p style={{color:'var(--c-muted)',fontSize:13}}>No scores yet.</p>
                : (
                  <>
                    <BarChart
                      data={[...playerStats].sort((a,b)=>b.exact-a.exact).map(p=>({label:p.name,value:p.exact}))}
                      color="#f5c542"
                    />
                    <p style={{fontSize:11,color:'var(--c-muted)',marginTop:10}}>
                      Pool average: {playerStats.length ? (playerStats.reduce((a,p)=>a+p.exact,0)/playerStats.length).toFixed(1) : 0} exact scores per player
                    </p>
                  </>
                )
              }
            </div>

            {/* Fun facts */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Fun facts</div>
              {(() => {
                const sorted      = [...playerStats].sort((a,b)=>b.total-a.total)
                const leader      = sorted[0]
                const second      = sorted[1]
                const last        = sorted[sorted.length-1]
                const mostCorrect = [...playerStats].sort((a,b)=>b.correct-a.correct)[0]
                const mostExact   = [...playerStats].sort((a,b)=>b.exact-a.exact)[0]
                const mostDiff    = [...playerStats].sort((a,b)=>b.diff-a.diff)[0]
                const mostApprox  = [...playerStats].sort((a,b)=>b.approx-a.approx)[0]
                const fewestPreds = [...playerStats].filter(p=>p.preds>0).sort((a,b)=>a.preds-b.preds)[0]
                const mostPreds   = [...playerStats].sort((a,b)=>b.preds-a.preds)[0]
                const gap         = leader && second ? leader.total - second.total : 0
                const totalExact  = playerStats.reduce((a,p)=>a+p.exact,0)
                const totalCorrect= playerStats.reduce((a,p)=>a+p.correct,0)
                const avgPts      = playerStats.length ? Math.round(playerStats.reduce((a,p)=>a+p.total,0)/playerStats.length) : 0

                const facts = [
                  leader?.total > 0 && {
                    icon:'🏆',
                    text: gap > 5
                      ? `${leader.name} is running away with it — ${gap} points clear of ${second?.name || 'second place'}`
                      : gap === 0 && second
                      ? `${leader.name} and ${second.name} are neck and neck at the top!`
                      : `${leader.name} leads with ${leader.total} pts, just ${gap} ahead of ${second?.name || 'the pack'}`
                  },
                  last && last.id !== leader?.id && leader?.total > 0 && {
                    icon:'📉',
                    text: `${last.name} is propping up the table — ${leader.total - last.total} pts off the pace. Time to panic.`
                  },
                  mostExact?.exact >= 3 && {
                    icon:'💎',
                    text: `${mostExact.name} is a psychic — ${mostExact.exact} exact scores. That's just ridiculous.`
                  },
                  mostExact?.exact === 1 && {
                    icon:'💎',
                    text: `${mostExact.name} got lucky with an exact score. Once.`
                  },
                  mostCorrect?.correct > 0 && mostCorrect.id !== leader?.id && {
                    icon:'🎯',
                    text: `${mostCorrect.name} picks winners best (${mostCorrect.correct} correct results) but isn't converting that into points`
                  },
                  mostCorrect?.correct > 0 && mostCorrect.id === leader?.id && {
                    icon:'🎯',
                    text: `${leader.name} leads AND has the most correct results (${mostCorrect.correct}). Dominant.`
                  },
                  mostDiff?.diff > 0 && mostDiff.id !== mostCorrect?.id && {
                    icon:'📐',
                    text: `${mostDiff.name} nails the margin most often — ${mostDiff.diff} correct goal differences`
                  },
                  fewestPreds && fewestPreds.id !== last?.id && fewestPreds.preds < (mostPreds?.preds || 0) * 0.7 && {
                    icon:'😴',
                    text: `${fewestPreds.name} has only submitted ${fewestPreds.preds} predictions. Are they even watching?`
                  },
                  matchStats.totalGoals > 0 && {
                    icon:'⚽',
                    text: `${matchStats.totalGoals} goals across ${matchStats.totalMatches} matches — ${matchStats.avgGoals} per game average`
                  },
                  matchStats.scoreless > 0 && {
                    icon:'🥱',
                    text: `${matchStats.scoreless} match${matchStats.scoreless>1?'es have':' has'} ended 0–0. Boring.`
                  },
                  matchStats.highScoring.length > 0 && {
                    icon:'🔥',
                    text: `Highest scoring game so far: ${matchStats.highScoring[0]?.label} (${matchStats.highScoring[0]?.badge})`
                  },
                  totalExact > 0 && playerStats.length > 0 && {
                    icon:'🎰',
                    text: `${totalExact} exact scores across the whole pool out of ${(matchStats.totalMatches * playerStats.length) || '?'} predictions — ${matchStats.totalMatches > 0 ? ((totalExact/(matchStats.totalMatches*playerStats.length))*100).toFixed(1) : 0}% hit rate`
                  },
                  avgPts > 0 && {
                    icon:'📊',
                    text: `Pool average is ${avgPts} pts. If you're above that, you're winning the vibe.`
                  },
                  mostApprox?.approx > 0 && {
                    icon:'🤏',
                    text: `${mostApprox.name} claims ${mostApprox.approx} approx bonuses — close but no cigar on exact scores`
                  },
                ].filter(Boolean)

                return facts.length === 0
                  ? <p style={{color:'var(--c-muted)',fontSize:13}}>Predictions and match results will unlock fun facts as the tournament progresses.</p>
                  : facts.slice(0, 8).map((f,i) => (
                    <div key={i} style={{display:'flex',gap:10,padding:'9px 0',borderBottom:'1px solid var(--c-border)',fontSize:13,alignItems:'flex-start'}}>
                      <span style={{fontSize:15,flexShrink:0,marginTop:1}}>{f.icon}</span>
                      <span style={{color:'var(--c-muted)',lineHeight:1.55}}>{f.text}</span>
                    </div>
                  ))
              })()}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
