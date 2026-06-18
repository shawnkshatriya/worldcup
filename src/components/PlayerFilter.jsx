import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function PlayerFilter({ players, selected, onChange }) {
  const [open, setOpen] = useState(false)
  if (!players || players.length <= 2) return null

  const allSelected = selected.length === 0 || selected.length === players.length

  // Distinct sites and teams from player assignments
  const sites = [...new Set(players.map(function(p){ return p.site }).filter(Boolean))].sort()
  const teams = [...new Set(players.map(function(p){ return p.team }).filter(Boolean))].sort()

  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter(function(s){ return s !== id }))
    } else {
      onChange(selected.concat(id))
    }
  }

  function selectAll() { onChange([]) }

  function selectBySite(site) {
    onChange(players.filter(function(p){ return p.site === site }).map(function(p){ return p.id }))
  }
  function selectByTeam(team) {
    onChange(players.filter(function(p){ return p.team === team }).map(function(p){ return p.id }))
  }

  const modal = open ? createPortal(
    <>
      <div onClick={function(){ setOpen(false) }} style={{position:'fixed',inset:0,zIndex:9998,background:'rgba(0,0,0,0.5)'}} />
      <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:12,boxShadow:'0 12px 40px rgba(0,0,0,0.45)',zIndex:9999,width:'min(320px, 90vw)',maxHeight:'70vh',overflowY:'auto',padding:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:14,fontWeight:700,color:'var(--c-text)'}}>Filter players</span>
          <button onClick={function(){ setOpen(false) }} style={{background:'none',border:'none',color:'var(--c-muted)',fontSize:22,cursor:'pointer',lineHeight:1,padding:0}}>×</button>
        </div>

        {(sites.length > 0 || teams.length > 0) && (
          <div style={{marginBottom:10}}>
            {sites.length > 0 && (
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--c-hint)',marginBottom:4,fontWeight:700}}>By site</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {sites.map(function(s){
                    return <button key={s} onClick={function(){ selectBySite(s) }} style={{fontSize:12,padding:'4px 10px',borderRadius:14,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-accent)',cursor:'pointer',fontWeight:600}}>{s}</button>
                  })}
                </div>
              </div>
            )}
            {teams.length > 0 && (
              <div>
                <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--c-hint)',marginBottom:4,fontWeight:700}}>By team</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {teams.map(function(t){
                    return <button key={t} onClick={function(){ selectByTeam(t) }} style={{fontSize:12,padding:'4px 10px',borderRadius:14,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-accent2)',cursor:'pointer',fontWeight:600}}>{t}</button>
                  })}
                </div>
              </div>
            )}
            <div style={{height:1,background:'var(--c-border)',margin:'10px 0'}}/>
          </div>
        )}

        <button
          onClick={selectAll}
          style={{display:'block',width:'100%',textAlign:'left',padding:'10px 12px',fontSize:13,fontWeight:600,background:allSelected?'var(--c-accent)':'var(--c-surface2)',color:allSelected?'#fff':'var(--c-text)',border:'none',borderRadius:6,cursor:'pointer',marginBottom:4}}
        >
          All players
        </button>
        {players.map(function(p) {
          var isSel = selected.includes(p.id)
          return (
            <button
              key={p.id}
              onClick={function(){ toggle(p.id) }}
              style={{display:'flex',alignItems:'center',gap:10,width:'100%',textAlign:'left',padding:'10px 12px',fontSize:13,background:isSel?'var(--c-surface2)':'transparent',color:'var(--c-text)',border:'none',borderRadius:6,cursor:'pointer',marginBottom:2}}
            >
              <span style={{width:18,height:18,borderRadius:4,border:'1px solid var(--c-border)',background:isSel?'var(--c-accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#fff',flexShrink:0}}>
                {isSel ? '✓' : ''}
              </span>
              <span style={{flex:1}}>{p.name}</span>
              {(p.site || p.team) && <span style={{fontSize:10,color:'var(--c-hint)'}}>{[p.site,p.team].filter(Boolean).join(' · ')}</span>}
            </button>
          )
        })}
      </div>
    </>,
    document.body
  ) : null

  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <button
        onClick={function(){ setOpen(!open) }}
        style={{fontSize:12,padding:'6px 12px',borderRadius:16,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-text)',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}
      >
        {allSelected ? 'All players' : selected.length + ' selected'}
        <span style={{fontSize:9}}>▼</span>
      </button>
      {modal}
    </div>
  )
}
