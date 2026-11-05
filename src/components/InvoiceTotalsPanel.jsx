import { useSettings } from '../app/SettingsContext'

/** Subtotal → discount → VAT → net, mirroring calcInvoiceTotals. */
export function InvoiceTotalsPanel({ totals, paid = 0, children }) {
  const { money } = useSettings()
  const remaining = Math.max(0, (totals?.total || 0) - paid)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[13.5px]">
        <span className="text-muted">إجمالي الأصناف</span>
        <span className="tabular font-semibold text-ink">{money(totals?.subtotal || 0)}</span>
      </div>
      {totals?.discount > 0 && (
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="text-muted">الخصم</span>
          <span className="tabular font-semibold text-ink">− {money(totals.discount)}</span>
        </div>
      )}
      {totals?.vat > 0 && (
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="text-muted">الضريبة ({totals.vatRate}%)</span>
          <span className="tabular font-semibold text-ink">{money(totals.vat)}</span>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-line pt-2">
        <span className="text-[14.5px] font-bold text-ink">الصافي</span>
        <span className="tabular text-[19px] font-bold text-ink">{money(totals?.total || 0)}</span>
      </div>
      {children}
      {paid > 0 && (
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="text-muted">المدفوع</span>
          <span className="tabular font-semibold text-success">{money(paid)}</span>
        </div>
      )}
      {paid > 0 && remaining > 0 && (
        <div className="flex items-center justify-between text-[13.5px]">
          <span className="text-muted">المتبقي</span>
          <span className="tabular font-bold text-danger">{money(remaining)}</span>
        </div>
      )}
    </div>
  )
}
