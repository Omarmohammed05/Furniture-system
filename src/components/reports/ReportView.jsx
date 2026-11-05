/**
 * Printable report (M10/M13). One component renders every report shape, so the
 * screen, the A4 print and the Excel export always agree.
 */
import { useSettings } from '../../app/SettingsContext'
import { formatMonth, formatShortDate } from '../../lib/dates'
import { formatNumber } from '../../lib/digits'
import { formatQuantity } from '../../lib/money'
import { BrandMark } from '../BrandMark'
import { Badge } from '../ui/Badge'

function formatCell(value, type, formatters) {
  if (value === null || value === undefined || value === '') return '—'
  if (type === 'money') return formatters.money(value)
  if (type === 'qty') return formatters.quantity(value)
  if (type === 'count') return formatters.number(value)
  if (type === 'date') return formatters.date(value)
  if (type === 'month') return formatMonth(value, { digits: formatters.digits })
  return String(value)
}

function totalsOf(section) {
  const totals = {}
  for (const column of section.columns) {
    if (column.type === 'money' || column.type === 'qty' || column.type === 'count') {
      totals[column.key] = (section.rows || []).reduce((sum, row) => sum + (Number(row[column.key]) || 0), 0)
    }
  }
  return totals
}

function ReportSection({ section, formatters }) {
  const totals = section.totals ? totalsOf(section) : null

  return (
    <section className="mt-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-bold text-ink">{section.title}</h3>
        <span className="text-[11.5px] text-muted">{(section.rows || []).length} سطر</span>
      </div>
      {section.note && <p className="mb-2 text-[12px] leading-5 text-muted">{section.note}</p>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-[11.5px] text-muted">
              {section.columns.map((column) => (
                <th key={column.key} className="px-2 py-2 text-start font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(section.rows || []).length === 0 ? (
              <tr>
                <td colSpan={section.columns.length} className="px-2 py-6 text-center text-[13px] text-muted">
                  لا توجد بيانات في هذه الفترة.
                </td>
              </tr>
            ) : (
              section.rows.map((row, index) => (
                <tr key={row.id || row.key || index} className="border-b border-line/70">
                  {section.columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-2 py-1.5 ${
                        column.type === 'money' || column.type === 'qty' || column.type === 'count'
                          ? 'tabular whitespace-nowrap font-medium'
                          : 'text-ink'
                      }`}
                    >
                      {formatCell(row[column.key], column.type, formatters)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {totals && (section.rows || []).length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-line bg-canvas/40 font-bold">
                {section.columns.map((column, index) => (
                  <td key={column.key} className="tabular px-2 py-2 whitespace-nowrap">
                    {index === 0 ? 'الإجمالي' : formatsTotal(totals, column, formatters)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  )
}

function formatsTotal(totals, column, formatters) {
  if (!(column.key in totals)) return ''
  return formatCell(totals[column.key], column.type, formatters)
}

export function ReportView({ report, periodLabel }) {
  const { settings, digits, money } = useSettings()
  const profile = settings?.profile || {}
  const formatters = {
    money,
    digits,
    quantity: (value) => formatQuantity(value, { digits }),
    number: (value) => formatNumber(value, { digits }),
    date: (value) => formatShortDate(value, { digits }),
  }

  return (
    <article className="print-page rounded-2xl border border-line bg-white p-5 text-ink sm:p-7" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          {profile.logoDataUrl ? (
            <img src={profile.logoDataUrl} alt="" className="h-12 w-12 rounded-xl border border-line object-contain" />
          ) : (
            <BrandMark size={44} />
          )}
          <div>
            <p className="text-[17px] font-bold leading-6">{profile.shopName || 'نظام المعرض'}</p>
            {profile.phone && (
              <p className="text-[12px] text-muted" dir="ltr">
                {profile.phone}
              </p>
            )}
          </div>
        </div>

        <div className="text-start sm:text-end">
          <div className="flex items-center gap-2 sm:justify-end">
            <p className="text-[16px] font-bold text-walnut">{report.title}</p>
            {report.estimated && <Badge tone="warn">تقديري</Badge>}
          </div>
          <p className="text-[12px] text-muted">{periodLabel || 'كل الفترات'}</p>
        </div>
      </header>

      {report.summary?.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {report.summary.map((item) => (
            <div key={item.label} className="rounded-xl bg-canvas px-3 py-2.5">
              <p className="text-[11.5px] font-semibold text-muted">{item.label}</p>
              <p className="tabular mt-0.5 text-[15px] font-bold text-ink">
                {formatCell(item.value, item.type === 'money' ? 'money' : 'count', formatters)}
              </p>
            </div>
          ))}
        </div>
      )}

      {report.note && (
        <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[12px] leading-6 text-[#93370d]">{report.note}</p>
      )}

      {report.sections.map((section, index) => (
        <ReportSection key={section.title || index} section={section} formatters={formatters} />
      ))}

      <footer className="mt-6 border-t border-line pt-3 text-[11px] text-muted">
        صادر من {profile.shopName || 'نظام المعرض'} — {formatShortDate(new Date().toISOString(), { digits })}
      </footer>
    </article>
  )
}
