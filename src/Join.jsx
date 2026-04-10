import { useState, useEffect } from 'react'
import { usePlayer } from '../hooks/usePlayer'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Join() {
  const { player, join, loginAdmin } = usePlayer()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState('new')
  const [name, setName] = useState('')
  const [code, setCode] = useState(params.get('code') || '')
  const [adminSecret, setAdminSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (player) navigate('/') }, [player])

  function clearError() { setError('') }

  async function handleJoin() {
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!code.trim()) { setError('Please enter your invite code.'); return }
    setLoading(true); setError('')
    try {
      const { data: room } = await supabase.from('rooms').select('code').eq('invite_token', code.trim()).single()
      if (!room) { setError('Invalid invite code. Check with your admin.'); setLoading(false); return }
      const { data: existing } = await supabase.from('players').select('id').eq('room_code', room.code).ilike('name', name.trim())
      if (existing && existing.length > 0) {
        setError(`"${name.trim()}" is already taken. Try a different name, or use "Log back in".`)
        setLoading(false); return
      }
      await join(name.trim(), room.code)
      navigate('/')
    } catch { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  async function handleReturning() {
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!code.trim()) { setError('Please enter your invite code.'); return }
    setLoading(true); setError('')
    try {
      const { data: room } = await supabase.from('rooms').select('code').eq('invite_token', code.trim()).single()
      if (!room) { setError('Invalid invite code.'); setLoading(false); return }
      const { data: found } = await supabase.from('players').select('*').eq('room_code', room.code).ilike('name', name.trim())
      if (!found || found.length === 0) { setError(`No player named "${name.trim()}" found. Check spelling or join as new.`); setLoading(false); return }
      if (found.length > 1) { setError(`Multiple accounts found. Ask your admin to remove the duplicate.`); setLoading(false); return }
      localStorage.setItem('wc26_player', JSON.stringify(found[0]))
      window.location.href = '/'
    } catch { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  function handleAdminLogin() {
    const ok = loginAdmin(adminSecret)
    if (ok) navigate('/admin')
    else setError('Wrong admin password.')
  }

  const TABS = [
    { id: 'new',       label: 'New Player' },
    { id: 'returning', label: 'Log Back In' },
    { id: 'admin',     label: 'Admin' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

      {/* Brand header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 60, height: 60, borderRadius: 14,
          background: 'var(--c-accent)', marginBottom: 16,
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4"/>
            <path d="M6 9c0 3.314 2.686 6 6 6s6-2.686 6-6V5H6v4z"/>
            <path d="M12 15v4M8 21h8"/>
          </svg>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, letterSpacing: '0.06em', lineHeight: 1, color: 'var(--c-text)' }}>
          WC 2026
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.1em', color: 'var(--c-muted)', marginTop: 2 }}>
          PREDICTOR POOL
        </div>
        <div style={{ height: 3, width: 60, margin: '12px auto 0', background: 'linear-gradient(90deg, var(--fifa-red), var(--fifa-blue))' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="card" style={{ padding: '1.75rem' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius)', padding: 3, marginBottom: '1.5rem' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setMode(t.id); clearError() }}
                style={{
                  flex: 1, padding: '7px 4px', border: 'none', borderRadius: 4,
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                  cursor: 'pointer', transition: 'all 0.12s',
                  background: mode === t.id ? 'var(--c-accent)' : 'transparent',
                  color: mode === t.id ? '#fff' : 'var(--c-muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* New player */}
          {mode === 'new' && (
            <>
              <div className="form-row">
                <label>Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" onKeyDown={e => e.key === 'Enter' && handleJoin()} />
              </div>
              <div className="form-row">
                <label>Invite code</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Paste the invite code" onKeyDown={e => e.key === 'Enter' && handleJoin()} />
                <div className="form-hint">Get this from whoever created the pool.</div>
              </div>
              {error && <div className="alert alert-warn">{error}</div>}
              <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }} onClick={handleJoin} disabled={loading}>
                {loading ? 'Joining...' : 'Join Pool'}
              </button>
            </>
          )}

          {/* Returning */}
          {mode === 'returning' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Used a different device or cleared your browser? Log back in with the exact name you joined with.
              </p>
              <div className="form-row">
                <label>Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Exact name you joined with" onKeyDown={e => e.key === 'Enter' && handleReturning()} />
              </div>
              <div className="form-row">
                <label>Invite code</label>
                <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Same code you used to join" onKeyDown={e => e.key === 'Enter' && handleReturning()} />
              </div>
              {error && <div className="alert alert-warn">{error}</div>}
              <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }} onClick={handleReturning} disabled={loading}>
                {loading ? 'Looking you up...' : 'Log Back In'}
              </button>
            </>
          )}

          {/* Admin */}
          {mode === 'admin' && (
            <>
              <div className="form-row">
                <label>Admin password</label>
                <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} placeholder="Enter admin password" onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
                <div className="form-hint">Set via VITE_ADMIN_SECRET in your Vercel environment variables.</div>
              </div>
              {error && <div className="alert alert-warn">{error}</div>}
              <button className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }} onClick={handleAdminLogin}>
                Login as Admin
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-hint)', marginTop: 16 }}>
          FIFA World Cup 2026 · Canada · Mexico · USA
        </p>
      </div>
    </div>
  )
}
