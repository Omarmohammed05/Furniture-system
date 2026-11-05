import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { formatShortDate } from '../lib/dates'
import { listPayments, methodLabel } from '../services/payments'
import { PaymentModal } from '../components/PaymentModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

export function PaymentsPage() {
  const { money, digits } = useSettings()
  const [direction, setDirection] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)

  const rows = useLive(() => listPayments({ direction, search }), [direction, search])
  const visible = rows || []

  const totals = visible.reduce(
    (acc, row) => {
      if (row.direction === 'in') acc.in += row.amount || 0
      else acc.out += row.amount || 0
      return acc
    },
    { in: 0, out: 0 },
  )

  return (
    <div>
      <PageHeader
        title="الدفعات"
        description="كل مبلغ دخل أو خرج، على فاتورة أو على الحساب."
        actions={
          <>
            <Button variant="secondary" onClick={() => setModal('out')}>
              <ArrowUpRight size={16} />
              سند دفع
            </Button>
            <Button variant="primary" onClick={() => setModal('in')}>
              <ArrowDownLeft size={16} />
              سند تحصيل
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالاسم أو رقم الفاتورة…"
          type="search"
          aria-label="بحث"
          className="flex-1"
        />
        <Select value={direction} onChange={(event) => setDirection(event.target.value)} className="sm:w-44" aria-label="النوع">
          <option value="all">الكل</option>
          <option value="in">تحصيلات</option>
          <option value="out">مدفوعات</option>
        </Select>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-[12px] font-semibold text-muted">إجمالي التحصيلات</p>
          <p className="tabular mt-1 text-[19px] font-bold text-success">{money(totals.in)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] font-semibold text-muted">إجمالي المدفوعات</p>
          <p className="tabular mt-1 text-[19px] font-bold text-danger">{money(totals.out)}</p>
        </div>
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
            icon={Wallet}
            title="لا توجد دفعات بعد"
            description="سجّل تحصيلاً من عميل أو دفعة لمورد ليظهر هنا."
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14px] font-semibold text-ink">{row.partyName || '—'}</p>
                    <Badge tone={row.direction === 'in' ? 'success' : 'danger'}>
                      {row.direction === 'in' ? 'تحصيل' : 'دفعة'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {formatShortDate(row.date, { digits })} • {methodLabel(row.method)}
                    {row.invoiceNumber ? ` • ${row.invoiceNumber}` : ' • على الحساب'}
                  </p>
                </div>
                <p className={`tabular text-[14.5px] font-bold ${row.direction === 'in' ? 'text-success' : 'text-danger'}`}>
                  {row.direction === 'in' ? '+' : '−'} {money(row.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <PaymentModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        direction={modal || 'in'}
      />
    </div>
  )
}
