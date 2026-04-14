import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../hooks/usePlayer'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { createPlayer, loadPlayer } = usePlayer()
  const [status, setStatus] = useState('Logging you in...')
  const [error, setError] = useState('')

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    // Supabase magic link puts tokens in the URL hash - getSession picks them up
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      setError('The magic link has expired or already been used. Please request a new one.')
      return
    }

    const user = session.user
    const name = params.get('name')
    const room = params.get('room')

    // Check if this user already has a player row
    const { data: existing } = await supabase
      .from('players').select('*').eq('auth_id', user.id).single()

    if (existing) {
      // Returning player - already set up, go home
      setStatus('Welcome back! Redirecting...')
      setTimeout(() => navigate('/'), 800)
      return
    }

    // New player - create the row
    if (name && room) {
      setStatus(`Setting up your account as "${name}"...`)
      try {
        await createPlayer(name, room)
        setStatus('You\'re in! Redirecting...')
        setTimeout(() => navigate('/predictions'), 800)
      } catch (e) {
        if (e.message === 'NAME_TAKEN') {
          setError(`"${name}" is already taken. Go back and choose a different name.`)
        } else {
          setError('Failed to create your player profile. Please try again.')
        }
      }
    } else {
      // Returning login with no name/room params
      setStatus('Welcome back! Redirecting...')
      setTimeout(() => navigate('/'), 800)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '2rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: 'var(--c-accent)' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4"/>
          <path d="M6 9c0 3.314 2.686 6 6 6s6-2.686 6-6V5H6v4z"/>
          <path d="M12 15v4M8 21h8"/>
        </svg>
      </div>

      {!error && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.06em', color: 'var(--c-text)' }}>
            WC 2026
          </div>
          <p style={{ color: 'var(--c-muted)', fontSize: 14 }}>{status}</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--c-accent)',
                animation: `pulseDot 1.2s ease-in-out ${i * 0.2}s infinite`
              }} />
            ))}
          </div>
        </>
      )}

      {error && (
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>!</div>
          <div className="alert alert-warn" style={{ textAlign: 'left' }}>{error}</div>
          <button className="btn btn-accent" style={{ marginTop: 12 }} onClick={() => navigate('/join')}>
            Back to join page
          </button>
        </div>
      )}
    </div>
  )
}
