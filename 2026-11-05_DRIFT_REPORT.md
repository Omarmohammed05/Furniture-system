# Drift Report — Furniture Showroom Management System

Skill: `egm-drift-report` (google/elephant-goldfish-model), run with direct dispatch — this harness has no subagent tool, so no fresh-context Goldfish passes were spawned.
Documents under test: `README.md` (features spec) and `implementation.md` (build plan).
Source examined: `/app/src` (13.8k lines, all services, data layer, pages and helpers), `/app/vite.config.js`, `/app/package.json`, `/app/public`.

Only divergences are listed. A statement is reported only where the code was read and the described behaviour is absent or different.

## README.md

**M2 · Master data**
- Items have no image field. The spec lists "image (optional)" for items; no `imageData`/upload path exists in `src/services/items.js`, `src/pages/ItemsPage.jsx` or the item form.

**M3 · Inventory**
- The stock list has no category filter. `listStock({ search, filter })` in `src/services/inventory.js` and `src/pages/InventoryPage.jsx` support search plus low/out filters only; the spec asks for search, category filter and low-stock filter.
- `getItemMovements(itemId)` takes no date range, so the item card cannot show a ranged history (function catalog: `getItemMovements(itemId, range)`). It reads `repo.all('stock_movements')` and filters in memory.

**M4 / M5 · Purchase and sales invoices**
- No duplicate action exists. `src/pages/InvoiceViewPage.jsx` offers print, WhatsApp, edit, collect/pay and void; no duplicate invoice function exists in `src/services/purchases.js` or `src/services/sales.js`.

**M6 · Payments, debts and installments**
- A payment receipt cannot be shared on WhatsApp. `src/pages/PaymentsPage.jsx` has no share action, and `receiptShareText` in `src/lib/whatsapp.js` is imported by nothing.
- No "due this week" view. `src/pages/InstallmentsPage.jsx` filters are `open / overdue / paid / all`.
- Aging buckets are missing from the debts screens. `src/pages/DebtsPage.jsx` shows balances only; the 0–30 / 31–60 / 60+ buckets live in `buildAgingReport` (`src/services/reports.js`) reachable only from the reports page, and the catalog's `getAging(type)` service does not exist.

**M9 · Account statements**
- Statements can be printed and shared but not exported to Excel. `src/pages/StatementPage.jsx` has print and WhatsApp actions only.

**M12 · Backup and data safety**
- No list export to Excel. `src/lib/excel.js` exposes `exportReportToExcel`, used only by `src/pages/ReportsPage.jsx`; invoice, item, payment and party lists have no export.
- No low-storage warning. `SettingsPage` displays persisted state, usage and quota, but nothing warns when the quota is nearly full.

**M13 · Sharing and printing**
- Documents cannot be exported as image or PDF. The only export path is `window.print()` on the invoice, statement, pay slip and report pages; no html-to-image, canvas or PDF dependency is installed, and the Web Share API is never used to attach a file. Sending a document through WhatsApp is text-only.
- The document service functions from the catalog (`renderInvoiceHtml`, `exportToPdfOrImage`, `printDocument`, `shareOnWhatsApp`) are not present as services; printing and sharing are inlined in pages.

**M14 · Audit**
- The activity log has no screen. Rows are written by every service, but `getRecentActivity` in `src/services/overview.js` has no caller and no page lists `activity_log`.

**§4 Function catalog (shape drift)**
- `markInstallmentPaid(id, paymentId)` is implemented as `payInstallment(id, { method, date })` in `src/services/payments.js`.
- `getItemMovements(itemId, range)` and `getAging(type)` differ as described above.

**§6 Non-functional requirements**
- "Every write is atomic (single DB transaction per business action)" does not hold for invoice creation: `createSalesInvoice` and `createPurchaseInvoice` call `nextNumber()` in its own transaction and run `ensureStock` before the invoice transaction opens, so a failed invoice consumes a number and stock checks race the write.
- "Lists with 10,000+ rows stay smooth (indexed queries, pagination)" holds only for the invoice list (`PAGE_SIZE = 20`). Balances, statements, aging, stock balances, installment lists and invoice detail all read whole tables through `repo.all(...)`: `getPartyBalances`, `getStockMap`, `buildAgingReport`, `getStatement`, `listInstallments`, `getSalesInvoice`, `reverseDocumentMovements`.

## implementation.md

**§1 Architecture rules**
- Rule 3 ("every business action runs in ONE transaction") is broken by the number allocation and stock check described above.

**§2 Suggested stack**
- `react-hook-form` and `zod` are not used; forms keep their own state and services validate with a hand-rolled `ValidationError`.
- `html-to-image` and `jsPDF` are not installed, so the PNG → PDF document pipeline in §8 has no implementation.
- `date-fns` is not installed; dates come from `src/lib/dates.js`.
- Dexie, SheetJS, `crypto.randomUUID()`, hash routing and the locally bundled Cairo font match the plan.

**§5 Key flows**
- Voiding an invoice keeps its payments counted with no "refund due" flag and no warning: `voidSalesInvoice` and `voidPurchaseInvoice` mark the document, reverse stock movements and cancel open installments, but never surface the paid amount that is now owed back.
- `importBackup` does not run the planned integrity check (a parent for every line, no negative-quantity records) and reports only record counts after a restore.
- `createSalesInvoice` / `createPurchaseInvoice` allocate the invoice number outside the atomic block (see §1).

