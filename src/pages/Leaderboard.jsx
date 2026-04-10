import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

const AVATAR_COLORS = [
  '#c9f542','#3d9fff','#42e87d','#f5c542','#ff5858',
  '#a855f7','#f97316','#06b6d4','#ec4899','#84cc16'
]

export default function Leaderboard() {
  const { player } = usePlayer()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLeaderboard() }, [])

  async function loadLeaderboard() {
    setLoading(true)
    const { data: players } = await supabase.from('players').select('id,name').eq('room_code','DEFAULT')
    const { data: scores } = await supabase.from('scores').select('player_id,pts_result,pts_diff,pts_exact,pts_approx,pts_ko_team,pts_total')

    if (!players) { setLoading(false); return }

    const rows = players.map((p, idx) => {
      const pscores = scores?.filter(s => s.player_id === p.id) || []
      return {
        ...p,
        color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        pts:     pscores.reduce((a,s) => a + (s.pts_total||0), 0),
        correct: pscores.filter(s => s.pts_result > 0).length,
        diff:    pscores.filter(s => s.pts_diff > 0).length,
        exact:   pscores.filter(s => s.pts_exact > 0).length,
        approx:  pscores.reduce((a,s) => a + (s.pts_approx||0), 0),
        ko:      pscores.reduce((a,s) => a + (s.pts_ko_team||0), 0),
      }
    }).sort((a,b) => b.pts - a.pts)

    setRows(rows)
    setLoading(false)
  }

  const maxPts = rows[0]?.pts || 1
  const RANK_CLS = ['rank-1','rank-2','rank-3','rank-n']

  return (
    <div>
      <div className="page-header">
        <h1>Leaderboard</h1>
        <p>Updated after each match result is confirmed</p>
      </div>
      <div className="page-body">
        {loading && <p style={{color:'var(--c-muted)'}}>Loading...</p>}

        {!loading && rows.length === 0 && (
          <div className="alert alert-info">No players or scores yet. Invite your friends and wait for the tournament to start!</div>
        )}

        {!loading && rows.length > 0 && (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{width:48}}>#</th>
                    <th>Player</th>
                    <th>Points</th>
                    <th>Correct result</th>
                    <th>Goal diff</th>
                    <th>Exact score</th>
                    <th>Approx bonus</th>
                    <th>KO team</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => {
                    const isMe = player?.id === p.id
                    return (
                      <tr key={p.id} style={isMe ? {background:'rgba(201,245,66,0.04)'} : {}}>
                        <td>
                          <span className={`rank-badge ${RANK_CLS[Math.min(i,3)]}`}>{i+1}</span>
                        </td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <div className="avatar" style={{background:`${p.color}18`,color:p.color}}>
                              {p.name.slice(0,2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{fontWeight:500}}>
                                {p.name} {isMe && <span style={{fontSize:11,color:'var(--c-accent)',fontWeight:600}}>YOU</span>}
                              </div>
                              <div className="progress-bar" style={{width:100}}>
                                <div className="progress-fill" style={{width:`${Math.round(p.pts/maxPts*100)}%`}} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:700}}>{p.pts}</span>
                        </td>
                        <td style={{color:'var(--c-muted)'}}>{p.correct}</td>
                        <td style={{color:'var(--c-muted)'}}>{p.diff}</td>
                        <td style={{color:'var(--c-muted)'}}>{p.exact}</td>
                        <td style={{color:'var(--c-muted)'}}>{p.approx}</td>
                        <td style={{color:'var(--c-muted)'}}>{p.ko}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
