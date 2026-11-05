import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, ChevronLeft, Sparkles } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { currentMonth, formatMonth, formatShortDate } from '../lib/dates'
import { generatePayroll, getPayrollSummary, listAdvanceOverview } from '../services/payroll'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

export function PayrollPage() {
  const { money, digits } = useSettings()
  const toast = useToast()
  const [month, setMonth] = useState(currentMonth())
  const [busy, setBusy] = useState(false)

  const data = useLive(() => getPayrollSummary(month), [month])
  const advances = useLive(() => listAdvanceOverview(), [])

  const totals = data?.totals
  const slips = data?.slips || []
  const advancesOutstanding = (advances || []).reduce((sum, row) => sum + row.outstanding, 0)

  const handleGenerate = async () => {
    setBusy(true)
    try {
      const result = await generatePayroll(month)
      const parts = []
      if (result.created) parts.push(`${result.created} جديد`)
      if (result.refreshed) parts.push(`${result.refreshed} محدَّث`)
      if (result.skipped) parts.push(`${result.skipped} مصروف مسبقاً`)
      toast.success(parts.length ? `تم تجهيز المسير — ${parts.join('، ')}` : 'لا يوجد عمال نشطون')
    } catch (error) {
      toast.error(error.message || 'تعذر تجهيز المسير')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="الرواتب"
        description="مسير شهري لكل عامل: المرتب + المكافآت − الخصومات − سداد السلف."
        actions={
          <>
            <Input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value || currentMonth())}
              className="w-40"
              aria-label="شهر المسير"
            />
            <Button variant="primary" onClick={handleGenerate} disabled={busy}>
              <Sparkles size={17} />
              {busy ? 'جارٍ التجهيز…' : slips.length ? 'تحديث المسير' : 'تجهيز المسير'}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[12px] font-semibold text-muted">صافي {formatMonth(month, { digits })}</p>
          <p className="tabular mt-1 text-[20px] font-bold text-ink">{money(totals?.net || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-semibold text-muted">مصروف</p>
          <p className="tabular mt-1 text-[20px] font-bold text-success">{money(totals?.paidNet || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-semibold text-muted">بانتظار الصرف</p>
          <p className="tabular mt-1 text-[20px] font-bold text-warn">{money(totals?.draftNet || 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] font-semibold text-muted">سلف متبقية</p>
          <p className="tabular mt-1 text-[20px] font-bold text-ink">{money(advancesOutstanding)}</p>
        </Card>
      </div>

      <Card>
        {data === undefined ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-16 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : slips.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title={`لا يوجد مسير لشهر ${formatMonth(month, { digits })}`}
            description="اضغط «تجهيز المسير» لإنشاء قسيمة لكل عامل نشط بالمرتب والمكافآت والخصومات."
          />
        ) : (
          <ul className="divide-y divide-line">
            {slips.map((slip) => (
              <li key={slip.id}>
                <Link to={`/payroll/${slip.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand text-walnut">
                    <Banknote size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold text-ink">{slip.workerName}</p>
                      <Badge tone={slip.status === 'paid' ? 'success' : 'warn'}>
                        {slip.status === 'paid' ? 'مصروف' : 'مسودة'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      أساسي {money(slip.baseSalary)}
                      {slip.bonuses ? ` • مكافآت ${money(slip.bonuses)}` : ''}
                      {slip.deductions ? ` • خصومات ${money(slip.deductions)}` : ''}
                      {slip.advanceRepayment ? ` • سلف ${money(slip.advanceRepayment)}` : ''}
                      {slip.status === 'paid' ? ` • ${formatShortDate(slip.paidAt, { digits })}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="tabular text-[14.5px] font-bold text-ink">{money(slip.net)}</p>
                    <ChevronLeft size={16} className="text-muted" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-3 px-1 text-[12px] leading-6 text-muted">
        إعادة تجهيز المسير تحدِّث المسودات فقط، ولا تمس القسائم المصروفة.
      </p>
    </div>
  )
}
