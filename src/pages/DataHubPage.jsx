import { Link } from 'react-router-dom'
import { ChevronLeft, HardHat, ListTree, Package, Truck, Users } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { getOverviewCounts } from '../services/overview'
import { PageHeader } from '../components/ui/PageHeader'
import { localizeDigits } from '../lib/digits'

const SECTIONS = [
  {
    to: '/customers',
    title: 'العملاء',
    description: 'بيانات العملاء والأرصدة الافتتاحية',
    icon: Users,
    countKey: 'customers',
  },
  {
    to: '/suppliers',
    title: 'الموردون',
    description: 'بيانات الموردين والأرصدة الافتتاحية',
    icon: Truck,
    countKey: 'suppliers',
  },
  {
    to: '/items',
    title: 'الأصناف',
    description: 'خامات ومنتجات، أسعار وحدود المخزون',
    icon: Package,
    countKey: 'items',
  },
  {
    to: '/workers',
    title: 'العمال',
    description: 'المرتبات وبيانات العمال',
    icon: HardHat,
    countKey: 'workers',
  },
  {
    to: '/lists',
    title: 'القوائم المساعدة',
    description: 'التصنيفات والوحدات وتصنيفات المصروفات',
    icon: ListTree,
    countKey: null,
  },
]

export function DataHubPage() {
  const { settings } = useSettings()
  const counts = useLive(() => getOverviewCounts(), [])
  const digits = settings?.display?.digits

  return (
    <div>
      <PageHeader
        title="البيانات الأساسية"
        description="كل ما تحتاجه لبدء العمل: العملاء، الموردون، الأصناف والقوائم."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const value = counts && section.countKey ? counts[section.countKey] : null
          return (
            <Link
              key={section.to}
              to={section.to}
              className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{section.title}</p>
                <p className="truncate text-[12.5px] text-muted">{section.description}</p>
              </div>
              {value !== null && (
                <span className="tabular rounded-full bg-canvas px-2.5 py-1 text-[12px] font-bold text-muted">
                  {localizeDigits(value, digits)}
                </span>
              )}
              <ChevronLeft size={17} className="text-muted transition-transform group-hover:-translate-x-0.5" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
