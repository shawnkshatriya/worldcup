import { useRef, useState } from 'react'

// Generates a shareable image of the player's knockout bracket predictions.
export default function BracketShareCard({ player, picks, matchesByPhase, predictedTeams }) {
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef(null)

  async function generate() {
    setGenerating(true)
    try {
      var canvas = canvasRef.current || document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1920
      var ctx = canvas.getContext('2d')

      // Background
      var grad = ctx.createLinearGradient(0, 0, 0, 1920)
      grad.addColorStop(0, '#0A0E1A')
      grad.addColorStop(0.5, '#111A2E')
      grad.addColorStop(1, '#0A0E1A')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1080, 1920)

      // Top accent bar
      var bar = ctx.createLinearGradient(0, 0, 1080, 0)
      bar.addColorStop(0, '#C8102E')
      bar.addColorStop(1, '#003DA5')
      ctx.fillStyle = bar
      ctx.fillRect(0, 0, 1080, 16)

      // Title
      ctx.textAlign = 'center'
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 60px Georgia, serif'
      ctx.fillText('MY WORLD CUP BRACKET', 540, 130)
      ctx.fillStyle = '#F0A500'
      ctx.font = '34px Arial, sans-serif'
      ctx.fillText(player.name, 540, 185)

      // Helper to get pick for a match by phase index
      function pickFor(phase, idx) {
        var ms = (matchesByPhase[phase] || [])
        var m = ms[idx]
        if (!m) return null
        return picks[m.id] || null
      }

      // CHAMPION (the final pick) - the hero
      var finalMatches = matchesByPhase['FINAL'] || []
      var champion = finalMatches.length > 0 ? picks[finalMatches[0].id] : null

      ctx.fillStyle = '#F0A500'
      ctx.font = '38px Arial, sans-serif'
      ctx.fillText('🏆 MY CHAMPION', 540, 330)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 90px Georgia, serif'
      ctx.fillText(champion || '—', 540, 440)

      // Finalists (the two SF picks)
      var sfMatches = matchesByPhase['SEMI_FINALS'] || []
      ctx.fillStyle = '#8A93A6'
      ctx.font = '32px Arial, sans-serif'
      ctx.fillText('FINALISTS', 540, 560)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 52px Arial, sans-serif'
      var finalSlot = finalMatches[0] ? predictedTeams[finalMatches[0].id] : null
      var f1 = finalSlot ? finalSlot.predHome : null
      var f2 = finalSlot ? finalSlot.predAway : null
      ctx.fillText((f1 || '—') + '  vs  ' + (f2 || '—'), 540, 630)

      // Quarterfinalists (4 QF picks)
      var qfMatches = matchesByPhase['QUARTER_FINALS'] || []
      ctx.fillStyle = '#8A93A6'
      ctx.font = '32px Arial, sans-serif'
      ctx.fillText('FINAL FOUR', 540, 760)
      var sfTeams = []
      sfMatches.forEach(function(m){
        var slot = predictedTeams[m.id]
        if (slot) { if (slot.predHome) sfTeams.push(slot.predHome); if (slot.predAway) sfTeams.push(slot.predAway) }
      })
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 44px Arial, sans-serif'
      var y = 830
      for (var i = 0; i < Math.min(sfTeams.length, 4); i++) {
        ctx.fillText(sfTeams[i], 540, y)
        y += 64
      }
      if (sfTeams.length === 0) {
        ctx.fillStyle = '#5A6478'
        ctx.font = '36px Arial, sans-serif'
        ctx.fillText('Fill out your bracket to share', 540, 850)
      }

      // Elite 8 list (QF teams)
      var elite = []
      qfMatches.forEach(function(m){
        var slot = predictedTeams[m.id]
        if (slot) { if (slot.predHome) elite.push(slot.predHome); if (slot.predAway) elite.push(slot.predAway) }
      })
      if (elite.length > 0) {
        ctx.fillStyle = '#8A93A6'
        ctx.font = '32px Arial, sans-serif'
        ctx.fillText('ELITE EIGHT', 540, 1180)
        ctx.fillStyle = '#C9D1E0'
        ctx.font = '36px Arial, sans-serif'
        var ey = 1250
        // Two columns
        for (var j = 0; j < Math.min(elite.length, 8); j++) {
          var col = j % 2
          var row = Math.floor(j / 2)
          var x = col === 0 ? 320 : 760
          ctx.fillText(elite[j], x, 1250 + row * 60)
        }
      }

      // Footer
      ctx.fillStyle = '#F0A500'
      ctx.font = 'bold 40px Georgia, serif'
      ctx.fillText('WC 2026 PREDICTOR', 540, 1780)
      ctx.fillStyle = '#5A6478'
      ctx.font = '32px Arial, sans-serif'
      ctx.fillText('worldcup-hovj.vercel.app', 540, 1835)

      // Share or download
      canvas.toBlob(async function(blob) {
        var file = new File([blob], 'my-wc26-bracket.png', { type: 'image/png' })
        // Try native share (mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My World Cup 2026 Bracket',
              text: 'Check out my World Cup 2026 bracket predictions! 🏆',
            })
            setGenerating(false)
            return
          } catch (e) { /* user cancelled or share failed - fall through to download */ }
        }
        // Fallback: download
        var url = URL.createObjectURL(blob)
        var a = document.createElement('a')
        a.href = url
        a.download = 'my-wc26-bracket.png'
        a.click()
        URL.revokeObjectURL(url)
        setGenerating(false)
      }, 'image/png')
    } catch (e) {
      setGenerating(false)
    }
  }

  return (
    <>
      <button className="btn btn-accent" onClick={generate} disabled={generating} style={{width:'100%',justifyContent:'center'}}>
        {generating ? 'Generating...' : '📸 Share my bracket'}
      </button>
      <canvas ref={canvasRef} style={{display:'none'}} />
    </>
  )
}
