import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

const TOURNAMENT_START = new Date('2026-06-11T22:00:00Z')

// All 48 qualified teams with flag emojis
const TEAMS = [
  { name:'Argentina',    flag:'🇦🇷' }, { name:'Australia',    flag:'🇦🇺' },
  { name:'Belgium',      flag:'🇧🇪' }, { name:'Brazil',       flag:'🇧🇷' },
  { name:'Cameroon',     flag:'🇨🇲' }, { name:'Canada',       flag:'🇨🇦' },
  { name:'Chile',        flag:'🇨🇱' }, { name:'Colombia',     flag:'🇨🇴' },
  { name:'Croatia',      flag:'🇭🇷' }, { name:'Denmark',      flag:'🇩🇰' },
  { name:'Ecuador',      flag:'🇪🇨' }, { name:'Egypt',        flag:'🇪🇬' },
  { name:'England',      flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { name:'France',       flag:'🇫🇷' },
  { name:'Germany',      flag:'🇩🇪' }, { name:'Ghana',        flag:'🇬🇭' },
  { name:'Hungary',      flag:'🇭🇺' }, { name:'Indonesia',    flag:'🇮🇩' },
  { name:'Iran',         flag:'🇮🇷' }, { name:'Ivory Coast',  flag:'🇨🇮' },
  { name:'Japan',        flag:'🇯🇵' }, { name:'Mexico',       flag:'🇲🇽' },
  { name:'Morocco',      flag:'🇲🇦' }, { name:'Netherlands',  flag:'🇳🇱' },
  { name:'New Zealand',  flag:'🇳🇿' }, { name:'Nigeria',      flag:'🇳🇬' },
  { name:'Panama',       flag:'🇵🇦' }, { name:'Paraguay',     flag:'🇵🇾' },
  { name:'Peru',         flag:'🇵🇪' }, { name:'Poland',       flag:'🇵🇱' },
  { name:'Portugal',     flag:'🇵🇹' }, { name:'Saudi Arabia', flag:'🇸🇦' },
  { name:'Senegal',      flag:'🇸🇳' }, { name:'Serbia',       flag:'🇷🇸' },
  { name:'Slovenia',     flag:'🇸🇮' }, { name:'South Africa', flag:'🇿🇦' },
  { name:'South Korea',  flag:'🇰🇷' }, { name:'Spain',        flag:'🇪🇸' },
  { name:'Switzerland',  flag:'🇨🇭' }, { name:'Turkey',       flag:'🇹🇷' },
  { name:'Ukraine',      flag:'🇺🇦' }, { name:'Uruguay',      flag:'🇺🇾' },
  { name:'USA',          flag:'🇺🇸' }, { name:'Venezuela',    flag:'🇻🇪' },
  { name:'Cuba',         flag:'🇨🇺' }, { name:'Guatemala',    flag:'🇬🇹' },
  { name:'Costa Rica',   flag:'🇨🇷' }, { name:'Italy',        flag:'🇮🇹' },
]

function isLocked() {
  return new Date() >= TOURNAMENT_START
}

export default function WinnerPick() {
  const { player, isAdmin } = usePlayer()
  const [myPick,    setMyPick]    = useState(null)
  const [allPicks,  setAllPicks]  = useState([])
  const [weights,   setWeights]   = useState(null)
  const [selected,  setSelected]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [actualWinner, setActualWinner] = useState('')
  const [awarding,  setAwarding]  = useState(false)

  const roomCode = player?.room_code || 'DEFAULT'
  const locked   = isLocked() && !isAdmin

  useEffect(() => { loadData() }, [player])

  async function loadData() {
    setLoading(true)
    const [{ data: picks }, { data: w }] = await Promise.all([
      supabase.from('winner_picks').select('*, players(name)').eq('room_code', roomCode),
      supabase.from('scoring_weights').select('winner_bonus').eq('room_code', roomCode).single(),
    ])
    setAllPicks(picks || [])
    setWeights(w)
    if (player) {
      const mine = picks?.find(p => p.player_id === player.id)
      if (mine) { setMyPick(mine); setSelected(mine.team) }
    }
    setLoading(false)
  }

  async function savePick() {
    if (!selected || !player) return
    setSaving(true)
    const { error } = await supabase.from('winner_picks').upsert({
      player_id: player.id,
      room_code: roomCode,
      team: selected,
      pts_awarded: 0,
    }, { onConflict: 'player_id,room_code' })
    if (error) { alert('Failed to save: ' + error.message); setSaving(false); return }
    setMyPick({ player_id: player.id, team: selected })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    loadData()
  }

  async function awardWinner() {
    if (!actualWinner) { alert('Select the actual winner first'); return }
    setAwarding(true)
    const bonus = weights?.winner_bonus || 20
    const winners = allPicks.filter(p => p.team === actualWinner)

    // Award points to correct pickers
    for (const pick of winners) {
      await supabase.from('winner_picks').update({ pts_awarded: bonus }).eq('id', pick.id)
      // Also add to scores table as a special score entry — match_id null
      await supabase.from('scores').upsert({
        player_id: pick.player_id,
        match_id: 104, // Final match
        pts_ko_team: bonus,
        pts_result: 0, pts_diff: 0, pts_exact: 0, pts_approx: 0,
        pts_total: bonus,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'player_id,match_id' })
    }
    alert(`Awarded ${bonus} pts to ${winners.length} player${winners.length !== 1 ? 's' : ''} who picked ${actualWinner}!`)
    setAwarding(false)
    loadData()
  }

  const filtered = TEAMS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  const picked   = allPicks.length
  const totalPlayers = [...new Set(allPicks.map(p => p.player_id))].length

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-header-inner"><h1>Winner pick</h1></div></div>
      <div className="page-body"><p style={{color:'var(--c-muted)'}}>Loading...</p></div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Tournament winner</h1>
          <p>One pick. {weights?.winner_bonus || 20} points. Bragging rights forever.</p>
        </div>
      </div>
      <div className="page-body">

        {/* Banner */}
        <div className="card" style={{marginBottom:'1.25rem',background:'linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface2) 100%)'}}>
          <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:28,letterSpacing:'0.04em',marginBottom:4}}>
                Who wins the World Cup?
              </div>
              <p style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.7,marginBottom:0}}>
                Pick the tournament winner before June 11. If you're right you get{' '}
                <strong style={{color:'var(--c-gold)'}}>{weights?.winner_bonus || 20} bonus points</strong> added to your total.
                You can change your pick up until kickoff.
              </p>
            </div>
            <div style={{textAlign:'center',flexShrink:0}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:48,color:'var(--c-gold)',lineHeight:1}}>{weights?.winner_bonus || 20}</div>
              <div style={{fontSize:11,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>bonus pts</div>
            </div>
          </div>

          {/* Pool stats */}
          {allPicks.length > 0 && (
            <div style={{display:'flex',gap:16,marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--c-border)',flexWrap:'wrap'}}>
              <div style={{fontSize:13,color:'var(--c-muted)'}}>
                <strong style={{color:'var(--c-text)'}}>{picked}</strong> of <strong style={{color:'var(--c-text)'}}>{totalPlayers}</strong> players have picked
              </div>
              {(() => {
                // Most popular pick
                const counts = {}
                allPicks.forEach(p => counts[p.team] = (counts[p.team]||0)+1)
                const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]
                const team = TEAMS.find(t => t.name === top?.[0])
                return top && !locked ? null : top && (
                  <div style={{fontSize:13,color:'var(--c-muted)'}}>
                    Pool favourite: <strong style={{color:'var(--c-text)'}}>{team?.flag} {top[0]}</strong> ({top[1]} pick{top[1]!==1?'s':''})
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* My current pick */}
        {myPick && (
          <div className="alert alert-info" style={{marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:24}}>{TEAMS.find(t=>t.name===myPick.team)?.flag}</span>
            <div>
              <strong>Your pick: {myPick.team}</strong>
              {locked
                ? <span style={{color:'var(--c-muted)',marginLeft:8,fontSize:12}}>Locked — tournament has started</span>
                : <span style={{color:'var(--c-muted)',marginLeft:8,fontSize:12}}>You can change this until June 11</span>
              }
            </div>
            {myPick.pts_awarded > 0 && (
              <div style={{marginLeft:'auto',fontFamily:'var(--font-display)',fontSize:28,color:'var(--c-gold)'}}>+{myPick.pts_awarded}</div>
            )}
          </div>
        )}

        {!player && (
          <div className="alert alert-warn" style={{marginBottom:'1.25rem'}}>
            Join the pool to make your winner pick.
          </div>
        )}

        {/* Admin award section */}
        {isAdmin && allPicks.length > 0 && (
          <div className="card" style={{marginBottom:'1.25rem'}}>
            <div className="card-title">Award winner bonus (admin)</div>
            <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem'}}>Once the Final is played, select the actual winner to award {weights?.winner_bonus||20} pts to everyone who picked correctly.</p>
            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
              <select value={actualWinner} onChange={e=>setActualWinner(e.target.value)} style={{flex:1,minWidth:180}}>
                <option value="">Select actual winner...</option>
                {TEAMS.map(t=><option key={t.name} value={t.name}>{t.flag} {t.name}</option>)}
              </select>
              <button className="btn btn-accent" onClick={awardWinner} disabled={!actualWinner||awarding}>
                {awarding ? 'Awarding...' : 'Award points'}
              </button>
            </div>
          </div>
        )}

        {/* Team picker */}
        {player && !locked && (
          <div className="card" style={{marginBottom:'1.25rem'}}>
            <div className="card-title">Pick your winner</div>
            <input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{width:'100%',marginBottom:'1rem'}}
            />
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8,maxHeight:420,overflowY:'auto',paddingRight:4}}>
              {filtered.map(t => {
                const isSelected = selected === t.name
                return (
                  <button key={t.name} onClick={() => setSelected(t.name)} style={{
                    display:'flex',alignItems:'center',gap:8,padding:'10px 12px',
                    borderRadius:'var(--radius)',border:'1px solid',cursor:'pointer',
                    transition:'all 0.12s',textAlign:'left',
                    background: isSelected ? 'var(--c-accent)' : 'var(--c-surface2)',
                    borderColor: isSelected ? 'var(--c-accent)' : 'var(--c-border)',
                    color: isSelected ? '#fff' : 'var(--c-text)',
                  }}>
                    <span style={{fontSize:20,flexShrink:0}}>{t.flag}</span>
                    <span style={{fontSize:12,fontWeight:isSelected?700:400,lineHeight:1.3}}>{t.name}</span>
                  </button>
                )
              })}
            </div>
            <div style={{display:'flex',gap:10,marginTop:'1rem',alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn btn-accent" onClick={savePick}
                disabled={!selected||saving||selected===myPick?.team} style={{minWidth:120}}>
                {saving ? 'Saving...' : myPick ? 'Update pick' : 'Confirm pick'}
              </button>
              {selected && <span style={{fontSize:13,color:'var(--c-muted)'}}>Selected: {TEAMS.find(t=>t.name===selected)?.flag} {selected}</span>}
              {saved && <span className="badge badge-green">Saved!</span>}
            </div>
          </div>
        )}

        {/* All picks (visible after tournament starts, or to admin always) */}
        {(locked || isAdmin) && allPicks.length > 0 && (
          <div className="card" style={{marginBottom:0,padding:0,overflow:'hidden'}}>
            <div style={{padding:'1.25rem 1.5rem 0.75rem'}}><div className="card-title" style={{marginBottom:0}}>Everyone's picks</div></div>
            <table>
              <thead><tr>
                <th>Player</th>
                <th>Pick</th>
                <th style={{textAlign:'right'}}>Points awarded</th>
              </tr></thead>
              <tbody>
                {allPicks.map(p => {
                  const team = TEAMS.find(t => t.name === p.team)
                  return (
                    <tr key={p.id}>
                      <td style={{fontWeight:500}}>{p.players?.name || '—'}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:18}}>{team?.flag}</span>
                          <span style={{fontSize:13}}>{p.team}</span>
                        </div>
                      </td>
                      <td style={{textAlign:'right'}}>
                        {p.pts_awarded > 0
                          ? <span style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--c-gold)'}}>+{p.pts_awarded}</span>
                          : <span style={{color:'var(--c-hint)'}}>—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Picks hidden before tournament */}
        {!locked && !isAdmin && allPicks.length > 0 && (
          <div className="card" style={{marginBottom:0,textAlign:'center',padding:'2rem'}}>
            <div style={{fontSize:32,marginBottom:8}}>🔒</div>
            <div style={{fontWeight:600,marginBottom:6}}>Picks hidden until kickoff</div>
            <p style={{fontSize:13,color:'var(--c-muted)'}}>
              {picked} player{picked!==1?'s':''} have made their pick. You'll see everyone's choice when the tournament starts on June 11.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
