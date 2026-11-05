# Implementation Plan — Furniture Showroom System

Companion to `01_FEATURES_SPEC.md`. Target: Base44 (React + Tailwind + shadcn/ui) building an offline-first PWA.

## 1. Architecture

```
UI (React, RTL, shadcn)
  └─ Hooks (useLiveQuery / React Query)
      └─ Services (business logic, validation, transactions)
          └─ Repository interface
              ├─ LocalRepository  (Dexie / IndexedDB)   ← phase 1
              └─ RemoteRepository (API → Neon/Postgres) ← later
```

Rules:
1. Screens never touch Dexie directly. They call services; services call the repository.
2. Business data is NOT stored in Base44 entities or backend. Everything lives in IndexedDB.
3. Every business action (create invoice, void, payroll run…) runs in ONE transaction.
4. Totals, balances and stock are derived from records and the movements ledger, never typed by hand.

## 2. Suggested stack

| Concern | Choice |
|---|---|
| UI | React, Tailwind, shadcn/ui, lucide icons |
| Local DB | Dexie (IndexedDB) |
| Routing | react-router (hash routing keeps offline reloads safe) |
| Forms | react-hook-form + zod |
| PWA | Web App Manifest + service worker (Workbox / vite-plugin-pwa if available) |
| PDF / image | html-to-image + jsPDF (render invoice HTML, never raw text PDFs, because of Arabic shaping) |
| Excel | SheetJS (xlsx) |
| Dates | date-fns |
| Font | Cairo or Tajawal, bundled locally |
| IDs | `crypto.randomUUID()` |

## 3. Folder structure

```
src/
  data/
    db.js                # Dexie schema + versions
    repository.js        # interface (documented)
    localRepository.js   # Dexie implementation
    remoteRepository.js  # stub: throws "not enabled"
  services/
    settings.js  parties.js  items.js  inventory.js
    purchases.js sales.js payments.js payroll.js
    expenses.js  statements.js reports.js backup.js
    numbering.js money.js totals.js
  documents/             # invoice / receipt / statement / payslip HTML templates
  pages/                 # Dashboard, Sales, Purchases, Inventory, Customers, ...
  components/            # DataTable, MoneyInput, QtyInput, PartyPicker, ItemPicker...
  pwa/                   # manifest, sw registration, install prompt, storage.persist
  lib/                   # format, arabicDigits, whatsapp, print
```

## 4. Data model (all tables)

Common fields on every record: `id` (UUID), `createdAt`, `updatedAt`, `deletedAt|null`, `deviceId`.

| Table | Key fields |
|---|---|
| settings | key, value (single-row style) |
| suppliers | name, phone, address, notes, openingBalance, active |
| customers | name, phone, address, notes, openingBalance, active, isWalkIn |
| categories | name, kind (item/expense) |
| units | name |
| items | type, name, code, categoryId, unitId, purchasePrice, salePrice, minStock, imageData, active |
| stock_movements | itemId, type, qty (signed), refType, refId, date, note |
| purchase_invoices | number, supplierId, date, subtotal, discount, vat, total, paid, status, notes, voidedAt, voidReason |
| purchase_lines | invoiceId, itemId, qty, unitPrice, lineTotal |
| sales_invoices | number, customerId, date, subtotal, discount, vat, total, paid, status, notes, voidedAt, voidReason |
| sales_lines | invoiceId, itemId, qty, unitPrice, lineTotal |
| installments | salesInvoiceId, dueDate, amount, paidAmount, status |
| payments | direction (in/out), partyType, partyId, invoiceType, invoiceId, amount, method, date, note |
| production_entries | productId, qty, date, note |
| production_materials | entryId, itemId, qty |
| workers | name, phone, jobTitle, monthlySalary, hireDate, active, notes |
| advances | workerId, date, amount, repayMode, monthlyAmount, note |
| payroll_adjustments | workerId, month (YYYY-MM), type (bonus/deduction), amount, note |
| pay_slips | workerId, month, baseSalary, bonuses, deductions, advanceRepayment, net, status, paidAt, method |
| expenses | date, categoryId, amount, method, note, voidedAt |
| counters | key (type+device), value |
| activity_log | at, action, entity, entityId, snapshotBefore, note |

Dexie indexes (examples): `sales_invoices: id, number, customerId, date, status`, `stock_movements: id, itemId, date, [refType+refId]`, `payments: id, [partyType+partyId], date`, `installments: id, salesInvoiceId, dueDate, status`.

Money fields are integer piasters. Quantities are numbers with up to 3 decimals.

## 5. Key flows (pseudo-steps)

