/**
 * Party balances, derived from documents (rules B3 and B4):
 *   customer = opening + sales − receipts      (positive: they owe us)
 *   supplier = opening + purchases − payments  (positive: we owe them)
 */
import { repository as repo } from '../data/repository'

export async function getPartyBalances(kind) {
  const isCustomer = kind === 'customers'
  const [parties, invoices, payments] = await Promise.all([
    repo.all(isCustomer ? 'customers' : 'suppliers'),
    repo.all(isCustomer ? 'sales_invoices' : 'purchase_invoices'),
    repo.all('payments'),
  ])

  // One pass per table instead of one scan per party: balances stay instant
  // with thousands of invoices and hundreds of accounts.
  const invoicedByParty = new Map()
  for (const invoice of invoices) {
    if (invoice.voidedAt) continue
    const partyId = isCustomer ? invoice.customerId : invoice.supplierId
    if (!partyId) continue
    invoicedByParty.set(partyId, (invoicedByParty.get(partyId) || 0) + (Number(invoice.total) || 0))
  }

  const paidByParty = new Map()
  for (const payment of payments) {
    if (payment.partyType !== kind || !payment.partyId) continue
    paidByParty.set(payment.partyId, (paidByParty.get(payment.partyId) || 0) + (Number(payment.amount) || 0))
  }

  const map = new Map()
  for (const party of parties) {
    if (party.deletedAt) continue
    const total = invoicedByParty.get(party.id) || 0
    const received = paidByParty.get(party.id) || 0
    map.set(party.id, {
      party,
      invoiced: total,
      paid: received,
      balance: (Number(party.openingBalance) || 0) + total - received,
    })
  }
  return map
}

export async function getCustomerBalance(id) {
  const map = await getPartyBalances('customers')
  return map.get(id)?.balance ?? 0
}

export async function getSupplierBalance(id) {
  const map = await getPartyBalances('suppliers')
  return map.get(id)?.balance ?? 0
}

/** Parties on one side of the ledger, biggest balance first. */
export async function listPartyBalances(kind) {
  const map = await getPartyBalances(kind)
  return [...map.values()]
    .filter((row) => !row.party.isWalkIn)
    .sort((a, b) => b.balance - a.balance)
}

/**
 * Debt aging for one side (0–30 / 31–60 / 60+ days), the same buckets the
 * aging report uses, so the debts screen and the report always agree.
 */
export async function getAging(kind = 'customers') {
  const { buildAgingReport } = await import('./reports')
  const report = await buildAgingReport({})
  const [customers, suppliers] = report.sections
  const rows = kind === 'suppliers' ? suppliers.rows : customers.rows
  const totals = rows.reduce(
    (acc, row) => ({
      current: acc.current + (Number(row.current) || 0),
      mid: acc.mid + (Number(row.mid) || 0),
      old: acc.old + (Number(row.old) || 0),
      total: acc.total + (Number(row.total) || 0),
    }),
    { current: 0, mid: 0, old: 0, total: 0 },
  )
  return { rows, totals }
}

export async function getBalancesSummary() {
  const [customers, suppliers] = await Promise.all([
    listPartyBalances('customers'),
    listPartyBalances('suppliers'),
  ])
  return {
    customersOwe: customers.filter((row) => row.balance > 0).reduce((total, row) => total + row.balance, 0),
    weOweSuppliers: suppliers.filter((row) => row.balance > 0).reduce((total, row) => total + row.balance, 0),
    customers,
    suppliers,
  }
}
