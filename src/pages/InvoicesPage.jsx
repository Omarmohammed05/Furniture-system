import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Download, Eye, Pencil, Plus, ReceiptText } from 'lucide-react'
import { useToast } from '../app/ToastContext'
import { useSettings } from '../app/SettingsContext'
import { useLive } from '../hooks/useLive'
import { formatShortDate } from '../lib/dates'
import { exportRowsToExcel } from '../lib/excel'
import { remainingOf } from '../lib/invoiceStatus'
import { listParties } from '../services/parties'
import { listPurchaseInvoices, voidPurchaseInvoice } from '../services/purchases'
import { listSalesInvoices, voidSalesInvoice } from '../services/sales'
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge'
import { VoidInvoiceModal } from '../components/VoidInvoiceModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

const PAGE_SIZE = 20

const CONFIG = {
  sale: {
    title: 'فواتير البيع',
    description: 'كل عمليات البيع مع حالة السداد والمتبقي على العميل.',
    newTo: '/sales/new',
    newLabel: 'فاتورة بيع',
    base: '/sales',
    partyField: 'customers',
    partyLabel: 'العميل',
    list: listSalesInvoices,
    voidInvoice: voidSalesInvoice,
    emptyTitle: 'لا توجد فواتير بيع بعد',
    emptyDescription: 'أنشئ أول فاتورة بيع ليُخصم المخزون ويُسجَّل المتبقي على العميل.',
  },
  purchase: {
    title: 'فواتير الشراء',
    description: 'فواتير الخامات من الموردين، ومقدار ما تبقّى لهم.',
    newTo: '/purchases/new',
    newLabel: 'فاتورة شراء',
    base: '/purchases',
    partyField: 'suppliers',
    partyLabel: 'المورد',
    list: listPurchaseInvoices,
    voidInvoice: voidPurchaseInvoice,
    emptyTitle: 'لا توجد فواتير شراء بعد',
    emptyDescription: 'سجّل مشترياتك من الخامات ليزيد المخزون وتُحسب مستحقات الموردين.',
  },
}

