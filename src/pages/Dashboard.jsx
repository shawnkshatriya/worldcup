import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'
import Flag from '../components/Flag'
import { useEspnLive, effectiveScore } from '../hooks/useEspnLive'
import { Link } from 'react-router-dom'

const WEIGHT_LABELS = {
  group_result:   'Group - correct W/D/L',
  group_diff:     'Group - correct goal diff',
  group_exact:    'Group - exact score',
  group_approx:   'Group - approx bonus',
  ko_result:      'KO - correct result',
  ko_diff:        'KO - correct goal diff',
  ko_exact:       'KO - exact score',
  ko_team:        'KO - team qualified',
  winner_bonus:   'Tournament winner pick',
  finalist_bonus: 'Finalist bonus',
}
const WEIGHT_COLORS = {
  group_result:'#C8102E', group_diff:'#003DA5', group_exact:'#F0A500',
  group_approx:'#22C55E', ko_team:'#a855f7',   ko_result:'#C8102E',
  ko_diff:'#003DA5',      ko_exact:'#F0A500',
  winner_bonus:'#F0A500', finalist_bonus:'#22C55E',
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

// Real flag emojis rendered via unicode - crisp on all devices
function FlagPill({ team, label }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:6,
      background:'var(--c-surface2)',
      border:'1px solid var(--c-border)',
      borderRadius:20, padding:'5px 12px 5px 8px',
      fontSize:13, fontWeight:500, color:'var(--c-text)',
    }}>
      <Flag team={team || label} />
      {label && <span>{label}</span>}
    </div>
  )
}

