const TONES = {
  neutral: 'bg-canvas text-muted',
  ink: 'bg-solid text-on-solid',
  sand: 'bg-sand text-walnut',
  success: 'bg-success-soft text-success-ink',
  danger: 'bg-danger-soft text-danger-ink',
  warn: 'bg-warn-soft text-warn-ink',
  outline: 'border border-line text-muted',
}

export function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
