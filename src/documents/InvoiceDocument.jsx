/**
 * Printable A4 invoice (M13). Rendered from React with print CSS rather than
 * written into a PDF library, so the Arabic shaping stays correct.
 */
import { useSettings } from '../app/SettingsContext'
import { BrandMark } from '../components/BrandMark'
import { formatShortDate } from '../lib/dates'
import { formatQuantity } from '../lib/money'

export function InvoiceDocument({ kind, invoice, lines = [], party }) {
  const { money, moneyPlain, digits, settings } = useSettings()
  const isSale = kind === 'sale'
  const profile = settings?.profile || {}
  const title = isSale ? 'فاتورة بيع' : 'فاتورة شراء'
  const partyLabel = isSale ? 'العميل' : 'المورد'
  const remaining = Math.max(0, (invoice.total || 0) - (invoice.paid || 0))

  return (
    <article className="paper print-page rounded-2xl border border-line bg-white p-6 text-ink sm:p-8" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          {profile.logoDataUrl ? (
            <img src={profile.logoDataUrl} alt="" className="h-14 w-14 rounded-xl border border-line object-contain" />
          ) : (
            <BrandMark size={52} />
          )}
          <div>
            <p className="text-[19px] font-bold leading-7">{profile.shopName || 'نظام المعرض'}</p>
            {profile.phone && <p className="text-[12.5px] text-muted" dir="ltr">{profile.phone}</p>}
            {profile.address && <p className="text-[12.5px] text-muted">{profile.address}</p>}
          </div>
        </div>

        <div className="text-start sm:text-end">
          <p className="text-[15px] font-bold text-walnut">{title}</p>
          <p className="tabular text-[20px] font-bold" dir="ltr">{invoice.number}</p>
          <p className="text-[12.5px] text-muted">التاريخ: {formatShortDate(invoice.date, { digits })}</p>
          {invoice.voidedAt && <p className="mt-1 text-[12.5px] font-bold text-danger">ملغاة — {invoice.voidReason}</p>}
        </div>
      </header>

      <section className="mt-5 rounded-xl bg-canvas px-4 py-3">
        <p className="text-[11.5px] font-semibold text-muted">{partyLabel}</p>
        <p className="text-[15px] font-bold">{party?.name || invoice[isSale ? 'customerName' : 'supplierName'] || '—'}</p>
        {party?.phone && <p className="text-[12.5px] text-muted" dir="ltr">{party.phone}</p>}
        {party?.address && <p className="text-[12.5px] text-muted">{party.address}</p>}
      </section>

      <table className="mt-5 w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-start text-[12px] text-muted">
            <th className="py-2 text-start font-semibold">#</th>
            <th className="py-2 text-start font-semibold">الصنف</th>
            <th className="py-2 text-center font-semibold">الكمية</th>
            <th className="py-2 text-center font-semibold">السعر</th>
            <th className="py-2 text-end font-semibold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id || index} className="border-b border-line/70">
              <td className="tabular py-2 text-muted">{index + 1}</td>
              <td className="py-2 font-medium">{line.name}</td>
              <td className="tabular py-2 text-center">{formatQuantity(line.qty, { digits })}</td>
              <td className="tabular py-2 text-center">{moneyPlain(line.unitPrice)}</td>
              <td className="tabular py-2 text-end font-semibold">{moneyPlain(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex flex-col gap-2 sm:ms-auto sm:w-72">
        <Row label="الإجمالي" value={money(invoice.subtotal)} />
        {invoice.discount > 0 && <Row label="الخصم" value={`− ${money(invoice.discount)}`} />}
        {invoice.vat > 0 && (
          <Row label={`الضريبة (${invoice.vatRate}%)`} value={money(invoice.vat)} />
        )}
        <div className="flex items-center justify-between border-t border-line pt-2">
          <span className="text-[13.5px] font-bold">الصافي</span>
          <span className="tabular text-[17px] font-bold">{money(invoice.total)}</span>
        </div>
        <Row label="المدفوع" value={money(invoice.paid)} />
        {remaining > 0 && <Row label="المتبقي" value={money(remaining)} strong />}
      </div>

      {invoice.notes && (
        <p className="mt-5 rounded-xl border border-line px-4 py-3 text-[12.5px] leading-6 text-muted">
          ملاحظات: {invoice.notes}
        </p>
      )}

      {profile.footerNote && (
        <p className="mt-6 border-t border-line pt-3 text-center text-[11.5px] leading-6 text-muted">
          {profile.footerNote}
        </p>
      )}
    </article>
  )
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className={strong ? 'font-bold text-danger' : 'text-muted'}>{label}</span>
      <span className={`tabular ${strong ? 'font-bold text-danger' : 'font-semibold'}`}>{value}</span>
    </div>
  )
}
