import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/**
 * Appears once the page has scrolled past a screen, so long invoice and report
 * lists can be left without dragging the scrollbar back.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="الرجوع إلى الأعلى"
      title="الرجوع إلى الأعلى"
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : 'true'}
      className={`no-print fixed end-4 bottom-24 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] transition-all duration-200 hover:bg-canvas hover:shadow-[0_14px_28px_-12px_rgba(0,0,0,0.4)] active:scale-95 motion-reduce:transition-none lg:bottom-6 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <ArrowUp size={19} aria-hidden="true" />
    </button>
  )
}
