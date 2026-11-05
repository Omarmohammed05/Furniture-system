/**
 * Sales invoices (M5): stock out, customer debt up, optional down payment and
 * installment plan. Every write happens inside one transaction (rule 3).
 */
import { repository as repo } from '../data/repository'
import { addDays, todayIso } from '../lib/dates'
import { assertValid } from '../lib/errors'
import { statusFor } from '../lib/invoiceStatus'
import { toMinor, toQuantity } from '../lib/money'
import { isoNow, newRecord, touchRecord } from '../lib/records'
import { makeActivity } from './activity'
import { ensureStock, makeMovement, reverseDocumentMovements } from './inventory'
import { nextNumber } from './numbering'
import { getSettings } from './settings'
import { calcInvoiceTotals, lineTotal as computeLineTotal } from './totals'

export function buildInstallmentPlan({ total, count, firstDue, intervalDays = 30 }) {
  const parts = Math.max(1, Math.round(Number(count) || 1))
  const step = Number(intervalDays) || 30
  const base = Math.floor(total / parts)
  return Array.from({ length: parts }, (_, index) => ({
    seq: index + 1,
    dueDate: addDays(firstDue || todayIso(), index * step),
    amount: index === parts - 1 ? total - base * (parts - 1) : base,
    paidAmount: 0,
    status: 'due',
  }))
}

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

async function buildSale(input, settings) {
  const lines = await resolveLines(input.lines)
  const totals = calcInvoiceTotals({
    lines,
    discountType: input.discountType || 'amount',
    discountValue: input.discountValue,
    vat: settings.vat || {},
  })

  const customer = input.customerId ? await repo.get('customers', input.customerId) : null
  const paid = Math.max(0, Math.min(toMinor(input.paid), totals.total))
  const remaining = totals.total - paid

  const requestedParts = Number(input.installment?.count) || 0
  const plan =
    requestedParts > 0 && remaining > 0 && !customer?.isWalkIn
      ? buildInstallmentPlan({
          total: remaining,
          count: requestedParts,
          firstDue: input.installment?.firstDue || addDays(input.date || todayIso(), 30),
          intervalDays: input.installment?.intervalDays || 30,
        })
      : []

  const dateText = String(input.date || '').trim()
  const errors = {}
  if (!customer) errors.customerId = 'اختر العميل'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) errors.date = 'تاريخ غير صالح'
  if (!lines.length) errors.lines = 'أضف صنفاً واحداً على الأقل'
  lines.forEach((line, index) => {
    if (!(line.qty > 0)) errors[`line_qty_${index}`] = 'الكمية يجب أن تكون أكبر من صفر'
    if (line.unitPrice < 0) errors[`line_price_${index}`] = 'سعر غير صالح'
  })
  if (customer?.isWalkIn && remaining > 0) errors.paid = 'العميل النقدي يجب أن يسدد كامل المبلغ'
  if (requestedParts > 0 && remaining <= 0) errors.installmentCount = 'لا يوجد متبقٍ لتقسيطه'
  if (requestedParts > 60) errors.installmentCount = 'عدد الأقساط كبير جداً'

  return { lines, totals, customer, paid, remaining, plan, errors, date: dateText }
}

