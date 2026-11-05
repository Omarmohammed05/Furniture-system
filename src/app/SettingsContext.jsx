import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSettings, updateSettings } from '../services/settings'
import { formatNumber } from '../lib/digits'
import { formatMoney, formatQuantity, fromMinor } from '../lib/money'
import { formatDate, formatDateTime, relativeDays } from '../lib/dates'

const SettingsContext = createContext(null)

export function makeFormatters(settings) {
  const digits = settings?.display?.digits === 'arabic' ? 'arabic' : 'western'
  const currency = settings?.currency?.label || 'ج.م'

  return {
    digits,
    currency,
    number: (value, options = {}) => formatNumber(value, { digits, ...options }),
    money: (minor) => formatMoney(minor, { digits, label: currency }),
    moneyPlain: (minor) => formatNumber(fromMinor(minor), { digits, min: 2, max: 2 }),
    quantity: (value) => formatQuantity(value, { digits }),
    date: (iso) => formatDate(iso, { digits }),
    dateTime: (iso) => formatDateTime(iso, { digits }),
    relative: (iso) => relativeDays(iso, { digits }),
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const next = await getSettings()
    setSettings(next)
    setReady(true)
    return next
  }, [])

  useEffect(() => {
    let alive = true
    getSettings().then((next) => {
      if (!alive) return
      setSettings(next)
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback(async (patch, options) => {
    const next = await updateSettings(patch, options)
    setSettings(next)
    return next
  }, [])

  const formatters = useMemo(() => makeFormatters(settings), [settings])

  const value = useMemo(
    () => ({ settings, ready, refresh, update, ...formatters }),
    [settings, ready, refresh, update, formatters],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside SettingsProvider')
  return context
}
