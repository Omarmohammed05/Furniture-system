/**
 * Invoice arithmetic. Every amount is integer piasters (B1), so a line total
 * is rounded once, when quantity × price is turned into money.
 */
export function lineTotal(qty, unitPrice) {
  const quantity = Number(qty) || 0
  const price = Number(unitPrice) || 0
  return Math.round(quantity * price)
}

export function discountAmount({ subtotal = 0, type = 'amount', value = 0 } = {}) {
  const numeric = Number(String(value ?? '').replace(',', '.')) || 0
  const raw = type === 'percent' ? Math.round((subtotal * numeric) / 100) : Math.round(numeric)
  return Math.min(Math.max(raw, 0), Math.max(0, subtotal))
}

/**
 * subtotal → discount → taxable → VAT → total.
 * When "prices include VAT" is on, the tax is extracted from the taxable
 * amount instead of being added on top.
 */
export function calcInvoiceTotals({ lines = [], discountType = 'amount', discountValue = 0, vat = {} } = {}) {
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line.qty, line.unitPrice), 0)
  const discount = discountAmount({ subtotal, type: discountType, value: discountValue })
  const taxable = subtotal - discount

  const enabled = Boolean(vat?.enabled)
  const rate = Number(vat?.rate) || 0
  const pricesIncludeVat = Boolean(vat?.pricesIncludeVat)

  let vatValue = 0
  let total = taxable
  if (enabled && rate > 0) {
    if (pricesIncludeVat) {
      vatValue = Math.round((taxable * rate) / (100 + rate))
      total = taxable
    } else {
      vatValue = Math.round((taxable * rate) / 100)
      total = taxable + vatValue
    }
  }

  return {
    subtotal,
    discount,
    taxable,
    vat: vatValue,
    total,
    vatRate: enabled ? rate : 0,
    pricesIncludeVat: enabled ? pricesIncludeVat : false,
  }
}
