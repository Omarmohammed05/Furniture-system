import { useEffect, useState } from 'react'
import { Archive, Pencil, Plus, Package, RotateCcw } from 'lucide-react'
import { useToast } from '../app/ToastContext'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { archiveItem, createItem, ITEM_TYPES, itemTypeLabel, listItems, restoreItem, updateItem, validateItem } from '../services/items'
import { listCategories, listUnits } from '../services/masterData'
import { ValidationError } from '../lib/errors'
import { minorToInput } from '../lib/money'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchToolbar } from '../components/SearchToolbar'

const EMPTY_FORM = {
  type: 'raw_material',
  name: '',
  code: '',
  categoryId: '',
  unitId: '',
  purchasePrice: '',
  salePrice: '',
  minStock: '',
  notes: '',
}

function ItemFormModal({ open, onClose, item, categories, units }) {
  const toast = useToast()
  const [values, setValues] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setValues(
      item
        ? {
            type: item.type,
            name: item.name || '',
            code: item.code || '',
            categoryId: item.categoryId || '',
            unitId: item.unitId || '',
            purchasePrice: minorToInput(item.purchasePrice),
            salePrice: minorToInput(item.salePrice),
            minStock: item.minStock ? String(item.minStock) : '',
            notes: item.notes || '',
          }
        : EMPTY_FORM,
    )
  }, [open, item])

  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const localErrors = validateItem(values)
    if (Object.keys(localErrors).length) {
      setErrors(localErrors)
      return
    }
    setSaving(true)
    try {
      if (item) {
        await updateItem(item.id, values)
        toast.success('تم حفظ الصنف')
      } else {
        await createItem(values)
        toast.success('تمت إضافة الصنف')
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
      title={item ? 'تعديل الصنف' : 'إضافة صنف'}
      description="الأسعار تُحفظ بالجنيه والقرش، والمخزون يُحسب من الحركات لاحقاً."
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
        <Field label="نوع الصنف" htmlFor="item-type" required error={errors.type}>
          <Select
            id="item-type"
            value={values.type}
            onChange={(event) => setField('type', event.target.value)}
            invalid={Boolean(errors.type)}
          >
            {ITEM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="الاسم" htmlFor="item-name" required error={errors.name} className="sm:col-span-2">
            <Input
              id="item-name"
              value={values.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="مثال: خشب موسكي 18 مم"
              invalid={Boolean(errors.name)}
              autoFocus
            />
          </Field>
          <Field label="الكود" htmlFor="item-code" error={errors.code} hint="اختياري">
            <Input
              id="item-code"
              value={values.code}
              onChange={(event) => setField('code', event.target.value)}
              placeholder="WD-018"
              dir="ltr"
              invalid={Boolean(errors.code)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="التصنيف" htmlFor="item-category">
            <Select
              id="item-category"
              value={values.categoryId}
              onChange={(event) => setField('categoryId', event.target.value)}
            >
              <option value="">بدون تصنيف</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الوحدة" htmlFor="item-unit">
            <Select id="item-unit" value={values.unitId} onChange={(event) => setField('unitId', event.target.value)}>
              <option value="">بدون وحدة</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="سعر الشراء" htmlFor="item-purchase" error={errors.purchasePrice}>
            <Input
              id="item-purchase"
              value={values.purchasePrice}
              onChange={(event) => setField('purchasePrice', event.target.value)}
              placeholder="0"
              inputMode="decimal"
              dir="ltr"
              invalid={Boolean(errors.purchasePrice)}
            />
          </Field>
          <Field label="سعر البيع" htmlFor="item-sale" error={errors.salePrice}>
            <Input
              id="item-sale"
              value={values.salePrice}
              onChange={(event) => setField('salePrice', event.target.value)}
              placeholder="0"
              inputMode="decimal"
              dir="ltr"
              invalid={Boolean(errors.salePrice)}
            />
          </Field>
          <Field label="حد التنبيه" htmlFor="item-min" error={errors.minStock} hint="ينبّه عند النقص">
            <Input
              id="item-min"
              value={values.minStock}
              onChange={(event) => setField('minStock', event.target.value)}
              placeholder="0"
              inputMode="decimal"
              dir="ltr"
              invalid={Boolean(errors.minStock)}
            />
          </Field>
        </div>

        <Field label="ملاحظات" htmlFor="item-notes">
          <Textarea
            id="item-notes"
            value={values.notes}
            onChange={(event) => setField('notes', event.target.value)}
            placeholder="مقاسات، لون، أو أي تفاصيل"
          />
        </Field>
      </form>
    </Modal>
  )
}

export function ItemsPage() {
  const { money, quantity } = useSettings()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)

  const items = useLive(() => listItems({ search, type, includeArchived }), [search, type, includeArchived])
  const categories = useLive(() => listCategories('item'), [])
  const units = useLive(() => listUnits(), [])

  const categoryName = (id) => categories?.find((category) => category.id === id)?.name
  const unitName = (id) => units?.find((unit) => unit.id === id)?.name

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      await archiveItem(archiveTarget.id)
      toast.success('تمت أرشفة الصنف')
    } catch (error) {
      toast.error(error.message || 'تعذرت الأرشفة')
    }
  }

  const handleRestore = async (item) => {
    try {
      await restoreItem(item.id)
      toast.success('تمت استعادة الصنف')
    } catch (error) {
      toast.error(error.message || 'تعذرت الاستعادة')
    }
  }

  return (
    <div>
      <PageHeader
        title="الأصناف"
        description="الخامات التي نشتريها والمنتجات التي نبيعها، بأسعارها ووحداتها."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={17} />
            إضافة صنف
          </Button>
        }
      />

      <SearchToolbar
        search={search}
        onSearch={setSearch}
        placeholder="ابحث بالاسم أو الكود…"
        includeArchived={includeArchived}
        onIncludeArchived={setIncludeArchived}
      >
        <Select value={type} onChange={(event) => setType(event.target.value)} className="sm:w-44" aria-label="نوع الصنف">
          <option value="all">كل الأنواع</option>
          {ITEM_TYPES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </Select>
      </SearchToolbar>

      <Card>
        {items === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search || type !== 'all' ? 'لا توجد أصناف مطابقة' : 'لا توجد أصناف بعد'}
            description={
              search || type !== 'all'
                ? 'جرّب بحثاً آخر أو أعد التصفية إلى كل الأنواع.'
                : 'أضف الخامات التي تشتريها والمنتجات التي تبيعها لتظهر في الفواتير لاحقاً.'
            }
            action={
              <Button variant="primary" onClick={openCreate}>
                <Plus size={16} />
                إضافة صنف
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li
                key={item.id}
                className={`flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center ${item.deletedAt ? 'opacity-70' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{item.name}</p>
                    <Badge tone={item.type === 'product' ? 'ink' : 'sand'}>{itemTypeLabel(item.type)}</Badge>
                    {item.deletedAt && <Badge tone="outline">مؤرشف</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted">
                    {[categoryName(item.categoryId), unitName(item.unitId), item.code].filter(Boolean).join(' • ') ||
                      'بدون تصنيف أو وحدة'}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="grid grid-cols-3 gap-4 text-start sm:w-72 sm:text-end">
                    <div>
                      <p className="text-[11px] text-muted">شراء</p>
                      <p className="tabular text-[13px] font-semibold text-ink">{money(item.purchasePrice)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">بيع</p>
                      <p className="tabular text-[13px] font-semibold text-ink">{money(item.salePrice)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted">حد التنبيه</p>
                      <p className="tabular text-[13px] font-semibold text-ink">{quantity(item.minStock)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(item)
                        setFormOpen(true)
                      }}
                      aria-label={`تعديل ${item.name}`}
                    >
                      <Pencil size={16} />
                    </Button>
                    {item.deletedAt ? (
                      <Button variant="ghost" size="icon" onClick={() => handleRestore(item)} aria-label={`استعادة ${item.name}`}>
                        <RotateCcw size={16} />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setArchiveTarget(item)}
                        aria-label={`أرشفة ${item.name}`}
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

      <ItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
        categories={categories || []}
        units={units || []}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="أرشفة الصنف؟"
        message={`سيتم إخفاء «${archiveTarget?.name || ''}» من القوائم. يمكن استعادته لاحقاً، ولا تُحذف حركاته.`}
        confirmLabel="أرشفة"
      />
    </div>
  )
}
