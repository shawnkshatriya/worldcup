import { Donut, LineChart } from './StatsCharts'

export default function StatsChartsTab({ scores, accuracyOverTime, ptsOverTime, selectedPlayers }) {
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

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))',gap:'1.25rem'}}>

      <div className="card" style={{marginBottom:0,overflow:'visible'}}>
        <div className="card-title">Pool accuracy over time</div>
        <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:12}}>% of predictions that were correct across all players, match by match</p>
        <LineChart series={[{label:'Accuracy',color:'var(--c-success)',points:accuracyOverTime}]} showLast={true}/>
      </div>

      <div className="card" style={{marginBottom:0,overflow:'visible'}}>
        <div className="card-title">Points race - top 3</div>
        <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:12}}>Cumulative points per match for the top 3 players</p>
        <LineChart series={ptsOverTime} height={100} showLast={true}/>
        <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>
          {ptsOverTime.map(function(s) {
            return (
              <div key={s.label} style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
                <div style={{width:16,height:3,background:s.color,borderRadius:2}}/>
                <span style={{color:'var(--c-muted)'}}>{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Points breakdown (pool total)</div>
        {hasScores ? <Donut slices={slices} size={140}/> : <p style={{color:'var(--c-muted)',fontSize:13}}>No scores yet</p>}
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:10}}>Correct results should outnumber exact scores - every exact score also counts as a correct result, so the donut shows where points actually came from.</p>
      </div>

    </div>
  )
}
