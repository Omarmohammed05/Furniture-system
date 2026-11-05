/**
 * Backup & restore.
 *
 * Export writes one versioned, checksummed JSON file.
 * Import validates the file, downloads an automatic safety backup of the
 * current data, then replaces everything inside ONE transaction.
 */
import { SCHEMA_VERSION, TABLE_NAMES } from '../data/db'
import { repository as repo } from '../data/repository'
import { sha256Hex } from '../lib/checksum'
import { downloadJson, readFileText } from '../lib/files'
import { isoNow } from '../lib/records'
import { makeActivity } from './activity'
import { getSettings } from './settings'

export const BACKUP_FORMAT = 'showroom-backup'

function countTables(tables) {
  const counts = {}
  for (const name of TABLE_NAMES) counts[name] = tables[name]?.length || 0
  return counts
}

function totalOf(counts) {
  return Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0)
}

export async function collectTables() {
  const tables = {}
  for (const name of TABLE_NAMES) tables[name] = await repo.all(name)
  return tables
}

export async function countAllRecords() {
  const counts = {}
  for (const name of TABLE_NAMES) counts[name] = await repo.count(name)
  return { counts, total: totalOf(counts) }
}

export async function exportBackup({ automatic = false } = {}) {
  const settings = await getSettings()
  const tables = await collectTables()
  const checksum = await sha256Hex(JSON.stringify(tables))
  const exportedAt = isoNow()

  const payload = {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion: settings.app.appVersion,
    exportedAt,
    deviceId: settings.app.deviceId,
    checksum,
    tables,
  }

  const filename = `showroom-backup-${exportedAt.slice(0, 10)}${automatic ? '-safety' : ''}.json`
  downloadJson(filename, payload)

  const counts = countTables(tables)
  await repo.transaction('rw', ['settings', 'activity_log'], async () => {
    await repo.put('settings', {
      key: 'backup',
      value: {
        ...settings.backup,
        lastBackupAt: exportedAt,
        lastBackupName: filename,
        lastBackupMode: automatic ? 'safety' : 'manual',
      },
      updatedAt: exportedAt,
    })
    await repo.put(
      'activity_log',
      makeActivity({
        action: automatic ? 'backup.safety' : 'backup.export',
        entity: 'backup',
        note: automatic ? 'نسخة أمان تلقائية قبل الاستعادة' : 'تصدير نسخة احتياطية كاملة',
        deviceId: settings.app.deviceId,
      }),
    )
  })

  return { filename, exportedAt, checksum, counts, total: totalOf(counts), payload }
}

export async function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'الملف ليس نسخة احتياطية صالحة' }
  }
  if (payload.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'هذا الملف ليس نسخة احتياطية من «نظام المعرض»' }
  }
  // Older backups are accepted: the repository fills in any metadata a row of an
  // older schema is missing as it is written back.
  const fileVersion = Number(payload.schemaVersion)
  if (!Number.isInteger(fileVersion) || fileVersion < 1 || fileVersion > SCHEMA_VERSION) {
    return { ok: false, error: `إصدار الملف (${payload.schemaVersion}) غير مدعوم في هذا الإصدار من التطبيق` }
  }
  if (!payload.tables || typeof payload.tables !== 'object') {
    return { ok: false, error: 'الملف لا يحتوي على بيانات' }
  }

  for (const name of Object.keys(payload.tables)) {
    if (!TABLE_NAMES.includes(name)) {
      return { ok: false, error: `الملف يحتوي على قسم غير معروف: ${name}` }
    }
    if (!Array.isArray(payload.tables[name])) {
      return { ok: false, error: `قسم غير صالح في الملف: ${name}` }
    }
  }

  if (payload.checksum) {
    const actual = await sha256Hex(JSON.stringify(payload.tables))
    if (actual !== payload.checksum) {
      return { ok: false, error: 'الملف تالف أو تم تعديله — فحص السلامة لم ينجح' }
    }
  }

  const counts = countTables(payload.tables)
  const total = totalOf(counts)
  if (!total) return { ok: false, error: 'الملف فارغ — لا توجد بيانات لاستعادتها' }

  return { ok: true, payload, counts, total }
}

export async function inspectBackupFile(file) {
  let text
  try {
    text = await readFileText(file)
  } catch {
    return { ok: false, error: 'تعذر قراءة الملف' }
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'الملف ليس JSON صالحاً — تأكد أنك اخترت ملف النسخة الاحتياطية' }
  }

  const validation = await validateBackupPayload(parsed)
  if (!validation.ok) return validation

  return {
    ok: true,
    fileName: file.name,
    fileSize: file.size,
    exportedAt: parsed.exportedAt,
    deviceId: parsed.deviceId,
    appVersion: parsed.appVersion,
    counts: validation.counts,
    total: validation.total,
  }
}

export async function importBackupFile(file) {
  const text = await readFileText(file)
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('الملف ليس JSON صالحاً — تأكد أنك اخترت ملف النسخة الاحتياطية')
  }

  const validation = await validateBackupPayload(parsed)
  if (!validation.ok) throw new Error(validation.error)

  // Safety net first: the current data is saved before anything is replaced.
  const safety = await exportBackup({ automatic: true })

  const payload = validation.payload
  await repo.transaction('rw', TABLE_NAMES, async () => {
    for (const name of TABLE_NAMES) {
      await repo.table(name).clear()
      const rows = payload.tables[name] || []
      if (rows.length) await repo.bulkPut(name, rows)
    }
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'backup.import',
        entity: 'backup',
        note: `استعادة نسخة احتياطية بتاريخ ${String(payload.exportedAt || '').slice(0, 10)}`,
        deviceId: payload.deviceId || 'A',
      }),
    )
  })

  const settings = await getSettings()

  return {
    counts: validation.counts,
    total: validation.total,
    exportedAt: payload.exportedAt,
    deviceId: payload.deviceId,
    safetyFile: safety.filename,
    settings,
  }
}

export function backupStatus(settings) {
  const lastBackupAt = settings?.backup?.lastBackupAt || null
  const reminderDays = Number(settings?.backup?.reminderDays ?? 7)
  if (!lastBackupAt) {
    return { lastBackupAt: null, days: null, overdue: true, reminderDays, never: true }
  }
  const days = Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000)
  return { lastBackupAt, days, overdue: days >= reminderDays, reminderDays, never: false }
}
