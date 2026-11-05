import { useEffect } from 'react'
import { Delete } from 'lucide-react'
import { localizeDigits } from '../lib/digits'

/**
 * Large numeric keypad — the owner is not technical, so a PIN is typed on big
 * buttons (and with a hardware keyboard on desktop).
 */
export function PinPad({ value, onChange, onSubmit, length = 0, maxLength = 6, error, busy, digits = 'western', autoSubmit = false }) {
  const dots = Math.max(length || 4, value.length)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (busy) return
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        if (value.length < maxLength) onChange(value + event.key)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        onChange(value.slice(0, -1))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (value.length >= 4) onSubmit?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [value, onChange, onSubmit, maxLength, busy])

  useEffect(() => {
    if (!autoSubmit || !length) return
    if (value.length === length) onSubmit?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length, autoSubmit])

  const press = (digit) => {
    if (busy) return
    if (value.length < maxLength) onChange(value + digit)
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-center gap-3" dir="ltr">
        {Array.from({ length: dots }).map((_, index) => (
          <span
            key={index}
            className={`h-3.5 w-3.5 rounded-full transition-all ${
              index < value.length ? 'scale-110 bg-ink' : 'border border-line bg-surface'
            }`}
          />
        ))}
      </div>

      <p className={`mb-4 min-h-6 text-center text-[13px] font-medium ${error ? 'text-danger' : 'text-muted'}`} aria-live="polite">
        {error || (length ? 'أدخل الرمز للمتابعة' : 'من ٤ إلى ٦ أرقام')}
      </p>

      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => press(digit)}
            disabled={busy}
            className="tabular h-14 rounded-2xl border border-line bg-surface text-[22px] font-semibold text-ink transition-colors hover:bg-canvas active:scale-[0.98] disabled:opacity-50"
          >
            {localizeDigits(digit, digits)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={busy}
          className="h-14 rounded-2xl text-[13px] font-semibold text-muted transition-colors hover:bg-black/5 disabled:opacity-50"
        >
          مسح
        </button>
        <button
          type="button"
          onClick={() => press('0')}
          disabled={busy}
          className="tabular h-14 rounded-2xl border border-line bg-surface text-[22px] font-semibold text-ink transition-colors hover:bg-canvas active:scale-[0.98] disabled:opacity-50"
        >
          {localizeDigits('0', digits)}
        </button>
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          disabled={busy}
          className="flex h-14 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-black/5 disabled:opacity-50"
          aria-label="حذف الرقم الأخير"
        >
          <Delete size={22} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onSubmit?.()}
        disabled={busy || value.length < 4}
        className="mt-5 h-12 w-full rounded-xl bg-ink text-base font-semibold text-white transition-colors hover:bg-black disabled:opacity-40"
      >
        {busy ? 'جارٍ التحقق…' : 'دخول'}
      </button>
    </div>
  )
}
