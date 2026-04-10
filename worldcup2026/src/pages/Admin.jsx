import { useEffect, useState } from 'react'
import { supabase, recalcPlayerScores } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { Navigate } from 'react-router-dom'

const WEIGHT_LABELS = {
  group_result: 'Group stage — correct W/D/L',
  group_diff:   'Group stage — correct goal difference',
  group_exact:  'Group stage — exact score',
  group_approx: 'Group stage — approximation bonus (high-scoring games ≥4 goals)',
  ko_team:      'KO round — correct team qualified',
  ko_result:    'KO round — correct result',
  ko_diff:      'KO round — correct goal difference',
  ko_exact:     'KO round — exact score',
}

export default function Admin() {
  const { isAdmin } = usePlayer()
  const [tab, setTab] = useState('weights')
  const [weights, setWeights] = useState(null)
  const [weightsSaved, setWeightsSaved] = useState(false)
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [resultPhase, setResultPhase] = useState('GROUP_A')
  const [recalcing, setRecalcing] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState('')

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if(tab==='results') loadMatches() }, [tab, resultPhase])

  async function loadAll() {
    const [{ data: w }, { data: r }, { data: p }] = await Promise.all([
      supabase.from('scoring_weights').select('*').eq('room_code','DEFAULT').single(),
      supabase.from('rooms').select('*').eq('code','DEFAULT').single(),
      supabase.from('players').select('*').eq('room_code','DEFAULT').order('created_at'),
    ])
    setWeights(w)
    setRoom(r)
    setPlayers(p||[])
  }

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').eq('phase', resultPhase).order('match_number')
    setMatches(data||[])
  }

  async function saveWeights() {
    await supabase.from('scoring_weights').update({...weights, updated_at: new Date().toISOString()}).eq('room_code','DEFAULT')
    setWeightsSaved(true)
    setTimeout(() => setWeightsSaved(false), 2000)
  }

  async function saveResult(m) {
    await supabase.from('matches').update({
      home_goals: m.home_goals, away_goals: m.away_goals,
      home_goals_et: m.home_goals_et, away_goals_et: m.away_goals_et,
      home_goals_pen: m.home_goals_pen, away_goals_pen: m.away_goals_pen,
      status: 'FINISHED', updated_at: new Date().toISOString()
    }).eq('id', m.id)
    setMatches(ms => ms.map(x => x.id===m.id ? {...x,...m,status:'FINISHED'} : x))
  }

  async function handleRecalc() {
    setRecalcing(true)
    setRecalcMsg('')
    await recalcPlayerScores('DEFAULT')
    setRecalcing(false)
    setRecalcMsg('Scores recalculated!')
    setTimeout(() => setRecalcMsg(''), 3000)
  }

  async function saveRoom() {
    await supabase.from('rooms').update({name: room.name, max_players: room.max_players, lock_rule: room.lock_rule}).eq('code','DEFAULT')
  }

  async function regenToken() {
    const token = Math.random().toString(36).slice(2,14)
    await supabase.from('rooms').update({invite_token: token}).eq('code','DEFAULT')
    setRoom(r => ({...r, invite_token: token}))
  }

  async function removePlayer(id) {
    if (!confirm('Remove this player? Their predictions will also be deleted.')) return
    await supabase.from('players').delete().eq('id', id)
    setPlayers(p => p.filter(x => x.id !== id))
  }

  const inviteUrl = room ? `${window.location.origin}/join?code=${room.invite_token}` : ''

  const PHASES = ['GROUP_A','GROUP_B','GROUP_C','GROUP_D','GROUP_E','GROUP_F','GROUP_G','GROUP_H','GROUP_I','GROUP_J','GROUP_K','GROUP_L','ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL']
  const PHASE_LABELS = {GROUP_A:'Group A',GROUP_B:'Group B',GROUP_C:'Group C',GROUP_D:'Group D',GROUP_E:'Group E',GROUP_F:'Group F',GROUP_G:'Group G',GROUP_H:'Group H',GROUP_I:'Group I',GROUP_J:'Group J',GROUP_K:'Group K',GROUP_L:'Group L',ROUND_OF_32:'R32',ROUND_OF_16:'R16',QUARTER_FINALS:'QF',SEMI_FINALS:'SF',THIRD_PLACE:'3rd',FINAL:'Final'}

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div>
      <div className="page-header">
        <h1>Admin panel</h1>
        <p>Configure the pool, scoring weights, and match results</p>
      </div>
      <div className="page-body">
        <div className="tabs">
          {['weights','invite','results','players'].map(t => (
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Weights ── */}
        {tab === 'weights' && weights && (
          <div className="card">
            <div className="card-title">Scoring weights</div>
            <p style={{fontSize:14,color:'var(--c-muted)',marginBottom:'1.25rem'}}>
              Configure how many points each prediction type earns. Changes take effect on the next recalculation.
            </p>
            {Object.entries(WEIGHT_LABELS).map(([k,v]) => (
              <div key={k} className="input-row" style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <label style={{flex:1,fontSize:14,color:'var(--c-muted)'}}>{v}</label>
                <input type="number" min="0" max="50" value={weights[k]||0}
                  style={{width:72,textAlign:'center'}}
                  onChange={e => setWeights(w => ({...w, [k]: parseInt(e.target.value)||0}))} />
                <span style={{fontSize:13,color:'var(--c-muted)',minWidth:24}}>pts</span>
              </div>
            ))}
            <div style={{display:'flex',gap:10,marginTop:'1rem',alignItems:'center'}}>
              <button className="btn btn-accent" onClick={saveWeights}>Save weights</button>
              <button className="btn" onClick={handleRecalc} disabled={recalcing}>
                {recalcing ? 'Recalculating...' : 'Recalculate all scores'}
              </button>
              {weightsSaved && <span className="badge badge-green">Saved!</span>}
              {recalcMsg && <span className="badge badge-green">{recalcMsg}</span>}
            </div>
          </div>
        )}

        {/* ── Invite ── */}
        {tab === 'invite' && room && (
          <div className="card">
            <div className="card-title">Invite link</div>
            <p style={{fontSize:14,color:'var(--c-muted)',marginBottom:'1rem'}}>Share this link. Anyone who opens it can join your pool.</p>
            <div style={{background:'var(--c-surface2)',borderRadius:'var(--radius)',padding:'12px 16px',fontFamily:'var(--font-mono)',fontSize:13,wordBreak:'break-all',border:'1px solid var(--c-border)',marginBottom:10}}>
              {inviteUrl}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:'1.5rem'}}>
              <button className="btn btn-accent btn-sm" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>Copy link</button>
              <button className="btn btn-sm" onClick={regenToken}>Regenerate token</button>
            </div>
            <div style={{display:'grid',gap:12,maxWidth:400}}>
              <div className="form-row">
                <label>Pool name</label>
                <input type="text" value={room.name} onChange={e => setRoom(r=>({...r,name:e.target.value}))} />
              </div>
              <div className="form-row">
                <label>Max players</label>
                <input type="number" min="2" max="500" value={room.max_players} onChange={e => setRoom(r=>({...r,max_players:parseInt(e.target.value)}))} />
              </div>
              <div className="form-row">
                <label>Prediction lock</label>
                <select value={room.lock_rule} onChange={e => setRoom(r=>({...r,lock_rule:e.target.value}))}>
                  <option value="kickoff">At kickoff (recommended)</option>
                  <option value="48h">48h before kickoff</option>
                  <option value="matchday">At start of matchday</option>
                </select>
              </div>
              <button className="btn btn-accent" style={{width:'fit-content'}} onClick={saveRoom}>Save settings</button>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {tab === 'results' && (
          <div className="card">
            <div className="card-title">Enter match results</div>
            <div className="alert alert-info" style={{marginBottom:'1rem'}}>
              Enter results manually here, or use "Sync from API" on the Live Scores page if you have a football-data.org key.
              After entering results, click "Recalculate all scores" in the Weights tab.
            </div>
            <div className="tabs">
              {PHASES.map(p => (
                <button key={p} className={`tab${resultPhase===p?' active':''}`} onClick={() => setResultPhase(p)}>
                  {PHASE_LABELS[p]}
                </button>
              ))}
            </div>
            {matches.map(m => (
              <MatchResultRow key={m.id} match={m} onSave={saveResult} />
            ))}
          </div>
        )}

        {/* ── Players ── */}
        {tab === 'players' && (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'1.25rem',borderBottom:'1px solid var(--c-border)'}}>
              <div className="card-title" style={{marginBottom:0}}>Players ({players.length})</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Joined</th>
                  <th>Admin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div className="avatar" style={{background:'rgba(201,245,66,0.1)',color:'var(--c-accent)'}}>
                          {p.name.slice(0,2).toUpperCase()}
                        </div>
                        {p.name}
                      </div>
                    </td>
                    <td style={{color:'var(--c-muted)',fontSize:13}}>{new Date(p.created_at).toLocaleDateString()}</td>
                    <td>{p.is_admin ? <span className="badge badge-green">Admin</span> : '—'}</td>
                    <td style={{textAlign:'right'}}>
                      <button className="btn btn-danger btn-sm" onClick={() => removePlayer(p.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MatchResultRow({ match: initialMatch, onSave }) {
  const [m, setM] = useState(initialMatch)
  const [saved, setSaved] = useState(false)

  function set(field, val) {
    setM(x => ({...x, [field]: val === '' ? null : parseInt(val)}))
  }

  async function handleSave() {
    await onSave(m)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="match-row">
      <div className="team-home" style={{fontSize:14}}>{m.home_team}</div>
      <input type="number" min="0" className="score-input" value={m.home_goals??''} placeholder="?" onChange={e=>set('home_goals',e.target.value)} />
      <span className="score-sep">—</span>
      <input type="number" min="0" className="score-input" value={m.away_goals??''} placeholder="?" onChange={e=>set('away_goals',e.target.value)} />
      <div className="team-away" style={{fontSize:14,textAlign:'left'}}>{m.away_team}</div>
      <div style={{display:'flex',alignItems:'center',gap:8,gridColumn:'span 0'}}>
        <input type="number" min="0" className="score-input" value={m.home_goals_et??''} placeholder="ET?" onChange={e=>set('home_goals_et',e.target.value)} title="Extra time home" />
        <span style={{fontSize:11,color:'var(--c-muted)'}}>ET</span>
        <input type="number" min="0" className="score-input" value={m.away_goals_et??''} placeholder="ET?" onChange={e=>set('away_goals_et',e.target.value)} title="Extra time away" />
        <input type="number" min="0" className="score-input" value={m.home_goals_pen??''} placeholder="PEN?" onChange={e=>set('home_goals_pen',e.target.value)} title="Penalty home" />
        <span style={{fontSize:11,color:'var(--c-muted)'}}>PEN</span>
        <input type="number" min="0" className="score-input" value={m.away_goals_pen??''} placeholder="PEN?" onChange={e=>set('away_goals_pen',e.target.value)} title="Penalty away" />
        <button className="btn btn-accent btn-sm" onClick={handleSave}>Save</button>
        {saved && <span className="badge badge-green">Saved</span>}
      </div>
    </div>
  )
}
