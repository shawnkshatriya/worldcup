// Server-side cron: fetches scores from football-data, updates DB, recalcs.
// Runs automatically via Vercel cron - no browser needed.
import { createClient } from '@supabase/supabase-js'

const TEAM_NAME_MAP = {
  'Korea Republic':'South Korea','Republic of Korea':'South Korea','Korea DPR':'North Korea',
  'Türkiye':'Turkey','Turkiye':'Turkey','Curaçao':'Curacao',"Côte d'Ivoire":'Ivory Coast',
  'Czech Republic':'Czechia','Cabo Verde':'Cape Verde','Cape Verde Islands':'Cape Verde','Congo DR':'DR Congo',
  'Democratic Republic of the Congo':'DR Congo','IR Iran':'Iran','USA':'United States',
  'United States of America':'United States','Bosnia-Herzegovina':'Bosnia and Herzegovina',
}
function norm(s){return (s||'').toLowerCase().replace(/[^a-z]/g,'')}
function mapTeam(name){
  if(TEAM_NAME_MAP[name])return TEAM_NAME_MAP[name]
  var n=norm(name)
  for(var k in TEAM_NAME_MAP){if(norm(k)===n)return TEAM_NAME_MAP[k]}
  return name
}

export default async function handler(req, res) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY || process.env.VITE_FOOTBALL_API_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return res.status(400).json({ ok:false, error:'Missing env vars (need FOOTBALL_DATA_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const apiRes = await fetch('https://api.football-data.org/v4/competitions/2000/matches', {
      headers: { 'X-Auth-Token': apiKey }, cache: 'no-store'
    })
    if (!apiRes.ok) return res.status(502).json({ ok:false, error:'API '+apiRes.status })
    const data = await apiRes.json()
    const apiMatches = data.matches || []

    const { data: dbMatches } = await supabase.from('matches').select('id, home_team, away_team')
    let updated = 0

    for (const m of apiMatches) {
      let score = null
      if (m.score) {
        if (m.score.fullTime && m.score.fullTime.home != null) score = m.score.fullTime
        else if (m.score.regularTime && m.score.regularTime.home != null) score = m.score.regularTime
      }
      if (!score || score.home == null) continue

      const homeTeam = mapTeam(m.homeTeam.name || m.homeTeam.shortName)
      const awayTeam = mapTeam(m.awayTeam.name || m.awayTeam.shortName)
      const dbMatch = (dbMatches||[]).find(dm => norm(dm.home_team)===norm(homeTeam) && norm(dm.away_team)===norm(awayTeam))
      if (!dbMatch) continue

      const { data: upd } = await supabase.from('matches').update({
        home_goals: score.home, away_goals: score.away,
        home_goals_et: m.score.extraTime ? m.score.extraTime.home : null,
        away_goals_et: m.score.extraTime ? m.score.extraTime.away : null,
        home_goals_pen: m.score.penalties ? m.score.penalties.home : null,
        away_goals_pen: m.score.penalties ? m.score.penalties.away : null,
        status: m.status || 'SCHEDULED', updated_at: new Date().toISOString(),
      }).eq('id', dbMatch.id).select()
      if (upd && upd.length) updated++
    }

    return res.status(200).json({ ok:true, updated, total:apiMatches.length })
  } catch (err) {
    return res.status(500).json({ ok:false, error:String(err) })
  }
}
