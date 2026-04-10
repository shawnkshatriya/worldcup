import { useState, useEffect } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Join() {
  const { player, join, loginAdmin } = usePlayer()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [name, setName] = useState('')
  const [code, setCode] = useState(params.get('code') || '')
  const [adminSecret, setAdminSecret] = useState('')
  const [mode, setMode] = useState('join')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (player) navigate('/') }, [player])

  async function handleJoin() {
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!code.trim()) { setError('Please enter your invite code.'); return }
    setLoading(true)
    setError('')
    try {
      const { data: room } = await supabase.from('rooms').select('code').eq('invite_token', code.trim()).single()
      if (!room) { setError('Invalid invite code. Check with your admin.'); setLoading(false); return }
      await join(name.trim(), room.code)
      navigate('/')
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  function handleAdminLogin() {
    const ok = loginAdmin(adminSecret)
    if (ok) navigate('/admin')
    else setError('Wrong admin password.')
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--c-bg)',padding:'2rem'}}>
      <div style={{width:'100%',maxWidth:420}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:36,fontWeight:700,color:'var(--c-accent)',letterSpacing:'0.05em',textTransform:'uppercase'}}>WC26</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Predictor</div>
        </div>

        <div className="card">
          <div className="tabs" style={{marginBottom:'1.5rem'}}>
            <button className={`tab${mode==='join'?' active':''}`} onClick={() => { setMode('join'); setError('') }}>Join pool</button>
            <button className={`tab${mode==='admin'?' active':''}`} onClick={() => { setMode('admin'); setError('') }}>Admin login</button>
          </div>

          {mode === 'join' && (
            <>
              <div className="form-row">
                <label>Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" onKeyDown={e => e.key==='Enter' && handleJoin()} />
              </div>
              <div className="form-row">
                <label>Invite code</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Paste code or use invite link" onKeyDown={e => e.key==='Enter' && handleJoin()} />
                <div className="form-hint">Get this from whoever created the pool.</div>
              </div>
              {error && <div className="alert alert-warn" style={{marginBottom:12}}>{error}</div>}
              <button className="btn btn-accent" style={{width:'100%',justifyContent:'center'}} onClick={handleJoin} disabled={loading}>
                {loading ? 'Joining...' : 'Join pool'}
              </button>
            </>
          )}

          {mode === 'admin' && (
            <>
              <div className="form-row">
                <label>Admin password</label>
                <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} placeholder="Enter admin password" onKeyDown={e => e.key==='Enter' && handleAdminLogin()} />
                <div className="form-hint">Set via VITE_ADMIN_SECRET in your .env file.</div>
              </div>
              {error && <div className="alert alert-warn" style={{marginBottom:12}}>{error}</div>}
              <button className="btn btn-accent" style={{width:'100%',justifyContent:'center'}} onClick={handleAdminLogin}>
                Login as admin
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
