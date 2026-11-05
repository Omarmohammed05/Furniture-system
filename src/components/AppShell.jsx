import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Banknote,
  Boxes,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  Coins,
  Database,
  FileText,
  HandCoins,
  HardDriveDownload,
  HardHat,
  History,
  LayoutDashboard,
  ListTree,
  Lock,
  MoreHorizontal,
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
import { useCollapsedSidebar } from '../hooks/useCollapsedSidebar'
import { APP_VERSION } from '../lib/appInfo'
import { BackupBadge } from './BackupBadge'
import { BrandMark } from './BrandMark'
import { InstallButton } from './InstallButton'
import { MobileMoreSheet } from './MobileMoreSheet'
import { ScrollToTop } from './ScrollToTop'
import { ThemeToggle } from './ThemeToggle'

const MAIN_NAV = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/sales', label: 'فواتير البيع', icon: ReceiptText },
  { to: '/purchases', label: 'فواتير الشراء', icon: ShoppingCart },
  { to: '/inventory', label: 'المخزون', icon: Boxes },
  { to: '/installments', label: 'الأقساط', icon: CalendarClock },
  { to: '/payments', label: 'الدفعات', icon: Wallet },
  { to: '/debts', label: 'الديون', icon: HandCoins },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
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
  { to: '/data', label: 'مركز البيانات', icon: Database },
  { to: '/activity', label: 'سجل النشاط', icon: History },
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

/** Everything the phone bottom bar has no room for. */
const MORE_GROUPS = [
  { title: 'العمليات', items: MAIN_NAV.filter((item) => item.to !== '/') },
  { title: 'العاملون والحسابات', items: MONEY_NAV },
  { title: 'البيانات الأساسية', items: DATA_LINKS },
  { title: 'النظام', items: SYSTEM_NAV },
]

function SidebarLink({ item, collapsed, onNavigate }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-xl text-[14.5px] font-semibold transition-colors ${
          collapsed ? 'justify-center px-0' : 'px-3'
        } ${isActive ? 'bg-solid text-on-solid' : 'text-muted hover:bg-canvas hover:text-ink'}`
      }
    >
      <Icon size={19} aria-hidden="true" className="shrink-0" />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
    </NavLink>
  )
}

function SidebarGroupTitle({ collapsed, children }) {
  if (collapsed) return <div className="mx-4 my-2 border-t border-line" aria-hidden="true" />
  return <div className="px-3 pt-5 pb-2 text-[11px] font-bold tracking-wide text-muted">{children}</div>
}

export function AppShell() {
  const { settings } = useSettings()
  const { lock } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [collapsed, toggleCollapsed] = useCollapsedSidebar()
  const shopName = settings?.profile?.shopName || 'نظام المعرض'
  const logo = settings?.profile?.logoDataUrl

  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'b') return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return
      event.preventDefault()
      toggleCollapsed()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleCollapsed])

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[95] focus:rounded-lg focus:bg-solid focus:px-4 focus:py-2 focus:text-on-solid"
      >
        تخطَّ إلى المحتوى
      </a>

      {/* Desktop right rail — folds to an icon rail on request */}
      <aside
        id="app-sidebar"
        className={`no-print fixed inset-y-0 right-0 z-40 hidden flex-col border-e border-line bg-surface transition-[width] duration-200 ease-out motion-reduce:transition-none lg:flex ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <div
          className={`py-4 ${
            collapsed ? 'flex flex-col items-center gap-2 px-0' : 'flex items-center gap-2 px-3'
          }`}
        >
          <div className={`flex items-center gap-2.5 ${collapsed ? '' : 'min-w-0 flex-1'}`}>
            {logo ? (
              <img
                src={logo}
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl border border-line object-contain"
              />
            ) : (
              <BrandMark size={36} />
            )}
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-ink">{shopName}</p>
                <p className="text-[11px] font-semibold tracking-wide text-muted">إدارة المعرض</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            aria-label={collapsed ? 'فتح الشريط الجانبي' : 'طيّ الشريط الجانبي'}
            title={collapsed ? 'فتح الشريط الجانبي (Ctrl+B)' : 'طيّ الشريط الجانبي (Ctrl+B)'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            {collapsed ? (
              <ChevronsLeft size={18} aria-hidden="true" />
            ) : (
              <ChevronsRight size={18} aria-hidden="true" />
            )}
          </button>
        </div>

        <Link
          to="/sales/new"
          title={collapsed ? 'فاتورة بيع جديدة' : undefined}
          className={`mb-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-walnut text-[14.5px] font-semibold text-on-walnut transition-colors hover:bg-walnut-hover ${
            collapsed ? 'mx-auto w-11' : 'mx-3'
          }`}
        >
          <PlusCircle size={18} aria-hidden="true" className="shrink-0" />
          <span className={collapsed ? 'sr-only' : ''}>فاتورة بيع جديدة</span>
        </Link>

        <nav
          className="flex-1 space-y-1 overflow-y-auto px-2 pb-3"
          aria-label="التنقل الرئيسي"
        >
          {MAIN_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}

          <SidebarGroupTitle collapsed={collapsed}>العاملون والحسابات</SidebarGroupTitle>
          {MONEY_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}

          <SidebarGroupTitle collapsed={collapsed}>البيانات الأساسية</SidebarGroupTitle>
          {DATA_LINKS.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}

          <SidebarGroupTitle collapsed={collapsed}>النظام</SidebarGroupTitle>
          {SYSTEM_NAV.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>

        <div className={`border-t border-line py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
          <button
            type="button"
            onClick={lock}
            title={collapsed ? 'قفل التطبيق' : undefined}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl text-[14px] font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
          >
            <Lock size={18} aria-hidden="true" className="shrink-0" />
            <span className={collapsed ? 'sr-only' : ''}>قفل التطبيق</span>
          </button>

          {!collapsed && <p className="mt-1 px-3 text-[11px] text-muted">الإصدار {APP_VERSION}</p>}
        </div>
      </aside>

      <div
        className={`transition-[padding] duration-200 ease-out motion-reduce:transition-none ${
          collapsed ? 'lg:ps-[76px]' : 'lg:ps-64'
        }`}
      >
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
              <ThemeToggle />
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
        <div className="mx-auto grid max-w-lg grid-cols-6 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-ink' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                        isActive ? 'bg-solid text-on-solid' : 'hover:bg-canvas'
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

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${
              moreOpen ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-colors ${
                moreOpen ? 'bg-solid text-on-solid' : 'hover:bg-canvas'
              }`}
            >
              <MoreHorizontal size={19} aria-hidden="true" />
            </span>
            <span className="leading-none">المزيد</span>
          </button>
        </div>
      </nav>

      <ScrollToTop />

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} groups={MORE_GROUPS} />
    </div>
  )
}
