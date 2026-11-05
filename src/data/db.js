/**
 * Database schema — Dexie / IndexedDB.
 *
 * Every table from the features spec is created up front (even the ones used
 * in later phases) so a single schema version can carry the whole product.
 * Business data never leaves this device unless the user exports a backup.
 */
import Dexie from 'dexie'

export const DB_NAME = 'showroom-system'
export const SCHEMA_VERSION = 1

export const TABLE_NAMES = [
  'settings',
  'suppliers',
  'customers',
  'categories',
  'units',
  'items',
  'stock_movements',
  'purchase_invoices',
  'purchase_lines',
  'sales_invoices',
  'sales_lines',
  'installments',
  'payments',
  'production_entries',
  'production_materials',
  'workers',
  'advances',
  'payroll_adjustments',
  'pay_slips',
  'expenses',
  'counters',
  'activity_log',
]

export const db = new Dexie(DB_NAME)

db.version(SCHEMA_VERSION).stores({
  settings: 'key',
  suppliers: 'id, name, active, deletedAt',
  customers: 'id, name, active, isWalkIn, deletedAt',
  categories: 'id, name, kind, deletedAt',
  units: 'id, name, deletedAt',
  items: 'id, type, name, code, categoryId, unitId, active, deletedAt',
  stock_movements: 'id, itemId, type, date, [refType+refId]',
  purchase_invoices: 'id, number, supplierId, date, status, voidedAt',
  purchase_lines: 'id, invoiceId, itemId',
  sales_invoices: 'id, number, customerId, date, status, voidedAt',
  sales_lines: 'id, invoiceId, itemId',
  installments: 'id, salesInvoiceId, dueDate, status',
  payments: 'id, direction, [partyType+partyId], invoiceType, invoiceId, date, method',
  production_entries: 'id, productId, date',
  production_materials: 'id, entryId, itemId',
  workers: 'id, name, active, deletedAt',
  advances: 'id, workerId, date',
  payroll_adjustments: 'id, workerId, month',
  pay_slips: 'id, workerId, month, status',
  expenses: 'id, date, categoryId, voidedAt',
  counters: 'key',
  activity_log: 'id, at, action, entity, entityId',
})
