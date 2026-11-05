import { Search } from 'lucide-react'
import { Input } from './ui/Field'

export function SearchToolbar({ search, onSearch, placeholder, includeArchived, onIncludeArchived, children }) {
  return (
    <div className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
        <Input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className="ps-9"
          type="search"
          aria-label={placeholder}
        />
      </div>
      {children}
      {onIncludeArchived && (
        <label className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-2 text-[13px] font-medium text-muted">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => onIncludeArchived(event.target.checked)}
            className="h-4 w-4 accent-[#1c1c1e]"
          />
          إظهار المؤرشفة
        </label>
      )}
    </div>
  )
}