export function InvoicesPage({ kind }) {
  const config = CONFIG[kind]
  const { money, digits } = useSettings()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [partyId, setPartyId] = useState('')
  const [voidTarget, setVoidTarget] = useState(null)
  const [page, setPage] = useState(1)

  const invoices = useLive(
    () => config.list({ search, status, [kind === 'sale' ? 'customerId' : 'supplierId']: partyId }),
    [kind, search, status, partyId],
  )
  const parties = useLive(() => listParties(config.partyField), [config.partyField])

  const all = (invoices || []).filter(Boolean)
  const total = all.filter((row) => !row.voidedAt).reduce((sum, row) => sum + (row.total || 0), 0)

  // Thousands of invoices stay responsive: only one page is rendered.
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = all.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [kind, search, status, partyId])

  const exportExcel = () => {
    const statusLabel = { unpaid: 'غير مدفوعة', partial: 'مدفوعة جزئياً', paid: 'مدفوعة', void: 'ملغاة' }
    exportRowsToExcel({
      filename: kind,
      sheetName: config.title,
      title: config.title,
      summary: [{ label: 'إجمالي المعروض', value: total, type: 'money' }],
      columns: [
        { key: 'number', label: 'الرقم', type: 'text' },
        { key: 'date', label: 'التاريخ', type: 'text' },
        { key: 'party', label: config.partyLabel, type: 'text' },
        { key: 'total', label: 'الإجمالي', type: 'money' },
        { key: 'paid', label: 'المدفوع', type: 'money' },
        { key: 'remaining', label: 'المتبقي', type: 'money' },
        { key: 'status', label: 'الحالة', type: 'text' },
      ],
      rows: all.map((invoice) => ({
        number: invoice.number,
        date: invoice.date,
        party: invoice[kind === 'sale' ? 'customerName' : 'supplierName'] || '',
        total: invoice.total,
        paid: invoice.paid,
        remaining: invoice.voidedAt ? 0 : remainingOf(invoice),
        status: invoice.voidedAt ? 'ملغاة' : statusLabel[invoice.status] || invoice.status,
      })),
    }).catch(() => toast.error('تعذر تصدير الملف'))
  }

  const handleVoid = async (reason) => {
    try {
      await config.voidInvoice(voidTarget.id, reason)
      toast.success('تم إلغاء الفاتورة وعكس حركات المخزون')
      setVoidTarget(null)
    } catch (error) {
      toast.error(error.message || 'تعذر الإلغاء')
    }
  }

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <>
            <Button variant="secondary" onClick={exportExcel} disabled={!all.length}>
              <Download size={16} />
              Excel
            </Button>
            <Link to={config.newTo}>
              <Button variant="primary">
                <Plus size={17} />
                {config.newLabel}
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث برقم الفاتورة أو الاسم…"
          type="search"
          aria-label="بحث"
          className="flex-1"
        />
        <Select value={partyId} onChange={(event) => setPartyId(event.target.value)} className="sm:w-48" aria-label={config.partyLabel}>
          <option value="">كل {config.partyLabel === 'العميل' ? 'العملاء' : 'الموردين'}</option>
          {(parties || []).map((party) => (
            <option key={party.id} value={party.id}>
              {party.name}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)} className="sm:w-40" aria-label="الحالة">
          <option value="all">كل الحالات</option>
          <option value="unpaid">غير مدفوعة</option>
          <option value="partial">مدفوعة جزئياً</option>
          <option value="paid">مدفوعة</option>
          <option value="void">ملغاة</option>
        </Select>
      </div>

      {invoices === undefined ? (
        <Card className="space-y-3 p-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
          ))}
        </Card>
      ) : all.length === 0 ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title={search || partyId || status !== 'all' ? 'لا توجد فواتير مطابقة' : config.emptyTitle}
            description={
              search || partyId || status !== 'all'
                ? 'جرّب بحثاً آخر أو أعد ضبط التصفية.'
                : config.emptyDescription
            }
            action={
              <Link to={config.newTo}>
                <Button variant="primary">
                  <Plus size={16} />
                  {config.newLabel}
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[12px] font-semibold text-muted">
            <span>{all.length} فاتورة</span>
            <span className="tabular">إجمالي المعروض: {money(total)}</span>
          </div>
          <ul className="divide-y divide-line">
            {visible.map((invoice) => {
              const remaining = remainingOf(invoice)
              return (
                <li key={invoice.id} className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${invoice.voidedAt ? 'opacity-70' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`${config.base}/${invoice.id}`} className="tabular text-[14px] font-bold text-ink hover:underline" dir="ltr">
                        {invoice.number}
                      </Link>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-muted">
                      {invoice[kind === 'sale' ? 'customerName' : 'supplierName']} • {formatShortDate(invoice.date, { digits })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-start sm:text-end">
                      <p className="tabular text-[14px] font-bold text-ink">{money(invoice.total)}</p>
                      {!invoice.voidedAt && remaining > 0 && (
                        <p className="tabular text-[11.5px] font-semibold text-danger">متبقي {money(remaining)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link to={`${config.base}/${invoice.id}`} aria-label="عرض الفاتورة">
                        <Button variant="ghost" size="icon">
                          <Eye size={16} />
                        </Button>
                      </Link>
                      {!invoice.voidedAt && (
                        <Link to={`${config.base}/${invoice.id}/edit`} aria-label="تعديل الفاتورة">
                          <Button variant="ghost" size="icon">
                            <Pencil size={16} />
                          </Button>
                        </Link>
                      )}
                      {!invoice.voidedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setVoidTarget(invoice)}
                          aria-label="إلغاء الفاتورة"
                          className="text-muted hover:text-danger"
                        >
                          <Ban size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[12.5px] text-muted">
              <span>
                صفحة {safePage} من {pageCount}
              </span>
              <div className="flex items-center gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>
                  السابق
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= pageCount}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <VoidInvoiceModal
        open={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoid}
        number={voidTarget?.number}
      />
    </div>
  )
}
