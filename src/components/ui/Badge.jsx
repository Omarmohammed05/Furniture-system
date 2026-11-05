const TONES = {
  neutral: 'bg-canvas text-muted',
  ink: 'bg-ink text-white',
  sand: 'bg-sand text-walnut',
  success: 'bg-success-soft text-[#05603a]',
  danger: 'bg-danger-soft text-[#912018]',
  warn: 'bg-warn-soft text-[#93370d]',
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
