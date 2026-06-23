import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { isKoBracketLocked, calcKoMatchPoints, getDefaultKoWeights } from '../lib/koBracket'
import { localTime, localDateShort } from '../lib/timeFormat'
import Flag from '../components/Flag'

const KO_PHASES_ORDERED = ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','FINAL']
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

export default function KOBracket() {
  const { player } = usePlayer()
  const [matches, setMatches] = useState([])
  const [bracketPicks, setBracketPicks] = useState({}) // matchId -> picked_team
  const [predictions, setPredictions] = useState({}) // matchId -> {home_goals, away_goals}
  const [saved, setSaved] = useState({})
  const [bracketLocked, setBracketLocked] = useState(false)
  const [view, setView] = useState('bracket') // 'bracket' | 'day'
  const [weights, setWeights] = useState(getDefaultKoWeights())
  const [loading, setLoading] = useState(true)
  const saveTimers = useRef({})

  useEffect(function() {
    loadAll()
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
      ;(predRes.data || []).forEach(function(p){ predMap[p.match_id] = { home_goals: p.home_goals, away_goals: p.away_goals } })
      setPredictions(predMap)
      if (wRes.data) setWeights(wRes.data)
    }
    setLoading(false)
  }

  async function pickTeam(matchId, team) {
    if (bracketLocked || !player) return
    var current = bracketPicks[matchId]
    if (current === team) {
      // Tapping the already-selected team unselects it
      setBracketPicks(function(p){ var n = { ...p }; delete n[matchId]; return n })
      await supabase.from('ko_bracket_picks').delete().eq('player_id', player.id).eq('match_id', matchId)
      setSaved(function(s){ return { ...s, [matchId + '_pick']: true } })
      setTimeout(function(){ setSaved(function(s){ return { ...s, [matchId + '_pick']: false } }) }, 1000)
      return
    }
    setBracketPicks(function(p){ return { ...p, [matchId]: team } })
    await supabase.from('ko_bracket_picks').upsert({
      player_id: player.id, match_id: matchId, picked_team: team,
      room_code: player.room_code, updated_at: new Date().toISOString(),
    }, { onConflict: 'player_id,match_id' })
    setSaved(function(s){ return { ...s, [matchId + '_pick']: true } })
    setTimeout(function(){ setSaved(function(s){ return { ...s, [matchId + '_pick']: false } }) }, 1000)
  }

  function updateScore(matchId, field, val) {
    var n = val === '' ? null : Math.max(0, Math.min(20, Math.floor(Number(val))))
    if (val !== '' && isNaN(n)) return
    setPredictions(function(p){
      var next = { ...p, [matchId]: { ...(p[matchId]||{}), [field]: n } }
      var cur = next[matchId]
      if (cur && cur.home_goals != null && cur.away_goals != null) {
        if (saveTimers.current[matchId]) clearTimeout(saveTimers.current[matchId])
        saveTimers.current[matchId] = setTimeout(function(){ saveScore(matchId, cur.home_goals, cur.away_goals) }, 800)
      }
      return next
    })
  }

  async function saveScore(matchId, h, a) {
    if (!player) return
    var res = await supabase.from('predictions').upsert({
      player_id: player.id, match_id: matchId,
      home_goals: h, away_goals: a,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'player_id,match_id' }).select()
    if (!res.error) {
      setSaved(function(s){ return { ...s, [matchId + '_score']: true } })
      setTimeout(function(){ setSaved(function(s){ return { ...s, [matchId + '_score']: false } }) }, 1500)
    }
  }

  if (loading) return <div className="page-wrapper"><div className="page-header"><div className="page-header-inner"><h1>Knockout Bracket</h1></div></div><p style={{color:'var(--c-muted)',padding:'2rem'}}>Loading...</p></div>

  var koPhases = KO_PHASES_ORDERED
  var thirdPlace = matches.filter(function(m){ return m.phase === 'THIRD_PLACE' })
  var matchesByPhase = {}
  koPhases.forEach(function(ph){ matchesByPhase[ph] = matches.filter(function(m){ return m.phase === ph }) })

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Knockout Bracket</h1>
          {bracketLocked
            ? <p style={{color:'var(--c-warn)',fontSize:12,fontWeight:600}}>🔒 Team picks locked — scores still editable 15 min before each match</p>
            : <p>Pick the winner of each match. Scores can be updated until 15 min before kickoff.</p>
          }
        </div>
      </div>

      {/* View toggle */}
      <div style={{display:'flex',gap:6,marginBottom:16,background:'var(--c-surface2)',borderRadius:10,padding:4,width:'fit-content'}}>
        <button onClick={function(){ setView('bracket') }} style={{fontSize:13,padding:'6px 16px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:600,background:view==='bracket'?'var(--c-accent)':'transparent',color:view==='bracket'?'#fff':'var(--c-muted)'}}>🏆 Bracket</button>
        <button onClick={function(){ setView('day') }} style={{fontSize:13,padding:'6px 16px',borderRadius:7,border:'none',cursor:'pointer',fontWeight:600,background:view==='day'?'var(--c-accent)':'transparent',color:view==='day'?'#fff':'var(--c-muted)'}}>📅 By Day</button>
      </div>

      {view === 'day' ? (
        <DayView matches={matches} bracketPicks={bracketPicks} predictions={predictions} saved={saved} bracketLocked={bracketLocked} player={player} pickTeam={pickTeam} updateScore={updateScore} saveScore={saveScore} weights={weights}/>
      ) : (
        <BracketView matches={matches} matchesByPhase={matchesByPhase} thirdPlace={thirdPlace} bracketPicks={bracketPicks} predictions={predictions} saved={saved} bracketLocked={bracketLocked} player={player} pickTeam={pickTeam} updateScore={updateScore} saveScore={saveScore} weights={weights}/>
      )}
    </div>
  )
}

function MatchCard({ match, bracketPick, prediction, saved, bracketLocked, player, pickTeam, updateScore, saveScore, weights, compact }) {
  if (!match) return null
  var scoreLocked = isScoreLocked(match)
  var pred = prediction || {}
  var hasBoth = pred.home_goals != null && pred.away_goals != null
  var pick = bracketPick

  // Actual result
  var homeWon = match.home_goals != null && match.home_goals > match.away_goals
  var awayWon = match.home_goals != null && match.away_goals > match.home_goals
  var finished = match.status === 'FINISHED' || match.home_goals != null

  // Score if we have both teams and a result
  var scored = null
  if (finished && player) {
    scored = calcKoMatchPoints(match, pred, pick, weights)
  }

  var homeTBD = !match.home_team
  var awayTBD = !match.away_team
  // Only highlight the side whose team matches the pick. Guard against identical names.
  var sameTeams = match.home_team && match.home_team === match.away_team
  var homeSelected = !!(pick && pick === match.home_team)
  var awaySelected = !!(pick && pick === match.away_team && !sameTeams && pick !== match.home_team)

  return (
    <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:12,padding:compact?'10px 12px':'14px 16px',marginBottom:compact?8:12,position:'relative'}}>

      {/* Teams */}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {/* Home team */}
        <div
          onClick={function(){ if (!bracketLocked && match.home_team && !finished) pickTeam(match.id, match.home_team) }}
          style={{
            display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,cursor:!bracketLocked&&match.home_team&&!finished?'pointer':'default',
            background: homeSelected ? 'var(--c-accent)' : homeWon ? 'rgba(34,197,94,0.1)' : 'var(--c-surface2)',
            border: homeSelected ? '1.5px solid var(--c-accent)' : homeWon ? '1.5px solid #22c55e' : '1.5px solid transparent',
            opacity: homeTBD ? 0.4 : 1,
          }}
        >
          {match.home_team && <Flag team={match.home_team} size="sm"/>}
          <span style={{flex:1,fontWeight:600,fontSize:14,color:homeSelected?'#fff':'var(--c-text)'}}>{match.home_team || 'TBD'}</span>
          {match.home_goals != null && <span style={{fontWeight:700,fontFamily:'var(--font-display)',fontSize:16,color:homeSelected?'#fff':'var(--c-text)'}}>{match.home_goals}</span>}
          {homeSelected && !finished && <span style={{fontSize:10,color:'rgba(255,255,255,0.8)'}}>✓ your pick</span>}
        </div>

        {/* Away team */}
        <div
          onClick={function(){ if (!bracketLocked && match.away_team && !finished) pickTeam(match.id, match.away_team) }}
          style={{
            display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,cursor:!bracketLocked&&match.away_team&&!finished?'pointer':'default',
            background: awaySelected ? 'var(--c-accent)' : awayWon ? 'rgba(34,197,94,0.1)' : 'var(--c-surface2)',
            border: awaySelected ? '1.5px solid var(--c-accent)' : awayWon ? '1.5px solid #22c55e' : '1.5px solid transparent',
            opacity: awayTBD ? 0.4 : 1,
          }}
        >
          {match.away_team && <Flag team={match.away_team} size="sm"/>}
          <span style={{flex:1,fontWeight:600,fontSize:14,color:awaySelected?'#fff':'var(--c-text)'}}>{match.away_team || 'TBD'}</span>
          {match.away_goals != null && <span style={{fontWeight:700,fontFamily:'var(--font-display)',fontSize:16,color:awaySelected?'#fff':'var(--c-text)'}}>{match.away_goals}</span>}
          {awaySelected && !finished && <span style={{fontSize:10,color:'rgba(255,255,255,0.8)'}}>✓ your pick</span>}
        </div>
      </div>

      {/* Score prediction (if both teams known, not finished, and score not locked) */}
      {match.home_team && match.away_team && !finished && player && (
        <div style={{marginTop:10,display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}>
          {scoreLocked ? (
            <span style={{fontSize:11,color:'var(--c-muted)'}}>🔒 {hasBoth ? `Your score: ${pred.home_goals}-${pred.away_goals}` : 'Score locked'}</span>
          ) : (
            <>
              <input type="number" min="0" max="20" value={pred.home_goals??''} placeholder="?" onChange={function(e){ updateScore(match.id,'home_goals',e.target.value) }} onBlur={function(){ if (hasBoth) saveScore(match.id,pred.home_goals,pred.away_goals) }} style={{width:44,textAlign:'center',fontSize:16,fontFamily:'var(--font-display)',padding:'4px',borderRadius:6,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-text)'}}/>
              <span style={{color:'var(--c-muted)',fontWeight:700}}>-</span>
              <input type="number" min="0" max="20" value={pred.away_goals??''} placeholder="?" onChange={function(e){ updateScore(match.id,'away_goals',e.target.value) }} onBlur={function(){ if (hasBoth) saveScore(match.id,pred.home_goals,pred.away_goals) }} style={{width:44,textAlign:'center',fontSize:16,fontFamily:'var(--font-display)',padding:'4px',borderRadius:6,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-text)'}}/>
              {saved[match.id+'_score'] && <span style={{fontSize:10,color:'var(--c-success)'}}>✓</span>}
            </>
          )}
        </div>
      )}

      {/* Show predicted score when finished */}
      {finished && hasBoth && (
        <div style={{marginTop:8,textAlign:'center',fontSize:11,color:'var(--c-muted)'}}>
          Your prediction: {pred.home_goals}-{pred.away_goals}
          {scored && scored.pts_total > 0 && <span style={{marginLeft:6,color:'var(--c-success)',fontWeight:700}}>+{scored.pts_total}pts</span>}
        </div>
      )}

      {/* Kickoff time */}
      {match.kickoff && !finished && (
        <div style={{marginTop:6,textAlign:'center',fontSize:10,color:'var(--c-hint)'}}>{localDateShort(match.kickoff)} · {localTime(match.kickoff)}</div>
      )}

      {/* Pick saved indicator */}
      {saved[match.id+'_pick'] && <div style={{position:'absolute',top:8,right:8,fontSize:10,color:'var(--c-success)',fontWeight:700}}>✓ Saved</div>}
    </div>
  )
}

function BracketView({ matches, matchesByPhase, thirdPlace, bracketPicks, predictions, saved, bracketLocked, player, pickTeam, updateScore, saveScore, weights }) {
  return (
    <div style={{overflowX:'auto',paddingBottom:16}}>
      <div style={{display:'flex',gap:16,minWidth:'fit-content',alignItems:'flex-start',paddingBottom:8}}>
        {KO_PHASES_ORDERED.map(function(phase){
          var ms = matchesByPhase[phase] || []
          if (ms.length === 0) return null
          return (
            <div key={phase} style={{minWidth:220,maxWidth:240}}>
              <div style={{fontWeight:700,fontSize:12,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-accent)',marginBottom:10,textAlign:'center'}}>{PHASE_LABELS[phase]}</div>
              <div style={{display:'flex',flexDirection:'column',justifyContent:'space-around',gap:8}}>
                {ms.map(function(m){
                  return <MatchCard key={m.id} match={m} bracketPick={bracketPicks[m.id]} prediction={predictions[m.id]} saved={saved} bracketLocked={bracketLocked} player={player} pickTeam={pickTeam} updateScore={updateScore} saveScore={saveScore} weights={weights} compact={true}/>
                })}
              </div>
            </div>
          )
        })}
        {/* 3rd place separate column */}
        {thirdPlace.length > 0 && (
          <div style={{minWidth:220,maxWidth:240}}>
            <div style={{fontWeight:700,fontSize:12,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-muted)',marginBottom:10,textAlign:'center'}}>{PHASE_LABELS['THIRD_PLACE']}</div>
            {thirdPlace.map(function(m){
              return <MatchCard key={m.id} match={m} bracketPick={bracketPicks[m.id]} prediction={predictions[m.id]} saved={saved} bracketLocked={bracketLocked} player={player} pickTeam={pickTeam} updateScore={updateScore} saveScore={saveScore} weights={weights} compact={true}/>
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function DayView({ matches, bracketPicks, predictions, saved, bracketLocked, player, pickTeam, updateScore, saveScore, weights }) {
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
              return <MatchCard key={m.id} match={m} bracketPick={bracketPicks[m.id]} prediction={predictions[m.id]} saved={saved} bracketLocked={bracketLocked} player={player} pickTeam={pickTeam} updateScore={updateScore} saveScore={saveScore} weights={weights}/>
            })}
          </div>
        )
      })}
    </div>
  )
}