export async function createSalesInvoice(input) {
  const settings = await getSettings()
  const built = await buildSale(input, settings)
  assertValid(built.errors)

  const deviceId = settings.app.deviceId || 'A'
  const invoice = newRecord(deviceId, {
    number: '',
    customerId: built.customer.id,
    customerName: built.customer.name,
    date: built.date,
    subtotal: built.totals.subtotal,
    discount: built.totals.discount,
    discountType: input.discountType === 'percent' ? 'percent' : 'amount',
    discountValue: Number(String(input.discountValue ?? '').replace(',', '.')) || 0,
    vat: built.totals.vat,
    vatRate: built.totals.vatRate,
    pricesIncludeVat: built.totals.pricesIncludeVat,
    total: built.totals.total,
    paid: built.paid,
    status: statusFor(built.paid, built.totals.total),
    notes: String(input.notes || '').trim(),
    installmentPlan: built.plan.length
      ? {
          count: built.plan.length,
          firstDue: built.plan[0].dueDate,
          intervalDays: Number(input.installment?.intervalDays) || 30,
        }
      : null,
    voidedAt: null,
    voidReason: '',
  })

  await repo.transaction(
    'rw',
    ['sales_invoices', 'sales_lines', 'stock_movements', 'payments', 'installments', 'activity_log', 'counters'],
    async () => {
      // Number allocation and the stock check live inside the same transaction
      // as the writes, so a failed invoice consumes neither a number nor stock.
      const number = await nextNumber('sale', { settings })
      await ensureStock(built.lines, { allowNegative: Boolean(input.allowNegative), settings })
      invoice.number = number
      await repo.put('sales_invoices', invoice)
      await repo.bulkPut(
        'sales_lines',
        built.lines.map((line, index) => newRecord(deviceId, { ...line, invoiceId: invoice.id, lineNo: index + 1 })),
      )
      await repo.bulkPut(
        'stock_movements',
        built.lines.map((line) =>
          makeMovement({
            deviceId,
            itemId: line.itemId,
            type: 'sale_out',
            qty: -line.qty,
            refType: 'sale',
            refId: invoice.id,
            date: invoice.date,
            note: `فاتورة بيع ${number}`,
          }),
        ),
      )
      if (built.paid > 0) {
        await repo.put(
          'payments',
          newRecord(deviceId, {
            direction: 'in',
            partyType: 'customers',
            partyId: built.customer.id,
            partyName: built.customer.name,
            invoiceType: 'sale',
            invoiceId: invoice.id,
            invoiceNumber: number,
            amount: built.paid,
            method: input.method || 'cash',
            date: invoice.date,
            note: `دفعة مقدمة — ${number}`,
          }),
        )
      }
      if (built.plan.length) {
        await repo.bulkPut(
          'installments',
          built.plan.map((row) =>
            newRecord(deviceId, {
              salesInvoiceId: invoice.id,
              customerId: built.customer.id,
              invoiceNumber: number,
              seq: row.seq,
              dueDate: row.dueDate,
              amount: row.amount,
              paidAmount: 0,
              status: 'due',
            }),
          ),
        )
      }
      await repo.put(
        'activity_log',
        makeActivity({
          action: 'sales.create',
          entity: 'sales_invoices',
          entityId: invoice.id,
          note: `فاتورة بيع ${number} للعميل «${built.customer.name}»`,
          deviceId,
        }),
      )
    },
  )

  return invoice
}

export async function updateSalesInvoice(id, input) {
  const existing = await repo.get('sales_invoices', id)
  if (!existing) throw new Error('الفاتورة غير موجودة')
  if (existing.voidedAt) throw new Error('لا يمكن تعديل فاتورة ملغاة')

  const installments = await repo.byIndex('installments', 'salesInvoiceId', id)
  if (installments.some((row) => row.status === 'paid' || (row.paidAmount || 0) > 0)) {
    throw new Error('لا يمكن تعديل فاتورة سُدّدت بعض أقساطها')
  }

  const settings = await getSettings()
  const built = await buildSale(input, settings)
  assertValid(built.errors)

  const payments = (await repo.byIndex('payments', 'invoiceId', id)).filter(
    (row) => row.invoiceType === 'sale',
  )
  const paid = Math.min(
    payments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    built.totals.total,
  )
  const remaining = built.totals.total - paid
  const plan =
    remaining > 0 && existing.installmentPlan && !built.customer.isWalkIn
      ? buildInstallmentPlan({
          total: remaining,
          count: existing.installmentPlan.count,
          firstDue: existing.installmentPlan.firstDue,
          intervalDays: existing.installmentPlan.intervalDays,
        })
      : []

  const deviceId = existing.deviceId || 'A'
  const updated = touchRecord(existing, {
    customerId: built.customer.id,
    customerName: built.customer.name,
    date: built.date,
    subtotal: built.totals.subtotal,
    discount: built.totals.discount,
    discountType: input.discountType === 'percent' ? 'percent' : 'amount',
    discountValue: Number(String(input.discountValue ?? '').replace(',', '.')) || 0,
    vat: built.totals.vat,
    vatRate: built.totals.vatRate,
    pricesIncludeVat: built.totals.pricesIncludeVat,
    total: built.totals.total,
    paid,
    status: statusFor(paid, built.totals.total),
    notes: String(input.notes || '').trim(),
    installmentPlan: plan.length ? { ...existing.installmentPlan, count: plan.length } : null,
  })

  await repo.transaction(
    'rw',
    ['sales_invoices', 'sales_lines', 'stock_movements', 'installments', 'activity_log'],
    async () => {
      await ensureStock(built.lines, {
        allowNegative: Boolean(input.allowNegative),
        excludeRef: { refType: 'sale', refId: id },
        settings,
      })
      await reverseDocumentMovements({
        refType: 'sale',
        refId: id,
        deviceId,
        note: `تعديل فاتورة ${existing.number}`,
      })
      await repo.table('sales_lines').where('invoiceId').equals(id).delete()
      await repo.table('installments').where('salesInvoiceId').equals(id).delete()

      await repo.put('sales_invoices', updated)
      await repo.bulkPut(
        'sales_lines',
        built.lines.map((line, index) => newRecord(deviceId, { ...line, invoiceId: id, lineNo: index + 1 })),
      )
      await repo.bulkPut(
        'stock_movements',
        built.lines.map((line) =>
          makeMovement({
            deviceId,
            itemId: line.itemId,
            type: 'sale_out',
            qty: -line.qty,
            refType: 'sale',
            refId: id,
            date: updated.date,
            note: `تعديل فاتورة بيع ${existing.number}`,
          }),
        ),
      )
      if (plan.length) {
        await repo.bulkPut(
          'installments',
          plan.map((row) =>
            newRecord(deviceId, {
              salesInvoiceId: id,
              customerId: built.customer.id,
              invoiceNumber: existing.number,
              seq: row.seq,
              dueDate: row.dueDate,
              amount: row.amount,
              paidAmount: 0,
              status: 'due',
            }),
          ),
        )
      }
      await repo.put(
        'activity_log',
        makeActivity({
          action: 'sales.update',
          entity: 'sales_invoices',
          entityId: id,
          note: `تعديل فاتورة بيع ${existing.number}`,
          snapshotBefore: existing,
          deviceId,
        }),
      )
    },
  )

  return updated
}

