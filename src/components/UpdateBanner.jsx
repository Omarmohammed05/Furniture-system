import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from './ui/Button'
import { applyUpdateNow, onUpdateAvailable } from '../pwa/serviceWorker'

/**
 * "Update available" banner. It never reloads on its own: the owner may be
 * in the middle of a form, so the reload only happens when they tap تحديث.
 */
export function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => onUpdateAvailable(() => setNeedRefresh(true)), [])

  if (!needRefresh || dismissed) return null

  return (
    <div className="no-print fixed inset-x-0 bottom-20 z-[85] mx-auto w-full max-w-md px-4 lg:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.24)]">
        <RefreshCw size={18} className="shrink-0 text-walnut" aria-hidden="true" />
        <p className="flex-1 text-[14px] leading-6 text-ink">يتوفر تحديث جديد للتطبيق</p>
        <Button size="sm" variant="primary" onClick={() => applyUpdateNow()}>
          تحديث
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
          aria-label="لاحقاً"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
