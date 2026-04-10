import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PlayerCtx = createContext(null)

export function PlayerProvider({ children }) {
  const [player, setPlayer] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wc26_player')) } catch { return null }
  })
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('wc26_admin') === '1')

  const join = async (name, roomCode) => {
    const { data, error } = await supabase
      .from('players')
      .insert({ name, room_code: roomCode })
      .select()
      .single()
    if (error) throw error
    localStorage.setItem('wc26_player', JSON.stringify(data))
    setPlayer(data)
    return data
  }

  const loginAdmin = (secret) => {
    if (secret === import.meta.env.VITE_ADMIN_SECRET) {
      localStorage.setItem('wc26_admin', '1')
      setIsAdmin(true)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('wc26_player')
    localStorage.removeItem('wc26_admin')
    setPlayer(null)
    setIsAdmin(false)
  }

  return (
    <PlayerCtx.Provider value={{ player, isAdmin, join, loginAdmin, logout }}>
      {children}
    </PlayerCtx.Provider>
  )
}

export const usePlayer = () => useContext(PlayerCtx)
