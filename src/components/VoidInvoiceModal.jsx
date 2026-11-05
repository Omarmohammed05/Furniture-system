import { useEffect, useState } from 'react'
import { Button } from './ui/Button'
import { Field, Textarea } from './ui/Field'
import { Modal } from './ui/Modal'

export function VoidInvoiceModal({ open, onClose, onConfirm, number }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
      setError('')
    }
  }, [open])

  const submit = async () => {
    if (String(reason).trim().length < 3) {
      setError('اذكر سبب الإلغاء')
      return
    }
    setBusy(true)
    try {
      await onConfirm?.(String(reason).trim())
      onClose?.()
    } catch (submitError) {
      setError(submitError.message || 'تعذر الإلغاء')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="إلغاء الفاتورة"
      description={number ? `الفاتورة ${number} ستظل ظاهرة بعلامة «ملغاة»، وتُعكس حركات المخزون.` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            رجوع
          </Button>
          <Button variant="danger" onClick={submit} disabled={busy}>
            {busy ? 'جارٍ الإلغاء…' : 'تأكيد الإلغاء'}
          </Button>
        </>
      }
    >
      <Field label="سبب الإلغاء" htmlFor="void-reason" required error={error}>
        <Textarea
          id="void-reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            setError('')
          }}
          placeholder="مثال: خطأ في الصنف أو في الكمية"
          autoFocus
        />
      </Field>
    </Modal>
  )
}
