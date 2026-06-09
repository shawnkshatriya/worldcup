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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      setError('The magic link has expired or already been used. Please request a new one.')
      return
    }

    const user = session.user
    const name = params.get('name')
    const room = params.get('room')

    if (name && room) {
      // ── New player signup flow ──
      // Check if this auth_id already has a row in THIS specific room
      const { data: existingInRoom } = await supabase
        .from('players').select('*')
        .eq('auth_id', user.id)
        .eq('room_code', room)
        .single()

      if (existingInRoom) {
        // Already in this room — pin to it and go home
        localStorage.setItem('wc26_player_room', room)
        setStatus('Welcome back! Redirecting...')
        await loadPlayer(user.id)
        setTimeout(() => navigate('/'), 800)
        return
      }

      // Create new player row for this room
      setStatus(`Setting up your account as "${name}"...`)
      try {
        await createPlayer(name, room)
        setStatus("You're in! Redirecting...")
        setTimeout(() => navigate('/predictions'), 800)
      } catch (e) {
        if (e.message === 'NAME_TAKEN') {
          setError(`"${name}" is already taken in this pool. Go back and choose a different name.`)
        } else {
          setError('Failed to create your player profile. Please try again.')
        }
      }

    } else {
      // ── Returning login flow (no name/room params) ──
      // Check which room the stored localStorage preference says, and verify
      // the user actually has a player row there. If they're in multiple rooms,
      // pick the stored preference; otherwise pick whichever row exists.
      const { data: allRows } = await supabase
        .from('players').select('*').eq('auth_id', user.id)

      if (!allRows?.length) {
        setError('No account found for this email. Please join using an invite link.')
        return
      }

      const stored = localStorage.getItem('wc26_player_room')
      const match = stored ? allRows.find(r => r.room_code === stored) : null
      const target = match || allRows[0]

      // Pin localStorage to the resolved room so usePlayer picks the right one
      localStorage.setItem('wc26_player_room', target.room_code)

      setStatus('Welcome back! Redirecting...')
      await loadPlayer(user.id)
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
