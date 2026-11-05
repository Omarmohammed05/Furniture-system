/**
 * Repository interface.
 *
 * Services call only these methods; no screen imports Dexie. Swapping the
 * local implementation for a remote (Neon/Postgres) one later therefore does
 * not touch any page.
 *
 *   get(table, id)                  -> record | undefined
 *   all(table)                      -> record[]
 *   count(table)                    -> number
 *   put(table, record)              -> id
 *   bulkPut(table, records)         -> lastId
 *   table(name)                     -> query handle (used inside services only)
 *   transaction(mode, tables, fn)   -> result of fn, atomically
 */
import { localRepository } from './localRepository'

export const repository = localRepository

export default repository
