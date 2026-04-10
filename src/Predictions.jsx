import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { Link } from 'react-router-dom'

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

function isLocked(kickoff) {
  if (!kickoff) return false
  return new Date(kickoff) < new Date()
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
            You need to join the pool first. <Link to="/join" style={{color:'var(--c-accent)'}}>Join now →</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>My predictions</h1>
        <p>Predictions lock automatically at kickoff. Enter your predicted score for every match.</p>
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
            const locked = isLocked(m.kickoff)
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
                    placeholder={locked ? (m.home_goals ?? '?') : '—'}
                    onChange={e => updatePred(m.id, 'home_goals', e.target.value)}
                    onBlur={() => hasBothGoals && savePred(m.id, pred.home_goals, pred.away_goals)}
                  />

                  <span className="score-sep">
                    {m.home_goals != null ? `${m.home_goals} – ${m.away_goals}` : 'vs'}
                  </span>

                  <input
                    type="number" min="0" max="20"
                    className="score-input"
                    value={pred.away_goals ?? ''}
                    disabled={locked}
                    placeholder={locked ? (m.away_goals ?? '?') : '—'}
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
