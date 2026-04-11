import { useEffect, useState } from 'react'
import { supabase, recalcPlayerScores } from '../lib/supabase'
import { runScoringTests } from '../lib/testRunner'
import { seedDemoData, clearDemoData } from '../lib/demoData'
import { usePlayer } from '../hooks/usePlayer'
import { Navigate } from 'react-router-dom'

const WEIGHT_LABELS = {
  group_result: 'Group stage — correct W/D/L',
  group_diff:   'Group stage — correct goal difference',
  group_exact:  'Group stage — exact score',
  group_approx: 'Group stage — approximation bonus (high-scoring games 4+ goals)',
  ko_team:      'KO round — correct team qualified',
  ko_result:    'KO round — correct result',
  ko_diff:      'KO round — correct goal difference',
  ko_exact:     'KO round — exact score',
}

const PHASES = ['GROUP_A','GROUP_B','GROUP_C','GROUP_D','GROUP_E','GROUP_F','GROUP_G','GROUP_H','GROUP_I','GROUP_J','GROUP_K','GROUP_L','ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL']
const PHASE_LABELS = {GROUP_A:'Group A',GROUP_B:'Group B',GROUP_C:'Group C',GROUP_D:'Group D',GROUP_E:'Group E',GROUP_F:'Group F',GROUP_G:'Group G',GROUP_H:'Group H',GROUP_I:'Group I',GROUP_J:'Group J',GROUP_K:'Group K',GROUP_L:'Group L',ROUND_OF_32:'R32',ROUND_OF_16:'R16',QUARTER_FINALS:'QF',SEMI_FINALS:'SF',THIRD_PLACE:'3rd',FINAL:'Final'}

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
  useEffect(() => { if (tab === 'results') loadMatches() }, [tab, resultPhase])

  async function loadAll() {
    const [{ data: w }, { data: r }, { data: p }] = await Promise.all([
      supabase.from('scoring_weights').select('*').eq('room_code','DEFAULT').single(),
      supabase.from('rooms').select('*').eq('code','DEFAULT').single(),
      supabase.from('players').select('*').eq('room_code','DEFAULT').order('created_at'),
    ])
    setWeights(w)
    setRoom(r)
    setPlayers(p || [])
  }

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').eq('phase', resultPhase).order('match_number')
    setMatches(data || [])
  }

  async function saveWeights() {
    await supabase.from('scoring_weights').update({ ...weights, updated_at: new Date().toISOString() }).eq('room_code','DEFAULT')
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
    setMatches(ms => ms.map(x => x.id === m.id ? { ...x, ...m, status: 'FINISHED' } : x))
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
    await supabase.from('rooms').update({ name: room.name, max_players: room.max_players, lock_rule: room.lock_rule }).eq('code','DEFAULT')
  }

  async function regenToken() {
    const token = Math.random().toString(36).slice(2, 14)
    await supabase.from('rooms').update({ invite_token: token }).eq('code','DEFAULT')
    setRoom(r => ({ ...r, invite_token: token }))
  }

  async function removePlayer(id) {
    const p = players.find(x => x.id === id)
    if (!confirm(`Remove "${p?.name}"? This permanently deletes their account, predictions and scores.`)) return
    setPlayers(ps => ps.map(x => x.id === id ? { ...x, _removing: true } : x))

    const r1 = await supabase.from('scores').delete().eq('player_id', id)
    const r2 = await supabase.from('predictions').delete().eq('player_id', id)
    const r3 = await supabase.from('players').delete().eq('id', id)

    const err = r1.error || r2.error || r3.error
    if (err) {
      alert(`Delete failed: ${err.message}\n\nMake sure you ran migration 003_fix_rls.sql in Supabase.`)
      setPlayers(ps => ps.map(x => x.id === id ? { ...x, _removing: false } : x))
    } else {
      setPlayers(ps => ps.filter(x => x.id !== id))
    }
  }

  async function purgeAllPlayers() {
    if (players.length === 0) { alert('No players to purge.'); return }
    const input = prompt(`Type DELETE to permanently remove all ${players.length} players, their predictions and scores:`)
    if (input !== 'DELETE') { alert('Cancelled — nothing deleted.'); return }

    const ids = players.map(p => p.id)
    setPlayers([])

    const r1 = await supabase.from('scores').delete().in('player_id', ids)
    const r2 = await supabase.from('predictions').delete().in('player_id', ids)
    const r3 = await supabase.from('players').delete().in('id', ids)

    const err = r1.error || r2.error || r3.error
    if (err) {
      alert(`Purge failed: ${err.message}\n\nMake sure you ran migration 003_fix_rls.sql in Supabase.`)
      loadAll()
    } else {
      alert(`Purged ${ids.length} player${ids.length !== 1 ? 's' : ''} successfully.`)
    }
  }

    const inviteUrl = room ? `${window.location.origin}/join?code=${room.invite_token}` : ''

  // Detect duplicates — players sharing the same name (case-insensitive)
  const nameCounts = players.reduce((acc, p) => {
    const key = p.name.toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const dupeCount = players.filter(p => nameCounts[p.name.toLowerCase()] > 1).length

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div>
      <div className="page-header">
        <h1>Admin panel</h1>
        <p>Configure the pool, scoring weights, and match results</p>
      </div>
      <div className="page-body">
        <div className="tabs">
          {['weights','invite','results','players','dev'].map(t => (
            <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'players' && dupeCount > 0 && (
                <span style={{marginLeft:6,fontSize:11,background:'rgba(255,179,71,0.2)',color:'var(--c-warn)',padding:'1px 6px',borderRadius:10}}>
                  {dupeCount} dupe{dupeCount > 1 ? 's' : ''}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Weights */}
        {tab === 'weights' && weights && (
          <div className="card">
            <div className="card-title">Scoring weights</div>
            <p style={{fontSize:14,color:'var(--c-muted)',marginBottom:'1.25rem'}}>
              Configure how many points each prediction type earns. Changes take effect on the next recalculation.
            </p>
            {Object.entries(WEIGHT_LABELS).map(([k, v]) => (
              <div key={k} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <label style={{flex:1,fontSize:14,color:'var(--c-muted)'}}>{v}</label>
                <input type="number" min="0" max="50" value={weights[k] || 0}
                  style={{width:72,textAlign:'center'}}
                  onChange={e => setWeights(w => ({ ...w, [k]: parseInt(e.target.value) || 0 }))} />
                <span style={{fontSize:13,color:'var(--c-muted)',minWidth:24}}>pts</span>
              </div>
            ))}
            <div style={{display:'flex',gap:10,marginTop:'1rem',alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn btn-accent" onClick={saveWeights}>Save weights</button>
              <button className="btn" onClick={handleRecalc} disabled={recalcing}>
                {recalcing ? 'Recalculating...' : 'Recalculate all scores'}
              </button>
              {weightsSaved && <span className="badge badge-green">Saved!</span>}
              {recalcMsg && <span className="badge badge-green">{recalcMsg}</span>}
            </div>
          </div>
        )}

        {/* Invite */}
        {tab === 'invite' && room && (
          <div className="card">
            <div className="card-title">Invite link</div>
            <p style={{fontSize:14,color:'var(--c-muted)',marginBottom:'1rem'}}>Share this link. Anyone who opens it can join your pool.</p>
            <div style={{background:'var(--c-surface2)',borderRadius:'var(--radius)',padding:'12px 16px',fontFamily:'monospace',fontSize:13,wordBreak:'break-all',border:'1px solid var(--c-border)',marginBottom:10}}>
              {inviteUrl}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:'1.5rem'}}>
              <button className="btn btn-accent btn-sm" onClick={() => navigator.clipboard?.writeText(inviteUrl)}>Copy link</button>
              <button className="btn btn-sm" onClick={regenToken}>Regenerate token</button>
            </div>
            <div style={{display:'grid',gap:12,maxWidth:400}}>
              <div className="form-row">
                <label>Pool name</label>
                <input type="text" value={room.name} onChange={e => setRoom(r => ({ ...r, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <label>Max players</label>
                <input type="number" min="2" max="500" value={room.max_players} onChange={e => setRoom(r => ({ ...r, max_players: parseInt(e.target.value) }))} />
              </div>
              <div className="form-row">
                <label>Prediction lock</label>
                <select value={room.lock_rule} onChange={e => setRoom(r => ({ ...r, lock_rule: e.target.value }))}>
                  <option value="kickoff">At kickoff (recommended)</option>
                  <option value="48h">48h before kickoff</option>
                  <option value="matchday">At start of matchday</option>
                </select>
              </div>
              <button className="btn btn-accent" style={{width:'fit-content'}} onClick={saveRoom}>Save settings</button>
            </div>
          </div>
        )}

        {/* Results */}
        {tab === 'results' && (
          <div className="card">
            <div className="card-title">Enter match results</div>
            <div className="alert alert-info" style={{marginBottom:'1rem'}}>
              Enter results manually here, or use "Sync from API" on the Live Scores page.
              After entering results, click "Recalculate all scores" in the Weights tab.
            </div>
            <div className="tabs">
              {PHASES.map(p => (
                <button key={p} className={`tab${resultPhase === p ? ' active' : ''}`} onClick={() => setResultPhase(p)}>
                  {PHASE_LABELS[p]}
                </button>
              ))}
            </div>
            {matches.map(m => (
              <MatchResultRow key={m.id} match={m} onSave={saveResult} />
            ))}
          </div>
        )}

        {/* Players */}
        {tab === 'players' && (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'1.25rem',borderBottom:'1px solid var(--c-border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div className="card-title" style={{marginBottom:0}}>Players ({players.length})</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                {dupeCount > 0 && (
                  <span className="badge badge-amber">{dupeCount} dupe{dupeCount > 1 ? 's' : ''}</span>
                )}
                {players.length > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={purgeAllPlayers}
                    style={{fontSize:11,padding:'4px 10px'}}>
                    Purge all
                  </button>
                )}
              </div>
            </div>
            {dupeCount > 0 && (
              <div className="alert alert-warn" style={{margin:'0.75rem 1.25rem',fontSize:13}}>
                Duplicate names found. The player who joined first is the real account — remove the newer duplicate.
                Players can use "Log back in" on the join page instead of creating a new account.
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Joined</th>
                  <th>Predictions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => {
                  const isDupe = nameCounts[p.name.toLowerCase()] > 1
                  return (
                    <tr key={p.id} style={isDupe ? {background:'rgba(255,179,71,0.04)'} : {}}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="avatar" style={{background:'rgba(201,245,66,0.1)',color:'var(--c-accent)'}}>
                            {p.name.slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontWeight:500}}>{p.name}</div>
                            <div style={{fontSize:11,color:"var(--c-muted)"}}>{p.email || "no email"}</div>
                            {isDupe && (
                              <div style={{fontSize:11,color:'var(--c-warn)'}}>Duplicate name</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{color:'var(--c-muted)',fontSize:13}}>
                        {new Date(p.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                        {' '}
                        <span style={{fontSize:11}}>{new Date(p.created_at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</span>
                      </td>
                      <td>
                        <PlayerPredCount playerId={p.id} />
                      </td>
                      <td style={{textAlign:'right'}}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removePlayer(p.id)}
                          disabled={p._removing}
                          style={p._removing ? {opacity:0.5} : {}}
                        >
                          {p._removing ? 'Removing...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      {/* Dev / Test Mode */}
      {tab === 'dev' && <DevPanel onRefresh={loadAll} />}

      </div>
    </div>
  )
}

function DevPanel({ onRefresh }) {
  const [testResults, setTestResults] = useState(null)
  const [demoStatus, setDemoStatus] = useState('idle') // idle | seeding | clearing | done | error
  const [demoLog, setDemoLog] = useState([])
  const [demoStats, setDemoStats] = useState(null)
  const [isDemoActive, setIsDemoActive] = useState(false)

  useEffect(() => {
    // Check if demo data is currently active
    supabase.from('players').select('id').eq('room_code','DEFAULT').eq('email','demo+shawn@test.com').single()
      .then(({ data }) => setIsDemoActive(!!data))
  }, [])

  function runTests() {
    const results = runScoringTests()
    setTestResults(results)
  }

  async function handleSeedDemo() {
    setDemoStatus('seeding')
    setDemoLog([])
    setDemoStats(null)
    try {
      const stats = await seedDemoData(msg => setDemoLog(l => [...l, msg]))
      setDemoStats(stats)
      setDemoStatus('done')
      setIsDemoActive(true)
      onRefresh()
    } catch (e) {
      setDemoLog(l => [...l, 'ERROR: ' + e.message])
      setDemoStatus('error')
    }
  }

  async function handleClearDemo() {
    setDemoStatus('clearing')
    setDemoLog(['Clearing demo data...'])
    try {
      await clearDemoData()
      setDemoLog(l => [...l, 'Done — demo data removed.'])
      setDemoStatus('idle')
      setIsDemoActive(false)
      setDemoStats(null)
      onRefresh()
    } catch (e) {
      setDemoLog(l => [...l, 'ERROR: ' + e.message])
      setDemoStatus('error')
    }
  }

  const passed = testResults?.filter(r => r.pass).length
  const failed = testResults?.filter(r => !r.pass).length

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>

      {/* Demo mode */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Demo mode</div>
        <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.7}}>
          Seeds 8 dummy players with realistic predictions and results for the first 24 group matches.
          Lets you preview the leaderboard, stats charts, and scoring engine with real-looking data.
          Clear it when done — it won't affect your real players.
        </p>

        {isDemoActive && (
          <div className="alert alert-warn" style={{marginBottom:'1rem'}}>
            Demo data is currently active. Your leaderboard and stats are showing demo players.
            Clear it before the real tournament starts.
          </div>
        )}

        <div style={{display:'flex',gap:10,marginBottom:'1rem',flexWrap:'wrap'}}>
          <button
            className="btn btn-accent"
            onClick={handleSeedDemo}
            disabled={demoStatus === 'seeding' || demoStatus === 'clearing'}
          >
            {demoStatus === 'seeding' ? 'Seeding...' : isDemoActive ? 'Re-seed Demo' : 'Seed Demo Data'}
          </button>
          {isDemoActive && (
            <button
              className="btn btn-danger"
              onClick={handleClearDemo}
              disabled={demoStatus === 'seeding' || demoStatus === 'clearing'}
            >
              {demoStatus === 'clearing' ? 'Clearing...' : 'Clear Demo Data'}
            </button>
          )}
        </div>

        {demoLog.length > 0 && (
          <div style={{background:'var(--c-surface2)',border:'1px solid var(--c-border)',borderRadius:'var(--radius)',padding:'10px 14px',fontFamily:'monospace',fontSize:12,color:'var(--c-muted)',lineHeight:1.8}}>
            {demoLog.map((l,i) => <div key={i}>{l}</div>)}
          </div>
        )}

        {demoStats && (
          <div style={{display:'flex',gap:12,marginTop:'1rem',flexWrap:'wrap'}}>
            {[
              {label:'Players created', value: demoStats.players},
              {label:'Predictions',     value: demoStats.predictions},
              {label:'Scores computed', value: demoStats.scores},
            ].map(s => (
              <div key={s.label} className="metric" style={{minWidth:130}}>
                <div className="metric-label">{s.label}</div>
                <div className="metric-value" style={{fontSize:28}}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scoring engine tests */}
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Scoring engine tests</div>
        <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.7}}>
          Runs {18} unit tests against the scoring logic — exact scores, goal diff, approx bonus,
          KO rounds, edge cases. All tests run in-browser against the live code.
        </p>

        <button className="btn btn-accent" onClick={runTests} style={{marginBottom:'1rem'}}>
          Run all tests
        </button>

        {testResults && (
          <>
            <div style={{display:'flex',gap:12,marginBottom:'1rem',flexWrap:'wrap'}}>
              <div className="metric" style={{minWidth:120}}>
                <div className="metric-label">Passed</div>
                <div className="metric-value" style={{fontSize:28,color:'var(--c-success)'}}>{passed}</div>
              </div>
              <div className="metric" style={{minWidth:120}}>
                <div className="metric-label">Failed</div>
                <div className="metric-value" style={{fontSize:28,color: failed > 0 ? 'var(--c-danger)' : 'var(--c-muted)'}}>{failed}</div>
              </div>
              <div className="metric" style={{minWidth:120}}>
                <div className="metric-label">Total</div>
                <div className="metric-value" style={{fontSize:28}}>{testResults.length}</div>
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {testResults.map((r,i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'flex-start', gap:10,
                  padding:'8px 12px', borderRadius:'var(--radius)',
                  background: r.pass ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${r.pass ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.2)'}`,
                  fontSize:13
                }}>
                  <span style={{
                    fontFamily:'monospace', fontWeight:700, flexShrink:0, fontSize:11,
                    color: r.pass ? 'var(--c-success)' : 'var(--c-danger)',
                    marginTop:1
                  }}>
                    {r.pass ? 'PASS' : 'FAIL'}
                  </span>
                  <div>
                    <div style={{color:'var(--c-text)'}}>{r.name}</div>
                    {!r.pass && r.error && (
                      <div style={{color:'var(--c-danger)',fontSize:11,marginTop:2,fontFamily:'monospace'}}>{r.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PlayerPredCount({ playerId }) {
  const [count, setCount] = useState(null)
  useEffect(() => {
    supabase.from('predictions').select('id', {count:'exact',head:true}).eq('player_id', playerId)
      .then(({ count: c }) => setCount(c || 0))
  }, [playerId])
  if (count === null) return <span style={{color:'var(--c-muted)',fontSize:13}}>...</span>
  return (
    <span style={{color:'var(--c-muted)',fontSize:13}}>
      {count} / 104
      {count === 0 && <span style={{marginLeft:6,fontSize:11,color:'var(--c-warn)'}}>none submitted</span>}
    </span>
  )
}

function MatchResultRow({ match: initialMatch, onSave }) {
  const [m, setM] = useState(initialMatch)
  const [saved, setSaved] = useState(false)

  function set(field, val) {
    setM(x => ({ ...x, [field]: val === '' ? null : parseInt(val) }))
  }

  async function handleSave() {
    await onSave(m)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="match-row">
      <div className="team-home" style={{fontSize:14}}>{m.home_team}</div>
      <input type="number" min="0" className="score-input" value={m.home_goals ?? ''} placeholder="?" onChange={e => set('home_goals', e.target.value)} />
      <span className="score-sep">-</span>
      <input type="number" min="0" className="score-input" value={m.away_goals ?? ''} placeholder="?" onChange={e => set('away_goals', e.target.value)} />
      <div className="team-away" style={{fontSize:14,textAlign:'left'}}>{m.away_team}</div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <input type="number" min="0" className="score-input" value={m.home_goals_et ?? ''} placeholder="ET?" onChange={e => set('home_goals_et', e.target.value)} title="Extra time home" />
        <span style={{fontSize:11,color:'var(--c-muted)'}}>ET</span>
        <input type="number" min="0" className="score-input" value={m.away_goals_et ?? ''} placeholder="ET?" onChange={e => set('away_goals_et', e.target.value)} title="Extra time away" />
        <input type="number" min="0" className="score-input" value={m.home_goals_pen ?? ''} placeholder="PEN?" onChange={e => set('home_goals_pen', e.target.value)} title="Penalty home" />
        <span style={{fontSize:11,color:'var(--c-muted)'}}>PEN</span>
        <input type="number" min="0" className="score-input" value={m.away_goals_pen ?? ''} placeholder="PEN?" onChange={e => set('away_goals_pen', e.target.value)} title="Penalty away" />
        <button className="btn btn-accent btn-sm" onClick={handleSave}>Save</button>
        {saved && <span className="badge badge-green">Saved</span>}
      </div>
    </div>
  )
}
