/**
 * Party balances, derived from documents (rules B3 and B4):
 *   customer = opening + sales − receipts      (positive: they owe us)
 *   supplier = opening + purchases − payments  (positive: we owe them)
 */
import { repository as repo } from '../data/repository'

function sum(rows, pick) {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0)
}

export async function getPartyBalances(kind) {
  const isCustomer = kind === 'customers'
  const [parties, invoices, payments] = await Promise.all([
    repo.all(isCustomer ? 'customers' : 'suppliers'),
    repo.all(isCustomer ? 'sales_invoices' : 'purchase_invoices'),
    repo.all('payments'),
  ])

  const invoiceRows = invoices.filter((invoice) => !invoice.voidedAt)
  const paymentRows = payments.filter((payment) => payment.partyType === kind)

  const map = new Map()
  for (const party of parties.filter((row) => !row.deletedAt)) {
    const own = invoiceRows.filter((invoice) => (isCustomer ? invoice.customerId : invoice.supplierId) === party.id)
    const paid = paymentRows.filter((payment) => payment.partyId === party.id)
    const total = sum(own, (invoice) => invoice.total)
    const received = sum(paid, (payment) => payment.amount)
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
