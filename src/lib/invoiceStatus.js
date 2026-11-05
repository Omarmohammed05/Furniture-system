/**
 * Invoice status follows business rule B5:
 * paid when nothing is left, partial when some money came in, unpaid otherwise.
 * A voided invoice always reports `void`.
 */
export const INVOICE_STATUS = {
  unpaid: { label: 'غير مدفوعة', tone: 'warn' },
  partial: { label: 'مدفوعة جزئياً', tone: 'sand' },
  paid: { label: 'مدفوعة', tone: 'success' },
  void: { label: 'ملغاة', tone: 'danger' },
}

export function statusFor(paid, total, { voided = false } = {}) {
  if (voided) return 'void'
  const due = Number(total) || 0
  const received = Number(paid) || 0
  if (received <= 0) return 'unpaid'
  if (received >= due) return 'paid'
  return 'partial'
}

export function remainingOf(invoice) {
  return Math.max(0, (Number(invoice?.total) || 0) - (Number(invoice?.paid) || 0))
}
