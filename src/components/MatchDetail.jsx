import { useEffect, useState } from 'react'

// Displays ESPN match detail (goalscorers, stats, lineups). Garnish only.
// Fails silently if ESPN is unavailable - scores still work without it.
export default function MatchDetail({ match }) {
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  useEffect(function() {
    if (!match) return
    let cancelled = false
    setLoading(true)

    var dateStr = ''
    if (match.kickoff) {
      var d = new Date(match.kickoff)
      dateStr = '' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0')
    }
    var url = '/api/match-detail?home=' + encodeURIComponent(match.home_team) +
              '&away=' + encodeURIComponent(match.away_team) +
              (dateStr ? '&date=' + dateStr : '')

    fetch(url)
      .then(function(r){ return r.json() })
      .then(function(d){ if (!cancelled) { setDetail(d.ok ? d : null); setLoading(false) } })
      .catch(function(){ if (!cancelled) { setDetail(null); setLoading(false) } })

    return function(){ cancelled = true }
  }, [match && match.id])

  if (loading) return <div style={{fontSize:11,color:'var(--c-hint)',padding:'8px 12px'}}>Loading match details…</div>
  if (!detail) return <div style={{fontSize:11,color:'var(--c-hint)',padding:'8px 12px'}}>Match details unavailable.</div>

  var hasGoals = detail.goals && detail.goals.length > 0
  var hasStats = detail.stats && detail.stats.length > 0
  var hasLineups = detail.lineups && detail.lineups.length === 2

  return (
    <div style={{padding:'8px 12px 12px',background:'var(--c-surface2)',borderRadius:8,margin:'0 8px 8px',fontSize:12}}>
      {/* Goals */}
      {hasGoals && (
        <div style={{marginBottom:hasStats||hasLineups?12:0}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>⚽ Goals</div>
          {detail.goals.map(function(g, i) {
            return (
              <div key={i} style={{display:'flex',gap:8,padding:'3px 0',color:'var(--c-text)'}}>
                <span style={{color:'var(--c-accent)',fontWeight:700,minWidth:36}}>{g.minute}</span>
                <span style={{flex:1}}>{g.player}{g.ownGoal?' (OG)':''}{g.penalty?' (P)':''}</span>
                <span style={{color:'var(--c-muted)',fontSize:10}}>{g.team}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      {hasStats && (
        <div style={{marginBottom:hasLineups?12:0}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>📊 Match stats</div>
          {detail.stats.slice(0,8).map(function(s, i) {
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'2px 0'}}>
                <span style={{width:40,textAlign:'right',fontWeight:600}}>{s.home}</span>
                <span style={{flex:1,textAlign:'center',color:'var(--c-muted)',fontSize:10}}>{s.label}</span>
                <span style={{width:40,fontWeight:600}}>{s.away}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Lineups */}
      {hasLineups && (
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>👥 Lineups</div>
          <div style={{display:'flex',gap:12}}>
            {detail.lineups.map(function(l, i) {
              return (
                <div key={i} style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:11,marginBottom:4}}>{l.team} {l.formation?'('+l.formation+')':''}</div>
                  {(l.starters||[]).map(function(p, j) {
                    return <div key={j} style={{fontSize:10,color:'var(--c-muted)',padding:'1px 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.pos} · {p.name}</div>
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!hasGoals && !hasStats && !hasLineups && (
        <div style={{fontSize:11,color:'var(--c-hint)'}}>No detail available yet for this match.</div>
      )}
    </div>
  )
}
