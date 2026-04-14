import { usePlayer } from '../hooks/usePlayer'

function Section({ title, children }) {
  return (
    <div className="card" style={{marginBottom:'1.25rem'}}>
      <div className="card-title">{title}</div>
      {children}
    </div>
  )
}

function Step({ n, title, desc }) {
  return (
    <div style={{display:'flex',gap:14,padding:'12px 0',borderBottom:'1px solid var(--c-border)'}}>
      <div style={{
        width:28,height:28,borderRadius:'50%',background:'var(--c-accent)',
        color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
        fontFamily:'var(--font-display)',fontSize:16,flexShrink:0,marginTop:1
      }}>{n}</div>
      <div>
        <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{title}</div>
        <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.7}}>{desc}</div>
      </div>
    </div>
  )
}

function Tab({ name, desc }) {
  return (
    <div style={{display:'flex',gap:14,padding:'10px 0',borderBottom:'1px solid var(--c-border)'}}>
      <div style={{
        minWidth:100,fontSize:12,fontWeight:700,color:'var(--c-accent)',
        background:'rgba(200,16,46,0.08)',borderRadius:6,
        padding:'3px 8px',height:'fit-content',textAlign:'center',flexShrink:0
      }}>{name}</div>
      <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.7}}>{desc}</div>
    </div>
  )
}

function AdminTab({ name, desc }) {
  return (
    <div style={{display:'flex',gap:14,padding:'10px 0',borderBottom:'1px solid var(--c-border)'}}>
      <div style={{
        minWidth:100,fontSize:12,fontWeight:700,color:'var(--c-accent2)',
        background:'rgba(240,165,0,0.08)',borderRadius:6,
        padding:'3px 8px',height:'fit-content',textAlign:'center',flexShrink:0
      }}>{name}</div>
      <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.7}}>{desc}</div>
    </div>
  )
}

function Tip({ children }) {
  return (
    <div className="alert alert-info" style={{marginTop:10,fontSize:13}}>
      {children}
    </div>
  )
}

