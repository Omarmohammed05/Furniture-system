import { localizeDigits } from './digits'

const dateFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const longFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function isoNow() {
  return new Date().toISOString()
}

export function formatDate(iso, { digits = 'western' } = {}) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return localizeDigits(dateFormatter.format(date), digits)
}

export function formatDateTime(iso, { digits = 'western' } = {}) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return localizeDigits(dateTimeFormatter.format(date), digits)
}

export function formatLongDate(date = new Date(), { digits = 'western' } = {}) {
  return localizeDigits(longFormatter.format(date), digits)
}

export function daysSince(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / 86400000)
}

export function relativeDays(iso, { digits = 'western' } = {}) {
  const days = daysSince(iso)
  if (days === null) return 'لم يتم بعد'
  if (days <= 0) return 'اليوم'
  if (days === 1) return 'أمس'
  if (days === 2) return 'منذ يومين'
  if (days <= 10) return `منذ ${localizeDigits(days, digits)} أيام`
  return `منذ ${localizeDigits(days, digits)} يوماً`
}

export function fileDateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

/** Today as YYYY-MM-DD in the device's own timezone (not UTC). */
export function todayIso(date = new Date()) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

/** Adds whole days to a YYYY-MM-DD string and returns YYYY-MM-DD. */
export function addDays(isoDate, days) {
  const base = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date()
  base.setDate(base.getDate() + Number(days || 0))
  return todayIso(base)
}

const shortFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Compact date for tables and invoices: 05/11/2026 */
export function formatShortDate(iso, { digits = 'western' } = {}) {
  if (!iso) return '—'
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(date.getTime())) return '—'
  return localizeDigits(shortFormatter.format(date), digits)
}

/** Days between today and a YYYY-MM-DD date (negative when it already passed). */
export function daysUntil(isoDate) {
  if (!isoDate) return null
  const target = new Date(`${isoDate}T12:00:00`).getTime()
  if (Number.isNaN(target)) return null
  return Math.round((target - Date.now()) / 86400000)
}

/** Month key of a date: YYYY-MM (payroll and expense periods). */
export function currentMonth(date = new Date()) {
  return todayIso(date).slice(0, 7)
}

const monthFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' })

export function formatMonth(month, { digits = 'western' } = {}) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return '—'
  const date = new Date(`${month}-01T12:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return localizeDigits(monthFormatter.format(date), digits)
}

/** First and last day of a YYYY-MM month. */
export function monthRange(month) {
  const [year, index] = String(month || '').split('-').map(Number)
  if (!year || !index) return { from: '', to: '' }
  const lastDay = new Date(year, index, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}
