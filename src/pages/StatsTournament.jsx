import { HBar, Donut, ColChart } from './StatsCharts'

const noResults = <p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>

export default function StatsTournament({ finished, totalGoals, avgGoals, topScorer, goalsHist, groupGoals, groupCounts, topTeams, scoreless, highScoring }) {
  const matchFacts = [
    {label:'Finished',   value:finished.length},
    {label:'Total goals',value:totalGoals},
    {label:'Avg/match',  value:avgGoals},
    {label:'High-scoring (4+)',value:highScoring},
    {label:'Scoreless (0-0)',   value:scoreless},
  ]
  if (topScorer) matchFacts.push({label:'Top scoring nation', value:topScorer.name+' ('+topScorer.goals+' gls)'})

  const homeWins = finished.filter(function(m){ return m.home_goals > m.away_goals }).length
  const awayWins = finished.filter(function(m){ return m.home_goals < m.away_goals }).length
  const draws    = finished.filter(function(m){ return m.home_goals === m.away_goals }).length

  const groupEntries = Object.entries(groupGoals).sort(function(a,b){ return b[1]-a[1] })
  const maxGroup = groupEntries.length > 0 ? Math.max(...Object.values(groupGoals)) : 1

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,300px),1fr))',gap:'1.25rem'}}>
      <div className="card" style={{marginBottom:0,gridColumn:'span 2'}}>
        <div className="card-title">Match facts</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
          {matchFacts.map(function(s){
            return (
              <div key={s.label} className="metric" style={{marginBottom:0}}>
                <div className="metric-label">{s.label}</div>
                <div className="metric-value" style={{fontSize:28}}>{s.value}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Goals per match distribution</div>
        {finished.length === 0 ? noResults : <ColChart data={goalsHist} color="var(--c-accent)" height={100}/>}
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:6}}>Total goals in each match</p>
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Match outcomes</div>
        {finished.length === 0 ? noResults :
          <Donut slices={[
            {label:'Home win',value:homeWins,color:'var(--c-accent)'},
            {label:'Away win',value:awayWins,color:'var(--c-info)'},
            {label:'Draw',    value:draws,   color:'var(--c-muted)'},
          ]} size={130}/>
        }
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Goals by group</div>
        {groupEntries.length === 0 ? noResults :
          groupEntries.map(function(entry){
            var g = entry[0], v = entry[1]
            var perMatch = groupCounts[g] ? (v/groupCounts[g]).toFixed(1)+'/m' : ''
            return (
              <HBar key={g} label={'Group '+g} value={v} max={maxGroup}
                color="var(--c-accent2)" suffix=" gls" note={perMatch}/>
            )
          })
        }
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Top scoring nations</div>
        {topTeams.length === 0 ? noResults :
          topTeams.map(function(t,i){
            var c = i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':'var(--c-accent)'
            return <HBar key={t.label} label={t.label} value={t.value} max={topTeams[0].value} color={c}/>
          })
        }
      </div>
    </div>
  )
}
