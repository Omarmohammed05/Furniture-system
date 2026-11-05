/**
 * RemoteRepository — placeholder for the future online (Neon/Postgres) mode.
 *
 * The app is offline-first in phase 1. When sync arrives, this object
 * implements the same interface as `localRepository` and only
 * `data/repository.js` changes; screens and services stay untouched.
 *
 * The method list mirrors the interface documented in `data/repository.js`,
 * so `assertRepository` keeps the two implementations in step.
 */
function notEnabled() {
  return Promise.reject(new Error('RemoteRepository is not enabled yet.'))
}

export const remoteRepository = {
  table: notEnabled,
  get: notEnabled,
  all: notEnabled,
  recent: notEnabled,
  byRange: notEnabled,
  count: notEnabled,
  put: notEnabled,
  bulkPut: notEnabled,
  delete: notEnabled,
  transaction: notEnabled,
}
