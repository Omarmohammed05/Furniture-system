/**
 * Demo dataset — loaded once from Settings → بيانات تجريبية.
 *
 * Every row goes through the normal service layer (items, purchases,
 * production, sales, payments, payroll, expenses), so the ledgers, balances
 * and reports this data feeds stay exactly as consistent as if the owner had
 * entered it by hand. Nothing here writes raw rows behind the services.
 */
import { repository as repo } from '../data/repository'
import { addDays, currentMonth, todayIso } from '../lib/dates'
import { toMinor } from '../lib/money'
import { createExpense } from './expenses'
import { createItem } from './items'
import { recordProduction } from './inventory'
import { createCategory, listCategories, listUnits } from './masterData'
import { createParty, listParties } from './parties'
import {
  addAdjustment,
  createAdvance,
  generatePayroll,
  listPaySlips,
  markPaySlipPaid,
} from './payroll'
import { payInstallment, recordCustomerReceipt, recordSupplierPayment } from './payments'
import { createPurchaseInvoice } from './purchases'
import { createSalesInvoice } from './sales'
import { getSettings } from './settings'
import { createWorker } from './workers'

const PRODUCT_CATEGORY = 'منتجات جاهزة'
const ITEM_CATEGORIES = ['خشب وألواح', 'أقمشة وإسفنج', 'دهانات ومستلزمات', PRODUCT_CATEGORY]

const SUPPLIERS = [
  { key: 'wood', name: 'مصنع النيل للأخشاب', phone: '01001234567', address: 'المنطقة الصناعية — ٦ أكتوبر' },
  { key: 'fabric', name: 'الحرير للأقمشة والإسفنج', phone: '01122334455', address: 'شبرا الخيمة' },
  { key: 'paint', name: 'دهانات الشرق', phone: '01233445566', address: 'المعادي' },
  { key: 'tools', name: 'الشرق للمستلزمات الصناعية', phone: '01555667788', address: 'العتبة' },
]

const CUSTOMERS = [
  { key: 'mahmoud', name: 'أ. محمود عبد الرحمن', phone: '01098765432', address: 'مدينة نصر' },
  { key: 'ferdos', name: 'شركة الفردوس للتأثيث', phone: '01112345678', address: 'التجمع الخامس', openingBalance: 2500 },
  { key: 'sara', name: 'د. سارة حسن', phone: '01234567890', address: 'المهندسين' },
  { key: 'karim', name: 'أ. كريم فتحي', phone: '01567890123', address: 'الشروق' },
  { key: 'nakheel', name: 'فندق النخيل', phone: '0133334444', address: 'العلمين الجديدة' },
  { key: 'mona', name: 'أ. منى إبراهيم', phone: '01011223344', address: 'المعادي' },
  { key: 'ahmed', name: 'أ. أحمد الشريف', phone: '01299887766', address: 'الشيخ زايد' },
]

const RAW_ITEMS = [
  { key: 'mdf', name: 'خشب MDF 18 مم', code: 'RM-001', category: 'خشب وألواح', unit: 'لوح', price: 850, minStock: 45 },
  { key: 'zan', name: 'خشب زان طبيعي', code: 'RM-002', category: 'خشب وألواح', unit: 'متر مربع', price: 1200, minStock: 10 },
  { key: 'fabric', name: 'قماش كتان', code: 'RM-003', category: 'أقمشة وإسفنج', unit: 'متر', price: 220, minStock: 60 },
  { key: 'foam', name: 'إسفنج كثافة ٣٠', code: 'RM-004', category: 'أقمشة وإسفنج', unit: 'قطعة', price: 380, minStock: 15 },
  { key: 'paint', name: 'دهان لاكيه أبيض', code: 'RM-005', category: 'دهانات ومستلزمات', unit: 'كجم', price: 145, minStock: 20 },
  { key: 'screws', name: 'مسامير وبراغي', code: 'RM-006', category: 'دهانات ومستلزمات', unit: 'علبة', price: 65, minStock: 10 },
]

const PRODUCTS = [
  { key: 'sofa', name: 'كنبة ٣ مقاعد', code: 'PR-001', price: 18500, cost: 11200, minStock: 2 },
  { key: 'dining', name: 'سفرة ٦ كراسي', code: 'PR-002', price: 24000, cost: 14500, minStock: 1 },
  { key: 'wardrobe', name: 'دولاب ٣ أبواب', code: 'PR-003', price: 15750, cost: 9600, minStock: 1 },
  { key: 'bed', name: 'سرير نفرين', code: 'PR-004', price: 12800, cost: 7800, minStock: 2 },
  { key: 'armchair', name: 'كرسي فوتيه', code: 'PR-005', price: 4200, cost: 2400, minStock: 4 },
  { key: 'tvunit', name: 'وحدة تلفزيون', code: 'PR-006', price: 6100, cost: 3400, minStock: 2 },
]

