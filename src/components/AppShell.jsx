import { NavLink, Link, Outlet } from 'react-router-dom'
import {
  Banknote,
  Boxes,
  CalendarClock,
  Coins,
  Database,
  FileText,
  HandCoins,
  HardDriveDownload,
  HardHat,
  LayoutDashboard,
  ListTree,
  Lock,
  Package,
  PlusCircle,
  Receipt,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../app/AuthContext'
import { useSettings } from '../app/SettingsContext'
import { APP_VERSION } from '../lib/appInfo'
import { BackupBadge } from './BackupBadge'
import { BrandMark } from './BrandMark'
import { InstallButton } from './InstallButton'

const MAIN_NAV = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/sales', label: 'فواتير البيع', icon: ReceiptText },
  { to: '/purchases', label: 'فواتير الشراء', icon: ShoppingCart },
  { to: '/inventory', label: 'المخزون', icon: Boxes },
  { to: '/installments', label: 'الأقساط', icon: CalendarClock },
  { to: '/payments', label: 'الدفعات', icon: Wallet },
  { to: '/debts', label: 'الديون', icon: HandCoins },
]

const MONEY_NAV = [
  { to: '/expenses', label: 'المصروفات', icon: Receipt },
  { to: '/payroll', label: 'الرواتب', icon: Banknote },
  { to: '/advances', label: 'السلف', icon: Coins },
  { to: '/statements', label: 'كشوف الحساب', icon: FileText },
]

const DATA_LINKS = [
  { to: '/customers', label: 'العملاء', icon: Users },
  { to: '/suppliers', label: 'الموردون', icon: Truck },
  { to: '/items', label: 'الأصناف', icon: Package },
  { to: '/workers', label: 'العمال', icon: HardHat },
  { to: '/lists', label: 'القوائم المساعدة', icon: ListTree },
]

const SYSTEM_NAV = [
  { to: '/data', label: 'البيانات', icon: Database },
  { to: '/backup', label: 'النسخ الاحتياطي', icon: HardDriveDownload },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
]

const MOBILE_NAV = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/sales/new', label: 'بيع', icon: PlusCircle },
  { to: '/purchases/new', label: 'شراء', icon: ShoppingCart },
  { to: '/inventory', label: 'المخزون', icon: Boxes },
  { to: '/data', label: 'البيانات', icon: Database },
]

function SidebarLink({ item, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-semibold transition-colors ${
          isActive ? 'bg-ink text-white' : 'text-muted hover:bg-canvas hover:text-ink'
        }`
      }
    >
      <Icon size={19} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}

export function AppShell() {
  const { settings } = useSettings()
  const { lock } = useAuth()
  const shopName = settings?.profile?.shopName || 'نظام المعرض'
  const logo = settings?.profile?.logoDataUrl

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[95] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        تخطَّ إلى المحتوى
      </a>

      {/* Desktop right rail */}
      <aside className="no-print fixed inset-y-0 right-0 z-40 hidden w-64 flex-col border-e border-line bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          {logo ? (
            <img src={logo} alt="" className="h-9 w-9 rounded-xl border border-line object-contain" />
          ) : (
            <BrandMark size={36} />
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-ink">{shopName}</p>
            <p className="text-[11px] font-semibold tracking-wide text-muted">إدارة المعرض</p>
          </div>
        </div>

        <Link
          to="/sales/new"
          className="mx-3 mb-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-walnut text-[14.5px] font-semibold text-white transition-colors hover:bg-[#7a4e2b]"
        >
          <PlusCircle size={18} aria-hidden="true" />
          فاتورة بيع جديدة
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3" aria-label="التنقل الرئيسي">
          {MAIN_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}

          <div className="px-3 pt-5 pb-2 text-[11px] font-bold tracking-wide text-muted">العاملون والحسابات</div>
          {MONEY_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}

          <div className="px-3 pt-5 pb-2 text-[11px] font-bold tracking-wide text-muted">البيانات الأساسية</div>
          {DATA_LINKS.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}

          <div className="px-3 pt-5 pb-2 text-[11px] font-bold tracking-wide text-muted">النظام</div>
          {SYSTEM_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="border-t border-line px-3 py-3">
          <button
            type="button"
            onClick={lock}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[14px] font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <Lock size={18} aria-hidden="true" />
            <span>قفل التطبيق</span>
          </button>
          <p className="mt-1 px-3 text-[11px] text-muted">الإصدار {APP_VERSION}</p>
        </div>
      </aside>

      <div className="lg:ps-64">
        <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="lg:hidden">
                {logo ? (
                  <img src={logo} alt="" className="h-8 w-8 rounded-lg border border-line object-contain" />
                ) : (
                  <BrandMark size={30} />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-ink lg:text-[16px]">{shopName}</p>
                <p className="hidden text-[12px] text-muted sm:block">بياناتك محفوظة على هذا الجهاز</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex">
                <BackupBadge />
              </span>
              <span className="sm:hidden">
                <BackupBadge compact />
              </span>
              <span className="hidden sm:inline-flex">
                <InstallButton />
              </span>
              <button
                type="button"
                onClick={lock}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:text-ink lg:hidden"
                aria-label="قفل التطبيق"
              >
                <Lock size={17} />
              </button>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 sm:px-6 lg:pt-7 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden"
        aria-label="التنقل السفلي"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-ink' : 'text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                        isActive ? 'bg-ink text-white' : ''
                      }`}
                    >
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span className="leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
