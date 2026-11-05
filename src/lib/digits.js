const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

/** Renders western digits as Arabic-Indic when the owner chose that style. */
export function localizeDigits(text, digits = 'western') {
  const value = String(text ?? '')
  if (digits !== 'arabic') return value
  return value.replace(/[0-9]/g, (digit) => ARABIC_INDIC[Number(digit)])
}

/** Accepts Arabic-Indic digits typed by the user and returns western digits. */
export function normalizeDigits(text) {
  return String(text ?? '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
}

export function formatNumber(value, { digits = 'western', min = 0, max = 2 } = {}) {
  const number = Number(value)
  if (!Number.isFinite(number)) return localizeDigits('0', digits)
  const text = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(number)
  return localizeDigits(text, digits)
}

export const DIGIT_STYLES = [
  { value: 'western', label: '123', sample: '1,234.50' },
  { value: 'arabic', label: '١٢٣', sample: '١٢٣٤٫٥٠' },
]
