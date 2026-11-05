import { useLiveQuery } from 'dexie-react-hooks'

/**
 * Live data hook. The querier calls a service (never Dexie directly); Dexie
 * re-runs it whenever the rows it read change.
 */
export function useLive(querier, deps = []) {
  return useLiveQuery(querier, deps)
}
