/** Storage persistence + usage, so the owner knows the data is protected. */

export function isStorageSupported() {
  return Boolean(navigator.storage?.estimate)
}

export async function isStoragePersisted() {
  try {
    return Boolean(await navigator.storage?.persisted?.())
  } catch {
    return false
  }
}

export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return Boolean(await navigator.storage.persist())
  } catch {
    return false
  }
}

export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return {
      usage,
      quota,
      percent: quota ? Math.min(100, (usage / quota) * 100) : 0,
    }
  } catch {
    return null
  }
}
