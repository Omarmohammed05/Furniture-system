import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

/** Light/dark switch that lives in the top bar and matches the icon buttons around it. */
export function ThemeToggle({ className = '' }) {
  const { isDark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink active:scale-95 ${className}`}
    >
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
    </button>
  )
}
