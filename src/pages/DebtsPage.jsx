import { Link } from 'react-router-dom'
import { ArrowLeft, HandCoins, ReceiptText } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { getBalancesSummary } from '../services/balances'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'

function LedgerList({ rows, emptyText, base }) {
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
