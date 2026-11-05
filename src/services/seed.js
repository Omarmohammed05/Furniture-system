import { newRecord } from '../lib/records'

export const WALK_IN_CUSTOMER_NAME = 'عميل نقدي'

/** Seeded once, at first-run setup; fully editable afterwards. */
export const DEFAULT_UNITS = ['قطعة', 'متر', 'متر مربع', 'كجم', 'لوح', 'شيكارة', 'علبة']

export const DEFAULT_EXPENSE_CATEGORIES = ['إيجار', 'كهرباء', 'مواصلات', 'صيانة', 'أخرى']

export function buildSeedUnits(deviceId) {
  return DEFAULT_UNITS.map((name) => newRecord(deviceId, { name, seeded: true }))
}

export function buildSeedExpenseCategories(deviceId) {
  return DEFAULT_EXPENSE_CATEGORIES.map((name) =>
    newRecord(deviceId, { name, kind: 'expense', seeded: true }),
  )
}

export function buildWalkInCustomer(deviceId) {
  return newRecord(deviceId, {
    name: WALK_IN_CUSTOMER_NAME,
    phone: '',
    address: '',
    notes: 'عميل نقدي افتراضي — لا يمكن حذفه',
    openingBalance: 0,
    active: true,
    isWalkIn: true,
  })
}
