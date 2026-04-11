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
  group_result: '#C8102E',
  group_diff:   '#003DA5',
  group_exact:  '#F0A500',
  group_approx: '#22C55E',
  ko_team:      '#a855f7',
  ko_result:    '#C8102E',
  ko_diff:      '#003DA5',
  ko_exact:     '#F0A500',
}

function useCountdown(target) {
  const [diff, setDiff] = useState(null)
  useEffect(() => {
    function calc() {
      const ms = new Date(target) - new Date()
      if (ms <= 0) { setDiff(null); return }
      const s = Math.floor(ms / 1000)
      setDiff({
        days:  Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        mins:  Math.floor((s % 3600) / 60),
        secs:  s % 60,
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [target])
  return diff
}

export default function Dashboard() {
  const { player } = usePlayer()
  const [stats, setStats] = useState({ players: 0, played: 0, total: 104 })
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [myPts, setMyPts] = useState(null)
  const [weights, setWeights] = useState(null)
  const countdown = useCountdown('2026-06-11T22:00:00Z') // Opening match UTC

  const MEDAL_COLORS = ['var(--c-gold)', 'var(--c-silver)', 'var(--c-bronze)']
  const AVATAR_COLORS = ['#C8102E','#003DA5','#F0A500','#22C55E','#a855f7','#f97316','#06b6d4','#ec4899']

  useEffect(() => { loadData() }, [player])

  async function loadData() {
    const [{ count: playerCount }, { data: finished }, { data: w }] = await Promise.all([
      supabase.from('players').select('*', { count: 'exact', head: true }).eq('room_code', 'DEFAULT'),
      supabase.from('matches').select('id').eq('status', 'FINISHED'),
      supabase.from('scoring_weights').select('*').eq('room_code', 'DEFAULT').single(),
    ])
    setStats({ players: playerCount || 0, played: finished?.length || 0, total: 104 })
    setWeights(w)

    const { data: players } = await supabase.from('players').select('id,name').eq('room_code', 'DEFAULT')
    const { data: scores }  = await supabase.from('scores').select('player_id,pts_total')
    if (!players) return

    const totals = players.map((p, i) => ({
      ...p,
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      pts: scores?.filter(s => s.player_id === p.id).reduce((acc, s) => acc + (s.pts_total || 0), 0) || 0,
    })).sort((a, b) => b.pts - a.pts)

    setLeaders(totals.slice(0, 5))
    if (player) {
      const rank = totals.findIndex(p => p.id === player.id) + 1
      setMyRank(rank || null)
      setMyPts(totals.find(p => p.id === player.id)?.pts ?? null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Dashboard</h1>
          <p>FIFA World Cup 2026 — Canada · Mexico · USA</p>
        </div>
      </div>

      <div className="page-body">

        {/* ── Hero banner ── */}
        <div className="wc-banner">
          <div className="wc-banner-stripe" />
          <div className="wc-banner-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="wc-banner-eyebrow">FIFA World Cup</div>
                <div className="wc-banner-title">CANADA<br/>MEXICO · USA</div>
                <div className="wc-banner-sub">June 11 – July 19, 2026 &nbsp;·&nbsp; 48 teams &nbsp;·&nbsp; 104 matches</div>
                <div className="wc-banner-hosts">
                  {[
                    {
                      label: 'USA',
                      // Stars & stripes simplified: red top, white mid, blue bottom
                      swatch: <div style={{display:'flex',flexDirection:'column',width:20,height:14,borderRadius:2,overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
                        <div style={{flex:1,background:'#B22234'}}/>
                        <div style={{flex:1,background:'#fff'}}/>
                        <div style={{flex:1,background:'#B22234'}}/>
                        <div style={{flex:1,background:'#fff'}}/>
                        <div style={{flex:1,background:'#3C3B6E'}}/>
                      </div>
                    },
                    {
                      label: 'Canada',
                      // Vertical triband: red | white (2x) | red
                      swatch: <div style={{display:'flex',width:20,height:14,borderRadius:2,overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
                        <div style={{flex:1,background:'#FF0000'}}/>
                        <div style={{flex:2,background:'#fff'}}/>
                        <div style={{flex:1,background:'#FF0000'}}/>
                      </div>
                    },
                    {
                      label: 'Mexico',
                      // Vertical triband: green | white | red
                      swatch: <div style={{display:'flex',width:20,height:14,borderRadius:2,overflow:'hidden',border:'1px solid rgba(255,255,255,0.1)',flexShrink:0}}>
                        <div style={{flex:1,background:'#006847'}}/>
                        <div style={{flex:1,background:'#fff'}}/>
                        <div style={{flex:1,background:'#CE1126'}}/>
                      </div>
                    },
                  ].map(h => (
                    <div key={h.label} className="host-flag">
                      {h.swatch}
                      {h.label}
                    </div>
                  ))}
                </div>
              </div>

              {countdown && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--c-muted)', marginBottom: 8 }}>
                    Kickoff in
                  </div>
                  <div className="countdown-row" style={{ justifyContent: 'flex-end' }}>
                    {[
                      { n: countdown.days,  l: 'days' },
                      { n: countdown.hours, l: 'hrs' },
                      { n: countdown.mins,  l: 'min' },
                      { n: countdown.secs,  l: 'sec' },
                    ].map(({ n, l }, i) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                        {i > 0 && <div className="countdown-sep">:</div>}
                        <div className="countdown-unit">
                          <div className="countdown-num">{String(n).padStart(2, '0')}</div>
                          <div className="countdown-label">{l}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!countdown && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 16px' }}>
                  <span className="live-dot" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-success)', letterSpacing: '0.06em' }}>TOURNAMENT LIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="metrics">
          <div className="metric">
            <div className="metric-label">Players</div>
            <div className="metric-value">{stats.players}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Matches played</div>
            <div className="metric-value">
              {stats.played}
              <span style={{ fontSize: 18, color: 'var(--c-muted)', fontWeight: 400 }}>/{stats.total}</span>
            </div>
          </div>
          <div className="metric" style={{ '--c-accent': 'var(--c-accent2)' }}>
            <div className="metric-label">Your rank</div>
            <div className="metric-value" style={{ color: myRank === 1 ? 'var(--c-gold)' : 'var(--c-text)' }}>
              {myRank ? `#${myRank}` : '—'}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Your points</div>
            <div className="metric-value">{myPts ?? '—'}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

          {/* Top 5 */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title">Top 5</div>
            {leaders.length === 0 && (
              <p style={{ color: 'var(--c-muted)', fontSize: 13 }}>No scores yet — tournament hasn't started.</p>
            )}
            {leaders.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < leaders.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                <span className={`rank-badge rank-${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                <div className="avatar" style={{ background: `${p.color}22`, color: p.color }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ flex: 1, fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: MEDAL_COLORS[i] || 'var(--c-text)' }}>
                    {p.pts}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>pts</div>
                </div>
              </div>
            ))}
            <Link to="/leaderboard" style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--c-accent)', fontWeight: 600, letterSpacing: '0.04em' }}>
              Full leaderboard →
            </Link>
          </div>

          {/* Scoring rules */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title">Scoring rules</div>
            {weights && Object.entries(WEIGHT_LABELS).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--c-border)', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: WEIGHT_COLORS[k], flexShrink: 0 }} />
                  <span style={{ color: 'var(--c-muted)' }}>{v}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--c-text)' }}>
                  {weights[k]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {!player && (
          <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
            You haven't joined the pool yet. <Link to="/join" style={{ color: 'var(--c-accent)', fontWeight: 600 }}>Join now →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
