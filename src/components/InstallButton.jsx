import { Download } from 'lucide-react'
import { Button } from './ui/Button'
import { useInstallPrompt } from '../pwa/useInstallPrompt'
import { useToast } from '../app/ToastContext'

export function InstallButton({ variant = 'secondary', size = 'sm', withLabel = true }) {
  const { canInstall, install } = useInstallPrompt()
  const toast = useToast()

  if (!canInstall) return null

  const handleClick = async () => {
    const outcome = await install()
    if (outcome === 'accepted') toast.success('تم تثبيت التطبيق على جهازك')
    else if (outcome === 'dismissed') toast.info('يمكنك التثبيت في أي وقت من إعدادات التطبيق')
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} title="تثبيت التطبيق على الجهاز">
      <Download size={16} aria-hidden="true" />
      {withLabel && <span>تثبيت التطبيق</span>}
    </Button>
  )
}
