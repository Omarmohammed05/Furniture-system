import { useEffect, useState } from 'react'
import { Store } from 'lucide-react'
import { useAuth } from '../app/AuthContext'
import { useSettings } from '../app/SettingsContext'
import { BrandMark } from '../components/BrandMark'
import { PinPad } from '../components/PinPad'

const MAX_ATTEMPTS = 5
const COOLDOWN_MS = 30000

export function LockPage() {
  const { settings, digits } = useSettings()
  const { unlock, busy } = useAuth()

  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(Date.now())

  const shopName = settings?.profile?.shopName || 'نظام المعرض'
  const logo = settings?.profile?.logoDataUrl
  const pinLength = Number(settings?.security?.pinLength) || 0
  const coolingDown = cooldownUntil > now

  useEffect(() => {
    if (!cooldownUntil) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  const handleChange = (value) => {
    if (coolingDown) return
    setPin(value)
    if (error) setError('')
  }

  const handleSubmit = async () => {
    if (busy || coolingDown || pin.length < 4) return
    const ok = await unlock(pin)
    if (ok) return

    const nextAttempts = attempts + 1
    setPin('')
    if (nextAttempts >= MAX_ATTEMPTS) {
      setAttempts(0)
      setCooldownUntil(Date.now() + COOLDOWN_MS)
      setError('محاولات كثيرة — انتظر قليلاً ثم حاول مرة أخرى')
    } else {
      setAttempts(nextAttempts)
      setError('الرمز غير صحيح، حاول مرة أخرى')
    }
  }

  const secondsLeft = coolingDown ? Math.ceil((cooldownUntil - now) / 1000) : 0

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        {logo ? (
          <img src={logo} alt="" className="h-16 w-16 rounded-2xl border border-line bg-surface object-contain" />
        ) : (
          <BrandMark size={60} />
        )}
        <h1 className="mt-4 text-[21px] leading-8 font-bold text-ink">{shopName}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
          <Store size={14} aria-hidden="true" />
          التطبيق مقفل
        </p>
      </div>

      <div className="card w-full max-w-sm px-5 py-6">
        <PinPad
          value={pin}
          onChange={handleChange}
          onSubmit={handleSubmit}
          length={pinLength}
          autoSubmit
          digits={digits}
          busy={busy || coolingDown}
          error={coolingDown ? `انتظر ${secondsLeft} ثانية` : error}
        />
      </div>

      <p className="mt-5 max-w-xs text-center text-[12px] leading-6 text-muted">
        البيانات محفوظة على هذا الجهاز. إذا نسيت الرمز فلا يمكن فتح البيانات إلا باستعادة نسخة احتياطية.
      </p>
    </div>
  )
}
