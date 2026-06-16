import { useMemo } from 'react'

// Helper: chronological finished matches
function chronological(matches) {
  return matches.filter(m => m.home_goals != null)
    .sort((a,b) => new Date(a.kickoff||0) - new Date(b.kickoff||0))
}

export default function StatsInsights({ players, scores, matches, predictions }) {
  const data = useMemo(() => {
    const finished = chronological(matches)
    const finishedIds = finished.map(m => String(m.id))
    const scoreByPM = {} // player_match -> score row
    scores.forEach(s => { scoreByPM[s.player_id + '_' + s.match_id] = s })

    // Per-player computed insights
    const perPlayer = players.map(p => {
      // chronological points sequence over finished matches
      let curStreak = 0, bestStreak = 0
      let last5 = []
      let exactCount = 0, approxPts = 0, narrowMisses = 0
      finished.forEach(m => {
        const sc = scoreByPM[p.id + '_' + m.id]
        const pts = sc ? sc.pts_total : 0
        const gotResult = sc && (sc.pts_result > 0 || sc.pts_exact > 0)
        if (gotResult) { curStreak++; bestStreak = Math.max(bestStreak, curStreak) }
        else curStreak = 0
        last5.push(pts)
        if (sc && sc.pts_exact > 0) exactCount++
        if (sc) approxPts += (sc.pts_approx || 0)
        // narrow miss: got result but not exact, and was 1 goal off both ways tracked via approx already; approximate "unlucky" = correct result but missed diff+exact
        if (gotResult && sc.pts_exact === 0 && sc.pts_diff === 0) narrowMisses++
      })
      const recent5 = last5.slice(-5)
      const recentForm = recent5.reduce((a,b)=>a+b, 0)
      const total = last5.reduce((a,b)=>a+b, 0)
      return {
        ...p,
        currentStreak: curStreak,
        bestStreak,
        recentForm,
        recent5,
        exactCount,
        approxPts,
        narrowMisses,
        total,
      }
    })

    // Power rankings: sort by recent form (last 5 matches points)
    const powerRankings = [...perPlayer].sort((a,b) => b.recentForm - a.recentForm).slice(0, 10)

    // Streaks: best current streaks
    const streaks = [...perPlayer].filter(p => p.currentStreak > 0).sort((a,b) => b.currentStreak - a.currentStreak).slice(0, 8)

    // Luckiest: most approx bonus points. Unluckiest: most narrow misses
    const luckiest = [...perPlayer].filter(p => p.approxPts > 0).sort((a,b) => b.approxPts - a.approxPts).slice(0, 5)
    const unluckiest = [...perPlayer].filter(p => p.narrowMisses > 0).sort((a,b) => b.narrowMisses - a.narrowMisses).slice(0, 5)

    // Consensus vs you: matches where the crowd majority result was wrong but some got it right
    // Compute per finished match the pool's majority predicted result
    const contrarianWins = [] // { match, players: [...], crowdPick }
    finished.forEach(m => {
      const preds = predictions.filter(pr => String(pr.match_id) === String(m.id) && pr.home_goals != null)
      if (preds.length < 3) return
      let h=0,d=0,a=0
      preds.forEach(pr => {
        if (pr.home_goals > pr.away_goals) h++
        else if (pr.home_goals < pr.away_goals) a++
        else d++
      })
      const realResult = m.home_goals > m.away_goals ? 'h' : m.home_goals < m.away_goals ? 'a' : 'd'
      const crowdPick = h>=d && h>=a ? 'h' : a>=d && a>=h ? 'a' : 'd'
      // contrarian win = crowd was wrong, but a minority got the right result
      if (crowdPick !== realResult) {
        const winners = preds.filter(pr => {
          const r = pr.home_goals > pr.away_goals ? 'h' : pr.home_goals < pr.away_goals ? 'a' : 'd'
          return r === realResult
        })
        if (winners.length > 0 && winners.length < preds.length / 2) {
          const nameById = {}
          players.forEach(pl => nameById[pl.id] = pl.name)
          contrarianWins.push({
            match: m,
            crowdPick: crowdPick === 'h' ? m.home_team : crowdPick === 'a' ? m.away_team : 'Draw',
            winnerNames: winners.map(w => nameById[w.player_id]).filter(Boolean),
          })
        }
      }
    })
    contrarianWins.reverse() // most recent first

    // Weekly MVP: most points in the current calendar week (Mon-Sun)
    const now = new Date()
    const day = now.getDay() // 0=Sun
    const daysSinceMon = (day + 6) % 7
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysSinceMon)
    weekStart.setHours(0,0,0,0)
    const thisWeekMatchIds = new Set(finished.filter(m => new Date(m.kickoff||0) >= weekStart).map(m => String(m.id)))
    const weeklyPoints = players.map(p => {
      let wpts = 0
      thisWeekMatchIds.forEach(mid => {
        const sc = scoreByPM[p.id + '_' + mid]
        if (sc) wpts += (sc.pts_total || 0)
      })
      return { ...p, weeklyPoints: wpts }
    }).filter(p => p.weeklyPoints > 0).sort((a,b) => b.weeklyPoints - a.weeklyPoints).slice(0, 5)

    return { powerRankings, streaks, luckiest, unluckiest, contrarianWins, perPlayer, weeklyPoints }
  }, [players, scores, matches, predictions])

  const { powerRankings, streaks, luckiest, unluckiest, contrarianWins, weeklyPoints } = data

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>

      {/* Weekly MVP */}
      {weeklyPoints.length > 0 && (
        <div className="card" style={{marginBottom:0,border:'1px solid var(--c-accent)'}}>
          <div className="card-title">🏆 This week's MVP</div>
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0'}}>
            <div style={{fontSize:40}}>👑</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:24,color:'var(--c-accent)'}}>{weeklyPoints[0].name}</div>
              <div style={{fontSize:12,color:'var(--c-muted)'}}>{weeklyPoints[0].weeklyPoints} points this week</div>
            </div>
          </div>
          {weeklyPoints.slice(1).map((p,i) => (
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderTop:'1px solid var(--c-border)',fontSize:13}}>
              <span style={{color:'var(--c-muted)'}}>{i+2}. {p.name}</span>
              <span style={{fontWeight:600}}>{p.weeklyPoints} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* Power Rankings */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">🔥 Power rankings</div>
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:-8,marginBottom:12}}>Who's hot — points from the last 5 finished matches</p>
        {powerRankings.length === 0 ? <p style={{fontSize:13,color:'var(--c-hint)'}}>No matches played yet.</p> :
          powerRankings.map((p,i) => (
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<powerRankings.length-1?'1px solid var(--c-border)':'none',fontSize:13}}>
              <span style={{width:20,fontFamily:'var(--font-display)',fontSize:15,color:i===0?'var(--c-gold)':'var(--c-muted)',textAlign:'center'}}>{i+1}</span>
              <span style={{flex:1,fontWeight:600}}>{p.name}</span>
              <span style={{display:'flex',gap:3}}>
                {p.recent5.map((pts,j) => (
                  <span key={j} style={{width:8,height:8,borderRadius:2,background:pts>0?(pts>=5?'var(--c-success)':'var(--c-accent2)'):'var(--c-surface3)'}} title={pts+' pts'}/>
                ))}
              </span>
              <span style={{fontFamily:'var(--font-display)',fontSize:16,color:'var(--c-accent)',width:36,textAlign:'right'}}>{p.recentForm}</span>
            </div>
          ))
        }
      </div>

      {/* Streaks */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">⚡ Hot streaks</div>
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:-8,marginBottom:12}}>Consecutive matches with the correct result</p>
        {streaks.length === 0 ? <p style={{fontSize:13,color:'var(--c-hint)'}}>No active streaks.</p> :
          streaks.map((p,i) => (
            <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:i<streaks.length-1?'1px solid var(--c-border)':'none',fontSize:13}}>
              <span style={{fontWeight:600}}>{p.name}</span>
              <span style={{color:'var(--c-accent)',fontWeight:700}}>
                {p.currentStreak} {'🔥'.repeat(Math.min(p.currentStreak,5))}
              </span>
            </div>
          ))
        }
      </div>

      {/* Luckiest / Unluckiest */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">🍀 Luckiest</div>
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:-8,marginBottom:12}}>Most points from approximation bonuses</p>
        {luckiest.length === 0 ? <p style={{fontSize:13,color:'var(--c-hint)'}}>No approx bonuses yet.</p> :
          luckiest.map((p,i) => (
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:i<luckiest.length-1?'1px solid var(--c-border)':'none',fontSize:13}}>
              <span>{p.name}</span><span style={{color:'var(--c-success)',fontWeight:700}}>+{p.approxPts} pts</span>
            </div>
          ))
        }
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">😬 Hard luck</div>
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:-8,marginBottom:12}}>Most "right team, wrong score" results</p>
        {unluckiest.length === 0 ? <p style={{fontSize:13,color:'var(--c-hint)'}}>Nothing yet.</p> :
          unluckiest.map((p,i) => (
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:i<unluckiest.length-1?'1px solid var(--c-border)':'none',fontSize:13}}>
              <span>{p.name}</span><span style={{color:'var(--c-muted)',fontWeight:700}}>{p.narrowMisses}x</span>
            </div>
          ))
        }
      </div>

      {/* Contrarian wins */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">🎲 Against the crowd</div>
        <p style={{fontSize:11,color:'var(--c-muted)',marginTop:-8,marginBottom:12}}>Matches where the pool favored the wrong result</p>
        {contrarianWins.length === 0 ? <p style={{fontSize:13,color:'var(--c-hint)'}}>No upsets against the crowd yet.</p> :
          contrarianWins.slice(0,6).map((c,i) => (
            <div key={i} style={{padding:'8px 0',borderBottom:i<Math.min(contrarianWins.length,6)-1?'1px solid var(--c-border)':'none',fontSize:12}}>
              <div style={{fontWeight:600,marginBottom:2}}>{c.match.home_team} {c.match.home_goals}-{c.match.away_goals} {c.match.away_team}</div>
              <div style={{color:'var(--c-muted)'}}>Crowd picked {c.crowdPick}. Nailed by: <span style={{color:'var(--c-accent)'}}>{c.winnerNames.join(', ')}</span></div>
            </div>
          ))
        }
      </div>

    </div>
  )
}
