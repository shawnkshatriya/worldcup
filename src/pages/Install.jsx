export default function Install() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Install the app</h1>
          <p>Add WC26 Predictor to your home screen — no App Store needed</p>
        </div>
      </div>
      <div className="page-body">

        {/* iPhone */}
        <div className="card" style={{marginBottom:'1.25rem'}}>
          <div className="card-title">iPhone — Safari only</div>
          <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1.25rem'}}>
            Must use Safari. Chrome on iOS doesn't support home screen install.
          </p>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {[
              { n:1, title:'Open in Safari', desc:'Go to your invite link in Safari — not Chrome.' },
              { n:2, title:'Tap the share button', desc:'The box-with-arrow icon at the bottom centre of Safari.' },
              { n:3, title:'Tap "Add to Home Screen"', desc:'Scroll down the share sheet until you see it.' },
              { n:4, title:'Tap "Add"', desc:'Confirm the name and tap Add in the top right.' },
            ].map((s, i, arr) => (
              <div key={s.n} style={{display:'flex',gap:16,padding:'14px 0',borderBottom: i < arr.length-1 ? '1px solid var(--c-border)' : 'none'}}>
                <div style={{
                  width:28,height:28,borderRadius:'50%',background:'var(--c-accent)',
                  color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'var(--font-display)',fontSize:16,flexShrink:0,marginTop:1
                }}>{s.n}</div>
                <div>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{s.title}</div>
                  <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.6}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="alert alert-info" style={{marginTop:'1rem',fontSize:12}}>
            The app opens full screen with no browser bar — looks and feels native.
          </div>
        </div>

        {/* Android */}
        <div className="card" style={{marginBottom:'1.25rem'}}>
          <div className="card-title">Android — Chrome</div>
          <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1.25rem'}}>
            Two ways to install — whichever appears first.
          </p>

          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:'var(--c-text)'}}>Option A — install banner</div>
          <div style={{display:'flex',gap:16,padding:'0 0 14px',borderBottom:'1px solid var(--c-border)',marginBottom:14}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'var(--c-info)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:16,flexShrink:0}}>1</div>
            <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.6,paddingTop:4}}>Chrome automatically shows a banner at the bottom of the screen saying "Add WC26 to Home Screen" — tap <strong>Install</strong>.</div>
          </div>

          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:'var(--c-text)'}}>Option B — menu</div>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {[
              { n:1, title:'Tap the 3-dot menu', desc:'Top right corner of Chrome.' },
              { n:2, title:'Tap "Add to Home Screen"', desc:'Or "Install app" — same thing, depends on Chrome version.' },
              { n:3, title:'Tap "Install"', desc:'Confirm and it appears on your home screen.' },
            ].map((s, i, arr) => (
              <div key={s.n} style={{display:'flex',gap:16,padding:'14px 0',borderBottom: i < arr.length-1 ? '1px solid var(--c-border)' : 'none'}}>
                <div style={{
                  width:28,height:28,borderRadius:'50%',background:'var(--c-info)',
                  color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'var(--font-display)',fontSize:16,flexShrink:0,marginTop:1
                }}>{s.n}</div>
                <div>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{s.title}</div>
                  <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.6}}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop */}
        <div className="card" style={{marginBottom:'1.25rem'}}>
          <div className="card-title">Desktop — Chrome or Edge</div>
          <div style={{display:'flex',gap:16,padding:'10px 0'}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'var(--c-surface2)',color:'var(--c-muted)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:16,flexShrink:0}}>1</div>
            <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.6,paddingTop:4}}>Look for the install icon in the address bar (a screen with a download arrow). Click it and then click <strong>Install</strong>. Opens as a standalone window.</div>
          </div>
        </div>

        {/* FAQ */}
        <div className="card" style={{marginBottom:0}}>
          <div className="card-title">Common questions</div>
          {[
            { q:'Does it work offline?', a:'Partially — the shell loads instantly from cache. But live scores and leaderboard need a connection since they pull from the database.' },
            { q:'Will it update automatically?', a:'Yes. When a new version is deployed, the app updates silently next time you open it. No manual update needed.' },
            { q:'Does it use storage on my phone?', a:'Barely — a few kilobytes for the cached shell. All data lives in the cloud.' },
            { q:'Can I get push notifications?', a:'Android yes — iOS Safari currently doesn\'t support push notifications for web apps, though Apple is gradually adding support.' },
          ].map((faq, i, arr) => (
            <div key={i} style={{padding:'12px 0',borderBottom: i < arr.length-1 ? '1px solid var(--c-border)' : 'none'}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:5}}>{faq.q}</div>
              <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.6}}>{faq.a}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
