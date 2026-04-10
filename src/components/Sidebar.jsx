import { NavLink } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer'

const NAV = [
  { to:'/', end:true, label:'Dashboard',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
  { to:'/predictions', label:'My Predictions',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { to:'/leaderboard', label:'Leaderboard',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M8 21H5a2 2 0 01-2-2v-5a2 2 0 012-2h3m8 8h3a2 2 0 002-2v-9a2 2 0 00-2-2h-3m-6 0V5a2 2 0 012-2h2a2 2 0 012 2v4m-6 12V9h6v12"/></svg> },
  { to:'/scores', label:'Live Scores',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
  { to:'/stats', label:'Stats',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
]

export default function Sidebar() {
  const { player, authUser, isAdmin, loading, logout } = usePlayer()
  const initials = player?.name?.slice(0,2).toUpperCase() || authUser?.email?.slice(0,2).toUpperCase() || '?'

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-trophy">
          <div className="trophy-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4"/>
              <path d="M6 9c0 3.314 2.686 6 6 6s6-2.686 6-6V5H6v4z"/>
              <path d="M12 15v4M8 21h8"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-title">WC 2026</div>
            <div className="sidebar-subtitle">Predictor Pool</div>
          </div>
        </div>
      </div>

      <div className="sidebar-section-label">Menu</div>

      {NAV.map(({ to, end, label, icon }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          {icon}{label}
        </NavLink>
      ))}

      {isAdmin && (
        <>
          <div className="sidebar-section-label" style={{ marginTop: 8 }}>Admin</div>
          <NavLink to="/admin" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ width:15,height:15,flexShrink:0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin Panel
          </NavLink>
        </>
      )}

      <div className="sidebar-footer">
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--c-hint)' }}>Loading...</div>
        ) : authUser ? (
          <div className="user-pill">
            <div className="avatar" style={{ background:'rgba(200,16,46,0.2)', color:'var(--c-accent)', fontSize:11, fontWeight:700 }}>
              {initials}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {player?.name || 'Setting up...'}
              </div>
              <div style={{ fontSize:11, color:'var(--c-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {authUser.email}
              </div>
              <button onClick={logout} style={{ fontSize:11, color:'var(--c-muted)', padding:0, background:'none', border:'none', cursor:'pointer', marginTop:1 }}>
                Log out
              </button>
            </div>
          </div>
        ) : (
          <NavLink to="/join" style={{ display:'block' }}>
            <div className="btn btn-accent" style={{ width:'100%', justifyContent:'center', fontSize:12 }}>
              Join Pool
            </div>
          </NavLink>
        )}
      </div>
    </aside>
  )
}
