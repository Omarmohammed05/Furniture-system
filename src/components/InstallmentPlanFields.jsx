import { useMemo } from 'react'
import { useSettings } from '../app/SettingsContext'
import { addDays } from '../lib/dates'
import { buildInstallmentPlan } from '../services/sales'
import { Field, Input, Select } from './ui/Field'

/** Installment plan inputs plus a live preview of the schedule. */
export function InstallmentPlanFields({ value, onChange, remaining }) {
  const { money } = useSettings()
  const plan = useMemo(() => {
    if (!remaining || !Number(value.count)) return []
    return buildInstallmentPlan({
      total: remaining,
      count: Number(value.count),
      firstDue: value.firstDue || addDays(undefined, 30),
      intervalDays: Number(value.intervalDays) || 30,
    })
  }, [remaining, value.count, value.firstDue, value.intervalDays])

  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="عدد الأقساط" htmlFor="plan-count">
          <Input
            id="plan-count"
            value={value.count}
            onChange={(event) => set({ count: event.target.value })}
            inputMode="numeric"
            dir="ltr"
            className="text-center"
          />
        </Field>
        <Field label="أول استحقاق" htmlFor="plan-first">
          <Input
            id="plan-first"
            type="date"
            value={value.firstDue}
            onChange={(event) => set({ firstDue: event.target.value })}
            dir="ltr"
          />
        </Field>
        <Field label="كل (أيام)" htmlFor="plan-interval">
          <Select id="plan-interval" value={value.intervalDays} onChange={(event) => set({ intervalDays: event.target.value })}>
            <option value="7">أسبوع</option>
            <option value="15">نصف شهر</option>
            <option value="30">شهر</option>
            <option value="60">شهران</option>
            <option value="90">٣ أشهر</option>
          </Select>
        </Field>
      </div>

      {plan.length > 0 && (
        <ul className="max-h-44 space-y-1 overflow-y-auto rounded-xl bg-canvas px-3 py-2">
          {plan.map((row) => (
            <li key={row.seq} className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted">
                قسط {row.seq} — {row.dueDate}
              </span>
              <span className="tabular font-semibold text-ink">{money(row.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11.5px] text-muted">
        يُقسَّم المتبقي بعد الدفعة المقدمة على {Number(value.count) || 0} قسط، ويُخصم كل قسط عند استحقاقه.
      </p>
    </div>
  )
}
