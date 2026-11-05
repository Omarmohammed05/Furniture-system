/**
 * Inventory is an append-only ledger (M3): stock is always the sum of the
 * movements, never a number stored on the item. Voiding or editing an invoice
 * appends reversing movements, so history stays complete.
 */
import { localRepository as repo } from '../data/localRepository'
import { assertValid } from '../lib/errors'
import { todayIso } from '../lib/dates'
import { toQuantity } from '../lib/money'
import { isoNow, newRecord } from '../lib/records'
import { makeActivity } from './activity'
import { getSettings } from './settings'

export const MOVEMENT_LABELS = {
  purchase_in: 'شراء',
  sale_out: 'بيع',
  production_in: 'إنتاج',
  production_out: 'استهلاك خام',
  adjustment_in: 'تسوية زيادة',
  adjustment_out: 'تسوية نقص',
  void_reversal: 'عكس حركة',
}

export function movementLabel(type) {
  return MOVEMENT_LABELS[type] || type
}

export function roundQty(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000
}

/** Raised when the negative-stock policy (S7) stops a movement. */
export class StockError extends Error {
  constructor(shortages, policy = 'block') {
    const first = shortages[0]
    const head = policy === 'warn' ? 'المخزون سيصبح سالباً' : 'المخزون لا يكفي'
    super(`${head} في ${shortages.length} صنف — أولها «${first?.name || ''}» (المتاح ${roundQty(first?.available)})`)
    this.name = 'StockError'
    this.shortages = shortages || []
    this.policy = policy
  }
}

export function makeMovement({ deviceId, itemId, type, qty, refType, refId = null, date, note = '' }) {
  return newRecord(deviceId, {
    itemId,
    type,
    qty: roundQty(qty),
    refType,
    refId,
    date: date || todayIso(),
    at: isoNow(),
    note,
  })
}

function sortMovements(a, b) {
  const byDate = String(a.date || '').localeCompare(String(b.date || ''))
  if (byDate !== 0) return byDate
  return String(a.at || a.createdAt || '').localeCompare(String(b.at || b.createdAt || ''))
}

/** itemId → quantity on hand, optionally ignoring the movements of one document. */
export async function getStockMap({ excludeRef = null } = {}) {
  const rows = await repo.all('stock_movements')
  const map = new Map()
  for (const row of rows) {
    if (excludeRef && row.refType === excludeRef.refType && row.refId === excludeRef.refId) continue
    map.set(row.itemId, roundQty((map.get(row.itemId) || 0) + (Number(row.qty) || 0)))
  }
  return map
}

export async function getStock(itemId) {
  const map = await getStockMap()
  return map.get(itemId) || 0
}

function lowStockLimit(item, settings) {
  const own = Number(item.minStock) || 0
  if (own > 0) return own
  return Number(settings?.stock?.lowStockThreshold) || 0
}

