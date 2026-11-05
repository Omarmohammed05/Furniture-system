import { forwardRef } from 'react'
import { Spinner } from './Spinner'

const VARIANTS = {
  primary: 'bg-solid text-on-solid hover:bg-solid-hover',
  secondary: 'border border-line bg-surface text-ink hover:border-ink/20 hover:bg-canvas',
  soft: 'bg-sand text-walnut hover:bg-walnut/15',
  ghost: 'text-ink hover:bg-solid/5',
  danger: 'bg-danger-solid text-white hover:bg-danger-solid-hover',
}

const SIZES = {
  md: 'h-11 px-4 text-[15px]',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-10 w-10',
}

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', type = 'button', className = '', children, loading = false, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
})
