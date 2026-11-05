import { repository as repo } from '../data/repository'
import { assertValid } from '../lib/errors'
import { toMinor } from '../lib/money'
import { archiveRecord, newRecord, restoreRecord, touchRecord } from '../lib/records'
import { makeActivity } from './activity'
import { getSettings } from './settings'

export async function listWorkers({ search = '', includeArchived = false } = {}) {
  const rows = await repo.all('workers')
  const term = String(search).trim().toLowerCase()
  return rows
    .filter((row) => (includeArchived ? true : !row.deletedAt))
    .filter((row) => {
      if (!term) return true
      return `${row.name || ''} ${row.jobTitle || ''} ${row.phone || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'))
}

export function validateWorker(input) {
  const errors = {}
  const name = String(input.name || '').trim()
  if (!name) errors.name = 'اسم العامل مطلوب'
  else if (name.length > 80) errors.name = 'الاسم طويل جداً'

  const salary = String(input.monthlySalary ?? '').trim()
  if (salary && (!Number.isFinite(Number(salary)) || Number(salary) < 0)) errors.monthlySalary = 'مبلغ غير صالح'

  const hireDate = String(input.hireDate || '').trim()
  if (hireDate && !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) errors.hireDate = 'تاريخ غير صالح'

  return errors
}

function normalize(input) {
  return {
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    jobTitle: String(input.jobTitle || '').trim(),
    monthlySalary: toMinor(input.monthlySalary || 0),
    hireDate: String(input.hireDate || '').trim(),
    notes: String(input.notes || '').trim(),
    active: true,
  }
}

export async function createWorker(input) {
  assertValid(validateWorker(input))
  const settings = await getSettings()
  const record = newRecord(settings.app.deviceId, normalize(input))

  await repo.transaction('rw', ['workers', 'activity_log'], async () => {
    await repo.put('workers', record)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'workers.create',
        entity: 'workers',
        entityId: record.id,
        note: `إضافة عامل «${record.name}»`,
        deviceId: record.deviceId,
      }),
    )
  })
  return record
}

export async function updateWorker(id, input) {
  const existing = await repo.get('workers', id)
  if (!existing) throw new Error('العامل غير موجود')
  assertValid(validateWorker(input))
  const updated = touchRecord(existing, { ...normalize(input), active: existing.active ?? true })

  await repo.transaction('rw', ['workers', 'activity_log'], async () => {
    await repo.put('workers', updated)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'workers.update',
        entity: 'workers',
        entityId: id,
        note: `تعديل عامل «${updated.name}»`,
        snapshotBefore: existing,
        deviceId: updated.deviceId,
      }),
    )
  })
  return updated
}

export async function archiveWorker(id) {
  const existing = await repo.get('workers', id)
  if (!existing) throw new Error('العامل غير موجود')
  const archived = archiveRecord(existing)

  await repo.transaction('rw', ['workers', 'activity_log'], async () => {
    await repo.put('workers', archived)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'workers.archive',
        entity: 'workers',
        entityId: id,
        note: `أرشفة عامل «${existing.name}»`,
        deviceId: archived.deviceId,
      }),
    )
  })
}

export async function restoreWorker(id) {
  const existing = await repo.get('workers', id)
  if (!existing) throw new Error('العامل غير موجود')
  const restored = restoreRecord(existing)

  await repo.transaction('rw', ['workers', 'activity_log'], async () => {
    await repo.put('workers', restored)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'workers.restore',
        entity: 'workers',
        entityId: id,
        note: `استعادة عامل «${existing.name}»`,
        deviceId: restored.deviceId,
      }),
    )
  })
}
