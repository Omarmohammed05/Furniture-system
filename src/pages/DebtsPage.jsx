import { Link } from 'react-router-dom'
import { ArrowLeft, HandCoins, ReceiptText } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { getAging, getBalancesSummary } from '../services/balances'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'

function AgingTotals({ totals, tone }) {
  const { money } = useSettings()
  const buckets = [
    { label: '٠–٣٠ يوم', value: totals.current },
    { label: '٣١–٦٠ يوم', value: totals.mid },
    { label: 'أكثر من ٦٠ يوم', value: totals.old },
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {buckets.map((bucket) => (
        <div key={bucket.label} className="rounded-xl bg-canvas px-3 py-2">
          <p className="text-[11px] font-semibold text-muted">{bucket.label}</p>
          <p className={`tabular mt-0.5 text-[13.5px] font-bold ${tone}`}>{money(bucket.value)}</p>
        </div>
      ))}
    </div>
  )
}

function LedgerList({ rows, emptyText, base, buckets }) {
  const { money } = useSettings()
  if (!rows?.length) {
    return <p className="px-5 py-8 text-center text-[13px] text-muted">{emptyText}</p>
  }
  return (
    <ul className="divide-y divide-line">
      {rows.slice(0, 12).map((row) => (
        <li key={row.party.id} className="flex items-center justify-between gap-3 px-5 py-3">
          <Link to={base} className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{row.party.name}</p>
            <p className="truncate text-[11.5px] text-muted">
              فواتير {money(row.invoiced)} • مدفوع {money(row.paid)}
            </p>
            {buckets?.get(row.party.id) && (
              <p className="truncate text-[11px] text-muted">
                أعمار الدين: ٠–٣٠ {money(buckets.get(row.party.id).current)} • ٣١–٦٠{' '}
                {money(buckets.get(row.party.id).mid)} • +٦٠ {money(buckets.get(row.party.id).old)}
              </p>
            )}
          </Link>
          <p className={`tabular text-[14px] font-bold ${row.balance > 0 ? 'text-danger' : 'text-success'}`}>
            {money(row.balance)}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function DebtsPage() {
  const { money } = useSettings()
  const data = useLive(() => getBalancesSummary(), [])
  const aging = useLive(async () => ({
    customers: await getAging('customers'),
    suppliers: await getAging('suppliers'),
  }), [])

  const bucketMap = (rows) => new Map((rows || []).map((row) => [row.key, row]))

  return (
    <div>
      <PageHeader title="الديون" description="من يدين لنا ومن ندين له، محسوبة من الفواتير والدفعات." />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-[12px] font-semibold text-muted">عند العملاء</p>
          <p className="tabular mt-1 text-[19px] font-bold text-success">{money(data?.customersOwe || 0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[12px] font-semibold text-muted">للموردين</p>
          <p className="tabular mt-1 text-[19px] font-bold text-danger">{money(data?.weOweSuppliers || 0)}</p>
        </div>
      </div>

      {aging && (
        <Card className="mb-4">
          <CardHeader title="أعمار الديون" description="توزيع المستحقات على فترات التأخير — مطابق لتقرير أعمار الديون." />
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[12.5px] font-semibold text-ink">عند العملاء</p>
              <AgingTotals totals={aging.customers.totals} tone="text-success" />
            </div>
            <div className="space-y-2">
              <p className="text-[12.5px] font-semibold text-ink">للموردين</p>
              <AgingTotals totals={aging.suppliers.totals} tone="text-danger" />
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="عملاء مدينون لنا"
            icon={HandCoins}
            action={
              <Link to="/customers" className="flex items-center gap-1 text-[12.5px] font-semibold text-walnut">
                العملاء
                <ArrowLeft size={14} />
              </Link>
            }
          />
          {data === undefined ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-10 animate-pulse rounded-lg bg-canvas" />
              ))}
            </div>
          ) : (
            <LedgerList
              rows={(data.customers || []).filter((row) => row.balance > 0)}
              emptyText="لا توجد مبالغ مستحقة على العملاء."
              base="/customers"
              buckets={bucketMap(aging?.customers?.rows)}
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="موردون ندين لهم"
            icon={ReceiptText}
            action={
              <Link to="/suppliers" className="flex items-center gap-1 text-[12.5px] font-semibold text-walnut">
                الموردون
                <ArrowLeft size={14} />
              </Link>
            }
          />
          {data === undefined ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-10 animate-pulse rounded-lg bg-canvas" />
              ))}
            </div>
          ) : (
            <LedgerList
              rows={(data.suppliers || []).filter((row) => row.balance > 0)}
              emptyText="لا توجد مبالغ مستحقة للموردين."
              base="/suppliers"
              buckets={bucketMap(aging?.suppliers?.rows)}
            />
          )}
        </Card>
      </div>

      <EmptyState
        icon={HandCoins}
        className="mt-4"
        title="الرصيد يُحدَّث تلقائياً"
        description="كل فاتورة أو دفعة تُغيّر الرصيد في الحال — لا شيء يُكتب بيدك."
      />
    </div>
  )
}
