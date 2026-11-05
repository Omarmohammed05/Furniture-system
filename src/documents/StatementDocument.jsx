/**
 * Printable A4 account statement (M9): date, document, debit, credit and a
 * running balance, with the opening and closing balance highlighted.
 */
import { useSettings } from '../app/SettingsContext'
import { BrandMark } from '../components/BrandMark'
import { formatShortDate } from '../lib/dates'

export function StatementDocument({ statement }) {
  const { money, digits, settings } = useSettings()
  const profile = settings?.profile || {}
  const isCustomer = statement.isCustomer
  const title = isCustomer ? 'كشف حساب عميل' : 'كشف حساب مورد'
  const period = `${statement.from ? formatShortDate(statement.from, { digits }) : 'البداية'} — ${
    statement.to ? formatShortDate(statement.to, { digits }) : 'اليوم'
  }`

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
            {profile.phone && (
              <p className="text-[12.5px] text-muted" dir="ltr">
                {profile.phone}
              </p>
            )}
          </div>
        </div>

        <div className="text-start sm:text-end">
          <p className="text-[15px] font-bold text-walnut">{title}</p>
          <p className="text-[12.5px] text-muted">{period}</p>
        </div>
      </header>

      <section className="mt-5 rounded-xl bg-canvas px-4 py-3">
        <p className="text-[11.5px] font-semibold text-muted">{isCustomer ? 'العميل' : 'المورد'}</p>
        <p className="text-[15px] font-bold">{statement.party.name}</p>
        {statement.party.phone && (
          <p className="text-[12.5px] text-muted" dir="ltr">
            {statement.party.phone}
          </p>
        )}
        {statement.party.address && <p className="text-[12.5px] text-muted">{statement.party.address}</p>}
      </section>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-[13px]">
        <span className="font-semibold text-muted">الرصيد الافتتاحي</span>
        <span className="tabular font-bold">{money(statement.opening)}</span>
      </div>

      <table className="mt-4 w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-[12px] text-muted">
            <th className="py-2 text-start font-semibold">التاريخ</th>
            <th className="py-2 text-start font-semibold">المستند</th>
            <th className="py-2 text-center font-semibold">مدين</th>
            <th className="py-2 text-center font-semibold">دائن</th>
            <th className="py-2 text-end font-semibold">الرصيد</th>
          </tr>
        </thead>
        <tbody>
          {statement.rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-[13px] text-muted">
                لا توجد حركات في هذه الفترة.
              </td>
            </tr>
          ) : (
            statement.rows.map((row) => (
              <tr key={`${row.kind}-${row.id}`} className="border-b border-line/70">
                <td className="tabular py-2">{formatShortDate(row.date, { digits })}</td>
                <td className="py-2">
                  <span className="font-medium">{row.label}</span>
                  {row.number && (
                    <span className="tabular text-muted" dir="ltr">
                      {' '}
                      {row.number}
                    </span>
                  )}
                </td>
                <td className="tabular py-2 text-center">{row.debit ? money(row.debit) : '—'}</td>
                <td className="tabular py-2 text-center">{row.credit ? money(row.credit) : '—'}</td>
                <td className="tabular py-2 text-end font-semibold">{money(row.balance)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col gap-2 sm:ms-auto sm:w-80">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">إجمالي المدين</span>
          <span className="tabular font-semibold">{money(statement.totals.debit)}</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">إجمالي الدائن</span>
          <span className="tabular font-semibold">{money(statement.totals.credit)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2">
          <span className="text-[13.5px] font-bold">الرصيد الختامي</span>
          <span className="tabular text-[17px] font-bold">{money(statement.closing)}</span>
        </div>
        <p className="text-[11.5px] text-muted">
          {isCustomer
            ? 'الرصيد الموجب يعني مبلغاً مستحقاً على العميل.'
            : 'الرصيد الموجب يعني مبلغاً مستحقاً للمورد.'}
        </p>
      </div>

      {profile.footerNote && (
        <p className="mt-6 border-t border-line pt-3 text-center text-[11.5px] leading-6 text-muted">
          {profile.footerNote}
        </p>
      )}
    </article>
  )
}
