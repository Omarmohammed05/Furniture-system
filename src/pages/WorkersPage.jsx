import { useEffect, useState } from 'react'
import { Archive, HardHat, Pencil, Plus, RotateCcw } from 'lucide-react'
import { useToast } from '../app/ToastContext'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { archiveWorker, createWorker, listWorkers, restoreWorker, updateWorker, validateWorker } from '../services/workers'
import { ValidationError } from '../lib/errors'
import { minorToInput } from '../lib/money'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchToolbar } from '../components/SearchToolbar'

const EMPTY_FORM = { name: '', jobTitle: '', phone: '', monthlySalary: '', hireDate: '', notes: '' }

function WorkerFormModal({ open, onClose, worker }) {
  const toast = useToast()
  const [values, setValues] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setValues(
      worker
        ? {
            name: worker.name || '',
            jobTitle: worker.jobTitle || '',
            phone: worker.phone || '',
            monthlySalary: minorToInput(worker.monthlySalary),
            hireDate: worker.hireDate || '',
            notes: worker.notes || '',
          }
        : EMPTY_FORM,
    )
  }, [open, worker])

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const localErrors = validateWorker(values)
    if (Object.keys(localErrors).length) {
      setErrors(localErrors)
      return
    }
    setSaving(true)
    try {
      if (worker) {
        await updateWorker(worker.id, values)
        toast.success('تم حفظ بيانات العامل')
      } else {
        await createWorker(values)
        toast.success('تمت إضافة العامل')
      }
      onClose()
    } catch (error) {
      if (error instanceof ValidationError) setErrors(error.errors)
      else toast.error(error.message || 'تعذر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={worker ? 'تعديل بيانات العامل' : 'إضافة عامل'}
      description="المرتب الشهري يُستخدم في مسير الرواتب (المرحلة الثالثة)."
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
          <Field label="الاسم" htmlFor="worker-name" required error={errors.name}>
            <Input
              id="worker-name"
              value={values.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="مثال: محمود النجار"
              invalid={Boolean(errors.name)}
              autoFocus
            />
          </Field>
          <Field label="الوظيفة" htmlFor="worker-job">
            <Input
              id="worker-job"
              value={values.jobTitle}
              onChange={(event) => setField('jobTitle', event.target.value)}
              placeholder="نجار، دهّان…"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="المرتب الشهري" htmlFor="worker-salary" error={errors.monthlySalary}>
            <Input
              id="worker-salary"
              value={values.monthlySalary}
              onChange={(event) => setField('monthlySalary', event.target.value)}
              placeholder="0"
              inputMode="decimal"
              dir="ltr"
              invalid={Boolean(errors.monthlySalary)}
            />
          </Field>
          <Field label="تاريخ التعيين" htmlFor="worker-hire" error={errors.hireDate}>
            <Input
              id="worker-hire"
              type="date"
              value={values.hireDate}
              onChange={(event) => setField('hireDate', event.target.value)}
              invalid={Boolean(errors.hireDate)}
            />
          </Field>
          <Field label="الهاتف" htmlFor="worker-phone">
            <Input
              id="worker-phone"
              value={values.phone}
              onChange={(event) => setField('phone', event.target.value)}
              placeholder="01xxxxxxxxx"
              inputMode="tel"
              dir="ltr"
            />
          </Field>
        </div>

        <Field label="ملاحظات" htmlFor="worker-notes">
          <Textarea
            id="worker-notes"
            value={values.notes}
            onChange={(event) => setField('notes', event.target.value)}
            placeholder="أي تفاصيل مفيدة"
          />
        </Field>
      </form>
    </Modal>
  )
}

export function WorkersPage() {
  const { money } = useSettings()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)

  const workers = useLive(() => listWorkers({ search, includeArchived }), [search, includeArchived])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      await archiveWorker(archiveTarget.id)
      toast.success('تمت أرشفة العامل')
    } catch (error) {
      toast.error(error.message || 'تعذرت الأرشفة')
    }
  }

  const handleRestore = async (worker) => {
    try {
      await restoreWorker(worker.id)
      toast.success('تمت الاستعادة')
    } catch (error) {
      toast.error(error.message || 'تعذرت الاستعادة')
    }
  }

  return (
    <div>
      <PageHeader
        title="العمال"
        description="بيانات العمال والمرتبات الشهرية."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={17} />
            إضافة عامل
          </Button>
        }
      />

      <SearchToolbar
        search={search}
        onSearch={setSearch}
        placeholder="ابحث بالاسم أو الوظيفة…"
        includeArchived={includeArchived}
        onIncludeArchived={setIncludeArchived}
      />

      <Card>
        {workers === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <EmptyState
            icon={HardHat}
            title={search ? 'لا توجد نتائج مطابقة' : 'لا يوجد عمال بعد'}
            description={search ? 'جرّب اسماً آخر.' : 'أضف العمال ومرتباتهم لتجهيز مسير الرواتب لاحقاً.'}
            action={
              !search && (
                <Button variant="primary" onClick={openCreate}>
                  <Plus size={16} />
                  إضافة عامل
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {workers.map((worker) => (
              <li
                key={worker.id}
                className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center ${worker.deletedAt ? 'opacity-70' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{worker.name}</p>
                    {worker.jobTitle && <Badge tone="neutral">{worker.jobTitle}</Badge>}
                    {worker.deletedAt && <Badge tone="outline">مؤرشف</Badge>}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted" dir="ltr">
                    {worker.phone || '—'}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="sm:w-36 sm:text-end">
                    <p className="text-[11px] text-muted">المرتب الشهري</p>
                    <p className="tabular text-[13.5px] font-semibold text-ink">{money(worker.monthlySalary)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(worker)
                        setFormOpen(true)
                      }}
                      aria-label={`تعديل ${worker.name}`}
                    >
                      <Pencil size={16} />
                    </Button>
                    {worker.deletedAt ? (
                      <Button variant="ghost" size="icon" onClick={() => handleRestore(worker)} aria-label={`استعادة ${worker.name}`}>
                        <RotateCcw size={16} />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setArchiveTarget(worker)}
                        aria-label={`أرشفة ${worker.name}`}
                      >
                        <Archive size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <WorkerFormModal open={formOpen} onClose={() => setFormOpen(false)} worker={editing} />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="أرشفة العامل؟"
        message={`سيتم إخفاء «${archiveTarget?.name || ''}» من القوائم. لا تُحذف بياناته أو مستحقاته.`}
        confirmLabel="أرشفة"
      />
    </div>
  )
}
