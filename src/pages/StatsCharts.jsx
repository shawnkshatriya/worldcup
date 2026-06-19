import { useEffect, useState, useMemo } from 'react'

export function HBar({ label, value, max, color='var(--c-accent)', suffix='', note='' }) {
  const pct = max > 0 ? Math.max((value/max)*100, value>0?2:0) : 0
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
      <div style={{width:100,fontSize:12,color:'var(--c-muted)',textAlign:'right',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
      <div style={{flex:1,height:20,background:'var(--c-surface2)',borderRadius:4,overflow:'hidden',position:'relative',minWidth:0}}>
        <div style={{height:'100%',width:pct+'%',background:color,borderRadius:4,transition:'width 0.6s'}}/>
      </div>
      <div style={{width:48,fontSize:12,fontWeight:700,color:'var(--c-text)',textAlign:'right',flexShrink:0}}>{value}{suffix}</div>
      {note && <div style={{width:40,fontSize:11,color:'var(--c-muted)',flexShrink:0,textAlign:'right'}}>{note}</div>}
    </div>
  )
}

export function Donut({ slices, size=130 }) {
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
    const d = ['M',x1,y1,'A',r,r,0,large,1,x2,y2,'L',xi2,yi2,'A',inner,inner,0,large,0,xi1,yi1,'Z'].join(' ')
    return {...s, d, pct:Math.round(s.value/total*100)}
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
export function ColChart({ data, color='var(--c-accent)', height=100 }) {
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
export function LineChart({ series, height=80, showLast=true, isPercent=false, invertY=false }) {
  // series: [{label, color, points:[{x,y,label}]}]
  if (!series?.length || !series[0]?.points?.length) return <p style={{color:'var(--c-muted)',fontSize:12}}>Not enough data</p>
  const W=300, H=height, pad=8
  const allVals = series.flatMap(s=>s.points.map(p=>p.y))
  const minV=Math.min(...allVals,0), maxV=Math.max(...allVals,1)
  const range=maxV-minV||1
  const nPts = series[0].points.length

  function toX(i) { return pad + (i/(nPts-1))*(W-pad*2) }
  function toY(v) {
    var frac = (v-minV)/range
    if (invertY) frac = 1 - frac // rank 1 at top
    return H - pad - frac*(H-pad*2)
  }

  return (
    <div style={{width:'100%',overflowX:'auto',paddingRight:32}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H+20}`} style={{overflow:'visible',display:'block'}}>
        {/* Y axis gridlines + labels - adapt to data (percent vs raw points) */}
        {(function(){
          var isPct = isPercent
          var ticks
          if (invertY) {
            // Rank axis: show integer ranks (1 at top). Pick a few evenly.
            var lo = Math.max(1, Math.floor(minV)), hi = Math.ceil(maxV)
            ticks = [lo, Math.round((lo+hi)/2), hi]
          } else {
            ticks = isPct ? [0,25,50,75,100] : [0, 0.25, 0.5, 0.75, 1].map(function(f){ return Math.round((minV + f*range)/5)*5 })
          }
          // de-dupe and keep ascending
          ticks = Array.from(new Set(ticks)).sort(function(a,b){return a-b})
          return ticks.map(function(v){
            var yp = toY(v)
            return (
              <g key={v}>
                <line x1={pad} y1={yp} x2={W-pad} y2={yp} stroke="var(--c-border)" strokeWidth="0.5" strokeDasharray="3,3"/>
                <text x={pad-2} y={yp+3} textAnchor="end" style={{fontSize:8,fill:'var(--c-hint)',fontFamily:'var(--font-body)'}}>{invertY?'#'+v:v}{isPct?'%':''}</text>
              </g>
            )
          })
        })()}

        {series.map((s,si)=>{
          const pts = s.points
          const pathD = pts.map((p,i)=>[(i===0?'M':'L'), toX(i).toFixed(1), toY(p.y).toFixed(1)].join(' ')).join(' ')
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


export function FunFacts({ sorted, playerStats, leader, totalGoals, finished, avgGoals, topScorer, predictions }) {
  const second = sorted[1]
  const last = sorted[sorted.length - 1]
  const mostExact = [...playerStats].sort((a, b) => b.exact - a.exact)[0]
  const mostCorr = [...playerStats].sort((a, b) => b.correct - a.correct)[0]
  const gap = leader && second ? leader.total - second.total : 0
  const totalPts = playerStats.reduce((a, p) => a + p.total, 0)
  const avgPts = playerStats.length ? Math.round(totalPts / playerStats.length) : 0

  const facts = [
    leader && leader.total > 0 && { icon: '👑', text: gap > 5 ? leader.name + ' is running away - ' + gap + ' pts clear of ' + (second ? second.name : 'second') : gap === 0 && second ? leader.name + ' and ' + second.name + ' are level at the top!' : leader.name + ' leads with ' + leader.total + ' pts, ' + gap + ' ahead' },
    last && last.id !== leader?.id && leader && leader.total > 0 && { icon: '📉', text: last.name + ' is last - ' + (leader.total - last.total) + ' pts off the pace.' },
    mostExact && mostExact.exact >= 3 && { icon: '💎', text: mostExact.name + ' is a psychic - ' + mostExact.exact + ' exact scores.' },
    mostCorr && mostCorr.correct > 0 && { icon: '🎯', text: mostCorr.name + ' picks winners best - ' + mostCorr.correct + ' correct results' },
    avgPts > 0 && { icon: '📊', text: 'Pool average is ' + avgPts + ' pts.' },
    totalGoals > 0 && { icon: '⚽', text: totalGoals + ' goals in ' + finished.length + ' matches - ' + avgGoals + ' per game' },
    topScorer && { icon: '🔥', text: topScorer.name + ' leads with ' + topScorer.goals + ' goals' },
  ].filter(Boolean)

  // Most predicted scorelines
  var predCounts = {}
  if (predictions) {
    predictions.forEach(function(p) {
      if (p.home_goals != null) { var k = p.home_goals + '-' + p.away_goals; predCounts[k] = (predCounts[k]||0) + 1 }
    })
  }
  var topPreds = Object.entries(predCounts).sort(function(a,b){return b[1]-a[1]}).slice(0,5)
  if (topPreds.length > 0) {
    facts.push({ icon: '📋', text: 'Most predicted score: ' + topPreds[0][0] + ' (' + topPreds[0][1] + ' times)' })
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Fun facts</div>
        {!facts.length
          ? <p style={{color:'var(--c-muted)',fontSize:13}}>No data yet - check back once matches are played.</p>
          : facts.map((fact, i) => (
            <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid var(--c-border)',fontSize:13,alignItems:'flex-start'}}>
              <span style={{fontSize:18,flexShrink:0}}>{fact.icon}</span>
              <span style={{color:'var(--c-muted)',lineHeight:1.6}}>{fact.text}</span>
            </div>
          ))
        }
      </div>

      {topPreds.length > 0 && (
        <div className="card" style={{marginBottom:0}}>
          <div className="card-title">Most predicted scorelines</div>
          {topPreds.map(function(entry) {
            return (
              <div key={entry[0]} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
                <span style={{fontFamily:'var(--font-display)',fontSize:18}}>{entry[0]}</span>
                <span style={{color:'var(--c-muted)'}}>{entry[1]} times</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function StatPct({v}) {
  const bg = v >= 60 ? 'rgba(34,197,94,0.1)' : v >= 40 ? 'rgba(240,165,0,0.1)' : 'rgba(239,68,68,0.1)'
  const col = v >= 60 ? 'var(--c-success)' : v >= 40 ? 'var(--c-accent2)' : 'var(--c-danger)'
  return <span style={{fontSize:11,fontWeight:700,padding:'2px 6px',borderRadius:20,background:bg,color:col}}>{v}%</span>
}

