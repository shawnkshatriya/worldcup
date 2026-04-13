import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import { usePlayer } from '../hooks/usePlayer'

const NAV = [
  { to:'/', end:true, label:'Dashboard',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> },
  { to:'/predictions', label:'My Predictions',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { to:'/winner', label:'Winner pick',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg> },
  { to:'/leaderboard', label:'Leaderboard',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M8 21H5a2 2 0 01-2-2v-5a2 2 0 012-2h3m8 8h3a2 2 0 002-2v-9a2 2 0 00-2-2h-3m-6 0V5a2 2 0 012-2h2a2 2 0 012 2v4m-6 12V9h6v12"/></svg> },
  { to:'/scores', label:'Live Scores',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
  { to:'/stats', label:'Stats',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { to:'/fun', label:'Fun Zone',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 2a10 10 0 110 20A10 10 0 0112 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
  { to:'/install', label:'Install app',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg> },
  { to:'/support', label:'Support',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg> },
  { to:'/feedback', label:'Feedback',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { to:'/predictions/all', label:'All Predictions',
    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
]

const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{width:15,height:15,flexShrink:0}}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4"/>
    <path d="M6 9c0 3.314 2.686 6 6 6s6-2.686 6-6V5H6v4z"/>
    <path d="M12 15v4M8 21h8"/>
  </svg>
)

function SidebarContent({ onNavClick }) {
  const { player, authUser, isAdmin, loading, logout } = usePlayer()
  const initials = player?.name?.slice(0,2).toUpperCase() || authUser?.email?.slice(0,2).toUpperCase() || '?'

  return (
    <>
      <div className="sidebar-brand">
        <div className="sidebar-trophy">
          <div className="trophy-icon"><TrophyIcon /></div>
          <div>
            <div className="sidebar-title">WC 2026</div>
            <div className="sidebar-subtitle">Predictor Pool</div>
          </div>
        </div>
      </div>

      <div className="sidebar-section-label">Menu</div>

      {NAV.map(({ to, end, label, icon }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          onClick={onNavClick}>
          {icon}{label}
        </NavLink>
      ))}

      {isAdmin && (
        <>
          <div className="sidebar-section-label" style={{marginTop:8}}>Admin</div>
          <NavLink to="/admin"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            onClick={onNavClick}>
            <AdminIcon />Admin Panel
          </NavLink>
        </>
      )}

      <div style={{padding:'0 20px 12px',display:'flex',flexDirection:'column',gap:8}}>
        <ThemeToggle />
        {player?.room_code && player.room_code !== 'DEFAULT' && (
          <div style={{fontSize:11,color:'var(--c-muted)',padding:'4px 8px',background:'var(--c-surface2)',borderRadius:20,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {player.room_code}
          </div>
        )}
      </div>
      <div className="sidebar-footer">
        {loading ? (
          <div style={{fontSize:12,color:'var(--c-hint)'}}>Loading...</div>
        ) : authUser ? (
          <div className="user-pill">
            <div className="avatar" style={{background:'rgba(200,16,46,0.2)',color:'var(--c-accent)',fontSize:11,fontWeight:700}}>
              {initials}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {player?.name || 'Setting up...'}
              </div>
              <div style={{fontSize:11,color:'var(--c-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {authUser.email}
              </div>
              <button onClick={logout} style={{fontSize:11,color:'var(--c-muted)',padding:0,background:'none',border:'none',cursor:'pointer',marginTop:1}}>
                Log out
              </button>
            </div>
          </div>
        ) : (
          <NavLink to="/join" style={{display:'block'}} onClick={onNavClick}>
            <div className="btn btn-accent" style={{width:'100%',justifyContent:'center',fontSize:12}}>
              Join Pool
            </div>
          </NavLink>
        )}
      </div>
    </>
  )
}

export default function Sidebar() {
  const { player } = usePlayer()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar sidebar-desktop">
        <SidebarContent onNavClick={() => {}} />
      </aside>

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="trophy-icon" style={{width:30,height:30,borderRadius:6}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4"/>
              <path d="M6 9c0 3.314 2.686 6 6 6s6-2.686 6-6V5H6v4z"/>
              <path d="M12 15v4M8 21h8"/>
            </svg>
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:20,letterSpacing:'0.06em',color:'var(--c-text)'}}>WC 2026</div>
        </div>
        <button
          className="burger-btn"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="mobile-overlay" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`sidebar sidebar-mobile${open ? ' open' : ''}`}>
        <SidebarContent onNavClick={() => setOpen(false)} />
      </aside>
    </>
  )
}
