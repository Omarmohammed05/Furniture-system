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
