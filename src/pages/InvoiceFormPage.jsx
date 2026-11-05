import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Save } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { calcInvoiceTotals } from '../services/totals'
import { todayIso } from '../lib/dates'
import { toMinor, toQuantity, minorToInput } from '../lib/money'
import { listItems } from '../services/items'
import { listParties } from '../services/parties'
import { getStockMap } from '../services/inventory'
import { createPurchaseInvoice, getPurchaseInvoice, updatePurchaseInvoice } from '../services/purchases'
import { createSalesInvoice, getSalesInvoice, updateSalesInvoice } from '../services/sales'
import { PAYMENT_METHODS } from '../services/payments'
import { emptyLine, InvoiceLinesEditor } from '../components/InvoiceLinesEditor'
import { InvoiceTotalsPanel } from '../components/InvoiceTotalsPanel'
import { InstallmentPlanFields } from '../components/InstallmentPlanFields'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

const EMPTY_VALUES = {
  partyId: '',
  date: todayIso(),
  lines: [emptyLine()],
  discountType: 'amount',
  discountValue: '',
  notes: '',
  paid: '',
  method: 'cash',
  installment: { enabled: false, count: '3', firstDue: '', intervalDays: '30' },
}

export function InvoiceFormPage({ kind }) {
  const isSale = kind === 'sale'
  const base = isSale ? '/sales' : '/purchases'
  const { settings, money } = useSettings()
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const editing = Boolean(id)
  // «تكرار» opens a fresh invoice prefilled from an existing one.
  const duplicateId = editing ? '' : searchParams.get('from') || ''

  const [values, setValues] = useState(EMPTY_VALUES)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(editing)
  const [existingPaid, setExistingPaid] = useState(0)
  const [stockAsk, setStockAsk] = useState('')

  const parties = useLive(() => listParties(isSale ? 'customers' : 'suppliers'), [isSale])
  const items = useLive(() => listItems({ type: isSale ? 'product' : 'all' }), [isSale])
  const stock = useLive(() => (isSale ? getStockMap() : Promise.resolve(null)), [isSale])

  useEffect(() => {
    if (!editing && !duplicateId) {
      setValues(EMPTY_VALUES)
      setExistingPaid(0)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    ;(async () => {
      const sourceId = editing ? id : duplicateId
      const data = isSale ? await getSalesInvoice(sourceId) : await getPurchaseInvoice(sourceId)
      if (!alive) return
      if (!data) {
        toast.error(editing ? 'الفاتورة غير موجودة' : 'الفاتورة الأصلية غير موجودة')
        navigate(base)
        return
      }
      const invoice = data.invoice
      if (editing && invoice.voidedAt) {
        toast.error('لا يمكن تعديل فاتورة ملغاة')
        navigate(`${base}/${id}`)
        return
      }
      setValues({
        partyId: (isSale ? invoice.customerId : invoice.supplierId) || '',
        date: editing ? invoice.date : todayIso(),
        lines: data.lines.map((line) => ({
          itemId: line.itemId,
          qty: String(line.qty),
          unitPrice: minorToInput(line.unitPrice),
        })),
        discountType: invoice.discountType || 'amount',
        discountValue: invoice.discountType === 'percent' ? String(invoice.discountValue) : minorToInput(invoice.discount),
        notes: invoice.notes || '',
        paid: '',
        method: 'cash',
        installment: {
          enabled: Boolean(invoice.installmentPlan),
          count: String(invoice.installmentPlan?.count || 3),
          firstDue: invoice.installmentPlan?.firstDue || '',
          intervalDays: String(invoice.installmentPlan?.intervalDays || 30),
        },
      })
      // A duplicate starts unpaid so the payment is entered fresh.
      setExistingPaid(editing ? invoice.paid || 0 : 0)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [editing, duplicateId, id, isSale, base, navigate, toast])

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const pricedLines = useMemo(
    () =>
      values.lines.map((line) => ({
        itemId: line.itemId,
        qty: toQuantity(line.qty),
        unitPrice: toMinor(line.unitPrice),
      })),
    [values.lines],
  )

  const totals = useMemo(
    () =>
      calcInvoiceTotals({
        lines: pricedLines,
        discountType: values.discountType,
        discountValue: values.discountValue,
        vat: settings?.vat || {},
      }),
    [pricedLines, values.discountType, values.discountValue, settings?.vat],
  )

  const paidMinor = editing ? existingPaid : Math.min(toMinor(values.paid), totals.total)
  const remaining = Math.max(0, totals.total - paidMinor)

  const save = async (allowNegative = false) => {
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        date: values.date,
        lines: values.lines,
        discountType: values.discountType,
        discountValue: values.discountValue,
        notes: values.notes,
        paid: values.paid,
        method: values.method,
        allowNegative,
        ...(isSale
          ? {
              customerId: values.partyId,
              installment: values.installment.enabled
                ? {
                    count: values.installment.count,
                    firstDue: values.installment.firstDue,
                    intervalDays: values.installment.intervalDays,
                  }
                : null,
            }
          : { supplierId: values.partyId }),
      }

      const invoice = editing
        ? isSale
          ? await updateSalesInvoice(id, payload)
          : await updatePurchaseInvoice(id, payload)
        : isSale
          ? await createSalesInvoice(payload)
          : await createPurchaseInvoice(payload)

      toast.success(editing ? 'تم حفظ التعديلات' : 'تم حفظ الفاتورة')
      navigate(`${base}/${invoice.id}`)
    } catch (error) {
      if (error.name === 'StockError') {
        if (error.policy === 'warn') setStockAsk(error.message)
        else toast.error(error.message)
      } else if (error.name === 'ValidationError') {
        setErrors(error.errors)
        toast.error(error.message)
      } else {
        toast.error(error.message || 'تعذر الحفظ')
      }
    } finally {
      setSaving(false)
    }
  }

  // Desktop speed: Ctrl/⌘ + Enter saves without reaching for the mouse.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || saving) return
      event.preventDefault()
      save(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saving, save])

  const title = editing
    ? isSale
      ? 'تعديل فاتورة بيع'
      : 'تعديل فاتورة شراء'
    : duplicateId
      ? isSale
        ? 'تكرار فاتورة بيع'
        : 'تكرار فاتورة شراء'
      : isSale
        ? 'فاتورة بيع جديدة'
        : 'فاتورة شراء جديدة'

  const partyLabel = isSale ? 'العميل' : 'المورد'

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-canvas" />
        <div className="h-64 animate-pulse rounded-2xl bg-canvas" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={title}
        description={
          isSale
            ? 'الأصناف تخرج من المخزون، والمتبقي يُسجَّل على العميل.'
            : 'الأصناف تدخل المخزون، والمتبقي يُسجَّل على المورد.'
        }
        actions={
          <>
            <Link to={base}>
              <Button variant="ghost">
                <ArrowRight size={16} />
                رجوع
              </Button>
            </Link>
            <Button
              variant="primary"
              onClick={() => save(false)}
              disabled={saving}
              title="Ctrl + Enter"
              aria-keyshortcuts="Control+Enter"
            >
              <Save size={16} />
              {saving ? 'جارٍ الحفظ…' : 'حفظ الفاتورة'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="بيانات الفاتورة" description={`${partyLabel} والتاريخ.`} />
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <Field label={partyLabel} htmlFor="invoice-party" required error={errors[isSale ? 'customerId' : 'supplierId']}>
                <Select
                  id="invoice-party"
                  value={values.partyId}
                  onChange={(event) => setField('partyId', event.target.value)}
                  invalid={Boolean(errors[isSale ? 'customerId' : 'supplierId'])}
                >
                  <option value="">اختر {partyLabel}</option>
                  {(parties || []).map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="التاريخ" htmlFor="invoice-date" required error={errors.date}>
                <Input
                  id="invoice-date"
                  type="date"
                  value={values.date}
                  onChange={(event) => setField('date', event.target.value)}
                  dir="ltr"
                  invalid={Boolean(errors.date)}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="الأصناف"
              description={isSale ? 'الأسعار تُجلب من سعر البيع وتظل قابلة للتعديل.' : 'الأسعار تُجلب من سعر الشراء وتظل قابلة للتعديل.'}
            />
            <div className="px-5 py-4">
              <InvoiceLinesEditor
                lines={values.lines}
                items={items || []}
                priceField={isSale ? 'salePrice' : 'purchasePrice'}
                stock={isSale ? stock : null}
                errors={errors}
                emptyHint={
                  isSale
                    ? 'لا توجد أصناف من نوع «منتج تام» بعد — أضف الصنف من صفحة الأصناف واختر النوع «منتج تام» ليظهر هنا.'
                    : undefined
                }
                onChange={(lines) => setField('lines', lines)}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="الإجمالي" />
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-2">
                <Field label="الخصم" htmlFor="invoice-discount">
                  <Input
                    id="invoice-discount"
                    value={values.discountValue}
                    onChange={(event) => setField('discountValue', event.target.value)}
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0"
                  />
                </Field>
                <Field label="النوع" htmlFor="invoice-discount-type">
                  <Select
                    id="invoice-discount-type"
                    value={values.discountType}
                    onChange={(event) => setField('discountType', event.target.value)}
                  >
                    <option value="amount">مبلغ</option>
                    <option value="percent">نسبة %</option>
                  </Select>
                </Field>
              </div>
              <InvoiceTotalsPanel totals={totals} paid={paidMinor} />
            </div>
          </Card>

          <Card>
            <CardHeader title={editing ? 'السداد' : 'الدفع عند الإنشاء'} description={editing ? 'تُسجَّل الدفعات من صفحة الفاتورة.' : undefined} />
            <div className="space-y-3 px-5 py-4">
              {!editing && (
                <>
                  <Field label="المبلغ المدفوع الآن" htmlFor="invoice-paid" error={errors.paid}>
                    <Input
                      id="invoice-paid"
                      value={values.paid}
                      onChange={(event) => setField('paid', event.target.value)}
                      inputMode="decimal"
                      dir="ltr"
                      placeholder="0"
                    />
                  </Field>
                  <Field label="طريقة الدفع" htmlFor="invoice-method">
                    <Select id="invoice-method" value={values.method} onChange={(event) => setField('method', event.target.value)}>
                      {PAYMENT_METHODS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => setField('paid', minorToInput(totals.total))}
                    className="text-[12.5px] font-semibold text-walnut hover:underline"
                  >
                    دفع المبلغ كاملاً
                  </button>
                </>
              )}
              {editing && (
                <p className="text-[13px] leading-6 text-muted">
                  المدفوع حتى الآن {money(existingPaid)} — أضف الدفعات من صفحة الفاتورة.
                </p>
              )}
            </div>
          </Card>

          {isSale && remaining > 0 && (
            <Card>
              <CardHeader title="تقسيط المتبقي" description={`المتبقي ${money(remaining)}`} />
              <div className="space-y-3 px-5 py-4">
                <label className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={values.installment.enabled}
                    onChange={(event) => setField('installment', { ...values.installment, enabled: event.target.checked })}
                    className="h-4 w-4 accent-[#1c1c1e]"
                  />
                  تقسيم المتبقي على أقساط
                </label>
                {values.installment.enabled && (
                  <InstallmentPlanFields
                    value={values.installment}
                    remaining={remaining}
                    onChange={(next) => setField('installment', next)}
                  />
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="ملاحظات" />
            <div className="px-5 py-4">
              <Field label="ملاحظات على الفاتورة" htmlFor="invoice-notes">
                <Textarea
                  id="invoice-notes"
                  rows={3}
                  value={values.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  placeholder="اختياري"
                />
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(stockAsk)}
        onClose={() => setStockAsk('')}
        onConfirm={() => save(true)}
        title="المخزون سيصبح سالباً"
        message={stockAsk}
        confirmLabel="متابعة على أي حال"
        cancelLabel="رجوع"
        tone="danger"
      />
    </div>
  )
}
