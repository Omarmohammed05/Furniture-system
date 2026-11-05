import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Boxes,
  ChevronLeft,
  HardDriveDownload,
  HardHat,
  Package,
  PlusCircle,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { getOverviewCounts, getRecentActivity } from '../services/overview'
import { backupStatus } from '../services/backup'
import { useInstallPrompt } from '../pwa/useInstallPrompt'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { BrandMark } from '../components/BrandMark'
import { formatLongDate } from '../lib/dates'
import { localizeDigits } from '../lib/digits'

const QUICK_ACTIONS = [
  { to: '/sales/new', label: 'فاتورة بيع', icon: PlusCircle },
  { to: '/purchases/new', label: 'فاتورة شراء', icon: ShoppingCart },
  { to: '/payments', label: 'تحصيل دفعة', icon: Wallet },
  { to: '/inventory', label: 'المخزون', icon: Boxes },
]

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.to}
            to={action.to}
            className="card flex items-center gap-2.5 px-3 py-3 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
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

function StatCard({ label, value, icon: Icon, to }) {
  return (
    <Link
      to={to}
      className="card group flex flex-col justify-between gap-3 p-4 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-center justify-between text-muted">
        <span className="text-[12.5px] font-semibold">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="tabular text-[26px] leading-8 font-bold text-ink">{value}</span>
        <ChevronLeft size={16} className="mb-1 text-muted transition-transform group-hover:-translate-x-0.5" />
      </div>
    </Link>
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
      ? `آخر نسخة كانت ${date(status.lastBackupAt)} — التذكير كل ${localizeDigits(status.reminderDays, 'western')} أيام.`
      : `آخر نسخة: ${date(status.lastBackupAt)}`

  return (
    <div className={`card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink">
          <HardDriveDownload size={19} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[15px] font-bold text-ink">{title}</p>
          <p className="mt-0.5 text-[13px] leading-6 text-muted">{detail}</p>
        </div>
      </div>
      <Link to="/backup">
        <Button variant="primary" className="w-full sm:w-auto">
          النسخ الاحتياطي
          <ArrowLeft size={16} />
        </Button>
      </Link>
    </div>
  )
}

export function DashboardPage() {
  const { settings, date, relative } = useSettings()
  const counts = useLive(() => getOverviewCounts(), [])
  const activity = useLive(() => getRecentActivity(8), [])
  const { canInstall, installed } = useInstallPrompt()

  const status = backupStatus(settings)
  const shopName = settings?.profile?.shopName || 'نظام المعرض'

  return (
    <div className="space-y-5">
      <PageHeader
        title={`أهلاً، ${shopName}`}
        description={formatLongDate(new Date(), { digits: settings?.display?.digits })}
        actions={<Badge tone="sand">المرحلة الثالثة</Badge>}
      />

      <QuickActions />

      <BackupCard status={status} date={date} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="العملاء" value={counts ? localizeDigits(counts.customers, settings?.display?.digits) : '—'} icon={Users} to="/customers" />
        <StatCard label="الموردون" value={counts ? localizeDigits(counts.suppliers, settings?.display?.digits) : '—'} icon={Truck} to="/suppliers" />
        <StatCard label="الأصناف" value={counts ? localizeDigits(counts.items, settings?.display?.digits) : '—'} icon={Package} to="/items" />
        <StatCard label="العمال" value={counts ? localizeDigits(counts.workers, settings?.display?.digits) : '—'} icon={HardHat} to="/workers" />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">آخر النشاطات</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">كل إضافة وتعديل وأرشفة تُسجَّل هنا</p>
            </div>
            <Sparkles size={18} className="text-muted" aria-hidden="true" />
          </div>

          {activity === undefined ? (
            <div className="space-y-3 px-5 py-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-10 animate-pulse rounded-lg bg-canvas" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13.5px] text-muted">
              لا توجد نشاطات بعد — ابدأ بإضافة عميل أو صنف.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-walnut" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-6 text-ink">{entry.note || entry.action}</p>
                    <p className="text-[11.5px] text-muted">{relative(entry.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-walnut" aria-hidden="true" />
              <h2 className="text-[16px] font-semibold text-ink">حماية البيانات</h2>
            </div>
            <ul className="mt-3 space-y-2 text-[13px] leading-6 text-muted">
              <li>• كل البيانات محفوظة داخل هذا الجهاز، بدون إنترنت.</li>
              <li>• الرمز السري محفوظ مشفَّراً ولا يمكن قراءته.</li>
              <li>• استخدم جهازاً واحداً في كل مرة.</li>
            </ul>
          </Card>

          {!installed && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-walnut" aria-hidden="true" />
                <h2 className="text-[16px] font-semibold text-ink">ثبّت التطبيق</h2>
              </div>
              <p className="mt-1.5 text-[13px] leading-6 text-muted">
                {canInstall
                  ? 'اضغط «تثبيت التطبيق» بالأعلى ليفتح من الشاشة الرئيسية مثل أي تطبيق.'
                  : 'من قائمة المتصفح اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» ليعمل كتطبيق مستقل.'}
              </p>
            </Card>
          )}

          <Card className="flex items-center gap-3 p-4">
            <BrandMark size={36} />
            <div>
              <p className="text-[13.5px] font-semibold text-ink">المبيعات والمشتريات جاهزة</p>
              <p className="text-[12px] leading-5 text-muted">المخزون والدفعات والأقساط تعمل بالكامل بدون إنترنت.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
