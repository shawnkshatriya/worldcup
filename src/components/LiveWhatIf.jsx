import { useEffect, useState } from 'react'
import { supabase, calcMatchPoints } from '../lib/supabase'

// Default scoring weights (match the room defaults)
var DEFAULT_WEIGHTS = {
  group_result: 3, group_diff: 2, group_exact: 4, group_approx: 1,
  ko_result: 3, ko_diff: 4, ko_exact: 5,
}

// Given the current live score, propose a few plausible "final" outcomes from here.
function scenariosFromScore(rh, ra) {
  var base = [
    { h: rh, a: ra, label: 'Stays ' + rh + '-' + ra },
    { h: rh + 1, a: ra, label: 'Home scores → ' + (rh+1) + '-' + ra },
    { h: rh, a: ra + 1, label: 'Away scores → ' + rh + '-' + (ra+1) },
    { h: rh + 1, a: ra + 1, label: 'Both score → ' + (rh+1) + '-' + (ra+1) },
  ]
  // dedupe
  var seen = {}
  return base.filter(function(s){ var k=s.h+'_'+s.a; if(seen[k]) return false; seen[k]=true; return true })
}

export default function LiveWhatIf({ match, player, roomCode }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(function() {
    if (!match || !player) return
    let cancelled = false

    async function load() {
      setLoading(true)
      // 1. Room players
      var { data: players } = await supabase.from('players').select('id,name').eq('room_code', roomCode).limit(500)
      if (!players) { setLoading(false); return }
      var ids = players.map(function(p){ return p.id })

      // 2. Current totals (paginated, room-scoped)
      var scores = []
      var from = 0
      while (true) {
        var page = await supabase.from('scores').select('player_id,pts_total').in('player_id', ids).range(from, from+999)
        if (!page.data || page.data.length === 0) break
        scores = scores.concat(page.data)
        if (page.data.length < 1000) break
        from += 1000
      }
      var totals = {}
      players.forEach(function(p){ totals[p.id] = 0 })
      scores.forEach(function(s){ totals[s.player_id] = (totals[s.player_id]||0) + (s.pts_total||0) })

      // 3. Everyone's prediction for THIS match only
      var { data: preds } = await supabase.from('predictions')
        .select('player_id,home_goals,away_goals,submitted_at,id')
        .eq('match_id', match.id)
        .in('player_id', ids)
      var predByPlayer = {}
      ;(preds||[]).forEach(function(p){
        var ex = predByPlayer[p.player_id]
        if (!ex) { predByPlayer[p.player_id] = p; return }
        // Deterministic: prefer scored row, then latest submitted, then highest id
        var pScore = p.home_goals != null, exScore = ex.home_goals != null
        if (pScore && !exScore) { predByPlayer[p.player_id] = p; return }
        if (!pScore && exScore) return
        var pt = new Date(p.submitted_at||0).getTime(), et = new Date(ex.submitted_at||0).getTime()
        if (pt > et || (pt === et && String(p.id) > String(ex.id))) predByPlayer[p.player_id] = p
      })

      // 4. Current points already counted for this match (so we don't double-count if live score is in scores table)
      var { data: existingMatchScores } = await supabase.from('scores')
        .select('player_id,pts_total').eq('match_id', match.id).in('player_id', ids)
      var alreadyCounted = {}
      ;(existingMatchScores||[]).forEach(function(s){ alreadyCounted[s.player_id] = s.pts_total||0 })

      if (cancelled) return

      var nameById = {}
      players.forEach(function(p){ nameById[p.id] = p.name })

      setData({ players, totals, predByPlayer, alreadyCounted, nameById })
      setLoading(false)
    }
    load()
    return function(){ cancelled = true }
  }, [match && match.id, player && player.id, roomCode])

  if (!match || !player) return null
  if (loading) return <div style={{fontSize:11,color:'var(--c-hint)',padding:'4px 0'}}>Calculating projections…</div>
  if (!data) return null

  var rh = match.home_goals != null ? match.home_goals : 0
  var ra = match.away_goals != null ? match.away_goals : 0
  var scenarios = scenariosFromScore(rh, ra)
  var phase = match.phase

  // Baseline ranks (current totals, minus any points already counted for this live match,
  // so projections start from a clean "match not yet scored" baseline)
  function projectRank(outcomeH, outcomeA) {
    var result = { home_goals: outcomeH, away_goals: outcomeA }
    var projected = data.players.map(function(p) {
      var base = (data.totals[p.id] || 0) - (data.alreadyCounted[p.id] || 0)
      var pred = data.predByPlayer[p.id]
      var add = 0
      if (pred && pred.home_goals != null) {
        var pts = calcMatchPoints(pred, result, DEFAULT_WEIGHTS, phase)
        if (pts) add = pts.pts_total
      }
      return { id: p.id, total: base + add, gained: add }
    }).sort(function(a,b){ return b.total - a.total })

    var rank = projected.findIndex(function(x){ return x.id === player.id }) + 1
    var mine = projected.find(function(x){ return x.id === player.id })
    return { rank: rank, gained: mine ? mine.gained : 0 }
  }

  var myPick = data.predByPlayer[player.id]

  return (
    <div style={{padding:'8px 12px',background:'var(--c-surface2)',borderRadius:8,margin:'0 8px 8px'}}>
      <div style={{fontSize:11,fontWeight:700,color:'var(--c-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>
        📊 What this means for you
      </div>
      {!myPick || myPick.home_goals == null ? (
        <div style={{fontSize:12,color:'var(--c-hint)'}}>You didn't predict this match.</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          {scenarios.map(function(s, i) {
            var proj = projectRank(s.h, s.a)
            var isMyPick = myPick.home_goals === s.h && myPick.away_goals === s.a
            return (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12}}>
                <span style={{color: isMyPick ? 'var(--c-accent)' : 'var(--c-text)', fontWeight: isMyPick ? 700 : 400}}>
                  {s.label}{isMyPick ? ' 🎯' : ''}
                </span>
                <span style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{color:proj.gained>0?'var(--c-success)':'var(--c-muted)'}}>{proj.gained>0?'+'+proj.gained:'0'} pts</span>
                  <span style={{fontFamily:'var(--font-display)',fontSize:14,color:'var(--c-accent)',minWidth:28,textAlign:'right'}}>#{proj.rank}</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
