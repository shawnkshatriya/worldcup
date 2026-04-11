// Theme system — dark | light | worldcup

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
      '--c-bg':       '#F4F6FB',
      '--c-surface':  '#FFFFFF',
      '--c-surface2': '#F0F2F8',
      '--c-surface3': '#E4E8F4',
      '--c-border':   'rgba(0,0,0,0.08)',
      '--c-border2':  'rgba(0,0,0,0.14)',
      '--c-text':     '#111827',
      '--c-muted':    '#6B7280',
      '--c-hint':     '#9CA3AF',
      '--c-accent':   '#C8102E',
      '--c-accent2':  '#D97706',
      '--c-success':  '#16A34A',
      '--c-warn':     '#D97706',
      '--c-danger':   '#DC2626',
      '--c-info':     '#2563EB',
      '--c-gold':     '#D97706',
      '--c-silver':   '#6B7280',
      '--c-bronze':   '#92400E',
      '--fifa-red':   '#C8102E',
      '--fifa-blue':  '#003DA5',
      '--fifa-gold':  '#D97706',
    }
  },
  worldcup: {
    label: 'World Cup',
    icon: '⚽',
    vars: {
      '--c-bg':       '#0A1A0E',
      '--c-surface':  '#0F2314',
      '--c-surface2': '#162D1B',
      '--c-surface3': '#1E3A23',
      '--c-border':   'rgba(255,255,255,0.08)',
      '--c-border2':  'rgba(255,255,255,0.15)',
      '--c-text':     '#E8F5E9',
      '--c-muted':    '#6B9E74',
      '--c-hint':     '#3D6645',
      '--c-accent':   '#F0A500',
      '--c-accent2':  '#FFD54F',
      '--c-success':  '#4CAF50',
      '--c-warn':     '#FF9800',
      '--c-danger':   '#EF5350',
      '--c-info':     '#29B6F6',
      '--c-gold':     '#F0A500',
      '--c-silver':   '#90A4AE',
      '--c-bronze':   '#8D6E63',
      '--fifa-red':   '#EF5350',
      '--fifa-blue':  '#29B6F6',
      '--fifa-gold':  '#F0A500',
    }
  }
}

export function applyTheme(themeName) {
  const theme = THEMES[themeName] || THEMES.dark
  const root = document.documentElement
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
  localStorage.setItem('wc26_theme', themeName)
}

export function getStoredTheme() {
  return localStorage.getItem('wc26_theme') || 'dark'
}
