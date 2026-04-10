import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PlayerCtx = createContext(null)

export function PlayerProvider({ children }) {
  const [player, setPlayer]   = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [isAdmin, setIsAdmin]  = useState(() => localStorage.getItem('wc26_admin') === '1')
  const [loading, setLoading]  = useState(true)

  // On mount — restore session from Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user)
        loadPlayer(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes (magic link callback, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user)
        loadPlayer(session.user.id)
      } else {
        setAuthUser(null)
        setPlayer(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadPlayer(authId) {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('auth_id', authId)
      .single()
    setPlayer(data || null)
    setLoading(false)
  }

  // Called after magic link signup — create the player row
  async function createPlayer(name, roomCode) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check room exists
    const { data: room } = await supabase
      .from('rooms').select('code').eq('code', roomCode).single()
    if (!room) throw new Error('Invalid room')

    // Check name not taken
    const { data: existing } = await supabase
      .from('players').select('id').eq('room_code', roomCode).ilike('name', name.trim())
    if (existing && existing.length > 0) throw new Error('NAME_TAKEN')

    const { data, error } = await supabase
      .from('players')
      .insert({ name: name.trim(), room_code: roomCode, auth_id: user.id, email: user.email })
      .select()
      .single()
    if (error) throw error
    setPlayer(data)
    return data
  }

  // Send magic link for signup (new player — includes name + room in metadata)
  async function sendSignupLink(email, name, roomCode, inviteToken) {
    // Verify invite token first
    const { data: room } = await supabase
      .from('rooms').select('code').eq('invite_token', inviteToken).single()
    if (!room) throw new Error('INVALID_CODE')

    // Check name not taken
    const { data: existing } = await supabase
      .from('players').select('id').eq('room_code', room.code).ilike('name', name.trim())
    if (existing && existing.length > 0) throw new Error('NAME_TAKEN')

    const redirectTo = `${window.location.origin}/auth/callback?name=${encodeURIComponent(name.trim())}&room=${room.code}`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        data: { name: name.trim(), room_code: room.code }
      }
    })
    if (error) throw error
    return room.code
  }

  // Send magic link for returning login — verify email exists in pool first
  async function sendLoginLink(email) {
    // Check that a player with this email exists in the pool
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .eq('room_code', 'DEFAULT')

    if (!existing || existing.length === 0) {
      throw new Error('EMAIL_NOT_FOUND')
    }

    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    })
    if (error) throw error
  }

  function loginAdmin(secret) {
    if (secret === import.meta.env.VITE_ADMIN_SECRET) {
      localStorage.setItem('wc26_admin', '1')
      setIsAdmin(true)
      return true
    }
    return false
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('wc26_admin')
    setIsAdmin(false)
    setPlayer(null)
    setAuthUser(null)
  }

  return (
    <PlayerCtx.Provider value={{
      player, authUser, isAdmin, loading,
      createPlayer, sendSignupLink, sendLoginLink,
      loginAdmin, logout, loadPlayer
    }}>
      {children}
    </PlayerCtx.Provider>
  )
}

export const usePlayer = () => useContext(PlayerCtx)
