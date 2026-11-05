/**
 * Printable A4 pay slip (M13). Same approach as the invoice: React + print CSS
 * so the Arabic shaping always stays correct.
 */
import { useSettings } from '../app/SettingsContext'
import { BrandMark } from '../components/BrandMark'
import { formatMonth, formatShortDate } from '../lib/dates'
import { methodLabel } from '../services/payments'

export function PayslipDocument({ slip, worker }) {
  const { money, digits, settings } = useSettings()
  const profile = settings?.profile || {}
  const paid = slip.status === 'paid'

  return (
    <article className="print-page rounded-2xl border border-line bg-white p-6 text-ink sm:p-8" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          {profile.logoDataUrl ? (
            <img src={profile.logoDataUrl} alt="" className="h-14 w-14 rounded-xl border border-line object-contain" />
          ) : (
            <BrandMark size={52} />
          )}
          <div>
            <p className="text-[19px] font-bold leading-7">{profile.shopName || 'نظام المعرض'}</p>
            {profile.phone && (
              <p className="text-[12.5px] text-muted" dir="ltr">
                {profile.phone}
              </p>
            )}
            {profile.address && <p className="text-[12.5px] text-muted">{profile.address}</p>}
          </div>
        </div>

        <div className="text-start sm:text-end">
          <p className="text-[15px] font-bold text-walnut">قسيمة راتب</p>
          <p className="text-[17px] font-bold">{formatMonth(slip.month, { digits })}</p>
          <p className={`text-[12.5px] font-semibold ${paid ? 'text-success' : 'text-warn'}`}>
            {paid ? `مصروف — ${formatShortDate(slip.paidAt, { digits })}` : 'مسودة لم تُصرف'}
          </p>
        </div>
      </header>

      <section className="mt-5 rounded-xl bg-canvas px-4 py-3">
        <p className="text-[11.5px] font-semibold text-muted">العامل</p>
        <p className="text-[15px] font-bold">{slip.workerName || '—'}</p>
        {slip.jobTitle && <p className="text-[12.5px] text-muted">{slip.jobTitle}</p>}
        {(worker?.phone || slip.workerPhone) && (
          <p className="text-[12.5px] text-muted" dir="ltr">
            {worker?.phone || slip.workerPhone}
          </p>
        )}
      </section>

      <div className="mt-5 space-y-2">
        <Row label="المرتب الأساسي" value={money(slip.baseSalary)} />
        {slip.bonuses > 0 && <Row label="مكافآت" value={`+ ${money(slip.bonuses)}`} />}
        {slip.deductions > 0 && <Row label="خصومات" value={`− ${money(slip.deductions)}`} />}
        {slip.advanceRepayment > 0 && <Row label="خصم سلفة" value={`− ${money(slip.advanceRepayment)}`} />}
        <div className="flex items-center justify-between border-t border-line pt-2">
          <span className="text-[13.5px] font-bold">الصافي المستحق</span>
          <span className="tabular text-[19px] font-bold">{money(slip.net)}</span>
        </div>
        {paid && <Row label="طريقة الصرف" value={methodLabel(slip.method)} />}
      </div>

      {slip.notes && (
        <p className="mt-5 rounded-xl border border-line px-4 py-3 text-[12.5px] leading-6 text-muted">
          ملاحظات: {slip.notes}
        </p>
      )}

      <div className="mt-10 grid grid-cols-2 gap-8 text-[12px] text-muted">
        <div>
          <p className="border-t border-line pt-2 text-center">توقيع العامل</p>
        </div>
        <div>
          <p className="border-t border-line pt-2 text-center">توقيع الإدارة</p>
        </div>
      </div>

      {profile.footerNote && (
        <p className="mt-6 border-t border-line pt-3 text-center text-[11.5px] leading-6 text-muted">
          {profile.footerNote}
        </p>
      )}
    </article>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="tabular font-semibold">{value}</span>
    </div>
  )
}
