/**
 * Payroll (M7): advance payments (سلف), monthly adjustments and pay slips.
 *
 * Rule B12: repayment never exceeds the outstanding advance, and net pay never
 * goes below zero — whatever is left stays outstanding on the advance.
 * A paid slip is locked; a draft slip is refreshed by generatePayroll(month).
 */
import { repository as repo } from '../data/repository'
import { todayIso } from '../lib/dates'
import { fromMinor, toMinor } from '../lib/money'
import { newRecord, touchRecord } from '../lib/records'
import { makeActivity } from './activity'
import { getSettings } from './settings'

export const REPAY_MODES = [
  { value: 'full', label: 'خصم كامل من الراتب القادم' },
  { value: 'monthly', label: 'مبلغ ثابت كل شهر' },
  { value: 'manual', label: 'خصم يدوي في المسير' },
]

export const ADJUSTMENT_TYPES = [
  { value: 'bonus', label: 'مكافأة' },
  { value: 'deduction', label: 'خصم' },
]

export function repayModeLabel(value) {
  return REPAY_MODES.find((mode) => mode.value === value)?.label || REPAY_MODES[1].label
}

export function adjustmentTypeLabel(value) {
  return ADJUSTMENT_TYPES.find((type) => type.value === value)?.label || ''
}

export function advanceRemaining(advance) {
  return Math.max(0, (Number(advance?.amount) || 0) - (Number(advance?.repaid) || 0))
}

function assertMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw new Error('شهر غير صالح')
}

function sum(rows, pick) {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0)
}

/* ---------- advances ---------- */

export function validateAdvance(input) {
  const errors = {}
  if (!input.workerId) errors.workerId = 'اختر العامل'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date || ''))) errors.date = 'تاريخ غير صالح'

  const amount = String(input.amount ?? '').trim()
  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) errors.amount = 'أدخل مبلغاً صحيحاً'

  if (input.repayMode === 'monthly') {
    const monthly = String(input.monthlyAmount ?? '').trim()
    if (monthly && (!Number.isFinite(Number(monthly)) || Number(monthly) <= 0)) {
      errors.monthlyAmount = 'مبلغ غير صالح'
    }
  }

  return errors
}

export async function listAdvances({ workerId = '', includeSettled = false } = {}) {
  const rows = await repo.all('advances')
  return rows
    .filter((row) => (workerId ? row.workerId === workerId : true))
    .filter((row) => (includeSettled ? true : advanceRemaining(row) > 0))
    .map((row) => ({ ...row, remaining: advanceRemaining(row) }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export async function getAdvanceBalance(workerId) {
  const rows = await repo.all('advances')
  return rows
    .filter((row) => row.workerId === workerId)
    .reduce((total, row) => total + advanceRemaining(row), 0)
}

/** One row per worker with what they still owe the shop. */
export async function listAdvanceOverview() {
  const [workers, advances] = await Promise.all([repo.all('workers'), repo.all('advances')])

  return workers
    .filter((worker) => !worker.deletedAt)
    .map((worker) => {
      const own = advances.filter((row) => row.workerId === worker.id)
      return {
        worker,
        outstanding: own.reduce((total, row) => total + advanceRemaining(row), 0),
        repaid: sum(own, (row) => row.repaid),
        openCount: own.filter((row) => advanceRemaining(row) > 0).length,
      }
    })
    .sort(
      (a, b) => b.outstanding - a.outstanding || String(a.worker.name).localeCompare(String(b.worker.name), 'ar'),
    )
}

export async function createAdvance(input) {
  const errors = validateAdvance(input)
  if (Object.keys(errors).length) {
    const error = new Error(Object.values(errors)[0])
    error.errors = errors
    throw error
  }

  const [worker, settings] = await Promise.all([repo.get('workers', input.workerId), getSettings()])
  if (!worker) throw new Error('العامل غير موجود')

  const monthly = input.repayMode === 'monthly' ? toMinor(input.monthlyAmount || 0) : 0
  const record = newRecord(settings.app.deviceId || 'A', {
    workerId: worker.id,
    workerName: worker.name,
    date: input.date || todayIso(),
    amount: toMinor(input.amount),
    repaid: 0,
    settleAt: null,
    repayMode: input.repayMode || 'monthly',
    monthlyAmount: monthly,
    note: String(input.note || '').trim(),
  })

  await repo.transaction('rw', ['advances', 'activity_log'], async () => {
    await repo.put('advances', record)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'payroll.advance',
        entity: 'advances',
        entityId: record.id,
        note: `سلفة ${fromMinor(record.amount).toFixed(2)} للعامل «${worker.name}»`,
        deviceId: record.deviceId,
      }),
    )
  })
  return record
}