**createSalesInvoice** (one transaction)
1. Validate lines, prices, customer (walk-in cannot owe).
2. Check stock against policy S7.
3. Get next number from `counters`.
4. Compute totals (discount, VAT).
5. Insert invoice + lines.
6. Insert `sale_out` movements (negative qty).
7. If down payment > 0, insert payment (in) and update `paid`/`status`.
8. If installment plan, insert installments.
9. Write activity log.

**voidSalesInvoice**: mark void, insert reversing `void_reversal` movements, keep payments but flag them as "refund due" if paid > 0 (show a warning to record a refund manually), cancel unpaid installments.

**generatePayroll(month)**: for each active worker, build or refresh a draft pay slip from salary + adjustments − advance repayment (per repayMode); do not touch slips already `paid`.

**importBackup(file)**: validate schemaVersion + checksum → download automatic safety backup of current data → clear all tables → bulk insert inside one transaction → run integrity check (every line has a parent, no negative qty records) → show summary.

## 6. Backup file format

```json
{
  "format": "showroom-backup",
  "schemaVersion": 1,
  "appVersion": "1.0.0",
  "exportedAt": "ISO date",
  "deviceId": "A",
  "checksum": "sha-256 of the tables JSON",
  "tables": { "items": [], "sales_invoices": [], "...": [] }
}
```

Restore is a full replace, not a merge. Tell the user clearly: "Use one device at a time."

## 7. PWA requirements

- `manifest.webmanifest` with Arabic name, icons, `display: standalone`, `dir: rtl`, `lang: ar`
- Service worker precaches the app shell, fonts and icons; navigation fallback to `index.html`
- Update flow: "new version available" banner, never auto-reload during data entry
- Call `navigator.storage.persist()` after first login; show `navigator.storage.estimate()` in settings
- First load needs internet; after that everything works offline (state this to the client)

## 8. Documents & sharing

- Invoice, receipt, statement, pay slip are React components rendered to HTML with print CSS (A4)
- Export: html-to-image → PNG → jsPDF for PDF
- WhatsApp: `https://wa.me/20XXXXXXXXXX?text=<encoded summary>`; strip leading 0 from Egyptian numbers; on mobile use `navigator.share({files})` when supported, otherwise download then open the wa.me link

## 9. Path to online (Neon) — design now, build later

Design choices already made to keep this cheap:
- UUID primary keys, `updatedAt`, `deletedAt`, `deviceId` on every record
- Append-only ledgers (stock movements, payments) so merging two devices causes no conflicts
- Device code inside invoice numbers
- Repository interface: only `RemoteRepository` needs writing

Planned steps:
1. **Backup to Neon:** a small API (Vercel route) with an API key that accepts the same backup JSON and stores it (or maps it to Postgres tables); "Restore from cloud" downloads it into `importBackup`.
2. **Delta sync:** push records changed since `lastSyncAt`, pull others; last-write-wins on master data, ledgers merge by union.
3. **Fully online mode:** switch repository to `RemoteRepository`, keep the local DB as a cache.

Postgres schema should mirror section 4 table-for-table.

## 10. Base44-specific risks and fallbacks

| Risk | Fallback |
|---|---|
| Base44 may not allow a custom service worker | Ask it to implement; if refused, export the code (GitHub) and deploy on Vercel with `vite-plugin-pwa` |
| Package not available (dexie, jspdf, xlsx) | Use alternatives: localForage/idb for DB, browser print-to-PDF for PDFs, CSV for exports |
| Base44 login wall in front of the app | Acceptable in phase 1 only if offline reload still works; otherwise move to Vercel |
| Arabic PDF text shaping | Always render to image/HTML first, never write Arabic strings directly into jsPDF |
| Large single prompt degrades quality | Build in the 4 phases from `03_BASE44_PROMPT.md` |

## 11. Build phases

| Phase | Deliverable |
|---|---|
| 1 Foundation | PWA shell, RTL theme, PIN, settings, Dexie schema, master data, backup export/import |
| 2 Trading | Inventory ledger, purchases, sales, payments, installments, WhatsApp/print |
| 3 People & money | Workers, advances, payroll, expenses, statements |
| 4 Insight | Dashboard, all reports, Excel export, polish, QA |

## 12. Acceptance checklist

- [ ] App installs and opens with airplane mode on
- [ ] Create purchase → stock rises; create sale → stock falls; void → stock restored
- [ ] Sale with down payment + 3 installments shows correct schedule and customer balance
- [ ] Supplier and customer statements match invoices and payments exactly
- [ ] Payroll: advance repaid over months, net never negative, paid slips locked
- [ ] VAT toggle off → no VAT anywhere; on → VAT shown in invoice, totals and reports
- [ ] Backup → wipe site data → import → every screen shows identical numbers
- [ ] Invoice image/PDF shows Arabic correctly with logo; WhatsApp link opens with right number
- [ ] 5,000 invoices seeded: lists and dashboard still respond instantly
- [ ] Invoice numbers never repeat, including after void and after restore
