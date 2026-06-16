import { useEffect, useRef, useState } from 'react'

// Animates a number from its previous value to the new one.
export default function CountUp({ value, duration, style, className }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef(null)

  useEffect(() => {
    var from = prevRef.current
    var to = value
    if (from === to) { setDisplay(to); return }
    var dur = duration || 800
    var start = null

    function step(ts) {
      if (start == null) start = ts
      var progress = Math.min((ts - start) / dur, 1)
      // ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3)
      var current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        prevRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return <span className={className} style={style}>{display}</span>
}