const PURCHASES = [
  { ago: 32, supplier: 'wood', lines: [['mdf', 40, 850], ['zan', 10, 1200]], paid: 30000 },
  { ago: 28, supplier: 'fabric', lines: [['fabric', 120, 220], ['foam', 30, 380]], paid: 37800 },
  { ago: 24, supplier: 'paint', lines: [['paint', 50, 145]], paid: 0 },
  { ago: 18, supplier: 'tools', lines: [['screws', 30, 65]], paid: 1000 },
  { ago: 9, supplier: 'wood', lines: [['mdf', 30, 850], ['zan', 5, 1200]], paid: 20000 },
  { ago: 2, supplier: 'fabric', lines: [['fabric', 40, 220]], paid: 0, notes: 'دفعة أقمشة الموسم الشتوي' },
]

const PRODUCTION = [
  { ago: 20, product: 'sofa', qty: 6, materials: [['mdf', 12], ['fabric', 36], ['foam', 12]] },
  { ago: 16, product: 'dining', qty: 4, materials: [['zan', 8], ['paint', 8]] },
  { ago: 14, product: 'wardrobe', qty: 5, materials: [['mdf', 10], ['paint', 10]] },
  { ago: 12, product: 'bed', qty: 6, materials: [['mdf', 8], ['paint', 6]] },
  { ago: 8, product: 'armchair', qty: 8, materials: [['fabric', 16], ['foam', 8]] },
  { ago: 6, product: 'tvunit', qty: 4, materials: [['mdf', 4], ['screws', 2]] },
]

const SALES = [
  {
    ago: 30,
    customer: 'mahmoud',
    lines: [['sofa', 2, 18500]],
    discount: 2000,
    paid: 15000,
    installments: { count: 4, firstDueAgo: 10 },
    paySeq: [1],
    payAgo: 5,
  },
  {
    ago: 26,
    customer: 'nakheel',
    lines: [['bed', 4, 12800]],
    paid: 20000,
    installments: { count: 6, firstDueAgo: 6 },
    paySeq: [1],
    payAgo: 3,
    notes: 'تجهيز ٤ غرف لفندق النخيل',
  },
  {
    ago: 22,
    customer: 'sara',
    lines: [['wardrobe', 1, 15750]],
    paid: 0,
    installments: { count: 3, firstDueAgo: 10 },
  },
  {
    ago: 16,
    customer: 'ferdos',
    lines: [['dining', 2, 24000]],
    discount: 3000,
    paid: 25000,
    installments: { count: 4, firstDueAgo: -4 },
  },
  { ago: 12, customer: 'walkin', lines: [['armchair', 2, 4200]], paid: 8400 },
  { ago: 4, customer: 'karim', lines: [['tvunit', 1, 6100]], paid: 6100 },
  {
    ago: 2,
    customer: 'mona',
    lines: [['sofa', 1, 18500], ['armchair', 2, 4200]],
    paid: 10000,
    installments: { count: 3, firstDueAgo: -13 },
  },
  {
    ago: 1,
    customer: 'ahmed',
    lines: [['bed', 1, 12800]],
    paid: 3000,
    installments: { count: 2, firstDueAgo: -9 },
  },
  {
    ago: 0,
    customer: 'ferdos',
    lines: [['wardrobe', 1, 15750], ['dining', 1, 24000]],
    discount: 1750,
    paid: 20000,
    installments: { count: 3, firstDueAgo: -15 },
    notes: 'تشطيب دور الضيوف',
  },
]

const RECEIPTS = [
  { ago: 6, customer: 'mahmoud', amount: 3000, note: 'تحصيل نقدي' },
  { ago: 3, customer: 'ferdos', amount: 5000, note: 'دفعة تحت الحساب' },
]

const SUPPLIER_PAYMENTS = [
  { ago: 15, supplier: 'wood', amount: 10000, note: 'سداد جزء من مستحقات الأخشاب' },
  { ago: 10, supplier: 'paint', amount: 4000, note: 'سداد دفعة دهانات' },
]

