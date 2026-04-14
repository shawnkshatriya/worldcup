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
  const { player, loading, sendSignupLink, sendLoginLink, loginAdmin } = usePlayer()
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
      await sendSignupLink(email.trim(), name.trim(), '', inviteCode.trim())
      setStatus('sent')
    } catch (e) {
      setStatus('error')
      if (e.message === 'INVALID_CODE') setError('Invalid invite code. Check with your admin.')
      else if (e.message === 'NAME_TAKEN') setError(`"${name.trim()}" is already taken. Choose a different name.`)
      else setError('Something went wrong. Please try again.')
    }
  }

  async function handleLogin() {
    if (!email.trim()) { setError('Please enter your email.'); return }
    setStatus('sending'); setError('')
    try {
      await sendLoginLink(email.trim())
      setStatus('sent')
    } catch (e) {
      setStatus('error')
      if (e.message === 'EMAIL_NOT_FOUND') {
        setError(`No account found for "${email.trim()}". Check your email or join as a new player.`)
      } else {
        setError('Could not send magic link. Please try again.')
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
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: 'var(--c-accent)', marginBottom: 16 }}>
          <TrophyIcon />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, letterSpacing: '0.06em', lineHeight: 1, color: 'var(--c-text)' }}>WC 2026</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.1em', color: 'var(--c-muted)', marginTop: 2 }}>PREDICTOR POOL</div>
        <div style={{ height: 3, width: 60, margin: '12px auto 0', background: 'linear-gradient(90deg, var(--fifa-red), var(--fifa-blue))' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="card" style={{ padding: '1.75rem' }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius)', padding: 3, marginBottom: '1.5rem' }}>
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
          {mode === 'new' && status !== 'sent' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Enter your details and we'll email you a magic link to join. No password needed - ever.
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
                {status === 'sending' ? 'Sending link...' : 'Send Magic Link'}
              </button>
            </>
          )}

          {/* -- Returning player -- */}
          {mode === 'returning' && status !== 'sent' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Enter the email you signed up with and we'll send you a magic link to log back in instantly.
              </p>
              <div className="form-row">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
              </div>
              {error && <div className="alert alert-warn">{error}</div>}
              <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: 11, fontSize: 14 }}
                onClick={handleLogin} disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending link...' : 'Send Magic Link'}
              </button>
            </>
          )}

          {/* -- Sent confirmation -- */}
          {status === 'sent' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>\u{1F4EC}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.06em', marginBottom: 8 }}>Check your inbox</div>
              <p style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.7, marginBottom: 20 }}>
                We sent a magic link to <strong style={{ color: 'var(--c-text)' }}>{email}</strong>.
                Click it to {mode === 'new' ? 'join the pool' : 'log back in'} - no password needed.
              </p>
              <p style={{ fontSize: 12, color: 'var(--c-hint)' }}>
                Didn't get it? Check spam, or{' '}
                <button onClick={() => setStatus('idle')} style={{ color: 'var(--c-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  try again
                </button>.
              </p>
            </div>
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
  )
}
