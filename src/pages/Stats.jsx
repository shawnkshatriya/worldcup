import { useEffect, useState, useMemo } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { supabase } from '../lib/supabase'
import { FunFacts } from './StatsCharts'
import StatsTournament from './StatsTournament'
import StatsPlayers from './StatsPlayers'
import StatsChartsTab from './StatsChartsTab'
import StatsInsights from './StatsInsights'
import PlayerFilter from '../components/PlayerFilter'

var AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']
var GROUP_NAMES = { GROUP_A:'A',GROUP_B:'B',GROUP_C:'C',GROUP_D:'D',GROUP_E:'E',GROUP_F:'F', GROUP_G:'G',GROUP_H:'H',GROUP_I:'I',GROUP_J:'J',GROUP_K:'K',GROUP_L:'L' }

var TAB_LABELS = {tournament:'Tournament',players:'Participants',insights:'Insights',charts:'Pool Trends',funfacts:'Fun Facts'}

export default function Stats() {
  var ctx = usePlayer()
  var player = ctx.player
  var playerLoading = ctx.loading
  var roomCode = player ? (player.room_code || 'DEFAULT') : 'DEFAULT'
  var loadingState = useState(true)
  var loading = loadingState[0], setLoading = loadingState[1]
  var tabState = useState('tournament')
  var tab = tabState[0], setTab = tabState[1]
  var playersState = useState([])
  var players = playersState[0], setPlayers = playersState[1]
  var scoresState = useState([])
  var scores = scoresState[0], setScores = scoresState[1]
  var matchesState = useState([])
  var matches = matchesState[0], setMatches = matchesState[1]
  var predsState = useState([])
  var predictions = predsState[0], setPreds = predsState[1]

  useEffect(function(){
    if (playerLoading) return
    if (!player) { setLoading(false); return }
    loadAll()
  },[player, playerLoading])

  async function fetchAllRows(table, cols, playerIds) {
    var all = []
    var from = 0
    while (true) {
      var q = supabase.from(table).select(cols)
      if (playerIds) q = q.in('player_id', playerIds)
      var page = await q.range(from, from + 999)
      if (!page.data || page.data.length === 0) break
      all = all.concat(page.data)
      if (page.data.length < 1000) break
      from += 1000
    }
    return all
  }

  async function loadAll() {
    setLoading(true)
    var playersRes = await supabase.from('players').select('id,name,site,team').eq('room_code', roomCode).order('created_at')
    if (playersRes.error) {
      // site/team columns may not exist yet - fall back
      playersRes = await supabase.from('players').select('id,name').eq('room_code', roomCode).order('created_at')
    }
    var roomPlayers = playersRes.data || []
    var playerIds = roomPlayers.map(function(p){ return p.id })

    var matchesRes = await supabase.from('matches').select('*').order('match_number')
    var scores = playerIds.length ? await fetchAllRows('scores', '*', playerIds) : []
    var preds = playerIds.length ? await fetchAllRows('predictions', '*', playerIds) : []

    setPlayers(roomPlayers)
    setScores(scores)
    setMatches(matchesRes.data || [])
    setPreds(preds)
    setLoading(false)
  }

  var finished = useMemo(function(){ return matches.filter(function(m){ return m.home_goals!=null }) },[matches])

  var playerStats = useMemo(function(){ var totalFinished = finished.length; return players.map(function(p,idx){
    var ps=scores.filter(function(s){return s.player_id===p.id})
    var pp=predictions.filter(function(pr){return pr.player_id===p.id&&pr.home_goals!=null})
    var scored=ps.length
    var total=ps.reduce(function(a,s){return a+(s.pts_total||0)},0)
    var correct=ps.filter(function(s){return s.pts_result>0||s.pts_exact>0}).length
    var diff=ps.filter(function(s){return s.pts_diff>0}).length
    var exact=ps.filter(function(s){return s.pts_exact>0}).length
    var approx=ps.filter(function(s){return s.pts_approx>0}).length
    return { id:p.id,name:p.name,color:AVATAR_COLORS[idx%AVATAR_COLORS.length],
      total:total,correct:correct,diff:diff,exact:exact,approx:approx,preds:pp.length,scored:scored,
      pctWL:totalFinished>0?Math.round(correct/totalFinished*100):0,
      pctDiff:totalFinished>0?Math.round(diff/totalFinished*100):0,
      pctExact:totalFinished>0?Math.round(exact/totalFinished*100):0,
    }
  })},[players,scores,predictions,finished])

  var sorted = playerStats.slice().sort(function(a,b){return b.total-a.total})

  var selectedState = useState([])
  var selectedPlayers = selectedState[0], setSelectedPlayers = selectedState[1]
  var filteredSorted = selectedPlayers.length === 0 ? sorted : sorted.filter(function(p){ return selectedPlayers.includes(p.id) })
  var maxPts = sorted[0] ? (sorted[0].total||1) : 1
  var leader = sorted[0]
  var topScorer = useMemo(function(){
    var tg={}
    finished.forEach(function(m){ tg[m.home_team]=(tg[m.home_team]||0)+m.home_goals; tg[m.away_team]=(tg[m.away_team]||0)+m.away_goals })
    var top=Object.entries(tg).sort(function(a,b){return b[1]-a[1]})[0]
    return top?{name:top[0],goals:top[1]}:null
  },[finished])

  var totalGoals=finished.reduce(function(a,m){return a+m.home_goals+m.away_goals},0)
  var avgGoals=finished.length>0?(totalGoals/finished.length).toFixed(2):'0.00'
  var scoreless=finished.filter(function(m){return m.home_goals===0&&m.away_goals===0}).length
  var highScoring=finished.filter(function(m){return m.home_goals+m.away_goals>=4}).length

  var groupGoals={}, groupCounts={}
  finished.forEach(function(m){ var g=GROUP_NAMES[m.phase]; if(!g) return; groupGoals[g]=(groupGoals[g]||0)+m.home_goals+m.away_goals; groupCounts[g]=(groupCounts[g]||0)+1 })

  var topTeams=useMemo(function(){
    var tg={}
    finished.forEach(function(m){ tg[m.home_team]=(tg[m.home_team]||0)+m.home_goals; tg[m.away_team]=(tg[m.away_team]||0)+m.away_goals })
    return Object.entries(tg).map(function(e){return {label:e[0],value:e[1]}}).sort(function(a,b){return b.value-a.value}).slice(0,12)
  },[finished])

  var goalsHist=Array.from({length:9},function(_,i){ return {
    label:i===8?'8+':String(i),
    value:finished.filter(function(m){ var t=m.home_goals+m.away_goals; return i===8?t>=8:t===i }).length
  }})

  var poolCorrect=scores.filter(function(s){return s.pts_result>0||s.pts_exact>0}).length
  var poolDenom=players.length*finished.length
  var poolAccuracy=poolDenom>0?Math.round(poolCorrect/poolDenom*100):0
  var poolExactRate=poolDenom>0?Math.round(scores.filter(function(s){return s.pts_exact>0}).length/poolDenom*100):0

  var accuracyOverTime=useMemo(function(){
    var pts=[]
    for(var i=1;i<=Math.min(finished.length,20);i++){
      var ids=new Set(finished.slice(0,i).map(function(m){return m.id}))
      var rel=scores.filter(function(s){return ids.has(s.match_id)})
      var corr=rel.filter(function(s){return s.pts_result>0||s.pts_exact>0}).length
      pts.push({label:'M'+i, y:rel.length>0?Math.round(corr/rel.length*100):0})
    }
    return pts
  },[finished,scores])

  var ptsOverTime=useMemo(function(){
    var base = selectedPlayers.length === 0 ? sorted.slice(0,3) : sorted.filter(function(p){ return selectedPlayers.includes(p.id) }).slice(0,6)
    return base.map(function(pl){ return {
      label:pl.name, color:pl.color,
      points: finished.slice(0,20).map(function(m,i){
        var cumPts=scores.filter(function(s){return s.player_id===pl.id&&finished.slice(0,i+1).some(function(x){return x.id===s.match_id})}).reduce(function(a,s){return a+(s.pts_total||0)},0)
        return {label:'M'+(i+1),y:cumPts}
      })
    }})
  },[sorted,finished,scores,selectedPlayers])

  var accuracyByPlayer=useMemo(function(){
    var base = selectedPlayers.length === 0 ? sorted.slice(0,3) : sorted.filter(function(p){ return selectedPlayers.includes(p.id) }).slice(0,6)
    return base.map(function(pl){ return {
      label:pl.name, color:pl.color,
      points: finished.slice(0,20).map(function(m,i){
        var upto = finished.slice(0,i+1)
        var uptoIds = new Set(upto.map(function(x){return x.id}))
        var rel = scores.filter(function(s){ return s.player_id===pl.id && uptoIds.has(s.match_id) })
        var corr = rel.filter(function(s){ return s.pts_result>0||s.pts_exact>0 }).length
        // denominator = matches played so far (fair: blanks count as misses)
        var pct = upto.length>0 ? Math.round(corr/upto.length*100) : 0
        return {label:'M'+(i+1),y:pct}
      })
    }})
  },[sorted,finished,scores,selectedPlayers])

  var topScorerMetric = null
  if (topScorer) {
    topScorerMetric = (
      <div className="metric">
        <div className="metric-label">Top scoring nation</div>
        <div className="metric-value" style={{fontSize:20}}>{topScorer.name}</div>
        <div style={{fontSize:11,color:'var(--c-muted)'}}>{topScorer.goals} goals</div>
      </div>
    )
  }

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-header-inner"><h1>Stats</h1></div></div>
      <div className="page-body"><p style={{color:'var(--c-muted)'}}>Loading...</p></div>
    </div>
  )

  var tabs = ['tournament','players','insights','charts','funfacts']

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Stats &amp; Insights</h1>
          <p>{finished.length} of 104 matches played - {totalGoals} total goals</p>
        </div>
      </div>
      <div className="page-body">

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:'1rem',flexWrap:'wrap'}}>
          <div className="tabs" style={{marginBottom:0}}>
          {tabs.map(function(t) {
            return (
              <button key={t} className={'tab' + (tab===t ? ' active' : '')} onClick={function(){setTab(t)}}>
                {TAB_LABELS[t] || t}
              </button>
            )
          })}
          </div>
          {(tab === 'players' || tab === 'charts') && (
            <PlayerFilter players={players} selected={selectedPlayers} onChange={setSelectedPlayers} />
          )}
        </div>

      {tab==='tournament' ? <StatsTournament finished={finished} totalGoals={totalGoals} avgGoals={avgGoals} topScorer={topScorer} goalsHist={goalsHist} groupGoals={groupGoals} groupCounts={groupCounts} topTeams={topTeams} scoreless={scoreless} highScoring={highScoring} predictions={predictions}/> : null}
      {tab==='players' ? <StatsPlayers sorted={filteredSorted} maxPts={maxPts} leader={leader} playerStats={playerStats} poolAccuracy={poolAccuracy} poolExactRate={poolExactRate} players={players} currentPlayer={player} finished={finished} predictions={predictions} scores={scores} matches={matches}/> : null}
      {tab==='insights' ? <StatsInsights players={players} scores={scores} matches={matches} predictions={predictions}/> : null}
      {tab==='charts' ? <StatsChartsTab scores={scores} accuracyOverTime={accuracyOverTime} ptsOverTime={ptsOverTime} accuracyByPlayer={accuracyByPlayer} selectedPlayers={selectedPlayers}/> : null}
      {tab==='funfacts' ? <FunFacts sorted={sorted} playerStats={playerStats} leader={leader} totalGoals={totalGoals} finished={finished} avgGoals={avgGoals} topScorer={topScorer} predictions={predictions}/> : null}
      </div>
    </div>
  )
}
