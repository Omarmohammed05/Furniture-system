/**
 * Account statements (M9). Everything is derived from invoices and payments:
 *
 *   customer: balance = opening + invoices − receipts   (positive = they owe us)
 *   supplier: balance = opening + invoices − payments   (positive = we owe them)
 *
 * Documents dated before `from` are folded into the opening balance, so the
 * running balance always starts from what was owed on the first day shown.
 */
import { repository as repo } from '../data/repository'

function signed(entry, isCustomer) {
  return isCustomer ? entry.debit - entry.credit : entry.credit - entry.debit
}

function invoiceEntry(invoice, isCustomer) {
  const amount = Number(invoice.total) || 0
  return {
    id: invoice.id,
    date: invoice.date,
    at: invoice.createdAt || invoice.date,
    kind: 'invoice',
    label: isCustomer ? 'فاتورة بيع' : 'فاتورة شراء',
    number: invoice.number,
    link: isCustomer ? `/sales/${invoice.id}` : `/purchases/${invoice.id}`,
    debit: isCustomer ? amount : 0,
    credit: isCustomer ? 0 : amount,
  }
}

function paymentEntry(payment) {
  const amount = Number(payment.amount) || 0
  const moneyIn = payment.direction === 'in'
  return {
    id: payment.id,
    date: payment.date,
    at: payment.createdAt || payment.date,
    kind: 'payment',
    label: moneyIn ? 'سند تحصيل' : 'سند دفع',
    number: payment.invoiceNumber || '',
    link: null,
    debit: moneyIn ? 0 : amount,
    credit: moneyIn ? amount : 0,
  }
}

export async function getStatement(kind, partyId, { from = '', to = '' } = {}) {
  const isCustomer = kind === 'customers'
  if (!isCustomer && kind !== 'suppliers') throw new Error('نوع حساب غير معروف')
  if (!partyId) return null

  // Both reads use an index on the party, so a statement never scans the
  // whole invoice and payment history.
  const [party, invoices, payments] = await Promise.all([
    repo.get(isCustomer ? 'customers' : 'suppliers', partyId),
    repo.byIndex(
      isCustomer ? 'sales_invoices' : 'purchase_invoices',
      isCustomer ? 'customerId' : 'supplierId',
      partyId,
    ),
    repo.byIndex('payments', '[partyType+partyId]', [kind, partyId]),
  ])
  if (!party) return null

  const entries = [
    ...invoices
      .filter((invoice) => !invoice.voidedAt)
      .map((invoice) => invoiceEntry(invoice, isCustomer)),
    ...payments.map((payment) => paymentEntry(payment)),
  ].sort((a, b) => {
    const byDate = String(a.date).localeCompare(String(b.date))
    return byDate !== 0 ? byDate : String(a.at).localeCompare(String(b.at))
  })

  const opening =
    (Number(party.openingBalance) || 0) +
    entries
      .filter((entry) => (from ? entry.date < from : false))
      .reduce((total, entry) => total + signed(entry, isCustomer), 0)

  let balance = opening
  const rows = []
  for (const entry of entries) {
    if (from && entry.date < from) continue
    if (to && entry.date > to) continue
    balance += signed(entry, isCustomer)
    rows.push({ ...entry, balance })
  }

  return {
    party,
    kind,
    isCustomer,
    from,
    to,
    opening,
    rows,
    closing: balance,
    totals: {
      debit: rows.reduce((total, row) => total + row.debit, 0),
      credit: rows.reduce((total, row) => total + row.credit, 0),
      movements: rows.length,
    },
  }
}

export function getCustomerStatement(id, range) {
  return getStatement('customers', id, range)
}

export function getSupplierStatement(id, range) {
  return getStatement('suppliers', id, range)
}
