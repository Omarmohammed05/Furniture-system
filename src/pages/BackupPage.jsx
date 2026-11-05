import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, FileJson, HardDriveDownload, ShieldCheck, Upload } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useAuth } from '../app/AuthContext'
import { useToast } from '../app/ToastContext'
import { countAllRecords, exportBackup, importBackupFile, inspectBackupFile } from '../services/backup'
import { pickFile } from '../lib/files'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { backupStatus } from '../services/backup'

const TABLE_LABELS = [
  { key: 'items', label: 'أصناف' },
  { key: 'customers', label: 'عملاء' },
  { key: 'suppliers', label: 'موردون' },
  { key: 'workers', label: 'عمال' },
  { key: 'categories', label: 'تصنيفات' },
  { key: 'units', label: 'وحدات' },
  { key: 'activity_log', label: 'سجلات نشاط' },
]

export function BackupPage() {
  const { settings, refresh, date, dateTime } = useSettings()
  const { lock } = useAuth()
  const toast = useToast()

  const [counts, setCounts] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [pending, setPending] = useState(null)
  const [importing, setImporting] = useState(false)

  const status = backupStatus(settings)

  const loadCounts = useCallback(async () => {
    setCounts(await countAllRecords())
  }, [])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await exportBackup()
      await refresh()
      await loadCounts()
      toast.success(`تم تنزيل «${result.filename}»`)
    } catch (error) {
      toast.error(error.message || 'تعذر إنشاء النسخة الاحتياطية')
    } finally {
      setExporting(false)
    }
  }

  const handleChooseFile = async () => {
    const file = await pickFile()
    if (!file) return
    const info = await inspectBackupFile(file)
    if (!info.ok) {
      toast.error(info.error || 'الملف غير صالح')
      return
    }
    setPending({ file, info })
  }

  const handleImport = async () => {
    if (!pending) return
    setImporting(true)
    try {
      const result = await importBackupFile(pending.file)
      setPending(null)
      await refresh()
      toast.success(`تمت استعادة ${result.total} سجلاً — سجّل الدخول برمز النسخة المستعادة`)
      lock()
    } catch (error) {
      toast.error(error.message || 'تعذرت الاستعادة')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="النسخ الاحتياطي"
        description="نسخة واحدة تحتوي كل البيانات — احفظها خارج الجهاز بانتظام."
      />

      <Card className={`p-5 ${status.overdue ? 'border-warn/30 bg-warn-soft/40' : ''}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-ink">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[16px] font-bold text-ink">
                  {status.never ? 'لا توجد نسخة احتياطية بعد' : status.overdue ? 'التذكير مستحق' : 'نسختك حديثة'}
                </p>
                {status.overdue && <Badge tone="warn">مطلوب نسخة</Badge>}
              </div>
              <p className="mt-0.5 text-[13px] leading-6 text-muted">
                {status.never
                  ? 'أنشئ أول نسخة الآن — البيانات لا تُرفع إلى أي مكان تلقائياً.'
                  : `آخر نسخة: ${dateTime(status.lastBackupAt)}${status.days > 0 ? ` (${date(status.lastBackupAt)})` : ' (اليوم)'}`}
              </p>
              {settings.backup.lastBackupName && (
                <p className="mt-1 truncate text-[12px] text-muted" dir="ltr">
                  {settings.backup.lastBackupName}
                </p>
              )}
            </div>
          </div>
          <Button variant="primary" onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">
            <HardDriveDownload size={17} />
            {exporting ? 'جارٍ التحضير…' : 'تنزيل نسخة الآن'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={FileJson}
            title="تصدير البيانات"
            description="ملف JSON واحد قابل للفتح على أي جهاز."
          />
          <div className="space-y-4 px-5 py-4">
            {counts && (
              <div className="grid grid-cols-2 gap-2 text-[13px]">
                {TABLE_LABELS.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2">
                    <span className="text-muted">{entry.label}</span>
                    <span className="tabular font-semibold text-ink">{counts.counts[entry.key] || 0}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[12.5px] leading-6 text-muted">
              يتضمن الملف كل الجداول والإعدادات ورمز الدخول وتاريخ التصدير وبصمة تحقق (checksum).
            </p>
            <Button variant="secondary" onClick={handleExport} disabled={exporting} className="w-full">
              <HardDriveDownload size={16} />
              {exporting ? 'جارٍ التحضير…' : 'تنزيل ملف النسخة'}
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={Upload}
            title="استعادة من نسخة"
            description="تستبدل كل البيانات الحالية ببيانات الملف."
          />
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/50 px-3 py-2.5">
              <AlertTriangle size={16} className="mt-1 shrink-0 text-danger" aria-hidden="true" />
              <p className="text-[12.5px] leading-6 text-danger-ink">
                الاستعادة تمسح البيانات الحالية. قبل التنفيذ يُنزّل النظام نسخة أمان تلقائية من بياناتك
                الحالية.
              </p>
            </div>

            <ul className="space-y-1.5 text-[12.5px] leading-6 text-muted">
              <li>• يُفحص الملف أولاً (التنسيق والبصمة والإصدار).</li>
              <li>• تُعرض ملخص النسخة قبل التأكيد.</li>
              <li>• تُستعاد البيانات والإعدادات ورمز الدخول كما كانت في النسخة.</li>
            </ul>

            <Button variant="secondary" onClick={handleChooseFile} className="w-full">
              <Upload size={16} />
              اختيار ملف نسخة احتياطية
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-[15px] font-semibold text-ink">أين أحفظ النسخة؟</h2>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-muted">
          <li>• احفظ الملف على ميموري أو أرسله لنفسك على واتساب أو ارفعه على Google Drive.</li>
          <li>• التطبيق لا يرفع بياناتك لأي مكان — النسخة الآمنة هي التي تحفظها بنفسك.</li>
          <li>• استخدم جهازاً واحداً في كل مرة لتجنب اختلاف الأرقام بين النسخ.</li>
        </ul>
      </Card>

      <Modal
        open={Boolean(pending)}
        onClose={importing ? undefined : () => setPending(null)}
        title="تأكيد الاستعادة"
        description="راجع بيانات النسخة قبل الاستبدال."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={importing}>
              إلغاء
            </Button>
            <Button variant="danger" onClick={handleImport} disabled={importing}>
              {importing ? 'جارٍ الاستعادة…' : 'استعادة الآن'}
            </Button>
          </>
        }
      >
        {pending && (
          <div className="space-y-3">
            <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line text-[13px]">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="text-muted">الملف</dt>
                <dd className="truncate font-semibold text-ink" dir="ltr">
                  {pending.info.fileName}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="text-muted">تاريخ النسخة</dt>
                <dd className="font-semibold text-ink">{dateTime(pending.info.exportedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="text-muted">كود الجهاز في النسخة</dt>
                <dd className="font-semibold text-ink">{pending.info.deviceId || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="text-muted">عدد السجلات</dt>
                <dd className="tabular font-semibold text-ink">{pending.info.total}</dd>
              </div>
            </dl>

            <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-[12.5px] leading-6 text-danger-ink">
              سيتم حذف كل البيانات الحالية واستبدالها ببيانات هذه النسخة. يُنزّل النظام نسخة أمان
              تلقائية أولاً.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