export default function Dashboard() {
  const { player } = usePlayer()
  const roomCode = player?.room_code || 'DEFAULT'
  const [stats, setStats]   = useState({ players:0, played:0, total:104 })
  const [leaders, setLeaders] = useState([])
  const [topCalls, setTopCalls] = useState([])
  const [myRank, setMyRank]   = useState(null)
  const [myPts, setMyPts]     = useState(null)
  const [weights, setWeights] = useState(null)
  const [nextMatch, setNextMatch] = useState([])
  const espnLive = useEspnLive(nextMatch)
  const [recentResults, setRecentResults] = useState([])
  const [poolStats, setPoolStats] = useState(null)
  const [myUpcoming, setMyUpcoming] = useState([])
  const countdown = useCountdown('2026-06-11T19:00:00Z')

  useEffect(() => {
    loadData()
    var id = setInterval(loadData, 60000)
    var onFocus = function() { loadData() }
    window.addEventListener('focus', onFocus)
    return function() {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [player])

  async function loadData() {
    const [
      { count:playerCount },
      { count:playedCount },
      { count:totalCount },
      { data:w }
    ] = await Promise.all([
      supabase.from('players').select('*',{count:'exact',head:true}).eq('room_code', roomCode),
      supabase.from('matches').select('*',{count:'exact',head:true}).eq('status','FINISHED'),
      supabase.from('matches').select('*',{count:'exact',head:true}),
      supabase.from('scoring_weights').select('*').eq('room_code', roomCode).single(),
    ])
    setStats({ players:playerCount||0, played:playedCount||0, total:104 })
    setWeights(w)

    // Fetch next upcoming matches
    var { data: upcoming } = await supabase.from('matches').select('*')
      .eq('status', 'SCHEDULED').not('home_team', 'is', null).order('kickoff').limit(5)
    if (upcoming && upcoming.length > 0) setNextMatch(upcoming)

    // Recent finished results
    var { data: recent } = await supabase.from('matches').select('*')
      .eq('status', 'FINISHED').order('kickoff', { ascending: false }).limit(5)
    if (recent) setRecentResults(recent)

    // Pool stats
    var { count: totalPreds } = await supabase.from('predictions').select('*', { count: 'exact', head: true })
      .not('home_goals', 'is', null)
    setPoolStats({ totalPredictions: totalPreds || 0 })

    // My upcoming predictions
    if (player && upcoming && upcoming.length > 0) {
      var matchIds = upcoming.map(function(m){ return m.id })
      var { data: myPreds } = await supabase.from('predictions').select('match_id, home_goals, away_goals')
        .eq('player_id', player.id).in('match_id', matchIds)
      var predMap = {}
      ;(myPreds || []).forEach(function(p){ predMap[p.match_id] = p })
      setMyUpcoming(upcoming.map(function(m){ return { ...m, pred: predMap[m.id] || null } }))
    }

    const { data:players } = await supabase.from('players').select('id,name').eq('room_code', roomCode)
    if (!players) return
    var roomPlayerIds = players.map(function(p){ return p.id })
    var scores = []
    if (roomPlayerIds.length) {
      var sFrom = 0
      while (true) {
        var sPage = await supabase.from('scores').select('player_id,pts_total,match_id').order('id',{ascending:true}).in('player_id', roomPlayerIds).range(sFrom, sFrom + 999)
        if (!sPage.data || sPage.data.length === 0) break
        scores = scores.concat(sPage.data)
        if (sPage.data.length < 1000) break
        sFrom += 1000
      }
    }

    const totals = players.map((p,i) => {
      var ps = scores?.filter(s=>s.player_id===p.id)||[]
      var seen = {}, sum = 0
      ps.forEach(function(s){ var k = String(s.match_id); if (seen[k]) return; seen[k]=true; sum += (s.pts_total||0) })
      return { ...p, color:AVATAR_COLORS[i%AVATAR_COLORS.length], pts: sum }
    }).sort((a,b)=>b.pts-a.pts)

    setLeaders(totals.slice(0,10))

    // Top calls feed: highest-scoring predictions from recently finished matches
    if (roomPlayerIds.length) {
      var { data: finishedMatches } = await supabase.from('matches').select('id,home_team,away_team,home_goals,away_goals,kickoff')
        .eq('status','FINISHED').not('home_goals','is',null).order('kickoff',{ascending:false}).limit(6)
      var fIds = (finishedMatches||[]).map(function(m){ return m.id })
      if (fIds.length) {
        var topScores = []
        var tFrom = 0
        while (true) {
          var tPage = await supabase.from('scores').select('player_id,match_id,pts_total,pts_exact')
            .in('player_id', roomPlayerIds).in('match_id', fIds).gt('pts_total', 0).order('id',{ascending:true}).range(tFrom, tFrom + 999)
          if (!tPage.data || tPage.data.length === 0) break
          topScores = topScores.concat(tPage.data)
          if (tPage.data.length < 1000) break
          tFrom += 1000
        }
        // Get the predictions for those to show the scoreline
        var { data: topPreds } = await supabase.from('predictions').select('player_id,match_id,home_goals,away_goals')
          .in('player_id', roomPlayerIds).in('match_id', fIds)
        var predLookup = {}
        ;(topPreds||[]).forEach(function(p){ predLookup[p.player_id+'_'+p.match_id] = p })
        var playerNames = {}
        players.forEach(function(p){ playerNames[p.id] = p.name })
        var matchLookup = {}
        ;(finishedMatches||[]).forEach(function(m){ matchLookup[m.id] = m })

        // finishedMatches is already ordered by kickoff desc; preserve that order, top points within
        var matchOrder = {}
        ;(finishedMatches||[]).forEach(function(m, idx){ matchOrder[m.id] = idx })
        var calls = topScores.map(function(s){
          var pr = predLookup[s.player_id+'_'+s.match_id]
          var m = matchLookup[s.match_id]
          if (!pr || !m) return null
          return { name: playerNames[s.player_id]||'?', pts: s.pts_total, isExact: s.pts_exact>0,
            ph: pr.home_goals, pa: pr.away_goals, home: m.home_team, away: m.away_team,
            rh: m.home_goals, ra: m.away_goals, mOrder: matchOrder[s.match_id] }
        }).filter(Boolean).sort(function(a,b){
          if (a.mOrder !== b.mOrder) return a.mOrder - b.mOrder  // recent matches first
          return b.pts - a.pts  // best calls within a match
        }).slice(0,6)
        setTopCalls(calls)
      }
    }

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
          <h1>FIFA World Cup 2026 Predictions</h1>
          <p>Tournament prediction pool</p>
        </div>
      </div>
      <div className="page-body">

        {/* -- Hero Banner -- */}
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
              <div style={{fontSize:12,color:'var(--c-hint)',marginBottom:16}}>
                June 11 - July 19 &nbsp;.&nbsp; 48 teams &nbsp;.&nbsp; 104 matches
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <FlagPill team="Canada" label="Canada" />
                <FlagPill team="Mexico" label="Mexico" />
                <FlagPill team="United States" label="USA" />
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
              <span>{stats.total - played} matches remaining</span>
            </div>
        </div>

        {/* -- Metric cards -- */}
        <div className="metrics" style={{marginBottom:'1.25rem'}}>
          {[
            { label:'Players in pool',  value:stats.players, color:'var(--c-text)' },
            { label:'Matches played',   value:`${stats.played} / ${stats.total}`, color:'var(--c-text)' },
            { label:'Your rank',        value:myRank?`#${myRank}`:'-', color:myRank===1?'var(--c-gold)':myRank?'var(--c-accent)':'var(--c-muted)' },
            { label:'Your points',      value:myPts??'-', color:'var(--c-text)' },
          ].map(m=>(
            <div key={m.label} className="metric">
              <div className="metric-label">{m.label}</div>
              <div className="metric-value" style={{color:m.color,fontSize:m.value.toString().length>4?24:36}}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* -- Two columns -- */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'1.25rem'}}>

          {/* Top 5 leaderboard */}
          <div className="card" style={{marginBottom:0}}>
            <div className="card-title">Top 10 Leaderboard</div>
            {leaders.length === 0 && (
              <p style={{color:'var(--c-muted)',fontSize:13,lineHeight:1.7}}>
                No scores yet - leaderboard fills up once matches are played and results are entered.
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
              Full leaderboard &rarr;
            </Link>
          </div>

          {/* Right column: upcoming + your predictions */}
          <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>

            {/* Top calls feed */}
            {topCalls.length > 0 && (
              <div className="card" style={{marginBottom:0}}>
                <div className="card-title">🎯 Top calls</div>
                {topCalls.map(function(call, idx) {
                  return (
                    <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:idx<topCalls.length-1?'1px solid var(--c-border)':'none',fontSize:13}}>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontWeight:700,color:call.isExact?'var(--c-accent)':'var(--c-text)'}}>{call.name}</span>
                        <span style={{color:'var(--c-muted)'}}> called </span>
                        <span style={{fontWeight:600}}>{call.home} {call.ph}-{call.pa} {call.away}</span>
                        {call.isExact && <span style={{marginLeft:4}}>🎯</span>}
                      </div>
                      <span style={{fontFamily:'var(--font-display)',fontSize:16,color:'var(--c-success)',fontWeight:700,marginLeft:8,flexShrink:0}}>+{call.pts}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Upcoming matches */}
            {nextMatch.length > 0 && (
              <div className="card" style={{marginBottom:0}}>
                <div className="card-title">Upcoming matches</div>
                {nextMatch.map(function(nm, idx) {
                  var eff = effectiveScore(nm, espnLive)
                  return (
                    <div key={nm.id} style={{padding:'10px 0',borderBottom:idx < nextMatch.length-1 ? '1px solid var(--c-border)' : 'none',textAlign:'center'}}>
                      <div style={{fontFamily:'var(--font-display)',fontSize:18,letterSpacing:'0.04em',marginBottom:2,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                        <Flag team={nm.home_team}/>{nm.home_team || 'TBD'}
                        {eff.isLive
                          ? <span style={{color:'var(--c-danger)',fontWeight:700}}>{eff.home}-{eff.away}</span>
                          : <span style={{color:'var(--c-muted)',fontSize:14}}>vs</span>}
                        {nm.away_team || 'TBD'}<Flag team={nm.away_team}/>
                      </div>
                      {eff.isLive && (
                        <div style={{fontSize:11,color:'var(--c-danger)',fontWeight:700,marginBottom:2}}>● LIVE {eff.clock||''}</div>
                      )}
                      {!eff.isLive && nm.kickoff && (
                        <div style={{fontSize:12,color:'var(--c-muted)'}}>
                          {new Date(nm.kickoff).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                          {' at '}
                          {new Date(nm.kickoff).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})} ET
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Your predictions for upcoming */}
            {myUpcoming.length > 0 && (
              <div className="card" style={{marginBottom:0}}>
                <div className="card-title">Your predictions</div>
                {myUpcoming.map(function(m) {
                  return (
                    <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--c-border)',fontSize:13}}>
                      <div style={{flex:1,display:'flex',alignItems:'center',gap:5}}>
                        <Flag team={m.home_team} size="sm"/><span style={{fontWeight:500}}>{m.home_team}</span>
                        <span style={{color:'var(--c-muted)',margin:'0 2px'}}>vs</span>
                        <Flag team={m.away_team} size="sm"/><span style={{fontWeight:500}}>{m.away_team}</span>
                      </div>
                      {m.pred && m.pred.home_goals != null ? (
                        <div style={{textAlign:'right'}}>
                          <span style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-accent)'}}>{m.pred.home_goals} - {m.pred.away_goals}</span>
                          <div style={{fontSize:9,color:'var(--c-muted)'}}>up to +{m.phase && m.phase.startsWith('GROUP') ? 9 : 10} pts</div>
                        </div>
                      ) : (
                        <Link to="/predictions" style={{fontSize:11,color:'var(--c-warn)',fontWeight:600}}>Not predicted</Link>
                      )}
                    </div>
                  )
                })}
                <Link to="/predictions" style={{display:'block',marginTop:10,fontSize:12,color:'var(--c-accent)',fontWeight:700}}>
                  All predictions &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {!player && (
          <div className="alert alert-info" style={{marginTop:'1.25rem'}}>
            You haven't joined the pool yet. <Link to="/join" style={{color:'var(--c-accent)',fontWeight:700}}>Join now &rarr;</Link>
          </div>
        )}
      </div>
    </div>
  )
}
