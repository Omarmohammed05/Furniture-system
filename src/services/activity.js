import { localRepository as repo } from '../data/localRepository'
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