export async function voidSalesInvoice(id, reason) {
  const invoice = await repo.get('sales_invoices', id)
  if (!invoice) throw new Error('الفاتورة غير موجودة')
  if (invoice.voidedAt) throw new Error('الفاتورة ملغاة بالفعل')
  const text = String(reason || '').trim()
  if (text.length < 3) throw new Error('اذكر سبب الإلغاء')

  const deviceId = invoice.deviceId || 'A'
  await repo.transaction('rw', ['sales_invoices', 'stock_movements', 'installments', 'activity_log'], async () => {
    await repo.put(
      'sales_invoices',
      touchRecord(invoice, { voidedAt: isoNow(), voidReason: text, status: 'void' }),
    )
    await reverseDocumentMovements({
      refType: 'sale',
      refId: id,
      deviceId,
      note: `إلغاء فاتورة ${invoice.number} — ${text}`,
    })
    const open = (await repo.byIndex('installments', 'salesInvoiceId', id)).filter(
      (row) => row.status !== 'paid',
    )
    if (open.length) {
      await repo.bulkPut(
        'installments',
        open.map((row) => touchRecord(row, { status: 'cancelled' })),
      )
    }
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'sales.void',
        entity: 'sales_invoices',
        entityId: id,
        note: `إلغاء فاتورة بيع ${invoice.number} — ${text}`,
        deviceId,
      }),
    )
  })
}

export async function getSalesInvoice(id) {
  const invoice = await repo.get('sales_invoices', id)
  if (!invoice) return null
  // Indexed by the foreign key, so opening one invoice is independent of how
  // many invoices the showroom has.
  const [lines, invoicePayments, installments] = await Promise.all([
    repo.byIndex('sales_lines', 'invoiceId', id),
    repo.byIndex('payments', 'invoiceId', id),
    repo.byIndex('installments', 'salesInvoiceId', id),
  ])
  return {
    invoice,
    lines: [...lines].sort((a, b) => a.lineNo - b.lineNo),
    payments: invoicePayments
      .filter((row) => row.invoiceType === 'sale')
      .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    installments: [...installments].sort((a, b) => a.seq - b.seq),
  }
}

export async function listSalesInvoices({ search = '', status = 'all', customerId = '', from = '', to = '' } = {}) {
  // Date range comes from the `date` index so large histories stay fast.
  const rows = await repo.byRange('sales_invoices', 'date', from || undefined, to || undefined)
  const term = String(search).trim().toLowerCase()
  return rows
    .filter((row) => (status === 'all' ? true : status === 'void' ? Boolean(row.voidedAt) : row.status === status))
    .filter((row) => (customerId ? row.customerId === customerId : true))
    .filter((row) => {
      if (!term) return true
      return `${row.number || ''} ${row.customerName || ''} ${row.notes || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date))
      return byDate !== 0 ? byDate : String(b.createdAt).localeCompare(String(a.createdAt))
    })
}
