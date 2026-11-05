/**
 * Purchase invoices (M4): raw materials come in, the supplier balance goes up
 * and any money paid at creation is recorded as a payment out.
 */
import { repository as repo } from '../data/repository'
import { todayIso } from '../lib/dates'
import { assertValid } from '../lib/errors'
import { statusFor } from '../lib/invoiceStatus'
import { toMinor, toQuantity } from '../lib/money'
import { isoNow, newRecord, touchRecord } from '../lib/records'
import { makeActivity } from './activity'
import { makeMovement, reverseDocumentMovements } from './inventory'
import { nextNumber } from './numbering'
import { getSettings } from './settings'
import { calcInvoiceTotals, lineTotal as computeLineTotal } from './totals'

async function resolveLines(rawLines = []) {
  const items = await repo.all('items')
  const byId = new Map(items.map((item) => [item.id, item]))
  return rawLines
    .filter((line) => line && line.itemId)
    .map((line) => {
      const item = byId.get(line.itemId)
      if (!item) throw new Error('صنف غير موجود — أعد اختيار أصناف الفاتورة')
      const qty = toQuantity(line.qty)
      const unitPrice = toMinor(line.unitPrice)
      return {
        itemId: item.id,
        name: item.name,
        unitId: item.unitId || null,
        qty,
        unitPrice,
        lineTotal: computeLineTotal(qty, unitPrice),
      }
    })
}

async function buildPurchase(input, settings) {
  const lines = await resolveLines(input.lines)
  const totals = calcInvoiceTotals({
    lines,
    discountType: input.discountType || 'amount',
    discountValue: input.discountValue,
    vat: settings.vat || {},
  })

  const supplier = input.supplierId ? await repo.get('suppliers', input.supplierId) : null
  const paid = Math.max(0, Math.min(toMinor(input.paid), totals.total))
  const dateText = String(input.date || '').trim()

  const errors = {}
  if (!supplier) errors.supplierId = 'اختر المورد'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) errors.date = 'تاريخ غير صالح'
  if (!lines.length) errors.lines = 'أضف صنفاً واحداً على الأقل'
  lines.forEach((line, index) => {
    if (!(line.qty > 0)) errors[`line_qty_${index}`] = 'الكمية يجب أن تكون أكبر من صفر'
    if (line.unitPrice < 0) errors[`line_price_${index}`] = 'سعر غير صالح'
  })

  return { lines, totals, supplier, paid, errors, date: dateText }
}

function invoiceFields(built, input) {
  return {
    supplierId: built.supplier.id,
    supplierName: built.supplier.name,
    date: built.date,
    subtotal: built.totals.subtotal,
    discount: built.totals.discount,
    discountType: input.discountType === 'percent' ? 'percent' : 'amount',
    discountValue: Number(String(input.discountValue ?? '').replace(',', '.')) || 0,
    vat: built.totals.vat,
    vatRate: built.totals.vatRate,
    pricesIncludeVat: built.totals.pricesIncludeVat,
    total: built.totals.total,
    notes: String(input.notes || '').trim(),
  }
}

export async function createPurchaseInvoice(input) {
  const settings = await getSettings()
  const built = await buildPurchase(input, settings)
  assertValid(built.errors)

  const deviceId = settings.app.deviceId || 'A'
  const invoice = newRecord(deviceId, {
    number: '',
    ...invoiceFields(built, input),
    paid: built.paid,
    status: statusFor(built.paid, built.totals.total),
    voidedAt: null,
    voidReason: '',
  })

  await repo.transaction(
    'rw',
    ['purchase_invoices', 'purchase_lines', 'stock_movements', 'payments', 'activity_log', 'counters'],
    async () => {
      // The number is allocated inside the same transaction as the write.
      const number = await nextNumber('purchase', { settings })
      invoice.number = number
      await repo.put('purchase_invoices', invoice)
      await repo.bulkPut(
        'purchase_lines',
        built.lines.map((line, index) => newRecord(deviceId, { ...line, invoiceId: invoice.id, lineNo: index + 1 })),
      )
      await repo.bulkPut(
        'stock_movements',
        built.lines.map((line) =>
          makeMovement({
            deviceId,
            itemId: line.itemId,
            type: 'purchase_in',
            qty: line.qty,
            refType: 'purchase',
            refId: invoice.id,
            date: invoice.date,
            note: `فاتورة شراء ${number}`,
          }),
        ),
      )
      if (built.paid > 0) {
        await repo.put(
          'payments',
          newRecord(deviceId, {
            direction: 'out',
            partyType: 'suppliers',
            partyId: built.supplier.id,
            partyName: built.supplier.name,
            invoiceType: 'purchase',
            invoiceId: invoice.id,
            invoiceNumber: number,
            amount: built.paid,
            method: input.method || 'cash',
            date: invoice.date,
            note: `دفعة عند الشراء — ${number}`,
          }),
        )
      }
      await repo.put(
        'activity_log',
        makeActivity({
          action: 'purchases.create',
          entity: 'purchase_invoices',
          entityId: invoice.id,
          note: `فاتورة شراء ${number} من «${built.supplier.name}»`,
          deviceId,
        }),
      )
    },
  )

  return invoice
}

