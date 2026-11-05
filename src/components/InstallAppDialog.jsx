import { useEffect, useState } from 'react'
import { Download, MonitorSmartphone, Share, WifiOff, Zap } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { useInstallPrompt } from '../pwa/useInstallPrompt'
import { useToast } from '../app/ToastContext'

const ASKED_KEY = 'showroom.installAsked'

const BENEFITS = [
  { icon: WifiOff, title: 'يعمل بدون إنترنت', text: 'كل بيانات المعرض تبقى على الجهاز وتفتح حتى لو انقطع الاتصال.' },
  { icon: MonitorSmartphone, title: 'أيقونة على الشاشة الرئيسية', text: 'يفتح كتطبيق مستقل بشاشة كاملة، بدون شريط المتصفح.' },
  { icon: Zap, title: 'أسرع في كل فتح', text: 'ملفات التطبيق محفوظة على الجهاز فلا تحتاج تحميلاً مرة أخرى.' },
]

/**
 * First open on a device: asks once to install the app, which is what makes it
 * open from the home screen and keep working offline.
 */
export function InstallAppDialog() {
  const { canInstall, installed, isIos, install } = useInstallPrompt()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (installed) return undefined
    if (window.localStorage.getItem(ASKED_KEY) === '1') return undefined
    // Let the app paint first, then ask.
    const timer = window.setTimeout(() => setOpen(true), 1500)
    return () => window.clearTimeout(timer)
  }, [installed])

  const asked = () => window.localStorage.setItem(ASKED_KEY, '1')

  const close = () => {
    asked()
    setOpen(false)
  }

  const handleInstall = async () => {
    setBusy(true)
    const outcome = await install()
    setBusy(false)
    if (outcome === 'accepted') {
      asked()
      setOpen(false)
      toast.success('تم تثبيت التطبيق على جهازك')
      return
    }
    if (outcome === 'dismissed') {
      close()
      toast.info('يمكنك التثبيت لاحقاً من الإعدادات')
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      title="ثبّت التطبيق على جهازك"
      description="مرة واحدة فقط — بعدها يفتح من الشاشة الرئيسية ويعمل بدون إنترنت."
      footer={
        canInstall ? (
          <>
            <Button variant="ghost" size="md" onClick={close}>
              لاحقاً
            </Button>
            <Button variant="primary" size="md" loading={busy} onClick={handleInstall}>
              <Download size={17} aria-hidden="true" />
              تثبيت التطبيق الآن
            </Button>
          </>
        ) : (
          <Button variant="primary" size="md" onClick={close}>
            حسناً، فهمت
          </Button>
        )
      }
    >
      <ul className="space-y-3">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 rounded-xl border border-line bg-canvas px-3.5 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-walnut">
              <Icon size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      {!canInstall && (
        <div className="mt-4 rounded-xl border border-walnut/25 bg-sand px-3.5 py-3 text-[13px] leading-6 text-ink">
          {isIos ? (
            <p className="flex items-start gap-2">
              <Share size={16} className="mt-1 shrink-0 text-walnut" aria-hidden="true" />
              <span>
                من <strong>سفاري</strong> اضغط زر المشاركة، ثم اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <Download size={16} className="mt-1 shrink-0 text-walnut" aria-hidden="true" />
              <span>
                من قائمة المتصفح <strong>(⋮)</strong> اختر <strong>«تثبيت التطبيق»</strong> أو{' '}
                <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
              </span>
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
