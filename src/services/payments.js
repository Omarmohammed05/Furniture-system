/**
 * Payments, receipts and installments (M6). Every payment is one ledger row;
 * invoice balances and installment statuses are derived from those rows.
 */
import { localRepository as repo } from '../data/localRepository'
import { todayIso } from '../lib/dates'
import { statusFor } from '../lib/invoiceStatus'
import { fromMinor, toMinor } from '../lib/money'
import { newRecord, touchRecord } from '../lib/records'
import { makeActivity } from './activity'
import { getSettings } from './settings'

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'transfer', label: 'تحويل بنكي' },
  { value: 'wallet', label: 'محفظة إلكترونية' },
  { value: 'cheque', label: 'شيك' },
]

export function methodLabel(value) {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label || 'نقدي'
}

export function isOverdue(installment) {
  if (!installment || installment.status === 'paid' || installment.status === 'cancelled') return false
  return String(installment.dueDate) < todayIso()
}

export function installmentRemaining(installment) {
  return Math.max(0, (Number(installment?.amount) || 0) - (Number(installment?.paidAmount) || 0))
}

async function refreshInvoice(invoiceType, invoiceId) {
  const table = invoiceType === 'sale' ? 'sales_invoices' : 'purchase_invoices'
  const invoice = await repo.get(table, invoiceId)
  if (!invoice) return null
  const direction = invoiceType === 'sale' ? 'in' : 'out'
  const payments = (await repo.all('payments')).filter(
    (row) => row.invoiceType === invoiceType && row.invoiceId === invoiceId && row.direction === direction,
  )
  const paid = payments.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const updated = touchRecord(invoice, {
    paid,
    status: statusFor(paid, invoice.total, { voided: Boolean(invoice.voidedAt) }),
  })
  await repo.put(table, updated)
  return updated
}

/** B13: a payment covers the oldest due installment first. */
async function applyToInstallments(invoiceId, amount) {
  const open = (await repo.all('installments'))
    .filter((row) => row.salesInvoiceId === invoiceId && row.status !== 'cancelled' && row.status !== 'paid')
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || a.seq - b.seq)

  let left = amount
  const updates = []
  for (const row of open) {
    if (left <= 0) break
    const due = installmentRemaining(row)
    if (due <= 0) continue
    const pay = Math.min(due, left)
    left -= pay
    const paidAmount = (Number(row.paidAmount) || 0) + pay
    updates.push(touchRecord(row, { paidAmount, status: paidAmount >= row.amount ? 'paid' : 'due' }))
  }
  if (updates.length) await repo.bulkPut('installments', updates)
}

export async function recordCustomerReceipt({ customerId, invoiceId = null, amount, method = 'cash', date, note = '' }) {
  const settings = await getSettings()
  const minor = toMinor(amount)
  if (!customerId) throw new Error('اختر العميل')
  if (!(minor > 0)) throw new Error('المبلغ يجب أن يكون أكبر من صفر')

  const customer = await repo.get('customers', customerId)
  if (!customer) throw new Error('العميل غير موجود')
  if (!invoiceId && customer.isWalkIn) throw new Error('«عميل نقدي» لا يكون له حساب آجل')

  let invoice = null
  if (invoiceId) {
    invoice = await repo.get('sales_invoices', invoiceId)
    if (!invoice) throw new Error('الفاتورة غير موجودة')
    if (invoice.voidedAt) throw new Error('الفاتورة ملغاة')
  }

  const record = newRecord(settings.app.deviceId || 'A', {
    direction: 'in',
    partyType: 'customers',
    partyId: customerId,
    partyName: customer.name,
    invoiceType: invoiceId ? 'sale' : null,
    invoiceId: invoiceId || null,
    invoiceNumber: invoice?.number || '',
    amount: minor,
    method,
    date: date || todayIso(),
    note: String(note || '').trim(),
  })

  await repo.transaction(
    'rw',
    ['payments', 'installments', 'sales_invoices', 'activity_log'],
    async () => {
      await repo.put('payments', record)
      if (invoiceId) {
        await applyToInstallments(invoiceId, minor)
        await refreshInvoice('sale', invoiceId)
      }
      await repo.put(
        'activity_log',
        makeActivity({
          action: 'payments.receipt',
          entity: 'payments',
          entityId: record.id,
          note: `تحصيل ${fromMinor(minor).toFixed(2)} من «${customer.name}»`,
          deviceId: record.deviceId,
        }),
      )
    },
  )

  return record
}

