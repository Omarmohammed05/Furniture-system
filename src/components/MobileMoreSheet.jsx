import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'

/**
 * Phone-only navigation sheet. The bottom bar only holds the five main tabs, so
 * every other screen (payments, statements, payroll, settings…) is reached here.
 */
export function MobileMoreSheet({ open, onClose, groups }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="no-print fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="إغلاق القائمة" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="كل الشاشات"
        className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <p className="text-[15px] font-bold text-ink">كل الشاشات</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-3 py-4">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-2 pb-1 text-[11px] font-bold tracking-wide text-muted">{group.title}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-semibold transition-colors ${
                          isActive ? 'bg-ink text-white' : 'text-ink hover:bg-canvas'
                        }`
                      }
                    >
                      <Icon size={19} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
