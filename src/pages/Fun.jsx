import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { ACHIEVEMENTS, TIER_COLORS, computeAchievements, generateMatchCommentary } from '../lib/achievements'

const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']

function BingoCard({ playerId, predictions, matches }) {
  const preds = predictions.filter(p => p.player_id === playerId && p.home_goals != null)
  const matchMap = Object.fromEntries(matches.map(m => [m.id, m]))
  const SIZE = 5

  const cells = preds.slice(0, SIZE * SIZE).map(p => {
    const m = matchMap[p.match_id]
    if (!m) return null
    const hasResult  = m.home_goals != null
    const predDir    = Math.sign(p.home_goals - p.away_goals)
    const realDir    = hasResult ? Math.sign(m.home_goals - m.away_goals) : null
    const isExact    = hasResult && p.home_goals === m.home_goals && p.away_goals === m.away_goals
    const isCorrect  = hasResult && predDir === realDir
    const isWrong    = hasResult && !isCorrect
    return { p, m, isExact, isCorrect, isWrong, hasResult,
      home: m.home_team?.slice(0,3).toUpperCase() || '?',
      away: m.away_team?.slice(0,3).toUpperCase() || '?',
    }
  }).filter(Boolean)

  while (cells.length < SIZE * SIZE) cells.push(null)
  const grid = Array.from({length: SIZE}, (_,r) => cells.slice(r*SIZE, r*SIZE+SIZE))

  return (
    <div>
      <div style={{display:'grid', gridTemplateColumns:`repeat(${SIZE},1fr)`, gap:3, marginBottom:10}}>
        {grid.flat().map((cell, i) => {
          if (!cell) return (
            <div key={i} style={{aspectRatio:'1', background:'var(--c-surface2)', borderRadius:4, border:'1px solid var(--c-border)'}} />
          )
          const bg     = cell.isExact   ? 'rgba(240,165,0,0.28)'   : cell.isCorrect ? 'rgba(34,197,94,0.18)'  : cell.isWrong ? 'rgba(239,68,68,0.14)' : 'var(--c-surface2)'
          const border = cell.isExact   ? '1.5px solid rgba(240,165,0,0.6)' : cell.isCorrect ? '1.5px solid rgba(34,197,94,0.4)' : cell.isWrong ? '1.5px solid rgba(239,68,68,0.3)' : '1px solid var(--c-border)'
          const textCol= cell.isExact   ? '#F0A500' : cell.isCorrect ? '#22C55E' : cell.isWrong ? '#EF4444' : 'var(--c-muted)'
          const tick   = cell.isExact   ? '💎' : cell.isCorrect ? '✓' : cell.isWrong ? '✗' : ''
          return (
            <div key={i} style={{aspectRatio:'1', background:bg, border, borderRadius:4, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:2, position:'relative'}}>
              {tick && <div style={{position:'absolute',top:2,right:3,fontSize:cell.isExact?9:8,color:textCol,fontWeight:700}}>{tick}</div>}
              <div style={{fontSize:7, color:'var(--c-muted)', lineHeight:1}}>{cell.home} v {cell.away}</div>
              <div style={{fontSize:10, fontWeight:700, fontFamily:'var(--font-display)', lineHeight:1.2, color:textCol}}>{cell.p.home_goals}-{cell.p.away_goals}</div>
              {cell.hasResult && <div style={{fontSize:7, color:'var(--c-hint)'}}>{cell.m.home_goals}-{cell.m.away_goals}</div>}
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',gap:12,fontSize:11,color:'var(--c-muted)',flexWrap:'wrap'}}>
        {[
          {bg:'rgba(240,165,0,0.28)',  border:'1.5px solid rgba(240,165,0,0.6)',  label:'💎 Exact score'},
          {bg:'rgba(34,197,94,0.18)',  border:'1.5px solid rgba(34,197,94,0.4)',  label:'✓ Correct result'},
          {bg:'rgba(239,68,68,0.14)',  border:'1.5px solid rgba(239,68,68,0.3)',  label:'✗ Wrong'},
          {bg:'var(--c-surface2)',     border:'1px solid var(--c-border)',         label:'Upcoming'},
        ].map(l=>(
          <span key={l.label} style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:12,height:12,background:l.bg,border:l.border,borderRadius:2,flexShrink:0}}/>
            {l.label}
          </span>
        ))}
      </div>
      <p style={{fontSize:11,color:'var(--c-hint)',marginTop:6}}>Top row = your predicted score · Bottom row = actual result</p>
    </div>
  )
}

export default function Fun() {
  const { player, isAdmin } = usePlayer()
  const [tab, setTab]           = useState('achievements')
  const [players, setPlayers]   = useState([])
  const [scores, setScores]     = useState([])
  const [predictions, setPreds] = useState([])
  const [matches, setMatches]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [selectedPlayer, setSP] = useState(null)
  const [commentMatch, setCM]   = useState(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data:pl },{ data:sc },{ data:pr },{ data:ma }] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code','DEFAULT').limit(500).order('created_at').limit(500),
      supabase.from('scores').select('*').limit(5000),
      supabase.from('predictions').select('*').limit(5000),
      supabase.from('matches').select('*').order('match_number').limit(200),
    ])
    setPlayers(pl||[])
    setScores(sc||[])
    setPreds(pr||[])
    setMatches(ma||[])
    if (pl?.length) setSP(pl[0].id)
    setLoading(false)
  }

  const playerStats = useMemo(() => players.map((p,idx) => {
    const ps = scores.filter(s=>s.player_id===p.id)
    const pp = predictions.filter(pr=>pr.player_id===p.id&&pr.home_goals!=null)
    const draws = pp.filter(pred=>{
      const m=matches.find(m=>m.id===pred.match_id)
      return m?.home_goals!=null&&Math.sign(pred.home_goals-pred.away_goals)===0&&Math.sign(m.home_goals-m.away_goals)===0
    }).length
    const correct00 = pp.filter(pred=>{
      const m=matches.find(m=>m.id===pred.match_id)
      return m?.home_goals===0&&m?.away_goals===0&&pred.home_goals===0&&pred.away_goals===0
    }).length
    return {
      id:p.id, name:p.name, color:AVATAR_COLORS[idx%AVATAR_COLORS.length],
      total:ps.reduce((a,s)=>a+(s.pts_total||0),0),
      correct:ps.filter(s=>s.pts_result>0||s.pts_exact>0).length,
      diff:ps.filter(s=>s.pts_diff>0).length,
      exact:ps.filter(s=>s.pts_exact>0).length,
      approx:ps.filter(s=>s.pts_approx>0).length,
      ko:ps.filter(s=>s.pts_ko_team>0).length,
      preds:pp.length, scored:ps.length, draws, correct00,
    }
  }), [players, scores, predictions, matches])

  const sorted = [...playerStats].sort((a,b)=>b.total-a.total)

  // Head-to-head per match
  const h2h = useMemo(() => {
    const matrix = {}
    players.forEach(a => { matrix[a.id]={}; players.forEach(b => { if(a.id!==b.id) matrix[a.id][b.id]={wins:0,losses:0,draws:0} }) })
    const finishedIds = new Set(matches.filter(m=>m.home_goals!=null).map(m=>m.id))
    for (const matchId of finishedIds) {
      const ms = scores.filter(s=>s.match_id===matchId)
      for (let i=0;i<playerStats.length;i++) for (let j=i+1;j<playerStats.length;j++) {
        const a=playerStats[i],b=playerStats[j]
        const as=ms.find(s=>s.player_id===a.id)?.pts_total||0
        const bs=ms.find(s=>s.player_id===b.id)?.pts_total||0
        if(as>bs){matrix[a.id][b.id].wins++;matrix[b.id][a.id].losses++}
        else if(bs>as){matrix[b.id][a.id].wins++;matrix[a.id][b.id].losses++}
        else{matrix[a.id][b.id].draws++;matrix[b.id][a.id].draws++}
      }
    }
    return matrix
  }, [playerStats, scores, matches])

  const finishedMatches = matches.filter(m=>m.home_goals!=null).slice(-15).reverse()

  const commentLines = useMemo(() => {
    if (!commentMatch) return []
    const m = matches.find(x=>x.id===commentMatch)
    if (!m) return []
    const preds = predictions
      .filter(p=>p.match_id===commentMatch&&p.home_goals!=null)
      .map(p=>({
        hg: p.home_goals,
        ag: p.away_goals,
        name: players.find(pl=>pl.id===p.player_id)?.name||'Unknown'
      }))
    return generateMatchCommentary(m, preds)
  }, [commentMatch, predictions, matches, players])

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-header-inner"><h1>Fun Zone 🎪</h1></div></div>
      <div className="page-body"><p style={{color:'var(--c-muted)'}}>Loading...</p></div>
    </div>
  )

  const noData = playerStats.every(p=>p.total===0)

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
            Seed demo data from <strong>Admin → Dev tab</strong> to see everything come alive here.
          </div>
        )}

        <div className="tabs">
          <button className={`tab${tab==='achievements'?' active':''}`} onClick={()=>setTab('achievements')}>Achievements</button>
          <button className={`tab${tab==='h2h'?' active':''}`} onClick={()=>setTab('h2h')}>Rivalries</button>
          <button className={`tab${tab==='bingo'?' active':''}`} onClick={()=>setTab('bingo')}>Bingo cards</button>
          <button className={`tab${tab==='roast'?' active':''}`} onClick={()=>setTab('roast')}>Match roasts</button>
        </div>

        {/* ACHIEVEMENTS */}
        {tab==='achievements' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            {sorted.map((p,rank) => {
              const unlocked = computeAchievements(p, rank+1, null)
              const locked   = ACHIEVEMENTS.filter(a=>!unlocked.find(u=>u.id===a.id))
              return (
                <div key={p.id} className="card" style={{marginBottom:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'0.75rem'}}>
                    <div className="avatar" style={{width:40,height:40,fontSize:14,fontWeight:700,background:`${p.color}22`,color:p.color}}>
                      {p.name.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:15}}>{p.name}</div>
                      <div style={{fontSize:12,color:'var(--c-muted)'}}>{unlocked.length}/{ACHIEVEMENTS.length} unlocked</div>
                    </div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:26,color:p.color}}>{p.total} pts</div>
                  </div>
                  <div style={{height:4,background:'var(--c-surface2)',borderRadius:2,overflow:'hidden',marginBottom:'0.75rem'}}>
                    <div style={{height:'100%',width:`${Math.round(unlocked.length/ACHIEVEMENTS.length*100)}%`,background:p.color,borderRadius:2,transition:'width 0.5s'}}/>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {unlocked.map(a=>{
                      const tc=TIER_COLORS[a.tier]
                      return (
                        <div key={a.id} title={a.desc} style={{display:'flex',alignItems:'center',gap:5,background:tc.bg,border:`1px solid ${tc.border}`,borderRadius:20,padding:'4px 10px 4px 7px',cursor:'default'}}>
                          <span style={{fontSize:15}}>{a.icon}</span>
                          <div>
                            <div style={{fontSize:11,fontWeight:700,color:tc.text,lineHeight:1}}>{a.name}</div>
                            <div style={{fontSize:9,color:tc.text,opacity:0.7}}>{a.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                    {locked.map(a=>(
                      <div key={a.id} title={`Locked: ${a.desc}`} style={{display:'flex',alignItems:'center',gap:4,background:'var(--c-surface2)',border:'1px solid var(--c-border)',borderRadius:20,padding:'3px 9px 3px 6px',opacity:0.35,cursor:'default'}}>
                        <span style={{fontSize:13,filter:'grayscale(1)'}}>{a.icon}</span>
                        <span style={{fontSize:10,color:'var(--c-muted)'}}>{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* RIVALRIES */}
        {tab==='h2h' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div className="alert alert-info">
              <strong>How this works:</strong> For every match with a result, we compare who scored more points on that prediction. Green = winning that rivalry, red = losing. The number shows W–L record across all played matches.
            </div>

            <div className="card" style={{marginBottom:0,padding:0,overflow:'hidden'}}>
              <div style={{padding:'1.25rem 1.5rem 0.75rem'}}>
                <div className="card-title" style={{marginBottom:0}}>Head-to-head records</div>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{minWidth:players.length*80+160}}>
                  <thead>
                    <tr>
                      <th style={{position:'sticky',left:0,background:'var(--c-surface)',zIndex:2}}>Player</th>
                      {sorted.map(p=>(
                        <th key={p.id} style={{textAlign:'center',minWidth:72}}>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                            <div className="avatar" style={{width:22,height:22,fontSize:8,fontWeight:700,background:`${p.color}22`,color:p.color}}>{p.name.slice(0,2).toUpperCase()}</div>
                            <span style={{fontSize:9,color:'var(--c-muted)'}}>{p.name.split(' ')[0]}</span>
                          </div>
                        </th>
                      ))}
                      <th style={{textAlign:'center'}}>Rivalries won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(rp=>{
                      const rivalWins = sorted.filter(cp=>cp.id!==rp.id&&(h2h[rp.id]?.[cp.id]?.wins||0)>(h2h[rp.id]?.[cp.id]?.losses||0)).length
                      return (
                        <tr key={rp.id}>
                          <td style={{position:'sticky',left:0,background:'var(--c-surface)',zIndex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div className="avatar" style={{width:26,height:26,fontSize:9,fontWeight:700,background:`${rp.color}22`,color:rp.color}}>{rp.name.slice(0,2).toUpperCase()}</div>
                              <span style={{fontSize:12,fontWeight:500}}>{rp.name}</span>
                            </div>
                          </td>
                          {sorted.map(cp=>{
                            if(cp.id===rp.id) return <td key={cp.id} style={{textAlign:'center',background:'var(--c-surface2)',color:'var(--c-hint)',fontSize:12}}>—</td>
                            const rec=h2h[rp.id]?.[cp.id]
                            if(!rec) return <td key={cp.id} style={{textAlign:'center',color:'var(--c-hint)',fontSize:12}}>—</td>
                            const total=rec.wins+rec.losses+rec.draws
                            if(total===0) return <td key={cp.id} style={{textAlign:'center',color:'var(--c-hint)',fontSize:12}}>—</td>
                            const winning=rec.wins>rec.losses
                            const tied=rec.wins===rec.losses
                            return (
                              <td key={cp.id} style={{textAlign:'center',background:winning?'rgba(34,197,94,0.07)':tied?'transparent':'rgba(239,68,68,0.07)'}}>
                                <div style={{fontWeight:700,fontSize:12,color:winning?'var(--c-success)':tied?'var(--c-muted)':'var(--c-danger)'}}>{rec.wins}W</div>
                                <div style={{fontSize:10,color:'var(--c-hint)'}}>{rec.losses}L · {rec.draws}D</div>
                              </td>
                            )
                          })}
                          <td style={{textAlign:'center',fontFamily:'var(--font-display)',fontSize:20,color:rp.color}}>{rivalWins}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Closest rivalries */}
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Closest rivalries</div>
              <p style={{fontSize:12,color:'var(--c-muted)',marginBottom:'1rem'}}>Pairs with the most even records — the real grudge matches</p>
              {(() => {
                const pairs=[]
                for(let i=0;i<sorted.length;i++) for(let j=i+1;j<sorted.length;j++){
                  const a=sorted[i],b=sorted[j]
                  const rec=h2h[a.id]?.[b.id]
                  if(!rec) continue
                  const total=rec.wins+rec.losses+rec.draws
                  if(total===0) continue
                  pairs.push({a,b,rec,total,diff:Math.abs(rec.wins-rec.losses)})
                }
                const closest=pairs.sort((x,y)=>x.diff-y.diff||y.total-x.total).slice(0,5)
                if(closest.length===0) return <p style={{color:'var(--c-muted)',fontSize:13}}>No matches played yet.</p>
                return closest.map(({a,b,rec,total},i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--c-border)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:0}}>
                      <div className="avatar" style={{width:28,height:28,fontSize:10,background:`${a.color}22`,color:a.color,flexShrink:0}}>{a.name.slice(0,2).toUpperCase()}</div>
                      <span style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</span>
                    </div>
                    <div style={{textAlign:'center',flexShrink:0,minWidth:100}}>
                      <div style={{fontFamily:'var(--font-display)',fontSize:20}}>{rec.wins} – {rec.losses}</div>
                      <div style={{fontSize:10,color:'var(--c-muted)'}}>{total} matches · {rec.draws} draws</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'flex-end',minWidth:0}}>
                      <span style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'right'}}>{b.name}</span>
                      <div className="avatar" style={{width:28,height:28,fontSize:10,background:`${b.color}22`,color:b.color,flexShrink:0}}>{b.name.slice(0,2).toUpperCase()}</div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {/* BINGO */}
        {tab==='bingo' && (
          <div>
            <div className="alert alert-info" style={{marginBottom:'1rem'}}>
              Each cell shows your predicted score (top) and the actual result (bottom). 💎 gold = exact score, ✓ green = correct result, ✗ red = wrong.
            </div>
            <div style={{display:'flex',gap:8,marginBottom:'1.25rem',flexWrap:'wrap'}}>
              {players.map((p,i)=>(
                <button key={p.id} onClick={()=>setSP(p.id)} style={{
                  padding:'6px 14px', borderRadius:20, border:'1px solid', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.12s',
                  background:selectedPlayer===p.id?AVATAR_COLORS[i%AVATAR_COLORS.length]:'transparent',
                  borderColor:selectedPlayer===p.id?AVATAR_COLORS[i%AVATAR_COLORS.length]:'var(--c-border)',
                  color:selectedPlayer===p.id?'#fff':'var(--c-muted)',
                }}>{p.name}</button>
              ))}
            </div>
            {selectedPlayer && (() => {
              const p=players.find(x=>x.id===selectedPlayer)
              const pi=players.findIndex(x=>x.id===selectedPlayer)
              const stat=playerStats.find(s=>s.id===selectedPlayer)
              return (
                <div className="card" style={{marginBottom:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1.25rem'}}>
                    <div className="avatar" style={{width:40,height:40,fontSize:14,fontWeight:700,background:`${AVATAR_COLORS[pi%AVATAR_COLORS.length]}22`,color:AVATAR_COLORS[pi%AVATAR_COLORS.length]}}>{p?.name?.slice(0,2).toUpperCase()}</div>
                    <div>
                      <div style={{fontWeight:600,fontSize:15}}>{p?.name}'s prediction card</div>
                      <div style={{fontSize:12,color:'var(--c-muted)'}}>{stat?.exact} exact · {stat?.correct} correct · {stat?.total} pts total</div>
                    </div>
                  </div>
                  <BingoCard playerId={selectedPlayer} predictions={predictions} matches={matches} />
                </div>
              )
            })()}
          </div>
        )}

        {/* ROASTS */}
        {tab==='roast' && (
          <div>
            <div className="card" style={{marginBottom:'1rem'}}>
              <div className="card-title">Match roast generator</div>
              <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem'}}>Pick a finished match. We'll roast whoever got it wrong and praise whoever nailed it.</p>
              {finishedMatches.length===0 && <div className="alert alert-info">No finished matches yet. Enter results or seed demo data first.</div>}
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {finishedMatches.map(m=>(
                  <button key={m.id} onClick={()=>setCM(m.id)} style={{
                    padding:'6px 12px', borderRadius:'var(--radius)', fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid', transition:'all 0.12s',
                    background:commentMatch===m.id?'var(--c-accent)':'var(--c-surface2)',
                    borderColor:commentMatch===m.id?'var(--c-accent)':'var(--c-border)',
                    color:commentMatch===m.id?'#fff':'var(--c-muted)',
                  }}>{m.home_team} {m.home_goals}–{m.away_goals} {m.away_team}</button>
                ))}
              </div>
            </div>

            {commentMatch && (() => {
              const m=matches.find(x=>x.id===commentMatch)
              return (
                <div className="card" style={{marginBottom:0}}>
                  <div style={{marginBottom:'1rem',paddingBottom:'1rem',borderBottom:'1px solid var(--c-border)'}}>
                    <div style={{fontFamily:'var(--font-display)',fontSize:20,letterSpacing:'0.04em',color:'var(--c-muted)'}}>{m?.home_team} vs {m?.away_team}</div>
                    <div style={{fontFamily:'var(--font-display)',fontSize:42,color:'var(--c-accent)',lineHeight:1}}>{m?.home_goals} – {m?.away_goals}</div>
                  </div>
                  {commentLines.length===0?<p style={{color:'var(--c-muted)',fontSize:13}}>No predictions found for this match.</p>:(
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      {commentLines.map((line,i)=>{
                        const pi=players.findIndex(x=>x.name===line.name)
                        const color=pi>=0?AVATAR_COLORS[pi%AVATAR_COLORS.length]:'var(--c-muted)'
                        const bg=line.type==='exact'?'rgba(240,165,0,0.08)':line.type==='correct'?'rgba(34,197,94,0.06)':line.type==='nobody'?'rgba(255,255,255,0.02)':'rgba(239,68,68,0.06)'
                        const border=line.type==='exact'?'1px solid rgba(240,165,0,0.2)':line.type==='correct'?'1px solid rgba(34,197,94,0.15)':'1px solid var(--c-border)'
                        const emoji=line.type==='exact'?'💎':line.type==='correct'?'✅':line.type==='close'?'🤏':line.type==='nobody'?'😶':'💀'
                        return (
                          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',borderRadius:'var(--radius)',background:bg,border}}>
                            <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{emoji}</span>
                            <div>
                              {line.name && (
                                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                                  <div className="avatar" style={{width:18,height:18,fontSize:7,fontWeight:700,background:`${color}22`,color}}>{line.name.slice(0,2).toUpperCase()}</div>
                                  <span style={{fontSize:11,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.05em'}}>{line.name}</span>
                                </div>
                              )}
                              <p style={{fontSize:14,color:'var(--c-text)',lineHeight:1.5,margin:0}}>{line.text}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
