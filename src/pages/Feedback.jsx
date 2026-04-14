import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

const CATEGORIES = ['General feedback', 'Bug report', 'Feature request', 'Scoring issue', 'UI / Design', 'Other']

export default function Feedback() {
  const { player, authUser } = usePlayer()
  const [category, setCategory] = useState(CATEGORIES[0])
  const [message, setMessage]   = useState('')
  const [rating, setRating]     = useState(0)
  const [hoverRating, setHover] = useState(0)
  const [status, setStatus]     = useState('idle') // idle | sending | done | error
  const [error, setError]       = useState('')

  async function submit() {
    if (!message.trim()) { setError('Please write something before submitting.'); return }
    setStatus('sending'); setError('')

    try {
      // Always save to DB first - guaranteed to work
      const { error: dbErr } = await supabase.from('feedback').insert({
        player_id:   player?.id   || null,
        player_name: player?.name || authUser?.email || 'Anonymous',
        email:       authUser?.email || null,
        category,
        message: message.trim(),
        rating:  rating || null,
      })

      if (dbErr) {
        setError('Failed to submit: ' + dbErr.message)
        setStatus('error')
        return
      }

      // Try edge function for email notification (non-blocking, best-effort)
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        await fetch(`${supabaseUrl}/functions/v1/send-feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
          body: JSON.stringify({
            player_id: player?.id || null,
            player_name: player?.name || 'Anonymous',
            email: authUser?.email || null,
            category, message: message.trim(), rating: rating || null,
          })
        })
      } catch (_) { /* email notification optional */ }

      setStatus('done')
      setMessage('')
      setRating(0)
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <h1>Feedback</h1>
          <p>Tell us what's working, what's broken, or what you want next</p>
        </div>
      </div>
      <div className="page-body">
        <div style={{maxWidth:580}}>

          {status === 'done' ? (
            <div className="card" style={{textAlign:'center',padding:'3rem 2rem'}}>
              <div style={{fontSize:48,marginBottom:16}}>\u{1F64F}</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:28,letterSpacing:'0.04em',marginBottom:8}}>Thanks!</div>
              <p style={{color:'var(--c-muted)',fontSize:14,lineHeight:1.7,marginBottom:'1.5rem'}}>
                Your feedback has been sent to Shawn and saved to the database. It genuinely helps.
              </p>
              <button className="btn btn-accent" onClick={() => setStatus('idle')}>
                Send more feedback
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="card-title">Submit feedback</div>

              {/* Who's submitting */}
              {(player || authUser) && (
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--c-surface2)',borderRadius:'var(--radius)',marginBottom:'1.25rem',border:'1px solid var(--c-border)'}}>
                  <div className="avatar" style={{width:32,height:32,fontSize:11,fontWeight:700,background:'rgba(200,16,46,0.2)',color:'var(--c-accent)',flexShrink:0}}>
                    {(player?.name||authUser?.email||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{player?.name || 'Admin'}</div>

                  </div>
                  <div className="badge badge-green" style={{marginLeft:'auto'}}>Logged in</div>
                </div>
              )}

              {/* Rating */}
              <div className="form-row">
                <label>Rating (optional)</label>
                <div style={{display:'flex',gap:6,marginTop:4}}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setRating(n===rating?0:n)}
                      onMouseEnter={()=>setHover(n)} onMouseLeave={()=>setHover(0)}
                      style={{fontSize:28,background:'none',border:'none',cursor:'pointer',opacity:(hoverRating||rating)>=n?1:0.25,transition:'opacity 0.1s,transform 0.1s',transform:(hoverRating||rating)>=n?'scale(1.1)':'scale(1)'}}>
                      \u2B50
                    </button>
                  ))}
                  {rating > 0 && <span style={{fontSize:12,color:'var(--c-muted)',alignSelf:'center',marginLeft:4}}>{['','Terrible','Bad','OK','Good','Great!'][rating]}</span>}
                </div>
              </div>

              {/* Category */}
              <div className="form-row">
                <label>Category</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                  {CATEGORIES.map(c=>(
                    <button key={c} onClick={()=>setCategory(c)} style={{
                      padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid',transition:'all 0.12s',
                      background:category===c?'var(--c-accent)':'var(--c-surface2)',
                      borderColor:category===c?'var(--c-accent)':'var(--c-border)',
                      color:category===c?'#fff':'var(--c-muted)',
                    }}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="form-row">
                <label>Message</label>
                <textarea
                  value={message}
                  onChange={e=>setMessage(e.target.value)}
                  placeholder="What's on your mind? Bug, idea, complaint, praise - all welcome."
                  rows={5}
                  style={{width:'100%',resize:'vertical',fontFamily:'var(--font-body)',fontSize:14,padding:'10px 12px',background:'var(--c-surface2)',border:'1px solid var(--c-border2)',borderRadius:'var(--radius)',color:'var(--c-text)',lineHeight:1.6}}
                />
                <div className="form-hint">{message.length}/1000 characters</div>
              </div>

              {error && <div className="alert alert-warn" style={{marginBottom:'1rem'}}>{error}</div>}

              <button className="btn btn-accent"
                style={{width:'100%',justifyContent:'center',padding:'11px',fontSize:14}}
                onClick={submit}
                disabled={status==='sending'}>
                {status==='sending' ? 'Sending...' : 'Send feedback'}
              </button>

              <p style={{fontSize:11,color:'var(--c-hint)',marginTop:12,textAlign:'center'}}>
              </p>
            </div>
          )}

          {/* Admin view of all feedback */}
          {false && <AdminFeedback />}
        </div>
      </div>
    </div>
  )
}

function AdminFeedback() {
  return null // Placeholder - admin can view feedback in Supabase Table Editor
}
