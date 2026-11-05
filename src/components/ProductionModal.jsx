import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToast } from '../app/ToastContext'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { todayIso } from '../lib/dates'
import { listItems } from '../services/items'
import { recordProduction } from '../services/inventory'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Field, Input, Select, Textarea } from './ui/Field'
import { Modal } from './ui/Modal'

const EMPTY_MATERIAL = { itemId: '', qty: '' }

/** Production entry without costing (M3): product in, raw materials out. */
export function ProductionModal({ open, onClose, onSaved }) {
  const toast = useToast()
  const { quantity } = useSettings()
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const [date, setDate] = useState(todayIso())
  const [materials, setMaterials] = useState([EMPTY_MATERIAL])
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [stockAsk, setStockAsk] = useState('')

  const items = useLive(() => listItems(), [])
  const products = (items || []).filter((item) => item.type === 'product')
  const materialsList = (items || []).filter((item) => item.type === 'raw_material')

  useEffect(() => {
    if (!open) return
    setProductId('')
    setQty('')
    setDate(todayIso())
    setMaterials([EMPTY_MATERIAL])
    setNote('')
    setErrors({})
  }, [open])

  const updateMaterial = (index, patch) => {
    setMaterials((rows) => rows.map((row, position) => (position === index ? { ...row, ...patch } : row)))
  }

  const submit = async (allowNegative = false) => {
    setBusy(true)
    try {
      await recordProduction({
        productId,
        qty,
        date,
        note,
        materials: materials.filter((row) => row.itemId),
        allowNegative,
      })
      toast.success('تم تسجيل الإنتاج')
      onSaved?.()
      onClose?.()
    } catch (error) {
      if (error.name === 'ValidationError') setErrors(error.errors)
      else if (error.name === 'StockError' && error.policy === 'warn') setStockAsk(error.message)
      else toast.error(error.message || 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="تسجيل إنتاج"
      description="يزيد مخزون المنتج ويخصم الخامات المستخدمة، بدون حساب تكلفة."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={() => submit(false)} disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المنتج" htmlFor="production-product" required error={errors.productId}>
            <Select id="production-product" value={productId} onChange={(event) => setProductId(event.target.value)}>
              <option value="">اختر المنتج</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الكمية المنتجة" htmlFor="production-qty" required error={errors.qty}>
            <Input
              id="production-qty"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              inputMode="decimal"
              dir="ltr"
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="التاريخ" htmlFor="production-date">
          <Input id="production-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} dir="ltr" />
        </Field>

        <div className="rounded-xl border border-line p-3">
          <p className="mb-2 text-[13px] font-semibold text-ink">الخامات المستخدمة (اختياري)</p>
          <div className="space-y-2">
            {materials.map((row, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={row.itemId} onChange={(event) => updateMaterial(index, { itemId: event.target.value })} aria-label="الخامة">
                    <option value="">اختر الخامة</option>
                    {materialsList.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Input
                  value={row.qty}
                  onChange={(event) => updateMaterial(index, { qty: event.target.value })}
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="كمية"
                  className="w-24 text-center"
                  aria-label="كمية الخامة"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMaterials((rows) => rows.filter((_, position) => position !== index))}
                  aria-label="حذف الخامة"
                  className="text-muted hover:text-danger"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setMaterials((rows) => [...rows, EMPTY_MATERIAL])}>
            <Plus size={15} />
            إضافة خامة
          </Button>
        </div>

        <Field label="ملاحظات" htmlFor="production-note">
          <Textarea id="production-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>

        {productId && qty ? (
          <p className="rounded-xl bg-canvas px-3 py-2 text-[12.5px] text-muted">
            سيضاف {quantity(qty)} إلى مخزون المنتج.
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(stockAsk)}
        onClose={() => setStockAsk('')}
        onConfirm={() => submit(true)}
        title="المخزون سيصبح سالباً"
        message={stockAsk}
        confirmLabel="متابعة على أي حال"
        cancelLabel="رجوع"
      />
    </Modal>
  )
}
