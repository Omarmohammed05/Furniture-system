# Furniture Showroom Management System — Features & Functions Spec

Version 1.0 · UI language: Arabic (RTL) · Docs language: English · Currency: EGP

## 1. Overview

An offline-first web app (PWA) for a furniture showroom that also manufactures its own furniture. It records purchase invoices (raw materials), sales invoices (products), customer and supplier debts, inventory, workers' monthly pay, expenses, and gives full reports. Invoices are shared via WhatsApp.

**Phase 1 context:** runs on ONE device at a time, fully offline, with a backup file (export/import). Architecture must be ready to move online later (Neon/Postgres) without rebuilding screens.

### In scope
Settings, master data, inventory, purchases, sales, payments and installments, payroll with advances, expenses, statements, reports, dashboard, backup/restore, WhatsApp sharing, printing.

### Out of scope (for now)
Per-piece manufacturing cost, multi-device live sync, online accounts, barcode scanning, sales/purchase returns, e-invoicing integration, old data migration (client has none).

## 2. Users & access

- Phase 1: single local PIN login. Data model includes `role` (owner, staff) so roles can be enabled later.
- Owner: everything. Staff (future): create invoices, no reports/settings/backup.

## 3. Modules and features

### M1 · Settings & shop profile
- S1 Shop name, logo, phone, address, invoice footer note
- S2 Currency label (default "ج.م"), 2 decimals
- S3 VAT: on/off toggle (default OFF), rate (default 14%), "prices include VAT" toggle
- S4 Invoice numbering prefixes per type and device code (e.g. `SAL-A-0001`)
- S5 Digits style: Western 0-9 (default) or Arabic-Indic
- S6 PIN lock + auto-lock timeout
- S7 Negative stock policy: block / warn (default) / allow
- S8 Default low-stock threshold
- S9 Backup reminder (days since last backup)

### M2 · Master data
- **Suppliers:** name, phone, address, notes, opening balance, active
- **Customers:** same fields; a default "Walk-in customer" always exists
- **Items:** type (`raw_material` or `product`), name, code (optional), category, unit, default purchase price, default sale price, min stock, image (optional), notes, active
- **Categories** and **Units** (piece, meter, m², kg, board, sheet, carton… editable)
- **Workers:** name, phone, job title, monthly salary, hire date, active, notes
- **Expense categories** (rent, electricity, transport, maintenance, other… editable)

### M3 · Inventory
- Stock is a **ledger of movements** (never an overwritten number)
- Movement types: `purchase_in`, `sale_out`, `production_in`, `production_out`, `adjustment_in`, `adjustment_out`, `void_reversal`
- Stock list with search, category filter, low-stock filter
- Item card: movement history with running balance
- Stock adjustment (stocktake) with required reason
- **Production entry (no costing):** product, quantity, date, optional list of raw materials consumed → adds product stock, subtracts raw stock
- Low-stock alerts on dashboard

### M4 · Purchase invoices (raw materials / items)
- Supplier, date, lines (item, qty, unit price), discount, VAT (if enabled), notes
- Payment at creation: amount paid now + method (cash, transfer, wallet, cheque)
- Status auto: unpaid / partial / paid
- Effects: stock IN, supplier balance up, payment recorded
- Edit, void (reverses stock and balances), duplicate, print/share

### M5 · Sales invoices
- Customer (or walk-in), date, lines (product, qty, unit price), discount (amount or %), VAT (if enabled), delivery/notes
- Down payment at creation + method
- Optional **installment plan:** number of installments, first due date, interval → schedule of due dates and amounts
- Effects: stock OUT, customer balance up, payment recorded
- Stock policy applied per setting S7
- Edit, void, duplicate, print, **share on WhatsApp**

### M6 · Payments, debts & installments
- Receipt from customer (against an invoice or on account)
- Payment to supplier (against an invoice or on account)
- Installments list: due, paid, overdue (red), due this week
- Debts screens: customers who owe us, suppliers we owe, aging buckets (0-30, 31-60, 60+)
- Payment receipt can be shared on WhatsApp

### M7 · Workers & payroll (monthly)
- **Advances (سلف):** worker, date, amount, note, repayment mode (full next payroll / fixed monthly amount / manual), outstanding balance
- **Adjustments:** bonus or deduction with note, per worker per month
- **Payroll run per month:** one pay slip per active worker:
  `net = base salary + bonuses − deductions − advance repayment`
- Pay slip statuses: draft → paid (with date and method)
- Pay slip print and WhatsApp share; monthly payroll summary

### M8 · Expenses
- Date, category, amount, method, note
- Monthly totals by category

### M9 · Account statements
- Customer statement and supplier statement for a date range
- Columns: date, document, debit, credit, running balance; opening and closing balance
- Print / share on WhatsApp / export Excel

### M10 · Reports (all with date-range filter, export to Excel, print)
1. Sales report (by day / month, by customer, by product)
2. Top-selling products (quantity and value)
3. Top customers
4. Purchases report (by supplier, by item)
5. Expenses by category
6. Payroll summary and advances outstanding
7. Inventory report: current stock, low stock, movement history
8. Receivables and payables aging
9. Cash movements (money in vs money out by method)
10. **Estimated net result:** sales − purchases − expenses − payroll paid (see rule B9)

### M11 · Dashboard
Today's sales, this month's sales, estimated net result this month, customers owe us, we owe suppliers, low-stock items, overdue installments, last 10 invoices, quick buttons (new sale, new purchase, receipt, payment, expense).

