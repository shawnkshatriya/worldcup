import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { isKoBracketLocked, calcKoMatchPoints, getDefaultKoWeights } from '../lib/koBracket'
import { buildBracketLinkage, computePredictedTeams, KO_ROUND_ORDER, orderMatchesForBracket, orderSideMatches, BRACKET_SIDES } from '../lib/bracketLinkage'
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
  const [randomizing, setRandomizing] = useState(false)
  const saveTimers = useRef({})
  const predictionsRef = useRef({})
  predictionsRef.current = predictions

  useEffect(function() { loadAll() }, [player])

  // Flush any pending debounced saves on unmount (user navigates away quickly)
  useEffect(function() {
    return function() {
      Object.keys(saveTimers.current).forEach(function(mid){
        clearTimeout(saveTimers.current[mid])
        var cur = predictionsRef.current[mid]
        if (cur && cur.home_goals != null && cur.away_goals != null && player) {
          var payload = {
            player_id: player.id, match_id: parseInt(mid),
            home_goals: cur.home_goals, away_goals: cur.away_goals,
            submitted_at: new Date().toISOString(),
          }
          if (cur.home_goals === cur.away_goals) {
            payload.home_pens = cur.home_pens != null ? cur.home_pens : null
            payload.away_pens = cur.away_pens != null ? cur.away_pens : null
          }
          supabase.from('predictions').upsert(payload, { onConflict: 'player_id,match_id' })
        }
      })
    }
  }, [player])

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

  // Realistic-ish random scoreline (weighted toward low scores).
  function randGoals() {
    var r = Math.random()
    if (r < 0.30) return 0
    if (r < 0.62) return 1
    if (r < 0.85) return 2
    if (r < 0.96) return 3
    return 4
  }


  async function randomizeBracket() {
    if (bracketLocked || !player) return
    if (!window.confirm('Randomize your entire bracket? This replaces all your current picks and scores.')) return
    setRandomizing(true)
    try {
      // Walk rounds R32 -> Final, picking a winner for each match from the
      // teams predicted to be in it (cascading as we go), then a score where
      // the picked team wins. Build picks + predictions, then persist.
      var picks = {}
      var preds = {}
      var rounds = ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','FINAL']

      rounds.forEach(function(phase){
        var ms = matches.filter(function(m){ return m.phase === phase })
        ms.forEach(function(m){
          // Determine the two teams in this match from the cascade-so-far.
          var pt = computePredictedTeams(matches, linkage, picks)[m.id] || {}
          var home = pt.predHome || m.home_team
          var away = pt.predAway || m.away_team
          // Pick a side. If a side's team is still TBD (not yet qualified), we can
          // still pick the OTHER side if known; if BOTH are unknown we can't form a
          // meaningful pick, so skip (there's no team to advance).
          var pickHome
          if (home && away) pickHome = Math.random() < 0.5
          else if (home && !away) pickHome = true
          else if (!home && away) pickHome = false
          else return // both TBD - nothing to pick yet
          var winner = pickHome ? home : away
          if (!winner) return
          picks[m.id] = winner

          // Score where the winner wins (or a draw + pens won by the winner).
          var wg, lg, drawPens = null
          if (Math.random() < 0.18) {
            // Draw decided on penalties
            var dg = randGoals()
            wg = dg; lg = dg
            var pw = 3 + Math.floor(Math.random()*3) // 3-5
            var pl = Math.floor(Math.random()*pw)    // 0..pw-1
            drawPens = pickHome ? { h:pw, a:pl } : { h:pl, a:pw }
          } else {
            wg = 1 + randGoals() // winner scores >=1
            lg = Math.floor(Math.random() * wg) // loser strictly fewer
          }
          var hg = pickHome ? wg : lg
          var ag = pickHome ? lg : wg
          preds[m.id] = { home_goals: hg, away_goals: ag }
          if (drawPens) { preds[m.id].home_pens = drawPens.h; preds[m.id].away_pens = drawPens.a }
        })
      })

      // 3rd place: pick a random winner from its predicted teams too.
      var third = matches.find(function(m){ return m.phase === 'THIRD_PLACE' })
      if (third) {
        var tp = computePredictedTeams(matches, linkage, picks)[third.id] || {}
        if (tp.predHome && tp.predAway) {
          var th = Math.random() < 0.5
          picks[third.id] = th ? tp.predHome : tp.predAway
          var twg = 1 + randGoals(), tlg = Math.floor(Math.random()*twg)
          preds[third.id] = { home_goals: th?twg:tlg, away_goals: th?tlg:twg }
        }
      }

      // Persist: clear old, insert new picks + predictions.
      await supabase.from('ko_bracket_picks').delete().eq('player_id', player.id)
      var pickRows = Object.keys(picks).map(function(mid){
        return { player_id: player.id, match_id: parseInt(mid), picked_team: picks[mid], room_code: player.room_code, updated_at: new Date().toISOString() }
      })
      if (pickRows.length > 0) await supabase.from('ko_bracket_picks').insert(pickRows)

      var predRows = Object.keys(preds).map(function(mid){
        var p = preds[mid]
        return {
          player_id: player.id, match_id: parseInt(mid),
          home_goals: p.home_goals, away_goals: p.away_goals,
          home_pens: p.home_pens != null ? p.home_pens : null,
          away_pens: p.away_pens != null ? p.away_pens : null,
          submitted_at: new Date().toISOString(),
        }
      })
      for (var i = 0; i < predRows.length; i++) {
        await supabase.from('predictions').upsert(predRows[i], { onConflict: 'player_id,match_id' })
      }

      setBracketPicks(picks)
      setPredictions(preds)
      flashSaved('randomized')
    } finally {
      setRandomizing(false)
    }
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

      {/* Sticky extra-time reminder - prevents the #1 source of scoring confusion */}
      <div style={{
        position:'sticky', top:8, zIndex:20, marginBottom:14,
        background:'var(--c-banner-bg, linear-gradient(135deg,var(--c-accent) 0%,var(--c-accent2) 100%))',
        color:'var(--c-banner-text, #fff)',
        borderRadius:10, padding:'10px 14px', fontSize:12.5, fontWeight:600,
        boxShadow:'0 2px 10px rgba(0,0,0,0.18)', display:'flex', alignItems:'center', gap:8,
      }}>
        <span style={{fontSize:16}}>⏱️</span>
        <span>Heads up: scores count the <b>final result after extra time (120 min)</b> — not just 90 minutes. Penalties decide who advances but aren't part of the score.</span>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:6,background:'var(--c-surface2)',borderRadius:10,padding:4,width:'fit-content'}}>
          <button onClick={function(){ setView('bracket') }} style={tabStyle(view==='bracket')}>Bracket</button>
          <button onClick={function(){ setView('day') }} style={tabStyle(view==='day')}>By Day</button>
        </div>
        {player && !bracketLocked && (
          <button onClick={randomizeBracket} disabled={randomizing} style={{fontSize:12,padding:'7px 14px',borderRadius:8,border:'1px solid var(--c-border2)',cursor:randomizing?'default':'pointer',fontWeight:600,background:'var(--c-surface2)',color:'var(--c-text)',opacity:randomizing?0.6:1}}>
            {randomizing ? 'Randomizing…' : '🎲 Randomize'}
          </button>
        )}
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

function TeamRow({ predTeam, actualTeam, isPick, isWinner, canPick, onPick, showScore, finished, compact }) {
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
        display:'flex',alignItems:'center',gap: compact?4:7,padding: compact?'5px 6px':'7px 9px',borderRadius:7,
        cursor: canPick && predTeam ? 'pointer' : 'default',
        background: bg, border: '1.5px solid ' + borderC,
        opacity: isTBD ? 0.4 : 1,
        position:'relative',
      }}
    >
      {displayTeam && <Flag team={displayTeam} size="sm"/>}
      <span style={{flex:1,minWidth:0,fontWeight:600,fontSize: compact?10.5:13,color:textC,textDecoration: pickWasWrong ? 'line-through' : 'none', opacity: pickWasWrong ? 0.6 : 1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', letterSpacing: compact?'-0.01em':'normal'}}>
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
  var finished = match.status === 'FINISHED'
  var inPlay = (match.status === 'IN_PLAY' || match.status === 'PAUSED')
  var scoreLocked = isScoreLocked(match)

  var predHome = predicted ? predicted.predHome : match.home_team
  var predAway = predicted ? predicted.predAway : match.away_team
  var actualHome = match.home_team
  var actualAway = match.away_team

  var homeWon = finished && match.home_goals != null && match.home_goals > match.away_goals
  var awayWon = finished && match.home_goals != null && match.away_goals > match.home_goals

  var canPick = !bracketLocked && !finished && player

  // Consistency check: does the predicted score agree with the team picked to advance?
  // If you picked a team but your score (or penalties) has the OTHER team winning, warn.
  var scoreConflict = null
  if (bracketPick && hasBoth && (bracketPick === predHome || bracketPick === predAway)) {
    var pickIsHome = bracketPick === predHome
    if (pred.home_goals !== pred.away_goals) {
      // Decisive score - winner must be the picked team
      var scoreWinnerIsHome = pred.home_goals > pred.away_goals
      if (scoreWinnerIsHome !== pickIsHome) {
        scoreConflict = 'Your score has ' + (scoreWinnerIsHome ? predHome : predAway) + ' winning, but you picked ' + bracketPick + ' to advance.'
      }
    } else if (pred.home_pens != null && pred.away_pens != null && pred.home_pens !== pred.away_pens) {
      // Draw decided on penalties - pen winner must be the picked team
      var penWinnerIsHome = pred.home_pens > pred.away_pens
      if (penWinnerIsHome !== pickIsHome) {
        scoreConflict = 'Your penalty score has ' + (penWinnerIsHome ? predHome : predAway) + ' winning the shootout, but you picked ' + bracketPick + ' to advance.'
      }
    }
  }
  var scored = (finished && player) ? calcKoMatchPoints(match, pred, bracketPick, weights) : null

  return (
    <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:10,padding:compact?'6px 6px':'12px 14px',marginBottom:compact?8:12,position:'relative'}}>
      <TeamRow
        predTeam={predHome} actualTeam={actualHome}
        isPick={bracketPick && bracketPick === predHome && !finished}
        isWinner={homeWon} canPick={canPick} finished={finished} compact={compact}
        onPick={function(t){ pickTeam(match.id, t) }}
        showScore={match.home_goals != null ? match.home_goals : null}
      />
      <div style={{height:5}}/>
      <TeamRow
        predTeam={predAway} actualTeam={actualAway}
        isPick={bracketPick && bracketPick === predAway && !finished && predAway !== predHome}
        isWinner={awayWon} canPick={canPick} finished={finished} compact={compact}
        onPick={function(t){ pickTeam(match.id, t) }}
        showScore={match.away_goals != null ? match.away_goals : null}
      />

      {!finished && player && !scoreLocked && (
        <div style={{marginTop:9}}>
          <div style={{display:'flex',alignItems:'center',gap:7,justifyContent:'center'}}>
            <input type="number" min="0" max="20" value={pred.home_goals==null?'':pred.home_goals} placeholder="?" onChange={function(e){ updateScore(match.id,'home_goals',e.target.value) }} style={scoreInputStyle}/>
            <span style={{color:'var(--c-muted)',fontWeight:700,fontSize:13}}>-</span>
            <input type="number" min="0" max="20" value={pred.away_goals==null?'':pred.away_goals} placeholder="?" onChange={function(e){ updateScore(match.id,'away_goals',e.target.value) }} style={scoreInputStyle}/>
            {saved[match.id+'_score'] && <span style={{fontSize:10,color:'var(--c-success)'}}>OK</span>}
          </div>
          {/* Penalty shootout input - only when predicting a draw */}
          {hasBoth && pred.home_goals === pred.away_goals && (
            <div style={{marginTop:7,display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>
              <span style={{fontSize:10,color:'var(--c-hint)',fontWeight:600}}>PENS</span>
              <input type="number" min="0" max="20" value={pred.home_pens==null?'':pred.home_pens} placeholder="?" onChange={function(e){ updateScore(match.id,'home_pens',e.target.value) }} style={penInputStyle}/>
              <span style={{color:'var(--c-muted)',fontWeight:700,fontSize:11}}>-</span>
              <input type="number" min="0" max="20" value={pred.away_pens==null?'':pred.away_pens} placeholder="?" onChange={function(e){ updateScore(match.id,'away_pens',e.target.value) }} style={penInputStyle}/>
            </div>
          )}
        </div>
      )}
      {!finished && player && scoreLocked && hasBoth && (
        <div style={{marginTop:9,textAlign:'center'}}>
          <span style={{fontSize:10,color:'var(--c-muted)'}}>🔒 {pred.home_goals}-{pred.away_goals}{pred.home_pens!=null?' ('+pred.home_pens+'-'+pred.away_pens+' pens)':''}</span>
        </div>
      )}

      {scoreConflict && !finished && (
        <div style={{marginTop:8,padding:'6px 8px',background:'rgba(245,158,11,0.12)',border:'1px solid var(--c-warn)',borderRadius:6,fontSize:10.5,color:'var(--c-warn)',lineHeight:1.4,textAlign:'center'}}>
          ⚠️ {scoreConflict}
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

const SIDE_ROUNDS_L = ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS']
const SIDE_ROUNDS_R = ['SEMI_FINALS','QUARTER_FINALS','ROUND_OF_16','ROUND_OF_32']
const SIDE_LABELS = { ROUND_OF_32:'R32', ROUND_OF_16:'R16', QUARTER_FINALS:'QF', SEMI_FINALS:'SF', FINAL:'Final', THIRD_PLACE:'3rd' }

function BracketView({ matchesByPhase, thirdPlace, predictedTeams, ...shared }) {
  const scrollRef = useRef(null)
  var allMatches = []
  Object.keys(matchesByPhase).forEach(function(ph){ (matchesByPhase[ph]||[]).forEach(function(m){ allMatches.push(m) }) })
  thirdPlace.forEach(function(m){ allMatches.push(m) })

  function sideMatches(sideKey, phase) { return orderSideMatches(sideKey, phase, allMatches) }
  var finalMatch = (matchesByPhase['FINAL']||[])[0]

  function renderColumn(sideKey, phase, mirror) {
    var ms = sideMatches(sideKey, phase)
    if (ms.length === 0) return null
    return (
      <div key={sideKey+phase} className="bracket-col" style={{display:'flex',flexDirection:'column'}}>
        <div style={{fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-accent)',marginBottom:8,textAlign:'center'}}>{SIDE_LABELS[phase]}</div>
        <div style={{display:'flex',flexDirection:'column',justifyContent:'space-around',flex:1,gap:8}}>
          {ms.map(function(m){
            return <MatchCard key={m.id} match={m} predicted={predictedTeams[m.id]} bracketPick={shared.bracketPicks[m.id]} prediction={shared.predictions[m.id]} {...shared} compact={true}/>
          })}
        </div>
      </div>
    )
  }

  function connectorCol(sideKey, fromPhase) {
    var ms = sideMatches(sideKey, fromPhase)
    var pairs = Math.ceil(ms.length/2)
    if (pairs === 0) return null
    return (
      <div style={{display:'flex',flexDirection:'column',justifyContent:'space-around',width:13,paddingTop:24,flexShrink:0}}>
        {Array.from({length:pairs}).map(function(_,gi){
          return (
            <div key={gi} style={{flex:1,display:'flex',alignItems:'center',position:'relative'}}>
              <div style={{position:'absolute',left:0,top:'25%',width:5,height:1,background:'var(--c-bracket-line)'}}/>
              <div style={{position:'absolute',left:0,top:'75%',width:5,height:1,background:'var(--c-bracket-line)'}}/>
              <div style={{position:'absolute',left:5,top:'25%',height:'50%',width:1,background:'var(--c-bracket-line)'}}/>
              <div style={{position:'absolute',left:5,top:'50%',width:8,height:1,background:'var(--c-bracket-line)'}}/>
            </div>
          )
        })}
      </div>
    )
  }

  // LEFT half: R32 -> R16 -> QF -> SF  (left to right)
  var leftHalf = (
    <div style={{display:'flex',alignItems:'stretch',flex:'1 1 0',minWidth:0}}>
      {renderColumn('left','ROUND_OF_32')}
      {connectorCol('left','ROUND_OF_32')}
      {renderColumn('left','ROUND_OF_16')}
      {connectorCol('left','ROUND_OF_16')}
      {renderColumn('left','QUARTER_FINALS')}
      {connectorCol('left','QUARTER_FINALS')}
      {renderColumn('left','SEMI_FINALS')}
    </div>
  )

  function connectorColR(sideKey, fromPhase) {
    var ms = sideMatches(sideKey, fromPhase)
    var pairs = Math.ceil(ms.length/2)
    if (pairs === 0) return null
    return (
      <div style={{display:'flex',flexDirection:'column',justifyContent:'space-around',width:13,paddingTop:24,flexShrink:0}}>
        {Array.from({length:pairs}).map(function(_,gi){
          return (
            <div key={gi} style={{flex:1,display:'flex',alignItems:'center',position:'relative'}}>
              <div style={{position:'absolute',right:0,top:'25%',width:5,height:1,background:'var(--c-bracket-line)'}}/>
              <div style={{position:'absolute',right:0,top:'75%',width:5,height:1,background:'var(--c-bracket-line)'}}/>
              <div style={{position:'absolute',right:5,top:'25%',height:'50%',width:1,background:'var(--c-bracket-line)'}}/>
              <div style={{position:'absolute',right:5,top:'50%',width:8,height:1,background:'var(--c-bracket-line)'}}/>
            </div>
          )
        })}
      </div>
    )
  }

  // RIGHT half: SF <- QF <- R16 <- R32  (mirrored, connectors point left)
  var rightHalf = (
    <div style={{display:'flex',alignItems:'stretch',flex:'1 1 0',minWidth:0}}>
      {renderColumn('right','SEMI_FINALS')}
      {connectorColR('right','QUARTER_FINALS')}
      {renderColumn('right','QUARTER_FINALS')}
      {connectorColR('right','ROUND_OF_16')}
      {renderColumn('right','ROUND_OF_16')}
      {connectorColR('right','ROUND_OF_32')}
      {renderColumn('right','ROUND_OF_32')}
    </div>
  )

  // FINAL center column
  var center = finalMatch ? (
    <div style={{flex:'0 0 auto',width:120,display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 4px'}}>
      <div style={{fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:'0.1em',color:'#F0A500',marginBottom:8,textAlign:'center'}}>Final</div>
      <MatchCard match={finalMatch} predicted={predictedTeams[finalMatch.id]} bracketPick={shared.bracketPicks[finalMatch.id]} prediction={shared.predictions[finalMatch.id]} {...shared} compact={true}/>
      {thirdPlace.length>0 && (
        <div style={{marginTop:16}}>
          <div style={{fontWeight:700,fontSize:10,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-muted)',marginBottom:6,textAlign:'center'}}>3rd Place</div>
          {thirdPlace.map(function(m){
            return <MatchCard key={m.id} match={m} predicted={predictedTeams[m.id]} bracketPick={shared.bracketPicks[m.id]} prediction={shared.predictions[m.id]} {...shared} compact={true}/>
          })}
        </div>
      )}
    </div>
  ) : null

  return (
    <div>
      {/* Left/Right jump buttons - only useful on mobile where the bracket scrolls.
          Hidden on desktop (CSS) since both halves are visible at once. */}
      <div className="bracket-jump" style={{gap:6,marginBottom:12,justifyContent:'center'}}>
        <button onClick={function(){ if (scrollRef.current) scrollRef.current.scrollTo({left:0,behavior:'smooth'}) }} style={{fontSize:12,padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:600,background:'var(--c-surface2)',color:'var(--c-text)'}}>‹ Left side</button>
        <button onClick={function(){ if (scrollRef.current) scrollRef.current.scrollTo({left:scrollRef.current.scrollWidth,behavior:'smooth'}) }} style={{fontSize:12,padding:'5px 14px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:600,background:'var(--c-surface2)',color:'var(--c-text)'}}>Right side ›</button>
      </div>

      <div ref={scrollRef} style={{overflowX:'auto',paddingBottom:16}}>
        {/* Full mirrored bracket: left half + final + right half. Flexes to fit width. */}
        <div className="bracket-grid" style={{display:'flex',alignItems:'stretch',justifyContent:'center'}}>
          {leftHalf}
          {center}
          {rightHalf}
        </div>
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