/* ---------- monthly adjustments ---------- */

export async function listAdjustments({ month = '', workerId = '' } = {}) {
  const rows = await repo.all('payroll_adjustments')
  return rows
    .filter((row) => (month ? row.month === month : true))
    .filter((row) => (workerId ? row.workerId === workerId : true))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

export async function addAdjustment({ workerId, month, type = 'bonus', amount, note = '' }) {
  assertMonth(month)
  const value = toMinor(amount)
  if (!workerId) throw new Error('اختر العامل')
  if (!(value > 0)) throw new Error('المبلغ يجب أن يكون أكبر من صفر')

  const [worker, settings] = await Promise.all([repo.get('workers', workerId), getSettings()])
  if (!worker) throw new Error('العامل غير موجود')

  const record = newRecord(settings.app.deviceId || 'A', {
    workerId,
    workerName: worker.name,
    month,
    type: type === 'deduction' ? 'deduction' : 'bonus',
    amount: value,
    note: String(note || '').trim(),
  })

  await repo.transaction('rw', ['payroll_adjustments', 'activity_log'], async () => {
    await repo.put('payroll_adjustments', record)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'payroll.adjustment',
        entity: 'payroll_adjustments',
        entityId: record.id,
        note: `${adjustmentTypeLabel(record.type)} ${fromMinor(value).toFixed(2)} للعامل «${worker.name}» — ${month}`,
        deviceId: record.deviceId,
      }),
    )
  })
  return record
}

export async function removeAdjustment(id) {
  const existing = await repo.get('payroll_adjustments', id)
  if (!existing) throw new Error('التعديل غير موجود')
  await repo.transaction('rw', ['payroll_adjustments', 'activity_log'], async () => {
    await repo.delete('payroll_adjustments', id)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'payroll.adjustment.remove',
        entity: 'payroll_adjustments',
        entityId: id,
        note: `حذف تعديل على راتب «${existing.workerName}» — ${existing.month}`,
        deviceId: existing.deviceId,
      }),
    )
  })
}

/* ---------- pay slips ---------- */

/**
 * How much of one month's pay each open advance may take.
 * 'full' takes everything, 'monthly' takes its fixed amount, 'manual' waits
 * for the owner to type the deduction on the draft slip.
 */
function planRepayment(openAdvances, cap) {
  let left = Math.max(0, cap)
  let repayment = 0

  for (const advance of openAdvances) {
    if (left <= 0) break
    const remaining = advanceRemaining(advance)
    if (remaining <= 0) continue

    let wanted = 0
    if (advance.repayMode === 'full') wanted = remaining
    else if (advance.repayMode === 'monthly') wanted = Number(advance.monthlyAmount) || remaining

    const pay = Math.min(wanted, remaining, left)
    if (pay <= 0) continue
    left -= pay
    repayment += pay
  }

  return repayment
}

export async function listPaySlips(month) {
  const rows = await repo.all('pay_slips')
  return rows
    .filter((row) => row.month === month)
    .sort((a, b) => String(a.workerName).localeCompare(String(b.workerName), 'ar'))
}

export function getPaySlip(id) {
  return repo.get('pay_slips', id)
}

export async function getPayrollSummary(month) {
  const slips = await listPaySlips(month)
  const totals = slips.reduce(
    (acc, slip) => {
      acc.base += slip.baseSalary || 0
      acc.bonuses += slip.bonuses || 0
      acc.deductions += slip.deductions || 0
      acc.advanceRepayment += slip.advanceRepayment || 0
      acc.net += slip.net || 0
      if (slip.status === 'paid') {
        acc.paidCount += 1
        acc.paidNet += slip.net || 0
      } else {
        acc.draftCount += 1
        acc.draftNet += slip.net || 0
      }
      return acc
    },
    { base: 0, bonuses: 0, deductions: 0, advanceRepayment: 0, net: 0, paidNet: 0, draftNet: 0, paidCount: 0, draftCount: 0 },
  )

  return { slips, totals }
}

