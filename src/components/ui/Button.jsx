import { forwardRef } from 'react'

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-[#000] active:scale-[0.99]',
  secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
  soft: 'bg-sand text-walnut hover:bg-[#efe6dd]',
  ghost: 'text-ink hover:bg-black/5',
  danger: 'bg-danger text-white hover:bg-[#981b13]',
}

const SIZES = {
  md: 'h-11 px-4 text-[15px]',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-10 w-10',
}

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', type = 'button', className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
})
