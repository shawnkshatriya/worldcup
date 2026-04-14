export default function Install() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Install the app</h1>
          <p>Add WC26 to your home screen — no App Store needed</p>
        </div>
      </div>
      <div className="page-body">

        {/* iPhone */}
        <div className="card" style={{marginBottom:'1.25rem'}}>
          <div className="card-title">iPhone — Safari only</div>
          <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1.5rem'}}>
            Must use Safari. Chrome on iOS does not support home screen install.
          </p>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:20,marginBottom:'1.25rem'}}>
            {[
              { n:1, label:'Open in Safari', phone: <IOSStep1 /> },
              { n:2, label:'Tap share button', phone: <IOSStep2 /> },
              { n:3, label:'Add to Home Screen', phone: <IOSStep3 /> },
              { n:4, label:'Tap Add', phone: <IOSStep4 /> },
              { n:5, label:'Done!', phone: <IOSStep5 /> },
            ].map(s => (
              <div key={s.n} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-muted)'}}>Step {s.n}</div>
                {s.phone}
                <div style={{fontSize:11,color:'var(--c-muted)',textAlign:'center',lineHeight:1.4}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Android */}
        <div className="card" style={{marginBottom:'1.25rem'}}>
          <div className="card-title">Android — Chrome</div>
          <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1.5rem'}}>
            Chrome usually shows an install banner automatically. Or use the menu.
          </p>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:20,marginBottom:'1.25rem'}}>
            {[
              { n:1, label:'Open in Chrome', phone: <AndroidStep1 /> },
              { n:2, label:'Tap install banner or 3-dot menu', phone: <AndroidStep2 /> },
              { n:3, label:'Done!', phone: <AndroidStep3 /> },
            ].map(s => (
              <div key={s.n} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--c-muted)'}}>Step {s.n}</div>
                {s.phone}
                <div style={{fontSize:11,color:'var(--c-muted)',textAlign:'center',lineHeight:1.4}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="card" style={{marginBottom:0}}>
          <div className="card-title">Questions</div>
          {[
            { q:'Does it work offline?', a:'The shell loads from cache. Live scores and leaderboard need a connection.' },
            { q:'Will it update automatically?', a:'Yes — updates silently next time you open it.' },
            { q:'Does it use storage?', a:'Barely a few kilobytes. All data lives in the cloud.' },
            { q:'Can I get push notifications?', a:'Android yes. iOS Safari is adding support gradually.' },
          ].map((f,i,arr) => (
            <div key={i} style={{padding:'12px 0',borderBottom:i<arr.length-1?'1px solid var(--c-border)':'none'}}>
              <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{f.q}</div>
              <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.6}}>{f.a}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ── Phone mockup shell ───────────────────────────────────────────────────────
function Phone({ children, bg='#f5f5f5' }) {
  return (
    <div style={{width:120,height:220,background:'#1a1a1a',borderRadius:16,border:'5px solid #333',overflow:'hidden',position:'relative',flexShrink:0}}>
      <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:36,height:7,background:'#1a1a1a',borderRadius:'0 0 5px 5px',zIndex:2}}/>
      <div style={{width:'100%',height:'100%',background:bg,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {children}
      </div>
    </div>
  )
}

function IOSBar() {
  return <div style={{height:14,background:'inherit',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 6px',fontSize:7,color:'#333',flexShrink:0}}><span>9:41</span><span>●●●</span></div>
}

function IOSUrlBar() {
  return <div style={{height:18,background:'#e8e8e8',margin:'2px 5px',borderRadius:5,display:'flex',alignItems:'center',padding:'0 6px',fontSize:7,color:'#666',flexShrink:0}}>wc26predictor.app</div>
}

function AppContent() {
  return (
    <div style={{flex:1,padding:5}}>
      <div style={{background:'#C8102E',height:28,borderRadius:4,marginBottom:4,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#fff',fontSize:7,fontWeight:700}}>WC26 Predictor</span>
      </div>
      <div style={{background:'#fff',height:14,borderRadius:3,marginBottom:3}}/>
      <div style={{background:'#fff',height:14,borderRadius:3,marginBottom:3}}/>
      <div style={{background:'#fff',height:30,borderRadius:3}}/>
    </div>
  )
}

function IOSStep1() {
  return (
    <Phone>
      <IOSBar/>
      <IOSUrlBar/>
      <AppContent/>
      <div style={{height:26,background:'#f5f5f5',borderTop:'0.5px solid #ddd',display:'flex',alignItems:'center',justifyContent:'space-around',flexShrink:0}}>
        {['←','→','□','⬆','⋯'].map((s,i)=><span key={i} style={{fontSize:10,color:'#007AFF'}}>{s}</span>)}
      </div>
    </Phone>
  )
}

function IOSStep2() {
  return (
    <Phone>
      <IOSBar/>
      <IOSUrlBar/>
      <AppContent/>
      <div style={{height:26,background:'#f5f5f5',borderTop:'0.5px solid #ddd',display:'flex',alignItems:'center',justifyContent:'space-around',flexShrink:0,position:'relative'}}>
        {['←','→','□','⬆','⋯'].map((s,i)=><span key={i} style={{fontSize:10,color:s==='⬆'?'#C8102E':'#007AFF',fontWeight:s==='⬆'?700:400}}>{s}</span>)}
        <div style={{position:'absolute',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#C8102E',color:'#fff',fontSize:7,padding:'2px 6px',borderRadius:8,whiteSpace:'nowrap'}}>Tap this</div>
      </div>
    </Phone>
  )
}

function IOSStep3() {
  return (
    <Phone>
      <IOSBar/>
      <div style={{flex:1,position:'relative',overflow:'hidden'}}>
        <div style={{padding:5,opacity:0.3}}><div style={{background:'#C8102E',height:25,borderRadius:4}}/></div>
        {/* Sheet */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#fff',borderRadius:'8px 8px 0 0',borderTop:'0.5px solid #ddd',height:130}}>
          <div style={{width:28,height:3,background:'#ddd',borderRadius:2,margin:'6px auto 6px'}}/>
          {[
            {label:'Copy Link', hi:false},
            {label:'Add to Home Screen', hi:true},
            {label:'Add Bookmark', hi:false},
          ].map((item,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderBottom:'0.5px solid #eee',background:item.hi?'rgba(0,122,255,0.05)':'transparent'}}>
              <div style={{width:20,height:20,background:item.hi?'#007AFF':'#e8e8e8',borderRadius:5,flexShrink:0}}/>
              <span style={{fontSize:8,color:item.hi?'#007AFF':'#333',fontWeight:item.hi?600:400}}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Phone>
  )
}

function IOSStep4() {
  return (
    <Phone>
      <IOSBar/>
      <div style={{flex:1,padding:8,display:'flex',flexDirection:'column',justifyContent:'center'}}>
        <div style={{background:'#fff',borderRadius:8,border:'0.5px solid #ddd',overflow:'hidden'}}>
          <div style={{background:'#f5f5f5',padding:'6px 8px',display:'flex',alignItems:'center',gap:6,borderBottom:'0.5px solid #ddd'}}>
            <div style={{width:24,height:24,background:'#C8102E',borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{color:'#fff',fontSize:11,fontWeight:700}}>W</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:8,fontWeight:600,color:'#333'}}>WC26 Predictor</div>
              <div style={{fontSize:6,color:'#888'}}>wc26predictor.app</div>
            </div>
            <span style={{fontSize:8,color:'#007AFF',fontWeight:600}}>Add</span>
          </div>
          <div style={{padding:8,fontSize:7,color:'#666',lineHeight:1.5}}>
            An icon will be added to your Home Screen.
          </div>
        </div>
      </div>
    </Phone>
  )
}

function IOSStep5() {
  return (
    <Phone bg='#87CEEB'>
      <div style={{height:14,background:'rgba(0,0,0,0.1)',display:'flex',alignItems:'center',padding:'0 6px'}}>
        <span style={{fontSize:7,color:'#fff'}}>9:41</span>
      </div>
      <div style={{flex:1,padding:8,display:'flex',flexWrap:'wrap',alignContent:'flex-start',gap:6}}>
        {[
          {bg:'#1C1C1E',label:'Settings'},
          {bg:'#34C759',label:'Photos'},
          {bg:'#007AFF',label:'Safari'},
          {bg:'#FF9500',label:'Maps'},
          {bg:'#C8102E',label:'WC26',new:true},
        ].map((app,i) => (
          <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,width:44}}>
            <div style={{width:36,height:36,background:app.bg,borderRadius:8,border:app.new?'2px solid #fff':'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {app.new && <span style={{color:'#fff',fontSize:14,fontWeight:700}}>W</span>}
            </div>
            <span style={{fontSize:6,color:'#fff',textShadow:'0 1px 2px rgba(0,0,0,0.5)',textAlign:'center'}}>{app.label}</span>
          </div>
        ))}
      </div>
    </Phone>
  )
}

function AndroidStep1() {
  return (
    <Phone bg='#f5f5f5'>
      <div style={{height:18,background:'#1976D2',display:'flex',alignItems:'center',padding:'0 6px',gap:4,flexShrink:0}}>
        <div style={{flex:1,background:'rgba(255,255,255,0.15)',borderRadius:8,height:12,display:'flex',alignItems:'center',padding:'0 5px'}}>
          <span style={{fontSize:6,color:'rgba(255,255,255,0.9)'}}>wc26predictor.app</span>
        </div>
        <span style={{color:'#fff',fontSize:10}}>⋮</span>
      </div>
      <AppContent/>
    </Phone>
  )
}

function AndroidStep2() {
  return (
    <Phone bg='#f5f5f5'>
      <div style={{height:18,background:'#1976D2',display:'flex',alignItems:'center',padding:'0 6px',gap:4,flexShrink:0}}>
        <div style={{flex:1,background:'rgba(255,255,255,0.15)',borderRadius:8,height:12,display:'flex',alignItems:'center',padding:'0 5px'}}>
          <span style={{fontSize:6,color:'rgba(255,255,255,0.9)'}}>wc26predictor.app</span>
        </div>
        <span style={{color:'#fff',fontSize:10}}>⋮</span>
      </div>
      <div style={{flex:1,padding:5,position:'relative'}}>
        <div style={{background:'#C8102E',height:25,borderRadius:4,marginBottom:4,opacity:0.4}}/>
        {/* Install banner */}
        <div style={{background:'#fff',borderRadius:6,padding:'5px 6px',display:'flex',alignItems:'center',gap:5,border:'0.5px solid #ddd',marginBottom:4}}>
          <div style={{width:22,height:22,background:'#C8102E',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:'#fff',fontSize:10,fontWeight:700}}>W</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:7,fontWeight:600,color:'#333'}}>Add WC26 to Home</div>
            <div style={{fontSize:6,color:'#888'}}>wc26predictor.app</div>
          </div>
          <div style={{fontSize:7,color:'#1976D2',fontWeight:600,border:'1px solid #1976D2',borderRadius:8,padding:'1px 5px'}}>Install</div>
        </div>
        {/* Menu */}
        <div style={{position:'absolute',right:4,top:0,background:'#fff',borderRadius:5,border:'0.5px solid #ddd',width:90,zIndex:5}}>
          {['New tab','Bookmarks','Add to Home Screen','Share'].map((item,i) => (
            <div key={i} style={{padding:'4px 8px',fontSize:7,color:item==='Add to Home Screen'?'#1976D2':'#333',fontWeight:item==='Add to Home Screen'?600:400,borderBottom:'0.5px solid #f0f0f0'}}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </Phone>
  )
}

function AndroidStep3() {
  return (
    <Phone bg='#1a237e'>
      <div style={{height:14,background:'rgba(0,0,0,0.2)',display:'flex',alignItems:'center',padding:'0 6px'}}>
        <span style={{fontSize:7,color:'#fff'}}>9:41</span>
      </div>
      <div style={{flex:1,padding:8,display:'flex',flexWrap:'wrap',alignContent:'flex-start',gap:6}}>
        {[
          {bg:'#43A047',label:'Phone'},
          {bg:'#1E88E5',label:'Messages'},
          {bg:'#E53935',label:'Gmail'},
          {bg:'#C8102E',label:'WC26',new:true},
        ].map((app,i) => (
          <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,width:44}}>
            <div style={{width:36,height:36,background:app.bg,borderRadius:8,border:app.new?'2px solid #fff':'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {app.new && <span style={{color:'#fff',fontSize:14,fontWeight:700}}>W</span>}
            </div>
            <span style={{fontSize:6,color:'#fff',textAlign:'center'}}>{app.label}</span>
          </div>
        ))}
      </div>
    </Phone>
  )
}
