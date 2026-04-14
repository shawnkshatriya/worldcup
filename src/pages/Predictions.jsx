import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { Link } from 'react-router-dom'

const TOURNAMENT_START = new Date('2026-06-11T22:00:00Z')  // Group stage deadline
const KO_DEADLINE      = new Date('2026-07-04T18:00:00Z')  // KO stage deadline (first R32 kickoff)
const TEAMS = [
  {name:'Argentina',flag:'\u{1F1E6}\u{1F1F7}'},{name:'Australia',flag:'\u{1F1E6}\u{1F1FA}'},{name:'Belgium',flag:'\u{1F1E7}\u{1F1EA}'},
  {name:'Brazil',flag:'\u{1F1E7}\u{1F1F7}'},{name:'Canada',flag:'\u{1F1E8}\u{1F1E6}'},{name:'Chile',flag:'\u{1F1E8}\u{1F1F1}'},
  {name:'Colombia',flag:'\u{1F1E8}\u{1F1F4}'},{name:'Croatia',flag:'\u{1F1ED}\u{1F1F7}'},{name:'Denmark',flag:'\u{1F1E9}\u{1F1F0}'},
  {name:'Ecuador',flag:'\u{1F1EA}\u{1F1E8}'},{name:'Egypt',flag:'\u{1F1EA}\u{1F1EC}'},{name:'England',flag:'\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'},
  {name:'France',flag:'\u{1F1EB}\u{1F1F7}'},{name:'Germany',flag:'\u{1F1E9}\u{1F1EA}'},{name:'Ghana',flag:'\u{1F1EC}\u{1F1ED}'},
  {name:'Indonesia',flag:'\u{1F1EE}\u{1F1E9}'},{name:'Iran',flag:'\u{1F1EE}\u{1F1F7}'},{name:'Italy',flag:'\u{1F1EE}\u{1F1F9}'},
  {name:'Ivory Coast',flag:'\u{1F1E8}\u{1F1EE}'},{name:'Japan',flag:'\u{1F1EF}\u{1F1F5}'},{name:'Mexico',flag:'\u{1F1F2}\u{1F1FD}'},
  {name:'Morocco',flag:'\u{1F1F2}\u{1F1E6}'},{name:'Netherlands',flag:'\u{1F1F3}\u{1F1F1}'},{name:'Nigeria',flag:'\u{1F1F3}\u{1F1EC}'},
  {name:'Panama',flag:'\u{1F1F5}\u{1F1E6}'},{name:'Peru',flag:'\u{1F1F5}\u{1F1EA}'},{name:'Poland',flag:'\u{1F1F5}\u{1F1F1}'},
  {name:'Portugal',flag:'\u{1F1F5}\u{1F1F9}'},{name:'Saudi Arabia',flag:'\u{1F1F8}\u{1F1E6}'},{name:'Senegal',flag:'\u{1F1F8}\u{1F1F3}'},
  {name:'Serbia',flag:'\u{1F1F7}\u{1F1F8}'},{name:'South Korea',flag:'\u{1F1F0}\u{1F1F7}'},{name:'Spain',flag:'\u{1F1EA}\u{1F1F8}'},
  {name:'Switzerland',flag:'\u{1F1E8}\u{1F1ED}'},{name:'Turkey',flag:'\u{1F1F9}\u{1F1F7}'},{name:'Uruguay',flag:'\u{1F1FA}\u{1F1FE}'},
  {name:'USA',flag:'\u{1F1FA}\u{1F1F8}'},{name:'Costa Rica',flag:'\u{1F1E8}\u{1F1F7}'},{name:'Slovenia',flag:'\u{1F1F8}\u{1F1EE}'},
  {name:'South Africa',flag:'\u{1F1FF}\u{1F1E6}'},{name:'Venezuela',flag:'\u{1F1FB}\u{1F1EA}'},{name:'Ukraine',flag:'\u{1F1FA}\u{1F1E6}'},
  {name:'New Zealand',flag:'\u{1F1F3}\u{1F1FF}'},{name:'Paraguay',flag:'\u{1F1F5}\u{1F1FE}'},{name:'Guatemala',flag:'\u{1F1EC}\u{1F1F9}'},
  {name:'Cuba',flag:'\u{1F1E8}\u{1F1FA}'},{name:'Cameroon',flag:'\u{1F1E8}\u{1F1F2}'},{name:'Hungary',flag:'\u{1F1ED}\u{1F1FA}'},
]

