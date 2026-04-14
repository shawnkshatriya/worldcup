import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

const CATEGORIES = ['General feedback', 'Bug report', 'Feature request', 'Scoring issue', 'UI / Design', 'Other']

export default function Support() {
  const { player, authUser } = usePlayer()
  const [category, setCategory] = useState(CATEGORIES[0])
  const [message, setMessage]   = useState('')
  const [rating, setRating]     = useState(0)
  const [hover, setHover]       = useState(0)
  const [status, setStatus]     = useState('idle')
  const [error, setError]       = useState('')

  async function submit() {
    if (!message.trim()) { setError('Please write something before submitting.'); return }
    setStatus('sending'); setError('')
    try {
      const { error: dbErr } = await supabase.from('feedback').insert({
        player_id:   player?.id || null,
        player_name: player?.name || authUser?.email || 'Anonymous',
        email:       authUser?.email || null,
        category, message: message.trim(),
        rating: rating || null,
      })
      if (dbErr) { setError('Failed: ' + dbErr.message); setStatus('error'); return }

      // Non-blocking email notification
      try {
        const url = import.meta.env.VITE_SUPABASE_URL
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY
        await fetch(`${url}/functions/v1/send-feedback`, {
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':key},
          body:JSON.stringify({ player_id:player?.id, player_name:player?.name||'Anonymous', email:authUser?.email, category, message:message.trim(), rating:rating||null })
        })
      } catch(_) {}

      setStatus('done'); setMessage(''); setRating(0)
    } catch(e) { setError('Something went wrong.'); setStatus('error') }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Support</h1>
          <p>Send feedback or support the pool</p>
        </div>
      </div>
      <div className="page-body">
        <div style={{display:'flex',flexDirection:'column',gap:'1.5rem',maxWidth:600}}>

          {/* Buy me a coffee */}
          <div className="card" style={{marginBottom:0,textAlign:'center'}}>
            <div className="card-title">Support the pool</div>
            <p style={{fontSize:13,color:'var(--c-muted)',lineHeight:1.8,marginBottom:'1.5rem'}}>
              This prediction pool is free to use — no ads, no paywalls, no catches.
              If you're getting enjoyment out of it and want to help keep the lights on, a coffee genuinely helps and means a lot.
            </p>
            <a href="https://buymeacoffee.com/shawnkshatriya" target="_blank" rel="noopener noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:8,
                background:'var(--c-accent)',color:'var(--c-accent-text,#fff)',
                padding:'12px 24px',borderRadius:10,fontWeight:700,
                fontSize:14,textDecoration:'none',transition:'transform 0.12s,filter 0.12s'}}
              onMouseEnter={e => e.currentTarget.style.filter='brightness(0.88)'}
              onMouseLeave={e => e.currentTarget.style.filter=''}>
              Buy me a coffee
            </a>
            <div style={{marginTop:'1.5rem',borderTop:'1px solid var(--c-border)',paddingTop:'1.25rem'}}>
              <div className="card-title" style={{fontSize:13}}>What it pays for</div>
              {[
  'Supabase — powers the database, authentication, and real-time score updates for all players',
  'Vercel — hosts the app and deploys every update instantly, globally',
  'Resend — sends magic link login emails and feedback notifications',
  'football-data.org — live score sync during the tournament so you don\'t have to enter results manually',
  'Time — building features, fixing bugs, and keeping everything running through the Final on July 19',
]
                .map((item,i) => (
                  <div key={i} style={{fontSize:13,color:'var(--c-muted)',padding:'5px 0',
                    borderBottom:'1px solid var(--c-border)',textAlign:'left'}}>{item}</div>
                ))}
            </div>
          </div>

          {/* Feedback form */}
          <div className="card" style={{marginBottom:0}}>
            <div className="card-title">Send feedback</div>
            {status === 'done' ? (
              <div style={{textAlign:'center',padding:'1.5rem 0'}}>
                <div style={{fontSize:36,marginBottom:12}}>🙏</div>
                <div style={{fontWeight:600,fontSize:16,marginBottom:8}}>Thanks!</div>
                <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:'1rem'}}>Your feedback has been received.</p>
                <button className="btn btn-accent" onClick={() => setStatus('idle')}>Send more</button>
              </div>
            ) : (
              <>
                {/* Rating */}
                <div className="form-row">
                  <label>Rating (optional)</label>
                  <div style={{display:'flex',gap:4,marginTop:4}}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setRating(n===rating?0:n)}
                        onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                        style={{fontSize:22,background:'none',border:'none',cursor:'pointer',
                          opacity:(hover||rating)>=n?1:0.25,transition:'opacity 0.1s'}}>
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="form-row">
                  <label>Category</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setCategory(cat)} style={{
                        padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:600,
                        cursor:'pointer',border:'1px solid',transition:'all 0.12s',
                        background:category===cat?'var(--c-accent)':'var(--c-surface2)',
                        borderColor:category===cat?'var(--c-accent)':'var(--c-border)',
                        color:category===cat?'var(--c-accent-text, #fff)':'var(--c-muted)',
                      }}>{cat}</button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="form-row">
                  <label>Message</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Bug, idea, complaint, praise — all welcome."
                    rows={4} style={{width:'100%',resize:'vertical',fontFamily:'var(--font-body)',
                      fontSize:14,padding:'10px 12px',background:'var(--c-surface2)',
                      border:'1px solid var(--c-border2)',borderRadius:'var(--radius)',
                      color:'var(--c-text)',lineHeight:1.6}} />
                </div>

                {error && <div className="alert alert-warn" style={{marginBottom:'1rem'}}>{error}</div>}
                <button className="btn btn-accent" style={{width:'100%',justifyContent:'center'}}
                  onClick={submit} disabled={status==='sending'}>
                  {status==='sending' ? 'Sending...' : 'Send feedback'}
                </button>
              </>
            )}
          </div>



        </div>
      </div>
    </div>
  )
}
