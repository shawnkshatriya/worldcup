import { useEffect } from 'react'

export default function Support() {
  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Support the pool</h1>
          <p>Built with love. Keep it running.</p>
        </div>
      </div>
      <div className="page-body">
        <div style={{maxWidth:520}}>

          <div className="card" style={{textAlign:'center',padding:'2.5rem 2rem',marginBottom:'1.25rem'}}>
            
            <div style={{fontFamily:'var(--font-display)',fontSize:32,letterSpacing:'0.04em',marginBottom:12}}>
              Buy Shawn a coffee
            </div>
            <p style={{fontSize:14,color:'var(--c-muted)',lineHeight:1.8,marginBottom:'1.75rem',maxWidth:360,margin:'0 auto 1.75rem'}}>
              This prediction pool is free to use — no ads, no paywalls, no BS.
              If you're enjoying it and want to keep the lights on, a coffee goes a long way.
            </p>

            <a
              href="https://buymeacoffee.com/shawnkshatriya"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:'inline-flex',
                alignItems:'center',
                gap:10,
                background:'#FFDD00',
                color:'#000',
                padding:'13px 28px',
                borderRadius:12,
                fontWeight:700,
                fontSize:15,
                textDecoration:'none',
                transition:'transform 0.12s, box-shadow 0.12s',
                border:'none',
                cursor:'pointer',
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)'}}
            >
              Buy me a coffee
            </a>
          </div>

          <div className="card" style={{marginBottom:'1.25rem'}}>
            <div className="card-title">What your support pays for</div>
            {[
              { icon:'', label:'Supabase',    desc:'Database, auth and edge functions — free tier covers a few hundred users, paid tier needed beyond that' },
              { icon:'', label:'Vercel',      desc:'Hosting and deployment — free tier for now, scales with traffic' },
              { icon:'', label:'Resend',      desc:'Email delivery for magic links and feedback notifications' },
              { icon:'', label:'Football API', desc:'Live score sync from football-data.org during the tournament' },
              { icon:'', label:'Time',        desc:'Ongoing bug fixes, new features, and keeping everything running through July 19' },
            ].map(item => (
              <div key={item.label} style={{display:'flex',gap:14,padding:'12px 0',borderBottom:'1px solid var(--c-border)',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{item.label}</div>
                  <div style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.6}}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{textAlign:'center',fontSize:12,color:'var(--c-hint)',lineHeight:1.8}}>
            No pressure at all — enjoy the pool either way.
          </div>

        </div>
      </div>
    </div>
  )
}
