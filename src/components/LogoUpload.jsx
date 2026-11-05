import { ImagePlus, Trash2 } from 'lucide-react'
import { pickFile, prepareLogo } from '../lib/files'
import { useToast } from '../app/ToastContext'
import { Button } from './ui/Button'

/** Shop logo — stored inside IndexedDB as a small data URL. */
export function LogoUpload({ value, onChange, size = 72, label = 'شعار المعرض' }) {
  const toast = useToast()

  const handlePick = async () => {
    const file = await pickFile({ accept: 'image/*' })
    if (!file) return
    try {
      const dataUrl = await prepareLogo(file)
      onChange(dataUrl)
    } catch (error) {
      toast.error(error.message || 'تعذر تحميل الصورة')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-canvas"
        style={{ width: size, height: size }}
      >
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <ImagePlus size={24} className="text-muted" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handlePick}>
            {value ? 'تغيير الشعار' : 'اختيار صورة'}
          </Button>
          {value && (
            <Button size="sm" variant="ghost" onClick={() => onChange('')} aria-label="حذف الشعار">
              <Trash2 size={15} />
            </Button>
          )}
        </div>
        <p className="text-[12px] leading-5 text-muted">صورة مربعة أفضل — تُحفظ داخل الجهاز فقط</p>
      </div>
    </div>
  )
}
