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
