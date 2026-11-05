/**
 * LocalRepository — the Dexie implementation of the repository interface.
 * This is the only module that talks to the database engine.
 *
 * Writes go through `withRecordMeta`, so every row lands with id / createdAt /
 * updatedAt / deletedAt / deviceId no matter which service created it, and the
 * append-only ledgers reject updates and deletes.
 */
import { db } from './db'
import { assertWritable, identityOf, isAppendOnly, withRecordMeta } from './recordMeta'

/**
 * Reads the row a write is about to replace. Only needed for append-only
 * tables (where an existing row is an error) and for rows that arrive without
 * metadata, so ordinary writes cost no extra read.
 */
function needsPrevious(table, record) {
  return (
    isAppendOnly(table) ||
    !record?.createdAt ||
    record?.deletedAt === undefined ||
    !record?.deviceId
  )
}

async function prepare(table, record) {
  const existing = needsPrevious(table, record) ? await db.table(table).get(identityOf(table, record)) : null
  assertWritable(table, record, existing)
  return withRecordMeta(table, record, { previous: existing })
}

export const localRepository = {
  table(name) {
    return db.table(name)
  },

  get(name, id) {
    return db.table(name).get(id)
  },

  all(name) {
    return db.table(name).toArray()
  },

  /** Newest rows by one index — used by the dashboard without reading everything. */
  recent(name, index, limit) {
    return db.table(name).orderBy(index).reverse().limit(limit).toArray()
  },

  /** Reads one index range (inclusive) — keeps reports fast on big tables. */
  byRange(name, index, lower, upper) {
    const table = db.table(name).where(index)
    if (lower && upper) return table.between(lower, upper, true, true).toArray()
    if (lower) return db.table(name).where(index).aboveOrEqual(lower).toArray()
    if (upper) return db.table(name).where(index).belowOrEqual(upper).toArray()
    return db.table(name).toArray()
  },

  /**
   * Index equality — the cheap way to read one party's, one item's or one
   * document's rows instead of the whole table. Compound indexes take an
   * array value, e.g. `byIndex('payments', '[partyType+partyId]', [kind, id])`.
   */
  byIndex(name, index, value) {
    return db.table(name).where(index).equals(value).toArray()
  },

  /** Same, for a list of keys (one invoice's lines, the statuses still owed). */
  byIndexAny(name, index, values) {
    const keys = [...new Set(values || [])].filter((key) => key !== undefined && key !== null && key !== '')
    if (!keys.length) return Promise.resolve([])
    return db.table(name).where(index).anyOf(keys).toArray()
  },

  /** Records for a list of ids; missing ids are simply absent from the result. */
  bulkGet(name, ids) {
    const keys = [...new Set(ids || [])].filter(Boolean)
    if (!keys.length) return Promise.resolve([])
    return db.table(name).bulkGet(keys)
  },

  count(name) {
    return db.table(name).count()
  },

  async put(name, record) {
    return db.table(name).put(await prepare(name, record))
  },

  async bulkPut(name, records) {
    const rows = records || []
    if (!rows.length) return []

    const handle = db.table(name)
    let existingById = new Map()
    if (isAppendOnly(name)) {
      const ids = rows.map((row) => identityOf(name, row)).filter(Boolean)
      const existing = ids.length ? await handle.bulkGet(ids) : []
      existingById = new Map(existing.filter(Boolean).map((row) => [identityOf(name, row), row]))
    }

    const prepared = []
    for (const row of rows) {
      const previous = existingById.get(identityOf(name, row)) || null
      assertWritable(name, row, previous)
      prepared.push(withRecordMeta(name, row, { previous }))
    }
    return handle.bulkPut(prepared)
  },

  /**
   * Hard delete, for rows that carry no ledger meaning (a payroll adjustment
   * typed by mistake). Business rows are archived instead — `deletedAt` is
   * what the future sync needs to propagate a deletion.
   */
  async delete(name, id) {
    const existing = await db.table(name).get(id)
    assertWritable(name, { id }, existing)
    await db.table(name).delete(id)
  },

  transaction(mode, tables, fn) {
    return db.transaction(mode, tables, fn)
  },
}