### M12 · Backup & data safety
- Export full backup to one `.json` file (versioned, checksummed)
- Import backup: validate → automatic safety export of current data → replace → report
- Excel export for lists and reports
- Request persistent storage; warn if storage is low
- Backup reminder; "last backup" shown in header
- **Future:** upload/restore to Neon (same JSON format)

### M13 · Sharing & printing
- Invoice, receipt, statement, pay slip → printable A4 and shareable as image/PDF
- WhatsApp: open `wa.me/<phone>` with a text summary; on mobile also attach the file via the Web Share API
- Logo and shop name on every document, Arabic RTL layout

### M14 · Audit
- Invoices are voided, never hard-deleted
- Activity log for create/edit/void/restore/backup with timestamp

## 4. Function catalog (domain services)

**Settings:** `getSettings()`, `updateSettings(patch)`, `setPin(pin)`, `verifyPin(pin)`
**Master data:** `createSupplier/Customer/Item/Worker/Category/Unit(input)`, `update…(id, patch)`, `archive…(id)`, `list…(filters)`, `getCustomerBalance(id)`, `getSupplierBalance(id)`
**Inventory:** `getStock(itemId)`, `listStock(filters)`, `getItemMovements(itemId, range)`, `recordAdjustment({itemId, qtyDelta, reason})`, `recordProduction({productId, qty, date, materials[]})`, `listLowStock()`
**Purchases:** `createPurchaseInvoice(input)`, `updatePurchaseInvoice(id, input)`, `voidPurchaseInvoice(id, reason)`, `getPurchaseInvoice(id)`, `listPurchaseInvoices(filters)`
**Sales:** `createSalesInvoice(input)`, `updateSalesInvoice(id, input)`, `voidSalesInvoice(id, reason)`, `getSalesInvoice(id)`, `listSalesInvoices(filters)`, `buildInstallmentPlan({total, count, firstDue, intervalDays})`
**Payments:** `recordCustomerReceipt({customerId, invoiceId?, amount, method, date})`, `recordSupplierPayment({supplierId, invoiceId?, amount, method, date})`, `markInstallmentPaid(id, paymentId)`, `listOverdueInstallments()`, `getAging(type)`
**Payroll:** `createAdvance(input)`, `listAdvances(workerId)`, `getAdvanceBalance(workerId)`, `addAdjustment({workerId, month, type, amount, note})`, `generatePayroll(month)`, `updatePaySlip(id, patch)`, `markPaySlipPaid(id, method, date)`, `getPayrollSummary(month)`
**Expenses:** `createExpense(input)`, `updateExpense`, `voidExpense`, `listExpenses(filters)`
**Statements:** `getCustomerStatement(id, range)`, `getSupplierStatement(id, range)`
**Reports:** `salesReport(range, groupBy)`, `topProducts(range)`, `topCustomers(range)`, `purchasesReport(range, groupBy)`, `expensesReport(range)`, `inventoryReport()`, `cashMovements(range)`, `estimatedNetResult(range)`, `dashboardSummary()`
**Documents:** `renderInvoiceHtml(id)`, `exportToPdfOrImage(el)`, `shareOnWhatsApp({phone, text, file?})`, `printDocument(el)`
**Backup:** `exportBackup()`, `validateBackup(file)`, `importBackup(file)`, `exportExcel(tableOrReport)`, `getLastBackupAt()`
**Utilities:** `nextNumber(type)`, `toMinor(amount)`, `fromMinor(minor)`, `formatMoney(minor)`, `calcInvoiceTotals(lines, discount, vat)`

## 5. Business rules

- **B1 Money:** stored as integers in piasters (minor units); never floats.
- **B2 Quantities:** decimals allowed (3 places) for meters, kg, etc.
- **B3 Customer balance** = opening + sales totals − receipts. Positive = customer owes us.
- **B4 Supplier balance** = opening + purchase totals − payments. Positive = we owe supplier.
- **B5 Invoice status:** `paid` if remaining = 0, `partial` if some paid, otherwise `unpaid`; `void` overrides all.
- **B6 Void:** creates reversing stock movements, removes invoice from balances and reports, keeps the record visible with a "void" mark.
- **B7 Edit:** recalculates stock and balances inside one transaction; previous snapshot saved in the activity log.
- **B8 Negative stock:** follows setting S7 for sales and production consumption.
- **B9 Estimated net result:** (sales excl. VAT) − (purchases excl. VAT) − expenses − payroll paid, by invoice date. It is NOT a cost-of-goods profit; label it "estimated" everywhere because per-piece costing is out of scope.
- **B10 VAT:** if disabled, no VAT lines appear anywhere. If enabled, VAT is shown on invoices and reports separately.
- **B11 Numbering:** sequential per type and device code, never reused, even after void.
- **B12 Payroll:** advance repayment never exceeds outstanding advance; net pay cannot go below zero (excess carries over as remaining advance).
- **B13 Installments:** overdue = due date passed and unpaid; payments apply to the oldest due installment first.
- **B14 Walk-in customer:** cannot have debts; a sale with remaining balance requires a named customer.
- **B15 Archive:** items/parties with history can be archived, not deleted.

## 6. Non-functional requirements

- Works fully offline after first load; installable on desktop and mobile
- Arabic RTL, large readable fonts, simple flows (owner is not technical)
- Fast: lists with 10,000+ rows stay smooth (indexed queries, pagination)
- Fonts and assets bundled locally (no CDN dependency offline)
- Every write is atomic (single DB transaction per business action)
- Data never leaves the device unless the user exports a backup

## 7. Assumptions to confirm with client

- Only the owner uses the app in phase 1 (no roles UI yet)
- Egypt phone numbers normalized to `+20` for WhatsApp
- A4 printing is enough (thermal 80mm optional later)
