/**
 * Expenses (M8): rent, electricity, transport… one row per payment out of the
 * shop that is not a purchase invoice. Voided rows stay visible in the list but
 * are excluded from every total.
 */
import { localRepository as repo } from '../data/localRepository'
import { todayIso } from '../lib/dates'
import { fromMinor, toMinor } from '../lib/money'
import { newRecord, touchRecord } from '../lib/records'
import { makeActivity } from './activity'
import { getSettings } from './settings'

export function validateExpense(input) {
  const errors = {}
  if (!input.categoryId) errors.categoryId = 'اختر التصنيف'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date || ''))) errors.date = 'تاريخ غير صالح'

  const amount = String(input.amount ?? '').trim()
  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) errors.amount = 'أدخل مبلغاً صحيحاً'

  return errors
}

export async function listExpenses({
  from = '',
  to = '',
  categoryId = '',
  search = '',
  includeVoided = true,
} = {}) {
  const rows = await repo.all('expenses')
  const term = String(search).trim().toLowerCase()

  return rows
    .filter((row) => (includeVoided ? true : !row.voidedAt))
    .filter((row) => (from ? row.date >= from : true))
    .filter((row) => (to ? row.date <= to : true))
    .filter((row) => (categoryId ? row.categoryId === categoryId : true))
    .filter((row) => {
      if (!term) return true
      return `${row.categoryName || ''} ${row.note || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date))
      return byDate !== 0 ? byDate : String(b.createdAt).localeCompare(String(a.createdAt))
    })
}

/** Totals per category for the rows on screen (voided rows are ignored). */
export function expenseTotalsByCategory(rows = []) {
  const map = new Map()
  for (const row of rows) {
    if (row.voidedAt) continue
    const key = row.categoryId || 'other'
    const entry = map.get(key) || { categoryId: key, name: row.categoryName || 'بدون تصنيف', total: 0, count: 0 }
    entry.total += Number(row.amount) || 0
    entry.count += 1
    map.set(key, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export async function createExpense(input) {
  const errors = validateExpense(input)
  if (Object.keys(errors).length) {
    const error = new Error(Object.values(errors)[0])
    error.errors = errors
    throw error
  }

  const [category, settings] = await Promise.all([repo.get('categories', input.categoryId), getSettings()])
  if (!category) throw new Error('التصنيف غير موجود')

  const amount = toMinor(input.amount)
  const record = newRecord(settings.app.deviceId || 'A', {
    date: input.date || todayIso(),
    categoryId: category.id,
    categoryName: category.name,
    amount,
    method: input.method || 'cash',
    note: String(input.note || '').trim(),
    voidedAt: null,
    voidReason: '',
  })

  await repo.transaction('rw', ['expenses', 'activity_log'], async () => {
    await repo.put('expenses', record)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'expenses.create',
        entity: 'expenses',
        entityId: record.id,
        note: `مصروف ${fromMinor(amount).toFixed(2)} — ${category.name}`,
        deviceId: record.deviceId,
      }),
    )
  })
  return record
}

export async function updateExpense(id, input) {
  const existing = await repo.get('expenses', id)
  if (!existing) throw new Error('المصروف غير موجود')
  if (existing.voidedAt) throw new Error('المصروف ملغى ولا يمكن تعديله')

  const errors = validateExpense(input)
  if (Object.keys(errors).length) {
    const error = new Error(Object.values(errors)[0])
    error.errors = errors
    throw error
  }

  const category = await repo.get('categories', input.categoryId)
  if (!category) throw new Error('التصنيف غير موجود')

  const updated = touchRecord(existing, {
    date: input.date,
    categoryId: category.id,
    categoryName: category.name,
    amount: toMinor(input.amount),
    method: input.method || existing.method,
    note: String(input.note || '').trim(),
  })

  await repo.transaction('rw', ['expenses', 'activity_log'], async () => {
    await repo.put('expenses', updated)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'expenses.update',
        entity: 'expenses',
        entityId: id,
        note: `تعديل مصروف — ${category.name}`,
        snapshotBefore: existing,
        deviceId: updated.deviceId,
      }),
    )
  })
  return updated
}

export async function voidExpense(id, reason = '') {
  const existing = await repo.get('expenses', id)
  if (!existing) throw new Error('المصروف غير موجود')
  if (existing.voidedAt) throw new Error('المصروف ملغى بالفعل')

  const updated = touchRecord(existing, {
    voidedAt: new Date().toISOString(),
    voidReason: String(reason || '').trim(),
  })

  await repo.transaction('rw', ['expenses', 'activity_log'], async () => {
    await repo.put('expenses', updated)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'expenses.void',
        entity: 'expenses',
        entityId: id,
        note: `إلغاء مصروف ${fromMinor(existing.amount).toFixed(2)} — ${existing.categoryName}${reason ? ` (${reason})` : ''}`,
        snapshotBefore: existing,
        deviceId: updated.deviceId,
      }),
    )
  })
  return updated
}
