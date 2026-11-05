import { useState } from 'react'
import { Boxes, Factory, History, Plus, SlidersHorizontal } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { formatQuantity } from '../lib/money'
import { listStock } from '../services/inventory'
import { listCategories } from '../services/masterData'
import { ItemMovementsModal } from '../components/ItemMovementsModal'
import { ProductionModal } from '../components/ProductionModal'
import { StockAdjustmentModal } from '../components/StockAdjustmentModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

const FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'low', label: 'تحت الحد' },
  { value: 'out', label: 'نافد' },
]

export function InventoryPage() {
  const { digits } = useSettings()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryId, setCategoryId] = useState('')
  const [movementsItem, setMovementsItem] = useState(null)
  const [adjustItem, setAdjustItem] = useState(null)
  const [productionOpen, setProductionOpen] = useState(false)

  const rows = useLive(() => listStock({ search, filter, categoryId }), [search, filter, categoryId])
  const categories = useLive(() => listCategories('item'), [])

  return (
    <div>
      <PageHeader
        title="المخزون"
        description="المخزون محسوب من حركات الشراء والبيع والتسويات والإنتاج."
        actions={
          <Button variant="primary" onClick={() => setProductionOpen(true)}>
            <Factory size={17} />
            تسجيل إنتاج
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالاسم أو الكود…"
          type="search"
          aria-label="بحث"
          className="flex-1"
        />
        <Select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="sm:w-48"
          aria-label="التصنيف"
        >
          <option value="">كل التصنيفات</option>
          {(categories || []).map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`h-10 rounded-xl px-3 text-[13px] font-semibold transition-colors ${
                filter === option.value ? 'bg-solid text-on-solid' : 'bg-canvas text-muted hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {rows === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={search || filter !== 'all' || categoryId ? 'لا توجد أصناف مطابقة' : 'لا توجد أصناف بعد'}
            description={
              search || filter !== 'all' || categoryId
                ? 'جرّب بحثاً آخر أو أعد التصفية.'
                : 'أضف أصنافك أولاً، ثم سجّل مشترياتك ليبدأ المخزون في الحساب.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {item.imageData && (
                    <img src={item.imageData} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold text-ink">{item.name}</p>
                      {item.isOut ? (
                        <Badge tone="danger">نافد</Badge>
                      ) : item.isLow ? (
                        <Badge tone="warn">تحت الحد</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-muted">
                      {item.code ? `${item.code} • ` : ''}
                      حد التنبيه {formatQuantity(item.lowLimit, { digits })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-start sm:w-24 sm:text-end">
                    <p className="text-[11px] text-muted">المتاح</p>
                    <p
                      className={`tabular text-[16px] font-bold ${item.stock < 0 ? 'text-danger' : 'text-ink'}`}
                      dir="ltr"
                    >
                      {formatQuantity(item.stock, { digits })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setMovementsItem(item)} aria-label={`حركات ${item.name}`}>
                      <History size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setAdjustItem(item)} aria-label={`تسوية ${item.name}`}>
                      <SlidersHorizontal size={16} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-muted">
        <Plus size={14} />
        لإدخال مخزون جديد استخدم فاتورة شراء، ولإخراجه استخدم فاتورة بيع.
      </div>

      <ItemMovementsModal open={Boolean(movementsItem)} onClose={() => setMovementsItem(null)} item={movementsItem} />
      <StockAdjustmentModal open={Boolean(adjustItem)} onClose={() => setAdjustItem(null)} item={adjustItem} />
      <ProductionModal open={productionOpen} onClose={() => setProductionOpen(false)} />
    </div>
  )
}
