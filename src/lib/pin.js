/**
 * PIN handling. The PIN itself is never stored — only a PBKDF2-SHA-256 hash
 * with a random salt, which the browser keeps inside IndexedDB on this device.
 */
const ITERATIONS = 120000

function toBase64(bytes) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function fromBase64(value) {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function isValidPin(pin) {
  return /^\d{4,6}$/.test(String(pin ?? ''))
}

export function randomSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return toBase64(bytes)
}

async function derive(pin, saltBase64) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('المتصفح لا يدعم التشفير المطلوب لحماية الرمز. استخدم متصفحاً حديثاً عبر اتصال آمن.')
  }
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(saltBase64), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return toBase64(new Uint8Array(bits))
}

export function hashPin(pin, saltBase64) {
  return derive(pin, saltBase64)
}

export async function verifyPinHash(pin, saltBase64, expectedHash) {
  if (!saltBase64 || !expectedHash) return false
  const actual = await derive(pin, saltBase64)
  return actual === expectedHash
}
