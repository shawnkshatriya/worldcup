import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { isKoBracketLocked, calcKoMatchPoints, getDefaultKoWeights } from '../lib/koBracket'
import { buildBracketLinkage, computePredictedTeams, KO_ROUND_ORDER, orderMatchesForBracket } from '../lib/bracketLinkage'
import { localTime, localDateShort } from '../lib/timeFormat'
import Flag from '../components/Flag'
import BracketShareCard from '../components/BracketShareCard'

const PHASE_LABELS = {
  ROUND_OF_32: 'Round of 32', ROUND_OF_16: 'Round of 16',
  QUARTER_FINALS: 'Quarterfinals', SEMI_FINALS: 'Semifinals',
  FINAL: 'Final', THIRD_PLACE: '3rd Place',
}
const LOCK_BUFFER_MS = 15 * 60 * 1000

function isScoreLocked(match) {
  if (!match) return true
  if (match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'FINISHED') return true
  if (match.kickoff) return new Date() >= new Date(new Date(match.kickoff).getTime() - LOCK_BUFFER_MS)
  return false
}

export default function KOBracket({ embedded }) {
  const { player } = usePlayer()
  const [matches, setMatches] = useState([])
  const [bracketPicks, setBracketPicks] = useState({})
  const [predictions, setPredictions] = useState({})
  const [saved, setSaved] = useState({})
  const [bracketLocked, setBracketLocked] = useState(false)
  const [view, setView] = useState('bracket')
  const [weights, setWeights] = useState(getDefaultKoWeights())
  const [loading, setLoading] = useState(true)
  const saveTimers = useRef({})

  useEffect(function() { loadAll() }, [player])

  async function loadAll() {
    setLoading(true)
    var [matchRes, lockedRes] = await Promise.all([
      supabase.from('matches').select('*')
        .in('phase', ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'])
        .order('match_number'),
      isKoBracketLocked(),
    ])
    var koMatches = matchRes.data || []
    setBracketLocked(lockedRes)
    setMatches(koMatches)

    if (player) {
      var matchIds = koMatches.map(function(m){ return m.id })
      var [picksRes, predRes, wRes] = await Promise.all([
        supabase.from('ko_bracket_picks').select('*').eq('player_id', player.id),
        supabase.from('predictions').select('*').eq('player_id', player.id).in('match_id', matchIds),
        supabase.from('scoring_weights').select('*').eq('room_code', player.room_code).maybeSingle(),
      ])
      var picksMap = {}
      ;(picksRes.data || []).forEach(function(p){ picksMap[p.match_id] = p.picked_team })
      setBracketPicks(picksMap)
      var predMap = {}
      ;(predRes.data || []).forEach(function(p){ predMap[p.match_id] = { home_goals: p.home_goals, away_goals: p.away_goals, home_pens: p.home_pens, away_pens: p.away_pens } })
      setPredictions(predMap)
      if (wRes.data) setWeights(wRes.data)
    }
    setLoading(false)
  }

  const linkage = useMemo(function(){ return buildBracketLinkage(matches) }, [matches])
  const predictedTeams = useMemo(function(){ return computePredictedTeams(matches, linkage, bracketPicks) }, [matches, linkage, bracketPicks])

  async function pickTeam(matchId, team) {
    if (bracketLocked || !player || !team) return
    var current = bracketPicks[matchId]
    var newPicks = { ...bracketPicks }

    if (current === team) {
      delete newPicks[matchId]
      clearDownstream(matchId, newPicks)
      setBracketPicks(newPicks)
      await supabase.from('ko_bracket_picks').delete().eq('player_id', player.id).eq('match_id', matchId)
      await persistDownstreamClears(matchId)
      flashSaved(matchId + '_pick')
      return
    }

    newPicks[matchId] = team
    if (current && current !== team) clearDownstream(matchId, newPicks)
    setBracketPicks(newPicks)

    await supabase.from('ko_bracket_picks').upsert({
      player_id: player.id, match_id: matchId, picked_team: team,
      room_code: player.room_code, updated_at: new Date().toISOString(),
    }, { onConflict: 'player_id,match_id' })
    if (current && current !== team) await persistDownstreamClears(matchId)
    flashSaved(matchId + '_pick')
  }

  function clearDownstream(matchId, picksObj) {
    var link = linkage[matchId]
    if (!link) return
    var nextId = link.feedsInto
    if (picksObj[nextId]) {
      delete picksObj[nextId]
      clearDownstream(nextId, picksObj)
    }
  }

  async function persistDownstreamClears(matchId) {
    var toDelete = []
    var cur = matchId
    while (linkage[cur]) {
      var nextId = linkage[cur].feedsInto
      toDelete.push(nextId)
      cur = nextId
    }
    if (toDelete.length > 0 && player) {
      await supabase.from('ko_bracket_picks').delete().eq('player_id', player.id).in('match_id', toDelete)
    }
  }

  function flashSaved(key) {
    setSaved(function(s){ return { ...s, [key]: true } })
    setTimeout(function(){ setSaved(function(s){ return { ...s, [key]: false } }) }, 1000)
  }

  function updateScore(matchId, field, val) {
    var n = val === '' ? null : Math.max(0, Math.min(20, Math.floor(Number(val))))
    if (val !== '' && isNaN(n)) return
    setPredictions(function(p){
      var next = { ...p, [matchId]: { ...(p[matchId]||{}), [field]: n } }
      var cur = next[matchId]
      if (cur && cur.home_goals != null && cur.away_goals != null) {
        if (saveTimers.current[matchId]) clearTimeout(saveTimers.current[matchId])
        saveTimers.current[matchId] = setTimeout(function(){ saveScore(matchId, cur) }, 800)
      }
      return next
    })
  }

  async function saveScore(matchId, cur) {
    if (!player) return
    var payload = {
      player_id: player.id, match_id: matchId,
      home_goals: cur.home_goals, away_goals: cur.away_goals,
      submitted_at: new Date().toISOString(),
    }
    // Only save penalty winner when the predicted 90-min score is a draw
    if (cur.home_goals != null && cur.home_goals === cur.away_goals) {
      payload.home_pens = cur.home_pens != null ? cur.home_pens : null
      payload.away_pens = cur.away_pens != null ? cur.away_pens : null
    } else {
      payload.home_pens = null
      payload.away_pens = null
    }
    var res = await supabase.from('predictions').upsert(payload, { onConflict: 'player_id,match_id' }).select()
    if (!res.error) flashSaved(matchId + '_score')
  }

  if (loading) return embedded
    ? <p style={{color:'var(--c-muted)',padding:'1rem'}}>Loading bracket...</p>
    : <div className="page-wrapper"><div className="page-header"><div className="page-header-inner"><h1>Knockout Bracket</h1></div></div><p style={{color:'var(--c-muted)',padding:'2rem'}}>Loading...</p></div>

  var matchesByPhase = {}
  KO_ROUND_ORDER.forEach(function(ph){ matchesByPhase[ph] = orderMatchesForBracket(ph, matches.filter(function(m){ return m.phase === ph })) })
  var thirdPlace = matches.filter(function(m){ return m.phase === 'THIRD_PLACE' })

  var shared = { bracketPicks, predictions, saved, bracketLocked, player, pickTeam, updateScore, saveScore, weights, predictedTeams }

  var body = (
    <>
      {!embedded && (
        <div className="page-header">
          <div className="page-header-inner">
            <h1>Knockout Bracket</h1>
            {bracketLocked
              ? <p style={{color:'var(--c-warn)',fontSize:12,fontWeight:600}}>Bracket locked - scores still editable until 15 min before each match</p>
              : <p>Pick winners - they advance through your bracket. Locks at first knockout kickoff.</p>
            }
          </div>
        </div>
      )}
      {embedded && (
        <p style={{fontSize:12,color:bracketLocked?'var(--c-warn)':'var(--c-muted)',marginBottom:12,fontWeight:bracketLocked?600:400}}>
          {bracketLocked
            ? 'Bracket locked - scores still editable until 15 min before each match'
            : 'Pick winners - they advance through your bracket. Locks at first knockout kickoff.'}
        </p>
      )}

      <div style={{display:'flex',gap:6,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:6,background:'var(--c-surface2)',borderRadius:10,padding:4,width:'fit-content'}}>
          <button onClick={function(){ setView('bracket') }} style={tabStyle(view==='bracket')}>Bracket</button>
          <button onClick={function(){ setView('day') }} style={tabStyle(view==='day')}>By Day</button>
        </div>
        {player && Object.keys(bracketPicks).length > 0 && (
          <div style={{marginLeft:'auto',minWidth:180}}>
            <BracketShareCard player={player} picks={bracketPicks} matchesByPhase={matchesByPhase} predictedTeams={predictedTeams}/>
          </div>
        )}
      </div>

      {view === 'day'
        ? <DayView matches={matches} {...shared}/>
        : <BracketView matchesByPhase={matchesByPhase} thirdPlace={thirdPlace} {...shared}/>
      }
    </>
  )

  if (embedded) return body

  return (
    <div className="page-wrapper">
      {body}
    </div>
  )
}


function tabStyle(active) {
  return { fontSize:13,padding:'6px 16px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:600,
    background:active?'var(--c-accent)':'transparent',color:active?'#fff':'var(--c-muted)' }
}

function TeamRow({ predTeam, actualTeam, isPick, isWinner, canPick, onPick, showScore, finished }) {
  // March Madness style: the slot shows YOUR predicted team (it fills the bracket).
  // Once results are in, color tells you if your pick was right or wrong.
  var displayTeam = predTeam || actualTeam
  var isTBD = !displayTeam
  // After the match: was your predicted team the one actually here, and did they win?
  var pickWasRight = finished && predTeam && actualTeam && predTeam === actualTeam
  var pickWasWrong = finished && predTeam && actualTeam && predTeam !== actualTeam

  var bg = 'var(--c-surface2)', borderC = 'transparent', textC = 'var(--c-text)'
  if (isPick && !finished) { bg = 'var(--c-accent)'; borderC = 'var(--c-accent)'; textC = '#fff' }
  else if (isWinner) { bg = 'rgba(34,197,94,0.14)'; borderC = '#22c55e' }
  else if (finished && actualTeam) { bg = 'var(--c-surface2)' }

  return (
    <div
      onClick={function(){ if (canPick && predTeam) onPick(predTeam) }}
      style={{
        display:'flex',alignItems:'center',gap:7,padding:'7px 9px',borderRadius:7,
        cursor: canPick && predTeam ? 'pointer' : 'default',
        background: bg, border: '1.5px solid ' + borderC,
        opacity: isTBD ? 0.4 : 1,
        position:'relative',
      }}
    >
      {displayTeam && <Flag team={displayTeam} size="sm"/>}
      <span style={{flex:1,fontWeight:600,fontSize:13,color:textC,textDecoration: pickWasWrong ? 'line-through' : 'none', opacity: pickWasWrong ? 0.6 : 1}}>
        {displayTeam || 'TBD'}
      </span>
      {pickWasRight && <span style={{fontSize:11,color:'#22c55e',fontWeight:700}}>✓</span>}
      {pickWasWrong && actualTeam && <span style={{fontSize:9,color:'var(--c-hint)'}}>→ {actualTeam}</span>}
      {showScore != null && <span style={{fontWeight:700,fontFamily:'var(--font-display)',fontSize:15,color:textC}}>{showScore}</span>}
    </div>
  )
}

function MatchCard({ match, predicted, bracketPick, prediction, saved, bracketLocked, player, pickTeam, updateScore, saveScore, weights, compact }) {
  if (!match) return null
  var pred = prediction || {}
  var hasBoth = pred.home_goals != null && pred.away_goals != null
  var finished = match.status === 'FINISHED' || match.home_goals != null
  var scoreLocked = isScoreLocked(match)

  var predHome = predicted ? predicted.predHome : match.home_team
  var predAway = predicted ? predicted.predAway : match.away_team
  var actualHome = match.home_team
  var actualAway = match.away_team

  var homeWon = match.home_goals != null && match.home_goals > match.away_goals
  var awayWon = match.home_goals != null && match.away_goals > match.home_goals

  var canPick = !bracketLocked && !finished && player
  var scored = (finished && player) ? calcKoMatchPoints(match, pred, bracketPick, weights) : null

  return (
    <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:11,padding:compact?'8px 10px':'12px 14px',marginBottom:compact?8:12,position:'relative'}}>
      <TeamRow
        predTeam={predHome} actualTeam={actualHome}
        isPick={bracketPick && bracketPick === predHome && !finished}
        isWinner={homeWon} canPick={canPick} finished={finished}
        onPick={function(t){ pickTeam(match.id, t) }}
        showScore={match.home_goals != null ? match.home_goals : null}
      />
      <div style={{height:5}}/>
      <TeamRow
        predTeam={predAway} actualTeam={actualAway}
        isPick={bracketPick && bracketPick === predAway && !finished && predAway !== predHome}
        isWinner={awayWon} canPick={canPick} finished={finished}
        onPick={function(t){ pickTeam(match.id, t) }}
        showScore={match.away_goals != null ? match.away_goals : null}
      />

      {!finished && player && !scoreLocked && (
        <div style={{marginTop:9}}>
          <div style={{display:'flex',alignItems:'center',gap:7,justifyContent:'center'}}>
            <input type="number" min="0" max="20" value={pred.home_goals==null?'':pred.home_goals} placeholder="?" onChange={function(e){ updateScore(match.id,'home_goals',e.target.value) }} onBlur={function(){ if (hasBoth) saveScore(match.id,pred) }} style={scoreInputStyle}/>
            <span style={{color:'var(--c-muted)',fontWeight:700,fontSize:13}}>-</span>
            <input type="number" min="0" max="20" value={pred.away_goals==null?'':pred.away_goals} placeholder="?" onChange={function(e){ updateScore(match.id,'away_goals',e.target.value) }} onBlur={function(){ if (hasBoth) saveScore(match.id,pred) }} style={scoreInputStyle}/>
            {saved[match.id+'_score'] && <span style={{fontSize:10,color:'var(--c-success)'}}>OK</span>}
          </div>
          {/* Penalty shootout input - only when predicting a draw */}
          {hasBoth && pred.home_goals === pred.away_goals && (
            <div style={{marginTop:7,display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
              <span style={{fontSize:10,color:'var(--c-hint)',fontWeight:600}}>PENS</span>
              <input type="number" min="0" max="20" value={pred.home_pens==null?'':pred.home_pens} placeholder="?" onChange={function(e){ updateScore(match.id,'home_pens',e.target.value) }} onBlur={function(){ saveScore(match.id,pred) }} style={penInputStyle}/>
              <span style={{color:'var(--c-muted)',fontWeight:700,fontSize:11}}>-</span>
              <input type="number" min="0" max="20" value={pred.away_pens==null?'':pred.away_pens} placeholder="?" onChange={function(e){ updateScore(match.id,'away_pens',e.target.value) }} onBlur={function(){ saveScore(match.id,pred) }} style={penInputStyle}/>
            </div>
          )}
        </div>
      )}
      {!finished && player && scoreLocked && hasBoth && (
        <div style={{marginTop:9,textAlign:'center'}}>
          <span style={{fontSize:10,color:'var(--c-muted)'}}>🔒 {pred.home_goals}-{pred.away_goals}{pred.home_pens!=null?' ('+pred.home_pens+'-'+pred.away_pens+' pens)':''}</span>
        </div>
      )}

      {finished && hasBoth && (
        <div style={{marginTop:7,textAlign:'center',fontSize:10,color:'var(--c-muted)'}}>
          Predicted {pred.home_goals}-{pred.away_goals}
          {scored && scored.pts_total > 0 && <span style={{marginLeft:5,color:'var(--c-success)',fontWeight:700}}>+{scored.pts_total}</span>}
        </div>
      )}

      {match.kickoff && !finished && (
        <div style={{marginTop:5,textAlign:'center',fontSize:9,color:'var(--c-hint)'}}>{localDateShort(match.kickoff)} - {localTime(match.kickoff)}</div>
      )}
      {saved[match.id+'_pick'] && <div style={{position:'absolute',top:6,right:8,fontSize:9,color:'var(--c-success)',fontWeight:700}}>OK</div>}
    </div>
  )
}

const scoreInputStyle = { width:40,textAlign:'center',fontSize:15,fontFamily:'var(--font-display)',padding:'3px',borderRadius:6,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-text)' }
const penInputStyle = { width:32,textAlign:'center',fontSize:12,fontFamily:'var(--font-display)',padding:'2px',borderRadius:5,border:'1px dashed var(--c-border)',background:'var(--c-surface2)',color:'var(--c-text)' }

function BracketView({ matchesByPhase, thirdPlace, predictedTeams, ...shared }) {
  return (
    <div style={{overflowX:'auto',paddingBottom:16}}>
      <div style={{display:'flex',gap:20,minWidth:'fit-content',alignItems:'stretch',paddingBottom:8}}>
        {KO_ROUND_ORDER.map(function(phase){
          var ms = matchesByPhase[phase] || []
          if (ms.length === 0) return null
          return (
            <div key={phase} style={{minWidth:210,maxWidth:230,display:'flex',flexDirection:'column'}}>
              <div style={{fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-accent)',marginBottom:10,textAlign:'center'}}>{PHASE_LABELS[phase]}</div>
              <div style={{display:'flex',flexDirection:'column',justifyContent:'space-around',flex:1,gap:8}}>
                {ms.map(function(m){
                  return <MatchCard key={m.id} match={m} predicted={predictedTeams[m.id]} bracketPick={shared.bracketPicks[m.id]} prediction={shared.predictions[m.id]} {...shared} compact={true}/>
                })}
              </div>
            </div>
          )
        })}
        {thirdPlace.length > 0 && (
          <div style={{minWidth:210,maxWidth:230}}>
            <div style={{fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-muted)',marginBottom:10,textAlign:'center'}}>{PHASE_LABELS['THIRD_PLACE']}</div>
            {thirdPlace.map(function(m){
              return <MatchCard key={m.id} match={m} predicted={predictedTeams[m.id]} bracketPick={shared.bracketPicks[m.id]} prediction={shared.predictions[m.id]} {...shared} compact={true}/>
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function DayView({ matches, predictedTeams, ...shared }) {
  var byDay = {}
  matches.forEach(function(m){
    var label = m.kickoff ? new Date(m.kickoff).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}) : 'TBD'
    if (!byDay[label]) byDay[label] = []
    byDay[label].push(m)
  })
  var days = Object.keys(byDay).sort(function(a,b){ return new Date(a)-new Date(b) })
  return (
    <div>
      {days.map(function(day){
        return (
          <div key={day} style={{marginBottom:24}}>
            <div style={{fontWeight:700,fontSize:13,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--c-accent)',marginBottom:10,padding:'6px 0',borderBottom:'1px solid var(--c-border)'}}>{day}</div>
            {byDay[day].map(function(m){
              return <MatchCard key={m.id} match={m} predicted={predictedTeams[m.id]} bracketPick={shared.bracketPicks[m.id]} prediction={shared.predictions[m.id]} {...shared}/>
            })}
          </div>
        )
      })}
    </div>
  )
}
