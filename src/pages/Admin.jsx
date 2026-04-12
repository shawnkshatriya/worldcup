import { useEffect, useState, useCallback } from 'react'
import { supabase, recalcPlayerScores } from '../lib/supabase'
import { getAllRooms, createRoom, deleteRoom, updateRoom, regenToken, saveRoomWeights } from '../lib/rooms'
import { runScoringTests } from '../lib/testRunner'
import { seedDemoData, clearDemoData } from '../lib/demoData'
import { usePlayer } from '../hooks/usePlayer'
import { Navigate } from 'react-router-dom'

const WEIGHT_LABELS = {
  group_result: 'Group stage — correct W/D/L',
  group_diff:   'Group stage — correct goal difference',
  group_exact:  'Group stage — exact score',
  group_approx: 'Group stage — approximation bonus (4+ goal games)',
  ko_team:      'KO round — correct team qualified',
  ko_result:    'KO round — correct result',
  ko_diff:      'KO round — correct goal difference',
  ko_exact:     'KO round — exact score',
}

const PHASES = ['GROUP_A','GROUP_B','GROUP_C','GROUP_D','GROUP_E','GROUP_F','GROUP_G','GROUP_H','GROUP_I','GROUP_J','GROUP_K','GROUP_L','ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL']
const PHASE_LABELS = {GROUP_A:'Group A',GROUP_B:'Group B',GROUP_C:'Group C',GROUP_D:'Group D',GROUP_E:'Group E',GROUP_F:'Group F',GROUP_G:'Group G',GROUP_H:'Group H',GROUP_I:'Group I',GROUP_J:'Group J',GROUP_K:'Group K',GROUP_L:'Group L',ROUND_OF_32:'R32',ROUND_OF_16:'R16',QUARTER_FINALS:'QF',SEMI_FINALS:'SF',THIRD_PLACE:'3rd',FINAL:'Final'}

