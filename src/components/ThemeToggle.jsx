import { useState, useEffect } from 'react'
import { THEMES, applyTheme, getStoredTheme } from '../lib/theme'

export default function ThemeToggle() {
  const [current, setCurrent] = useState(getStoredTheme)

  useEffect(() => { applyTheme(current) }, [current])

  function cycle() {
    const keys = Object.keys(THEMES)
    const next = keys[(keys.indexOf(current) + 1) % keys.length]
    setCurrent(next)
    applyTheme(next)
  }

  const theme = THEMES[current]

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme.label} — click to switch`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px',
        background: 'var(--c-surface2)',
        border: '1px solid var(--c-border2)',
        borderRadius: 20,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--c-muted)',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14 }}>{theme.icon}</span>
      <span>{theme.label}</span>
    </button>
  )
}