export async function recordSupplierPayment({ supplierId, invoiceId = null, amount, method = 'cash', date, note = '' }) {
  const settings = await getSettings()
  const minor = toMinor(amount)
  if (!supplierId) throw new Error('اختر المورد')
  if (!(minor > 0)) throw new Error('المبلغ يجب أن يكون أكبر من صفر')

  const supplier = await repo.get('suppliers', supplierId)
  if (!supplier) throw new Error('المورد غير موجود')

  let invoice = null
  if (invoiceId) {
    invoice = await repo.get('purchase_invoices', invoiceId)
    if (!invoice) throw new Error('الفاتورة غير موجودة')
    if (invoice.voidedAt) throw new Error('الفاتورة ملغاة')
  }

  const record = newRecord(settings.app.deviceId || 'A', {
    direction: 'out',
    partyType: 'suppliers',
    partyId: supplierId,
    partyName: supplier.name,
    invoiceType: invoiceId ? 'purchase' : null,
    invoiceId: invoiceId || null,
    invoiceNumber: invoice?.number || '',
    amount: minor,
    method,
    date: date || todayIso(),
    note: String(note || '').trim(),
  })

  await repo.transaction('rw', ['payments', 'purchase_invoices', 'activity_log'], async () => {
    await repo.put('payments', record)
    if (invoiceId) await refreshInvoice('purchase', invoiceId)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'payments.supplier',
        entity: 'payments',
        entityId: record.id,
        note: `دفع ${fromMinor(minor).toFixed(2)} للمورد «${supplier.name}»`,
        deviceId: record.deviceId,
      }),
    )
  })

  return record
}

/** Collects one installment in full (the invoice stays the source of truth). */
export async function payInstallment(id, { method = 'cash', date } = {}) {
  const installment = await repo.get('installments', id)
  if (!installment) throw new Error('القسط غير موجود')
  if (installment.status === 'paid') throw new Error('القسط مدفوع بالفعل')
  if (installment.status === 'cancelled') throw new Error('القسط ملغي')
  const due = installmentRemaining(installment)
  if (due <= 0) throw new Error('لا يوجد مبلغ متبقٍ على هذا القسط')

  const invoice = await repo.get('sales_invoices', installment.salesInvoiceId)
  if (!invoice) throw new Error('الفاتورة غير موجودة')
  if (invoice.voidedAt) throw new Error('الفاتورة ملغاة')

  return recordCustomerReceipt({
    customerId: installment.customerId || invoice.customerId,
    invoiceId: installment.salesInvoiceId,
    amount: fromMinor(due),
    method,
    date,
    note: `سداد قسط ${installment.seq} من ${installment.count || ''}`.trim(),
  })
}

export async function listInstallments({ filter = 'open' } = {}) {
  const [rows, invoices] = await Promise.all([repo.all('installments'), repo.all('sales_invoices')])
  const byId = new Map(invoices.map((invoice) => [invoice.id, invoice]))

  return rows
    .filter((row) => (filter === 'all' ? true : row.status !== 'cancelled'))
    .filter((row) => {
      if (filter === 'overdue') return isOverdue(row)
      if (filter === 'paid') return row.status === 'paid'
      if (filter === 'open') return row.status !== 'paid'
      return true
    })
    .map((row) => ({ ...row, invoice: byId.get(row.salesInvoiceId) || null }))
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
}

export async function listOverdueInstallments() {
  return listInstallments({ filter: 'overdue' })
}

export async function listPayments({ direction = 'all', search = '', from = '', to = '' } = {}) {
  const rows = await repo.all('payments')
  const term = String(search).trim().toLowerCase()
  return rows
    .filter((row) => (direction === 'all' ? true : row.direction === direction))
    .filter((row) => (from ? row.date >= from : true))
    .filter((row) => (to ? row.date <= to : true))
    .filter((row) => {
      if (!term) return true
      return `${row.partyName || ''} ${row.invoiceNumber || ''} ${row.note || ''}`.toLowerCase().includes(term)
    })
    .sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date))
      return byDate !== 0 ? byDate : String(b.createdAt).localeCompare(String(a.createdAt))
    })
}

export async function listInvoicePayments(invoiceType, invoiceId) {
  const rows = await repo.all('payments')
  return rows
    .filter((row) => row.invoiceType === invoiceType && row.invoiceId === invoiceId)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
}
