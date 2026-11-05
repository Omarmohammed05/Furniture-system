import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Wallet } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { formatShortDate, todayIso } from '../lib/dates'
import {
  PAYMENT_METHODS,
  installmentRemaining,
  isOverdue,
  listInstallments,
  payInstallment,
} from '../services/payments'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'

const FILTERS = [
  { value: 'open', label: 'غير مسددة' },
  { value: 'overdue', label: 'متأخرة' },
  { value: 'week', label: 'خلال الأسبوع' },
  { value: 'paid', label: 'مسددة' },
  { value: 'all', label: 'الكل' },
]

function CollectModal({ open, onClose, installment, onSaved }) {
  const toast = useToast()
  const { money } = useSettings()
  const [method, setMethod] = useState('cash')
  const [date, setDate] = useState(todayIso())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setMethod('cash')
    setDate(todayIso())
  }, [open])

  const due = installment ? installmentRemaining(installment) : 0

  const submit = async () => {
    setBusy(true)
    try {
      await payInstallment(installment.id, { method, date })
      toast.success('تم تحصيل القسط')
      onSaved?.()
      onClose?.()
    } catch (error) {
      toast.error(error.message || 'تعذر التحصيل')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title="تحصيل القسط"
      description={installment?.invoice?.customerName}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : `تحصيل ${money(due)}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-canvas px-4 py-3 text-[13px]">
          <p className="font-semibold text-ink">
            قسط {installment?.seq} — {installment?.invoice?.number}
          </p>
          <p className="text-muted">
            مستحق {formatShortDate(installment?.dueDate)} — المتبقي {money(due)}
          </p>
        </div>
        <Field label="طريقة الدفع" htmlFor="collect-method">
          <Select id="collect-method" value={method} onChange={(event) => setMethod(event.target.value)}>
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="التاريخ" htmlFor="collect-date">
          <Input id="collect-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} dir="ltr" />
        </Field>
      </div>
    </Modal>
  )
}

export function InstallmentsPage() {
  const { money, digits } = useSettings()
  const [filter, setFilter] = useState('open')
  const [target, setTarget] = useState(null)

  const rows = useLive(() => listInstallments({ filter }), [filter])
  const visible = (rows || []).filter((row) => row.invoice && !row.invoice.voidedAt)

  const overdueRows = visible.filter((row) => isOverdue(row))
  const overdueTotal = overdueRows.reduce((sum, row) => sum + installmentRemaining(row), 0)
  const openTotal = visible
    .filter((row) => row.status !== 'paid')
    .reduce((sum, row) => sum + installmentRemaining(row), 0)

  return (
    <div>
      <PageHeader title="الأقساط" description="مواعيد استحقاق أقساط العملاء وتحصيلها." />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className={`card p-4 ${overdueTotal > 0 ? 'border-danger/25 bg-danger-soft' : ''}`}>
          <p className="text-[12px] font-semibold text-muted">متأخر</p>
          <p className="tabular mt-1 text-[19px] font-bold text-danger">{money(overdueTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] font-semibold text-muted">إجمالي غير المسدد</p>
          <p className="tabular mt-1 text-[19px] font-bold text-ink">{money(openTotal)}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-line bg-surface p-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`h-10 shrink-0 rounded-xl px-3 text-[13px] font-semibold transition-colors ${
              filter === option.value ? 'bg-solid text-on-solid' : 'bg-canvas text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Card>
        {rows === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="لا توجد أقساط"
            description="الأقساط تظهر عندما تحفظ فاتورة بيع بمتبقٍ ومقسمة على أقساط."
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((row) => {
              const overdue = isOverdue(row)
              const remaining = installmentRemaining(row)
              return (
                <li key={row.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14px] font-semibold text-ink">{row.invoice?.customerName || '—'}</p>
                      <Link to={`/sales/${row.salesInvoiceId}`} className="tabular text-[12px] font-semibold text-walnut hover:underline" dir="ltr">
                        {row.invoice?.number}
                      </Link>
                      {row.status === 'paid' ? (
                        <Badge tone="success">مسدد</Badge>
                      ) : overdue ? (
                        <Badge tone="danger">متأخر</Badge>
                      ) : (
                        <Badge tone="sand">مستحق</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted">
                      قسط {row.seq} • {formatShortDate(row.dueDate, { digits })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-start sm:text-end">
                      <p className="tabular text-[14px] font-bold text-ink">{money(row.amount)}</p>
                      {row.status !== 'paid' && remaining < row.amount && (
                        <p className="tabular text-[11.5px] text-muted">متبقي {money(remaining)}</p>
                      )}
                    </div>
                    {row.status !== 'paid' && (
                      <Button variant="secondary" size="sm" onClick={() => setTarget(row)}>
                        <Wallet size={15} />
                        تحصيل
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <CollectModal open={Boolean(target)} onClose={() => setTarget(null)} installment={target} />
    </div>
  )
}
