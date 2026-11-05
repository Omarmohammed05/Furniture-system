import { useMemo, useState } from 'react'
import {
  Banknote,
  BarChart3,
  Boxes,
  Calculator,
  Clock,
  FileSpreadsheet,
  Printer,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { addDays, currentMonth, formatShortDate, monthRange, todayIso } from '../lib/dates'
import { exportReportToExcel } from '../lib/excel'
import { buildReport } from '../services/reports'
import { ReportView } from '../components/reports/ReportView'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

const REPORTS = [
  { key: 'sales', label: 'المبيعات', icon: TrendingUp },
  { key: 'top-products', label: 'الأصناف الأكثر مبيعاً', icon: BarChart3 },
  { key: 'top-customers', label: 'أفضل العملاء', icon: Users },
  { key: 'purchases', label: 'المشتريات', icon: ShoppingCart },
  { key: 'expenses', label: 'المصروفات', icon: Receipt },
  { key: 'payroll', label: 'الرواتب والسلف', icon: Banknote },
  { key: 'inventory', label: 'المخزون', icon: Boxes },
  { key: 'aging', label: 'أعمار الديون', icon: Clock },
  { key: 'cash', label: 'الحركة النقدية', icon: Banknote },
  { key: 'net', label: 'الصافي التقديري', icon: Calculator },
]

const SALES_GROUPS = [
  { value: 'day', label: 'يومي' },
  { value: 'month', label: 'شهري' },
  { value: 'customer', label: 'حسب العميل' },
  { value: 'product', label: 'حسب الصنف' },
]

const PURCHASE_GROUPS = [
  { value: 'supplier', label: 'حسب المورد' },
  { value: 'item', label: 'حسب الصنف' },
]

function presets() {
  const today = todayIso()
  const month = currentMonth()
  const thisMonth = monthRange(month)
  const [year, index] = month.split('-').map(Number)
  const previousMonth = index === 1 ? `${year - 1}-12` : `${year}-${String(index - 1).padStart(2, '0')}`
  const lastMonth = monthRange(previousMonth)
  return [
    { label: 'اليوم', from: today, to: today },
    { label: 'هذا الشهر', from: thisMonth.from, to: thisMonth.to },
    { label: 'الشهر الماضي', from: lastMonth.from, to: lastMonth.to },
    { label: 'آخر ٩٠ يوماً', from: addDays(today, -89), to: today },
    { label: 'هذا العام', from: `${year}-01-01`, to: today },
    { label: 'كل الفترات', from: '', to: '' },
  ]
}

export function ReportsPage() {
  const toast = useToast()
  const { digits } = useSettings()
  const month = monthRange(currentMonth())

  const [key, setKey] = useState('sales')
  const [salesGroup, setSalesGroup] = useState('day')
  const [purchaseGroup, setPurchaseGroup] = useState('supplier')
  const [from, setFrom] = useState(month.from)
  const [to, setTo] = useState(todayIso())
  const [exporting, setExporting] = useState(false)

  const groupBy = key === 'sales' ? salesGroup : key === 'purchases' ? purchaseGroup : null

  const report = useLive(
    () => buildReport(key, { from, to, groupBy, limit: 15 }),
    [key, from, to, groupBy],
  )

  const periodLabel = useMemo(() => {
    if (!from && !to) return 'كل الفترات'
    return `${from ? formatShortDate(from, { digits }) : 'البداية'} — ${to ? formatShortDate(to, { digits }) : 'اليوم'}`
  }, [from, to, digits])

  const current = REPORTS.find((item) => item.key === key)

  const handleExcel = async () => {
    if (!report) return
    setExporting(true)
    try {
      await exportReportToExcel(report, { from, to })
      toast.success('تم تصدير التقرير إلى Excel')
    } catch (error) {
      toast.error(error.message || 'تعذر التصدير')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="التقارير"
          description="كل تقرير بفترة محددة، جاهز للطباعة والتصدير إلى Excel."
          actions={
            <>
              <Button variant="secondary" onClick={() => window.print()} disabled={!report}>
                <Printer size={16} />
                طباعة
              </Button>
              <Button variant="primary" onClick={handleExcel} disabled={!report || exporting}>
                <FileSpreadsheet size={16} />
                {exporting ? 'جارٍ التصدير…' : 'تصدير Excel'}
              </Button>
            </>
          }
        />

        <div className="mb-4 rounded-2xl border border-line bg-surface p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {REPORTS.map((item) => {
              const Icon = item.icon
              const active = item.key === key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setKey(item.key)}
                  aria-pressed={active}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition-colors ${
                    active
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-surface text-ink hover:bg-canvas'
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  aria-label="من تاريخ"
                  dir="ltr"
                  className="w-full sm:w-40"
                />
                <span className="text-[12px] text-muted">إلى</span>
                <Input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  aria-label="إلى تاريخ"
                  dir="ltr"
                  className="w-full sm:w-40"
                />
                <div className="flex flex-wrap gap-1.5">
                  {presets().map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setFrom(preset.from)
                        setTo(preset.to)
                      }}
                      className="rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
            </div>

            {(key === 'sales' || key === 'purchases') && (
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="تجميع التقرير">
                {(key === 'sales' ? SALES_GROUPS : PURCHASE_GROUPS).map((option) => {
                  const active = groupBy === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => (key === 'sales' ? setSalesGroup(option.value) : setPurchaseGroup(option.value))}
                      aria-pressed={active}
                      className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                        active ? 'bg-sand text-walnut' : 'text-muted hover:bg-canvas hover:text-ink'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {key === 'net' && (
            <p className="mt-3 border-t border-line pt-2 text-[12px] leading-6 text-muted">
              الصافي التقديري = المبيعات بدون ضريبة − المشتريات بدون ضريبة − المصروفات − الرواتب المصروفة. الرقم
              «تقديري» لأن تكلفة تصنيع القطعة غير محسوبة.
            </p>
          )}
        </div>
      </div>

      {report === undefined ? (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-5">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-canvas" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((cell) => (
              <div key={cell} className="h-16 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-9 animate-pulse rounded-lg bg-canvas" />
          ))}
        </div>
      ) : (
        <ReportView report={{ ...report, title: report.title || current?.label }} periodLabel={periodLabel} />
      )}
    </div>
  )
}
