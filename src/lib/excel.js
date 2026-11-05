/**
 * Excel export (M12) via SheetJS. Numbers are written as real numbers in major
 * units so the owner can sum and chart them inside Excel, never as text.
 */
import { fileDateStamp } from './dates'

const MONEY = '#,##0.00'
const QTY = '#,##0.###'

function cellValue(value, type) {
  if (value === null || value === undefined || value === '') return ''
  if (type === 'money') return Math.round(Number(value) || 0) / 100
  if (type === 'qty' || type === 'count') return Number(value) || 0
  return String(value)
}

function columnWidths(columns, rows) {
  return columns.map((column, index) => {
    const longest = rows.reduce(
      (max, row) => Math.max(max, String(row[column.key] ?? '').length),
      String(column.label).length,
    )
    return { wch: Math.min(40, Math.max(12, longest + 2, index === 0 ? 22 : 12)) }
  })
}

async function loadXlsx() {
  const module = await import('xlsx')
  return module.default || module
}

/** Builds one worksheet per report section, plus a summary sheet. */
export async function exportReportToExcel(report, { from = '', to = '' } = {}) {
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  const period = [from, to].filter(Boolean).join(' → ')

  const summaryRows = [
    [report.title],
    ...(period ? [['الفترة', period]] : []),
    [`تم التصدير في ${fileDateStamp()}`],
    [],
    ...(report.summary || []).map((item) => [
      item.label,
      item.type === 'money' ? Math.round(item.value || 0) / 100 : item.value,
    ]),
  ]
  if (report.note) summaryRows.push([], [report.note])

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 34 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص')

  const used = new Set(['الملخص'])
  report.sections.forEach((section, index) => {
    const header = section.columns.map((column) => column.label)
    const rows = (section.rows || []).map((row) =>
      section.columns.map((column) => cellValue(row[column.key], column.type)),
    )

    const totals = section.totals
      ? section.columns.map((column) => {
          if (column.type !== 'money' && column.type !== 'qty' && column.type !== 'count') {
            return column === section.columns[0] ? 'الإجمالي' : ''
          }
          const value = (section.rows || []).reduce((total, row) => total + (Number(row[column.key]) || 0), 0)
          return cellValue(value, column.type)
        })
      : null

    const aoa = [
      [section.title || report.title],
      [],
      header,
      ...rows,
      ...(totals ? [totals] : []),
    ]
    const sheet = XLSX.utils.aoa_to_sheet(aoa)
    sheet['!cols'] = columnWidths(section.columns, section.rows || [])

    // Number formats on the data rows (Excel treats them as real numbers).
    const firstDataRow = 3
    ;(section.rows || []).forEach((row, rowIndex) => {
      section.columns.forEach((column, columnIndex) => {
        const address = XLSX.utils.encode_cell({ r: firstDataRow + rowIndex, c: columnIndex })
        const cell = sheet[address]
        if (!cell || typeof cell.v !== 'number') return
        if (column.type === 'money') cell.z = MONEY
        if (column.type === 'qty' || column.type === 'count') cell.z = QTY
      })
    })

    let name = (section.title || `قسم ${index + 1}`).replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 28)
    if (!name || used.has(name)) name = `قسم ${index + 1}`
    used.add(name)
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  })

  XLSX.writeFile(workbook, `${report.filename || 'report'}-${fileDateStamp()}.xlsx`)
}
