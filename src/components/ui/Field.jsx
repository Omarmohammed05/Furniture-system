export function Field({ label, htmlFor, hint, error, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] leading-5 text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ className = '', invalid = false, ...props }) {
  return (
    <input
      className={`input-base ${invalid ? 'border-danger/60 bg-danger-soft/30' : ''} ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', invalid = false, children, ...props }) {
  return (
    <select
      className={`input-base appearance-none bg-[length:16px] bg-[position:left_0.75rem_center] bg-no-repeat ps-3 pe-9 ${invalid ? 'border-danger/60' : ''} ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className = '', invalid = false, rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:border-ink/30 focus:ring-4 focus:ring-ink/5 focus:outline-none ${invalid ? 'border-danger/60' : ''} ${className}`}
      {...props}
    />
  )
}
