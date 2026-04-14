import { useEffect, useState } from 'react'
import { supabase, recalcPlayerScores } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { Navigate } from 'react-router-dom'
import { saveRoomWeights } from '../lib/rooms'

const WEIGHT_LABELS = {
  group_result:  'Group stage - correct W/D/L',
  group_diff:    'Group stage - correct goal difference',
  group_exact:   'Group stage - exact score',
  group_approx:  'Group stage - approximation bonus',
  ko_result:     'KO round - correct result',
  ko_diff:       'KO round - correct goal difference',
  ko_exact:      'KO round - exact score',
  winner_bonus:  'Tournament winner bonus pick',
}

const PHASES = [
  'GROUP_A','GROUP_B','GROUP_C','GROUP_D','GROUP_E','GROUP_F',
  'GROUP_G','GROUP_H','GROUP_I','GROUP_J','GROUP_K','GROUP_L',
  'ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL'
]
const PHASE_LABELS = {
  GROUP_A:'Group A', GROUP_B:'Group B', GROUP_C:'Group C', GROUP_D:'Group D',
  GROUP_E:'Group E', GROUP_F:'Group F', GROUP_G:'Group G', GROUP_H:'Group H',
  GROUP_I:'Group I', GROUP_J:'Group J', GROUP_K:'Group K', GROUP_L:'Group L',
  ROUND_OF_32:'R32', ROUND_OF_16:'R16', QUARTER_FINALS:'QF',
  SEMI_FINALS:'SF', THIRD_PLACE:'3rd', FINAL:'Final'
}