const WORKERS = [
  { key: 'naggar1', name: 'محمد عبد الله', jobTitle: 'نجار', salary: 7500 },
  { key: 'naggar2', name: 'عمر سيد', jobTitle: 'نجار', salary: 6800 },
  { key: 'painter', name: 'مصطفى كامل', jobTitle: 'دهان', salary: 6200 },
  { key: 'store', name: 'حسن علي', jobTitle: 'أمين مخزن', salary: 5000 },
  { key: 'helper', name: 'إبراهيم فتحي', jobTitle: 'مساعد إنتاج', salary: 4800 },
]

const ADVANCES = [
  { worker: 'naggar1', ago: 35, amount: 2000, repayMode: 'monthly', monthlyAmount: 500 },
  { worker: 'painter', ago: 20, amount: 1500, repayMode: 'full' },
  { worker: 'store', ago: 12, amount: 800, repayMode: 'manual' },
]

const ADJUSTMENTS = [
  { worker: 'naggar1', type: 'bonus', amount: 500, note: 'مكافأة إنتاج' },
  { worker: 'painter', type: 'deduction', amount: 300, note: 'تأخير' },
]

const PAID_WORKERS = ['naggar1', 'naggar2', 'store']

const EXPENSES = [
  { ago: 34, category: 'إيجار', amount: 9000, note: 'إيجار المعرض — الشهر الماضي' },
  { ago: 28, category: 'كهرباء', amount: 1450, note: 'فاتورة كهرباء' },
  { ago: 20, category: 'مواصلات', amount: 700, note: 'نقل خامات' },
  { ago: 14, category: 'صيانة', amount: 2300, note: 'صيانة ماكينة تقطيع' },
  { ago: 9, category: 'أخرى', amount: 450, note: 'مستلزمات نظافة' },
  { ago: 4, category: 'إيجار', amount: 9000, note: 'إيجار المعرض — الشهر الحالي' },
  { ago: 2, category: 'كهرباء', amount: 1320, note: 'فاتورة كهرباء' },
]

let running = false

