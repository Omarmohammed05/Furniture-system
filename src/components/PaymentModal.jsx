import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { todayIso } from '../lib/dates'
import { remainingOf } from '../lib/invoiceStatus'
import { minorToInput } from '../lib/money'
import { listParties } from '../services/parties'
import { listPurchaseInvoices } from '../services/purchases'
import { listSalesInvoices } from '../services/sales'
import { PAYMENT_METHODS, recordCustomerReceipt, recordSupplierPayment } from '../services/payments'
import { Button } from './ui/Button'
import { Field, Input, Select, Textarea } from './ui/Field'
import { Modal } from './ui/Modal'

/**
 * Receipt (money in from a customer) or payment (money out to a supplier),
 * optionally attached to one invoice.
 */
export function PaymentModal({
  open,
  onClose,
  direction = 'in',
  presetPartyId = '',
  presetInvoiceId = '',
  presetAmount = '',
  onSaved,
}) {
  const toast = useToast()
  const isReceipt = direction === 'in'
  const partyKind = isReceipt ? 'customers' : 'suppliers'

  const [partyId, setPartyId] = useState(presetPartyId)
  const [invoiceId, setInvoiceId] = useState(presetInvoiceId)
  const [amount, setAmount] = useState(presetAmount)
  const [method, setMethod] = useState('cash')
  const [date, setDate] = useState(todayIso())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setPartyId(presetPartyId)
    setInvoiceId(presetInvoiceId)
    setAmount(presetAmount)
    setMethod('cash')
    setDate(todayIso())
    setNote('')
    setError('')
  }, [open, presetPartyId, presetInvoiceId, presetAmount])

  const parties = useLive(() => listParties(partyKind), [partyKind])
  const invoices = useLive(
    () =>
      partyId
        ? isReceipt
          ? listSalesInvoices({ customerId: partyId })
          : listPurchaseInvoices({ supplierId: partyId })
        : [],
    [partyId, isReceipt],
  )

  const openInvoices = useMemo(
    () => (invoices || []).filter((invoice) => !invoice.voidedAt && remainingOf(invoice) > 0),
    [invoices],
  )

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const payload = {
        amount,
        method,
        date,
        note,
        invoiceId: invoiceId || null,
      }
      if (isReceipt) {
        await recordCustomerReceipt({ ...payload, customerId: partyId })
      } else {
        await recordSupplierPayment({ ...payload, supplierId: partyId })
      }
      toast.success(isReceipt ? 'تم تسجيل التحصيل' : 'تم تسجيل الدفعة')
      onSaved?.()
      onClose?.()
    } catch (submitError) {
      setError(submitError.message || 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  const pickInvoice = (value) => {
    setInvoiceId(value)
    const invoice = openInvoices.find((row) => row.id === value)
    if (invoice) setAmount(minorToInput(remainingOf(invoice)))
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={isReceipt ? 'سند تحصيل' : 'سند دفع'}
      description={isReceipt ? 'مبلغ استلمته من عميل، على فاتورة أو على الحساب.' : 'مبلغ دفعته لمورد، على فاتورة أو على الحساب.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={isReceipt ? 'العميل' : 'المورد'} htmlFor="payment-party" required>
          <Select
            id="payment-party"
            value={partyId}
            onChange={(event) => {
              setPartyId(event.target.value)
              setInvoiceId('')
            }}
            disabled={Boolean(presetPartyId)}
          >
            <option value="">اختر</option>
            {(parties || []).map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="الفاتورة" htmlFor="payment-invoice" hint="اتركها فارغة للدفع على الحساب">
          <Select id="payment-invoice" value={invoiceId} onChange={(event) => pickInvoice(event.target.value)} disabled={Boolean(presetInvoiceId)}>
            <option value="">على الحساب</option>
            {openInvoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.number} — متبقي {minorToInput(remainingOf(invoice))}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المبلغ" htmlFor="payment-amount" required>
            <Input
              id="payment-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              dir="ltr"
              placeholder="0"
            />
          </Field>
          <Field label="التاريخ" htmlFor="payment-date">
            <Input id="payment-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} dir="ltr" />
          </Field>
        </div>

        <Field label="طريقة الدفع" htmlFor="payment-method">
          <Select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value)}>
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="ملاحظات" htmlFor="payment-note">
          <Textarea id="payment-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>

        {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] font-medium text-[#912018]">{error}</p>}
      </div>
    </Modal>
  )
}
