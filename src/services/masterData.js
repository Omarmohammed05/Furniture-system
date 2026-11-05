/**
 * Small editable lists: item categories, expense categories and units.
 * Items and units that are already used by an item cannot be archived.
 */
import { localRepository as repo } from '../data/localRepository'
import { assertValid } from '../lib/errors'
import { archiveRecord, newRecord, restoreRecord, touchRecord } from '../lib/records'
import { makeActivity } from './activity'
import { getSettings } from './settings'

export const CATEGORY_KINDS = { item: 'item', expense: 'expense' }

export function validateName(name) {
  const errors = {}
  const value = String(name || '').trim()
  if (!value) errors.name = 'الاسم مطلوب'
  else if (value.length > 60) errors.name = 'الاسم طويل جداً'
  return errors
}

async function itemsUsing(field, id) {
  const items = await repo.all('items')
  return items.filter((item) => !item.deletedAt && item[field] === id)
}

async function createNamed(table, fields, note, noteDeviceId) {
  const settings = await getSettings()
  const record = newRecord(settings.app.deviceId, { active: true, ...fields })
  await repo.transaction('rw', [table, 'activity_log'], async () => {
    await repo.put(table, record)
    await repo.put(
      'activity_log',
      makeActivity({ action: `${table}.create`, entity: table, entityId: record.id, note, deviceId: noteDeviceId || record.deviceId }),
    )
  })
  return record
}

async function renameNamed(table, id, name, note) {
  const existing = await repo.get(table, id)
  if (!existing) throw new Error('العنصر غير موجود')
  assertValid(validateName(name))
  const updated = touchRecord(existing, { name: String(name).trim() })
  await repo.transaction('rw', [table, 'activity_log'], async () => {
    await repo.put(table, updated)
    await repo.put(
      'activity_log',
      makeActivity({ action: `${table}.update`, entity: table, entityId: id, note, snapshotBefore: existing, deviceId: updated.deviceId }),
    )
  })
  return updated
}

async function setArchived(table, id, archived, note) {
  const existing = await repo.get(table, id)
  if (!existing) throw new Error('العنصر غير موجود')
  const updated = archived ? archiveRecord(existing) : restoreRecord(existing)
  await repo.transaction('rw', [table, 'activity_log'], async () => {
    await repo.put(table, updated)
    await repo.put(
      'activity_log',
      makeActivity({ action: `${table}.${archived ? 'archive' : 'restore'}`, entity: table, entityId: id, note, deviceId: updated.deviceId }),
    )
  })
}

/* ---------- categories ---------- */

export async function listCategories(kind, { includeArchived = false } = {}) {
  const rows = await repo.all('categories')
  return rows
    .filter((row) => row.kind === kind)
    .filter((row) => (includeArchived ? true : !row.deletedAt))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'))
}

export async function createCategory({ name, kind }) {
  assertValid(validateName(name))
  if (!Object.values(CATEGORY_KINDS).includes(kind)) throw new Error('نوع التصنيف غير معروف')
  return createNamed(
    'categories',
    { name: String(name).trim(), kind },
    kind === 'expense' ? `إضافة تصنيف مصروف «${String(name).trim()}»` : `إضافة تصنيف صنف «${String(name).trim()}»`,
  )
}

export async function renameCategory(id, name) {
  return renameNamed('categories', id, name, `تعديل تصنيف «${String(name).trim()}»`)
}

export async function archiveCategory(id) {
  const category = await repo.get('categories', id)
  if (!category) throw new Error('العنصر غير موجود')
  if (category.kind === 'item') {
    const used = await itemsUsing('categoryId', id)
    if (used.length) throw new Error(`التصنيف مستخدم في ${used.length} صنف — انقل الأصناف أولاً`)
  }
  return setArchived('categories', id, true, `أرشفة تصنيف «${category.name}»`)
}

export async function restoreCategory(id) {
  return setArchived('categories', id, false, 'استعادة تصنيف')
}

/* ---------- units ---------- */

export async function listUnits({ includeArchived = false } = {}) {
  const rows = await repo.all('units')
  return rows
    .filter((row) => (includeArchived ? true : !row.deletedAt))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'))
}

export async function createUnit(name) {
  assertValid(validateName(name))
  return createNamed('units', { name: String(name).trim() }, `إضافة وحدة «${String(name).trim()}»`)
}

export async function renameUnit(id, name) {
  return renameNamed('units', id, name, `تعديل وحدة «${String(name).trim()}»`)
}

export async function archiveUnit(id) {
  const unit = await repo.get('units', id)
  if (!unit) throw new Error('العنصر غير موجود')
  const used = await itemsUsing('unitId', id)
  if (used.length) throw new Error(`الوحدة مستخدمة في ${used.length} صنف — غيّر وحدة الأصناف أولاً`)
  return setArchived('units', id, true, `أرشفة وحدة «${unit.name}»`)
}

export async function restoreUnit(id) {
  return setArchived('units', id, false, 'استعادة وحدة')
}
