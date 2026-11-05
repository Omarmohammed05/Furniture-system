/**
 * Reports (M10). Every figure is derived from invoices, lines, payments,
 * expenses, stock movements and pay slips — nothing is stored twice.
 *
 * Money is integer piasters. "Excluding VAT" is always `total − vat`, which is
 * correct whether the owner entered prices including VAT or not.
 *
 * Report shape (rendered by `<ReportView>`, printed and exported as-is):
 *   { title, filename, estimated, summary: [{ label, value, type }],
 *     sections: [{ title, columns: [{ key, label, type }], rows, totals }] }
 * type: text | money | qty | count | date | month
 */
import { localRepository as repo } from '../data/localRepository'
import { todayIso } from '../lib/dates'
import { remainingOf } from '../lib/invoiceStatus'
import { getStockMap, movementLabel, roundQty } from './inventory'
import { PAYMENT_METHODS, methodLabel } from './payments'
import { advanceRemaining } from './payroll'
import { getSettings } from './settings'

function sum(rows, pick) {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0)
}

/** Date-range read through the `date` index (fast with thousands of rows). */
function rangedRows(table, from, to) {
  return repo.byRange(table, 'date', from || undefined, to || undefined)
}

function notVoided(rows) {
  return rows.filter((row) => !row.voidedAt)
}

/** Money before VAT, for one invoice. */
export function exVat(invoice) {
  return (Number(invoice.total) || 0) - (Number(invoice.vat) || 0)
}

