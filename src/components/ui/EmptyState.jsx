import { Inbox } from 'lucide-react'

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-muted">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[14px] leading-6 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
