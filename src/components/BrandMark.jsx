export function BrandMark({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="نظام المعرض"
    >
      <rect width="48" height="48" rx="13" fill="#1C1C1E" />
      <path
        d="M15 12.5h18a3.5 3.5 0 0 1 3.5 3.5v11a3.5 3.5 0 0 1-3.5 3.5H15a3.5 3.5 0 0 1-3.5-3.5V16a3.5 3.5 0 0 1 3.5-3.5Z"
        fill="#F4EFEB"
      />
      <rect x="9.5" y="27.5" width="29" height="5" rx="2.5" fill="#8A5A33" />
      <rect x="13.6" y="33" width="3.2" height="5.6" rx="1.6" fill="#F4EFEB" />
      <rect x="31.2" y="33" width="3.2" height="5.6" rx="1.6" fill="#F4EFEB" />
    </svg>
  )
}
