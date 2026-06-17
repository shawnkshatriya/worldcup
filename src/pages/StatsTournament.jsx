import { useState, useEffect } from 'react'
import { HBar, Donut, ColChart } from './StatsCharts'
import Flag from '../components/Flag'

const noResults = <p style={{color:'var(--c-muted)',fontSize:13}}>No results yet</p>


export default function StatsTournament({ finished, totalGoals, avgGoals, topScorer, goalsHist, groupGoals, groupCounts, topTeams, scoreless, highScoring, predictions }) {
  const [scorers, setScorers] = useState([])
  const [scorersLoading, setScorersLoading] = useState(true)

  useEffect(function() {
    Promise.all([
      fetch('/api/scorers').then(function(r){ return r.json() }).catch(function(){ return {ok:false} }),
      fetch('/api/espn-stats').then(function(r){ return r.json() }).catch(function(){ return {ok:false} }),
    ]).then(function(results) {
      var fd = results[0], espn = results[1]
      // Merge: key by normalized name, take max goals/assists from either source
      var merged = {}
      function norm(s){ return (s||'').toLowerCase().replace(/[^a-z]/g,'') }
      function add(name, team, goals, assists) {
        if (!name) return
        var k = norm(name)
        if (!merged[k]) merged[k] = { name: name, team: team, goals: 0, assists: 0 }
        merged[k].goals = Math.max(merged[k].goals, goals || 0)
        merged[k].assists = Math.max(merged[k].assists, assists || 0)
        if (!merged[k].team && team) merged[k].team = team
      }
      if (fd.ok && fd.scorers) fd.scorers.forEach(function(s){ add(s.name, s.team, s.goals, s.assists) })
      if (espn.ok) {
        ;(espn.goals||[]).forEach(function(s){ add(s.name, s.team, s.goals, 0) })
        ;(espn.assists||[]).forEach(function(s){ add(s.name, s.team, 0, s.assists) })
      }
      var arr = Object.keys(merged).map(function(k){ return merged[k] })
      setScorers(arr.sort(function(a,b){ return b.goals - a.goals }))
      setScorersLoading(false)
    })
  }, [])

  // Compute extra tournament stats from finished matches
  var extraStats = (function() {
    var teams = {} // name -> {scored, conceded, cleanSheets, played, wins, biggestWinMargin}
    function ensure(n){ if(!teams[n]) teams[n]={name:n,scored:0,conceded:0,cleanSheets:0,played:0,failedToScore:0} }
    var biggestWin = null
    var totalFirstHalf = 0, comebacks = 0
    ;(finished||[]).forEach(function(m){
      if (m.home_goals==null) return
      ensure(m.home_team); ensure(m.away_team)
      var h=teams[m.home_team], a=teams[m.away_team]
      h.played++; a.played++
      h.scored+=m.home_goals; h.conceded+=m.away_goals
      a.scored+=m.away_goals; a.conceded+=m.home_goals
      if (m.away_goals===0) h.cleanSheets++
      if (m.home_goals===0) a.cleanSheets++
      if (m.home_goals===0) h.failedToScore++
      if (m.away_goals===0) a.failedToScore++
      var margin = Math.abs(m.home_goals - m.away_goals)
      if (!biggestWin || margin > biggestWin.margin) {
        biggestWin = { margin: margin, label: m.home_team+' '+m.home_goals+'-'+m.away_goals+' '+m.away_team }
      }
    })
    var teamArr = Object.keys(teams).map(function(k){ return teams[k] })
    var bestDefense = teamArr.filter(function(t){return t.played>0}).sort(function(x,y){ return (x.conceded/x.played)-(y.conceded/y.played) }).slice(0,5)
    var bestAttack = teamArr.filter(function(t){return t.played>0}).sort(function(x,y){ return (y.scored/y.played)-(x.scored/x.played) }).slice(0,5)
    var cleanSheetLeaders = teamArr.filter(function(t){return t.cleanSheets>0}).sort(function(x,y){ return y.cleanSheets-x.cleanSheets }).slice(0,5)
    return { biggestWin: biggestWin, bestDefense: bestDefense, bestAttack: bestAttack, cleanSheetLeaders: cleanSheetLeaders }
  })()

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
    <div className="stats-grid">
      <div className="card span-2" style={{marginBottom:0}}>
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
        <div className="card-title">⚽ Golden Boot race</div>
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:-8,marginBottom:12}}>Big number = goals · ast = assists</p>
        {scorersLoading ? (
          <p style={{fontSize:12,color:'var(--c-hint)'}}>Loading scorers...</p>
        ) : scorers.length === 0 ? (
          <p style={{fontSize:12,color:'var(--c-hint)'}}>No goals scored yet.</p>
        ) : (
          scorers.slice(0,10).map(function(s, i) {
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<9?'1px solid var(--c-border)':'none',fontSize:13}}>
                <span style={{width:20,fontFamily:'var(--font-display)',fontSize:15,color:i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':'var(--c-muted)',textAlign:'center'}}>{i+1}</span>
                <Flag team={s.team} size="sm"/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
                  <div style={{fontSize:10,color:'var(--c-muted)'}}>{s.team}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <span style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-accent)'}}>{s.goals}</span>
                  {s.assists>0 && <span style={{fontSize:10,color:'var(--c-muted)',marginLeft:4}}>+{s.assists} ast</span>}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">🅰️ Top assists</div>
        {scorersLoading ? (
          <p style={{fontSize:12,color:'var(--c-hint)'}}>Loading...</p>
        ) : (function() {
          var withAssists = scorers.filter(function(s){ return s.assists > 0 })
            .sort(function(a,b){ return b.assists - a.assists || b.goals - a.goals }).slice(0,10)
          if (withAssists.length === 0) return <p style={{fontSize:12,color:'var(--c-hint)'}}>No assists recorded yet.</p>
          return withAssists.map(function(s, i) {
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<withAssists.length-1?'1px solid var(--c-border)':'none',fontSize:13}}>
                <span style={{width:20,fontFamily:'var(--font-display)',fontSize:15,color:i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':'var(--c-muted)',textAlign:'center'}}>{i+1}</span>
                <Flag team={s.team} size="sm"/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.name}</div>
                  <div style={{fontSize:10,color:'var(--c-muted)'}}>{s.team}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <span style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-accent2)'}}>{s.assists}</span>
                  {s.goals>0 && <span style={{fontSize:10,color:'var(--c-muted)',marginLeft:4}}>{s.goals}g</span>}
                </div>
              </div>
            )
          })
        })()}
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">🧤 Clean sheets</div>
        {extraStats.cleanSheetLeaders.length === 0 ? <p style={{fontSize:13,color:'var(--c-hint)'}}>No clean sheets yet.</p> :
          extraStats.cleanSheetLeaders.map(function(t,i){
            return (
              <div key={t.name} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:i<extraStats.cleanSheetLeaders.length-1?'1px solid var(--c-border)':'none',fontSize:13}}>
                <Flag team={t.name} size="sm"/>
                <span style={{flex:1}}>{t.name}</span>
                <span style={{fontWeight:700,color:'var(--c-success)'}}>{t.cleanSheets}</span>
              </div>
            )
          })
        }
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">🛡️ Best defense</div>
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:-8,marginBottom:12}}>Fewest goals conceded per match</p>
        {extraStats.bestDefense.length === 0 ? <p style={{fontSize:13,color:'var(--c-hint)'}}>No data yet.</p> :
          extraStats.bestDefense.map(function(t,i){
            return (
              <div key={t.name} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:i<extraStats.bestDefense.length-1?'1px solid var(--c-border)':'none',fontSize:13}}>
                <Flag team={t.name} size="sm"/>
                <span style={{flex:1}}>{t.name}</span>
                <span style={{color:'var(--c-muted)',fontSize:11}}>{t.conceded} in {t.played}</span>
                <span style={{fontWeight:700}}>{(t.conceded/t.played).toFixed(2)}</span>
              </div>
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

      {/* Biggest results */}
      {finished.length > 0 && (function() {
        var byGoals = finished.slice().sort(function(a,b){ return (b.home_goals+b.away_goals) - (a.home_goals+a.away_goals) })
        var top3 = byGoals.slice(0,3)
        return (
          <div className="card" style={{marginBottom:0}}>
            <div className="card-title">Highest scoring matches</div>
            {top3.map(function(m) {
              return (
                <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
                  <span>{m.home_team} vs {m.away_team}</span>
                  <span style={{fontFamily:'var(--font-display)',fontSize:20,color:'var(--c-accent)'}}>{m.home_goals}-{m.away_goals}</span>
                </div>
              )
            })}
          </div>
        )
      })()}

    </div>
  )
}
