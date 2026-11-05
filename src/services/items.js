import { localRepository as repo } from '../data/localRepository'
import { assertValid } from '../lib/errors'
import { toMinor, toQuantity } from '../lib/money'
import { archiveRecord, newRecord, restoreRecord, touchRecord } from '../lib/records'
import { makeActivity } from './activity'
import { getSettings } from './settings'

export const ITEM_TYPES = [
  { value: 'raw_material', label: 'خام / مادة' },
  { value: 'product', label: 'منتج تام' },
]

export function itemTypeLabel(type) {
  return ITEM_TYPES.find((entry) => entry.value === type)?.label || '—'
}

export async function listItems({ search = '', type = 'all', includeArchived = false } = {}) {
  const rows = await repo.all('items')
  const term = String(search).trim().toLowerCase()
  return rows
    .filter((row) => (includeArchived ? true : !row.deletedAt))
    .filter((row) => (type === 'all' ? true : row.type === type))
    .filter((row) => {
      if (!term) return true
      return `${row.name || ''} ${row.code || ''} ${row.notes || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'))
}

export function getItem(id) {
  return repo.get('items', id)
}

export function validateItem(input) {
  const errors = {}
  const name = String(input.name || '').trim()
  if (!name) errors.name = 'اسم الصنف مطلوب'
  else if (name.length > 80) errors.name = 'الاسم طويل جداً'

  if (!ITEM_TYPES.some((entry) => entry.value === input.type)) errors.type = 'اختر نوع الصنف'

  const code = String(input.code || '').trim()
  if (code.length > 24) errors.code = 'الكود طويل جداً'

  for (const field of ['purchasePrice', 'salePrice']) {
    const raw = String(input[field] ?? '').trim()
    if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
      errors[field] = 'مبلغ غير صالح'
    }
  }

  const minStock = String(input.minStock ?? '').trim()
  if (minStock && (!Number.isFinite(Number(minStock)) || Number(minStock) < 0)) {
    errors.minStock = 'الحد الأدنى غير صالح'
  }

  return errors
}

function normalize(input) {
  return {
    type: input.type,
    name: String(input.name || '').trim(),
    code: String(input.code || '').trim(),
    categoryId: input.categoryId || null,
    unitId: input.unitId || null,
    purchasePrice: toMinor(input.purchasePrice || 0),
    salePrice: toMinor(input.salePrice || 0),
    minStock: toQuantity(input.minStock || 0),
    notes: String(input.notes || '').trim(),
    active: true,
  }
}

export async function createItem(input) {
  assertValid(validateItem(input))
  const settings = await getSettings()
  const record = newRecord(settings.app.deviceId, normalize(input))

  await repo.transaction('rw', ['items', 'activity_log'], async () => {
    await repo.put('items', record)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'items.create',
        entity: 'items',
        entityId: record.id,
        note: `إضافة صنف «${record.name}»`,
        deviceId: record.deviceId,
      }),
    )
  })
  return record
}

export async function updateItem(id, input) {
  const existing = await repo.get('items', id)
  if (!existing) throw new Error('الصنف غير موجود')
  assertValid(validateItem(input))

  const updated = touchRecord(existing, { ...normalize(input), active: existing.active ?? true })

  await repo.transaction('rw', ['items', 'activity_log'], async () => {
    await repo.put('items', updated)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'items.update',
        entity: 'items',
        entityId: id,
        note: `تعديل صنف «${updated.name}»`,
        snapshotBefore: existing,
        deviceId: updated.deviceId,
      }),
    )
  })
  return updated
}

export async function archiveItem(id) {
  const existing = await repo.get('items', id)
  if (!existing) throw new Error('الصنف غير موجود')
  const archived = archiveRecord(existing)

  await repo.transaction('rw', ['items', 'activity_log'], async () => {
    await repo.put('items', archived)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'items.archive',
        entity: 'items',
        entityId: id,
        note: `أرشفة صنف «${existing.name}»`,
        deviceId: archived.deviceId,
      }),
    )
  })
}

export async function restoreItem(id) {
  const existing = await repo.get('items', id)
  if (!existing) throw new Error('الصنف غير موجود')
  const restored = restoreRecord(existing)

  await repo.transaction('rw', ['items', 'activity_log'], async () => {
    await repo.put('items', restored)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'items.restore',
        entity: 'items',
        entityId: id,
        note: `استعادة صنف «${existing.name}»`,
        deviceId: restored.deviceId,
      }),
    )
  })
}
