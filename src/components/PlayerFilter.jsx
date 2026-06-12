import { useState } from 'react'

export default function PlayerFilter({ players, selected, onChange }) {
  const [open, setOpen] = useState(false)
  if (!players || players.length <= 2) return null

  const allSelected = selected.length === 0 || selected.length === players.length

  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter(function(s){ return s !== id }))
    } else {
      onChange(selected.concat(id))
    }
  }

  function selectAll() { onChange([]) }

  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <button
        onClick={function(){ setOpen(!open) }}
        style={{fontSize:12,padding:'6px 12px',borderRadius:16,border:'1px solid var(--c-border)',background:'var(--c-surface2)',color:'var(--c-text)',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}
      >
        {allSelected ? 'All players' : selected.length + ' selected'}
        <span style={{fontSize:9}}>▼</span>
      </button>
      {open && (
        <>
          <div onClick={function(){ setOpen(false) }} style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.3)'}} />
          <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:12,boxShadow:'0 12px 40px rgba(0,0,0,0.35)',zIndex:201,width:'min(320px, 90vw)',maxHeight:'70vh',overflowY:'auto',padding:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:700}}>Filter players</span>
              <button onClick={function(){ setOpen(false) }} style={{background:'none',border:'none',color:'var(--c-muted)',fontSize:18,cursor:'pointer',lineHeight:1}}>×</button>
            </div>
            <button
              onClick={selectAll}
              style={{display:'block',width:'100%',textAlign:'left',padding:'10px 12px',fontSize:13,fontWeight:600,background:allSelected?'var(--c-accent)':'transparent',color:allSelected?'#fff':'var(--c-text)',border:'none',borderRadius:6,cursor:'pointer',marginBottom:2}}
            >
              All players
            </button>
            {players.map(function(p) {
              var isSel = selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={function(){ toggle(p.id) }}
                  style={{display:'flex',alignItems:'center',gap:10,width:'100%',textAlign:'left',padding:'10px 12px',fontSize:13,background:'transparent',color:'var(--c-text)',border:'none',borderRadius:6,cursor:'pointer'}}
                >
                  <span style={{width:18,height:18,borderRadius:4,border:'1px solid var(--c-border)',background:isSel?'var(--c-accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#fff',flexShrink:0}}>
                    {isSel ? '✓' : ''}
                  </span>
                  {p.name}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