function WinnerPickInline({ player }) {
  const [myPick, setMyPick] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const locked = new Date() >= TOURNAMENT_START

  useEffect(() => {
    if (!player) return
    supabase.from('winner_picks').select('*').eq('player_id', player.id).eq('room_code', player.room_code).single()
      .then(({ data }) => { if (data) { setMyPick(data); setSelected(data.team) } })
  }, [player])

  async function savePick() {
    if (!selected || !player) return
    setSaving(true)
    await supabase.from('winner_picks').upsert({ player_id:player.id, room_code:player.room_code, team:selected, pts_awarded:0 }, { onConflict:'player_id,room_code' })
    setMyPick({ team: selected })
    setSaved(true); setSaving(false); setOpen(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const team = TEAMS.find(t => t.name === myPick?.team)
  const filtered = TEAMS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="card" style={{marginBottom:'1.25rem',background:'rgba(240,165,0,0.04)',border:'1px solid rgba(240,165,0,0.2)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>Tournament winner pick</div>
          <div style={{fontSize:12,color:'var(--c-muted)'}}>
            {locked ? 'Locked at kickoff' : 'Pick who wins it all - worth a big bonus if correct. Changeable until June 11.'}
          </div>
        </div>
        {myPick ? (
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:20}}>{team?.flag}</span>
            <span style={{fontWeight:600,fontSize:13}}>{myPick.team}</span>
            {myPick.pts_awarded > 0 && <span style={{fontFamily:'var(--font-display)',fontSize:20,color:'var(--c-gold)'}}>+{myPick.pts_awarded}</span>}
            {!locked && <button className="btn btn-sm" onClick={() => setOpen(o => !o)}>Change</button>}
            {saved && <span className="badge badge-green">Saved!</span>}
          </div>
        ) : (
          !locked && <button className="btn btn-accent btn-sm" onClick={() => setOpen(o => !o)}>Pick a winner</button>
        )}
      </div>

      {open && !locked && (
        <div style={{marginTop:'1rem',borderTop:'1px solid var(--c-border)',paddingTop:'1rem'}}>
          <input type="text" placeholder="Search teams..." value={search} onChange={e => setSearch(e.target.value)} style={{width:'100%',marginBottom:'0.75rem'}} />
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:6,maxHeight:280,overflowY:'auto'}}>
            {filtered.map(t => (
              <button key={t.name} onClick={() => setSelected(t.name)} style={{
                display:'flex',alignItems:'center',gap:6,padding:'7px 10px',
                borderRadius:'var(--radius)',border:'1px solid',cursor:'pointer',fontSize:12,
                background:selected===t.name?'var(--c-accent)':'var(--c-surface2)',
                borderColor:selected===t.name?'var(--c-accent)':'var(--c-border)',
                color:selected===t.name?'var(--c-accent-text,#fff)':'var(--c-text)',
              }}>
                <span style={{fontSize:16}}>{t.flag}</span>{t.name}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:8,marginTop:'0.75rem'}}>
            <button className="btn btn-accent" onClick={savePick} disabled={!selected||saving}>
              {saving ? 'Saving...' : 'Confirm pick'}
            </button>
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
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
  ROUND_OF_32:'Round of 32', ROUND_OF_16:'Round of 16',
  QUARTER_FINALS:'Quarter-finals', SEMI_FINALS:'Semi-finals',
  THIRD_PLACE:'3rd place', FINAL:'Final',
}

const KO_PHASES = ['ROUND_OF_32','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','THIRD_PLACE','FINAL']
function isLocked(kickoff, phase) {
  const now = new Date()
  if (!phase || !KO_PHASES.includes(phase)) {
    // Group stage: hard lock at June 11
    return now >= TOURNAMENT_START
  } else {
    // KO stage: locked during group stage, opens after groups, hard locks at KO deadline
    const groupsRunning = now >= TOURNAMENT_START && now < KO_DEADLINE
    if (groupsRunning) return true   // groups still playing - KO predictions locked
    return now >= KO_DEADLINE        // hard lock once KO deadline passes
  }
}

export default function Predictions() {
  const { player } = usePlayer()
  const [activePhase, setActivePhase] = useState('GROUP_A')
  const [matches, setMatches] = useState([])
  const [preds, setPreds] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  useEffect(() => {
    loadMatches()
  }, [activePhase])

  useEffect(() => {
    if (player && matches.length) loadPredictions()
  }, [player, matches])

  async function loadMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('phase', activePhase)
      .order('match_number')
    setMatches(data || [])
  }

  async function loadPredictions() {
    if (!player) return
    const ids = matches.map(m => m.id)
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('player_id', player.id)
      .in('match_id', ids)
    const map = {}
    data?.forEach(p => { map[p.match_id] = p })
    setPreds(map)
  }

  async function savePred(matchId, homeGoals, awayGoals) {
    if (!player) return
    setSaving(s => ({ ...s, [matchId]: true }))
    await supabase.from('predictions').upsert({
      player_id: player.id,
      match_id: matchId,
      home_goals: homeGoals !== '' ? parseInt(homeGoals) : null,
      away_goals: awayGoals !== '' ? parseInt(awayGoals) : null,
      submitted_at: new Date().toISOString()
    }, { onConflict: 'player_id,match_id' })
    setSaving(s => ({ ...s, [matchId]: false }))
    setSaved(s => ({ ...s, [matchId]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [matchId]: false })), 1500)
  }

  function updatePred(matchId, field, val) {
    setPreds(p => ({
      ...p,
      [matchId]: { ...(p[matchId]||{}), [field]: val }
    }))
  }

  const groupPhases = PHASES.filter(p => p.startsWith('GROUP'))
  const koPhases = PHASES.filter(p => !p.startsWith('GROUP'))

  if (!player) {
    return (
      <div>
        <div className="page-header"><h1>My predictions</h1></div>
        <div className="page-body">
          <div className="alert alert-info">
            You need to join the pool first. <Link to="/join" style={{color:'var(--c-accent)'}}>Join now -></Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>My predictions</h1>
          <p>Group predictions lock June 11. KO predictions open after group stage and lock July 4.</p>
        </div>
      </div>
      <div className="page-body">
        <div style={{marginBottom:8,fontSize:12,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Group stage</div>
        <div className="tabs">
          {groupPhases.map(p => (
            <button key={p} className={`tab${activePhase===p?' active':''}`} onClick={() => setActivePhase(p)}>
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>

        <div style={{marginBottom:8,fontSize:12,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Knockout rounds</div>
        <div className="tabs" style={{marginBottom:'1.5rem'}}>
          {koPhases.map(p => (
            <button key={p} className={`tab${activePhase===p?' active':''}`} onClick={() => setActivePhase(p)}>
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="card-title">{PHASE_LABELS[activePhase]}</div>

          {matches.length === 0 && activePhase.startsWith('GROUP') && (
            <p style={{color:'var(--c-muted)',fontSize:14}}>No matches loaded yet for this group.</p>
          )}
          {matches.length === 0 && !activePhase.startsWith('GROUP') && (
            <p style={{color:'var(--c-muted)',fontSize:14}}>
              KO round fixtures are determined after the group stage. Come back once group results are in.
            </p>
          )}

          {matches.map(m => {
            const pred = preds[m.id] || {}
            const locked = isLocked(m.kickoff, m.phase)
            const isSaving = saving[m.id]
            const isSaved = saved[m.id]
            const hasBothGoals = pred.home_goals != null && pred.away_goals != null

            return (
              <div key={m.id}>
                <div className="match-row">
                  <div className="team-home">
                    <div style={{fontWeight:500}}>{m.home_team || '?'}</div>
                    {m.kickoff && (
                      <div style={{fontSize:12,color:'var(--c-muted)'}}>
                        {new Date(m.kickoff).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                        {' '}
                        {new Date(m.kickoff).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
                      </div>
                    )}
                  </div>

                  <input
                    type="number" min="0" max="20"
                    className="score-input"
                    value={pred.home_goals ?? ''}
                    disabled={locked}
                    placeholder={locked ? (m.home_goals ?? '?') : '-'}
                    onChange={e => updatePred(m.id, 'home_goals', e.target.value)}
                    onBlur={() => hasBothGoals && savePred(m.id, pred.home_goals, pred.away_goals)}
                  />

                  <span className="score-sep">
                    {m.home_goals != null ? `${m.home_goals} - ${m.away_goals}` : 'vs'}
                  </span>

                  <input
                    type="number" min="0" max="20"
                    className="score-input"
                    value={pred.away_goals ?? ''}
                    disabled={locked}
                    placeholder={locked ? (m.away_goals ?? '?') : '-'}
                    onChange={e => updatePred(m.id, 'away_goals', e.target.value)}
                    onBlur={() => hasBothGoals && savePred(m.id, pred.home_goals, pred.away_goals)}
                  />

                  <div className="team-away">
                    <div style={{fontWeight:500}}>{m.away_team || '?'}</div>
                    <div style={{fontSize:12,marginTop:2}}>
                      {locked && <span className="badge badge-red">Locked</span>}
                      {!locked && isSaving && <span style={{fontSize:12,color:'var(--c-muted)'}}>Saving...</span>}
                      {!locked && isSaved && <span className="badge badge-green">Saved</span>}
                      {!locked && !isSaving && !isSaved && hasBothGoals && (
                        <span className="badge badge-blue">Predicted</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
