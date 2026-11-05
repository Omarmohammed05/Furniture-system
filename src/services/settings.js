/**
 * Settings service — shop profile and every owner-facing preference.
 * Stored as one row per section in the `settings` table.
 */
import { SCHEMA_VERSION } from '../data/db'
import { localRepository as repo } from '../data/localRepository'
import { APP_VERSION } from '../lib/appInfo'
import { mergeDeep } from '../lib/objects'
import { isoNow } from '../lib/records'
import { hashPin, isValidPin, randomSalt, verifyPinHash } from '../lib/pin'
import { makeActivity } from './activity'
import { buildSeedExpenseCategories, buildSeedUnits, buildWalkInCustomer } from './seed'

export const SETTINGS_SECTIONS = [
  'app',
  'profile',
  'currency',
  'vat',
  'numbering',
  'display',
  'security',
  'stock',
  'backup',
]

export const DEFAULT_SETTINGS = Object.freeze({
  app: {
    initialized: false,
    deviceId: null,
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    installedAt: null,
  },
  profile: { shopName: '', phone: '', address: '', footerNote: '', logoDataUrl: '' },
  currency: { label: 'ج.م', decimals: 2 },
  vat: { enabled: false, rate: 14, pricesIncludeVat: false },
  numbering: {
    deviceCode: 'A',
    prefixes: { sale: 'SAL', purchase: 'PUR', receipt: 'REC', payment: 'PAY', expense: 'EXP', advance: 'ADV', payroll: 'PR' },
  },
  display: { digits: 'western' },
  security: { pinSalt: null, pinHash: null, pinLength: null, autoLockMinutes: 5 },
  stock: { negativePolicy: 'warn', lowStockThreshold: 0 },
  backup: { reminderDays: 7, lastBackupAt: null, lastBackupName: null, lastBackupMode: null },
})

export function normalizeDeviceCode(value) {
  const cleaned = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
  return cleaned || 'A'
}

let cache = null

export async function getSettings() {
  const rows = await repo.all('settings')
  const stored = {}
  for (const row of rows) stored[row.key] = row.value
  cache = mergeDeep(DEFAULT_SETTINGS, stored)
  return cache
}

/** Synchronous last-known settings, for render-time helpers. */
export function peekSettings() {
  return cache || DEFAULT_SETTINGS
}

export async function getDeviceId() {
  const settings = await getSettings()
  return settings.app.deviceId || 'A'
}

export async function updateSettings(patch, { note = '' } = {}) {
  const current = await getSettings()
  const next = mergeDeep(current, patch)
  const sections = Object.keys(patch).filter((section) => SETTINGS_SECTIONS.includes(section))

  await repo.transaction('rw', ['settings', 'activity_log'], async () => {
    for (const section of sections) {
      await repo.put('settings', { key: section, value: next[section], updatedAt: isoNow() })
    }
    if (note) {
      await repo.put(
        'activity_log',
        makeActivity({ action: 'settings.update', entity: 'settings', note, deviceId: next.app.deviceId || 'A' }),
      )
    }
  })

  cache = next
  return next
}

export function hasPin(settings = cache) {
  return Boolean(settings?.security?.pinHash && settings?.security?.pinSalt)
}

/** First run: saves the shop profile, the PIN, and seeds the default lists. */
export async function completeSetup({ shopName, phone = '', address = '', logoDataUrl = '', pin, deviceCode = 'A' }) {
  if (!String(shopName || '').trim()) throw new Error('اسم المعرض مطلوب')
  if (!isValidPin(pin)) throw new Error('رمز الدخول يجب أن يكون من ٤ إلى ٦ أرقام')

  const code = normalizeDeviceCode(deviceCode)
  const salt = randomSalt()
  const hash = await hashPin(pin, salt)
  const now = isoNow()

  const next = mergeDeep(DEFAULT_SETTINGS, {
    app: { initialized: true, deviceId: code, appVersion: APP_VERSION, schemaVersion: SCHEMA_VERSION, installedAt: now },
    profile: { shopName: String(shopName).trim(), phone, address, logoDataUrl },
    numbering: { deviceCode: code },
    security: { pinSalt: salt, pinHash: hash, pinLength: String(pin).length },
  })

  await repo.transaction(
    'rw',
    ['settings', 'units', 'categories', 'customers', 'activity_log'],
    async () => {
      for (const section of SETTINGS_SECTIONS) {
        await repo.put('settings', { key: section, value: next[section], updatedAt: now })
      }
      await repo.bulkPut('units', buildSeedUnits(code))
      await repo.bulkPut('categories', buildSeedExpenseCategories(code))
      await repo.put('customers', buildWalkInCustomer(code))
      await repo.put(
        'activity_log',
        makeActivity({
          action: 'setup.complete',
          entity: 'settings',
          note: `تم إعداد التطبيق للمعرض «${next.profile.shopName}»`,
          deviceId: code,
        }),
      )
    },
  )

  cache = next
  return next
}

export async function setPin(pin) {
  if (!isValidPin(pin)) throw new Error('رمز الدخول يجب أن يكون من ٤ إلى ٦ أرقام')
  const salt = randomSalt()
  const hash = await hashPin(pin, salt)
  await updateSettings(
    { security: { pinSalt: salt, pinHash: hash, pinLength: String(pin).length } },
    { note: 'تم تغيير رمز الدخول' },
  )
}

export async function verifyPin(pin) {
  const settings = await getSettings()
  if (!hasPin(settings)) return false
  return verifyPinHash(String(pin), settings.security.pinSalt, settings.security.pinHash)
}