export default function Admin() {
  const { isAdmin, adminRoom, switchAdminRoom } = usePlayer()
  const [tab, setTab]         = useState('rooms')
  const [rooms, setRooms]     = useState([])
  const [roomData, setRoomData] = useState(null)   // current room full data
  const [weights, setWeights] = useState(null)
  const [weightsSaved, setWeightsSaved] = useState(false)
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [resultPhase, setResultPhase] = useState('GROUP_A')
  const [recalcing, setRecalcing] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState('')
  const [newRoomName, setNewRoomName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadRooms() }, [])
  useEffect(() => { if (adminRoom) loadRoomData() }, [adminRoom])
  useEffect(() => { if (tab === 'results') loadMatches() }, [tab, resultPhase])

  async function loadRooms() {
    const all = await getAllRooms()
    setRooms(all)
  }

  async function loadRoomData() {
    const [{ data: r }, { data: w }, { data: p }] = await Promise.all([
      supabase.from('rooms').select('*').eq('code', adminRoom).single(),
      supabase.from('scoring_weights').select('*').eq('room_code', adminRoom).single(),
      supabase.from('players').select('*').eq('room_code', adminRoom).order('created_at'),
    ])
    setRoomData(r)
    setWeights(w)
    setPlayers(p || [])
  }

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').eq('phase', resultPhase).order('match_number')
    setMatches(data || [])
  }

  async function handleCreateRoom() {
    if (!newRoomName.trim()) return
    setCreating(true)
    try {
      const room = await createRoom(newRoomName.trim())
      setNewRoomName('')
      await loadRooms()
      switchAdminRoom(room.code)
      setTab('invite') // Jump to invite tab so they can copy the link
    } catch (e) { alert('Failed to create room: ' + e.message) }
    setCreating(false)
  }

  async function handleDeleteRoom(code) {
    if (!confirm(`Delete room "${code}" and ALL its players, predictions and scores? This cannot be undone.`)) return
    try {
      // Delete all players first (cascades to predictions/scores)
      const { data: ps } = await supabase.from('players').select('id').eq('room_code', code)
      if (ps?.length) {
        const ids = ps.map(p => p.id)
        await supabase.from('scores').delete().in('player_id', ids)
        await supabase.from('predictions').delete().in('player_id', ids)
        await supabase.from('players').delete().in('id', ids)
      }
      await supabase.from('scoring_weights').delete().eq('room_code', code)
      await supabase.from('rooms').delete().eq('code', code)
      await loadRooms()
      if (adminRoom === code) switchAdminRoom('DEFAULT')
    } catch (e) { alert('Delete failed: ' + e.message) }
  }

  async function saveWeights() {
    await saveRoomWeights(adminRoom, weights)
    setWeightsSaved(true)
    setTimeout(() => setWeightsSaved(false), 2000)
  }

  async function handleRecalc() {
    setRecalcing(true); setRecalcMsg('')
    await recalcPlayerScores(adminRoom)
    setRecalcing(false); setRecalcMsg('Scores recalculated!')
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
    if (!confirm(`Remove "${p?.name}"? Permanently deletes their account, predictions and scores.`)) return
    setPlayers(ps => ps.map(x => x.id === id ? { ...x, _removing: true } : x))
    const r1 = await supabase.from('scores').delete().eq('player_id', id)
    const r2 = await supabase.from('predictions').delete().eq('player_id', id)
    const r3 = await supabase.from('players').delete().eq('id', id)
    const err = r1.error || r2.error || r3.error
    if (err) {
      alert(`Delete failed: ${err.message}`)
      setPlayers(ps => ps.map(x => x.id === id ? { ...x, _removing: false } : x))
    } else {
      setPlayers(ps => ps.filter(x => x.id !== id))
    }
  }

  async function purgeAllPlayers() {
    if (!players.length) { alert('No players to purge.'); return }
    const input = prompt(`Type DELETE to permanently remove all ${players.length} players in this room:`)
    if (input !== 'DELETE') { alert('Cancelled.'); return }
    const ids = players.map(p => p.id)
    setPlayers([])
    await supabase.from('scores').delete().in('player_id', ids)
    await supabase.from('predictions').delete().in('player_id', ids)
    const { error } = await supabase.from('players').delete().in('id', ids)
    if (error) { alert('Purge failed: ' + error.message); loadRoomData() }
    else alert(`Purged ${ids.length} players from this room.`)
  }

  async function handleRegenToken() {
    const token = await regenToken(adminRoom)
    setRoomData(r => ({ ...r, invite_token: token }))
  }

  const inviteUrl = roomData ? `${window.location.origin}/join?code=${roomData.invite_token}` : ''
  const nameCounts = players.reduce((acc, p) => { const k = p.name.toLowerCase(); acc[k] = (acc[k]||0)+1; return acc }, {})
  const dupeCount = players.filter(p => nameCounts[p.name.toLowerCase()] > 1).length
  const currentRoom = rooms.find(r => r.code === adminRoom)

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Admin panel</h1>
          <p>Managing: <strong>{currentRoom?.name || adminRoom}</strong> · {players.length} players</p>
        </div>
      </div>
      <div className="page-body">

        {/* Room switcher */}
        <div style={{display:'flex',gap:8,marginBottom:'1.25rem',flexWrap:'wrap',alignItems:'center'}}>
          {rooms.map(r => (
            <button key={r.code}
              onClick={() => switchAdminRoom(r.code)}
              style={{
                padding:'6px 14px', borderRadius:20, fontSize:13, fontWeight:600,
                cursor:'pointer', border:'1px solid', transition:'all 0.12s',
                background: adminRoom===r.code ? 'var(--c-accent)' : 'var(--c-surface2)',
                borderColor: adminRoom===r.code ? 'var(--c-accent)' : 'var(--c-border)',
                color: adminRoom===r.code ? '#fff' : 'var(--c-muted)',
              }}>
              {r.name}
              <span style={{marginLeft:6,fontSize:10,opacity:0.7}}>
                {/* player count would need join — skip for now */}
              </span>
            </button>
          ))}
        </div>

        <div className="tabs">
          {['rooms','weights','invite','results','players','dev'].map(t => (
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
              {t==='players' && dupeCount>0 && (
                <span style={{marginLeft:6,fontSize:10,background:'rgba(255,179,71,0.2)',color:'var(--c-warn)',padding:'1px 5px',borderRadius:10}}>{dupeCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── ROOMS ── */}
        {tab==='rooms' && (
          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
            <div className="card" style={{marginBottom:0}}>
              <div className="card-title">Create new room</div>
              <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem'}}>Each room is a completely separate pool — own players, leaderboard, scoring weights, and invite link.</p>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <input type="text" value={newRoomName} onChange={e=>setNewRoomName(e.target.value)}
                  placeholder="e.g. Work Pool 2026 or Lads FC"
                  style={{flex:1,minWidth:200}} onKeyDown={e=>e.key==='Enter'&&handleCreateRoom()} />
                <button className="btn btn-accent" onClick={handleCreateRoom} disabled={creating||!newRoomName.trim()}>
                  {creating ? 'Creating...' : 'Create room'}
                </button>
              </div>
            </div>

            <div className="card" style={{marginBottom:0,padding:0,overflow:'hidden'}}>
              <div style={{padding:'1.25rem 1.5rem 0.75rem'}}><div className="card-title" style={{marginBottom:0}}>All rooms</div></div>
              <table>
                <thead><tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Max players</th>
                  <th>Invite token</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {rooms.map(r => (
                    <tr key={r.code} style={r.code===adminRoom?{background:'rgba(200,16,46,0.04)'}:{}}>
                      <td style={{fontWeight:500}}>{r.name}{r.code==='DEFAULT'&&<span style={{marginLeft:6,fontSize:10,color:'var(--c-muted)'}}>default</span>}</td>
                      <td style={{fontFamily:'monospace',fontSize:12,color:'var(--c-muted)'}}>{r.code}</td>
                      <td style={{color:'var(--c-muted)'}}>{r.max_players}</td>
                      <td style={{fontFamily:'monospace',fontSize:11,color:'var(--c-muted)'}}>{r.invite_token}</td>
                      <td style={{textAlign:'right',display:'flex',gap:6,justifyContent:'flex-end'}}>
                        <button className="btn btn-sm" onClick={()=>switchAdminRoom(r.code)}
                          style={r.code===adminRoom?{color:'var(--c-accent)'}:{}}>
                          {r.code===adminRoom?'Managing':'Manage'}
                        </button>
                        {r.code!=='DEFAULT' && (
                          <button className="btn btn-danger btn-sm" onClick={()=>handleDeleteRoom(r.code)}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── WEIGHTS ── */}
        {tab==='weights' && weights && (
          <div className="card">
            <div className="card-title">Scoring weights — {currentRoom?.name}</div>
            <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1.25rem'}}>
              These weights apply only to <strong>{currentRoom?.name}</strong>. Each room can have different scoring rules.
            </p>
            {Object.entries(WEIGHT_LABELS).map(([k,v]) => (
              <div key={k} style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <label style={{flex:1,fontSize:14,color:'var(--c-muted)'}}>{v}</label>
                <input type="number" min="0" max="50" value={weights[k]||0} style={{width:72,textAlign:'center'}}
                  onChange={e=>setWeights(w=>({...w,[k]:parseInt(e.target.value)||0}))} />
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

        {/* ── INVITE ── */}
        {tab==='invite' && roomData && (
          <div className="card">
            <div className="card-title">Invite link — {currentRoom?.name}</div>
            <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem'}}>Share this link. Anyone who opens it joins <strong>{currentRoom?.name}</strong>.</p>
            <div style={{background:'var(--c-surface2)',borderRadius:'var(--radius)',padding:'12px 16px',fontFamily:'monospace',fontSize:12,wordBreak:'break-all',border:'1px solid var(--c-border)',marginBottom:10}}>
              {inviteUrl}
            </div>
            <div style={{display:'flex',gap:8,marginBottom:'1.5rem',flexWrap:'wrap'}}>
              <button className="btn btn-accent btn-sm" onClick={()=>navigator.clipboard?.writeText(inviteUrl)}>Copy link</button>
              <button className="btn btn-sm" onClick={handleRegenToken}>Regenerate token</button>
            </div>
            <div style={{display:'grid',gap:12,maxWidth:400}}>
              <div className="form-row">
                <label>Room name</label>
                <input type="text" value={roomData.name} onChange={e=>setRoomData(r=>({...r,name:e.target.value}))} />
              </div>
              <div className="form-row">
                <label>Max players</label>
                <input type="number" min="2" max="500" value={roomData.max_players} onChange={e=>setRoomData(r=>({...r,max_players:parseInt(e.target.value)}))} />
              </div>
              <button className="btn btn-accent" style={{width:'fit-content'}}
                onClick={()=>updateRoom(adminRoom,{name:roomData.name,max_players:roomData.max_players})}>
                Save settings
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {tab==='results' && (
          <div className="card">
            <div className="card-title">Enter match results</div>
            <div className="alert alert-info" style={{marginBottom:'1rem'}}>
              Results apply globally across all rooms. After entering, click Recalculate in Weights tab for each room.
            </div>
            <div className="tabs">
              {PHASES.map(p=>(
                <button key={p} className={`tab${resultPhase===p?' active':''}`} onClick={()=>setResultPhase(p)}>
                  {PHASE_LABELS[p]}
                </button>
              ))}
            </div>
            {matches.map(m=><MatchResultRow key={m.id} match={m} onSave={saveResult}/>)}
          </div>
        )}

        {/* ── PLAYERS ── */}
        {tab==='players' && (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'1.25rem',borderBottom:'1px solid var(--c-border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div className="card-title" style={{marginBottom:0}}>Players — {currentRoom?.name} ({players.length})</div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {dupeCount>0&&<span className="badge badge-amber">{dupeCount} duplicate{dupeCount>1?'s':''}</span>}
                {players.length>0&&<button className="btn btn-danger btn-sm" onClick={purgeAllPlayers}>Purge all</button>}
              </div>
            </div>
            {dupeCount>0&&(
              <div className="alert alert-warn" style={{margin:'0.75rem 1.25rem',fontSize:13}}>
                Duplicate names found. Keep the earliest join date — remove the newer duplicate.
              </div>
            )}
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Predictions</th><th></th></tr></thead>
              <tbody>
                {players.map(p=>{
                  const isDupe = nameCounts[p.name.toLowerCase()]>1
                  return (
                    <tr key={p.id} style={isDupe?{background:'rgba(255,179,71,0.04)'}:{}}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="avatar" style={{background:'rgba(200,16,46,0.15)',color:'var(--c-accent)',fontSize:11,fontWeight:700}}>
                            {p.name.slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontWeight:500}}>{p.name}</div>
                            {isDupe&&<div style={{fontSize:10,color:'var(--c-warn)'}}>Duplicate name</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{fontSize:12,color:'var(--c-muted)'}}>{p.email||'—'}</td>
                      <td style={{fontSize:12,color:'var(--c-muted)'}}>
                        {new Date(p.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                        {' '}{new Date(p.created_at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
                      </td>
                      <td><PlayerPredCount playerId={p.id}/></td>
                      <td style={{textAlign:'right'}}>
                        <button className="btn btn-danger btn-sm" onClick={()=>removePlayer(p.id)}
                          disabled={p._removing} style={p._removing?{opacity:0.5}:{}}>
                          {p._removing?'Removing...':'Remove'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── DEV ── */}
        {tab==='dev' && <DevPanel onRefresh={loadRoomData} roomCode={adminRoom} roomName={currentRoom?.name}/>}
      </div>
    </div>
  )
}

function PlayerPredCount({ playerId }) {
  const [count, setCount] = useState(null)
  useEffect(()=>{
    supabase.from('predictions').select('id',{count:'exact',head:true}).eq('player_id',playerId)
      .then(({count:c})=>setCount(c||0))
  },[playerId])
  if (count===null) return <span style={{color:'var(--c-muted)',fontSize:12}}>...</span>
  return <span style={{color:'var(--c-muted)',fontSize:12}}>{count}/104{count===0&&<span style={{marginLeft:6,fontSize:10,color:'var(--c-warn)'}}>none</span>}</span>
}

function DevPanel({ onRefresh, roomCode, roomName }) {
  const [testResults, setTestResults] = useState(null)
  const [demoStatus, setDemoStatus]   = useState('idle')
  const [demoLog, setDemoLog]         = useState([])
  const [demoStats, setDemoStats]     = useState(null)
  const [isDemoActive, setIsDemoActive] = useState(false)

  useEffect(()=>{
    supabase.from('players').select('id').eq('room_code','DEFAULT').eq('email','demo+shawn@wc26.test').single()
      .then(({data})=>setIsDemoActive(!!data))
  },[])

  async function handleSeed() {
    setDemoStatus('seeding'); setDemoLog([]); setDemoStats(null)
    try {
      const stats = await seedDemoData(msg=>setDemoLog(l=>[...l,msg]))
      setDemoStats(stats); setDemoStatus('done'); setIsDemoActive(true); onRefresh()
    } catch(e) { setDemoLog(l=>[...l,'ERROR: '+e.message]); setDemoStatus('error') }
  }

  async function handleClear() {
    setDemoStatus('clearing'); setDemoLog(['Clearing demo data...'])
    try {
      await clearDemoData()
      setDemoLog(l=>[...l,'Done.']); setDemoStatus('idle'); setIsDemoActive(false); setDemoStats(null); onRefresh()
    } catch(e) { setDemoLog(l=>[...l,'ERROR: '+e.message]); setDemoStatus('error') }
  }

  const passed = testResults?.filter(r=>r.pass).length
  const failed = testResults?.filter(r=>!r.pass).length

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Demo mode</div>
        <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.7}}>
          Seeds 8 dummy players with predictions and results for all 104 matches into the DEFAULT room.
          Use this to preview charts, leaderboard, fun zone and stats with realistic data.
        </p>
        {isDemoActive&&<div className="alert alert-warn" style={{marginBottom:'1rem'}}>Demo data is active — clear before the real tournament starts.</div>}
        <div style={{display:'flex',gap:10,marginBottom:'1rem',flexWrap:'wrap'}}>
          <button className="btn btn-accent" onClick={handleSeed} disabled={demoStatus==='seeding'||demoStatus==='clearing'}>
            {demoStatus==='seeding'?'Seeding...':(isDemoActive?'Re-seed Demo':'Seed Demo Data')}
          </button>
          {isDemoActive&&<button className="btn btn-danger" onClick={handleClear} disabled={demoStatus==='seeding'||demoStatus==='clearing'}>
            {demoStatus==='clearing'?'Clearing...':'Clear Demo Data'}
          </button>}
        </div>
        {demoLog.length>0&&(
          <div style={{background:'var(--c-surface2)',border:'1px solid var(--c-border)',borderRadius:'var(--radius)',padding:'10px 14px',fontFamily:'monospace',fontSize:12,color:'var(--c-muted)',lineHeight:1.8}}>
            {demoLog.map((l,i)=><div key={i}>{l}</div>)}
          </div>
        )}
        {demoStats&&(
          <div style={{display:'flex',gap:12,marginTop:'1rem',flexWrap:'wrap'}}>
            {[{label:'Players',value:demoStats.players},{label:'Predictions',value:demoStats.predictions},{label:'Scores',value:demoStats.scores}].map(s=>(
              <div key={s.label} className="metric" style={{minWidth:120}}>
                <div className="metric-label">{s.label}</div>
                <div className="metric-value" style={{fontSize:28}}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{marginBottom:0}}>
        <div className="card-title">Scoring engine tests</div>
        <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.7}}>Runs 18 unit tests against the live scoring logic in-browser.</p>
        <button className="btn btn-accent" onClick={()=>setTestResults(runScoringTests())} style={{marginBottom:'1rem'}}>Run all tests</button>
        {testResults&&(
          <>
            <div style={{display:'flex',gap:12,marginBottom:'1rem',flexWrap:'wrap'}}>
              <div className="metric" style={{minWidth:100}}><div className="metric-label">Passed</div><div className="metric-value" style={{fontSize:28,color:'var(--c-success)'}}>{passed}</div></div>
              <div className="metric" style={{minWidth:100}}><div className="metric-label">Failed</div><div className="metric-value" style={{fontSize:28,color:failed>0?'var(--c-danger)':'var(--c-muted)'}}>{failed}</div></div>
              <div className="metric" style={{minWidth:100}}><div className="metric-label">Total</div><div className="metric-value" style={{fontSize:28}}>{testResults.length}</div></div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {testResults.map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'8px 12px',borderRadius:'var(--radius)',
                  background:r.pass?'rgba(34,197,94,0.06)':'rgba(239,68,68,0.06)',
                  border:`1px solid ${r.pass?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.2)'}`,fontSize:13}}>
                  <span style={{fontFamily:'monospace',fontWeight:700,flexShrink:0,fontSize:11,color:r.pass?'var(--c-success)':'var(--c-danger)',marginTop:1}}>
                    {r.pass?'PASS':'FAIL'}
                  </span>
                  <div>
                    <div style={{color:'var(--c-text)'}}>{r.name}</div>
                    {!r.pass&&r.error&&<div style={{color:'var(--c-danger)',fontSize:11,marginTop:2,fontFamily:'monospace'}}>{r.error}</div>}
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

function MatchResultRow({ match: initialMatch, onSave }) {
  const [m, setM] = useState(initialMatch)
  const [saved, setSaved] = useState(false)
  function set(field, val) { setM(x=>({...x,[field]:val===''?null:parseInt(val)})) }
  async function handleSave() { await onSave(m); setSaved(true); setTimeout(()=>setSaved(false),1500) }
  return (
    <div className="match-row">
      <div className="team-home" style={{fontSize:13}}>{m.home_team}</div>
      <input type="number" min="0" className="score-input" value={m.home_goals??''} placeholder="?" onChange={e=>set('home_goals',e.target.value)}/>
      <span className="score-sep">–</span>
      <input type="number" min="0" className="score-input" value={m.away_goals??''} placeholder="?" onChange={e=>set('away_goals',e.target.value)}/>
      <div className="team-away" style={{fontSize:13}}>{m.away_team}</div>
      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        <input type="number" min="0" className="score-input" value={m.home_goals_et??''} placeholder="ET?" onChange={e=>set('home_goals_et',e.target.value)} title="Extra time home"/>
        <span style={{fontSize:10,color:'var(--c-muted)'}}>ET</span>
        <input type="number" min="0" className="score-input" value={m.away_goals_et??''} placeholder="ET?" onChange={e=>set('away_goals_et',e.target.value)} title="Extra time away"/>
        <input type="number" min="0" className="score-input" value={m.home_goals_pen??''} placeholder="PEN?" onChange={e=>set('home_goals_pen',e.target.value)} title="Penalties home"/>
        <span style={{fontSize:10,color:'var(--c-muted)'}}>PEN</span>
        <input type="number" min="0" className="score-input" value={m.away_goals_pen??''} placeholder="PEN?" onChange={e=>set('away_goals_pen',e.target.value)} title="Penalties away"/>
        <button className="btn btn-accent btn-sm" onClick={handleSave}>Save</button>
        {saved&&<span className="badge badge-green">Saved</span>}
      </div>
    </div>
  )
}
