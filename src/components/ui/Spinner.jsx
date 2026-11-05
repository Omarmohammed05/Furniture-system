/** Small inline spinner used by buttons and dialogs while work is in flight. */
export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      role="status"
      aria-label="جارٍ التنفيذ"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px] ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
