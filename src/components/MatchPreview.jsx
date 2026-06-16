import { useState } from 'react'

// AI-generated match preview (Gemini). On-demand, cached server-side. Garnish only.
export default function MatchPreview({ match }) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  function load() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (preview || failed) return
    setLoading(true)
    fetch('/api/match-preview?home=' + encodeURIComponent(match.home_team) + '&away=' + encodeURIComponent(match.away_team))
      .then(function(r){ return r.json() })
      .then(function(d){
        if (d.ok) setPreview(d.preview)
        else setFailed(true)
        setLoading(false)
      })
      .catch(function(){ setFailed(true); setLoading(false) })
  }

  if (!match.home_team || !match.away_team) return null

  return (
    <div style={{marginTop:6}}>
      <button
        onClick={load}
        style={{fontSize:11,padding:'3px 10px',borderRadius:6,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-accent)',cursor:'pointer',fontWeight:600}}
      >
        {open ? 'Hide preview' : '✨ AI preview'}
      </button>
      {open && (
        <div style={{marginTop:6,fontSize:12,color:'var(--c-text)',lineHeight:1.5,padding:'8px 10px',background:'var(--c-surface2)',borderRadius:8,fontStyle:'italic'}}>
          {loading ? 'Generating preview…' : failed ? 'Preview unavailable right now.' : preview}
        </div>
      )}
    </div>
  )
}
