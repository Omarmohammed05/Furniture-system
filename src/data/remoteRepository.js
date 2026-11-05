/**
 * RemoteRepository — placeholder for the future online (Neon/Postgres) mode.
 *
 * The app is offline-first in phase 1. When sync arrives, this object
 * implements the same interface as `localRepository` and only
 * `data/repository.js` changes; screens and services stay untouched.
 */
function notEnabled() {
  return Promise.reject(new Error('RemoteRepository is not enabled yet.'))
}

export const remoteRepository = {
  table: notEnabled,
  get: notEnabled,
  all: notEnabled,
  count: notEnabled,
  put: notEnabled,
  bulkPut: notEnabled,
  transaction: notEnabled,
}
