/**
 * Dashboard figures (M11). Everything is read from the documents and ledgers —
 * nothing is cached or typed by hand, so the numbers always match the screens.
 */
import { localRepository as repo } from '../data/localRepository'
import { currentMonth, monthRange, todayIso } from '../lib/dates'
import { getBalancesSummary } from './balances'
import { listLowStock } from './inventory'
import { listOverdueInstallments } from './payments'
import { getNetResult } from './reports'

function sum(rows, pick) {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0)
}

function salesTotals(rows) {
  const live = rows.filter((row) => !row.voidedAt)
  return { total: sum(live, (row) => row.total), count: live.length }
}

function invoiceRow(invoice, kind) {
  return {
    id: invoice.id,
    kind,
    number: invoice.number,
    partyName: kind === 'sale' ? invoice.customerName : invoice.supplierName,
    date: invoice.date,
    total: Number(invoice.total) || 0,
    status: invoice.status,
    voidedAt: invoice.voidedAt || null,
    createdAt: invoice.createdAt || invoice.date,
  }
}

export async function getDashboardData() {
  const today = todayIso()
  const month = currentMonth()
  const { from, to } = monthRange(month)

  const [todayRows, monthRows, net, balances, lowStock, overdue, sales, purchases] = await Promise.all([
    repo.byRange('sales_invoices', 'date', today, today),
    repo.byRange('sales_invoices', 'date', from, to),
    getNetResult({ from, to }),
    getBalancesSummary(),
    listLowStock(),
    listOverdueInstallments(),
    repo.recent('sales_invoices', 'date', 10),
    repo.recent('purchase_invoices', 'date', 10),
  ])

  const recentInvoices = [...sales.map((row) => invoiceRow(row, 'sale')), ...purchases.map((row) => invoiceRow(row, 'purchase'))]
    .sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date))
      return byDate !== 0 ? byDate : String(b.createdAt).localeCompare(String(a.createdAt))
    })
    .slice(0, 10)

  const overdueAmount = sum(overdue, (row) => Math.max(0, (Number(row.amount) || 0) - (Number(row.paidAmount) || 0)))

  return {
    month,
    today: salesTotals(todayRows),
    monthSales: salesTotals(monthRows),
    net,
    customersOwe: balances.customersOwe,
    weOweSuppliers: balances.weOweSuppliers,
    lowStock: { count: lowStock.length, items: lowStock.slice(0, 5) },
    overdue: { count: overdue.length, amount: overdueAmount, items: overdue.slice(0, 5) },
    recentInvoices,
  }
}
