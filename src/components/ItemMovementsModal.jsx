import { useEffect, useState } from 'react'
import { useSettings } from '../app/SettingsContext'
import { formatShortDate } from '../lib/dates'
import { formatQuantity } from '../lib/money'
import { getItemMovements, movementLabel } from '../services/inventory'
import { Input } from './ui/Field'
import { Modal } from './ui/Modal'

/** Movement history with a running balance, newest first (M3). */
export function ItemMovementsModal({ open, onClose, item }) {
  const { digits } = useSettings()
  const [rows, setRows] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    if (!open) return
    setFrom('')
    setTo('')
  }, [open])

  useEffect(() => {
    if (!open || !item) return
    let alive = true
    setRows(null)
    getItemMovements(item.id, { from, to }).then((data) => {
      if (alive) setRows(data)
    })
    return () => {
      alive = false
    }
  }, [open, item, from, to])

  return (
    <Modal open={open} onClose={onClose} title="حركات المخزون" description={item?.name} size="lg">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="من تاريخ" />
        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="إلى تاريخ" />
      </div>
      {rows === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-lg bg-canvas" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-[13.5px] text-muted">لا توجد حركات على هذا الصنف بعد.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">{movementLabel(row.type)}</p>
                <p className="truncate text-[11.5px] text-muted">
                  {formatShortDate(row.date, { digits })} {row.note ? `• ${row.note}` : ''}
                </p>
              </div>
              <div className="text-end">
                <p className={`tabular text-[13.5px] font-bold ${row.qty < 0 ? 'text-danger' : 'text-success'}`} dir="ltr">
                  {row.qty > 0 ? '+' : ''}
                  {formatQuantity(row.qty, { digits })}
                </p>
                <p className="tabular text-[11.5px] text-muted">الرصيد {formatQuantity(row.balance, { digits })}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
