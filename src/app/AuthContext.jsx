import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { completeSetup, verifyPin } from '../services/settings'
import { requestPersistentStorage } from '../services/storage'
import { useSettings } from './SettingsContext'

const SESSION_KEY = 'showroom.unlockedAt'
const ACTIVITY_KEY = 'showroom.lastActivity'

const AuthContext = createContext(null)

function autoLockMs(settings) {
  const minutes = Number(settings?.security?.autoLockMinutes ?? 5)
  return minutes > 0 ? minutes * 60000 : 0
}

export function AuthProvider({ children }) {
  const { settings, ready, refresh } = useSettings()
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)
  const lastActivity = useRef(Date.now())

  const markActivity = useCallback(() => {
    lastActivity.current = Date.now()
    try {
      sessionStorage.setItem(ACTIVITY_KEY, String(lastActivity.current))
    } catch {
      /* private mode: in-memory timestamp is enough */
    }
  }, [])

  const lock = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(ACTIVITY_KEY)
    } catch {
      /* ignore */
    }
    setStatus('locked')
  }, [])

  const openSession = useCallback(async () => {
    markActivity()
    try {
      sessionStorage.setItem(SESSION_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    setStatus('unlocked')
    void requestPersistentStorage()
  }, [markActivity])

  const unlock = useCallback(
    async (pin) => {
      setBusy(true)
      try {
        const ok = await verifyPin(pin)
        if (!ok) return false
        await openSession()
        await refresh()
        return true
      } finally {
        setBusy(false)
      }
    },
    [openSession, refresh],
  )

  const finishSetup = useCallback(
    async (input) => {
      setBusy(true)
      try {
        const next = await completeSetup(input)
        await refresh()
        await openSession()
        return next
      } finally {
        setBusy(false)
      }
    },
    [openSession, refresh],
  )

  useEffect(() => {
    if (!ready) return
    if (!settings?.app?.initialized || !settings?.security?.pinHash) {
      setStatus('setup')
      return
    }
    let unlockedAt = 0
    let activityAt = 0
    try {
      unlockedAt = Number(sessionStorage.getItem(SESSION_KEY) || 0)
      activityAt = Number(sessionStorage.getItem(ACTIVITY_KEY) || 0)
    } catch {
      /* ignore */
    }
    const timeout = autoLockMs(settings)
    const last = Math.max(unlockedAt, activityAt)
    const stillFresh = unlockedAt > 0 && (!timeout || Date.now() - last < timeout)
    setStatus((current) => (current === 'unlocked' || stillFresh ? 'unlocked' : 'locked'))
    if (stillFresh) lastActivity.current = last
  }, [ready, settings])

  useEffect(() => {
    if (status !== 'unlocked') return undefined

    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel']
    const handler = () => markActivity()
    events.forEach((event) => window.addEventListener(event, handler, { passive: true }))
    markActivity()

    const timer = window.setInterval(() => {
      const timeout = autoLockMs(settings)
      if (timeout && Date.now() - lastActivity.current >= timeout) lock()
    }, 15000)

    return () => {
      events.forEach((event) => window.removeEventListener(event, handler))
      window.clearInterval(timer)
    }
  }, [status, settings, markActivity, lock])

  const value = useMemo(
    () => ({
      status,
      busy,
      unlock,
      lock,
      finishSetup,
      hasPin: Boolean(settings?.security?.pinHash),
    }),
    [status, busy, unlock, lock, finishSetup, settings],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
