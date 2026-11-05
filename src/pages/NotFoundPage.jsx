import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Compass, LayoutDashboard, ReceiptText, Search, ShoppingCart, Boxes, Settings } from 'lucide-react'
import { Button } from '../components/ui/Button'

const QUICK_LINKS = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/sales', label: 'فواتير البيع', icon: ReceiptText },
  { to: '/purchases', label: 'فواتير الشراء', icon: ShoppingCart },
  { to: '/inventory', label: 'المخزون', icon: Boxes },
  { to: '/items', label: 'الأصناف', icon: Search },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
]

/** A wrong or old link should still leave the owner somewhere useful. */
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center pt-8 pb-4 text-center sm:pt-14">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-sand text-walnut">
        <Compass size={42} aria-hidden="true" />
        <span className="tabular absolute -end-2 -bottom-2 rounded-full bg-solid px-2.5 py-0.5 text-[12px] font-bold text-on-solid">
          404
        </span>
      </div>

      <h1 className="text-[24px] leading-9 font-bold text-ink">الصفحة غير موجودة</h1>
      <p className="mt-2 max-w-sm text-[14px] leading-7 text-muted">
        الرابط الذي فتحته غير متاح داخل التطبيق — ربما تغيّر أو حُذف. بياناتك سليمة، تابع من إحدى الشاشات
        التالية.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link to="/">
          <Button variant="primary">
            <LayoutDashboard size={17} aria-hidden="true" />
            الرئيسية
          </Button>
        </Link>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowRight size={17} aria-hidden="true" />
          رجوع
        </Button>
      </div>

      <div className="mt-8 w-full rounded-2xl border border-line bg-surface p-4 text-start">
        <p className="px-1 text-[12px] font-bold tracking-wide text-muted">روابط سريعة</p>
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-[13.5px] font-semibold text-ink transition-colors hover:bg-canvas"
              >
                <Icon size={17} aria-hidden="true" className="shrink-0 text-muted" />
                <span className="truncate">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
