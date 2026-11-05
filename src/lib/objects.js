export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** Deep merge used for sectioned settings objects. */
export function mergeDeep(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch === undefined ? base : patch
  }
  const result = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    result[key] = isPlainObject(value) && isPlainObject(base[key]) ? mergeDeep(base[key], value) : value
  }
  return result
}
