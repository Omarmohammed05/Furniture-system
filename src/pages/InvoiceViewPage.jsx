import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Ban, Copy, MessageCircle, Pencil, Printer, Wallet } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { InvoiceDocument } from '../documents/InvoiceDocument'
import { formatShortDate } from '../lib/dates'
import { remainingOf } from '../lib/invoiceStatus'
import { minorToInput } from '../lib/money'
import { invoiceShareText, openWhatsApp } from '../lib/whatsapp'
import { getParty } from '../services/parties'
import { methodLabel } from '../services/payments'
import { getPurchaseInvoice, voidPurchaseInvoice } from '../services/purchases'
import { getSalesInvoice, voidSalesInvoice } from '../services/sales'
import { DocumentExportButtons } from '../components/DocumentExportButtons'
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge'
import { PaymentModal } from '../components/PaymentModal'
import { VoidInvoiceModal } from '../components/VoidInvoiceModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'

const INSTALLMENT_TONE = { paid: 'success', due: 'sand', cancelled: 'outline' }

export function InvoiceViewPage({ kind }) {
  const isSale = kind === 'sale'
  const base = isSale ? '/sales' : '/purchases'
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { settings, money, digits } = useSettings()

  const [voidOpen, setVoidOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const docRef = useRef(null)

  const data = useLive(() => (isSale ? getSalesInvoice(id) : getPurchaseInvoice(id)), [id, isSale])
  const partyKind = isSale ? 'customers' : 'suppliers'
  const partyId = data?.invoice ? (isSale ? data.invoice.customerId : data.invoice.supplierId) : ''
  const party = useLive(() => (partyId ? getParty(partyKind, partyId) : null), [partyKind, partyId])

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-canvas" />
        <div className="h-96 animate-pulse rounded-2xl bg-canvas" />
      </div>
    )
  }

  if (data === null) {
    return (
      <Card>
        <EmptyState
          title="الفاتورة غير موجودة"
          description="ربما أُلغيت أو حُذفت من نسخة أخرى."
          action={
            <Link to={base}>
              <Button variant="primary">رجوع للفواتير</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  const { invoice, lines, payments = [], installments = [] } = data
  const remaining = remainingOf(invoice)
  const partyName = party?.name || invoice[isSale ? 'customerName' : 'supplierName'] || ''

  const share = () => {
    openWhatsApp({
      phone: party?.phone || '',
      text: invoiceShareText({
        kind,
        invoice,
        lines,
        partyName,
        shopName: settings?.profile?.shopName || '',
        currency: settings?.currency?.label || 'ج.م',
      }),
    })
  }

  const handleVoid = async (reason) => {
    try {
      await (isSale ? voidSalesInvoice : voidPurchaseInvoice)(id, reason)
      toast.success('تم إلغاء الفاتورة وعكس حركات المخزون')
      setVoidOpen(false)
    } catch (error) {
      toast.error(error.message || 'تعذر الإلغاء')
    }
  }

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={isSale ? 'فاتورة بيع' : 'فاتورة شراء'}
          badge={<InvoiceStatusBadge status={invoice.status} />}
          description={`${invoice.number} • ${partyName} • ${formatShortDate(invoice.date, { digits })}`}
          actions={
            <>
              <Link to={base}>
                <Button variant="ghost">
                  <ArrowRight size={16} />
                  رجوع
                </Button>
              </Link>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={16} />
                طباعة
              </Button>
              <Button variant="secondary" onClick={share}>
                <MessageCircle size={16} />
                واتساب
              </Button>
              <DocumentExportButtons getNode={() => docRef.current} name={`${invoice.number || 'invoice'}`} />
              {!invoice.voidedAt && (
                <Link to={`${base}/${id}/edit`}>
                  <Button variant="secondary">
                    <Pencil size={16} />
                    تعديل
                  </Button>
                </Link>
              )}
              {!invoice.voidedAt && (
                <Link to={`${base}/new?from=${id}`}>
                  <Button variant="secondary">
                    <Copy size={16} />
                    تكرار
                  </Button>
                </Link>
              )}
              {!invoice.voidedAt && remaining > 0 && (
                <Button variant="primary" onClick={() => setPayOpen(true)}>
                  <Wallet size={16} />
                  {isSale ? 'تحصيل دفعة' : 'دفع للمورد'}
                </Button>
              )}
              {!invoice.voidedAt && (
                <Button variant="ghost" onClick={() => setVoidOpen(true)} className="text-danger">
                  <Ban size={16} />
                  إلغاء
                </Button>
              )}
            </>
          }
        />
      </div>

      {invoice.voidedAt && (
        <div className="no-print mb-4 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-[13.5px] font-semibold text-[#912018]">
          هذه الفاتورة ملغاة — {invoice.voidReason}
          {invoice.paid > 0 && (
            <p className="mt-1 font-semibold">
              تنبيه: المدفوع على هذه الفاتورة {money(invoice.paid)} —{' '}
              {isSale ? 'يجب ردّه للعميل أو تسويته كرصيد دائن.' : 'يجب استرداده من المورد أو تسويته كرصيد مدين.'}
            </p>
          )}
        </div>
      )}

      <div ref={docRef} className="bg-white">
        <InvoiceDocument kind={kind} invoice={invoice} lines={lines} party={party} />
      </div>

      <div className="no-print mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="الدفعات"
            description={`المدفوع ${money(invoice.paid)}${remaining > 0 ? ` — المتبقي ${money(remaining)}` : ''}`}
          />
          {payments.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-muted">لا توجد دفعات مسجلة على هذه الفاتورة.</p>
          ) : (
            <ul className="divide-y divide-line">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                  <div>
                    <p className="font-semibold text-ink">{money(payment.amount)}</p>
                    <p className="text-[11.5px] text-muted">
                      {formatShortDate(payment.date, { digits })} • {methodLabel(payment.method)}
                    </p>
                  </div>
                  <Badge tone="success">{isSale ? 'تحصيل' : 'دفعة'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isSale && (
          <Card>
            <CardHeader title="الأقساط" description={invoice.installmentPlan ? `${invoice.installmentPlan.count} قسط` : 'لا يوجد تقسيط'} />
            {installments.length === 0 ? (
              <p className="px-5 py-6 text-center text-[13px] text-muted">لا توجد أقساط على هذه الفاتورة.</p>
            ) : (
              <ul className="divide-y divide-line">
                {installments.map((installment) => {
                  const overdue =
                    installment.status !== 'paid' &&
                    installment.status !== 'cancelled' &&
                    installment.dueDate < new Date().toISOString().slice(0, 10)
                  return (
                    <li key={installment.id} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                      <div>
                        <p className="font-semibold text-ink">
                          قسط {installment.seq} — {money(installment.amount)}
                        </p>
                        <p className={`text-[11.5px] ${overdue ? 'font-semibold text-danger' : 'text-muted'}`}>
                          {formatShortDate(installment.dueDate, { digits })}
                          {overdue ? ' — متأخر' : ''}
                        </p>
                      </div>
                      <Badge tone={INSTALLMENT_TONE[installment.status] || 'neutral'}>
                        {installment.status === 'paid' ? 'مدفوع' : installment.status === 'cancelled' ? 'ملغي' : 'مستحق'}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        )}
      </div>

      <VoidInvoiceModal
        open={voidOpen}
        onClose={() => setVoidOpen(false)}
        onConfirm={handleVoid}
        number={invoice.number}
      />

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        direction={isSale ? 'in' : 'out'}
        presetPartyId={partyId}
        presetInvoiceId={invoice.id}
        presetAmount={minorToInput(remaining)}
      />
    </div>
  )
}
