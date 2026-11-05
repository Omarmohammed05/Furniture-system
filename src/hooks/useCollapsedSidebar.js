import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'showroom.sidebar.collapsed'

function readInitial() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Remembers whether the owner folded the desktop sidebar into its icon rail,
 * so the choice survives reloads and app restarts.
 */
export function useCollapsedSidebar() {
  const [collapsed, setCollapsed] = useState(readInitial)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      /* storage may be unavailable (private mode) — folding still works for this session */
    }
  }, [collapsed])

  const toggle = useCallback(() => setCollapsed((value) => !value), [])

  return [collapsed, toggle]
}
