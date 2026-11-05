import { useEffect, useRef, useState } from 'react'
import { Download, FileText, MessageCircle, Printer } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { useToast } from '../app/ToastContext'
import { useLive } from '../hooks/useLive'
import { StatementDocument } from '../documents/StatementDocument'
import { formatShortDate } from '../lib/dates'
import { exportRowsToExcel } from '../lib/excel'
import { openWhatsApp, statementShareText } from '../lib/whatsapp'
import { listParties } from '../services/parties'
import { getStatement } from '../services/statements'
import { DocumentExportButtons } from '../components/DocumentExportButtons'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'

export function StatementPage() {
  const { settings, digits } = useSettings()
  const toast = useToast()

  const [kind, setKind] = useState('customers')
  const [partyId, setPartyId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const docRef = useRef(null)

  const parties = useLive(() => listParties(kind), [kind])
  const statement = useLive(
    () => (partyId ? getStatement(kind, partyId, { from, to }) : null),
    [kind, partyId, from, to],
  )

  useEffect(() => {
    setPartyId('')
  }, [kind])

  const share = () => {
    if (!statement) return
    openWhatsApp({
      phone: statement.party.phone || '',
      text: statementShareText({
        shopName: settings?.profile?.shopName || '',
        title: statement.isCustomer ? 'كشف حساب عميل' : 'كشف حساب مورد',
        partyName: statement.party.name,
        from,
        to,
        opening: statement.opening,
        closing: statement.closing,
        currency: settings?.currency?.label || 'ج.م',
      }),
    })
  }

  const exportExcel = () => {
    if (!statement) return
    exportRowsToExcel({
      filename: 'statement',
      sheetName: 'كشف حساب',
      title: statement.isCustomer ? 'كشف حساب عميل' : 'كشف حساب مورد',
      summary: [
        { label: 'الحساب', value: statement.party.name, type: 'text' },
        { label: 'الرصيد الافتتاحي', value: statement.opening, type: 'money' },
        { label: 'الرصيد الختامي', value: statement.closing, type: 'money' },
      ],
      columns: [
        { key: 'date', label: 'التاريخ', type: 'text' },
        { key: 'label', label: 'البيان', type: 'text' },
        { key: 'number', label: 'المستند', type: 'text' },
        { key: 'debit', label: 'مدين', type: 'money' },
        { key: 'credit', label: 'دائن', type: 'money' },
        { key: 'balance', label: 'الرصيد', type: 'money' },
      ],
      rows: [
        { date: from || '', label: 'رصيد افتتاحي', number: '', debit: 0, credit: 0, balance: statement.opening },
        ...statement.rows.map((row) => ({
          date: row.date,
          label: row.label,
          number: row.number || '',
          debit: row.debit,
          credit: row.credit,
          balance: row.balance,
        })),
      ],
    }).catch(() => toast.error('تعذر تصدير الملف'))
  }

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="كشوف الحساب"
          description="كل فاتورة ودفعة مرتبة بالتاريخ مع الرصيد الجاري."
          actions={
            statement && (
              <>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer size={16} />
                  طباعة
                </Button>
                <Button variant="secondary" onClick={share}>
                  <MessageCircle size={16} />
                  واتساب
                </Button>
                <Button variant="secondary" onClick={exportExcel}>
                  <Download size={16} />
                  Excel
                </Button>
                <DocumentExportButtons getNode={() => docRef.current} name="statement" />
              </>
            )
          }
        />

        <div className="mb-4 grid gap-2.5 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="نوع الحساب">
            <option value="customers">العملاء</option>
            <option value="suppliers">الموردون</option>
          </Select>
          <Select value={partyId} onChange={(event) => setPartyId(event.target.value)} aria-label="الحساب">
            <option value="">اختر {kind === 'customers' ? 'العميل' : 'المورد'}</option>
            {(parties || [])
              .filter((party) => !party.isWalkIn)
              .map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name}
                </option>
              ))}
          </Select>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="من تاريخ" />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="إلى تاريخ" />
        </div>
      </div>

      {!partyId ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="اختر حساباً لعرض الكشف"
            description="حدد العميل أو المورد، وأضف فترة إن أردت — بدونها يظهر كل التاريخ."
          />
        </Card>
      ) : statement === undefined ? (
        <div className="h-96 animate-pulse rounded-2xl bg-canvas" />
      ) : statement === null ? (
        <Card>
          <EmptyState icon={FileText} title="الحساب غير موجود" description="ربما تمت أرشفته." />
        </Card>
      ) : (
        <>
          <div ref={docRef} className="bg-white">
            <StatementDocument statement={statement} />
          </div>
          <p className="no-print mt-3 px-1 text-[12px] leading-6 text-muted">
            الفترة: {from ? formatShortDate(from, { digits }) : 'البداية'} —{' '}
            {to ? formatShortDate(to, { digits }) : 'اليوم'} • {statement.totals.movements} حركة
          </p>
        </>
      )}
    </div>
  )
}
