// Room management utilities
import { supabase } from './supabase'

export async function getAllRooms() {
  const { data } = await supabase
    .from('rooms')
    .select('*, scoring_weights(*), players(count)')
    .order('created_at')
  return data || []
}

export async function createRoom(name) {
  // Generate a clean code from the name
  const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) + '_' + Date.now().toString(36).toUpperCase()
  const token = Math.random().toString(36).slice(2, 14)

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({ code, name, invite_token: token, max_players: 250 })
    .select().single()

  if (error) throw error

  // Create default scoring weights for this room
  await supabase.from('scoring_weights').insert({ room_code: code })

  return room
}

export async function deleteRoom(code) {
  if (code === 'DEFAULT') throw new Error('Cannot delete the default room')
  // Cascade handles players, predictions, scores
  const { error } = await supabase.from('rooms').delete().eq('code', code)
  if (error) throw error
}

export async function updateRoom(code, updates) {
  const { error } = await supabase.from('rooms').update(updates).eq('code', code)
  if (error) throw error
}

export async function regenToken(code) {
  const token = Math.random().toString(36).slice(2, 14)
  await supabase.from('rooms').update({ invite_token: token }).eq('code', code)
  return token
}

export async function getRoomByToken(token) {
  const { data } = await supabase
    .from('rooms').select('*').eq('invite_token', token.trim()).single()
  return data
}

export async function getRoomWeights(roomCode) {
  const { data } = await supabase
    .from('scoring_weights').select('*').eq('room_code', roomCode).single()
  return data
}

export async function saveRoomWeights(roomCode, weights) {
  await supabase.from('scoring_weights')
    .upsert({ room_code: roomCode, ...weights, updated_at: new Date().toISOString() }, { onConflict: 'room_code' })
}
