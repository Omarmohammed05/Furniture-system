/**
 * Money is always stored as integer piasters (minor units) — never a float.
 * Quantities use plain numbers with up to three decimals.
 */
import { formatNumber, normalizeDigits } from './digits'

export function toMinor(value) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = typeof value === 'string' ? normalizeDigits(value).replace(/,/g, '').trim() : value
  const number = Number(normalized)
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 100)
}

export function fromMinor(minor) {
  return (Number(minor) || 0) / 100
}

/** Value for an <input> holding major units ("1250.50"). */
export function minorToInput(minor) {
  const value = fromMinor(minor)
  if (!value) return ''
  return String(Number(value.toFixed(2)))
}

export function formatMoney(minor, { digits = 'western', label = 'ج.م' } = {}) {
  const text = formatNumber(fromMinor(minor), { digits, min: 2, max: 2 })
  return `${text} ${label}`
}

export function formatMoneyPlain(minor, { digits = 'western', min = 2 } = {}) {
  return formatNumber(fromMinor(minor), { digits, min, max: 2 })
}

export function formatQuantity(value, { digits = 'western' } = {}) {
  return formatNumber(Number(value) || 0, { digits, max: 3 })
}

export function toQuantity(value) {
  const number = Number(normalizeDigits(value))
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 1000) / 1000
}
