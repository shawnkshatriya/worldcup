import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { Link } from 'react-router-dom'

const WEIGHT_LABELS = {
  group_result: 'Correct W/D/L',
  group_diff:   'Correct goal diff',
  group_exact:  'Exact score',
  group_approx: 'Approx bonus',
  ko_team:      'KO team qualified',
  ko_result:    'KO correct result',
  ko_diff:      'KO goal difference',
  ko_exact:     'KO exact score',
}
const WEIGHT_COLORS = {
  group_result:'#C8102E', group_diff:'#003DA5', group_exact:'#F0A500',
  group_approx:'#22C55E', ko_team:'#a855f7',   ko_result:'#C8102E',
  ko_diff:'#003DA5',      ko_exact:'#F0A500',
}
const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899']

function useCountdown(target) {
  const [diff, setDiff] = useState(null)
  useEffect(() => {
    function calc() {
      const ms = new Date(target) - new Date()
      if (ms <= 0) { setDiff(null); return }
      const s = Math.floor(ms / 1000)
      setDiff({ days:Math.floor(s/86400), hours:Math.floor((s%86400)/3600), mins:Math.floor((s%3600)/60), secs:s%60 })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [target])
  return diff
}

// Real flag emojis rendered via unicode — crisp on all devices
function FlagPill({ emoji, label }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: label ? 8 : 0,
      background:'rgba(255,255,255,0.05)',
      border:'1px solid rgba(255,255,255,0.1)',
      borderRadius:20,
      padding: label ? '5px 12px 5px 8px' : '6px 10px',
      fontSize:13, fontWeight:500, color:'var(--c-text)',
    }}>
      <span style={{fontSize:22,lineHeight:1}}>{emoji}</span>
      {label && <span>{label}</span>}
    </div>
  )
}

