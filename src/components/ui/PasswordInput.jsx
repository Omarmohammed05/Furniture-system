import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './Field'

/**
 * Password / PIN field with a show-hide control. The toggle is a real button
 * with an accessible name, so it works from the keyboard too.
 */
export function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`pe-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'إخفاء الرمز' : 'إظهار الرمز'}
        aria-pressed={visible}
        title={visible ? 'إخفاء' : 'إظهار'}
        className="absolute end-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  )
}
