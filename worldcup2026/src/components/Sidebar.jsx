import { NavLink } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer'

const icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  predictions: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  leaderboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  scores: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  admin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 19.07a10 10 0 010-14.14"/></svg>,
}

export default function Sidebar() {
  const { player, isAdmin, logout } = usePlayer()
  const initials = player?.name?.slice(0,2).toUpperCase() || '?'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        WC26<span> predictor</span>
      </div>

      <NavLink to="/" end className={({isActive})=>'nav-link'+(isActive?' active':'')}>
        {icons.dashboard} Dashboard
      </NavLink>
      <NavLink to="/predictions" className={({isActive})=>'nav-link'+(isActive?' active':'')}>
        {icons.predictions} My predictions
      </NavLink>
      <NavLink to="/leaderboard" className={({isActive})=>'nav-link'+(isActive?' active':'')}>
        {icons.leaderboard} Leaderboard
      </NavLink>
      <NavLink to="/scores" className={({isActive})=>'nav-link'+(isActive?' active':'')}>
        {icons.scores} Live scores
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={({isActive})=>'nav-link'+(isActive?' active':'')}>
          {icons.admin} Admin
        </NavLink>
      )}

      <div style={{marginTop:'auto', padding:'0 1.5rem'}}>
        {player ? (
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="avatar" style={{background:'rgba(201,245,66,0.12)',color:'var(--c-accent)'}}>{initials}</div>
            <div style={{flex:1,overflow:'hidden'}}>
              <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{player.name}</div>
              <button onClick={logout} style={{fontSize:12,color:'var(--c-muted)',cursor:'pointer'}}>Log out</button>
            </div>
          </div>
        ) : (
          <NavLink to="/join" className={({isActive})=>'nav-link'+(isActive?' active':'')}>
            Join pool
          </NavLink>
        )}
      </div>
    </aside>
  )
}
