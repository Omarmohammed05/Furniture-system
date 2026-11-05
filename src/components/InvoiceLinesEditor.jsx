import { Plus, Trash2 } from 'lucide-react'
import { useSettings } from '../app/SettingsContext'
import { minorToInput, formatQuantity } from '../lib/money'
import { Button } from './ui/Button'
import { Field, Input, Select } from './ui/Field'

export function emptyLine() {
  return { itemId: '', qty: '1', unitPrice: '' }
}

/**
 * Editable invoice lines. Prices prefill from the item's default price, and in
 * a sale the available stock is shown next to each line.
 */
export function InvoiceLinesEditor({
  lines,
  items,
  priceField = 'salePrice',
  stock,
  onChange,
  errors = {},
  emptyHint = 'أضف أصنافاً أولاً لتتمكن من إدخال الفاتورة.',
}) {
  const { money, digits } = useSettings()
  const byId = new Map((items || []).map((item) => [item.id, item]))

  const update = (index, patch) => {
    onChange(lines.map((line, position) => (position === index ? { ...line, ...patch } : line)))
  }

  const pickItem = (index, itemId) => {
    const item = byId.get(itemId)
    const current = lines[index]
    const price = item ? minorToInput(item[priceField] || 0) : ''
    update(index, { itemId, unitPrice: current.unitPrice ? current.unitPrice : price })
  }

  const lineTotal = (line) => Math.round((Number(line.qty) || 0) * (Number(String(line.unitPrice).replace(',', '.')) || 0) * 100)

  if (!items || items.length === 0) {
    return (
      <p className="rounded-xl bg-canvas px-4 py-6 text-center text-[13.5px] text-muted">
        {emptyHint}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const item = byId.get(line.itemId)
        const available = stock ? stock.get(line.itemId) : undefined
        const short = available !== undefined && item && Number(line.qty) > available

        return (
          <div key={index} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-12 sm:items-end">
            <div className="sm:col-span-5">
              <Field label={index === 0 ? 'الصنف' : undefined} htmlFor={`line-item-${index}`} error={errors[`line_item_${index}`]}>
                <Select
                  id={`line-item-${index}`}
                  value={line.itemId}
                  onChange={(event) => pickItem(index, event.target.value)}
                >
                  <option value="">اختر الصنف</option>
                  {items.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </Select>
                {item && available !== undefined && (
                  <p className={`mt-1 text-[11.5px] ${short ? 'font-semibold text-danger' : 'text-muted'}`}>
                    المتاح: {formatQuantity(available, { digits })} {short ? '— غير كافٍ' : ''}
                  </p>
                )}
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label={index === 0 ? 'الكمية' : undefined} htmlFor={`line-qty-${index}`} error={errors[`line_qty_${index}`]}>
                <Input
                  id={`line-qty-${index}`}
                  value={line.qty}
                  onChange={(event) => update(index, { qty: event.target.value })}
                  inputMode="decimal"
                  dir="ltr"
                  className="text-center"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label={index === 0 ? 'السعر' : undefined} htmlFor={`line-price-${index}`} error={errors[`line_price_${index}`]}>
                <Input
                  id={`line-price-${index}`}
                  value={line.unitPrice}
                  onChange={(event) => update(index, { unitPrice: event.target.value })}
                  inputMode="decimal"
                  dir="ltr"
                  className="text-center"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-1.5 hidden text-sm font-semibold text-ink sm:block">{index === 0 ? 'الإجمالي' : '\u00a0'}</p>
              <p className="tabular flex h-11 items-center justify-end px-1 text-[13.5px] font-semibold text-ink">
                {money(lineTotal(line))}
              </p>
            </div>

            <div className="sm:col-span-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(lines.filter((_, position) => position !== index))}
                disabled={lines.length === 1}
                aria-label="حذف السطر"
                className="text-muted hover:text-danger"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        )
      })}

      <Button variant="secondary" onClick={() => onChange([...lines, emptyLine()])} className="w-full">
        <Plus size={16} />
        إضافة سطر
      </Button>

      {errors.lines && <p className="text-[13px] font-medium text-danger">{errors.lines}</p>}
    </div>
  )
}
