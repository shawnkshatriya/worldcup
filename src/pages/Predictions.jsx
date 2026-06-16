import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import { Link } from 'react-router-dom'
import { getVenue, getVenueByMatchup, getKnockoutVenue } from '../lib/venues'
import Flag from '../components/Flag'
const TEAMS = [
  {name:'Algeria',flag:'🇩🇿'},{name:'Argentina',flag:'🇦🇷'},{name:'Australia',flag:'🇦🇺'},
  {name:'Austria',flag:'🇦🇹'},{name:'Belgium',flag:'🇧🇪'},{name:'Bosnia and Herzegovina',flag:'🇧🇦'},
  {name:'Brazil',flag:'🇧🇷'},{name:'Canada',flag:'🇨🇦'},{name:'Cape Verde',flag:'🇨🇻'},
  {name:'Colombia',flag:'🇨🇴'},{name:'Croatia',flag:'🇭🇷'},{name:'Curacao',flag:'🇨🇼'},
  {name:'Czechia',flag:'🇨🇿'},{name:'DR Congo',flag:'🇨🇩'},{name:'Ecuador',flag:'🇪🇨'},
  {name:'Egypt',flag:'🇪🇬'},{name:'England',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'},{name:'France',flag:'🇫🇷'},
  {name:'Germany',flag:'🇩🇪'},{name:'Ghana',flag:'🇬🇭'},{name:'Haiti',flag:'🇭🇹'},
  {name:'Iran',flag:'🇮🇷'},{name:'Iraq',flag:'🇮🇶'},{name:'Ivory Coast',flag:'🇨🇮'},
  {name:'Japan',flag:'🇯🇵'},{name:'Jordan',flag:'🇯🇴'},{name:'Mexico',flag:'🇲🇽'},
  {name:'Morocco',flag:'🇲🇦'},{name:'Netherlands',flag:'🇳🇱'},{name:'New Zealand',flag:'🇳🇿'},
  {name:'Norway',flag:'🇳🇴'},{name:'Panama',flag:'🇵🇦'},{name:'Paraguay',flag:'🇵🇾'},
  {name:'Portugal',flag:'🇵🇹'},{name:'Qatar',flag:'🇶🇦'},{name:'Saudi Arabia',flag:'🇸🇦'},
  {name:'Scotland',flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},{name:'Senegal',flag:'🇸🇳'},{name:'South Africa',flag:'🇿🇦'},
  {name:'South Korea',flag:'🇰🇷'},{name:'Spain',flag:'🇪🇸'},{name:'Sweden',flag:'🇸🇪'},
  {name:'Switzerland',flag:'🇨🇭'},{name:'Tunisia',flag:'🇹🇳'},{name:'Turkey',flag:'🇹🇷'},
  {name:'United States',flag:'🇺🇸'},{name:'Uruguay',flag:'🇺🇾'},{name:'Uzbekistan',flag:'🇺🇿'},
]

function WinnerPickInline({ player, koOpen }) {
  const [myPick, setMyPick] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  // Locks when admin opens KO predictions OR at the hard KO deadline (R32 starts Jun 28 2026)
  const KO_DEADLINE = new Date('2026-06-28T00:00:00Z')
  const locked = koOpen || new Date() >= KO_DEADLINE

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
            {locked ? 'Locked — knockout stage has started' : 'Pick who wins it all — worth a big bonus. Locks when knockout stage begins.'}
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
const LOCK_BUFFER_MS = 15 * 60 * 1000  // 15 minutes before kickoff

function isLocked(match, koOpen) {
  var now = new Date()
  // KO matches: locked until admin opens them
  if (match.phase && KO_PHASES.includes(match.phase) && !koOpen) return true
  // Match already started or finished
  if (match.status === 'IN_PLAY' || match.status === 'PAUSED' || match.status === 'FINISHED') return true
  // Lock 15 minutes before kickoff
  if (match.kickoff) {
    var kickoff = new Date(match.kickoff)
    if (now >= new Date(kickoff.getTime() - LOCK_BUFFER_MS)) return true
  }
  return false
}

export default function Predictions() {
  const { player } = usePlayer()
  const [activePhase, setActivePhase] = useState('GROUP_A')
  const [matches, setMatches] = useState([])
  const [preds, setPreds] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [koOpen, setKoOpen] = useState(false)
  const [progress, setProgress] = useState({ groupPred: 0, groupTotal: 72, koPred: 0, koTotal: 32 })
  const [groupBy, setGroupBy] = useState('day') // 'group' or 'day' - default day shows today
  const [allMatches, setAllMatches] = useState([])
  const [activeDay, setActiveDay] = useState(null)

  useEffect(function() {
    if (player) {
      supabase.from('rooms').select('ko_predictions_open').eq('code', player.room_code).single()
        .then(function(res) { if (res.data) setKoOpen(!!res.data.ko_predictions_open) })
      // Fetch prediction progress split by group/KO
      Promise.all([
        supabase.from('matches').select('id, phase'),
        supabase.from('predictions').select('id, match_id')
          .eq('player_id', player.id).not('home_goals', 'is', null),
      ]).then(function(results) {
        var allM = results[0].data || []
        var groupMatches = allM.filter(function(m){ return m.phase && m.phase.startsWith('GROUP') })
        var koMatches = allM.filter(function(m){ return m.phase && !m.phase.startsWith('GROUP') })
        var groupIds = new Set(groupMatches.map(function(m){ return m.id }))
        var koIds = new Set(koMatches.map(function(m){ return m.id }))
        var preds = results[1].data || []
        var groupPred = preds.filter(function(p){ return groupIds.has(p.match_id) }).length
        var koPred = preds.filter(function(p){ return koIds.has(p.match_id) }).length
        setProgress({ groupPred: groupPred, groupTotal: groupMatches.length, koPred: koPred, koTotal: koMatches.length })
      }).catch(function() {
        setProgress({ groupPred: 0, groupTotal: 72, koPred: 0, koTotal: 32 })
      })
    }
  }, [player])

  useEffect(() => {
    loadMatches()
  }, [activePhase, groupBy, activeDay])

  useEffect(() => {
    if (player) loadPredictions()
  }, [player])

  // Load all matches once for day view
  useEffect(function() {
    if (groupBy === 'day') {
      supabase.from('matches').select('*').order('kickoff').then(function(res) {
        var data = res.data || []
        setAllMatches(data)
        if (!activeDay && data.length > 0) {
          // Default to today if there are matches today, else the next day with matches
          var today = new Date().toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'})
          var days = data.filter(function(m){ return m.kickoff }).map(function(m){ return new Date(m.kickoff).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'}) })
          if (days.includes(today)) {
            setActiveDay(today)
          } else {
            var future = data.find(function(m){ return m.kickoff && new Date(m.kickoff) >= new Date() })
            setActiveDay(future ? new Date(future.kickoff).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'}) : days[0])
          }
        }
      })
    }
  }, [groupBy])

  async function loadMatches() {
    if (groupBy === 'day') {
      // Filter allMatches by activeDay
      var dayMatches = allMatches.filter(function(m) {
        if (!m.kickoff || !activeDay) return false
        return new Date(m.kickoff).toLocaleDateString(undefined, {month:'short',day:'numeric',year:'numeric'}) === activeDay
      })
      setMatches(dayMatches)
    } else {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('phase', activePhase)
        .order('match_number')
      setMatches(data || [])
    }
  }

  async function loadPredictions() {
    if (!player) return
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .eq('player_id', player.id)
    const map = {}
    data?.forEach(p => { map[String(p.match_id)] = p })
    setPreds(map)
  }

  async function savePred(matchId, homeGoals, awayGoals) {
    if (!player) return
    // Guard: don't save if this match is locked
    var theMatch = matches.find(function(m){ return String(m.id) === String(matchId) }) ||
                   allMatches.find(function(m){ return String(m.id) === String(matchId) })
    if (theMatch && isLocked(theMatch, koOpen)) return
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
    var n = val === '' ? null : Math.max(0, Math.min(20, Math.floor(Number(val))))
    if (val !== '' && isNaN(n)) return
    setPreds(p => ({
      ...p,
      [String(matchId)]: { ...(p[String(matchId)]||{}), [field]: val === '' ? null : n }
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
            You need to join the pool first. <Link to="/join" style={{color:'var(--c-accent)'}}>Join now &rarr;</Link>
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
          <p>Predictions lock 15 minutes before each match kicks off. KO predictions unlock when your admin opens them.</p>
        </div>
      </div>
      <div className="page-body">

        <div style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:'var(--radius)',padding:'12px 16px',marginBottom:'1.25rem'}}>
          <div style={{marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:600}}>Group stage</span>
              <span style={{fontSize:11,color:'var(--c-muted)'}}>{progress.groupPred}/{progress.groupTotal}</span>
            </div>
            <div style={{height:5,background:'var(--c-surface2)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:(progress.groupTotal > 0 ? Math.round(progress.groupPred / progress.groupTotal * 100) : 0) + '%',background:progress.groupPred === progress.groupTotal ? 'var(--c-success)' : 'var(--c-accent)',borderRadius:3,transition:'width 0.6s'}}/>
            </div>
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:600}}>Knockout</span>
              <span style={{fontSize:11,color:'var(--c-muted)'}}>{progress.koPred}/{progress.koTotal}</span>
            </div>
            <div style={{height:5,background:'var(--c-surface2)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:(progress.koTotal > 0 ? Math.round(progress.koPred / progress.koTotal * 100) : 0) + '%',background:progress.koPred === progress.koTotal ? 'var(--c-success)' : 'var(--c-info)',borderRadius:3,transition:'width 0.6s'}}/>
            </div>
          </div>
          {(progress.groupPred + progress.koPred) < (progress.groupTotal + progress.koTotal) && (
            <div style={{fontSize:11,color:'var(--c-muted)',marginTop:6}}>{(progress.groupTotal + progress.koTotal) - (progress.groupPred + progress.koPred)} matches left to predict</div>
          )}
        </div>
        <div className="tabs" style={{marginBottom:'1rem'}}>
          <button className={`tab${groupBy==='group'?' active':''}`} onClick={function(){setGroupBy('group')}} style={{fontSize:11,padding:'4px 10px'}}>By Group</button>
          <button className={`tab${groupBy==='day'?' active':''}`} onClick={function(){setGroupBy('day')}} style={{fontSize:11,padding:'4px 10px'}}>By Day</button>
        </div>

        {groupBy === 'group' && (
          <>
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
          </>
        )}

        {groupBy === 'day' && (
          <div className="tabs" style={{marginBottom:'1.5rem',flexWrap:'wrap'}}>
            {[...new Set(allMatches.filter(function(m){return m.kickoff}).map(function(m){return new Date(m.kickoff).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}))].map(function(day) {
              return (
                <button key={day} className={'tab' + (activeDay===day?' active':'')} onClick={function(){setActiveDay(day)}} style={{fontSize:11,padding:'4px 8px'}}>
                  {day.replace(', 2026','')}
                </button>
              )
            })}
          </div>
        )}

        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div className="card-title" style={{marginBottom:0}}>{groupBy === 'group' ? PHASE_LABELS[activePhase] : activeDay ? activeDay.replace(', 2026','') : 'Select a day'}</div>
            <button
              style={{fontSize:11,color:'var(--c-muted)',background:'var(--c-surface2)',border:'1px solid var(--c-border)',borderRadius:16,padding:'4px 12px',cursor:'pointer',whiteSpace:'nowrap'}}
              onClick={async function() {
                for (var i = 0; i < matches.length; i++) {
                  var m = matches[i]
                  if (isLocked(m, koOpen)) continue
                  var p = preds[String(m.id)] || {}
                  if (p.home_goals != null && p.away_goals != null) continue
                  var h = Math.floor(Math.random() * 5)
                  var a = Math.floor(Math.random() * 5)
                  updatePred(m.id, 'home_goals', h)
                  updatePred(m.id, 'away_goals', a)
                  await savePred(m.id, h, a)
                }
              }}
            >
              {String.fromCodePoint(0x1F3B2)} Randomize empty
            </button>
          </div>

          {matches.length === 0 && groupBy === 'day' && (
            <p style={{color:'var(--c-muted)',fontSize:14}}>No matches on this day.</p>
          )}
          {matches.length === 0 && groupBy === 'group' && activePhase.startsWith('GROUP') && (
            <p style={{color:'var(--c-muted)',fontSize:14}}>No matches loaded yet for this group.</p>
          )}
          {matches.length === 0 && groupBy === 'group' && !activePhase.startsWith('GROUP') && (
            <p style={{color:'var(--c-muted)',fontSize:14}}>
              KO round fixtures are determined after the group stage. Come back once group results are in.
            </p>
          )}

          {matches.length > 0 && KO_PHASES.includes(activePhase) && !koOpen && (
            <div className="alert alert-warn" style={{marginBottom:'1rem'}}>
              KO predictions are locked. Your pool admin will unlock them once the bracket is set.
            </div>
          )}

          {((groupBy === 'group' && activePhase === 'FINAL') || (groupBy === 'day' && matches.some(function(m){ return m.phase === 'FINAL' }))) && player && (
            <WinnerPickInline player={player} koOpen={koOpen} />
          )}

          {matches.map(m => {
            const pred = preds[String(m.id)] || {}
            const locked = isLocked(m, koOpen)
            const isSaving = saving[m.id]
            const isSaved = saved[m.id]
            const hasBothGoals = pred.home_goals != null && pred.away_goals != null

            return (
              <div key={m.id} style={{borderBottom:'1px solid var(--c-border)',padding:'12px 0'}}>
                {m.kickoff && (
                  <div style={{textAlign:'center',fontSize:13,color:'var(--c-muted)',marginBottom:6}}>
                    {new Date(m.kickoff).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                    {' · '}
                    {new Date(m.kickoff).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})} ET
                    {!locked && (
                      <span style={{color:'var(--c-warn)',marginLeft:6}}>
                        {'· Locks ' + new Date(new Date(m.kickoff).getTime() - LOCK_BUFFER_MS).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})}
                      </span>
                    )}
                    {locked && m.status !== 'FINISHED' && (
                      <span style={{color:'var(--c-danger)',marginLeft:6}}>· Locked</span>
                    )}
                    {m.status === 'FINISHED' && m.home_goals != null && (
                      <span style={{color:'var(--c-success)',marginLeft:6,fontWeight:700}}>· FT {m.home_goals}-{m.away_goals}</span>
                    )}
                    {(m.status === 'IN_PLAY' || m.status === 'PAUSED') && m.home_goals != null && (
                      <span style={{color:'var(--c-danger)',marginLeft:6,fontWeight:700}}>· {m.status === 'PAUSED' ? 'HT' : 'LIVE'} {m.home_goals}-{m.away_goals}</span>
                    )}
                  </div>
                )}
                {(getVenueByMatchup(m.home_team, m.away_team) || getKnockoutVenue(m.match_number) || (m.match_number && getVenue(m.match_number))) && (
                  <div style={{textAlign:'center',fontSize:12,color:'var(--c-hint)',marginBottom:4}}>{getVenueByMatchup(m.home_team, m.away_team) || getKnockoutVenue(m.match_number) || getVenue(m.match_number)}</div>
                )}
                <div className="match-row pred-row" style={{borderBottom:'none',padding:0}}>
                  <div className="team-home">
                    <div style={{fontWeight:500,display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}><span>{m.home_team || '?'}</span><Flag team={m.home_team}/></div>
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
                    <div style={{fontWeight:500,display:'flex',alignItems:'center',gap:6}}>
                      <Flag team={m.away_team}/>
                      {m.away_team || '?'}
                      {!locked && isSaving && <span style={{fontSize:12,color:'var(--c-muted)'}}>Saving...</span>}
                      {!locked && isSaved && <span className="badge badge-green" style={{fontSize:11,padding:'2px 8px'}}>Saved</span>}
                      {!locked && !isSaving && !isSaved && hasBothGoals && (
                        <span className="badge badge-blue" style={{fontSize:11,padding:'2px 8px'}}>Predicted</span>
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
