/**
 * WhatsApp sharing. Egyptian numbers are normalized to the +20 country code
 * (spec assumption 7) and documents are always sent as text, so nothing needs
 * internet beyond WhatsApp itself.
 */
import { formatShortDate } from './dates'
import { fromMinor } from './money'

export function normalizeEgyptPhone(value) {
  const raw = String(value || '').replace(/[^\d+]/g, '')
  if (!raw) return ''
  let digits = raw.replace(/^\+/, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('20')) return digits
  if (digits.startsWith('0')) return `20${digits.slice(1)}`
  if (digits.length === 10) return `20${digits}`
  return digits
}

export function whatsappLink({ phone = '', text = '' }) {
  const target = normalizeEgyptPhone(phone)
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${target}${query}`
}

export function openWhatsApp({ phone = '', text = '' }) {
  window.open(whatsappLink({ phone, text }), '_blank', 'noopener,noreferrer')
}

function money(minor) {
  return fromMinor(minor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function quantity(value) {
  const number = Number(value) || 0
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(3)))
}

/** Plain-text summary used for the WhatsApp message. */
export function invoiceShareText({ kind, invoice, lines = [], partyName = '', shopName = '', currency = 'ج.م' }) {
  const title = kind === 'purchase' ? 'فاتورة شراء' : 'فاتورة بيع'
  const partyLabel = kind === 'purchase' ? 'المورد' : 'العميل'
  const rows = lines.map(
    (line, index) => `${index + 1}. ${line.name} × ${quantity(line.qty)} = ${money(line.lineTotal)}`,
  )

  const parts = [
    shopName,
    `${title} رقم ${invoice.number}`,
    `التاريخ: ${formatShortDate(invoice.date)}`,
    `${partyLabel}: ${partyName || '—'}`,
    '————————',
    ...rows,
    '————————',
    `الإجمالي: ${money(invoice.subtotal)} ${currency}`,
  ]
  if (invoice.discount) parts.push(`الخصم: ${money(invoice.discount)} ${currency}`)
  if (invoice.vat) parts.push(`الضريبة: ${money(invoice.vat)} ${currency}`)
  parts.push(`الصافي: ${money(invoice.total)} ${currency}`)
  parts.push(`المدفوع: ${money(invoice.paid)} ${currency}`)
  const remaining = Math.max(0, (invoice.total || 0) - (invoice.paid || 0))
  if (remaining > 0) parts.push(`المتبقي: ${money(remaining)} ${currency}`)

  return parts.filter(Boolean).join('\n')
}

export function receiptShareText({ partyName, amount, date, invoiceNumber, shopName, currency = 'ج.م', direction = 'in' }) {
  const title = direction === 'in' ? 'سند تحصيل' : 'سند دفع'
  return [
    shopName,
    title,
    `التاريخ: ${formatShortDate(date)}`,
    direction === 'in' ? `من: ${partyName}` : `إلى: ${partyName}`,
    `المبلغ: ${money(amount)} ${currency}`,
    invoiceNumber ? `عن الفاتورة: ${invoiceNumber}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