/** Loads the demo dataset once; refuses to touch a database that has data. */
export async function loadDemoData() {
  if (running) throw new Error('جارٍ تحميل البيانات التجريبية بالفعل')

  running = true
  try {
    const settings = await getSettings()
    if (!settings.app.initialized) throw new Error('أكمل إعداد المعرض أولاً')

    const [salesCount, itemCount] = await Promise.all([
      repo.count('sales_invoices'),
      repo.count('items'),
    ])
    if (salesCount || itemCount) {
      throw new Error('توجد بيانات بالفعل — تُحمّل البيانات التجريبية على قاعدة بيانات فارغة فقط')
    }

    const today = todayIso()
    const day = (ago) => addDays(today, -Number(ago || 0))
    const month = currentMonth()
    const previousMonth = currentMonth(new Date(new Date(`${month}-01T12:00:00`).getTime() - 86400000))

    /* ---------- lists ---------- */
    const units = await listUnits()
    const unitId = (name) => units.find((unit) => unit.name === name)?.id || null

    const categoryIds = {}
    for (const name of ITEM_CATEGORIES) {
      const created = await createCategory({ name, kind: 'item' })
      categoryIds[name] = created.id
    }

    /* ---------- items ---------- */
    const items = {}
    for (const item of RAW_ITEMS) {
      items[item.key] = await createItem({
        type: 'raw_material',
        name: item.name,
        code: item.code,
        categoryId: categoryIds[item.category],
        unitId: unitId(item.unit),
        purchasePrice: item.price,
        salePrice: 0,
        minStock: item.minStock,
      })
    }
    for (const product of PRODUCTS) {
      items[product.key] = await createItem({
        type: 'product',
        name: product.name,
        code: product.code,
        categoryId: categoryIds[PRODUCT_CATEGORY],
        unitId: unitId('قطعة'),
        purchasePrice: product.cost,
        salePrice: product.price,
        minStock: product.minStock,
      })
    }

    /* ---------- parties ---------- */
    const suppliers = {}
    for (const supplier of SUPPLIERS) {
      suppliers[supplier.key] = await createParty('suppliers', supplier)
    }
    const customers = {}
    for (const customer of CUSTOMERS) {
      customers[customer.key] = await createParty('customers', customer)
    }
    customers.walkin = (await listParties('customers')).find((row) => row.isWalkIn)
    if (!customers.walkin) throw new Error('«عميل نقدي» غير موجود — أكمل إعداد المعرض أولاً')

    /* ---------- purchases → production → sales ---------- */
    for (const purchase of PURCHASES) {
      await createPurchaseInvoice({
        supplierId: suppliers[purchase.supplier].id,
        date: day(purchase.ago),
        lines: purchase.lines.map(([key, qty, price]) => ({ itemId: items[key].id, qty, unitPrice: price })),
        paid: purchase.paid || 0,
        method: 'cash',
        notes: purchase.notes || '',
      })
    }

    for (const entry of PRODUCTION) {
      await recordProduction({
        productId: items[entry.product].id,
        qty: entry.qty,
        date: day(entry.ago),
        materials: entry.materials.map(([key, qty]) => ({ itemId: items[key].id, qty })),
      })
    }

    let invoiceCount = 0
    for (const sale of SALES) {
      const date = day(sale.ago)
      const invoice = await createSalesInvoice({
        customerId: customers[sale.customer].id,
        date,
        lines: sale.lines.map(([key, qty, price]) => ({ itemId: items[key].id, qty, unitPrice: price })),
        discountType: 'amount',
        // Invoice arithmetic works in piasters, so the invoice-level amount
        // discount is sent in minor units.
        discountValue: toMinor(sale.discount),
        paid: sale.paid || 0,
        method: 'cash',
        notes: sale.notes || '',
        installment: sale.installments
          ? {
              count: sale.installments.count,
              firstDue: day(sale.installments.firstDueAgo),
              intervalDays: 30,
            }
          : undefined,
      })
      invoiceCount += 1

      for (const seq of sale.paySeq || []) {
        const rows = await repo.byIndex('installments', 'salesInvoiceId', invoice.id)
        const row = rows.find((entry) => entry.seq === seq)
        if (row && row.status !== 'paid') {
          await payInstallment(row.id, { method: 'cash', date: day(sale.payAgo ?? 1) })
        }
      }
    }

    /* ---------- receipts and supplier payments ---------- */
    for (const receipt of RECEIPTS) {
      await recordCustomerReceipt({
        customerId: customers[receipt.customer].id,
        amount: receipt.amount,
        date: day(receipt.ago),
        note: receipt.note,
      })
    }
    for (const payment of SUPPLIER_PAYMENTS) {
      await recordSupplierPayment({
        supplierId: suppliers[payment.supplier].id,
        amount: payment.amount,
        date: day(payment.ago),
        note: payment.note,
      })
    }

    /* ---------- workers, advances, payroll ---------- */
    const workers = {}
    for (const worker of WORKERS) {
      workers[worker.key] = await createWorker({
        name: worker.name,
        jobTitle: worker.jobTitle,
        monthlySalary: worker.salary,
        hireDate: day(240),
      })
    }
    for (const advance of ADVANCES) {
      await createAdvance({
        workerId: workers[advance.worker].id,
        date: day(advance.ago),
        amount: advance.amount,
        repayMode: advance.repayMode,
        monthlyAmount: advance.monthlyAmount || 0,
        note: 'سلفة',
      })
    }
    for (const adjustment of ADJUSTMENTS) {
      await addAdjustment({
        workerId: workers[adjustment.worker].id,
        month: previousMonth,
        type: adjustment.type,
        amount: adjustment.amount,
        note: adjustment.note,
      })
    }

    await generatePayroll(previousMonth)
    const paidOn = `${previousMonth}-28`
    const slips = await listPaySlips(previousMonth)
    for (const key of PAID_WORKERS) {
      const slip = slips.find((row) => row.workerId === workers[key].id)
      if (slip && slip.status !== 'paid') await markPaySlipPaid(slip.id, { method: 'cash', date: paidOn })
    }
    await generatePayroll(month)

    /* ---------- expenses ---------- */
    const expenseCategories = await listCategories('expense')
    for (const expense of EXPENSES) {
      const category = expenseCategories.find((row) => row.name === expense.category) || expenseCategories[0]
      if (!category) break
      await createExpense({
        date: day(expense.ago),
        categoryId: category.id,
        amount: expense.amount,
        method: 'cash',
        note: expense.note,
      })
    }

    return {
      suppliers: SUPPLIERS.length,
      customers: CUSTOMERS.length,
      items: Object.keys(items).length,
      invoices: invoiceCount + PURCHASES.length,
      expenses: EXPENSES.length,
      workers: WORKERS.length,
    }
  } finally {
    running = false
  }
}