/** Stock list with search and the low / out-of-stock filters. */
export async function listStock({ search = '', filter = 'all' } = {}) {
  const [items, stock, settings] = await Promise.all([repo.all('items'), getStockMap(), getSettings()])
  const term = String(search).trim().toLowerCase()

  return items
    .filter((item) => !item.deletedAt)
    .map((item) => {
      const onHand = stock.get(item.id) || 0
      const limit = lowStockLimit(item, settings)
      return { ...item, stock: onHand, lowLimit: limit, isLow: onHand <= limit, isOut: onHand <= 0 }
    })
    .filter((row) => (filter === 'low' ? row.isLow : filter === 'out' ? row.isOut : true))
    .filter((row) => {
      if (!term) return true
      return `${row.name || ''} ${row.code || ''} ${row.notes || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => {
      if (a.isLow !== b.isLow) return a.isLow ? -1 : 1
      return String(a.name).localeCompare(String(b.name), 'ar')
    })
}

export async function listLowStock() {
  return listStock({ filter: 'low' })
}

/** Newest first, each row carrying its running balance. */
export async function getItemMovements(itemId) {
  const rows = (await repo.all('stock_movements')).filter((row) => row.itemId === itemId).sort(sortMovements)
  let balance = 0
  const withBalance = rows.map((row) => {
    balance = roundQty(balance + (Number(row.qty) || 0))
    return { ...row, balance }
  })
  return withBalance.reverse()
}

/**
 * Returns the shortages of a set of requested quantities without writing
 * anything. `excludeRef` skips the movements of the document being edited so
 * its own stock does not count as available twice.
 */
export async function checkStock(lines = [], { excludeRef = null } = {}) {
  const map = await getStockMap({ excludeRef })
  const shortages = []
  for (const line of lines) {
    const available = map.get(line.itemId) || 0
    const required = roundQty(line.qty)
    if (available < required) {
      shortages.push({ itemId: line.itemId, name: line.name, available, required })
    }
  }
  return shortages
}

/** Applies the negative-stock policy and throws when the movement must stop. */
export async function ensureStock(lines = [], { excludeRef = null, allowNegative = false } = {}) {
  const shortages = await checkStock(lines, { excludeRef })
  if (!shortages.length) return { ok: true, shortages }
  const settings = await getSettings()
  const policy = settings?.stock?.negativePolicy || 'warn'
  if (policy === 'allow') return { ok: true, shortages }
  if (policy === 'warn' && allowNegative) return { ok: true, shortages }
  throw new StockError(shortages, policy)
}

export function validateAdjustment({ itemId, qtyDelta, reason }) {
  const errors = {}
  if (!itemId) errors.itemId = 'اختر الصنف'
  if (!Number(qtyDelta)) errors.qtyDelta = 'أدخل كمية موجبة أو سالبة'
  const text = String(reason || '').trim()
  if (text.length < 3) errors.reason = 'سبب التسوية مطلوب'
  return errors
}

export async function recordAdjustment({ itemId, qtyDelta, reason, date }) {
  const delta = roundQty(qtyDelta)
  assertValid(validateAdjustment({ itemId, qtyDelta: delta, reason }))

  const settings = await getSettings()
  const item = await repo.get('items', itemId)
  if (!item) throw new Error('الصنف غير موجود')
  const deviceId = settings.app.deviceId || 'A'
  const movement = makeMovement({
    deviceId,
    itemId,
    type: delta > 0 ? 'adjustment_in' : 'adjustment_out',
    qty: delta,
    refType: 'adjustment',
    date: date || todayIso(),
    note: String(reason).trim(),
  })

  await repo.transaction('rw', ['stock_movements', 'activity_log'], async () => {
    await repo.put('stock_movements', movement)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'inventory.adjustment',
        entity: 'stock_movements',
        entityId: movement.id,
        note: `تسوية مخزون «${item.name}» بمقدار ${delta}`,
        deviceId,
      }),
    )
  })
  return movement
}

export function validateProduction({ productId, qty, materials }) {
  const errors = {}
  if (!productId) errors.productId = 'اختر المنتج'
  if (!(toQuantity(qty) > 0)) errors.qty = 'الكمية يجب أن تكون أكبر من صفر'
  const rows = (materials || []).filter((row) => row.itemId)
  rows.forEach((row, index) => {
    if (!(toQuantity(row.qty) > 0)) errors[`material_${index}`] = 'كمية غير صالحة'
  })
  return errors
}

/**
 * Production entry without costing (M3): the product goes in, the raw
 * materials it consumed go out.
 */
export async function recordProduction({ productId, qty, date, materials = [], note = '', allowNegative = false }) {
  const amount = toQuantity(qty)
  assertValid(validateProduction({ productId, qty: amount, materials }))

  const settings = await getSettings()
  const product = await repo.get('items', productId)
  if (!product) throw new Error('المنتج غير موجود')

  const items = await repo.all('items')
  const nameOf = (id) => items.find((item) => item.id === id)?.name || 'صنف'
  const used = materials
    .filter((row) => row.itemId)
    .map((row) => ({ itemId: row.itemId, qty: toQuantity(row.qty), name: nameOf(row.itemId) }))

  if (used.length) {
    await ensureStock(used, { allowNegative })
  }

  const deviceId = settings.app.deviceId || 'A'
  const day = date || todayIso()
  const entry = newRecord(deviceId, {
    productId,
    productName: product.name,
    qty: amount,
    date: day,
    note: String(note || '').trim(),
  })

  await repo.transaction(
    'rw',
    ['production_entries', 'production_materials', 'stock_movements', 'activity_log'],
    async () => {
      await repo.put('production_entries', entry)
      const rows = used.map((row) =>
        newRecord(deviceId, {
          entryId: entry.id,
          itemId: row.itemId,
          name: row.name,
          qty: row.qty,
        }),
      )
      if (rows.length) await repo.bulkPut('production_materials', rows)

      const movements = [
        makeMovement({
          deviceId,
          itemId: productId,
          type: 'production_in',
          qty: amount,
          refType: 'production',
          refId: entry.id,
          date: day,
          note: `إنتاج ${product.name}`,
        }),
        ...used.map((row) =>
          makeMovement({
            deviceId,
            itemId: row.itemId,
            type: 'production_out',
            qty: -row.qty,
            refType: 'production',
            refId: entry.id,
            date: day,
            note: `استهلاك لإنتاج ${product.name}`,
          }),
        ),
      ]
      await repo.bulkPut('stock_movements', movements)

      await repo.put(
        'activity_log',
        makeActivity({
          action: 'inventory.production',
          entity: 'production_entries',
          entityId: entry.id,
          note: `تسجيل إنتاج ${amount} من «${product.name}»`,
          deviceId,
        }),
      )
    },
  )

  return entry
}

/** Reverses every movement of one document (used by void and edit). */
export async function reverseDocumentMovements({ refType, refId, deviceId, note }) {
  const movements = (await repo.all('stock_movements')).filter(
    (row) => row.refType === refType && row.refId === refId && row.type !== 'void_reversal',
  )
  if (!movements.length) return []
  const reversals = movements.map((row) =>
    makeMovement({
      deviceId,
      itemId: row.itemId,
      type: 'void_reversal',
      qty: -(Number(row.qty) || 0),
      refType,
      refId,
      date: todayIso(),
      note: note || 'عكس حركة',
    }),
  )
  await repo.bulkPut('stock_movements', reversals)
  return reversals
}
