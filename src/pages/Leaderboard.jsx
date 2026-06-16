import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import CountUp from '../components/CountUp'
import ShareCard from '../components/ShareCard'

const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899','#84cc16','#14b8a6']
const MEDALS = ['🥇','🥈','🥉']

function SortTh({ field, label, align, sortKey, sortDir, onSort }) {
  const active = sortKey === field
  return (
    <th
      onClick={function(){ onSort(field) }}
      style={{
        textAlign: align === 'left' ? 'left' : 'right',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        color: active ? 'var(--c-accent)' : undefined,
      }}
    >
      {label}
      <span style={{marginLeft:3,fontSize:9,opacity:active?1:0.3}}>
        {active ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
      </span>
    </th>
  )
}
const MEDAL_COLORS = ['var(--c-gold)','var(--c-silver)','var(--c-bronze)']

export default function Leaderboard() {
  const { player, loading: playerLoading } = usePlayer()
  const roomCode = player?.room_code || 'DEFAULT'
  const [rows, setRows]             = useState([])
  const [movers, setMovers]         = useState({})
  const [sortKey, setSortKey]       = useState('pts')
  const [sortDir, setSortDir]       = useState('desc')

  function handleSort(field) {
    if (sortKey === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(field)
      setSortDir(field === 'name' ? 'asc' : 'desc')
    }
  }
  const [loading, setLoading]       = useState(true)
  const [totalFinished, setFinished] = useState(0)

  useEffect(() => {
    if (playerLoading) return
    if (!player) { setLoading(false); return }
    load()
    var id = setInterval(load, 60000)
    var onFocus = function() { load() }
    window.addEventListener('focus', onFocus)
    return function() {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [player, playerLoading])

  async function fetchAll(table, cols) {
    var all = []
    var from = 0
    var pageSize = 1000
    while (true) {
      var page = await supabase.from(table).select(cols).range(from, from + pageSize - 1)
      if (!page.data || page.data.length === 0) break
      all = all.concat(page.data)
      if (page.data.length < pageSize) break
      from += pageSize
    }
    return all
  }

  async function load() {
    setLoading(true)
    const [{ data:players }, scores, predictions, { count:finished }, { data:winnerPicks }] = await Promise.all([
      supabase.from('players').select('id,name').eq('room_code', roomCode).limit(500),
      fetchAll('scores', '*'),
      fetchAll('predictions', 'player_id,match_id,home_goals,away_goals'),
      supabase.from('matches').select('*',{count:'exact',head:true}).eq('status','FINISHED'),
      supabase.from('winner_picks').select('player_id,pts_awarded').eq('room_code', roomCode),
    ])
    setFinished(finished||0)
    if (!players) { setLoading(false); return }

    const built = players.map((p,idx) => {
      const ps = scores?.filter(s=>s.player_id===p.id)||[]
      const pp = predictions?.filter(pr=>pr.player_id===p.id&&pr.home_goals!=null)||[]
      const wp = winnerPicks?.find(w=>w.player_id===p.id)
      const scored = ps.length
      const correct= ps.filter(s=>s.pts_result>0||s.pts_exact>0).length
      const diff   = ps.filter(s=>s.pts_diff>0).length
      const exact  = ps.filter(s=>s.pts_exact>0).length
      const approx = ps.reduce((a,s)=>a+(s.pts_approx||0),0)
      const ko     = ps.reduce((a,s)=>a+(s.pts_ko_team||0),0)
      const winnerBonus = wp?.pts_awarded || 0
      return {
        ...p, color:AVATAR_COLORS[idx%AVATAR_COLORS.length],
        pts:    ps.reduce((a,s)=>a+(s.pts_total||0),0) + winnerBonus,
        correct, diff, exact, approx, ko, winnerBonus,
        preds:  pp.length, scored,
        pctWL:  scored>0?Math.round(correct/scored*100):0,
        pctDiff:scored>0?Math.round(diff/scored*100):0,
        pctExact:scored>0?Math.round(exact/scored*100):0,
      }
    }).sort((a,b)=>b.pts-a.pts)

    setRows(built)
    setLoading(false)

    // Compute movers: compare current ranks to last saved snapshot
    try {
      var prevSnapJSON = localStorage.getItem('wc26_rank_snapshot_' + roomCode)
      var prevSnap = prevSnapJSON ? JSON.parse(prevSnapJSON) : {}
      var moves = {}
      built.forEach(function(r, idx) {
        var prevRank = prevSnap[r.id]
        if (prevRank != null) moves[r.id] = prevRank - (idx + 1) // positive = moved up
      })
      setMovers(moves)
      // Save today's snapshot (once per day)
      var todayKey = new Date().toLocaleDateString('en-US')
      var lastSnapDay = localStorage.getItem('wc26_rank_snapshot_day_' + roomCode)
      if (lastSnapDay !== todayKey) {
        var snap = {}
        built.forEach(function(r, idx){ snap[r.id] = idx + 1 })
        localStorage.setItem('wc26_rank_snapshot_' + roomCode, JSON.stringify(snap))
        localStorage.setItem('wc26_rank_snapshot_day_' + roomCode, todayKey)
      }
    } catch(e) {}
  }

  const maxPts = rows[0]?.pts||1

  // Rank by points always (for the # column), but display in chosen sort order
  const rankById = {}
  rows.forEach(function(r, i){ rankById[r.id] = i + 1 })
  const sortedRows = [...rows].sort(function(a, b) {
    var av, bv
    if (sortKey === 'name') { av = (a.name||'').toLowerCase(); bv = (b.name||'').toLowerCase() }
    else { av = a[sortKey] || 0; bv = b[sortKey] || 0 }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function PctBadge({ val }) {
    const color = val>=60?'var(--c-success)':val>=40?'var(--c-accent2)':'var(--c-danger)'
    const bg    = val>=60?'rgba(34,197,94,0.1)':val>=40?'rgba(240,165,0,0.1)':'rgba(239,68,68,0.1)'
    return (
      <span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:20,background:bg,color,whiteSpace:'nowrap'}}>
        {val}%
      </span>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Leaderboard</h1>
          <p>{totalFinished} of 104 matches played</p>
        </div>
      </div>
      <div className="page-body">
        {loading && <p style={{color:'var(--c-muted)'}}>Loading...</p>}

        {!loading && rows.length === 0 && (
          <div className="alert alert-info">No players yet - invite friends to join!</div>
        )}

        {!loading && player && rows.length > 1 && (function() {
          var myIdx = rows.findIndex(function(r){ return r.id === player.id })
          if (myIdx < 0) return null
          var me = rows[myIdx]
          var above = myIdx > 0 ? rows[myIdx-1] : null
          var below = myIdx < rows.length-1 ? rows[myIdx+1] : null
          return (
            <div className="card" style={{marginBottom:'1.25rem',background:'var(--c-surface)',border:'1px solid var(--c-accent)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:12,color:'var(--c-muted)'}}>You're</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:28,color:'var(--c-accent)'}}>#{myIdx+1} <span style={{fontSize:16,color:'var(--c-text)'}}>· {me.pts} pts</span></div>
                </div>
                <div style={{fontSize:13,textAlign:'right',lineHeight:1.7}}>
                  {above && (
                    <div>📈 <strong>{above.pts - me.pts}</strong> pts behind {above.name} (#{myIdx})</div>
                  )}
                  {below && (
                    <div style={{color:'var(--c-muted)'}}>📉 <strong>{me.pts - below.pts}</strong> pts ahead of {below.name} (#{myIdx+2})</div>
                  )}
                  {myIdx === 0 && <div style={{color:'var(--c-success)',fontWeight:700}}>👑 You're in the lead!</div>}
                </div>
              </div>
              <div style={{marginTop:14}}>
                <ShareCard
                  player={me}
                  rank={myIdx+1}
                  totalPlayers={rows.length}
                  points={me.pts}
                  exactCount={me.exact||0}
                  accuracy={me.pctWL||0}
                  leaderName={rows[0].name}
                  gapToLeader={rows[0].pts - me.pts}
                />
              </div>
            </div>
          )
        })()}

        {!loading && rows.length > 0 && (
          <>
            {/* Podium - top 3 */}
            {rows.length >= 3 && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:'1.5rem',alignItems:'flex-end'}}>
                {/* 2nd */}
                {[1,0,2].map(rank => {
                  const p = rows[rank]
                  if (!p) return <div key={rank}/>
                  const isFirst = rank===0
                  const medal = MEDALS[rank]
                  const mc    = MEDAL_COLORS[rank]
                  const h     = isFirst?140:110
                  return (
                    <div key={p.id} style={{
                      display:'flex',flexDirection:'column',alignItems:'center',
                      background:'var(--c-surface)',
                      border:`1px solid var(--c-border)`,
                      borderTop:`4px solid ${mc}`,
                      borderRadius:'var(--radius-lg)',
                      padding:'1.25rem 0.75rem 1rem',
                      minHeight:h,
                      justifyContent:'center',
                      boxShadow: isFirst?`0 0 0 1px ${mc}33`:'none',
                    }}>
                      <div style={{fontSize:36,marginBottom:4,lineHeight:1}}>{medal}</div>
                      <div className="avatar" style={{
                        width:isFirst?48:38,height:isFirst?48:38,
                        fontSize:isFirst?16:13,fontWeight:700,
                        background:`${p.color}22`,color:p.color,
                        marginBottom:8,
                      }}>{p.name.slice(0,2).toUpperCase()}</div>
                      <div style={{fontSize:isFirst?14:12,fontWeight:700,textAlign:'center',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{p.name}</div>
                      <div style={{fontFamily:'var(--font-display)',fontSize:isFirst?38:30,color:mc,lineHeight:1}}><CountUp value={p.pts}/></div>
                      <div style={{fontSize:10,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>pts</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full table */}
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{minWidth:700}}>
                  <thead>
                    <tr>
                      <th style={{width:44}}>#</th>
                      <SortTh field="name" label="Player" align="left" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="pts" label="Points" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="pctWL" label="% W/L" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="correct" label="W/L count" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="pctDiff" label="% Diff" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="diff" label="Diff count" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="pctExact" label="% Exact" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="exact" label="Exact count" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="approx" label="Approx Bonus" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                      <SortTh field="winnerBonus" label="Winner Pick" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}/>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((p) => {
                      const i = rankById[p.id] - 1
                      const isMe = player?.id===p.id
                      const barW = maxPts>0?Math.max((p.pts/maxPts)*100,p.pts>0?2:0):0
                      return (
                        <tr key={p.id} style={isMe?{background:'rgba(200,16,46,0.04)'}:{}}>
                          <td style={{textAlign:'center'}}>
                            {i<3
                              ? <span style={{fontSize:22}}>{MEDALS[i]}</span>
                              : <span style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-muted)'}}>{i+1}</span>
                            }
                            {movers[p.id] != null && movers[p.id] !== 0 && (
                              <div style={{fontSize:9,fontWeight:700,marginTop:1,color:movers[p.id]>0?'var(--c-success)':'var(--c-danger)'}}>
                                {movers[p.id]>0 ? '▲'+movers[p.id] : '▼'+Math.abs(movers[p.id])}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div className="avatar" style={{background:`${p.color}18`,color:p.color}}>
                                {p.name.slice(0,2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{fontWeight:600,fontSize:13}}>
                                  {p.name}
                                  {isMe&&<span style={{marginLeft:6,fontSize:9,color:'var(--c-accent)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>You</span>}
                                </div>
                                <div style={{width:100,height:4,background:'var(--c-surface2)',borderRadius:2,overflow:'hidden',marginTop:4}}>
                                  <div style={{height:'100%',width:`${barW}%`,
                                    background:i===0?'var(--c-gold)':i===1?'var(--c-silver)':i===2?'var(--c-bronze)':p.color,
                                    borderRadius:2,transition:'width 0.6s'}}/>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{textAlign:'right'}}>
                            <span style={{fontFamily:'var(--font-display)',fontSize:24,color:(i<3)?MEDAL_COLORS[i]:'var(--c-text)'}}><CountUp value={p.pts}/></span>
                          </td>
                          <td style={{textAlign:'right'}}><PctBadge val={p.pctWL}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:13}}>{p.correct}</td>
                          <td style={{textAlign:'right'}}><PctBadge val={p.pctDiff}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:13}}>{p.diff}</td>
                          <td style={{textAlign:'right'}}><PctBadge val={p.pctExact}/></td>
                          <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:13}}>{p.exact}</td>
                          <td style={{textAlign:'right',color:'var(--c-muted)',fontSize:13}}>{p.approx}</td>
                          <td style={{textAlign:'right',color:p.winnerBonus > 0 ? 'var(--c-accent2)' : 'var(--c-muted)',fontSize:13,fontWeight:p.winnerBonus > 0 ? 700 : 400}}>{p.winnerBonus || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
