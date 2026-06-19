import { useEffect, useState } from 'react'
import { mapTeamName } from '../lib/supabase'

function norm(s){ return (s||'').toLowerCase().replace(/[^a-z]/g,'') }

// Shared ESPN live-score overlay. Pass the list of matches currently in view.
// Returns a map keyed by normalized "home|away" -> { home, away, clock, state }.
// Polls ESPN every 25s only while something is plausibly live (gated to save calls).
export function useEspnLive(matches) {
  const [espnLive, setEspnLive] = useState({})

  const anyLive = (matches || []).some(function(m){
    if (m.status === 'IN_PLAY' || m.status === 'PAUSED') return true
    if (m.status === 'SCHEDULED' && m.kickoff) {
      var ko = new Date(m.kickoff), now = new Date()
      if (now >= ko && now - ko < 2.5 * 60 * 60 * 1000) return true
    }
    return false
  })

  useEffect(function() {
    if (!anyLive) { setEspnLive({}); return }
    function pull() {
      var today = new Date()
      var dateStr = '' + today.getFullYear() + String(today.getMonth()+1).padStart(2,'0') + String(today.getDate()).padStart(2,'0')
      fetch('/api/live-scores?date=' + dateStr)
        .then(function(r){ return r.json() })
        .then(function(d){
          if (!d.ok || !d.matches) return
          var map = {}
          d.matches.forEach(function(em){
            if (em.state === 'in') {
              var h = mapTeamName(em.home), a = mapTeamName(em.away)
              map[norm(h)+'|'+norm(a)] = { home: em.homeScore, away: em.awayScore, clock: em.clock, state: em.state }
            }
          })
          setEspnLive(map)
        })
        .catch(function(){})
    }
    pull()
    var id = setInterval(pull, 25000)
    return function() { clearInterval(id) }
  }, [anyLive])

  return espnLive
}

// Given a match and the live map, return the effective score + live state.
// Live ESPN score takes precedence over a stale/absent DB score for in-progress matches.
export function effectiveScore(match, espnLive) {
  var key = norm(match.home_team) + '|' + norm(match.away_team)
  var live = espnLive && espnLive[key]
  var dbLive = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  var started = dbLive || (match.kickoff && new Date() >= new Date(match.kickoff))
  if (match.status === 'FINISHED' && match.home_goals != null) {
    return { home: match.home_goals, away: match.away_goals, isLive: false, isFinished: true, clock: null }
  }
  if (live) {
    return { home: live.home, away: live.away, isLive: true, isFinished: false, clock: live.clock }
  }
  if (match.home_goals != null) {
    return { home: match.home_goals, away: match.away_goals, isLive: dbLive, isFinished: false, clock: null }
  }
  return { home: null, away: null, isLive: false, isFinished: false, started: started, clock: null }
}
