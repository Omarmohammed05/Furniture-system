/**
 * Invoice numbering: prefix + device code + sequence, e.g. SAL-A-0001.
 * Numbers are handed out by a counter row and are never reused, even after a
 * void, because the counter only ever moves forward.
 */
import { repository as repo } from '../data/repository'
import { getSettings } from './settings'

export function formatInvoiceNumber({ prefix, deviceCode, sequence }) {
  return `${prefix}-${deviceCode}-${String(sequence).padStart(4, '0')}`
}

export function previewInvoiceNumber({ prefix = 'SAL', deviceCode = 'A', sequence = 1 }) {
  return formatInvoiceNumber({ prefix, deviceCode, sequence })
}

/**
 * `settings` is passed by the invoice services so the counter can be consumed
 * inside their own transaction without reading the settings table again.
 */
export async function nextNumber(type, { settings = null } = {}) {
  const config = settings || (await getSettings())
  const deviceCode = config.numbering.deviceCode || 'A'
  const prefix = config.numbering.prefixes?.[type] || String(type).toUpperCase()
  const key = `${type}:${deviceCode}`

  return repo.transaction('rw', ['counters', 'activity_log'], async () => {
    const row = await repo.get('counters', key)
    const sequence = (Number(row?.value) || 0) + 1
    await repo.put('counters', { key, value: sequence, updatedAt: new Date().toISOString() })
    return formatInvoiceNumber({ prefix, deviceCode, sequence })
  })
}
