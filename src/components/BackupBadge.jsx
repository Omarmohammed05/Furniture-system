import { Link } from 'react-router-dom'
import { HardDriveDownload } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { backupStatus } from '../services/backup'

/** Shows how old the last backup is; turns red when a reminder is due. */
export function BackupBadge({ compact = false }) {
  const { settings, relative } = useSettings()
  if (!settings) return null

  const status = backupStatus(settings)
  const label = status.never ? 'لم تُنشأ نسخة بعد' : `آخر نسخة: ${relative(status.lastBackupAt)}`

  if (compact) {
    return (
      <Link
        to="/backup"
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
          status.overdue ? 'border-danger/30 bg-danger-soft text-danger' : 'border-line bg-surface text-muted'
        }`}
        aria-label={`النسخ الاحتياطي — ${label}`}
        title={label}
      >
        <HardDriveDownload size={17} />
      </Link>
    )
  }

  return (
    <Link
      to="/backup"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
        status.overdue
          ? 'border-danger/25 bg-danger-soft text-danger-ink hover:bg-danger-soft/80'
          : 'border-line bg-surface text-muted hover:text-ink'
      }`}
      title="افتح صفحة النسخ الاحتياطي"
    >
      <span className={`h-2 w-2 rounded-full ${status.overdue ? 'bg-danger' : 'bg-success'}`} />
      <span>{label}</span>
    </Link>
  )
}
