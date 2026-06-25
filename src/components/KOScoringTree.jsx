// Visual decision tree showing how a single knockout match is scored.
// Pure CSS/flex - no dependencies. Pulls live point values from weights (w).

export default function KOScoringTree({ w }) {
  var adv = { r32: w?w.ko_r32_adv:3, r16: w?w.ko_r16_adv:5, qf: w?w.ko_qf_adv:7, sf: w?w.ko_sf_adv:9, fin: w?w.ko_final_adv:15 }
  var exact = w?w.ko_score_exact:4
  var diff = w?w.ko_score_diff:2
  var resu = w?w.ko_score_result:1
  var penEx = w?(w.ko_pen_exact||7):7
  var consEx = w?(w.ko_consolation!=null?w.ko_consolation:2):2
  var consDiff = w?(w.ko_consolation_diff!=null?w.ko_consolation_diff:1):1
  var consPen = w?(w.ko_pen_consolation!=null?w.ko_pen_consolation:3):3

  return (
    <div style={{padding:'4px 0'}}>
      <div style={{fontSize:13,color:'var(--c-muted)',marginBottom:16,lineHeight:1.6}}>
        How a single knockout match scores. It starts with one question:
      </div>

      {/* Root question */}
      <Node tone="root">Did your picked team actually win this match?</Node>

      {/* Two branches */}
      <div style={{display:'flex',gap:12,marginTop:8,flexWrap:'wrap'}}>

        {/* YES branch */}
        <div style={{flex:1,minWidth:260}}>
          <Branch label="YES" tone="yes"/>
          <Node tone="yes">
            <b>Advancement points</b><br/>
            <span style={{fontSize:12,color:'var(--c-muted)'}}>R32 {adv.r32} · R16 {adv.r16} · QF {adv.qf} · SF {adv.sf} · Final {adv.fin}</span>
          </Node>
          <Connector/>
          <div style={{fontSize:11,fontWeight:700,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'6px 0'}}>+ your scoreline bonus</div>
          <Pill>Exact final score → +{exact}</Pill>
          <Pill>Correct goal difference → +{diff}</Pill>
          <Pill>Correct result only → +{resu}</Pill>
          <Pill tone="gold">Predicted a draw + nailed the penalty score → +{penEx} hidden</Pill>
        </div>

        {/* NO branch */}
        <div style={{flex:1,minWidth:260}}>
          <Branch label="NO" tone="no"/>
          <Node tone="no">
            <b>No advancement points</b><br/>
            <span style={{fontSize:12,color:'var(--c-muted)'}}>Your bracket busted for this match</span>
          </Node>
          <Connector/>
          <div style={{fontSize:11,fontWeight:700,color:'var(--c-muted)',textTransform:'uppercase',letterSpacing:'0.06em',margin:'6px 0'}}>but you can still score the actual match</div>
          <Pill>Exact final score → +{consEx} consolation</Pill>
          <Pill>Correct goal difference → +{consDiff} consolation</Pill>
          <Pill tone="gold">Went to pens + nailed the shootout score → +{consPen}</Pill>
          <div style={{fontSize:11,color:'var(--c-hint)',marginTop:8,lineHeight:1.5}}>
            Keep updating your score for the real matchup even after your pick is knocked out.
          </div>
        </div>
      </div>

      <div style={{fontSize:12,color:'var(--c-hint)',marginTop:16,lineHeight:1.6,padding:'10px 12px',background:'var(--c-surface2)',borderRadius:8}}>
        All scoreline judging uses the <b>final result, including extra time</b>. Penalties decide who advances but aren't part of the scoreline (a 1-1 that goes to pens is judged as 1-1).
      </div>
    </div>
  )
}

function Node({ children, tone }) {
  var border = tone === 'yes' ? '#22c55e' : tone === 'no' ? 'var(--c-border)' : 'var(--c-accent)'
  var bg = tone === 'yes' ? 'rgba(34,197,94,0.08)' : tone === 'root' ? 'var(--c-surface2)' : 'var(--c-surface)'
  return (
    <div style={{border:'1.5px solid '+border,background:bg,borderRadius:10,padding:'10px 14px',fontSize:13.5,lineHeight:1.5,color:'var(--c-text)'}}>
      {children}
    </div>
  )
}

function Branch({ label, tone }) {
  var color = tone === 'yes' ? '#22c55e' : '#ef4444'
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0 6px 8px'}}>
      <div style={{width:1,height:18,background:'var(--c-border)'}}/>
      <span style={{fontSize:11,fontWeight:800,color:color,letterSpacing:'0.08em'}}>{label}</span>
    </div>
  )
}

function Connector() {
  return <div style={{width:1,height:14,background:'var(--c-border)',margin:'4px 0 0 16px'}}/>
}

function Pill({ children, tone }) {
  var border = tone === 'gold' ? '#F0A500' : 'var(--c-border)'
  var color = tone === 'gold' ? '#F0A500' : 'var(--c-text)'
  return (
    <div style={{border:'1px solid '+border,borderRadius:7,padding:'7px 11px',fontSize:12.5,marginBottom:6,color:color,background:'var(--c-surface)'}}>
      {children}
    </div>
  )
}
