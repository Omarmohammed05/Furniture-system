import { Badge } from './ui/Badge'
import { INVOICE_STATUS } from '../lib/invoiceStatus'

export function InvoiceStatusBadge({ status }) {
  const meta = INVOICE_STATUS[status] || INVOICE_STATUS.unpaid
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
