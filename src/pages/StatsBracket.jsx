import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import Flag from '../components/Flag'

var AVATAR_COLORS = ['#C8102E','#F0A500','#22c55e','#3b82f6','#a855f7','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16']

// A team is eliminated once it loses a FINISHED knockout match.
// "Alive" = a Round-of-32 team that has not yet been knocked out.
function computeEliminated(koMatches) {
  var eliminated = {}
  koMatches.forEach(function(m) {
    if (m.status !== 'FINISHED' || m.home_goals == null) return
    var loser = null
    if (m.home_goals > m.away_goals) loser = m.away_team
    else if (m.away_goals > m.home_goals) loser = m.home_team
    else if (m.home_goals_pen != null && m.away_goals_pen != null) {
      loser = m.home_goals_pen > m.away_goals_pen ? m.away_team : m.home_team
    }
    if (loser) eliminated[loser] = true
  })
  return eliminated
}

export default function StatsBracket() {
  const { player } = usePlayer()
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState([])
  const [picksByPlayer, setPicksByPlayer] = useState({})
  const [koMatches, setKoMatches] = useState([])
  const [locked, setLocked] = useState(false)

  useEffect(function() { if (player) load() }, [player])

  async function load() {
    setLoading(true)
    var roomCode = (player && player.room_code) || 'DEFAULT'
    var [playerRes, matchRes] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code', roomCode).order('created_at').limit(500),
      supabase.from('matches').select('id,match_number,phase,home_team,away_team,home_goals,away_goals,home_goals_pen,away_goals_pen,status,kickoff')
        .in('phase', ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL']),
    ])
    var pl = playerRes.data || []
    var ms = matchRes.data || []
    setPlayers(pl)
    setKoMatches(ms)

    // Bracket reveals once the first KO match kicks off.
    var firstKo = ms.filter(function(m){ return m.kickoff }).sort(function(a,b){ return new Date(a.kickoff)-new Date(b.kickoff) })[0]
    var isLocked = firstKo ? new Date(firstKo.kickoff) <= new Date() : false
    setLocked(isLocked)

    if (isLocked) {
      var picksRes = await supabase.from('ko_bracket_picks').select('player_id,match_id,picked_team').eq('room_code', roomCode)
      var byPlayer = {}
      ;(picksRes.data || []).forEach(function(p){
        if (!byPlayer[p.player_id]) byPlayer[p.player_id] = {}
        byPlayer[p.player_id][p.match_id] = p.picked_team
      })
      setPicksByPlayer(byPlayer)
    }
    setLoading(false)
  }

  if (loading) return <p style={{color:'var(--c-muted)'}}>Loading bracket stats...</p>

  if (!locked) {
    return (
      <div className="card">
        <div className="card-title">Bracket stats</div>
        <p style={{color:'var(--c-muted)',fontSize:13}}>Bracket stats unlock once the knockout stage kicks off. Check back after the first Round of 32 match!</p>
      </div>
    )
  }

  var eliminated = computeEliminated(koMatches)
  var finalMatch = koMatches.find(function(m){ return m.phase === 'FINAL' })

  // ---- Metric 1: teams still alive per player ----
  // A player's "alive" count = distinct teams they picked to advance that are not eliminated.
  var survival = players.map(function(p, i) {
    var picks = picksByPlayer[p.id] || {}
    var pickedTeams = {}
    Object.keys(picks).forEach(function(mid){ if (picks[mid]) pickedTeams[picks[mid]] = true })
    var teams = Object.keys(pickedTeams)
    var alive = teams.filter(function(t){ return !eliminated[t] })
    return {
      id: p.id, name: p.name, color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      aliveCount: alive.length, totalPicked: teams.length,
      champion: finalMatch ? picks[finalMatch.id] : null,
      championAlive: finalMatch && picks[finalMatch.id] ? !eliminated[picks[finalMatch.id]] : null,
    }
  }).sort(function(a,b){ return b.aliveCount - a.aliveCount })

  var maxAlive = survival.length > 0 ? Math.max.apply(null, survival.map(function(s){ return s.aliveCount })) : 0

  // ---- Metric 2: champion pick distribution ----
  var champCounts = {}
  players.forEach(function(p){
    var picks = picksByPlayer[p.id] || {}
    var champ = finalMatch ? picks[finalMatch.id] : null
    if (champ) champCounts[champ] = (champCounts[champ] || 0) + 1
  })
  var champDist = Object.keys(champCounts).map(function(team){
    return { team: team, count: champCounts[team], eliminated: !!eliminated[team] }
  }).sort(function(a,b){ return b.count - a.count })
  var maxChamp = champDist.length > 0 ? champDist[0].count : 0
  var totalChampPicks = champDist.reduce(function(a,c){ return a+c.count }, 0)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Champion pick distribution */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Who the pool picked to win it all</div>
        <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:16}}>
          {totalChampPicks} {totalChampPicks === 1 ? 'person has' : 'people have'} chosen a champion. Eliminated teams are struck through.
        </p>
        {champDist.length > 0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {champDist.map(function(c){
              var pct = maxChamp > 0 ? Math.round((c.count / maxChamp) * 100) : 0
              return (
                <div key={c.team} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:120,display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    <Flag team={c.team} size="sm"/>
                    <span style={{fontSize:12.5,fontWeight:600,color:c.eliminated?'var(--c-muted)':'var(--c-text)',textDecoration:c.eliminated?'line-through':'none',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.team}</span>
                  </div>
                  <div style={{flex:1,height:18,background:'var(--c-surface2)',borderRadius:5,position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',left:0,top:0,bottom:0,width:Math.max(pct,3)+'%',background:c.eliminated?'var(--c-muted)':'var(--c-accent2)',borderRadius:5,opacity:c.eliminated?0.5:1,transition:'width 0.4s'}}/>
                  </div>
                  <div style={{width:30,fontSize:13,fontWeight:700,fontFamily:'var(--font-display)',color:'var(--c-text)',textAlign:'right',flexShrink:0}}>{c.count}</div>
                </div>
              )
            })}
          </div>
        ) : <p style={{color:'var(--c-muted)',fontSize:13}}>No champion picks yet.</p>}
      </div>

      {/* Teams still alive per player */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Bracket survival — teams still alive</div>
        <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:16}}>
          How many of each person's picked teams are still in the tournament. ✕ means their champion is out.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:9}}>
          {survival.map(function(s){
            var pct = maxAlive > 0 ? Math.round((s.aliveCount / maxAlive) * 100) : 0
            return (
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:110,fontSize:12.5,fontWeight:s.id===(player&&player.id)?700:600,color:s.id===(player&&player.id)?'var(--c-accent2)':'var(--c-text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flexShrink:0,textAlign:'right'}}>
                  {s.name}{s.id===(player&&player.id)?' (you)':''}
                </div>
                <div style={{flex:1,height:18,background:'var(--c-surface2)',borderRadius:5,position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',left:0,top:0,bottom:0,width:Math.max(pct,3)+'%',background:s.color,borderRadius:5,transition:'width 0.4s'}}/>
                </div>
                <div style={{width:54,fontSize:12,color:'var(--c-muted)',flexShrink:0,display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}>
                  <span style={{fontWeight:700,fontFamily:'var(--font-display)',fontSize:14,color:'var(--c-text)'}}>{s.aliveCount}</span>
                  {s.championAlive === false && <span title="Champion eliminated" style={{color:'var(--c-accent)',fontWeight:700}}>✕</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
