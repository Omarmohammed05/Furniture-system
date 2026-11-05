import { useState } from 'react'
import { History } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { formatShortDate } from '../lib/dates'
import { searchActivity } from '../services/activity'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

const ACTION_LABELS = {
  create: 'إضافة',
  update: 'تعديل',
  archive: 'أرشفة',
  restore: 'استعادة',
  void: 'إلغاء',
  import: 'استعادة نسخة',
  export: 'تصدير',
  safety: 'نسخة أمان',
  adjustment: 'تسوية',
  production: 'إنتاج',
  receipt: 'تحصيل',
  supplier: 'دفعة',
  pay: 'راتب',
  advance: 'سلفة',
}

function actionLabel(action) {
  const verb = String(action || '').split('.').pop()
  return ACTION_LABELS[verb] || 'حركة'
}

/** M14 — the activity log every service writes to, finally readable. */
export function ActivityPage() {
  const { digits } = useSettings()
  const [search, setSearch] = useState('')

  const rows = useLive(() => searchActivity({ search }), [search])

  return (
    <div>
      <PageHeader
        title="سجل النشاط"
        description="كل إضافة أو تعديل أو إلغاء سجّله النظام، الأحدث أولاً."
      />

      <div className="mb-4 rounded-2xl border border-line bg-surface p-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث في السجل…"
          type="search"
          aria-label="بحث في السجل"
        />
      </div>

      <Card>
        {rows === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={History}
            title={search ? 'لا توجد نتائج مطابقة' : 'السجل فارغ'}
            description={
              search
                ? 'جرّب كلمة أخرى — البحث يشمل الوصف ونوع الحركة.'
                : 'ستظهر هنا كل حركة تقوم بها: فواتير، دفعات، تسويات مخزون، نسخ احتياطي.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const when = new Date(row.at)
              const valid = !Number.isNaN(when.getTime())
              return (
                <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink">{row.note || row.action}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {valid ? formatShortDate(when.toISOString().slice(0, 10), { digits }) : '—'}
                      {valid ? ` • ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[11.5px] font-semibold text-muted">
                    {actionLabel(row.action)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
