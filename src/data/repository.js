/**
 * Repository interface — the only data surface services are allowed to use.
 * No screen and no service imports Dexie; swapping the local implementation
 * for a remote (Neon/Postgres) one later therefore touches this file only.
 *
 * Contract — every implementation must provide:
 *
 *   get(table, id)                  -> record | undefined
 *   all(table)                      -> record[]
 *   recent(table, index, limit)     -> newest records by one index
 *   byRange(table, index, low, high)-> records inside one index range
 *   byIndex(table, index, value)    -> records where one index equals a value
 *   byIndexAny(table, index, values)-> records where one index is in a list
 *   bulkGet(table, ids)             -> records for a list of ids
 *   count(table)                    -> number
 *   put(table, record)              -> key       (create or update)
 *   bulkPut(table, records)         -> keys
 *   delete(table, id)               -> hard delete of a non-ledger row
 *   transaction(mode, tables, fn)   -> result of fn, atomically
 *   table(name)                     -> raw handle (backup / maintenance only)
 *
 * Rules the implementation enforces for both local and remote modes:
 *   - every row carries id / createdAt / updatedAt / deletedAt / deviceId
 *     (see `data/recordMeta.js`)
 *   - `stock_movements` and `payments` are append-only ledgers: creating is
 *     allowed, updating or deleting is not; corrections are appended
 *   - deletions of business rows are soft (`deletedAt`), so a future sync can
 *     replay them
 */
import { localRepository } from './localRepository'
import { remoteRepository } from './remoteRepository'

export const REPOSITORY_METHODS = Object.freeze([
  'get',
  'all',
  'recent',
  'byRange',
  'byIndex',
  'byIndexAny',
  'bulkGet',
  'count',
  'put',
  'bulkPut',
  'delete',
  'transaction',
  'table',
])

/** Throws unless `implementation` exposes the whole interface. */
export function assertRepository(implementation, name = 'repository') {
  const missing = REPOSITORY_METHODS.filter((method) => typeof implementation?.[method] !== 'function')
  if (missing.length) throw new Error(`${name} is missing repository methods: ${missing.join(', ')}`)
  return implementation
}

assertRepository(remoteRepository, 'remoteRepository')

/** The active implementation — swapping this one line is the online move. */
export const repository = assertRepository(localRepository, 'localRepository')

export { remoteRepository }
export default repository
