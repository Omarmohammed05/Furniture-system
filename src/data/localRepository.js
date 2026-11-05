/**
 * LocalRepository — the Dexie implementation of the repository interface.
 * This is the only module that talks to the database engine.
 */
import { db } from './db'

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

  count(name) {
    return db.table(name).count()
  },

  put(name, record) {
    return db.table(name).put(record)
  },

  bulkPut(name, records) {
    return db.table(name).bulkPut(records)
  },

  transaction(mode, tables, fn) {
    return db.transaction(mode, tables, fn)
  },
}
