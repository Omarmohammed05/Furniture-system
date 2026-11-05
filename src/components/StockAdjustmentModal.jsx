import { useEffect, useState } from 'react'
import { useToast } from '../app/ToastContext'
import { useSettings } from '../app/SettingsContext'
import { todayIso } from '../lib/dates'
import { formatQuantity } from '../lib/money'
import { recordAdjustment } from '../services/inventory'
import { Button } from './ui/Button'
import { Field, Input, Textarea } from './ui/Field'
import { Modal } from './ui/Modal'

/** Stocktake adjustment — the reason is always required (M3). */
export function StockAdjustmentModal({ open, onClose, item, onSaved }) {
  const toast = useToast()
  const { digits } = useSettings()
  const [qtyDelta, setQtyDelta] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(todayIso())
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setQtyDelta('')
    setReason('')
    setDate(todayIso())
    setErrors({})
  }, [open, item])

  const submit = async () => {
    setBusy(true)
    try {
      await recordAdjustment({ itemId: item?.id, qtyDelta: Number(String(qtyDelta).replace(',', '.')), reason, date })
      toast.success('تم تسجيل التسوية')
      onSaved?.()
      onClose?.()
    } catch (error) {
      if (error.name === 'ValidationError') setErrors(error.errors)
      else toast.error(error.message || 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="تسوية مخزون"
      description={item ? `${item.name} — المتاح حالياً ${formatQuantity(item.stock, { digits })}` : undefined}
      size="sm"
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
        <Field
          label="الكمية"
          htmlFor="adjust-qty"
          required
          error={errors.qtyDelta}
          hint="موجبة للزيادة (جرد أعلى)، سالبة للنقص (تالف أو مفقود)."
        >
          <Input
            id="adjust-qty"
            value={qtyDelta}
            onChange={(event) => setQtyDelta(event.target.value)}
            inputMode="decimal"
            dir="ltr"
            placeholder="مثال: -2 أو 5"
            autoFocus
          />
        </Field>

        <Field label="التاريخ" htmlFor="adjust-date">
          <Input id="adjust-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} dir="ltr" />
        </Field>

        <Field label="السبب" htmlFor="adjust-reason" required error={errors.reason}>
          <Textarea
            id="adjust-reason"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="جرد، تالف، فقد…"
          />
        </Field>
      </div>
    </Modal>
  )
}
