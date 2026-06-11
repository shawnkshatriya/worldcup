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
          <div onClick={function(){ setOpen(false) }} style={{position:'fixed',inset:0,zIndex:40}} />
          <div style={{position:'absolute',top:'100%',right:0,marginTop:4,background:'var(--c-surface)',border:'1px solid var(--c-border)',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.2)',zIndex:41,minWidth:200,maxHeight:300,overflowY:'auto',padding:6}}>
            <button
              onClick={selectAll}
              style={{display:'block',width:'100%',textAlign:'left',padding:'8px 10px',fontSize:12,fontWeight:600,background:allSelected?'var(--c-accent)':'transparent',color:allSelected?'#fff':'var(--c-text)',border:'none',borderRadius:4,cursor:'pointer',marginBottom:2}}
            >
              All players
            </button>
            {players.map(function(p) {
              var isSel = selected.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={function(){ toggle(p.id) }}
                  style={{display:'flex',alignItems:'center',gap:8,width:'100%',textAlign:'left',padding:'8px 10px',fontSize:12,background:'transparent',color:'var(--c-text)',border:'none',borderRadius:4,cursor:'pointer'}}
                >
                  <span style={{width:16,height:16,borderRadius:4,border:'1px solid var(--c-border)',background:isSel?'var(--c-accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#fff',flexShrink:0}}>
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
