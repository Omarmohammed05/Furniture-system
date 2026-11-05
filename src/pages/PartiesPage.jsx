import { useEffect, useState } from 'react'
import { Pencil, Plus, RotateCcw, Archive, Users, Truck } from 'lucide-react'
import { useToast } from '../app/ToastContext'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { archiveParty, createParty, listParties, updateParty, restoreParty, validateParty } from '../services/parties'
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

const COPY = {
  customers: {
    title: 'العملاء',
    description: 'كل من يشتري من المعرض — بالاسم والهاتف والرصيد الافتتاحي.',
    add: 'إضافة عميل',
    empty: 'لا يوجد عملاء بعد',
    emptyHint: 'ابدأ بإضافة أول عميل؛ يبقى «عميل نقدي» جاهزاً للبيع السريع.',
    noun: 'العميل',
    icon: Users,
    placeholder: 'ابحث باسم العميل أو رقم الهاتف…',
  },
  suppliers: {
    title: 'الموردون',
    description: 'من نشتري منهم الخامات والأصناف، مع الرصيد الافتتاحي.',
    add: 'إضافة مورد',
    empty: 'لا يوجد موردون بعد',
    emptyHint: 'أضف أول مورد لتسجيل المشتريات عليه لاحقاً.',
    noun: 'المورد',
    icon: Truck,
    placeholder: 'ابحث باسم المورد أو رقم الهاتف…',
  },
}

const EMPTY_FORM = { name: '', phone: '', address: '', openingBalance: '', notes: '' }

function PartyFormModal({ open, onClose, kind, party, onSaved }) {
  const toast = useToast()
  const [values, setValues] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setValues(
      party
        ? {
            name: party.name || '',
            phone: party.phone || '',
            address: party.address || '',
            openingBalance: minorToInput(party.openingBalance),
            notes: party.notes || '',
          }
        : EMPTY_FORM,
    )
  }, [open, party])

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const localErrors = validateParty(values)
    if (Object.keys(localErrors).length) {
      setErrors(localErrors)
      return
    }
    setSaving(true)
    try {
      if (party) {
        await updateParty(kind, party.id, values)
        toast.success('تم حفظ التعديلات')
      } else {
        await createParty(kind, values)
        toast.success('تمت الإضافة')
      }
      onSaved?.()
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
      title={party ? `تعديل ${COPY[kind].noun}` : COPY[kind].add}
      description={party ? 'التعديل يُسجَّل في سجل النشاطات.' : undefined}
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
        <Field label="الاسم" htmlFor="party-name" required error={errors.name}>
          <Input
            id="party-name"
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder={kind === 'customers' ? 'مثال: أحمد محمد' : 'مثال: شركة الأخشاب'}
            invalid={Boolean(errors.name)}
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم الهاتف" htmlFor="party-phone" error={errors.phone}>
            <Input
              id="party-phone"
              value={values.phone}
              onChange={(event) => setField('phone', event.target.value)}
              placeholder="01xxxxxxxxx"
              inputMode="tel"
              dir="ltr"
              invalid={Boolean(errors.phone)}
            />
          </Field>
          <Field
            label="الرصيد الافتتاحي"
            htmlFor="party-opening"
            error={errors.openingBalance}
            hint="المبلغ المتبقي قبل بدء استخدام النظام (اختياري)"
          >
            <Input
              id="party-opening"
              value={values.openingBalance}
              onChange={(event) => setField('openingBalance', event.target.value)}
              placeholder="0"
              inputMode="decimal"
              dir="ltr"
              invalid={Boolean(errors.openingBalance)}
            />
          </Field>
        </div>

        <Field label="العنوان" htmlFor="party-address">
          <Input
            id="party-address"
            value={values.address}
            onChange={(event) => setField('address', event.target.value)}
            placeholder="المدينة — الشارع"
          />
        </Field>

        <Field label="ملاحظات" htmlFor="party-notes">
          <Textarea
            id="party-notes"
            value={values.notes}
            onChange={(event) => setField('notes', event.target.value)}
            placeholder="أي تفاصيل مفيدة"
          />
        </Field>
      </form>
    </Modal>
  )
}

export function PartiesPage({ kind }) {
  const copy = COPY[kind]
  const { money } = useSettings()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)

  const parties = useLive(() => listParties(kind, { search, includeArchived }), [kind, search, includeArchived])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (party) => {
    setEditing(party)
    setFormOpen(true)
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      await archiveParty(kind, archiveTarget.id)
      toast.success('تمت الأرشفة')
    } catch (error) {
      toast.error(error.message || 'تعذرت الأرشفة')
    }
  }

  const handleRestore = async (party) => {
    try {
      await restoreParty(kind, party.id)
      toast.success('تمت الاستعادة')
    } catch (error) {
      toast.error(error.message || 'تعذرت الاستعادة')
    }
  }

  const Icon = copy.icon

  return (
    <div>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={17} />
            {copy.add}
          </Button>
        }
      />

      <SearchToolbar
        search={search}
        onSearch={setSearch}
        placeholder={copy.placeholder}
        includeArchived={includeArchived}
        onIncludeArchived={setIncludeArchived}
      />

      <Card>
        {parties === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : parties.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={search ? 'لا توجد نتائج مطابقة' : copy.empty}
            description={search ? 'جرّب اسماً أو رقماً آخر، أو أوقف تصفية المؤرشفة.' : copy.emptyHint}
            action={
              !search && (
                <Button variant="primary" onClick={openCreate}>
                  <Plus size={16} />
                  {copy.add}
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {parties.map((party) => (
              <li
                key={party.id}
                className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center ${party.deletedAt ? 'opacity-70' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{party.name}</p>
                    {party.isWalkIn && <Badge tone="sand">افتراضي</Badge>}
                    {party.deletedAt && <Badge tone="outline">مؤرشف</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted">
                    {party.phone || 'بدون رقم هاتف'}
                    {party.address ? ` • ${party.address}` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="sm:w-36 sm:text-end">
                    <p className="text-[11px] text-muted">رصيد افتتاحي</p>
                    <p className="tabular text-[13.5px] font-semibold text-ink">{money(party.openingBalance)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(party)} aria-label={`تعديل ${party.name}`}>
                      <Pencil size={16} />
                    </Button>
                    {party.deletedAt ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRestore(party)}
                        aria-label={`استعادة ${party.name}`}
                      >
                        <RotateCcw size={16} />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setArchiveTarget(party)}
                        disabled={party.isWalkIn}
                        aria-label={`أرشفة ${party.name}`}
                        title={party.isWalkIn ? 'لا يمكن أرشفة عميل النقدي' : 'أرشفة'}
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

      <PartyFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        kind={kind}
        party={editing}
        onSaved={() => setEditing(null)}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="أرشفة السجل؟"
        message={`سيتم إخفاء «${archiveTarget?.name || ''}» من القوائم، ويمكن استعادته في أي وقت. السجلات المرتبطة به لا تُحذف.`}
        confirmLabel="أرشفة"
      />
    </div>
  )
}
