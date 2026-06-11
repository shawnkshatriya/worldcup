import { useState, useEffect } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { useNavigate, useSearchParams } from 'react-router-dom'

const TrophyIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4"/>
    <path d="M6 9c0 3.314 2.686 6 6 6s6-2.686 6-6V5H6v4z"/>
    <path d="M12 15v4M8 21h8"/>
  </svg>
)

export default function Join() {
  const { player, loading, directSignup, directLogin, loginAdmin } = usePlayer()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [mode, setMode]               = useState('new')
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [inviteCode, setInviteCode]   = useState(params.get('code') || '')
  const [adminSecret, setAdminSecret] = useState('')
  const [status, setStatus]           = useState('idle') // idle | sending | sent | error
  const [error, setError]             = useState('')

  useEffect(() => {
    if (!loading && player) navigate('/')
  }, [player, loading])

  function clearState() { setError(''); setStatus('idle') }

  async function handleSignup() {
    if (!name.trim())        { setError('Please enter your name.'); return }
    if (!email.trim())       { setError('Please enter your email.'); return }
    if (!inviteCode.trim())  { setError('Please enter your invite code.'); return }
    setStatus('sending'); setError('')
    try {
      await directSignup(email.trim(), name.trim(), inviteCode.trim())
      navigate('/predictions')
    } catch (e) {
      setStatus('error')
      if (e.message === 'INVALID_CODE') setError('Invalid invite code. Check with your admin.')
      else if (e.message === 'NAME_TAKEN') setError(`"${name.trim()}" is already taken. Choose a different name.`)
      else setError(e.message || 'Something went wrong. Please try again.')
    }
  }

  async function handleLogin() {
    if (!email.trim()) { setError('Please enter your email.'); return }
    setStatus('sending'); setError('')
    try {
      await directLogin(email.trim())
      navigate('/')
    } catch (e) {
      setStatus('error')
      if (e.message === 'EMAIL_NOT_FOUND') {
        setError(`No account found for "${email.trim()}". Check your email or join as a new player.`)
      } else {
        setError(e.message || 'Could not log in. Please try again.')
      }
    }
  }

  function handleAdminLogin() {
    const ok = loginAdmin(adminSecret)
    if (ok) navigate('/admin')
    else setError('Wrong admin password.')
  }

  const TABS = [
    { id: 'new',      label: 'New Player' },
    { id: 'returning', label: 'Log Back In' },
    { id: 'admin',    label: 'Admin' },
  ]

  if (loading) return null

  return (
    <div style={{ background: 'var(--c-bg)', padding: '2rem 1rem calc(4rem + env(safe-area-inset-bottom, 0px))', boxSizing: 'border-box', minHeight: '100%' }}>
      <div style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}>

      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'var(--c-accent)', marginBottom: 10 }}>
          <TrophyIcon />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: '0.06em', lineHeight: 1, color: 'var(--c-text)' }}>WC 2026</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.1em', color: 'var(--c-muted)', marginTop: 2 }}>PREDICTOR POOL</div>
      </div>

      <div>
        <div className="card" style={{ padding: '1.75rem' }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius)', padding: 3, marginBottom: '1rem', flexShrink: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setMode(t.id); clearState() }} style={{
                flex: 1, padding: '7px 4px', border: 'none', borderRadius: 4,
                fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
                transition: 'all 0.12s',
                background: mode === t.id ? 'var(--c-accent)' : 'transparent',
                color: mode === t.id ? '#fff' : 'var(--c-muted)',
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* -- New player -- */}
          {mode === 'new' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Enter your details and invite code to join the pool.
              </p>
              <div className="form-row">
                <label>Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" onKeyDown={e => e.key === 'Enter' && handleSignup()} autoFocus />
              </div>
              <div className="form-row">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleSignup()} />
              </div>
              <div className="form-row">
                <label>Invite code</label>
                <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Paste the invite code" onKeyDown={e => e.key === 'Enter' && handleSignup()} />
                <div className="form-hint">Get this from whoever created the pool.</div>
              </div>
              {error && <div className="alert alert-warn">{error}</div>}
              <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }}
                onClick={handleSignup} disabled={status === 'sending'}>
                {status === 'sending' ? 'Joining...' : 'Join Pool'}
              </button>
            </>
          )}

          {/* -- Returning player -- */}
          {mode === 'returning' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Enter the email you signed up with to log back in.
              </p>
              <div className="form-row">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
              </div>
              {error && <div className="alert alert-warn">{error}</div>}
              <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }}
                onClick={handleLogin} disabled={status === 'sending'}>
                {status === 'sending' ? 'Logging in...' : 'Log In'}
              </button>
            </>
          )}

          {/* -- Admin -- */}
          {mode === 'admin' && (
            <>
              <div className="form-row">
                <label>Admin password</label>
                <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)}
                  placeholder="Enter admin password" onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} autoFocus />
                <div className="form-hint">Set via VITE_ADMIN_SECRET in your Vercel environment variables.</div>
              </div>
              {error && <div className="alert alert-warn">{error}</div>}
              <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }} onClick={handleAdminLogin}>
                Login as Admin
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-hint)', marginTop: 16 }}>
          FIFA World Cup 2026 . Canada . Mexico . USA
        </p>
      </div>
      </div>
    </div>
  )
}
