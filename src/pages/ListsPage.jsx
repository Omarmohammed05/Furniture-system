import { useState } from 'react'
import { Archive, Check, Pencil, Plus, RotateCcw, X } from 'lucide-react'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import {
  archiveCategory,
  archiveUnit,
  createCategory,
  createUnit,
  listCategories,
  listUnits,
  renameCategory,
  renameUnit,
  restoreCategory,
  restoreUnit,
  validateName,
} from '../services/masterData'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

function NamedList({ records, addLabel, placeholder, emptyTitle, onCreate, onRename, onArchive, onRestore }) {
  const toast = useToast()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const submitNew = async (event) => {
    event.preventDefault()
    const errors = validateName(newName)
    if (errors.name) {
      toast.error(errors.name)
      return
    }
    try {
      await onCreate(newName.trim())
      setNewName('')
      toast.success('تمت الإضافة')
    } catch (error) {
      toast.error(error.message || 'تعذرت الإضافة')
    }
  }

  const submitRename = async (id) => {
    const errors = validateName(editingName)
    if (errors.name) {
      toast.error(errors.name)
      return
    }
    try {
      await onRename(id, editingName.trim())
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      toast.error(error.message || 'تعذر التعديل')
    }
  }

  return (
    <div>
      <form onSubmit={submitNew} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={placeholder}
          aria-label={addLabel}
        />
        <Button type="submit" variant="primary" className="sm:w-auto">
          <Plus size={16} />
          {addLabel}
        </Button>
      </form>

      {records === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-12 animate-pulse rounded-xl bg-canvas" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <EmptyState title={emptyTitle} description="أضف عنصراً من الحقل أعلاه." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {records.map((record) => (
            <li key={record.id} className={`flex items-center gap-2 px-4 py-2.5 ${record.deletedAt ? 'opacity-60' : ''}`}>
              {editingId === record.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="h-9"
                    autoFocus
                    aria-label="اسم جديد"
                  />
                  <Button variant="ghost" size="icon" onClick={() => submitRename(record.id)} aria-label="حفظ">
                    <Check size={17} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(null)
                      setEditingName('')
                    }}
                    aria-label="إلغاء"
                  >
                    <X size={17} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-[14px] font-medium text-ink">{record.name}</span>
                  {record.deletedAt && <Badge tone="outline">مؤرشف</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(record.id)
                      setEditingName(record.name)
                    }}
                    aria-label={`تعديل ${record.name}`}
                  >
                    <Pencil size={15} />
                  </Button>
                  {record.deletedAt ? (
                    <Button variant="ghost" size="icon" onClick={() => onRestore(record)} aria-label={`استعادة ${record.name}`}>
                      <RotateCcw size={15} />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => onArchive(record)} aria-label={`أرشفة ${record.name}`}>
                      <Archive size={15} />
                    </Button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const TABS = [
  { key: 'item', label: 'تصنيفات الأصناف' },
  { key: 'expense', label: 'تصنيفات المصروفات' },
  { key: 'unit', label: 'الوحدات' },
]

export function ListsPage() {
  const toast = useToast()
  const [tab, setTab] = useState('item')
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiveKind, setArchiveKind] = useState('category')

  const itemCategories = useLive(() => listCategories('item', { includeArchived: true }), [])
  const expenseCategories = useLive(() => listCategories('expense', { includeArchived: true }), [])
  const units = useLive(() => listUnits({ includeArchived: true }), [])

  const requestArchive = (kind, record) => {
    setArchiveKind(kind)
    setArchiveTarget(record)
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      if (archiveKind === 'unit') await archiveUnit(archiveTarget.id)
      else await archiveCategory(archiveTarget.id)
      toast.success('تمت الأرشفة')
    } catch (error) {
      toast.error(error.message || 'تعذرت الأرشفة')
    }
  }

  const restore = async (kind, record) => {
    try {
      if (kind === 'unit') await restoreUnit(record.id)
      else await restoreCategory(record.id)
      toast.success('تمت الاستعادة')
    } catch (error) {
      toast.error(error.message || 'تعذرت الاستعادة')
    }
  }

  return (
    <div>
      <PageHeader
        title="القوائم المساعدة"
        description="التصنيفات والوحدات التي تظهر في نماذج الأصناف والمصروفات."
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl border border-line bg-surface p-1">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`min-h-10 flex-1 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
              tab === entry.key ? 'bg-solid text-on-solid' : 'text-muted hover:bg-canvas hover:text-ink'
            }`}
            aria-pressed={tab === entry.key}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <Card className="p-4">
        {tab === 'item' && (
          <NamedList
            records={itemCategories}
            addLabel="إضافة تصنيف"
            placeholder="مثال: أخشاب، دهانات، مفروشات"
            emptyTitle="لا توجد تصنيفات أصناف"
            onCreate={(name) => createCategory({ name, kind: 'item' })}
            onRename={renameCategory}
            onArchive={(record) => requestArchive('category', record)}
            onRestore={(record) => restore('category', record)}
          />
        )}

        {tab === 'expense' && (
          <NamedList
            records={expenseCategories}
            addLabel="إضافة تصنيف"
            placeholder="مثال: إيجار، كهرباء"
            emptyTitle="لا توجد تصنيفات مصروفات"
            onCreate={(name) => createCategory({ name, kind: 'expense' })}
            onRename={renameCategory}
            onArchive={(record) => requestArchive('category', record)}
            onRestore={(record) => restore('category', record)}
          />
        )}

        {tab === 'unit' && (
          <NamedList
            records={units}
            addLabel="إضافة وحدة"
            placeholder="مثال: قطعة، متر، كجم"
            emptyTitle="لا توجد وحدات"
            onCreate={createUnit}
            onRename={renameUnit}
            onArchive={(record) => requestArchive('unit', record)}
            onRestore={(record) => restore('unit', record)}
          />
        )}
      </Card>

      <p className="mt-3 px-1 text-[12px] leading-6 text-muted">
        لا يمكن أرشفة تصنيف أو وحدة مستخدمة في أصناف — غيّر الصنف أولاً ثم أرشف.
      </p>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="أرشفة العنصر؟"
        message={`سيتم إخفاء «${archiveTarget?.name || ''}» من النماذج. يمكن استعادته لاحقاً.`}
        confirmLabel="أرشفة"
      />
    </div>
  )
}
