import { useEffect, useState } from 'react'
import { Ban, Pencil, Plus, Receipt } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { currentMonth, formatMonth, formatShortDate, monthRange, todayIso } from '../lib/dates'
import { minorToInput } from '../lib/money'
import { listCategories } from '../services/masterData'
import { PAYMENT_METHODS, methodLabel } from '../services/payments'
import {
  createExpense,
  expenseTotalsByCategory,
  listExpenses,
  updateExpense,
  validateExpense,
  voidExpense,
} from '../services/expenses'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'

const EMPTY_FORM = { date: todayIso(), categoryId: '', amount: '', method: 'cash', note: '' }

function ExpenseFormModal({ open, onClose, expense }) {
  const toast = useToast()
  const [values, setValues] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const categories = useLive(() => listCategories('expense'), [])

  useEffect(() => {
    if (!open) return
    setErrors({})
    setValues(
      expense
        ? {
            date: expense.date,
            categoryId: expense.categoryId,
            amount: minorToInput(expense.amount),
            method: expense.method || 'cash',
            note: expense.note || '',
          }
        : EMPTY_FORM,
    )
  }, [open, expense])

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const localErrors = validateExpense(values)
    if (Object.keys(localErrors).length) {
      setErrors(localErrors)
      return
    }
    setSaving(true)
    try {
      if (expense) await updateExpense(expense.id, values)
      else await createExpense(values)
      toast.success(expense ? 'تم حفظ المصروف' : 'تم تسجيل المصروف')
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
      title={expense ? 'تعديل المصروف' : 'تسجيل مصروف'}
      description="مصروفات المعرض التي ليست فواتير شراء."
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="التصنيف" htmlFor="expense-category" required error={errors.categoryId}>
            <Select
              id="expense-category"
              value={values.categoryId}
              onChange={(event) => setField('categoryId', event.target.value)}
              invalid={Boolean(errors.categoryId)}
            >
              <option value="">اختر التصنيف</option>
              {(categories || []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="المبلغ" htmlFor="expense-amount" required error={errors.amount}>
            <Input
              id="expense-amount"
              value={values.amount}
              onChange={(event) => setField('amount', event.target.value)}
              placeholder="0"
              inputMode="decimal"
              dir="ltr"
              invalid={Boolean(errors.amount)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="التاريخ" htmlFor="expense-date" error={errors.date}>
            <Input
              id="expense-date"
              type="date"
              value={values.date}
              onChange={(event) => setField('date', event.target.value)}
              invalid={Boolean(errors.date)}
            />
          </Field>
          <Field label="طريقة الدفع" htmlFor="expense-method">
            <Select
              id="expense-method"
              value={values.method}
              onChange={(event) => setField('method', event.target.value)}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="ملاحظات" htmlFor="expense-note">
          <Textarea
            id="expense-note"
            value={values.note}
            onChange={(event) => setField('note', event.target.value)}
            placeholder="تفاصيل المصروف"
          />
        </Field>
      </form>
    </Modal>
  )
}

export function ExpensesPage() {
  const { money, digits } = useSettings()
  const toast = useToast()

  const [month, setMonth] = useState(currentMonth())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [voidTarget, setVoidTarget] = useState(null)
  const [voidReason, setVoidReason] = useState('')

  const { from, to } = monthRange(month)
  const rows = useLive(() => listExpenses({ from, to }), [from, to])
  const categories = useLive(() => listCategories('expense'), [])

  const totals = expenseTotalsByCategory(rows || [])
  const total = totals.reduce((sum, row) => sum + row.total, 0)

  const handleVoid = async () => {
    if (!voidTarget) return
    try {
      await voidExpense(voidTarget.id, voidReason)
      toast.success('تم إلغاء المصروف')
      setVoidReason('')
    } catch (error) {
      toast.error(error.message || 'تعذر الإلغاء')
    }
  }

  return (
    <div>
      <PageHeader
        title="المصروفات"
        description="الإيجار والكهرباء والنقل والصيانة — كل ما يخرج من المعرض خارج فواتير الشراء."
        actions={
          <>
            <Input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value || currentMonth())}
              className="w-40"
              aria-label="الشهر"
            />
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus size={17} />
              تسجيل مصروف
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <p className="text-[12px] font-semibold text-muted">إجمالي {formatMonth(month, { digits })}</p>
          <p className="tabular mt-1 text-[22px] font-bold text-ink">{money(total)}</p>
        </Card>
        {totals.slice(0, 2).map((row) => (
          <Card key={row.categoryId} className="p-4">
            <p className="text-[12px] font-semibold text-muted">{row.name}</p>
            <p className="tabular mt-1 text-[22px] font-bold text-ink">{money(row.total)}</p>
          </Card>
        ))}
      </div>

      {totals.length > 0 && (
        <Card className="mb-4 p-4">
          <p className="mb-2 text-[13px] font-semibold text-ink">توزيع المصروفات على التصنيفات</p>
          <ul className="space-y-2">
            {totals.map((row) => (
              <li key={row.categoryId} className="flex items-center justify-between text-[13px]">
                <span className="text-muted">
                  {row.name} <span className="text-[11.5px]">({row.count})</span>
                </span>
                <span className="tabular font-semibold text-ink">{money(row.total)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        {rows === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={`لا توجد مصروفات في ${formatMonth(month, { digits })}`}
            description={
              (categories || []).length === 0
                ? 'أضف تصنيفات المصروفات من «القوائم المساعدة» ثم سجّل أول مصروف.'
                : 'سجّل أول مصروف لهذا الشهر.'
            }
            action={
              (categories || []).length > 0 && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  <Plus size={16} />
                  تسجيل مصروف
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((expense) => (
              <li
                key={expense.id}
                className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center ${expense.voidedAt ? 'opacity-60' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{expense.categoryName}</p>
                    {expense.voidedAt && <Badge tone="danger">ملغى</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {formatShortDate(expense.date, { digits })} • {methodLabel(expense.method)}
                    {expense.note ? ` • ${expense.note}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <p className="tabular text-[14.5px] font-bold text-ink">{money(expense.amount)}</p>
                  {!expense.voidedAt && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(expense)
                          setFormOpen(true)
                        }}
                        aria-label="تعديل المصروف"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setVoidReason('')
                          setVoidTarget(expense)
                        }}
                        aria-label="إلغاء هذا المصروف"
                      >
                        <Ban size={16} />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ExpenseFormModal open={formOpen} onClose={() => setFormOpen(false)} expense={editing} />

      <ConfirmDialog
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoid}
        title="إلغاء المصروف؟"
        message={`سيُستبعد ${voidTarget ? money(voidTarget.amount) : ''} من كل التقارير، ويبقى ظاهراً في القائمة كملغى.`}
        confirmLabel="إلغاء المصروف"
      >
        <Field label="سبب الإلغاء" htmlFor="void-expense-reason">
          <Input
            id="void-expense-reason"
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            placeholder="مثال: سُجِّل بالخطأ"
          />
        </Field>
      </ConfirmDialog>
    </div>
  )
}
