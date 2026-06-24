import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { buildBracketLinkage, computePredictedTeams, KO_ROUND_ORDER, orderMatchesForBracket } from '../lib/bracketLinkage'
import Flag from './Flag'

const PHASE_LABELS = {
  ROUND_OF_32: 'R32', ROUND_OF_16: 'R16',
  QUARTER_FINALS: 'QF', SEMI_FINALS: 'SF', FINAL: 'Final', THIRD_PLACE: '3rd',
}

// Shows everyone's brackets - pick a player to view their locked bracket.
// Only reveals once the bracket has locked (first KO kickoff).
export default function AllBrackets({ roomCode }) {
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState([])
  const [picksByPlayer, setPicksByPlayer] = useState({})
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [bracketLocked, setBracketLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(function(){ load() }, [roomCode])

  async function load() {
    setLoading(true)
    var [matchRes, playerRes] = await Promise.all([
      supabase.from('matches').select('*')
        .in('phase', ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'])
        .order('match_number'),
      supabase.from('players').select('id,name').eq('room_code', roomCode).order('name'),
    ])
    var koMatches = matchRes.data || []
    setMatches(koMatches)
    setPlayers(playerRes.data || [])

    // Bracket locked when first KO match has kicked off
    var firstKo = koMatches.filter(function(m){ return m.kickoff }).sort(function(a,b){ return new Date(a.kickoff)-new Date(b.kickoff) })[0]
    var locked = firstKo ? new Date(firstKo.kickoff) <= new Date() : false
    setBracketLocked(locked)

    if (locked) {
      var picksRes = await supabase.from('ko_bracket_picks').select('player_id,match_id,picked_team').eq('room_code', roomCode)
      var byPlayer = {}
      ;(picksRes.data || []).forEach(function(p){
        if (!byPlayer[p.player_id]) byPlayer[p.player_id] = {}
        byPlayer[p.player_id][p.match_id] = p.picked_team
      })
      setPicksByPlayer(byPlayer)
      if (playerRes.data && playerRes.data.length > 0) setSelectedPlayer(playerRes.data[0].id)
    }
    setLoading(false)
  }

  var linkage = useMemo(function(){ return buildBracketLinkage(matches) }, [matches])
  var selectedPicks = picksByPlayer[selectedPlayer] || {}
  var predictedTeams = useMemo(function(){ return computePredictedTeams(matches, linkage, selectedPicks) }, [matches, linkage, selectedPicks])

  if (loading) return <p style={{color:'var(--c-muted)'}}>Loading brackets...</p>

  if (!bracketLocked) {
    return (
      <div className="alert alert-info">
        Everyone's brackets are revealed once the knockouts begin (at the first Round of 32 kickoff). Until then, picks stay hidden.
      </div>
    )
  }

  var matchesByPhase = {}
  KO_ROUND_ORDER.forEach(function(ph){ matchesByPhase[ph] = orderMatchesForBracket(ph, matches.filter(function(m){ return m.phase === ph })) })

  return (
    <div>
      {/* Player selector */}
      <div style={{overflowX:'auto',paddingBottom:6,marginBottom:14}}>
        <div style={{display:'flex',gap:6,width:'max-content'}}>
          {players.map(function(p){
            var hasPicks = picksByPlayer[p.id] && Object.keys(picksByPlayer[p.id]).length > 0
            return (
              <button key={p.id} onClick={function(){ setSelectedPlayer(p.id) }}
                style={{fontSize:12,padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap',
                  background:selectedPlayer===p.id?'var(--c-accent)':'var(--c-surface2)',
                  color:selectedPlayer===p.id?'#fff':hasPicks?'var(--c-text)':'var(--c-hint)'}}>
                {p.name}{!hasPicks && ' (none)'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Read-only bracket */}
      <div style={{overflowX:'auto',paddingBottom:16}}>
        <div style={{display:'flex',gap:18,minWidth:'fit-content',alignItems:'stretch'}}>
          {KO_ROUND_ORDER.map(function(phase){
            var ms = matchesByPhase[phase] || []
            if (ms.length === 0) return null
            return (
              <div key={phase} style={{minWidth:170,maxWidth:185,display:'flex',flexDirection:'column'}}>
                <div style={{fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-accent)',marginBottom:8,textAlign:'center'}}>{PHASE_LABELS[phase]}</div>
                <div style={{display:'flex',flexDirection:'column',justifyContent:'space-around',flex:1,gap:6}}>
                  {ms.map(function(m){
                    var pred = predictedTeams[m.id] || {}
                    var pick = selectedPicks[m.id]
                    return <ReadOnlyMatch key={m.id} match={m} predHome={pred.predHome} predAway={pred.predAway} pick={pick}/>
                  })}
                </div>
              </div>
            )
          })}
          {/* 3rd place */}
          {(function(){
            var third = matches.filter(function(m){ return m.phase === 'THIRD_PLACE' })
            if (third.length === 0) return null
            return (
              <div style={{minWidth:170,maxWidth:185,display:'flex',flexDirection:'column'}}>
                <div style={{fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-muted)',marginBottom:8,textAlign:'center'}}>{PHASE_LABELS['THIRD_PLACE']}</div>
                {third.map(function(m){
                  var pred = predictedTeams[m.id] || {}
                  return <ReadOnlyMatch key={m.id} match={m} predHome={pred.predHome} predAway={pred.predAway} pick={selectedPicks[m.id]}/>
                })}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

function ReadOnlyMatch({ match, predHome, predAway, pick }) {
  var actualHome = match.home_team, actualAway = match.away_team
  var finished = match.home_goals != null

  function row(predTeam, actualTeam, goals) {
    var display = predTeam || actualTeam
    var isPick = pick && pick === predTeam
    var wasRight = finished && predTeam && actualTeam && predTeam === actualTeam
    var wasWrong = finished && predTeam && actualTeam && predTeam !== actualTeam
    return (
      <div style={{display:'flex',alignItems:'center',gap:5,padding:'5px 7px',borderRadius:6,
        background: isPick ? 'var(--c-accent)' : wasRight ? 'rgba(34,197,94,0.14)' : 'var(--c-surface2)',
        opacity: display ? 1 : 0.4}}>
        {display && <Flag team={display} size="sm"/>}
        <span style={{flex:1,fontSize:11,fontWeight:600,color:isPick?'#fff':'var(--c-text)',textDecoration:wasWrong?'line-through':'none',opacity:wasWrong?0.55:1}}>{display || 'TBD'}</span>
        {goals != null && <span style={{fontSize:12,fontWeight:700,fontFamily:'var(--font-display)',color:isPick?'#fff':'var(--c-text)'}}>{goals}</span>}
      </div>
    )
  }

  return (
    <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:9,padding:'7px 8px'}}>
      {row(predHome, actualHome, match.home_goals)}
      <div style={{height:4}}/>
      {row(predAway, actualAway, match.away_goals)}
    </div>
  )
}