function ageInDays(date, asOf) {
  const start = new Date(`${date}T12:00:00`).getTime()
  const end = new Date(`${asOf || todayAsOf()}T12:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.max(0, Math.round((end - start) / 86400000))
}

function todayAsOf() {
  return todayIso()
}

function bucketOf(days) {
  if (days <= 30) return 'current'
  if (days <= 60) return 'mid'
  return 'old'
}

function topN(rows, limit, pick) {
  return [...rows].sort((a, b) => pick(b) - pick(a)).slice(0, limit)
}

/* ---------- sales ---------- */

function salesSummary(invoices) {
  const total = sum(invoices, (row) => row.total)
  const vat = sum(invoices, (row) => row.vat)
  return [
    { label: 'عدد الفواتير', value: invoices.length, type: 'count' },
    { label: 'الإجمالي', value: total, type: 'money' },
    { label: 'بدون ضريبة', value: total - vat, type: 'money' },
    { label: 'الضريبة', value: vat, type: 'money' },
  ]
}

async function salesByPeriod(invoices, groupBy) {
  const map = new Map()
  for (const invoice of invoices) {
    const key = groupBy === 'month' ? String(invoice.date).slice(0, 7) : invoice.date
    const entry =
      map.get(key) || { key, date: key, invoices: 0, subtotal: 0, discount: 0, vat: 0, total: 0 }
    entry.invoices += 1
    entry.subtotal += Number(invoice.subtotal) || 0
    entry.discount += Number(invoice.discount) || 0
    entry.vat += Number(invoice.vat) || 0
    entry.total += Number(invoice.total) || 0
    map.set(key, entry)
  }

  const rows = [...map.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)))
  const columns = [
    { key: 'date', label: groupBy === 'month' ? 'الشهر' : 'اليوم', type: groupBy === 'month' ? 'month' : 'date' },
    { key: 'invoices', label: 'عدد الفواتير', type: 'count' },
    { key: 'subtotal', label: 'قبل الخصم', type: 'money' },
    { key: 'discount', label: 'الخصم', type: 'money' },
    { key: 'vat', label: 'الضريبة', type: 'money' },
    { key: 'total', label: 'الإجمالي', type: 'money' },
  ]
  return [{ title: groupBy === 'month' ? 'المبيعات شهرياً' : 'المبيعات يومياً', columns, rows, totals: true }]
}

function groupRows(rows, pickKey, initial, add) {
  const map = new Map()
  for (const row of rows) {
    const key = pickKey(row)
    const entry = map.get(key) || { key, ...initial() }
    add(entry, row)
    map.set(key, entry)
  }
  return [...map.values()]
}

function salesByParty(invoices) {
  const rows = groupRows(
    invoices,
    (invoice) => invoice.customerId || invoice.customerName || '—',
    () => ({ name: '', invoices: 0, total: 0, paid: 0, remaining: 0 }),
    (entry, invoice) => {
      entry.name = invoice.customerName || 'عميل نقدي'
      entry.invoices += 1
      entry.total += Number(invoice.total) || 0
      entry.paid += Number(invoice.paid) || 0
      entry.remaining += remainingOf(invoice)
    },
  ).sort((a, b) => b.total - a.total)

  return [
    {
      title: 'المبيعات حسب العميل',
      columns: [
        { key: 'name', label: 'العميل', type: 'text' },
        { key: 'invoices', label: 'الفواتير', type: 'count' },
        { key: 'total', label: 'الإجمالي', type: 'money' },
        { key: 'paid', label: 'المدفوع', type: 'money' },
        { key: 'remaining', label: 'المتبقي', type: 'money' },
      ],
      rows,
      totals: true,
    },
  ]
}

async function salesByProduct(invoices) {
  const ids = new Set(invoices.map((invoice) => invoice.id))
  const lines = (await repo.all('sales_lines')).filter((line) => ids.has(line.invoiceId))

  const rows = groupRows(
    lines,
    (line) => line.itemId || line.name,
    () => ({ name: '', qty: 0, lines: 0, total: 0 }),
    (entry, line) => {
      entry.name = line.name || 'صنف'
      entry.qty = roundQty(entry.qty + (Number(line.qty) || 0))
      entry.lines += 1
      entry.total += Number(line.lineTotal) || 0
    },
  ).sort((a, b) => b.total - a.total)

  return [
    {
      title: 'المبيعات حسب الصنف',
      columns: [
        { key: 'name', label: 'الصنف', type: 'text' },
        { key: 'qty', label: 'الكمية', type: 'qty' },
        { key: 'lines', label: 'عدد البنود', type: 'count' },
        { key: 'total', label: 'القيمة', type: 'money' },
      ],
      rows,
      totals: true,
    },
  ]
}

export async function buildSalesReport({ from, to, groupBy = 'day' }) {
  const invoices = notVoided(await rangedRows('sales_invoices', from, to))
  const sections =
    groupBy === 'customer'
      ? salesByParty(invoices)
      : groupBy === 'product'
        ? await salesByProduct(invoices)
        : await salesByPeriod(invoices, groupBy)

  return {
    title: 'تقرير المبيعات',
    filename: 'sales',
    summary: salesSummary(invoices),
    sections,
  }
}

export async function buildTopProductsReport({ from, to, limit = 15 }) {
  const invoices = notVoided(await rangedRows('sales_invoices', from, to))
  const ids = new Set(invoices.map((invoice) => invoice.id))
  const lines = (await repo.all('sales_lines')).filter((line) => ids.has(line.invoiceId))

  const rows = groupRows(
    lines,
    (line) => line.itemId || line.name,
    () => ({ name: '', qty: 0, total: 0, invoices: 0 }),
    (entry, line) => {
      entry.name = line.name || 'صنف'
      entry.qty = roundQty(entry.qty + (Number(line.qty) || 0))
      entry.total += Number(line.lineTotal) || 0
      entry.invoices += 1
    },
  )

  const top = topN(rows, limit, (row) => row.total)
  return {
    title: 'الأصناف الأكثر مبيعاً',
    filename: 'top-products',
    summary: [
      { label: 'أصناف مُباعة', value: rows.length, type: 'count' },
      { label: 'إجمالي قيمة المبيعات', value: sum(invoices, (row) => row.total), type: 'money' },
    ],
    sections: [
      {
        title: `أعلى ${limit} صنفاً بالقيمة`,
        columns: [
          { key: 'name', label: 'الصنف', type: 'text' },
          { key: 'qty', label: 'الكمية', type: 'qty' },
          { key: 'invoices', label: 'مرات البيع', type: 'count' },
          { key: 'total', label: 'القيمة', type: 'money' },
        ],
        rows: top,
        totals: true,
      },
    ],
  }
}

export async function buildTopCustomersReport({ from, to, limit = 15 }) {
  const invoices = notVoided(await rangedRows('sales_invoices', from, to))
  const rows = groupRows(
    invoices,
    (invoice) => invoice.customerId || 'walk-in',
    () => ({ name: '', invoices: 0, total: 0, paid: 0, remaining: 0 }),
    (entry, invoice) => {
      entry.name = invoice.customerName || 'عميل نقدي'
      entry.invoices += 1
      entry.total += Number(invoice.total) || 0
      entry.paid += Number(invoice.paid) || 0
      entry.remaining += remainingOf(invoice)
    },
  )

  const top = topN(rows, limit, (row) => row.total)
  return {
    title: 'أفضل العملاء',
    filename: 'top-customers',
    summary: [
      { label: 'عملاء اشتروا', value: rows.length, type: 'count' },
      { label: 'إجمالي المبيعات', value: sum(invoices, (row) => row.total), type: 'money' },
      { label: 'متبقي على العملاء', value: sum(invoices, (row) => remainingOf(row)), type: 'money' },
    ],
    sections: [
      {
        title: `أعلى ${limit} عميلاً بالقيمة`,
        columns: [
          { key: 'name', label: 'العميل', type: 'text' },
          { key: 'invoices', label: 'الفواتير', type: 'count' },
          { key: 'total', label: 'الإجمالي', type: 'money' },
          { key: 'paid', label: 'المدفوع', type: 'money' },
          { key: 'remaining', label: 'المتبقي', type: 'money' },
        ],
        rows: top,
        totals: true,
      },
    ],
  }
}

/* ---------- purchases ---------- */

export async function buildPurchasesReport({ from, to, groupBy = 'supplier' }) {
  const invoices = notVoided(await rangedRows('purchase_invoices', from, to))
  let sections

  if (groupBy === 'item') {
    const ids = new Set(invoices.map((invoice) => invoice.id))
    const lines = (await repo.all('purchase_lines')).filter((line) => ids.has(line.invoiceId))
    const rows = groupRows(
      lines,
      (line) => line.itemId || line.name,
      () => ({ name: '', qty: 0, total: 0 }),
      (entry, line) => {
        entry.name = line.name || 'صنف'
        entry.qty = roundQty(entry.qty + (Number(line.qty) || 0))
        entry.total += Number(line.lineTotal) || 0
      },
    ).sort((a, b) => b.total - a.total)

    sections = [
      {
        title: 'المشتريات حسب الصنف',
        columns: [
          { key: 'name', label: 'الصنف', type: 'text' },
          { key: 'qty', label: 'الكمية', type: 'qty' },
          { key: 'total', label: 'القيمة', type: 'money' },
        ],
        rows,
        totals: true,
      },
    ]
  } else {
    const rows = groupRows(
      invoices,
      (invoice) => invoice.supplierId || invoice.supplierName || '—',
      () => ({ name: '', invoices: 0, total: 0, paid: 0, remaining: 0 }),
      (entry, invoice) => {
        entry.name = invoice.supplierName || 'مورد'
        entry.invoices += 1
        entry.total += Number(invoice.total) || 0
        entry.paid += Number(invoice.paid) || 0
        entry.remaining += remainingOf(invoice)
      },
    ).sort((a, b) => b.total - a.total)

    sections = [
      {
        title: 'المشتريات حسب المورد',
        columns: [
          { key: 'name', label: 'المورد', type: 'text' },
          { key: 'invoices', label: 'الفواتير', type: 'count' },
          { key: 'total', label: 'الإجمالي', type: 'money' },
          { key: 'paid', label: 'المدفوع', type: 'money' },
          { key: 'remaining', label: 'المتبقي', type: 'money' },
        ],
        rows,
        totals: true,
      },
    ]
  }

  const total = sum(invoices, (row) => row.total)
  const vat = sum(invoices, (row) => row.vat)
  return {
    title: 'تقرير المشتريات',
    filename: 'purchases',
    summary: [
      { label: 'عدد الفواتير', value: invoices.length, type: 'count' },
      { label: 'الإجمالي', value: total, type: 'money' },
      { label: 'بدون ضريبة', value: total - vat, type: 'money' },
      { label: 'الضريبة', value: vat, type: 'money' },
    ],
    sections,
  }
}

/* ---------- expenses ---------- */

export async function buildExpensesReport({ from, to }) {
  const expenses = notVoided(await rangedRows('expenses', from, to))
  const rows = groupRows(
    expenses,
    (expense) => expense.categoryId || 'other',
    () => ({ name: '', count: 0, total: 0 }),
    (entry, expense) => {
      entry.name = expense.categoryName || 'بدون تصنيف'
      entry.count += 1
      entry.total += Number(expense.amount) || 0
    },
  ).sort((a, b) => b.total - a.total)

  return {
    title: 'المصروفات حسب التصنيف',
    filename: 'expenses',
    summary: [
      { label: 'عدد المصروفات', value: expenses.length, type: 'count' },
      { label: 'إجمالي المصروفات', value: sum(expenses, (row) => row.amount), type: 'money' },
    ],
    sections: [
      {
        title: 'التصنيفات',
        columns: [
          { key: 'name', label: 'التصنيف', type: 'text' },
          { key: 'count', label: 'العدد', type: 'count' },
          { key: 'total', label: 'الإجمالي', type: 'money' },
        ],
        rows,
        totals: true,
      },
    ],
  }
}

/* ---------- payroll ---------- */

export async function buildPayrollReport({ from, to }) {
  const [slips, advances, workers] = await Promise.all([
    repo.all('pay_slips'),
    repo.all('advances'),
    repo.all('workers'),
  ])

  const monthFrom = from ? String(from).slice(0, 7) : ''
  const monthTo = to ? String(to).slice(0, 7) : ''
  const inRange = slips
    .filter((slip) => (monthFrom ? slip.month >= monthFrom : true))
    .filter((slip) => (monthTo ? slip.month <= monthTo : true))
    .filter((slip) => slip.status === 'paid' || slip.status === 'draft')
    .sort((a, b) => String(a.month).localeCompare(String(b.month)) || String(a.workerName).localeCompare(String(b.workerName), 'ar'))

  const slipsSection = {
    title: 'مسير الرواتب',
    columns: [
      { key: 'month', label: 'الشهر', type: 'month' },
      { key: 'workerName', label: 'العامل', type: 'text' },
      { key: 'baseSalary', label: 'الراتب', type: 'money' },
      { key: 'bonuses', label: 'مكافآت', type: 'money' },
      { key: 'deductions', label: 'خصومات', type: 'money' },
      { key: 'advanceRepayment', label: 'سداد سلف', type: 'money' },
      { key: 'net', label: 'الصافي', type: 'money' },
      { key: 'status', label: 'الحالة', type: 'text' },
    ],
    rows: inRange.map((slip) => ({ ...slip, status: slip.status === 'paid' ? 'مصروف' : 'مسودة' })),
    totals: true,
  }

  const workerNames = new Map(workers.map((worker) => [worker.id, worker.name]))
  const outstanding = groupRows(
    advances.filter((row) => advanceRemaining(row) > 0),
    (row) => row.workerId,
    () => ({ name: '', amount: 0, repaid: 0, count: 0 }),
    (entry, row) => {
      entry.name = row.workerName || workerNames.get(row.workerId) || 'عامل'
      entry.amount += advanceRemaining(row)
      entry.repaid += Number(row.repaid) || 0
      entry.count += 1
    },
  ).sort((a, b) => b.amount - a.amount)

  const paidSlips = inRange.filter((slip) => slip.status === 'paid')
  const draftSlips = inRange.filter((slip) => slip.status === 'draft')

  return {
    title: 'ملخص الرواتب والسلف',
    filename: 'payroll',
    estimated: false,
    summary: [
      { label: 'قسائم مصروفة', value: paidSlips.length, type: 'count' },
      { label: 'رواتب مصروفة', value: sum(paidSlips, (slip) => slip.net), type: 'money' },
      { label: 'قسائم مسودة', value: draftSlips.length, type: 'count' },
      { label: 'سلف مستحقة', value: sum(outstanding, (row) => row.amount), type: 'money' },
    ],
    sections: [
      slipsSection,
      {
        title: 'السلف المستحقة على العمال (حتى اليوم)',
        columns: [
          { key: 'name', label: 'العامل', type: 'text' },
          { key: 'count', label: 'عدد السلف', type: 'count' },
          { key: 'repaid', label: 'المسدد', type: 'money' },
          { key: 'amount', label: 'المستحق', type: 'money' },
        ],
        rows: outstanding,
        totals: true,
      },
    ],
  }
}

/* ---------- inventory ---------- */

export async function buildInventoryReport({ from, to }) {
  const [items, units, movements, settings, stockMap] = await Promise.all([
    repo.all('items'),
    repo.all('units'),
    rangedRows('stock_movements', from, to),
    getSettings(),
    getStockMap(),
  ])

  const unitName = new Map(units.map((unit) => [unit.id, unit.name]))
  const defaultLimit = Number(settings?.stock?.lowStockThreshold) || 0

  const stockRows = items
    .filter((item) => !item.deletedAt)
    .map((item) => {
      const onHand = stockMap.get(item.id) || 0
      const limit = Number(item.minStock) || defaultLimit
      return {
        name: item.name,
        type: item.type === 'raw_material' ? 'خامة' : 'منتج',
        unit: unitName.get(item.unitId) || '',
        stock: onHand,
        limit,
        value: Math.round(onHand * (Number(item.purchasePrice) || 0)),
        isLow: onHand <= limit,
      }
    })
    .sort((a, b) => Number(b.isLow) - Number(a.isLow) || String(a.name).localeCompare(String(b.name), 'ar'))

  const nameOf = new Map(items.map((item) => [item.id, item.name]))
  const movementRows = movements
    .map((row) => ({
      date: row.date,
      name: nameOf.get(row.itemId) || 'صنف',
      type: row.type,
      label: movementLabel(row.type),
      qty: Number(row.qty) || 0,
      note: row.note || '',
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))

  return {
    title: 'تقرير المخزون',
    filename: 'inventory',
    summary: [
      { label: 'أصناف', value: stockRows.length, type: 'count' },
      { label: 'أصناف تحت الحد', value: stockRows.filter((row) => row.isLow).length, type: 'count' },
      { label: 'قيمة المخزون (بسعر الشراء)', value: sum(stockRows, (row) => row.value), type: 'money' },
      { label: 'حركات في الفترة', value: movementRows.length, type: 'count' },
    ],
    sections: [
      {
        title: 'المخزون الحالي',
        columns: [
          { key: 'name', label: 'الصنف', type: 'text' },
          { key: 'type', label: 'النوع', type: 'text' },
          { key: 'unit', label: 'الوحدة', type: 'text' },
          { key: 'stock', label: 'المتاح', type: 'qty' },
          { key: 'limit', label: 'حد التنبيه', type: 'qty' },
          { key: 'value', label: 'القيمة', type: 'money' },
        ],
        rows: stockRows,
        totals: false,
      },
      {
        title: 'أصناف تحت حد التنبيه',
        columns: [
          { key: 'name', label: 'الصنف', type: 'text' },
          { key: 'unit', label: 'الوحدة', type: 'text' },
          { key: 'stock', label: 'المتاح', type: 'qty' },
          { key: 'limit', label: 'حد التنبيه', type: 'qty' },
        ],
        rows: stockRows.filter((row) => row.isLow),
        totals: false,
      },
      {
        title: 'حركات المخزون في الفترة',
        columns: [
          { key: 'date', label: 'التاريخ', type: 'date' },
          { key: 'name', label: 'الصنف', type: 'text' },
          { key: 'label', label: 'الحركة', type: 'text' },
          { key: 'qty', label: 'الكمية', type: 'qty' },
          { key: 'note', label: 'ملاحظات', type: 'text' },
        ],
        rows: movementRows,
        totals: false,
      },
    ],
  }
}

/* ---------- aging ---------- */

export async function buildAgingReport({ to }) {
  const asOf = to || todayAsOf()
  const [sales, purchases, customers, suppliers] = await Promise.all([
    repo.all('sales_invoices'),
    repo.all('purchase_invoices'),
    repo.all('customers'),
    repo.all('suppliers'),
  ])

  function agingRows(invoices, parties, idField, nameField) {
    const partyNames = new Map(parties.map((party) => [party.id, party.name]))
    const rows = groupRows(
      notVoided(invoices).filter((invoice) => remainingOf(invoice) > 0),
      (invoice) => invoice[idField] || 'unknown',
      () => ({ name: '', current: 0, mid: 0, old: 0, total: 0 }),
      (entry, invoice) => {
        entry.name = partyNames.get(invoice[idField]) || invoice[nameField] || '—'
        const bucket = bucketOf(ageInDays(invoice.date, asOf))
        entry[bucket] += remainingOf(invoice)
        entry.total += remainingOf(invoice)
      },
    )

    // Opening balances have no date, so they are reported in the oldest bucket.
    for (const party of parties) {
      if (party.deletedAt || party.isWalkIn) continue
      const opening = Number(party.openingBalance) || 0
      if (opening <= 0) continue
      const existing = rows.find((row) => row.key === party.id)
      if (existing) {
        existing.old += opening
        existing.total += opening
      } else {
        rows.push({ key: party.id, name: party.name, current: 0, mid: 0, old: opening, total: opening })
      }
    }

    return rows.sort((a, b) => b.total - a.total)
  }

  const receivables = agingRows(sales, customers, 'customerId', 'customerName')
  const payables = agingRows(purchases, suppliers, 'supplierId', 'supplierName')

  const columns = [
    { key: 'name', label: 'الحساب', type: 'text' },
    { key: 'current', label: '٠–٣٠ يوم', type: 'money' },
    { key: 'mid', label: '٣١–٦٠ يوم', type: 'money' },
    { key: 'old', label: 'أكثر من ٦٠ يوم', type: 'money' },
    { key: 'total', label: 'الإجمالي', type: 'money' },
  ]

  const totalsOf = (rows) => ({
    current: sum(rows, (row) => row.current),
    mid: sum(rows, (row) => row.mid),
    old: sum(rows, (row) => row.old),
    total: sum(rows, (row) => row.total),
  })

  const owed = totalsOf(receivables)
  const due = totalsOf(payables)

  return {
    title: 'أعمار الديون',
    filename: 'aging',
    summary: [
      { label: 'مستحق لنا', value: owed.total, type: 'money' },
      { label: 'مستحق علينا', value: due.total, type: 'money' },
      { label: 'الصافي', value: owed.total - due.total, type: 'money' },
    ],
    sections: [
      { title: 'مستحقات العملاء (لنا)', columns, rows: receivables, totals: true },
      { title: 'مستحقات الموردين (علينا)', columns, rows: payables, totals: true },
    ],
  }
}

/* ---------- cash ---------- */

export async function buildCashReport({ from, to }) {
  const [payments, expenses, slips] = await Promise.all([
    rangedRows('payments', from, to),
    notVoided(await rangedRows('expenses', from, to)),
    repo.all('pay_slips'),
  ])

  const paidSlips = slips
    .filter((slip) => slip.status === 'paid' && slip.paidAt)
    .filter((slip) => (from ? String(slip.paidAt).slice(0, 10) >= from : true))
    .filter((slip) => (to ? String(slip.paidAt).slice(0, 10) <= to : true))

  const map = new Map(PAYMENT_METHODS.map((method) => [method.value, { key: method.value, name: method.label, moneyIn: 0, moneyOut: 0, net: 0 }]))
  const rowFor = (method) => {
    const key = method || 'cash'
    if (!map.has(key)) map.set(key, { key, name: methodLabel(key), moneyIn: 0, moneyOut: 0, net: 0 })
    return map.get(key)
  }

  for (const payment of payments) {
    const row = rowFor(payment.method)
    if (payment.direction === 'in') row.moneyIn += Number(payment.amount) || 0
    else row.moneyOut += Number(payment.amount) || 0
  }
  for (const expense of expenses) rowFor(expense.method).moneyOut += Number(expense.amount) || 0
  for (const slip of paidSlips) rowFor(slip.method).moneyOut += Number(slip.net) || 0

  const rows = [...map.values()].map((row) => ({ ...row, net: row.moneyIn - row.moneyOut }))
  const moneyIn = sum(rows, (row) => row.moneyIn)
  const moneyOut = sum(rows, (row) => row.moneyOut)

  return {
    title: 'الحركة النقدية حسب طريقة الدفع',
    filename: 'cash',
    summary: [
      { label: 'داخل', value: moneyIn, type: 'money' },
      { label: 'خارج', value: moneyOut, type: 'money' },
      { label: 'الصافي', value: moneyIn - moneyOut, type: 'money' },
      { label: 'قسائم رواتب مصروفة', value: paidSlips.length, type: 'count' },
    ],
    sections: [
      {
        title: 'حسب الطريقة',
        note: 'الداخل: تحصيلات العملاء. الخارج: مدفوعات الموردين والمصروفات والرواتب المصروفة.',
        columns: [
          { key: 'name', label: 'الطريقة', type: 'text' },
          { key: 'moneyIn', label: 'داخل', type: 'money' },
          { key: 'moneyOut', label: 'خارج', type: 'money' },
          { key: 'net', label: 'الصافي', type: 'money' },
        ],
        rows,
        totals: true,
      },
    ],
  }
}

/* ---------- estimated net result ---------- */

/**
 * Rule B9: sales (excl. VAT) − purchases (excl. VAT) − expenses − payroll paid.
 * Per-piece cost is not tracked, so the figure is always labelled "تقديري".
 */
export async function getNetResult({ from, to }) {
  const [sales, purchases, expenses, slips] = await Promise.all([
    notVoided(await rangedRows('sales_invoices', from, to)),
    notVoided(await rangedRows('purchase_invoices', from, to)),
    notVoided(await rangedRows('expenses', from, to)),
    repo.all('pay_slips'),
  ])

  const salesExVat = sum(sales, exVat)
  const purchasesExVat = sum(purchases, exVat)
  const expenseTotal = sum(expenses, (row) => row.amount)
  const payrollPaid = sum(
    slips.filter(
      (slip) =>
        slip.status === 'paid' &&
        slip.paidAt &&
        (!from || String(slip.paidAt).slice(0, 10) >= from) &&
        (!to || String(slip.paidAt).slice(0, 10) <= to),
    ),
    (slip) => slip.net,
  )

  return {
    salesExVat,
    purchasesExVat,
    expenses: expenseTotal,
    payrollPaid,
    net: salesExVat - purchasesExVat - expenseTotal - payrollPaid,
  }
}

export async function buildNetResultReport({ from, to }) {
  const result = await getNetResult({ from, to })

  return {
    title: 'الصافي التقديري',
    filename: 'net-result',
    estimated: true,
    summary: [
      { label: 'مبيعات بدون ضريبة', value: result.salesExVat, type: 'money' },
      { label: 'مشتريات بدون ضريبة', value: result.purchasesExVat, type: 'money' },
      { label: 'الصافي التقديري', value: result.net, type: 'money' },
    ],
    note:
      'تقديري: المبيعات بدون ضريبة − المشتريات بدون ضريبة − المصروفات − الرواتب المصروفة. تكلفة تصنيع القطعة غير محسوبة.',
    sections: [
      {
        title: 'حساب الصافي التقديري',
        columns: [
          { key: 'name', label: 'البند', type: 'text' },
          { key: 'amount', label: 'المبلغ', type: 'money' },
        ],
        rows: [
          { name: 'المبيعات (بدون ضريبة)', amount: result.salesExVat },
          { name: 'المشتريات (بدون ضريبة)', amount: -result.purchasesExVat },
          { name: 'المصروفات', amount: -result.expenses },
          { name: 'الرواتب المصروفة', amount: -result.payrollPaid },
          { name: 'الصافي التقديري', amount: result.net },
        ],
        totals: false,
      },
    ],
  }
}

/* ---------- dispatcher ---------- */

export function buildReport(key, options = {}) {
  switch (key) {
    case 'sales':
      return buildSalesReport(options)
    case 'top-products':
      return buildTopProductsReport(options)
    case 'top-customers':
      return buildTopCustomersReport(options)
    case 'purchases':
      return buildPurchasesReport(options)
    case 'expenses':
      return buildExpensesReport(options)
    case 'payroll':
      return buildPayrollReport(options)
    case 'inventory':
      return buildInventoryReport(options)
    case 'aging':
      return buildAgingReport(options)
    case 'cash':
      return buildCashReport(options)
    case 'net':
      return buildNetResultReport(options)
    default:
      throw new Error('تقرير غير معروف')
  }
}
