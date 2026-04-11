import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { ACHIEVEMENTS, TIER_COLORS, computeAchievements, generateMatchCommentary } from '../lib/achievements'

const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']

// ── Bingo card ───────────────────────────────────────────────────────────────
function BingoCard({ player, predictions, matches }) {
  const preds = predictions.filter(p => p.player_id === player.id)
  const matchMap = Object.fromEntries(matches.map(m => [m.id, m]))

  // Pick up to 25 predictions that have a result
  const cells = preds.slice(0, 25).map(p => {
    const m = matchMap[p.match_id]
    if (!m) return null
    const hasResult = m.home_goals != null
    const predResult = Math.sign(p.home_goals - p.away_goals)
    const realResult = hasResult ? Math.sign(m.home_goals - m.away_goals) : null
    const isExact = hasResult && p.home_goals === m.home_goals && p.away_goals === m.away_goals
    const isCorrect = hasResult && predResult === realResult
    return {
      pred: `${p.home_goals}-${p.away_goals}`,
      result: hasResult ? `${m.home_goals}-${m.away_goals}` : null,
      isExact, isCorrect, hasResult,
      home: m.home_team?.slice(0, 3).toUpperCase(),
      away: m.away_team?.slice(0, 3).toUpperCase(),
    }
  }).filter(Boolean)

  while (cells.length < 25) cells.push(null)

  const SIZE = 5
  const grid = Array.from({ length: SIZE }, (_, r) => cells.slice(r * SIZE, r * SIZE + SIZE))

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${SIZE},1fr)`, gap:3 }}>
        {grid.flat().map((cell, i) => {
          if (!cell) return (
            <div key={i} style={{ aspectRatio:'1', background:'var(--c-surface2)', borderRadius:4, border:'1px solid var(--c-border)' }} />
          )
          const bg = cell.isExact ? 'rgba(240,165,0,0.25)' : cell.isCorrect ? 'rgba(34,197,94,0.15)' : cell.hasResult ? 'rgba(239,68,68,0.1)' : 'var(--c-surface2)'
          const border = cell.isExact ? '1px solid rgba(240,165,0,0.5)' : cell.isCorrect ? '1px solid rgba(34,197,94,0.3)' : cell.hasResult ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--c-border)'
          return (
            <div key={i} style={{ aspectRatio:'1', background:bg, border, borderRadius:4, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:2 }}>
              <div style={{ fontSize:8, color:'var(--c-muted)', lineHeight:1 }}>{cell.home} v {cell.away}</div>
              <div style={{ fontSize:10, fontWeight:700, fontFamily:'var(--font-display)', lineHeight:1.2, marginTop:1 }}>{cell.pred}</div>
              {cell.isExact && <div style={{ fontSize:7, color:'#f0a500' }}>EXACT</div>}
              {cell.isCorrect && !cell.isExact && <div style={{ fontSize:7, color:'#22c55e' }}>✓</div>}
              {cell.hasResult && !cell.isCorrect && <div style={{ fontSize:7, color:'#ef4444' }}>✗</div>}
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:8, marginTop:8, fontSize:11, color:'var(--c-muted)', flexWrap:'wrap' }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ width:10, height:10, background:'rgba(240,165,0,0.25)', border:'1px solid rgba(240,165,0,0.5)', borderRadius:2 }} /> Exact
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ width:10, height:10, background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:2 }} /> Correct
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <div style={{ width:10, height:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:2 }} /> Wrong
        </span>
      </div>
    </div>
  )
}

export default function Fun() {
  const { player, isAdmin } = usePlayer()
  const [tab, setTab] = useState('achievements')
  const [players, setPlayers] = useState([])
  const [scores, setScores] = useState([])
  const [predictions, setPredictions] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [commentaryMatch, setCommentaryMatch] = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: pl }, { data: sc }, { data: pr }, { data: ma }] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code','DEFAULT').order('created_at'),
      supabase.from('scores').select('*'),
      supabase.from('predictions').select('*'),
      supabase.from('matches').select('*').order('match_number'),
    ])
    setPlayers(pl || [])
    setScores(sc || [])
    setPredictions(pr || [])
    setMatches(ma || [])
    if (pl?.length) setSelectedPlayer(pl[0].id)
    setLoading(false)
  }

  // Build player stat objects
  const playerStats = useMemo(() => {
    return players.map((p, idx) => {
      const ps = scores.filter(s => s.player_id === p.id)
      const pp = predictions.filter(pr => pr.player_id === p.id)
      const total  = ps.reduce((a, s) => a + (s.pts_total || 0), 0)
      const correct= ps.filter(s => s.pts_result > 0 || s.pts_exact > 0).length
      const diff   = ps.filter(s => s.pts_diff > 0).length
      const exact  = ps.filter(s => s.pts_exact > 0).length
      const approx = ps.filter(s => s.pts_approx > 0).length
      const ko     = ps.filter(s => s.pts_ko_team > 0).length
      const preds  = pp.filter(p => p.home_goals != null).length

      // Draw stats
      const draws = pp.filter(pred => {
        const m = matches.find(m => m.id === pred.match_id)
        return m?.home_goals != null
          && Math.sign(pred.home_goals - pred.away_goals) === 0
          && Math.sign(m.home_goals - m.away_goals) === 0
      }).length

      const correct00 = pp.filter(pred => {
        const m = matches.find(m => m.id === pred.match_id)
        return m?.home_goals === 0 && m?.away_goals === 0 && pred.home_goals === 0 && pred.away_goals === 0
      }).length

      return { id:p.id, name:p.name, color:AVATAR_COLORS[idx % AVATAR_COLORS.length], total, correct, diff, exact, approx, ko, preds, draws, correct00 }
    })
  }, [players, scores, predictions, matches])

  const sorted = [...playerStats].sort((a,b) => b.total - a.total)

  // Head-to-head: for each match, who scored more points
  const h2h = useMemo(() => {
    if (playerStats.length < 2) return {}
    const matrix = {}
    for (const a of playerStats) {
      matrix[a.id] = {}
      for (const b of playerStats) {
        if (a.id === b.id) continue
        matrix[a.id][b.id] = { wins:0, losses:0, draws:0 }
      }
    }
    const finishedIds = new Set(matches.filter(m => m.home_goals != null).map(m => m.id))
    for (const matchId of finishedIds) {
      const matchScores = scores.filter(s => s.match_id === matchId)
      for (let i = 0; i < playerStats.length; i++) {
        for (let j = i+1; j < playerStats.length; j++) {
          const a = playerStats[i], b = playerStats[j]
          const aScore = matchScores.find(s => s.player_id === a.id)?.pts_total || 0
          const bScore = matchScores.find(s => s.player_id === b.id)?.pts_total || 0
          if (aScore > bScore) { matrix[a.id][b.id].wins++; matrix[b.id][a.id].losses++ }
          else if (bScore > aScore) { matrix[b.id][a.id].wins++; matrix[a.id][b.id].losses++ }
          else { matrix[a.id][b.id].draws++; matrix[b.id][a.id].draws++ }
        }
      }
    }
    return matrix
  }, [playerStats, scores, matches])

  // Commentary for finished matches
  const finishedMatches = matches.filter(m => m.home_goals != null).slice(-10).reverse()

  const commentaryLines = useMemo(() => {
    if (!commentaryMatch) return []
    const m = matches.find(x => x.id === commentaryMatch)
    if (!m) return []
    const preds = predictions
      .filter(p => p.match_id === commentaryMatch && p.home_goals != null)
      .map(p => ({
        ...p,
        name: players.find(pl => pl.id === p.player_id)?.name || 'Unknown'
      }))
    return generateMatchCommentary(m, preds)
  }, [commentaryMatch, predictions, matches, players])

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-header-inner"><h1>Fun Zone</h1></div></div>
      <div className="page-body"><p style={{color:'var(--c-muted)'}}>Loading...</p></div>
    </div>
  )

  const noData = playerStats.every(p => p.total === 0)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Fun Zone 🎪</h1>
          <p>Achievements, rivalries, bingo cards and match roasts</p>
        </div>
      </div>
      <div className="page-body">

        {noData && (
          <div className="alert alert-info" style={{marginBottom:'1.5rem'}}>
            Seed demo data from Admin → Dev tab to see everything come alive here.
          </div>
        )}

        <div className="tabs">
          <button className={`tab${tab==='achievements'?' active':''}`} onClick={()=>setTab('achievements')}>Achievements</button>
          <button className={`tab${tab==='h2h'?' active':''}`} onClick={()=>setTab('h2h')}>Rivalries</button>
          <button className={`tab${tab==='bingo'?' active':''}`} onClick={()=>setTab('bingo')}>Bingo cards</button>
          <button className={`tab${tab==='roast'?' active':''}`} onClick={()=>setTab('roast')}>Match roasts</button>
        </div>

        {/* ── ACHIEVEMENTS ── */}
        {tab === 'achievements' && (
          <div>
            {sorted.map((p, rank) => {
              const unlocked = computeAchievements(p, rank + 1, null)
              const locked = ACHIEVEMENTS.filter(a => !unlocked.find(u => u.id === a.id))
              return (
                <div key={p.id} className="card" style={{marginBottom:'1rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1rem'}}>
                    <div className="avatar" style={{background:`${p.color}22`,color:p.color,width:40,height:40,fontSize:14,fontWeight:700}}>
                      {p.name.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:600,fontSize:15}}>{p.name}</div>
                      <div style={{fontSize:12,color:'var(--c-muted)'}}>{unlocked.length} / {ACHIEVEMENTS.length} unlocked</div>
                    </div>
                    <div style={{marginLeft:'auto',fontFamily:'var(--font-display)',fontSize:28,color:p.color}}>{p.total} pts</div>
                  </div>

                  {/* Progress bar */}
                  <div style={{height:4,background:'var(--c-surface2)',borderRadius:2,overflow:'hidden',marginBottom:'1rem'}}>
                    <div style={{height:'100%',width:`${Math.round(unlocked.length/ACHIEVEMENTS.length*100)}%`,background:p.color,borderRadius:2,transition:'width 0.5s ease'}} />
                  </div>

                  {/* Unlocked badges */}
                  {unlocked.length > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom: locked.length > 0 ? '0.75rem' : 0}}>
                      {unlocked.map(a => {
                        const tc = TIER_COLORS[a.tier]
                        return (
                          <div key={a.id} title={a.desc} style={{
                            display:'flex',alignItems:'center',gap:6,
                            background:tc.bg,border:`1px solid ${tc.border}`,
                            borderRadius:20,padding:'5px 12px 5px 8px',
                            cursor:'default',
                          }}>
                            <span style={{fontSize:16}}>{a.icon}</span>
                            <div>
                              <div style={{fontSize:12,fontWeight:700,color:tc.text,lineHeight:1}}>{a.name}</div>
                              <div style={{fontSize:10,color:tc.text,opacity:0.7,lineHeight:1.3,maxWidth:160}}>{a.desc}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Locked badges (greyed out) */}
                  {locked.length > 0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {locked.map(a => (
                        <div key={a.id} title={`Locked: ${a.desc}`} style={{
                          display:'flex',alignItems:'center',gap:5,
                          background:'var(--c-surface2)',border:'1px solid var(--c-border)',
                          borderRadius:20,padding:'4px 10px 4px 7px',opacity:0.4,cursor:'default',
                        }}>
                          <span style={{fontSize:14,filter:'grayscale(1)'}}>{a.icon}</span>
                          <span style={{fontSize:11,color:'var(--c-muted)'}}>{a.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── RIVALRIES ── */}
        {tab === 'h2h' && (
          <div>
            <div className="card" style={{marginBottom:'1rem'}}>
              <div className="card-title">Head-to-head records</div>
              <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.6}}>
                Per match, who scored more points. Win = beat that person on that match's prediction.
              </p>
              <div style={{overflowX:'auto'}}>
                <table style={{minWidth:players.length * 90 + 140}}>
                  <thead>
                    <tr>
                      <th style={{position:'sticky',left:0,background:'var(--c-surface)',zIndex:2}}>Player</th>
                      {sorted.map((p,i) => (
                        <th key={p.id} style={{textAlign:'center',minWidth:80}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                            <div className="avatar" style={{width:24,height:24,fontSize:9,fontWeight:700,background:`${p.color}22`,color:p.color}}>
                              {p.name.slice(0,2).toUpperCase()}
                            </div>
                            <span style={{fontSize:10,color:'var(--c-muted)'}}>{p.name.split(' ')[0]}</span>
                          </div>
                        </th>
                      ))}
                      <th style={{textAlign:'center'}}>Total W</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(rowPlayer => {
                      const totalWins = sorted.filter(col => col.id !== rowPlayer.id && h2h[rowPlayer.id]?.[col.id]?.wins > h2h[rowPlayer.id]?.[col.id]?.losses).length
                      return (
                        <tr key={rowPlayer.id}>
                          <td style={{position:'sticky',left:0,background:'var(--c-surface)',zIndex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div className="avatar" style={{width:28,height:28,fontSize:10,fontWeight:700,background:`${rowPlayer.color}22`,color:rowPlayer.color}}>
                                {rowPlayer.name.slice(0,2).toUpperCase()}
                              </div>
                              <span style={{fontWeight:500,fontSize:13}}>{rowPlayer.name}</span>
                            </div>
                          </td>
                          {sorted.map(colPlayer => {
                            if (colPlayer.id === rowPlayer.id) return (
                              <td key={colPlayer.id} style={{textAlign:'center',background:'var(--c-surface2)',color:'var(--c-hint)'}}>—</td>
                            )
                            const rec = h2h[rowPlayer.id]?.[colPlayer.id]
                            if (!rec) return <td key={colPlayer.id} style={{textAlign:'center',color:'var(--c-hint)'}}>—</td>
                            const total = rec.wins + rec.losses + rec.draws
                            const isWinning = rec.wins > rec.losses
                            const isTied = rec.wins === rec.losses
                            return (
                              <td key={colPlayer.id} style={{
                                textAlign:'center',
                                background: total === 0 ? 'transparent' : isWinning ? 'rgba(34,197,94,0.07)' : isTied ? 'transparent' : 'rgba(239,68,68,0.07)',
                              }}>
                                {total === 0 ? <span style={{color:'var(--c-hint)'}}>—</span> : (
                                  <div>
                                    <span style={{fontWeight:700,fontSize:13,color: isWinning ? 'var(--c-success)' : isTied ? 'var(--c-muted)' : 'var(--c-danger)'}}>
                                      {rec.wins}W
                                    </span>
                                    <span style={{color:'var(--c-hint)',fontSize:11}}> / {rec.losses}L</span>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                          <td style={{textAlign:'center',fontFamily:'var(--font-display)',fontSize:20,color:rowPlayer.color}}>{totalWins}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Biggest rivalries */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Closest rivalries</div>
              {(() => {
                const pairs = []
                for (let i = 0; i < sorted.length; i++) {
                  for (let j = i+1; j < sorted.length; j++) {
                    const a = sorted[i], b = sorted[j]
                    const rec = h2h[a.id]?.[b.id]
                    if (!rec) continue
                    const total = rec.wins + rec.losses + rec.draws
                    if (total === 0) continue
                    const diff = Math.abs(rec.wins - rec.losses)
                    pairs.push({ a, b, rec, total, diff })
                  }
                }
                const closest = pairs.sort((x,y) => x.diff - y.diff || y.total - x.total).slice(0, 5)
                if (closest.length === 0) return <p style={{color:'var(--c-muted)',fontSize:13}}>Play some matches first.</p>
                return closest.map(({ a, b, rec, total }, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--c-border)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
                      <div className="avatar" style={{width:28,height:28,fontSize:10,background:`${a.color}22`,color:a.color}}>{a.name.slice(0,2).toUpperCase()}</div>
                      <span style={{fontSize:13,fontWeight:500}}>{a.name}</span>
                    </div>
                    <div style={{textAlign:'center',minWidth:80}}>
                      <div style={{fontFamily:'var(--font-display)',fontSize:18}}>{rec.wins} – {rec.losses}</div>
                      <div style={{fontSize:10,color:'var(--c-muted)'}}>{total} matches</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'flex-end'}}>
                      <span style={{fontSize:13,fontWeight:500}}>{b.name}</span>
                      <div className="avatar" style={{width:28,height:28,fontSize:10,background:`${b.color}22`,color:b.color}}>{b.name.slice(0,2).toUpperCase()}</div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {/* ── BINGO ── */}
        {tab === 'bingo' && (
          <div>
            {/* Player selector */}
            <div style={{display:'flex',gap:8,marginBottom:'1.25rem',flexWrap:'wrap'}}>
              {players.map((p, i) => (
                <button key={p.id}
                  onClick={() => setSelectedPlayer(p.id)}
                  style={{
                    padding:'6px 14px', borderRadius:20, border:'1px solid',
                    fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.12s',
                    background: selectedPlayer===p.id ? AVATAR_COLORS[i%AVATAR_COLORS.length] : 'transparent',
                    borderColor: selectedPlayer===p.id ? AVATAR_COLORS[i%AVATAR_COLORS.length] : 'var(--c-border)',
                    color: selectedPlayer===p.id ? '#fff' : 'var(--c-muted)',
                  }}>
                  {p.name}
                </button>
              ))}
            </div>

            {selectedPlayer && (() => {
              const p = players.find(x => x.id === selectedPlayer)
              const pi = players.findIndex(x => x.id === selectedPlayer)
              const stat = playerStats.find(s => s.id === selectedPlayer)
              return (
                <div className="card" style={{marginBottom:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1.25rem'}}>
                    <div className="avatar" style={{width:40,height:40,fontSize:14,fontWeight:700,background:`${AVATAR_COLORS[pi%AVATAR_COLORS.length]}22`,color:AVATAR_COLORS[pi%AVATAR_COLORS.length]}}>
                      {p?.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:600,fontSize:15}}>{p?.name}'s prediction card</div>
                      <div style={{fontSize:12,color:'var(--c-muted)'}}>{stat?.exact} exact · {stat?.correct} correct · {stat?.total} pts</div>
                    </div>
                  </div>
                  <BingoCard player={{ id: selectedPlayer }} predictions={predictions} matches={matches} />
                </div>
              )
            })()}
          </div>
        )}

        {/* ── ROASTS ── */}
        {tab === 'roast' && (
          <div>
            <div className="card" style={{marginBottom:'1rem'}}>
              <div className="card-title">Match roast generator</div>
              <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.6}}>
                Select a finished match to see who got roasted and who called it.
              </p>
              {finishedMatches.length === 0 && (
                <div className="alert alert-info">No finished matches yet. Enter some results first.</div>
              )}
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:'1rem'}}>
                {finishedMatches.map(m => (
                  <button key={m.id}
                    onClick={() => setCommentaryMatch(m.id)}
                    style={{
                      padding:'6px 12px', borderRadius:'var(--radius)', fontSize:12, fontWeight:600, cursor:'pointer',
                      border:'1px solid', transition:'all 0.12s',
                      background: commentaryMatch===m.id ? 'var(--c-accent)' : 'var(--c-surface2)',
                      borderColor: commentaryMatch===m.id ? 'var(--c-accent)' : 'var(--c-border)',
                      color: commentaryMatch===m.id ? '#fff' : 'var(--c-muted)',
                    }}>
                    {m.home_team} {m.home_goals}–{m.away_goals} {m.away_team}
                  </button>
                ))}
              </div>
            </div>

            {commentaryMatch && (
              <div className="card" style={{marginBottom:0}}>
                {(() => {
                  const m = matches.find(x => x.id === commentaryMatch)
                  return (
                    <div style={{marginBottom:'1rem',paddingBottom:'1rem',borderBottom:'1px solid var(--c-border)'}}>
                      <div style={{fontFamily:'var(--font-display)',fontSize:22,letterSpacing:'0.04em'}}>{m?.home_team} vs {m?.away_team}</div>
                      <div style={{fontFamily:'var(--font-display)',fontSize:36,color:'var(--c-accent)',marginTop:2}}>{m?.home_goals} – {m?.away_goals}</div>
                    </div>
                  )
                })()}

                {commentaryLines.length === 0 && (
                  <p style={{color:'var(--c-muted)',fontSize:13}}>No predictions for this match yet.</p>
                )}

                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {commentaryLines.map((line, i) => {
                    const p = players.find(x => x.name === line.name)
                    const pi = players.findIndex(x => x.name === line.name)
                    const color = pi >= 0 ? AVATAR_COLORS[pi % AVATAR_COLORS.length] : 'var(--c-muted)'
                    const bg = line.type==='exact' ? 'rgba(240,165,0,0.08)' : line.type==='correct' ? 'rgba(34,197,94,0.06)' : line.type==='nobody' ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.06)'
                    const border = line.type==='exact' ? '1px solid rgba(240,165,0,0.2)' : line.type==='correct' ? '1px solid rgba(34,197,94,0.15)' : '1px solid var(--c-border)'
                    const emoji = line.type==='exact' ? '💎' : line.type==='correct' ? '✅' : line.type==='close' ? '🤏' : line.type==='nobody' ? '😶' : '💀'
                    return (
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',borderRadius:'var(--radius)',background:bg,border}}>
                        <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{emoji}</span>
                        <div style={{flex:1}}>
                          {line.name && (
                            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                              <div className="avatar" style={{width:20,height:20,fontSize:8,fontWeight:700,background:`${color}22`,color}}>
                                {line.name.slice(0,2).toUpperCase()}
                              </div>
                              <span style={{fontSize:11,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.05em'}}>{line.name}</span>
                            </div>
                          )}
                          <p style={{fontSize:14,color:'var(--c-text)',lineHeight:1.5,margin:0}}>{line.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