export default function Dashboard() {
  const { player } = usePlayer()
  const [stats, setStats]   = useState({ players:0, played:0, total:104 })
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank]   = useState(null)
  const [myPts, setMyPts]     = useState(null)
  const [weights, setWeights] = useState(null)
  const countdown = useCountdown('2026-06-11T22:00:00Z')

  useEffect(() => { loadData() }, [player])

  async function loadData() {
    const [
      { data:allPlayers },
      { data:allMatches },
      { data:w }
    ] = await Promise.all([
      supabase.from('players').select('id').eq('room_code','DEFAULT'),
      supabase.from('matches').select('id,status'),
      supabase.from('scoring_weights').select('*').eq('room_code','DEFAULT').single(),
    ])
    const played = allMatches?.filter(m=>m.status==='FINISHED').length||0
    const total  = allMatches?.length||104
    setStats({ players:allPlayers?.length||0, played, total })
    setWeights(w)

    const { data:players } = await supabase.from('players').select('id,name').eq('room_code','DEFAULT')
    const { data:scores }  = await supabase.from('scores').select('player_id,pts_total')
    if (!players) return

    const totals = players.map((p,i) => ({
      ...p, color:AVATAR_COLORS[i%AVATAR_COLORS.length],
      pts: scores?.filter(s=>s.player_id===p.id).reduce((a,s)=>a+(s.pts_total||0),0)||0
    })).sort((a,b)=>b.pts-a.pts)

    setLeaders(totals.slice(0,5))
    if (player) {
      const rank = totals.findIndex(p=>p.id===player.id)+1
      setMyRank(rank||null)
      setMyPts(totals.find(p=>p.id===player.id)?.pts??null)
    }
  }

  const medalColors = ['var(--c-gold)','var(--c-silver)','var(--c-bronze)','var(--c-muted)','var(--c-muted)']
  const rankCls = ['rank-1','rank-2','rank-3','rank-n','rank-n']
  const played = stats.played
  const pct = Math.round((played/stats.total)*100)

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Dashboard</h1>
          <p>FIFA World Cup 2026 — Canada · Mexico · USA</p>
        </div>
      </div>
      <div className="page-body">

        {/* ── Hero Banner ── */}
        <div style={{
          background:'var(--c-surface)',
          border:'1px solid var(--c-border)',
          borderRadius:'var(--radius-lg)',
          overflow:'hidden',
          marginBottom:'1.25rem',
          position:'relative',
        }}>
          {/* Top stripe */}
          <div style={{height:4,background:'linear-gradient(90deg,#C8102E 0%,#C8102E 33%,#003DA5 33%,#003DA5 66%,#F0A500 66%)'}} />

          <div style={{padding:'1.5rem',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:20}}>
            <div>
              <div style={{fontFamily:'var(--font-display)',fontSize:60,lineHeight:0.9,letterSpacing:'0.04em',color:'var(--c-text)',marginBottom:6}}>
                FIFA<br/>WORLD CUP
              </div>
              <div style={{fontFamily:'var(--font-display)',fontSize:28,letterSpacing:'0.08em',color:'var(--c-accent)',marginBottom:4}}>
                2026
              </div>
              <div style={{fontSize:13,color:'var(--c-muted)',marginBottom:4}}>
                Canada · Mexico · USA
              </div>
              <div style={{fontSize:12,color:'var(--c-hint)',marginBottom:16}}>
                June 11 – July 19 &nbsp;·&nbsp; 48 teams &nbsp;·&nbsp; 104 matches
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <FlagPill emoji="🇺🇸" label="USA" />
                <FlagPill emoji="🇨🇦" label="Canada" />
                <FlagPill emoji="🇲🇽" label="Mexico" />
              </div>
            </div>

            {/* Countdown / live badge */}
            {countdown ? (
              <div>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--c-muted)',marginBottom:10,textAlign:'right'}}>
                  Kickoff in
                </div>
                <div style={{display:'flex',alignItems:'flex-start',gap:2}}>
                  {[{n:countdown.days,l:'days'},{n:countdown.hours,l:'hrs'},{n:countdown.mins,l:'min'},{n:countdown.secs,l:'sec'}].map(({n,l},i)=>(
                    <div key={l} style={{display:'flex',alignItems:'flex-start',gap:2}}>
                      {i>0 && <div style={{fontFamily:'var(--font-display)',fontSize:32,color:'var(--c-hint)',lineHeight:1,margin:'0 2px'}}>:</div>}
                      <div style={{textAlign:'center'}}>
                        <div style={{fontFamily:'var(--font-display)',fontSize:38,lineHeight:1,color:'var(--c-accent)',letterSpacing:'0.02em'}}>
                          {String(n).padStart(2,'0')}
                        </div>
                        <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-muted)',marginTop:3}}>{l}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.25)',borderRadius:10,padding:'10px 18px'}}>
                <span className="live-dot" />
                <span style={{fontSize:13,fontWeight:700,color:'var(--c-success)',letterSpacing:'0.08em'}}>TOURNAMENT LIVE</span>
              </div>
            )}
          </div>

          {/* Progress bar at bottom */}
          <div style={{height:3,background:'var(--c-surface2)'}}>
            <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#C8102E,#003DA5)',transition:'width 1s ease'}} />
          </div>
          <div style={{padding:'6px 1.5rem',fontSize:11,color:'var(--c-muted)',display:'flex',justifyContent:'space-between'}}>
              <span>{played > 0 ? `${played} matches played` : 'Tournament starts June 11, 2026'}</span>
              <span>{stats.total - played} remaining</span>
            </div>
        </div>

        {/* ── Metric cards ── */}
        <div className="metrics" style={{marginBottom:'1.25rem'}}>
          {[
            { label:'Players in pool',  value:stats.players, color:'var(--c-text)' },
            { label:'Matches played',   value:`${stats.played} / ${stats.total}`, color:'var(--c-text)' },
            { label:'Your rank',        value:myRank?`#${myRank}`:'—', color:myRank===1?'var(--c-gold)':myRank?'var(--c-accent)':'var(--c-muted)' },
            { label:'Your points',      value:myPts??'—', color:'var(--c-text)' },
          ].map(m=>(
            <div key={m.label} className="metric">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{color:m.color,fontSize:m.value.toString().length>4?24:36}}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* ── Two columns ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.25rem'}}>

          {/* Top 5 leaderboard */}
          <div className="card" style={{marginBottom:0}}>
            <div className="card-title">Top 5</div>
            {leaders.length === 0 && (
              <p style={{color:'var(--c-muted)',fontSize:13,lineHeight:1.7}}>
                No scores yet — leaderboard fills up once matches are played and results are entered.
              </p>
            )}
            {leaders.map((p,i) => (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<leaders.length-1?'1px solid var(--c-border)':'none'}}>
                <span className={`rank-badge ${rankCls[i]}`}>{i+1}</span>
                <div className="avatar" style={{background:`${p.color}22`,color:p.color}}>
                  {p.name.slice(0,2).toUpperCase()}
                </div>
                <span style={{flex:1,fontWeight:500,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:26,color:medalColors[i],lineHeight:1}}>{p.pts}</div>
                  <div style={{fontSize:10,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.06em'}}>pts</div>
                </div>
              </div>
            ))}
            <Link to="/leaderboard" style={{display:'block',marginTop:12,fontSize:12,color:'var(--c-accent)',fontWeight:700,letterSpacing:'0.04em'}}>
              Full leaderboard →
            </Link>
          </div>

          {/* Scoring rules */}
          <div className="card" style={{marginBottom:0}}>
            <div className="card-title">Scoring rules</div>
            {weights ? Object.entries(WEIGHT_LABELS).map(([k,v]) => (
              <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:3,height:14,borderRadius:2,background:WEIGHT_COLORS[k],flexShrink:0}} />
                  <span style={{color:'var(--c-muted)'}}>{v}</span>
                </div>
                <span style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--c-text)'}}>{weights[k]}</span>
              </div>
            )) : <p style={{color:'var(--c-muted)',fontSize:13}}>Loading...</p>}
          </div>
        </div>

        {!player && (
          <div className="alert alert-info" style={{marginTop:'1.25rem'}}>
            You haven't joined the pool yet. <Link to="/join" style={{color:'var(--c-accent)',fontWeight:700}}>Join now →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
