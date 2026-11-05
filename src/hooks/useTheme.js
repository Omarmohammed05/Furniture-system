import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'showroom.theme'

function systemPrefersDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

export function readTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    /* storage unavailable: fall back to the device preference */
  }
  return systemPrefersDark() ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#101114' : '#1C1C1E')
}

/** Applies the saved theme before React paints, so the app never flashes. */
export function initTheme() {
  const theme = readTheme()
  applyTheme(theme)
  return theme
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* private mode: the choice still lasts for this session */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((value) => (value === 'dark' ? 'light' : 'dark')), [])

  return { theme, setTheme, toggle, isDark: theme === 'dark' }
}
