import { useRef, useState } from 'react'

// Generates a shareable image of the player's standing using canvas.
export default function ShareCard({ player, rank, totalPlayers, points, exactCount, accuracy, leaderName, gapToLeader }) {
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef(null)

  async function generate() {
    setGenerating(true)
    var canvas = canvasRef.current || document.createElement('canvas')
    // Instagram story size
    canvas.width = 1080
    canvas.height = 1920
    var ctx = canvas.getContext('2d')

    // Background gradient
    var grad = ctx.createLinearGradient(0, 0, 0, 1920)
    grad.addColorStop(0, '#0A0E1A')
    grad.addColorStop(0.5, '#111A2E')
    grad.addColorStop(1, '#0A0E1A')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1080, 1920)

    // Accent bar top
    var bar = ctx.createLinearGradient(0, 0, 1080, 0)
    bar.addColorStop(0, '#C8102E')
    bar.addColorStop(1, '#003DA5')
    ctx.fillStyle = bar
    ctx.fillRect(0, 0, 1080, 16)

    // Title
    ctx.textAlign = 'center'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 64px Georgia, serif'
    ctx.fillText('WC 2026 PREDICTOR', 540, 220)
    ctx.fillStyle = '#F0A500'
    ctx.font = '32px Arial, sans-serif'
    ctx.fillText('MY STANDING', 540, 280)

    // Player name
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 80px Arial, sans-serif'
    ctx.fillText(player.name, 540, 520)

    // Rank - big
    ctx.fillStyle = '#C8102E'
    ctx.font = 'bold 320px Georgia, serif'
    ctx.fillText('#' + rank, 540, 920)

    ctx.fillStyle = '#8A93A6'
    ctx.font = '40px Arial, sans-serif'
    ctx.fillText('of ' + totalPlayers + ' players', 540, 1000)

    // Points
    ctx.fillStyle = '#F0A500'
    ctx.font = 'bold 140px Georgia, serif'
    ctx.fillText(points + ' pts', 540, 1200)

    // Stats row
    var statY = 1400
    function stat(x, label, val) {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 72px Arial, sans-serif'
      ctx.fillText(val, x, statY)
      ctx.fillStyle = '#8A93A6'
      ctx.font = '30px Arial, sans-serif'
      ctx.fillText(label, x, statY + 50)
    }
    stat(300, 'EXACT SCORES', String(exactCount))
    stat(780, 'ACCURACY', accuracy + '%')

    // Gap to leader or leader badge
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '38px Arial, sans-serif'
    if (rank === 1) {
      ctx.fillText('👑 LEADING THE POOL', 540, 1620)
    } else {
      ctx.fillText(gapToLeader + ' pts behind ' + leaderName, 540, 1620)
    }

    // Footer
    ctx.fillStyle = '#5A6478'
    ctx.font = '34px Arial, sans-serif'
    ctx.fillText('worldcup-hovj.vercel.app', 540, 1820)

    // Download
    canvas.toBlob(function(blob) {
      var url = URL.createObjectURL(blob)
      var a = document.createElement('a')
      a.href = url
      a.download = 'wc26-standing.png'
      a.click()
      URL.revokeObjectURL(url)
      setGenerating(false)
    }, 'image/png')
  }

  return (
    <>
      <button className="btn btn-accent" onClick={generate} disabled={generating} style={{width:'100%',justifyContent:'center'}}>
        {generating ? 'Generating...' : '📸 Share my standing'}
      </button>
      <canvas ref={canvasRef} style={{display:'none'}} />
    </>
  )
}
