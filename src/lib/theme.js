export const THEMES = {
  dark: {
    label: 'Dark',
    icon: '🌙',
    vars: {
      '--c-bg':       '#080B12',
      '--c-surface':  '#0E1220',
      '--c-surface2': '#161B2E',
      '--c-surface3': '#1D2340',
      '--c-border':   'rgba(255,255,255,0.07)',
      '--c-border2':  'rgba(255,255,255,0.13)',
      '--c-text':     '#EEF0F8',
      '--c-muted':    '#6B7494',
      '--c-hint':     '#3F4664',
      '--c-accent':   '#C8102E',
      '--c-accent2':  '#F0A500',
      '--c-success':  '#22C55E',
      '--c-warn':     '#F59E0B',
      '--c-danger':   '#EF4444',
      '--c-info':     '#3B82F6',
      '--c-gold':     '#F0A500',
      '--c-silver':   '#94A3B8',
      '--c-bronze':   '#B45309',
      '--fifa-red':   '#C8102E',
      '--fifa-blue':  '#003DA5',
      '--fifa-gold':  '#F0A500',
    }
  },
  light: {
    label: 'Light',
    icon: '☀️',
    vars: {
      '--c-bg':       '#E8ECF4',
      '--c-surface':  '#F2F5FA',
      '--c-surface2': '#E2E7F0',
      '--c-surface3': '#D4DBE8',
      '--c-border':   'rgba(0,0,0,0.09)',
      '--c-border2':  'rgba(0,0,0,0.15)',
      '--c-text':     '#1A1F2E',
      '--c-muted':    '#5A6380',
      '--c-hint':     '#8A94B0',
      '--c-accent':   '#B50D26',
      '--c-accent2':  '#C07800',
      '--c-success':  '#167A3A',
      '--c-warn':     '#B45309',
      '--c-danger':   '#C41E1E',
      '--c-info':     '#1D4ED8',
      '--c-gold':     '#B45309',
      '--c-silver':   '#4B5563',
      '--c-bronze':   '#78350F',
      '--fifa-red':   '#B50D26',
      '--fifa-blue':  '#003DA5',
      '--fifa-gold':  '#C07800',
    }
  },
  worldcup: {
    label: 'World Cup',
    icon: '⚽',
    vars: {
      '--c-bg':       '#071A09',
      '--c-surface':  '#0C2410',
      '--c-surface2': '#122E17',
      '--c-surface3': '#193D1F',
      '--c-border':   'rgba(255,255,255,0.08)',
      '--c-border2':  'rgba(255,255,255,0.16)',
      '--c-text':     '#E4F5E7',
      '--c-muted':    '#5E9467',
      '--c-hint':     '#365C3C',
      '--c-accent':   '#F0A500',
      '--c-accent2':  '#FFD54F',
      '--c-success':  '#4ADE80',
      '--c-warn':     '#FB923C',
      '--c-danger':   '#F87171',
      '--c-info':     '#38BDF8',
      '--c-gold':     '#F0A500',
      '--c-silver':   '#94A3B8',
      '--c-bronze':   '#92400E',
      '--fifa-red':   '#F87171',
      '--fifa-blue':  '#38BDF8',
      '--fifa-gold':  '#F0A500',
    }
  }
}

export function applyTheme(themeName) {
  const theme = THEMES[themeName] || THEMES.dark
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([k,v]) => root.style.setProperty(k, v))
  localStorage.setItem('wc26_theme', themeName)
}

export function getStoredTheme() {
  return localStorage.getItem('wc26_theme') || 'dark'
}
