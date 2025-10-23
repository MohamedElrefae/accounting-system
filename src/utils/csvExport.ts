export function toCsv(rows: Array<Record<string, any>>): string {
  if (!rows || rows.length === 0) return ''
  const headersSet = new Set<string>()
  rows.forEach(r => Object.keys(r || {}).forEach(k => headersSet.add(k)))
  const headers = Array.from(headersSet)
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    // Escape quotes by doubling them; wrap in quotes if contains comma, quote, or newline
    const needsQuotes = /[",\n]/.test(s)
    const inner = s.replace(/"/g, '""')
    return needsQuotes ? `"${inner}"` : inner
  }
  const lines = rows.map(r => headers.map(h => esc(r?.[h])) .join(','))
  return [headers.join(','), ...lines].join('\n')
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Builds a multi-section CSV summarizing a server-side ValidationReport
// Structure:
// Section,Key,Value (for totals)
// ByAccount,account_id,total
// ByProject,project_id,total
// ByCostCenter,cost_center_id,total
// ActiveRule,id,rule_code,name_en,severity,active
export function validationReportToCsv(report: any): string {
  const rows: Array<Record<string, any>> = []
  if (!report) return ''
  if (report.totals) {
    rows.push({ Section: 'Totals', Key: 'count', Value: report.totals.count })
    rows.push({ Section: 'Totals', Key: 'sum', Value: report.totals.sum })
  }
  if (Array.isArray(report.by_account)) {
    for (const r of report.by_account) rows.push({ Section: 'ByAccount', account_id: r.account_id, total: r.total })
  }
  if (Array.isArray(report.by_project)) {
    for (const r of report.by_project) rows.push({ Section: 'ByProject', project_id: r.project_id, total: r.total })
  }
  if (Array.isArray(report.by_cost_center)) {
    for (const r of report.by_cost_center) rows.push({ Section: 'ByCostCenter', cost_center_id: r.cost_center_id, total: r.total })
  }
  if (Array.isArray(report.active_rules)) {
    for (const r of report.active_rules) rows.push({ Section: 'ActiveRule', id: r.id, rule_code: r.rule_code, name_en: r.name_en, name_ar: r.name_ar ?? '', severity: r.severity, active: r.active })
  }
  return toCsv(rows)
}
