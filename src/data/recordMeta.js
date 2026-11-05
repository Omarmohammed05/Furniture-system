/**
 * Record metadata and ledger rules — shared by every repository
 * implementation, so a row written locally and a row written by the future
 * online repository always have the same shape.
 *
 * Every row in every table carries:
 *   id         stable identity (UUID for business rows)
 *   createdAt  ISO timestamp of the first write
 *   updatedAt  ISO timestamp of the last write — the delta-sync cursor
 *   deletedAt  ISO timestamp of the soft delete, or null
 *   deviceId   device code that wrote the row
 *
 * `settings` and `counters` hold one row per key, so their `id` follows the
 * key and the shared fields above are still present on every row.
 *
 * `stock_movements` and `payments` are append-only ledgers: a row can be
 * created but never changed or removed. Corrections are appended as new rows
 * (a `void_reversal` movement, a refund payment), which is what lets two
 * devices merge their ledgers later without conflicts.
 */
export const RECORD_META_FIELDS = Object.freeze(['id', 'createdAt', 'updatedAt', 'deletedAt', 'deviceId'])

export const KEYED_TABLES = Object.freeze(['settings', 'counters'])

export const APPEND_ONLY_TABLES = Object.freeze(['stock_movements', 'payments'])

let activeDeviceId = 'A'

/** Kept in sync by the settings service once the shop profile is loaded. */
export function setActiveDeviceId(value) {
  activeDeviceId = String(value || 'A')
}

export function getActiveDeviceId() {
  return activeDeviceId
}

export function isAppendOnly(table) {
  return APPEND_ONLY_TABLES.includes(table)
}

/** Primary-key value of a row, whichever identity the table uses. */
export function identityOf(table, record) {
  if (!record) return ''
  if (record.id) return String(record.id)
  if (KEYED_TABLES.includes(table) && record.key !== undefined) return String(record.key)
  return ''
}

/**
 * Returns the row with any missing metadata field filled in. Fields the
 * caller already set are never rewritten, so `touchRecord`/`archiveRecord`
 * keep their meaning.
 */
export function withRecordMeta(table, record, { previous = null, now = new Date().toISOString(), deviceId = '' } = {}) {
  const next = { ...record }

  if (!next.id) next.id = identityOf(table, next) || crypto.randomUUID()
  if (!next.createdAt) next.createdAt = previous?.createdAt || now
  if (!next.updatedAt) next.updatedAt = now
  if (next.deletedAt === undefined) next.deletedAt = previous?.deletedAt ?? null
  if (!next.deviceId) next.deviceId = previous?.deviceId || deviceId || activeDeviceId

  return next
}

/** Guard shared by the write methods: an append-only row may only be created. */
export function assertWritable(table, record, existing) {
  if (!existing) return
  if (!isAppendOnly(table)) return
  const id = identityOf(table, record) || identityOf(table, existing)
  throw new Error(`Append-only ledger «${table}»: row ${id} already exists — append a reversal instead of editing it`)
}
