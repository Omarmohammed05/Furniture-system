/**
 * Customers and suppliers share one shape, so they share one service.
 * kind: 'customers' | 'suppliers'
 */
import { localRepository as repo } from '../data/localRepository'
import { assertValid } from '../lib/errors'
import { toMinor } from '../lib/money'
import { archiveRecord, newRecord, restoreRecord, touchRecord } from '../lib/records'
import { getSettings } from './settings'
import { makeActivity } from './activity'

const TABLES = { customers: 'customers', suppliers: 'suppliers' }
const LABELS = { customers: 'عميل', suppliers: 'مورد' }

function tableFor(kind) {
  const table = TABLES[kind]
  if (!table) throw new Error('نوع جهة غير معروف')
  return table
}

export function partyLabel(kind) {
  return LABELS[kind] || ''
}

export async function listParties(kind, { search = '', includeArchived = false } = {}) {
  const rows = await repo.all(tableFor(kind))
  const term = String(search).trim().toLowerCase()
  return rows
    .filter((row) => (includeArchived ? true : !row.deletedAt))
    .filter((row) => {
      if (!term) return true
      return `${row.name || ''} ${row.phone || ''} ${row.notes || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => {
      if (a.isWalkIn && !b.isWalkIn) return -1
      if (b.isWalkIn && !a.isWalkIn) return 1
      return String(a.name).localeCompare(String(b.name), 'ar')
    })
}

export function getParty(kind, id) {
  return repo.get(tableFor(kind), id)
}

export function validateParty(input) {
  const errors = {}
  const name = String(input.name || '').trim()
  if (!name) errors.name = 'الاسم مطلوب'
  else if (name.length > 80) errors.name = 'الاسم طويل جداً'

  const phone = String(input.phone || '').trim()
  if (phone && !/^[0-9+\s-]{6,20}$/.test(phone)) errors.phone = 'رقم هاتف غير صالح'

  const opening = String(input.openingBalance ?? '').trim()
  if (opening && !Number.isFinite(Number(opening))) errors.openingBalance = 'مبلغ غير صالح'

  return errors
}

function normalize(input) {
  return {
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    address: String(input.address || '').trim(),
    notes: String(input.notes || '').trim(),
    openingBalance: toMinor(input.openingBalance || 0),
  }
}

export async function createParty(kind, input) {
  const table = tableFor(kind)
  assertValid(validateParty(input))
  const settings = await getSettings()
  const record = newRecord(settings.app.deviceId, { ...normalize(input), active: true, isWalkIn: false })

  await repo.transaction('rw', [table, 'activity_log'], async () => {
    await repo.put(table, record)
    await repo.put(
      'activity_log',
      makeActivity({
        action: `${table}.create`,
        entity: table,
        entityId: record.id,
        note: `إضافة ${LABELS[kind]} «${record.name}»`,
        deviceId: record.deviceId,
      }),
    )
  })
  return record
}

export async function updateParty(kind, id, input) {
  const table = tableFor(kind)
  const existing = await repo.get(table, id)
  if (!existing) throw new Error('السجل غير موجود')
  assertValid(validateParty(input))

  const updated = touchRecord(existing, normalize(input))

  await repo.transaction('rw', [table, 'activity_log'], async () => {
    await repo.put(table, updated)
    await repo.put(
      'activity_log',
      makeActivity({
        action: `${table}.update`,
        entity: table,
        entityId: id,
        note: `تعديل ${LABELS[kind]} «${updated.name}»`,
        snapshotBefore: existing,
        deviceId: updated.deviceId,
      }),
    )
  })
  return updated
}

export async function archiveParty(kind, id) {
  const table = tableFor(kind)
  const existing = await repo.get(table, id)
  if (!existing) throw new Error('السجل غير موجود')
  if (existing.isWalkIn) throw new Error('لا يمكن أرشفة «عميل نقدي»')

  const archived = archiveRecord(existing)
  await repo.transaction('rw', [table, 'activity_log'], async () => {
    await repo.put(table, archived)
    await repo.put(
      'activity_log',
      makeActivity({
        action: `${table}.archive`,
        entity: table,
        entityId: id,
        note: `أرشفة ${LABELS[kind]} «${existing.name}»`,
        deviceId: archived.deviceId,
      }),
    )
  })
}

export async function restoreParty(kind, id) {
  const table = tableFor(kind)
  const existing = await repo.get(table, id)
  if (!existing) throw new Error('السجل غير موجود')

  const restored = restoreRecord(existing)
  await repo.transaction('rw', [table, 'activity_log'], async () => {
    await repo.put(table, restored)
    await repo.put(
      'activity_log',
      makeActivity({
        action: `${table}.restore`,
        entity: table,
        entityId: id,
        note: `استعادة ${LABELS[kind]} «${existing.name}»`,
        deviceId: restored.deviceId,
      }),
    )
  })
}
