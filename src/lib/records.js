export function isoNow() {
  return new Date().toISOString()
}

/**
 * Every record in the database carries id / createdAt / updatedAt /
 * deletedAt / deviceId. `deviceId` is the device code used in invoice
 * numbers, so a record always tells which device wrote it.
 */
export function newRecord(deviceId, fields = {}) {
  const now = isoNow()
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deviceId: deviceId || 'A',
    ...fields,
  }
}

export function touchRecord(record, patch = {}) {
  return { ...record, ...patch, updatedAt: isoNow() }
}

export function archiveRecord(record) {
  return touchRecord(record, { deletedAt: isoNow(), active: false })
}

export function restoreRecord(record) {
  return touchRecord(record, { deletedAt: null, active: true })
}