**§4 Data model**
- `items` lacks the `imageData` field the model lists; every other table, shared metadata field and index from the table is present.

**§7 PWA requirements**
- No low-storage warning (§7 asks for one alongside the estimate).
- The service worker is registered only through `UpdateBanner`, which is mounted when `import.meta.env.PROD` is true, and `vite.config.js` sets `devOptions` nowhere. The build output does contain `dist/sw.js` plus a registration call, but nothing in a development preview registers a worker, so install and airplane-mode behaviour can only be exercised against a production build.

**§12 Acceptance checklist — items that cannot pass as built**
- "Invoice image/PDF shows Arabic correctly with logo": no image/PDF export exists (M13 above).
- "5,000 invoices seeded: lists and dashboard still respond instantly": the dashboard alone performs four whole-table reads per load (`listLowStock`, `getBalancesSummary`, `getNetResult`, plus recent invoices), and no seeding or timing check exists in the repository.
- "App installs and opens with airplane mode on": not verifiable in this environment; dev preview has no service worker.
- The remaining checklist items (stock in/out/void, installments and balances, statements, payroll rules, VAT toggle, backup/restore, number uniqueness) are implemented in code but were not exercised end to end in this pass.

## Resolution log — 2026-11-05 (follow-up pass)

Fixed in code:

- M2 item images: `items.imageData` added to the item service and the item form (shrunk to 640px, stored on the device), shown as a thumbnail in the items and stock lists.
- M3 stock category filter (`listStock({ categoryId })` + filter on the inventory screen) and `getItemMovements(itemId, { from, to })` with date inputs in the movements modal.
- M4/M5 duplicate: «تكرار» on the invoice view opens `/<kind>/new?from=<id>` prefilled (party, lines, discount, notes), unpaid and dated today.
- M6 receipt sharing (`receiptShareText` now used from the payments list), «خلال الأسبوع» installment filter, and `getAging(type)` feeding 0–30 / 31–60 / 60+ buckets into the debts screen and each party row.
- M9 statement Excel export, M12 list Excel export (invoices, items, payments), and a low-storage warning (≥85% of quota) in the storage settings card.
- M13 image/PDF export of invoices and statements via `html-to-image` + `jspdf` (`src/lib/exportDocument.js`), rasterising the real document so Arabic shaping is preserved.
- M14 activity log screen at `/activity` (also linked from the data hub and the system nav).
- §1 rule 3: invoice number allocation and the stock check now run inside the invoice transaction (`nextNumber(type, { settings })` inside the `rw` scope).
- §5: voiding a part-paid invoice now warns that the paid amount must be refunded; restore validates orphan lines and negative line quantities before replacing data.
- §2: `html-to-image` and `jspdf` are now installed, so the PNG → PDF pipeline exists.

Still open (unchanged):

- Whole-table reads remain in balances, statements, aging, stock totals and invoice detail; only invoice lists are paginated, so the 5,000-invoice acceptance item is unproven. (Superseded by the read-path pass below; the timing item stays unproven.)
- The service worker is still registered for production builds only (`UpdateBanner`), so airplane-mode install cannot be exercised in the dev preview.
- `markInstallmentPaid(id, paymentId)` remains implemented as `payInstallment(id, { method, date })`; `getItemMovements` and `getAging` now match the catalog.

## Resolution log — 2026-11-05 (read paths)

The "whole-table reads" item is closed at the query level: the repository
interface gained `byIndex`, `byIndexAny` and `bulkGet`, and the screens that
used to read whole tables now use the indexes the schema already declared.

- Balances (`getPartyBalances`) aggregate invoices and payments in one pass per
  table instead of re-scanning them for every party.
- Statements read only that party's invoices (`customerId` / `supplierId`) and
  payments (`[partyType+partyId]`).
- Invoice detail reads its own lines (`invoiceId`), payments (`invoiceId`) and
  installments (`salesInvoiceId`); edit/void no longer scan those tables either.
- Installment lists read only the statuses they show (`status`) and fetch just
  those invoices by id; dashboard overdue count uses the same path.
- Item movements read one item's ledger (`itemId`); void reversal reads one
  document's movements (`[refType+refId]`).
- Per-product reports read the lines of the invoices in range, in batches,
  instead of the whole line table.
- Still whole-table by nature: aging (every unpaid invoice), stock totals (the
  movement ledger) and the payroll advance list — each is one linear pass.

Verification this pass (1055 px preview, seeded through the UI): purchase in →
sales invoice on a 3-installment plan → invoice detail (lines, payments,
installments, PDF/صورة/تكرار actions) → duplicate prefills party, item and
quantity → statement shows the invoice row and balance → debts shows the
2,500 receivable in the 0–30 bucket → installments lists 3 and the «خلال
الأسبوع» filter runs → activity log shows the sale → dashboard totals match →
voiding the invoice shows the refund banner and the item ledger reads
+10 / −2 / +2 with balances 10 / 8 / 10 (stock back to 10). No console error.
The 5,000-invoice timing item itself is still unmeasured.

**Verification coverage of this review**
- Static: every bullet above is backed by the named file.
- Runtime: the app was driven through first-run setup and the dashboard at 1055 px and 375 px; no console error, no failed request, no horizontal overflow. The offline install, document export and large-data behaviour could not be checked because they do not exist or need a production build with seeded data.
