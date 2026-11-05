/**
 * Invoice numbering: prefix + device code + sequence, e.g. SAL-A-0001.
 * Numbers are handed out by a counter row and are never reused, even after a
 * void, because the counter only ever moves forward.
 */
import { localRepository as repo } from '../data/localRepository'
import { getSettings } from './settings'

export function formatInvoiceNumber({ prefix, deviceCode, sequence }) {
  return `${prefix}-${deviceCode}-${String(sequence).padStart(4, '0')}`
}

export function previewInvoiceNumber({ prefix = 'SAL', deviceCode = 'A', sequence = 1 }) {
  return formatInvoiceNumber({ prefix, deviceCode, sequence })
}

export async function nextNumber(type) {
  const settings = await getSettings()
  const deviceCode = settings.numbering.deviceCode || 'A'
  const prefix = settings.numbering.prefixes?.[type] || String(type).toUpperCase()
  const key = `${type}:${deviceCode}`

  return repo.transaction('rw', ['counters', 'activity_log'], async () => {
    const row = await repo.get('counters', key)
    const sequence = (Number(row?.value) || 0) + 1
    await repo.put('counters', { key, value: sequence, updatedAt: new Date().toISOString() })
    return formatInvoiceNumber({ prefix, deviceCode, sequence })
  })
}