export default function RoomAdmin() {
  const { player, isAdmin, isRoomAdmin } = usePlayer()
  const [tab, setTab]         = useState('players')
  const [weights, setWeights] = useState(null)
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [phase, setPhase]     = useState('GROUP_A')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [recalcing, setRecalcing] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState('')

  const roomCode = player?.room_code
  const roomName = player?.room_code

  // Redirect if not a room admin (and not master admin)
  if (!isRoomAdmin && !isAdmin) return <Navigate to="/" replace />
  // Master admin should use /admin
  if (isAdmin) return <Navigate to="/admin" replace />

  useEffect(() => { if (roomCode) loadAll() }, [roomCode])
  useEffect(() => { if (tab === 'results') loadMatches() }, [tab, phase])

  async function loadAll() {
    const [{ data: w }, { data: p }] = await Promise.all([
      supabase.from('scoring_weights').select('*').eq('room_code', roomCode).single(),
      supabase.from('players').select('*').eq('room_code', roomCode).order('created_at'),
    ])
    setWeights(w)
    setPlayers(p || [])
  }

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').eq('phase', phase).order('match_number')
    setMatches(data || [])
  }

  async function handleSaveWeights() {
    setSaving(true)
    await saveRoomWeights(roomCode, weights)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  async function handleRecalc() {
    setRecalcing(true)
    await recalcPlayerScores(roomCode)
    setRecalcing(false)
    setRecalcMsg('Scores recalculated!')
    setTimeout(() => setRecalcMsg(''), 3000)
  }

  async function saveResult(m) {
    await supabase.from('matches').update({
      home_goals: m.home_goals, away_goals: m.away_goals,
      home_goals_et: m.home_goals_et, away_goals_et: m.away_goals_et,
      home_goals_pen: m.home_goals_pen, away_goals_pen: m.away_goals_pen,
      status: 'FINISHED', updated_at: new Date().toISOString()
    }).eq('id', m.id)
    setMatches(ms => ms.map(x => x.id === m.id ? { ...x, ...m, status: 'FINISHED' } : x))
  }

  async function removePlayer(id) {
    const p = players.find(x => x.id === id)
    if (p?.is_room_admin) { alert("Can't remove another room admin."); return }
    if (!confirm(`Remove "${p?.name}"? Permanently deletes their predictions and scores.`)) return
    setPlayers(ps => ps.map(x => x.id === id ? { ...x, _removing: true } : x))
    await supabase.from('scores').delete().eq('player_id', id)
    await supabase.from('predictions').delete().eq('player_id', id)
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) {
      alert('Delete failed: ' + error.message)
      setPlayers(ps => ps.map(x => x.id === id ? { ...x, _removing: false } : x))
    } else {
      setPlayers(ps => ps.filter(x => x.id !== id))
    }
  }

  const inviteUrl = player ? `${window.location.origin}/join?code=${player.room_code}` : ''

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Room admin</h1>
          <p>Managing: <strong>{roomCode}</strong> . {players.length} players</p>
        </div>
      </div>
      <div className="page-body">

        <div className="alert alert-info" style={{marginBottom:'1.25rem',fontSize:13}}>
          You are a room admin for <strong>{roomCode}</strong>. You can manage players, enter results and adjust scoring weights for this room only.
        </div>

        <div className="tabs">
          {['players','weights','results','invite'].map(t => (
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* PLAYERS */}
        {tab === 'players' && (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'1.25rem',borderBottom:'1px solid var(--c-border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div className="card-title" style={{marginBottom:0}}>Players ({players.length})</div>
            </div>
            <table>
              <thead><tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th></th>
              </tr></thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div className="avatar" style={{background:'rgba(200,16,46,0.15)',color:'var(--c-accent)',fontSize:11,fontWeight:700}}>
                          {p.name.slice(0,2).toUpperCase()}
                        </div>
                        <span style={{fontWeight:500,fontSize:13}}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{fontSize:12,color:'var(--c-muted)'}}>{p.email||'-'}</td>
                    <td>
                      {p.is_room_admin
                        ? <span className="badge badge-amber">Room admin</span>
                        : <span style={{fontSize:12,color:'var(--c-hint)'}}>Player</span>
                      }
                    </td>
                    <td style={{fontSize:12,color:'var(--c-muted)'}}>
                      {new Date(p.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                    </td>
                    <td style={{textAlign:'right'}}>
                      {p.id !== player?.id && !p.is_room_admin && (
                        <button className="btn btn-danger btn-sm" onClick={() => removePlayer(p.id)}
                          disabled={p._removing}>
                          {p._removing ? 'Removing...' : 'Remove'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* WEIGHTS */}
        {tab === 'weights' && weights && (
          <div className="card">
            <div className="card-title">Scoring weights</div>
            <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1.25rem'}}>
              These weights apply only to your room. Adjust them before the tournament starts, then recalculate scores.
            </p>
            {Object.entries(WEIGHT_LABELS).map(([k, v]) => (
              <div key={k} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <label style={{flex:1,fontSize:14,color:'var(--c-muted)'}}>{v}</label>
                <input type="number" min="0" max="50" value={weights[k]||0} style={{width:72,textAlign:'center'}}
                  onChange={e => setWeights(w => ({...w, [k]: parseInt(e.target.value)||0}))} />
                <span style={{fontSize:13,color:'var(--c-muted)',minWidth:24}}>pts</span>
              </div>
            ))}
            <div style={{display:'flex',gap:10,marginTop:'1rem',alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn btn-accent" onClick={handleSaveWeights} disabled={saving}>
                {saving ? 'Saving...' : 'Save weights'}
              </button>
              <button className="btn" onClick={handleRecalc} disabled={recalcing}>
                {recalcing ? 'Recalculating...' : 'Recalculate all scores'}
              </button>
              {saved && <span className="badge badge-green">Saved!</span>}
              {recalcMsg && <span className="badge badge-green">{recalcMsg}</span>}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {tab === 'results' && (
          <div className="card">
            <div className="card-title">Enter match results</div>
            <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem'}}>
              Results apply globally. After saving, click Recalculate in the Weights tab.
            </p>
            <div className="tabs">
              {PHASES.map(p => (
                <button key={p} className={`tab${phase===p?' active':''}`} onClick={() => setPhase(p)}>
                  {PHASE_LABELS[p]}
                </button>
              ))}
            </div>
            {matches.map(m => <MatchRow key={m.id} match={m} onSave={saveResult} />)}
          </div>
        )}

        {/* INVITE */}
        {tab === 'invite' && (
          <div className="card">
            <div className="card-title">Invite link</div>
            <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem'}}>
              Share this with anyone you want to join your room.
            </p>
            <div style={{background:'var(--c-surface2)',borderRadius:'var(--radius)',padding:'12px 16px',fontFamily:'monospace',fontSize:12,wordBreak:'break-all',border:'1px solid var(--c-border)',marginBottom:12}}>
              {inviteUrl}
            </div>
            <button className="btn btn-accent btn-sm"
              onClick={() => { navigator.clipboard?.writeText(inviteUrl); alert('Copied!') }}>
              Copy link
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MatchRow({ match: initialMatch, onSave }) {
  const [m, setM] = useState(initialMatch)
  const [saved, setSaved] = useState(false)
  function set(field, val) { setM(x => ({...x, [field]: val === '' ? null : parseInt(val)})) }
  async function handleSave() { await onSave(m); setSaved(true); setTimeout(() => setSaved(false), 1500) }
  return (
    <div className="match-row">
      <div className="team-home" style={{fontSize:13}}>{m.home_team}</div>
      <input type="number" min="0" className="score-input" value={m.home_goals??''} placeholder="?" onChange={e=>set('home_goals',e.target.value)}/>
      <span className="score-sep">-</span>
      <input type="number" min="0" className="score-input" value={m.away_goals??''} placeholder="?" onChange={e=>set('away_goals',e.target.value)}/>
      <div className="team-away" style={{fontSize:13}}>{m.away_team}</div>
      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        <input type="number" min="0" className="score-input" value={m.home_goals_et??''} placeholder="ET?" onChange={e=>set('home_goals_et',e.target.value)} title="Extra time home"/>
        <span style={{fontSize:10,color:'var(--c-muted)'}}>ET</span>
        <input type="number" min="0" className="score-input" value={m.away_goals_et??''} placeholder="ET?" onChange={e=>set('away_goals_et',e.target.value)} title="Extra time away"/>
        <button className="btn btn-accent btn-sm" onClick={handleSave}>Save</button>
        {saved && <span className="badge badge-green">Saved</span>}
      </div>
    </div>
  )
}