export default function Guide() {
  const { isAdmin, isRoomAdmin } = usePlayer()
  const showAdminGuide = isAdmin || isRoomAdmin

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>How to play</h1>
          <p>Everything you need to know to get started and win</p>
        </div>
      </div>
      <div className="page-body">

        {/* ── GETTING STARTED ── */}
        <Section title="Getting started">
          <Step n={1} title="Join via invite link"
            desc="Open the invite link your pool organiser shared. Enter your name and email — a magic link gets sent to your inbox." />
          <Step n={2} title="Click the magic link"
            desc="Open the email from WC26 Predictor and click the link. It logs you in automatically — no password to remember." />
          <Step n={3} title="Submit your predictions"
            desc="Go to My Predictions and fill in your score for every match. You can update predictions right up until each match kicks off." />
          <Step n={4} title="Pick the tournament winner"
            desc="Go to Winner Pick and choose which team you think wins the whole tournament. Worth a big bonus if you're right — locked at kickoff." />
          <Step n={5} title="Install the app"
            desc="Go to Install App in the sidebar to add WC26 to your phone home screen. No App Store — it installs directly from the browser." />
          <Tip>Coming back? Go to the join page and use Log Back In with your email. A new magic link gets sent.</Tip>
        </Section>

        {/* ── MY PREDICTIONS ── */}
        <Section title="Filling in predictions">
          <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.7}}>
            Go to <strong>My Predictions</strong> in the sidebar. Matches are grouped by phase — Group A through Group L, then the knockout rounds.
          </p>
          {[
            { title:'Enter home and away goals', desc:'Type the score you think will happen. 0 is a valid score — don\'t leave it blank.' },
            { title:'Save each match', desc:'Click Save on each match row. A green tick confirms it saved. You can edit it any time before the match kicks off.' },
            { title:'Knockout rounds', desc:'KO matches (Round of 32 onwards) will show TBD as team names until the group stage is done and teams are confirmed. You can still predict scores early.' },
            { title:'Deadline', desc:'Each prediction locks at the official kickoff time for that specific match. Miss the kickoff and you can\'t change it — but earlier predictions still count.' },
          ].map((s,i,arr) => (
            <div key={i} style={{display:'flex',gap:14,padding:'12px 0',borderBottom: i<arr.length-1?'1px solid var(--c-border)':'none'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'var(--c-accent)',flexShrink:0,marginTop:6}}/>
              <div>
                <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{s.title}</div>
                <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.7}}>{s.desc}</div>
              </div>
            </div>
          ))}
          <Tip>Predict all 104 matches to maximise your points — even a guess is better than nothing.</Tip>
        </Section>

        {/* ── SCORING ── */}
        <Section title="How scoring works">
          <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.7}}>
            Points are awarded after each match result is entered. All bonuses stack — earn every one you qualify for.
            The exact point values are set by your pool admin and may differ from the defaults shown here. Check the Dashboard scoring rules for your room's actual values.
          </p>
          {[
            { pts:'4 pts', label:'Exact score', desc:'You predicted the exact scoreline — this is the top tier. E.g. you said 2-1 and the result was 2-1.' },
            { pts:'2 pts', label:'Correct goal difference', desc:'Stacks on top of the correct result bonus. You got the right margin too, but not the exact score. E.g. you said 2-0, result was 3-1 (both +2) — earns 3 + 2 = 5 pts total.' },
            { pts:'3 pts', label:'Correct result (W/D/L)', desc:'You picked the right winner or draw, but the margin was different. E.g. you said 2-0, result was 1-0.' },
            { pts:'1 pt',  label:'Approximation bonus', desc:'Group stage only, high-scoring matches (4+ goals total). Your prediction was within 1 goal of the actual result each way. Stacks with correct W/D/L.' },
            { pts:'20 pts', label:'Tournament winner pick', desc:'Picked before June 11 — if your chosen team wins the whole tournament you get a big bonus. Check your room for the exact value.' },
            { pts:'10 pts', label:'Finalist bonus', desc:'If your chosen winner reaches the Final (even if they don\'t win), you get a smaller bonus. Check your room for the exact value.' },
          ].map((s,i) => (
            <div key={i} style={{display:'flex',gap:14,padding:'12px 0',borderBottom: i<3?'1px solid var(--c-border)':'none',alignItems:'flex-start'}}>
              <div style={{
                minWidth:52,textAlign:'center',fontFamily:'var(--font-display)',
                fontSize:18,color:'var(--c-gold)',flexShrink:0,paddingTop:2
              }}>{s.pts}</div>
              <div>
                <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{s.label}</div>
                <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.7}}>{s.desc}</div>
              </div>
            </div>
          ))}
          <div style={{marginTop:12,padding:'12px 0',borderTop:'1px solid var(--c-border)'}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>Knockout rounds</div>
            <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.7}}>
              KO matches use higher weights — exact scores are worth more, and there's no approximation bonus. Check your room's scoring rules on the Dashboard for exact values.
            </div>
          </div>
          <Tip>Points stack within tiers — correct W/D/L (3pts) + correct goal diff (2pts) = 5pts total. Exact score (4pts) is its own tier and replaces the others. Approx bonus stacks on top of W/D/L in high-scoring group games.</Tip>
        </Section>

        {/* ── PAGES ── */}
        <Section title="What each page does">
          <Tab name="Dashboard" desc="Your at-a-glance summary — matches played, your rank, your points, and the current top 5. Also shows the scoring rules for your room." />
          <Tab name="My Predictions" desc="Enter and edit your score predictions for all 104 matches. Grouped by phase. Lock icon appears once a match has kicked off." />
          <Tab name="Winner Pick" desc="Pick which team wins the entire tournament before June 11. Hidden from other players until kickoff — then everyone can see each other's picks." />
          <Tab name="Leaderboard" desc="Full standings for your room — points, % correct results, % correct goal difference, % exact scores. Podium at the top for the top 3." />
          <Tab name="Live Scores" desc="Match results as they come in, grouped by phase. Shows FT (full time), LIVE, or upcoming. Finished tab is most useful during the tournament." />
          <Tab name="Stats" desc="Four tabs of charts and numbers — tournament stats, player accuracy breakdowns, points race charts, and fun facts about the pool." />
          <Tab name="Fun Zone" desc="Achievements you can unlock, head-to-head rivalries against other players, your prediction bingo card, and match roasts after results come in." />
          <Tab name="All Predictions" desc="See everyone's predictions side by side — locked until the tournament starts so nobody can copy." />
          <Tab name="Feedback" desc="Send feedback, bug reports or feature requests directly to the pool organiser." />
          <Tab name="Install App" desc="Step-by-step guide to add WC26 to your phone home screen on iPhone or Android." />
          <Tab name="Support" desc="Buy the organiser a coffee if you're enjoying it." />
        </Section>

        {/* ── TIPS ── */}
        <Section title="Tips to score more points">
          {[
            'Predict all 104 matches — a guess at a KO match is still worth points if you get lucky.',
            'Don\'t always go for big scorelines — 1-0 and 1-1 are the most common results in tournament football.',
            'In knockout rounds, more points are at stake — spend more time on those predictions.',
            'Pick your tournament winner early — you can change it right up until June 11 kickoff.',
            'Check the leaderboard after each matchday to see who\'s closing in on you.',
          ].map((tip, i, arr) => (
            <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom: i<arr.length-1?'1px solid var(--c-border)':'none',fontSize:13,alignItems:'flex-start'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'var(--c-success)',flexShrink:0,marginTop:5}}/>
              <span style={{color:'var(--c-muted)',lineHeight:1.7}}>{tip}</span>
            </div>
          ))}
        </Section>

        {/* ── ADMIN GUIDE ── */}
        {showAdminGuide && (
          <>
            <div style={{
              display:'flex',alignItems:'center',gap:10,
              margin:'2rem 0 1.25rem',
              padding:'12px 16px',
              background:'rgba(240,165,0,0.06)',
              border:'1px solid rgba(240,165,0,0.2)',
              borderRadius:'var(--radius)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--c-gold)" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span style={{fontSize:13,fontWeight:600,color:'var(--c-gold)'}}>Admin guide — visible to admins only</span>
            </div>

            <Section title="Admin panel overview">
              <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem',lineHeight:1.7}}>
                {isAdmin
                  ? 'As master admin you have full control over all rooms. Access via /admin or the Admin link in the sidebar.'
                  : 'As room admin you manage your room only. Access via Room Admin in the sidebar.'}
              </p>
              {(isAdmin ? [
                { name:'Rooms', desc:'Create and delete rooms. Each room is fully isolated — own players, leaderboard and scoring weights. Click any room pill to switch between managing them.' },
                { name:'Weights', desc:'Set scoring rules per room. Changes take effect on next recalculation — always hit Recalculate after saving weights.' },
                { name:'Invite', desc:'Set a custom invite code (e.g. LADS2026), copy the full invite URL, and regenerate the token if needed. Adjust room name and player cap here too.' },
                { name:'Results', desc:'Enter match scores after each game. Select the phase tab, enter home and away goals, hit Save. Then go to Weights and hit Recalculate to update everyone\'s scores.' },
                { name:'Players', desc:'See all players in the current room, promote/demote room admins, remove individual players or purge the whole room. Duplicates are flagged automatically.' },
                { name:'Dev', desc:'Seed demo data (8 fake players, 104 matches) to preview the app before real players join. Clear demo data before the tournament starts. Run scoring engine tests here too.' },
              ] : [
                { name:'Players', desc:'See all players in your room. Remove players (except other admins). Can\'t purge the whole room — contact the master admin if needed.' },
                { name:'Weights', desc:'Set scoring rules for your room. Always hit Recalculate after saving.' },
                { name:'Results', desc:'Enter match scores. Select the phase, enter the score, hit Save, then Recalculate.' },
                { name:'Invite', desc:'Copy your room\'s invite link to share with new players.' },
              ]).map((t,i,arr) => (
                <AdminTab key={t.name} name={t.name} desc={t.desc} />
              ))}
            </Section>

            <Section title="Match day workflow">
              {[
                { title:'During the match', desc:'Nothing to do — players are locked from editing their prediction for this match from kickoff.' },
                { title:'After the final whistle', desc:'Go to Admin → Results, select the right phase, enter the score and hit Save.' },
                { title:'Recalculate scores', desc:'Go to Admin → Weights and click Recalculate. This re-runs the scoring engine for all players and updates the leaderboard.' },
                { title:'Repeat for each match', desc:'If multiple matches finish on the same day, enter all results first then recalculate once at the end.' },
              ].map((s,i,arr) => (
                <Step key={i} n={i+1} title={s.title} desc={s.desc} />
              ))}
              <Tip>If you have the football-data.org API key set up in Vercel, use Sync from API on the Live Scores page instead of entering results manually.</Tip>
            </Section>

            <Section title="Before the tournament starts (checklist)">
              {[
                'Create your rooms and set invite codes',
                'Share invite links with all players',
                'Confirm scoring weights are set correctly per room',
                'Make sure everyone has submitted predictions',
                'Set tournament winner picks are open',
                'Clear any demo data from Admin → Dev tab',
                'Test the leaderboard with at least one real player',
              ].map((item, i) => (
                <div key={i} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid var(--c-border)',fontSize:13,alignItems:'center'}}>
                  <div style={{width:16,height:16,border:'1.5px solid var(--c-border2)',borderRadius:4,flexShrink:0}}/>
                  <span style={{color:'var(--c-muted)'}}>{item}</span>
                </div>
              ))}
            </Section>

            {isAdmin && (
              <Section title="Multi-room tips">
                {[
                  'Each room has its own invite token — Work Pool and Personal Pool players can\'t cross-join accidentally.',
                  'You can promote any player to room admin from Admin → Players → Make admin. They\'ll see a Room Admin panel scoped to their room only.',
                  'Scoring weights are per room — set them differently for each pool if you want.',
                  'Demo data only seeds into the DEFAULT room so it won\'t pollute real rooms.',
                  'If someone needs to join a second room, send them that room\'s invite link — they use the same email and magic link flow.',
                ].map((tip, i, arr) => (
                  <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom: i<arr.length-1?'1px solid var(--c-border)':'none',fontSize:13,alignItems:'flex-start'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:'var(--c-gold)',flexShrink:0,marginTop:5}}/>
                    <span style={{color:'var(--c-muted)',lineHeight:1.7}}>{tip}</span>
                  </div>
                ))}
              </Section>
            )}
          </>
        )}

      </div>
    </div>
  )
}
