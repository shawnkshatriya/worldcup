import { useState } from 'react'
import { Donut, LineChart } from './StatsCharts'

export default function StatsChartsTab({ scores, accuracyOverTime, ptsOverTime, accuracyByPlayer, rankOverTime, selectedPlayers, playerStats }) {
  var [raceType, setRaceType] = useState('points') // 'points' | 'rank' | 'accuracy'

  var hasScores = scores.length > 0
  var ptsResult = scores.reduce(function(a,s){ return a + (s.pts_result||0) }, 0)
  var ptsDiff   = scores.reduce(function(a,s){ return a + (s.pts_diff||0) }, 0)
  var ptsExact  = scores.reduce(function(a,s){ return a + (s.pts_exact||0) }, 0)
  var ptsApprox = scores.reduce(function(a,s){ return a + (s.pts_approx||0) }, 0)
  var slices = [
    {label:'Correct result',value:ptsResult,color:'var(--c-accent)'},
    {label:'Goal diff',     value:ptsDiff,  color:'var(--c-info)'},
    {label:'Exact score',   value:ptsExact, color:'var(--c-accent2)'},
    {label:'Approx bonus',  value:ptsApprox,color:'var(--c-success)'},
  ].filter(function(s){ return s.value > 0 })

  var raceSeries = raceType === 'points' ? ptsOverTime : raceType === 'rank' ? (rankOverTime || []) : (accuracyByPlayer || [])
  var hasRace = raceSeries.length > 0 && raceSeries.some(function(s){ return s.points && s.points.length > 0 })

  // Average points per game per participant (respects the player filter).
  var avgPerGame = (playerStats || [])
    .filter(function(p){ return p.scored > 0 })
    .filter(function(p){ return selectedPlayers.length === 0 || selectedPlayers.includes(p.id) })
    .map(function(p){ return { id:p.id, name:p.name, color:p.color, avg: p.total / p.scored } })
    .sort(function(a,b){ return b.avg - a.avg })
  var avgMax = avgPerGame.length > 0 ? avgPerGame[0].avg : 0
  var raceTitle = raceType === 'points' ? '\uD83C\uDFC1 Points race' : raceType === 'rank' ? '\uD83D\uDCCA Rank over time' : '\uD83C\uDFAF Accuracy race'
  var raceDesc = raceType === 'points' ? 'Cumulative points per match' : raceType === 'rank' ? 'Standings position per match (1 = top; lower line is better)' : 'Running accuracy % per match'

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>

      {/* PARTICIPANT COMPARISON - first, full width, large */}
      <div className="card" style={{marginBottom:0,overflow:'visible'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:4}}>
          <div className="card-title" style={{marginBottom:0}}>
            {raceTitle}
          </div>
          <div style={{display:'flex',gap:4,background:'var(--c-surface2)',borderRadius:8,padding:3}}>
            <button onClick={function(){setRaceType('points')}} style={{fontSize:12,padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:600,background:raceType==='points'?'var(--c-accent)':'transparent',color:raceType==='points'?'#fff':'var(--c-muted)'}}>Points</button>
            <button onClick={function(){setRaceType('rank')}} style={{fontSize:12,padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:600,background:raceType==='rank'?'var(--c-accent)':'transparent',color:raceType==='rank'?'#fff':'var(--c-muted)'}}>Rank</button>
            <button onClick={function(){setRaceType('accuracy')}} style={{fontSize:12,padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontWeight:600,background:raceType==='accuracy'?'var(--c-accent)':'transparent',color:raceType==='accuracy'?'#fff':'var(--c-muted)'}}>Accuracy</button>
          </div>
        </div>
        <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:16}}>
          {raceDesc}{selectedPlayers.length === 0 ? ' \u2014 filter above to compare specific people' : ''}
        </p>
        {hasRace ? (
          <>
            <div style={{maxWidth:760,margin:'0 auto'}}>
              <LineChart series={raceSeries} height={260} showLast={true} isPercent={raceType==='accuracy'} invertY={raceType==='rank'}/>
            </div>
            <div style={{display:'flex',gap:16,marginTop:14,flexWrap:'wrap',justifyContent:'center'}}>
              {raceSeries.map(function(s) {
                return (
                  <div key={s.label} style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}>
                    <div style={{width:18,height:4,background:s.color,borderRadius:2}}/>
                    <span style={{color:'var(--c-text)',fontWeight:500}}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          </>
        ) : <p style={{color:'var(--c-muted)',fontSize:13}}>No data yet</p>}
      </div>

      {/* Pool accuracy over time - full width */}
      <div className="card" style={{marginBottom:0,overflow:'visible'}}>
        <div className="card-title">Pool accuracy over time</div>
        <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:16}}>% of all predictions that were correct, match by match (whole pool)</p>
        <div style={{maxWidth:760,margin:'0 auto'}}>
          <LineChart series={[{label:'Accuracy',color:'var(--c-success)',points:accuracyOverTime}]} height={210} showLast={true} isPercent={true}/>
        </div>
      </div>

      {/* Points breakdown donut */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Points breakdown (pool total)</div>
        {hasScores ? <Donut slices={slices} size={200}/> : <p style={{color:'var(--c-muted)',fontSize:13}}>No scores yet</p>}
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:10}}>Correct results outnumber exact scores \u2014 every exact score also counts as a correct result, so this shows where points actually came from.</p>
      </div>

      {/* Average points per game per participant */}
      <div className="card" style={{marginBottom:0,overflow:'visible'}}>
        <div className="card-title">Average points per game</div>
        <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:16}}>
          Each person's total points divided by the games they've been scored on{selectedPlayers.length === 0 ? ' \u2014 filter above to compare specific people' : ''}
        </p>
        {avgPerGame.length > 0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {avgPerGame.map(function(p){
              var pct = avgMax > 0 ? Math.round((p.avg / avgMax) * 100) : 0
              return (
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:96,fontSize:12.5,fontWeight:600,color:'var(--c-text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flexShrink:0,textAlign:'right'}}>{p.name}</div>
                  <div style={{flex:1,height:20,background:'var(--c-surface2)',borderRadius:5,position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',left:0,top:0,bottom:0,width:Math.max(pct,2)+'%',background:p.color,borderRadius:5,transition:'width 0.4s'}}/>
                  </div>
                  <div style={{width:42,fontSize:13,fontWeight:700,fontFamily:'var(--font-display)',color:'var(--c-text)',textAlign:'right',flexShrink:0}}>{p.avg.toFixed(1)}</div>
                </div>
              )
            })}
          </div>
        ) : <p style={{color:'var(--c-muted)',fontSize:13}}>No games scored yet</p>}
      </div>


    </div>
  )
}
