import { registerSW } from 'virtual:pwa-register'

const listeners = new Set()
let applyUpdate = null

/**
 * Registers the service worker on the very first open, so the app caches its
 * own files and keeps working with no connection even before it is installed.
 * Safe to call more than once — the registration happens only once.
 */
export function registerServiceWorker() {
  if (applyUpdate) return
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      listeners.forEach((listener) => listener())
    },
  })
}

/** Notifies `listener` when a new version of the app has been downloaded. */
export function onUpdateAvailable(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Switches to the downloaded version and reloads the app. */
export function applyUpdateNow() {
  applyUpdate?.(true)
}
