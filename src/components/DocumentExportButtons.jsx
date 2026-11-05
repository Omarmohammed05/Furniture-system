import { useState } from 'react'
import { FileImage, FileText } from 'lucide-react'
import { useToast } from '../app/ToastContext'
import { exportNodeToPdf, exportNodeToPng } from '../lib/exportDocument'
import { Button } from './ui/Button'

/** PNG / PDF export for one printed document (invoice, statement, pay slip). */
export function DocumentExportButtons({ getNode, name = 'document', orientation = 'portrait', size = 'md' }) {
  const toast = useToast()
  const [busy, setBusy] = useState('')

  const run = async (kind) => {
    setBusy(kind)
    try {
      const node = typeof getNode === 'function' ? getNode() : getNode?.current
      if (kind === 'pdf') await exportNodeToPdf(node, name, { orientation })
      else await exportNodeToPng(node, name)
      toast.success(kind === 'pdf' ? 'تم تصدير الملف PDF' : 'تم حفظ الصورة')
    } catch (error) {
      toast.error(error?.message || 'تعذر التصدير')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <Button variant="secondary" size={size} onClick={() => run('png')} disabled={Boolean(busy)}>
        <FileImage size={16} />
        {busy === 'png' ? 'جارٍ التصدير…' : 'صورة'}
      </Button>
      <Button variant="secondary" size={size} onClick={() => run('pdf')} disabled={Boolean(busy)}>
        <FileText size={16} />
        {busy === 'pdf' ? 'جارٍ التصدير…' : 'PDF'}
      </Button>
    </>
  )
}
