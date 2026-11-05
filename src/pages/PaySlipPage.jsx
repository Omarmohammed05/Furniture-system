import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, MessageCircle, Plus, Printer, Trash2, Wallet } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { PayslipDocument } from '../documents/PayslipDocument'
import { formatMonth, formatShortDate, todayIso } from '../lib/dates'
import { minorToInput } from '../lib/money'
import { payslipShareText, openWhatsApp } from '../lib/whatsapp'
import { PAYMENT_METHODS, methodLabel } from '../services/payments'
import {
  ADJUSTMENT_TYPES,
  addAdjustment,
  adjustmentTypeLabel,
  generatePayroll,
  getAdvanceBalance,
  getPaySlip,
  listAdjustments,
  markPaySlipPaid,
  removeAdjustment,
  updatePaySlip,
} from '../services/payroll'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Select } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

const EMPTY_ADJUSTMENT = { type: 'bonus', amount: '', note: '' }

export function PaySlipPage() {
  const { id } = useParams()
  const toast = useToast()
  const { money, digits, settings } = useSettings()

  const slip = useLive(() => getPaySlip(id), [id])
  const adjustments = useLive(
    () => (slip ? listAdjustments({ workerId: slip.workerId, month: slip.month }) : []),
    [slip?.workerId, slip?.month],
  )
  const outstanding = useLive(() => (slip ? getAdvanceBalance(slip.workerId) : 0), [slip?.workerId])

  const [repayment, setRepayment] = useState('')
  const [notes, setNotes] = useState('')
  const [adjustment, setAdjustment] = useState(EMPTY_ADJUSTMENT)
  const [method, setMethod] = useState('cash')
  const [paidDate, setPaidDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!slip) return
    setRepayment(minorToInput(slip.advanceRepayment))
    setNotes(slip.notes || '')
  }, [slip?.id, slip?.advanceRepayment, slip?.notes])

  if (slip === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-canvas" />
        <div className="h-96 animate-pulse rounded-2xl bg-canvas" />
      </div>
    )
  }

  if (slip === null) {
    return (
      <Card>
        <EmptyState
          title="قسيمة الراتب غير موجودة"
          description="ربما أُعيد تجهيز المسير من نسخة أخرى."
          action={
            <Link to="/payroll">
              <Button variant="primary">رجوع للرواتب</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  const isDraft = slip.status !== 'paid'

  const refreshSlip = async () => {
    await generatePayroll(slip.month)
  }

  const handleSaveRepayment = async () => {
    try {
      await updatePaySlip(slip.id, { advanceRepayment: repayment, notes })
      toast.success('تم تحديث القسيمة')
    } catch (error) {
      toast.error(error.message || 'تعذر الحفظ')
    }
  }

  const handleAddAdjustment = async (event) => {
    event.preventDefault()
    try {
      await addAdjustment({ ...adjustment, workerId: slip.workerId, month: slip.month })
      await refreshSlip()
      setAdjustment(EMPTY_ADJUSTMENT)
      toast.success('تمت إضافة التعديل وتحديث المسير')
    } catch (error) {
      toast.error(error.message || 'تعذرت الإضافة')
    }
  }

  const handleRemoveAdjustment = async (adjustmentId) => {
    try {
      await removeAdjustment(adjustmentId)
      await refreshSlip()
      toast.success('تم حذف التعديل')
    } catch (error) {
      toast.error(error.message || 'تعذر الحذف')
    }
  }

  const handlePay = async () => {
    setBusy(true)
    try {
      await markPaySlipPaid(slip.id, { method, date: paidDate })
      toast.success('تم تسجيل صرف الراتب')
    } catch (error) {
      toast.error(error.message || 'تعذر الصرف')
    } finally {
      setBusy(false)
    }
  }

  const share = () => {
    openWhatsApp({
      phone: slip.workerPhone || '',
      text: payslipShareText({
        shopName: settings?.profile?.shopName || '',
        workerName: slip.workerName,
        monthLabel: formatMonth(slip.month, { digits }),
        base: slip.baseSalary,
        bonuses: slip.bonuses,
        deductions: slip.deductions,
        advanceRepayment: slip.advanceRepayment,
        net: slip.net,
        currency: settings?.currency?.label || 'ج.م',
      }),
    })
  }

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={`قسيمة راتب — ${slip.workerName}`}
          badge={<Badge tone={isDraft ? 'warn' : 'success'}>{isDraft ? 'مسودة' : 'مصروف'}</Badge>}
          description={`${formatMonth(slip.month, { digits })} • الصافي ${money(slip.net)}`}
          actions={
            <>
              <Link to="/payroll">
                <Button variant="ghost">
                  <ArrowRight size={16} />
                  رجوع
                </Button>
              </Link>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={16} />
                طباعة
              </Button>
              <Button variant="secondary" onClick={share}>
                <MessageCircle size={16} />
                واتساب
              </Button>
            </>
          }
        />
      </div>

      <PayslipDocument slip={slip} />

      <div className="no-print mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="تعديلات الشهر"
            description="المكافآت والخصومات تُضاف هنا ثم يُعاد حساب المسير."
          />

          <form onSubmit={handleAddAdjustment} className="space-y-3 border-b border-line px-5 py-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={adjustment.type}
                onChange={(event) => setAdjustment((current) => ({ ...current, type: event.target.value }))}
                aria-label="نوع التعديل"
              >
                {ADJUSTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
              <Input
                value={adjustment.amount}
                onChange={(event) => setAdjustment((current) => ({ ...current, amount: event.target.value }))}
                placeholder="المبلغ"
                inputMode="decimal"
                dir="ltr"
                aria-label="مبلغ التعديل"
              />
            </div>
            <Input
              value={adjustment.note}
              onChange={(event) => setAdjustment((current) => ({ ...current, note: event.target.value }))}
              placeholder="السبب (اختياري)"
              aria-label="سبب التعديل"
            />
            <Button type="submit" variant="secondary" className="w-full" disabled={!isDraft}>
              <Plus size={16} />
              إضافة التعديل
            </Button>
            {!isDraft && (
              <p className="text-[12px] text-muted">الراتب مصروف — لا يمكن تعديل مسير هذا الشهر.</p>
            )}
          </form>

          {(adjustments || []).length === 0 ? (
            <p className="px-5 py-5 text-center text-[13px] text-muted">لا توجد مكافآت أو خصومات لهذا الشهر.</p>
          ) : (
            <ul className="divide-y divide-line">
              {(adjustments || []).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {adjustmentTypeLabel(row.type)} — {money(row.amount)}
                    </p>
                    {row.note && <p className="truncate text-[11.5px] text-muted">{row.note}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAdjustment(row.id)}
                    disabled={!isDraft}
                    aria-label="حذف التعديل"
                  >
                    <Trash2 size={15} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="خصم السلفة"
              description={`المتبقي على العامل ${money(outstanding || 0)}`}
            />
            <div className="space-y-3 px-5 py-4">
              <Field label="المخصوم هذا الشهر" htmlFor="slip-repayment">
                <Input
                  id="slip-repayment"
                  value={repayment}
                  onChange={(event) => setRepayment(event.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  dir="ltr"
                  disabled={!isDraft}
                />
              </Field>
              <Field label="ملاحظات القسيمة" htmlFor="slip-notes">
                <Input
                  id="slip-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="اختياري"
                  disabled={!isDraft}
                />
              </Field>
              <Button variant="secondary" className="w-full" onClick={handleSaveRepayment} disabled={!isDraft}>
                حفظ التعديل
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="الصرف"
              description={
                slip.status === 'paid'
                  ? `صُرف في ${formatShortDate(slip.paidAt, { digits })} — ${methodLabel(slip.method)}`
                  : 'سجّل الصرف ليُخصم من رصيد السلفة ويُقفل المسير.'
              }
            />
            <div className="space-y-3 px-5 py-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={method} onChange={(event) => setMethod(event.target.value)} disabled={!isDraft} aria-label="طريقة الصرف">
                  {PAYMENT_METHODS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(event) => setPaidDate(event.target.value)}
                  disabled={!isDraft}
                  aria-label="تاريخ الصرف"
                />
              </div>
              <Button variant="primary" className="w-full" onClick={handlePay} disabled={!isDraft || busy}>
                <Wallet size={16} />
                {busy ? 'جارٍ التسجيل…' : isDraft ? `صرف ${money(slip.net)}` : 'تم الصرف'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
