import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { Link } from 'react-router-dom'

const WEIGHT_LABELS = {
  group_result: 'Group stage — correct W/D/L',
  group_diff:   'Group stage — correct goal diff',
  group_exact:  'Group stage — exact score',
  group_approx: 'Group stage — approx. bonus',
  ko_team:      'KO round — correct team',
  ko_result:    'KO round — correct result',
  ko_diff:      'KO round — correct goal diff',
  ko_exact:     'KO round — exact score',
}

export default function Dashboard() {
  const { player } = usePlayer()
  const [stats, setStats] = useState({ players:0, played:0, total:104 })
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [myPts, setMyPts] = useState(null)
  const [weights, setWeights] = useState(null)

  useEffect(() => {
    loadData()
  }, [player])

  async function loadData() {
    const [{ count: playerCount }, { data: finishedMatches }, { data: w }] = await Promise.all([
      supabase.from('players').select('*', {count:'exact',head:true}).eq('room_code','DEFAULT'),
      supabase.from('matches').select('id').eq('status','FINISHED'),
      supabase.from('scoring_weights').select('*').eq('room_code','DEFAULT').single(),
    ])
    setStats({ players: playerCount||0, played: finishedMatches?.length||0, total: 104 })
    setWeights(w)

    // Build leaderboard
    const { data: players } = await supabase.from('players').select('id,name').eq('room_code','DEFAULT')
    if (!players) return
    const { data: scores } = await supabase.from('scores').select('player_id,pts_total')
    const totals = players.map(p => ({
      ...p,
      pts: scores?.filter(s=>s.player_id===p.id).reduce((acc,s)=>acc+(s.pts_total||0),0) || 0
    })).sort((a,b)=>b.pts-a.pts)
    setLeaders(totals.slice(0,5))
    if (player) {
      const rank = totals.findIndex(p=>p.id===player.id)+1
      setMyRank(rank||null)
      setMyPts(totals.find(p=>p.id===player.id)?.pts||0)
    }
  }

  const COLORS = ['var(--c-gold)','var(--c-silver)','var(--c-bronze)','var(--c-muted)','var(--c-muted)']
  const RANK_CLS = ['rank-1','rank-2','rank-3','rank-n','rank-n']

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>FIFA World Cup 2026 — Canada / Mexico / USA</p>
      </div>
      <div className="page-body">
        <div className="metrics">
          <div className="metric">
            <div className="metric-label">Players</div>
            <div className="metric-value">{stats.players}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Matches played</div>
            <div className="metric-value">{stats.played}<span style={{fontSize:16,color:'var(--c-muted)',fontWeight:400}}> / {stats.total}</span></div>
          </div>
          <div className="metric">
            <div className="metric-label">Your rank</div>
            <div className="metric-value" style={{color:'var(--c-accent)'}}>{myRank ? `#${myRank}` : '—'}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Your points</div>
            <div className="metric-value">{myPts ?? '—'}</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
          <div className="card">
            <div className="card-title">Top 5</div>
            {leaders.map((p, i) => (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--c-border)'}}>
                <span className={`rank-badge ${RANK_CLS[i]}`}>{i+1}</span>
                <div className="avatar" style={{background:'rgba(255,255,255,0.06)',color:COLORS[i]}}>
                  {p.name.slice(0,2).toUpperCase()}
                </div>
                <span style={{flex:1,fontWeight:500}}>{p.name}</span>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:700}}>{p.pts}</div>
                  <div style={{fontSize:11,color:'var(--c-muted)'}}>pts</div>
                </div>
              </div>
            ))}
            {leaders.length === 0 && <p style={{color:'var(--c-muted)',fontSize:14}}>No scores yet — tournament hasn't started.</p>}
            <Link to="/leaderboard" style={{display:'block',marginTop:12,fontSize:13,color:'var(--c-accent)'}}>Full leaderboard →</Link>
          </div>

          <div className="card">
            <div className="card-title">Scoring rules</div>
            {weights && Object.entries(WEIGHT_LABELS).map(([k,v]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--c-border)',fontSize:14}}>
                <span style={{color:'var(--c-muted)'}}>{v}</span>
                <span style={{fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,color:'var(--c-accent)'}}>{weights[k]}</span>
              </div>
            ))}
          </div>
        </div>

        {!player && (
          <div className="alert alert-info" style={{marginTop:'1.5rem'}}>
            You haven't joined the pool yet. <Link to="/join" style={{color:'var(--c-accent)'}}>Join now →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
