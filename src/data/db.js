/**
 * Database schema — Dexie / IndexedDB.
 *
 * Every table from the features spec is created up front (even the ones used
 * in later phases) so a single schema version can carry the whole product.
 * Business data never leaves this device unless the user exports a backup.
 *
 * Version 2 adds an `updatedAt` index to every table (the cursor a future
 * delta-sync pushes from) and backfills the shared metadata fields on rows
 * written by version 1. `stock_movements` and `payments` stay append-only.
 */
import Dexie from 'dexie'
import { withRecordMeta } from './recordMeta'

export const DB_NAME = 'showroom-system'
export const SCHEMA_VERSION = 2

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

db.version(1).stores({
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

db.version(SCHEMA_VERSION)
  .stores({
    settings: 'key, updatedAt',
    suppliers: 'id, name, active, deletedAt, updatedAt',
    customers: 'id, name, active, isWalkIn, deletedAt, updatedAt',
    categories: 'id, name, kind, deletedAt, updatedAt',
    units: 'id, name, deletedAt, updatedAt',
    items: 'id, type, name, code, categoryId, unitId, active, deletedAt, updatedAt',
    stock_movements: 'id, itemId, type, date, updatedAt, [refType+refId]',
    purchase_invoices: 'id, number, supplierId, date, status, voidedAt, updatedAt',
    purchase_lines: 'id, invoiceId, itemId, updatedAt',
    sales_invoices: 'id, number, customerId, date, status, voidedAt, updatedAt',
    sales_lines: 'id, invoiceId, itemId, updatedAt',
    installments: 'id, salesInvoiceId, dueDate, status, updatedAt',
    payments: 'id, direction, [partyType+partyId], invoiceType, invoiceId, date, method, updatedAt',
    production_entries: 'id, productId, date, updatedAt',
    production_materials: 'id, entryId, itemId, updatedAt',
    workers: 'id, name, active, deletedAt, updatedAt',
    advances: 'id, workerId, date, updatedAt',
    payroll_adjustments: 'id, workerId, month, updatedAt',
    pay_slips: 'id, workerId, month, status, updatedAt',
    expenses: 'id, date, categoryId, voidedAt, updatedAt',
    counters: 'key, updatedAt',
    activity_log: 'id, at, action, entity, entityId, updatedAt',
  })
  .upgrade(async (transaction) => {
    const appRow = await transaction.table('settings').get('app')
    const deviceId = appRow?.value?.deviceId || 'A'
    const now = new Date().toISOString()

    for (const name of TABLE_NAMES) {
      await transaction
        .table(name)
        .toCollection()
        .modify((row) => {
          Object.assign(row, withRecordMeta(name, row, { now, deviceId }))
        })
    }
  })