export async function updatePurchaseInvoice(id, input) {
  const existing = await repo.get('purchase_invoices', id)
  if (!existing) throw new Error('الفاتورة غير موجودة')
  if (existing.voidedAt) throw new Error('لا يمكن تعديل فاتورة ملغاة')

  const settings = await getSettings()
  const built = await buildPurchase(input, settings)
  assertValid(built.errors)

  const payments = (await repo.all('payments')).filter(
    (row) => row.invoiceType === 'purchase' && row.invoiceId === id,
  )
  const paid = Math.min(
    payments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    built.totals.total,
  )

  const deviceId = existing.deviceId || 'A'
  const updated = touchRecord(existing, {
    ...invoiceFields(built, input),
    paid,
    status: statusFor(paid, built.totals.total),
  })

  await repo.transaction(
    'rw',
    ['purchase_invoices', 'purchase_lines', 'stock_movements', 'activity_log'],
    async () => {
      await reverseDocumentMovements({
        refType: 'purchase',
        refId: id,
        deviceId,
        note: `تعديل فاتورة ${existing.number}`,
      })
      await repo.table('purchase_lines').where('invoiceId').equals(id).delete()
      await repo.put('purchase_invoices', updated)
      await repo.bulkPut(
        'purchase_lines',
        built.lines.map((line, index) => newRecord(deviceId, { ...line, invoiceId: id, lineNo: index + 1 })),
      )
      await repo.bulkPut(
        'stock_movements',
        built.lines.map((line) =>
          makeMovement({
            deviceId,
            itemId: line.itemId,
            type: 'purchase_in',
            qty: line.qty,
            refType: 'purchase',
            refId: id,
            date: updated.date,
            note: `تعديل فاتورة شراء ${existing.number}`,
          }),
        ),
      )
      await repo.put(
        'activity_log',
        makeActivity({
          action: 'purchases.update',
          entity: 'purchase_invoices',
          entityId: id,
          note: `تعديل فاتورة شراء ${existing.number}`,
          snapshotBefore: existing,
          deviceId,
        }),
      )
    },
  )

  return updated
}

export async function voidPurchaseInvoice(id, reason) {
  const invoice = await repo.get('purchase_invoices', id)
  if (!invoice) throw new Error('الفاتورة غير موجودة')
  if (invoice.voidedAt) throw new Error('الفاتورة ملغاة بالفعل')
  const text = String(reason || '').trim()
  if (text.length < 3) throw new Error('اذكر سبب الإلغاء')

  const deviceId = invoice.deviceId || 'A'
  await repo.transaction('rw', ['purchase_invoices', 'stock_movements', 'activity_log'], async () => {
    await repo.put(
      'purchase_invoices',
      touchRecord(invoice, { voidedAt: isoNow(), voidReason: text, status: 'void' }),
    )
    await reverseDocumentMovements({
      refType: 'purchase',
      refId: id,
      deviceId,
      note: `إلغاء فاتورة ${invoice.number} — ${text}`,
    })
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'purchases.void',
        entity: 'purchase_invoices',
        entityId: id,
        note: `إلغاء فاتورة شراء ${invoice.number} — ${text}`,
        deviceId,
      }),
    )
  })
}

export async function getPurchaseInvoice(id) {
  const invoice = await repo.get('purchase_invoices', id)
  if (!invoice) return null
  const [lines, payments] = await Promise.all([repo.all('purchase_lines'), repo.all('payments')])
  return {
    invoice,
    lines: lines.filter((row) => row.invoiceId === id).sort((a, b) => a.lineNo - b.lineNo),
    payments: payments
      .filter((row) => row.invoiceType === 'purchase' && row.invoiceId === id)
      .sort((a, b) => String(b.date).localeCompare(String(a.date))),
  }
}

export async function listPurchaseInvoices({ search = '', status = 'all', supplierId = '', from = '', to = '' } = {}) {
  const rows = await repo.byRange('purchase_invoices', 'date', from || undefined, to || undefined)
  const term = String(search).trim().toLowerCase()
  return rows
    .filter((row) => (status === 'all' ? true : status === 'void' ? Boolean(row.voidedAt) : row.status === status))
    .filter((row) => (supplierId ? row.supplierId === supplierId : true))
    .filter((row) => {
      if (!term) return true
      return `${row.number || ''} ${row.supplierName || ''} ${row.notes || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date))
      return byDate !== 0 ? byDate : String(b.createdAt).localeCompare(String(a.createdAt))
    })
}

export function todayPurchaseDate() {
  return todayIso()
}
