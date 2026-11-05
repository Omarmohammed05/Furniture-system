import { useEffect, useState } from 'react'

const STANDALONE_QUERY = '(display-mode: standalone)'

/**
 * Wraps the browser install prompt. Chromium fires `beforeinstallprompt` only
 * when the app is installable (manifest + service worker), so the button is
 * hidden until the browser offers it.
 */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.matchMedia?.(STANDALONE_QUERY)?.matches || window.navigator.standalone === true)
  })

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault()
      setPromptEvent(event)
    }
    const onInstalled = () => {
      setPromptEvent(null)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!promptEvent) return 'unavailable'
    promptEvent.prompt()
    const choice = await promptEvent.userChoice.catch(() => null)
    setPromptEvent(null)
    return choice?.outcome || 'dismissed'
  }

  return { canInstall: Boolean(promptEvent), installed, install }
}
