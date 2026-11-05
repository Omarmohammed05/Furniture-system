import { useEffect, useState } from 'react'
import { Banknote, Plus } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { formatShortDate, todayIso } from '../lib/dates'
import { listWorkers } from '../services/workers'
import {
  REPAY_MODES,
  advanceRemaining,
  createAdvance,
  listAdvanceOverview,
  listAdvances,
  repayModeLabel,
  validateAdvance,
} from '../services/payroll'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'

const EMPTY_FORM = { workerId: '', date: todayIso(), amount: '', repayMode: 'monthly', monthlyAmount: '', note: '' }

function AdvanceFormModal({ open, onClose }) {
  const toast = useToast()
  const [values, setValues] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const workers = useLive(() => listWorkers(), [])

  useEffect(() => {
    if (!open) return
    setValues(EMPTY_FORM)
    setErrors({})
  }, [open])

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const localErrors = validateAdvance(values)
    if (Object.keys(localErrors).length) {
      setErrors(localErrors)
      return
    }
    setSaving(true)
    try {
      await createAdvance(values)
      toast.success('تم تسجيل السلفة')
      onClose()
    } catch (error) {
      if (error.errors) setErrors(error.errors)
      else toast.error(error.message || 'تعذر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="سلفة جديدة"
      description="تُخصم السلفة من الرواتب حسب طريقة السداد المختارة."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="العامل" htmlFor="advance-worker" required error={errors.workerId}>
          <Select
            id="advance-worker"
            value={values.workerId}
            onChange={(event) => setField('workerId', event.target.value)}
            invalid={Boolean(errors.workerId)}
          >
            <option value="">اختر العامل</option>
            {(workers || []).map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المبلغ" htmlFor="advance-amount" required error={errors.amount}>
            <Input
              id="advance-amount"
              value={values.amount}
              onChange={(event) => setField('amount', event.target.value)}
              placeholder="0"
              inputMode="decimal"
              dir="ltr"
              invalid={Boolean(errors.amount)}
            />
          </Field>
          <Field label="التاريخ" htmlFor="advance-date" error={errors.date}>
            <Input
              id="advance-date"
              type="date"
              value={values.date}
              onChange={(event) => setField('date', event.target.value)}
              invalid={Boolean(errors.date)}
            />
          </Field>
        </div>

        <Field label="طريقة السداد" htmlFor="advance-mode">
          <Select
            id="advance-mode"
            value={values.repayMode}
            onChange={(event) => setField('repayMode', event.target.value)}
          >
            {REPAY_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </Select>
        </Field>

        {values.repayMode === 'monthly' && (
          <Field
            label="المبلغ الشهري"
            htmlFor="advance-monthly"
            error={errors.monthlyAmount}
            hint="يُخصم هذا المبلغ من كل مسير حتى تُسدد السلفة."
          >
            <Input
              id="advance-monthly"
              value={values.monthlyAmount}
              onChange={(event) => setField('monthlyAmount', event.target.value)}
              placeholder="0"
              inputMode="decimal"
              dir="ltr"
              invalid={Boolean(errors.monthlyAmount)}
            />
          </Field>
        )}

        <Field label="ملاحظات" htmlFor="advance-note">
          <Textarea
            id="advance-note"
            value={values.note}
            onChange={(event) => setField('note', event.target.value)}
            placeholder="سبب السلفة"
          />
        </Field>
      </form>
    </Modal>
  )
}

export function AdvancesPage() {
  const { money, digits } = useSettings()
  const [workerId, setWorkerId] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const overview = useLive(() => listAdvanceOverview(), [])
  const advances = useLive(() => listAdvances({ workerId, includeSettled: true }), [workerId])
  const workers = useLive(() => listWorkers(), [])

  const totalOutstanding = (overview || []).reduce((sum, row) => sum + row.outstanding, 0)

  return (
    <div>
      <PageHeader
        title="السلف"
        description="سلف العمال ورصيدها المتبقي، وتُخصم تلقائياً في مسير الرواتب."
        actions={
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <Plus size={17} />
            سلفة جديدة
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-[12px] font-semibold text-muted">إجمالي السلف المتبقية</p>
          <p className="tabular mt-1 text-[22px] font-bold text-ink">{money(totalOutstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-semibold text-muted">عمال عليهم سلف</p>
          <p className="tabular mt-1 text-[22px] font-bold text-ink">
            {(overview || []).filter((row) => row.outstanding > 0).length}
          </p>
        </Card>
      </div>

      {(overview || []).some((row) => row.outstanding > 0) && (
        <Card className="mb-4 p-4">
          <p className="mb-2 text-[13px] font-semibold text-ink">أرصدة العمال</p>
          <ul className="space-y-2">
            {(overview || [])
              .filter((row) => row.outstanding > 0)
              .map((row) => (
                <li key={row.worker.id} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">
                    {row.worker.name}
                    {row.openCount > 1 ? ` (${row.openCount} سلف)` : ''}
                  </span>
                  <span className="tabular font-semibold text-danger">{money(row.outstanding)}</span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={workerId}
          onChange={(event) => setWorkerId(event.target.value)}
          className="sm:w-64"
          aria-label="تصفية بالعامل"
        >
          <option value="">كل العمال</option>
          {(workers || []).map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {advances === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : advances.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="لا توجد سلف مسجلة"
            description="سجّل سلفة لعامل ليتولى مسير الرواتب خصمها تلقائياً."
            action={
              <Button variant="primary" onClick={() => setFormOpen(true)}>
                <Plus size={16} />
                سلفة جديدة
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {advances.map((advance) => (
              <li key={advance.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{advance.workerName}</p>
                    {advanceRemaining(advance) > 0 ? (
                      <Badge tone="warn">متبقي {money(advance.remaining)}</Badge>
                    ) : (
                      <Badge tone="success">مسددة</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {formatShortDate(advance.date, { digits })} • {repayModeLabel(advance.repayMode)}
                    {advance.repayMode === 'monthly' && advance.monthlyAmount
                      ? ` (${money(advance.monthlyAmount)} شهرياً)`
                      : ''}
                    {advance.note ? ` • ${advance.note}` : ''}
                  </p>
                </div>
                <div className="text-end">
                  <p className="tabular text-[14.5px] font-bold text-ink">{money(advance.amount)}</p>
                  <p className="tabular text-[11.5px] text-muted">سُدِّد {money(advance.repaid || 0)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AdvanceFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
