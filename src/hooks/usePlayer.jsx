import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PlayerCtx = createContext(null)

export function PlayerProvider({ children }) {
  const [player,   setPlayer]   = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [isAdmin,  setIsAdmin]  = useState(() => localStorage.getItem('wc26_admin') === '1')
  const [loading,  setLoading]  = useState(true)
  // Active room for master admin — which room they're currently managing
  const [adminRoom, setAdminRoom] = useState(() => localStorage.getItem('wc26_admin_room') || 'DEFAULT')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setAuthUser(session.user); loadPlayer(session.user.id) }
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setAuthUser(session.user); loadPlayer(session.user.id) }
      else { setAuthUser(null); setPlayer(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadPlayer(authId) {
    // User may be in multiple rooms — load all their player rows
    const { data: rows } = await supabase.from('players').select('*').eq('auth_id', authId)
    if (!rows?.length) { setPlayer(null); setLoading(false); return }

    // If only one room, use that. If multiple, prefer the one stored in localStorage
    // (set when they first joined a room via invite link)
    const stored = localStorage.getItem('wc26_player_room')
    const match  = stored ? rows.find(r => r.room_code === stored) : null
    setPlayer(match || rows[0])
    setLoading(false)
  }

  function switchPlayerRoom(roomCode) {
    // Let a player who is in multiple rooms switch which one they're viewing
    localStorage.setItem('wc26_player_room', roomCode)
    loadPlayer(authUser?.id)
  }

  async function createPlayer(name, roomCode) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: room } = await supabase.from('rooms').select('code').eq('code', roomCode).single()
    if (!room) throw new Error('Invalid room')

    // Check if user is already in this specific room
    const { data: alreadyIn } = await supabase.from('players').select('*')
      .eq('auth_id', user.id).eq('room_code', roomCode).single()
    if (alreadyIn) { setPlayer(alreadyIn); return alreadyIn } // Already joined this room

    // Check name uniqueness within this room
    const { data: nameTaken } = await supabase.from('players').select('id')
      .eq('room_code', roomCode).ilike('name', name.trim())
    if (nameTaken?.length > 0) throw new Error('NAME_TAKEN')

    const { data, error } = await supabase.from('players')
      .insert({ name: name.trim(), room_code: roomCode, auth_id: user.id, email: user.email })
      .select().single()
    if (error) throw error
    localStorage.setItem('wc26_player_room', roomCode)
    setPlayer(data)
    return data
  }

  async function sendSignupLink(email, name, roomCode, inviteToken) {
    const { data: room } = await supabase.from('rooms').select('code').eq('invite_token', inviteToken).single()
    if (!room) throw new Error('INVALID_CODE')
    // No pre-check needed here — player row is created in AuthCallback after magic link
    // The composite unique index (auth_id, room_code) handles duplicates at DB level
    localStorage.setItem('wc26_player_room', room.code)
    const redirectTo = `${window.location.origin}/auth/callback?name=${encodeURIComponent(name.trim())}&room=${room.code}`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, data: { name: name.trim(), room_code: room.code } }
    })
    if (error) throw error
    return room.code
  }

  async function sendLoginLink(email) {
    // Check email exists in any room (player could be in any room)
    const { data: existing } = await supabase.from('players').select('id').eq('email', email.trim().toLowerCase())
    if (!existing?.length) throw new Error('EMAIL_NOT_FOUND')
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
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

  function switchAdminRoom(code) {
    setAdminRoom(code)
    localStorage.setItem('wc26_admin_room', code)
  }

  async function logout() {
    await supabase.auth.signOut()
    localStorage.removeItem('wc26_admin')
    setIsAdmin(false); setPlayer(null); setAuthUser(null)
  }

  return (
    <PlayerCtx.Provider value={{
      player, authUser, isAdmin, loading,
      adminRoom, switchAdminRoom,
      isRoomAdmin: player?.is_room_admin === true,
      createPlayer, sendSignupLink, sendLoginLink,
      loginAdmin, logout, loadPlayer, switchPlayerRoom
    }}>
      {children}
    </PlayerCtx.Provider>
  )
}

export const usePlayer = () => useContext(PlayerCtx)
