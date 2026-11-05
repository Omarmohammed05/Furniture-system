import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Calculator,
  CalendarClock,
  HardDriveDownload,
  PackageSearch,
  PlusCircle,
  Receipt,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { getDashboardData } from '../services/dashboard'
import { backupStatus } from '../services/backup'
import { formatLongDate, formatMonth, formatShortDate } from '../lib/dates'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge'

const QUICK_ACTIONS = [
  { to: '/sales/new', label: 'فاتورة بيع', icon: PlusCircle },
  { to: '/purchases/new', label: 'فاتورة شراء', icon: ShoppingCart },
  { to: '/payments?new=in', label: 'سند تحصيل', icon: ArrowDownLeft },
  { to: '/payments?new=out', label: 'سند دفع', icon: ArrowUpRight },
  { to: '/expenses', label: 'مصروف', icon: Receipt },
]

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.to}
            to={action.to}
            className="card flex min-h-14 items-center gap-2.5 px-3 py-3 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sand text-walnut">
              <Icon size={17} aria-hidden="true" />
            </span>
            <span className="text-[13px] font-semibold text-ink">{action.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

function StatCard({ label, value, hint, icon: Icon, to, tone = 'ink', badge }) {
  return (
    <Link
      to={to}
      className="card group flex flex-col justify-between gap-2 p-4 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-center justify-between gap-2 text-muted">
        <span className="text-[12.5px] font-semibold">{label}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span
            className={`tabular text-[20px] leading-7 font-bold ${
              tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-ink'
            }`}
          >
            {value}
          </span>
          {badge}
        </div>
        {hint && <p className="mt-0.5 text-[11.5px] text-muted">{hint}</p>}
      </div>
    </Link>
  )
}

function LowStockCard({ lowStock, quantity }) {
  return (
    <Card>
      <CardHeader
        title="أصناف تحت حد التنبيه"
        description={
          lowStock.count > 0 ? `${quantity(lowStock.count)} صنفاً يحتاج شراء أو إنتاجاً` : 'المخزون في أمان'
        }
        icon={PackageSearch}
        action={
          <Link to="/inventory" className="text-[12.5px] font-semibold text-walnut hover:underline">
            المخزون
          </Link>
        }
      />
      {lowStock.count === 0 ? (
        <EmptyState
          icon={Boxes}
          title="لا أصناف منخفضة"
          description="كل الأصناف أعلى من حد التنبيه المحدد لها."
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-line">
          {lowStock.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-ink">{item.name}</p>
                <p className="text-[11.5px] text-muted">حد التنبيه: {quantity(item.lowLimit)}</p>
              </div>
              <span
                className={`tabular rounded-full px-2.5 py-0.5 text-[12px] font-bold ${
                  item.isOut ? 'bg-danger-soft text-danger-ink' : 'bg-warn-soft text-warn-ink'
                }`}
              >
                {quantity(item.stock)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function OverdueCard({ overdue, money, digits }) {
  return (
    <Card>
      <CardHeader
        title="أقساط متأخرة"
        description={
          overdue.count > 0
            ? `${money(overdue.amount)} على ${new Intl.NumberFormat('en-US').format(overdue.count)} قسط`
            : 'لا توجد أقساط متأخرة'
        }
        icon={CalendarClock}
        action={
          <Link to="/installments" className="text-[12.5px] font-semibold text-walnut hover:underline">
            الأقساط
          </Link>
        }
      />
      {overdue.count === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="لا أقساط متأخرة"
          description="كل الأقساط المستحقة سُدّدت في مواعيدها."
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-line">
          {overdue.items.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-ink">
                  {row.customerName || row.invoice?.customerName || 'عميل'}
                </p>
                <p className="text-[11.5px] text-muted">
                  {row.invoiceNumber ? `فاتورة ${row.invoiceNumber} • ` : ''}
                  استحقاق {formatShortDate(row.dueDate, { digits })}
                </p>
              </div>
              <span className="tabular text-[13px] font-bold text-danger">
                {money(Math.max(0, (row.amount || 0) - (row.paidAmount || 0)))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function RecentInvoices({ rows, money, digits }) {
  return (
    <Card>
      <CardHeader title="آخر الفواتير" description="أحدث ١٠ فواتير بيع وشراء" icon={ReceiptText} />
      {rows.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="لا توجد فواتير بعد"
          description="ابدأ بفاتورة شراء خامات أو فاتورة بيع لتظهر هنا."
          action={
            <Link to="/sales/new">
              <Button variant="primary">
                <PlusCircle size={16} />
                فاتورة بيع
              </Button>
            </Link>
          }
          className="py-10"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60 text-[11.5px] text-muted">
                <th className="px-4 py-2 text-start font-semibold">النوع</th>
                <th className="px-3 py-2 text-start font-semibold">الرقم</th>
                <th className="px-3 py-2 text-start font-semibold">الطرف</th>
                <th className="px-3 py-2 text-start font-semibold">التاريخ</th>
                <th className="px-3 py-2 text-start font-semibold">الإجمالي</th>
                <th className="px-3 py-2 text-start font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.kind}-${row.id}`} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-2">
                    <Badge tone={row.kind === 'sale' ? 'sand' : 'neutral'}>
                      {row.kind === 'sale' ? 'بيع' : 'شراء'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      to={`/${row.kind === 'sale' ? 'sales' : 'purchases'}/${row.id}`}
                      className="tabular font-bold text-ink hover:underline"
                      dir="ltr"
                    >
                      {row.number}
                    </Link>
                  </td>
                  <td className="max-w-40 truncate px-3 py-2 text-ink">{row.partyName || '—'}</td>
                  <td className="tabular whitespace-nowrap px-3 py-2 text-muted">
                    {formatShortDate(row.date, { digits })}
                  </td>
                  <td className="tabular whitespace-nowrap px-3 py-2 font-semibold text-ink">{money(row.total)}</td>
                  <td className="px-3 py-2">
                    <InvoiceStatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function BackupCard({ status, date }) {
  const tone = status.never
    ? 'border-warn/25 bg-warn-soft'
    : status.overdue
      ? 'border-danger/25 bg-danger-soft'
      : 'border-line bg-surface'

  const title = status.never
    ? 'لم تُنشئ نسخة احتياطية بعد'
    : status.overdue
      ? 'موعد النسخة الاحتياطية متأخر'
      : 'نسختك الاحتياطية حديثة'

  const detail = status.never
    ? 'البيانات على هذا الجهاز فقط. أنشئ نسخة الآن لتحميها.'
    : status.overdue
      ? `آخر نسخة كانت ${date(status.lastBackupAt)}.`
      : `آخر نسخة: ${date(status.lastBackupAt)}`

  return (
    <div className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink">
          <HardDriveDownload size={17} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[14px] font-bold text-ink">{title}</p>
          <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{detail}</p>
        </div>
      </div>
      <Link to="/backup">
        <Button variant="secondary" size="sm" className="w-full sm:w-auto">
          النسخ الاحتياطي
          <ArrowLeft size={15} />
        </Button>
      </Link>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((cell) => (
          <div key={cell} className="h-24 animate-pulse rounded-2xl bg-canvas" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-canvas" />
        <div className="h-64 animate-pulse rounded-2xl bg-canvas" />
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-canvas" />
    </div>
  )
}

export function DashboardPage() {
  const { settings, money, quantity, digits, date } = useSettings()
  const data = useLive(() => getDashboardData(), [])
  const status = backupStatus(settings)
  const shopName = settings?.profile?.shopName || 'نظام المعرض'

  const count = (value) => new Intl.NumberFormat('en-US').format(Number(value) || 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title={`أهلاً، ${shopName}`}
        description={formatLongDate(new Date(), { digits: settings?.display?.digits })}
        actions={<Badge tone="sand">المرحلة الرابعة</Badge>}
      />

      <QuickActions />

      {data === undefined ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="مبيعات اليوم"
              value={money(data.today.total)}
              hint={`${count(data.today.count)} فاتورة`}
              icon={TrendingUp}
              to="/sales"
            />
            <StatCard
              label="مبيعات هذا الشهر"
              value={money(data.monthSales.total)}
              hint={`${formatMonth(data.month, { digits })} • ${count(data.monthSales.count)} فاتورة`}
              icon={ReceiptText}
              to="/sales"
            />
            <StatCard
              label="الصافي التقديري للشهر"
              value={money(data.net.net)}
              hint="مبيعات − مشتريات − مصروفات − رواتب"
              icon={Calculator}
              to="/reports"
              tone={data.net.net < 0 ? 'danger' : 'success'}
              badge={<Badge tone="warn">تقديري</Badge>}
            />
            <StatCard
              label="مستحق لنا عند العملاء"
              value={money(data.customersOwe)}
              hint="أرصدة العملاء المستحقة"
              icon={Users}
              to="/debts"
            />
            <StatCard
              label="مستحق للموردين"
              value={money(data.weOweSuppliers)}
              hint="أرصدة الموردين المستحقة"
              icon={Wallet}
              to="/debts"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <LowStockCard lowStock={data.lowStock} quantity={quantity} />
            <OverdueCard overdue={data.overdue} money={money} digits={digits} />
          </div>

          <RecentInvoices rows={data.recentInvoices} money={money} digits={digits} />

          <BackupCard status={status} date={date} />
        </>
      )}
    </div>
  )
}
