import { useState } from 'react'
import { HBar, StatPct } from './StatsCharts'

const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']

function medalColor(i) {
  if (i === 0) return 'var(--c-gold)'
  if (i === 1) return 'var(--c-silver)'
  if (i === 2) return 'var(--c-bronze)'
  return 'var(--c-muted)'
}

function medalIcon(i) {
  if (i === 0) return String.fromCodePoint(0x1F947)
  if (i === 1) return String.fromCodePoint(0x1F948)
  if (i === 2) return String.fromCodePoint(0x1F949)
  return i + 1
}

function barWidth(total, maxPts) {
  if (maxPts <= 0) return '0%'
  var pct = Math.max((total / maxPts) * 100, total > 0 ? 2 : 0)
  return pct + '%'
}

export default function StatsPlayers({ sorted, maxPts, leader, playerStats, poolAccuracy, poolExactRate, players, currentPlayer, finished }) {
  // Find current player's stats
  var myStats = currentPlayer ? sorted.find(function(p){ return p.id === currentPlayer.id }) : null
  var myRank = currentPlayer ? sorted.findIndex(function(p){ return p.id === currentPlayer.id }) + 1 : null
  const [filter, setFilter] = useState('')
  var metrics = [
    {label:'% W/L correct',  key:'pctWL',   color:'var(--c-accent)',  suffix:'%'},
    {label:'% goal diff',    key:'pctDiff',  color:'var(--c-info)',    suffix:'%'},
    {label:'% exact scores', key:'pctExact', color:'var(--c-accent2)', suffix:'%'},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>

      {/* Your performance */}
      {myStats && (
        <div className="card" style={{marginBottom:0,background:'var(--c-surface)',border:'1px solid var(--c-accent)',borderRadius:'var(--radius)'}}>
          <div className="card-title">Your performance</div>
          <div className="metrics">
            <div className="metric">
              <div className="metric-value" style={{color:'var(--c-accent)',fontSize:32}}>{myRank ? '#'+myRank : '-'}</div>
              <div className="metric-label">Rank</div>
            </div>
            <div className="metric">
              <div className="metric-value" style={{fontSize:32}}>{myStats.total}</div>
              <div className="metric-label">Points</div>
            </div>
            <div className="metric">
              <div className="metric-value" style={{color:'var(--c-success)'}}>{myStats.pctWL}%</div>
              <div className="metric-label">Results correct</div>
            </div>
            <div className="metric">
              <div className="metric-value" style={{color:'var(--c-accent2)'}}>{myStats.exact}</div>
              <div className="metric-label">Exact scores</div>
            </div>
          </div>
          {leader && myStats.id !== leader.id && (
            <div style={{fontSize:12,color:'var(--c-muted)',marginTop:8,textAlign:'center'}}>
              {leader.total - myStats.total} pts behind {leader.name}
            </div>
          )}
        </div>
      )}
      <div className="metrics">
        <div className="metric"><div className="metric-label">Players</div><div className="metric-value">{players.length}</div></div>
        <div className="metric"><div className="metric-label">Pool accuracy</div><div className="metric-value" style={{color:'var(--c-success)'}}>{poolAccuracy}%</div></div>
        <div className="metric"><div className="metric-label">Exact score rate</div><div className="metric-value" style={{color:'var(--c-accent2)'}}>{poolExactRate}%</div></div>
        {leader ? (
          <div className="metric">
            <div className="metric-label">Leader</div>
            <div className="metric-value" style={{fontSize:20}}>{leader.name}</div>
            <div style={{fontSize:11,color:'var(--c-muted)'}}>{leader.total} pts</div>
          </div>
        ) : null}
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:8,flexWrap:'wrap'}}>
          <div className="card-title" style={{marginBottom:0}}>Points race</div>
          {players.length > 8 && (
            <input
              type="text"
              placeholder="Filter players..."
              value={filter}
              onChange={function(e){ setFilter(e.target.value) }}
              style={{fontSize:12,padding:'5px 10px',borderRadius:16,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-text)',maxWidth:160}}
            />
          )}
        </div>
        {sorted.filter(function(p){ return !filter || p.name.toLowerCase().includes(filter.toLowerCase()) }).map(function(p, i) {
          return (
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{width:28,textAlign:'center',fontSize:i < 3 ? 22 : 14,color:medalColor(i)}}>
                {medalIcon(i)}
              </div>
              <div className="avatar" style={{width:28,height:28,fontSize:10,fontWeight:700,background:p.color+'22',color:p.color,flexShrink:0}}>{p.name.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:500}}>{p.name}</span>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:'var(--font-display)',marginLeft:8}}>{p.total} pts</span>
                </div>
                <div style={{height:8,background:'var(--c-surface2)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:barWidth(p.total, maxPts),
                    background:i === 0 ? 'var(--c-gold)' : i === 1 ? 'var(--c-silver)' : i === 2 ? 'var(--c-bronze)' : p.color,
                    borderRadius:4,transition:'width 0.6s'}}/>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {metrics.map(function(metric) {
        var metricSorted = [...playerStats].sort(function(a,b){ return b[metric.key] - a[metric.key] })
        return (
          <div key={metric.key} className="card" style={{marginBottom:0}}>
            <div className="card-title">{metric.label}</div>
            {metricSorted.map(function(p) {
              return <HBar key={p.id} label={p.name} value={p[metric.key]} max={100} color={metric.color} suffix={metric.suffix}/>
            })}
          </div>
        )
      })}

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
              {sorted.map(function(p, i) {
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:i < 3 ? 16 : 12}}>{medalIcon(i)}</span>
                        <div className="avatar" style={{width:24,height:24,fontSize:9,background:p.color+'22',color:p.color}}>{p.name.slice(0,2).toUpperCase()}</div>
                        <span style={{fontSize:13,fontWeight:500}}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{textAlign:'right',fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-accent)'}}>{p.total}</td>
                    <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.correct}</td>
                    <td style={{textAlign:'right'}}><StatPct v={p.pctWL}/></td>
                    <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.diff}</td>
                    <td style={{textAlign:'right'}}><StatPct v={p.pctDiff}/></td>
                    <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.exact}</td>
                    <td style={{textAlign:'right'}}><StatPct v={p.pctExact}/></td>
                    <td style={{textAlign:'right',color:'var(--c-muted)'}}>{p.approx}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
