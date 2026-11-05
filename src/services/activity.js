import { repository as repo } from '../data/repository'
import { isoNow } from '../lib/records'

export function makeActivity({
  action,
  entity,
  entityId = null,
  note = '',
  snapshotBefore = null,
  deviceId = 'A',
}) {
  const at = isoNow()
  return {
    id: crypto.randomUUID(),
    at,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    deviceId,
    action,
    entity,
    entityId,
    note,
    snapshotBefore,
  }
}

export async function logActivity(entry) {
  await repo.put('activity_log', makeActivity(entry))
}

export async function listActivity(limit = 20) {
  const rows = await repo.all('activity_log')
  return rows.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, limit)
}

/** The activity log screen (M14): newest first, optional text filter. */
export async function searchActivity({ search = '', limit = 300 } = {}) {
  const rows = await repo.all('activity_log')
  const term = String(search).trim().toLowerCase()
  return rows
    .filter((row) => {
      if (!term) return true
      return `${row.note || ''} ${row.action || ''} ${row.entity || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit)
}