/** Builds (or refreshes) one draft slip per active worker for a month. */
export async function generatePayroll(month) {
  assertMonth(month)
  const settings = await getSettings()
  const [workers, slips, adjustments, advances] = await Promise.all([
    repo.all('workers'),
    repo.all('pay_slips'),
    repo.all('payroll_adjustments'),
    repo.all('advances'),
  ])

  const active = workers.filter((worker) => !worker.deletedAt && worker.active !== false)
  let created = 0
  let refreshed = 0
  let skipped = 0

  await repo.transaction('rw', ['pay_slips', 'activity_log'], async () => {
    for (const worker of active) {
      const existing = slips.find((slip) => slip.workerId === worker.id && slip.month === month)
      if (existing?.status === 'paid') {
        skipped += 1
        continue
      }

      const own = adjustments.filter((row) => row.workerId === worker.id && row.month === month)
      const bonuses = sum(own.filter((row) => row.type === 'bonus'), (row) => row.amount)
      const deductions = sum(own.filter((row) => row.type === 'deduction'), (row) => row.amount)
      const baseSalary = Number(worker.monthlySalary) || 0
      const gross = Math.max(0, baseSalary + bonuses - deductions)

      const open = advances
        .filter((row) => row.workerId === worker.id)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      const advanceRepayment = planRepayment(open, gross)
      const net = Math.max(0, gross - advanceRepayment)

      const fields = {
        workerName: worker.name,
        workerPhone: worker.phone || '',
        jobTitle: worker.jobTitle || '',
        baseSalary,
        bonuses,
        deductions,
        advanceRepayment,
        net,
        notes: existing?.notes || '',
      }

      if (existing) {
        await repo.put('pay_slips', touchRecord(existing, fields))
        refreshed += 1
      } else {
        await repo.put(
          'pay_slips',
          newRecord(settings.app.deviceId || 'A', {
            workerId: worker.id,
            month,
            status: 'draft',
            paidAt: null,
            method: null,
            ...fields,
          }),
        )
        created += 1
      }
    }

    await repo.put(
      'activity_log',
      makeActivity({
        action: 'payroll.generate',
        entity: 'pay_slips',
        note: `تجهيز مسير رواتب ${month} — ${created + refreshed} قسيمة`,
        deviceId: settings.app.deviceId || 'A',
      }),
    )
  })

  return { created, refreshed, skipped }
}

/** Draft-only edit: the manual advance deduction and the slip note. */
export async function updatePaySlip(id, patch = {}) {
  const slip = await repo.get('pay_slips', id)
  if (!slip) throw new Error('قسيمة الراتب غير موجودة')
  if (slip.status === 'paid') throw new Error('الراتب مصروف ولا يمكن تعديله')

  const outstanding = await getAdvanceBalance(slip.workerId)
  const requested =
    patch.advanceRepayment === undefined ? Number(slip.advanceRepayment) || 0 : toMinor(patch.advanceRepayment)
  const advanceRepayment = Math.min(Math.max(0, requested), outstanding)
  const gross = Math.max(0, (slip.baseSalary || 0) + (slip.bonuses || 0) - (slip.deductions || 0))

  const updated = touchRecord(slip, {
    advanceRepayment,
    net: Math.max(0, gross - advanceRepayment),
    notes: patch.notes === undefined ? slip.notes : String(patch.notes).trim(),
  })

  await repo.transaction('rw', ['pay_slips'], async () => {
    await repo.put('pay_slips', updated)
  })
  return updated
}

/** Pays a slip and takes the planned amount off the oldest open advances. */
export async function markPaySlipPaid(id, { method = 'cash', date } = {}) {
  const slip = await repo.get('pay_slips', id)
  if (!slip) throw new Error('قسيمة الراتب غير موجودة')
  if (slip.status === 'paid') throw new Error('الراتب مصروف بالفعل')

  const paidAt = date || todayIso()
  let paid = null

  await repo.transaction('rw', ['pay_slips', 'advances', 'activity_log'], async () => {
    let left = Number(slip.advanceRepayment) || 0
    const open = (await repo.all('advances'))
      .filter((row) => row.workerId === slip.workerId)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))

    const touched = []
    for (const advance of open) {
      if (left <= 0) break
      const remaining = advanceRemaining(advance)
      if (remaining <= 0) continue
      const pay = Math.min(remaining, left)
      left -= pay
      const repaid = (Number(advance.repaid) || 0) + pay
      touched.push(touchRecord(advance, { repaid, settleAt: repaid >= advance.amount ? paidAt : null }))
    }
    if (touched.length) await repo.bulkPut('advances', touched)

    paid = touchRecord(slip, {
      status: 'paid',
      paidAt,
      method,
      advanceRepayment: (Number(slip.advanceRepayment) || 0) - left,
    })
    await repo.put('pay_slips', paid)
    await repo.put(
      'activity_log',
      makeActivity({
        action: 'payroll.paid',
        entity: 'pay_slips',
        entityId: slip.id,
        note: `صرف راتب «${slip.workerName}» لشهر ${slip.month}`,
        deviceId: slip.deviceId,
      }),
    )
  })

  return paid
}
