export function issuesToCsv(rows: Array<{ code: string; message: string; row?: Record<string, unknown> }>): string {
  const header = ['code', 'message', 'row']
  const lines = rows.map(r => {
    const code = JSON.stringify(r.code ?? '')
    const message = JSON.stringify(r.message ?? '')
    const row = JSON.stringify(r.row ?? {})
    return [code, message, row].join(',')
  })
  return [header.join(','), ...lines].join('\n')
}

export function reconciliationToCsv(rec: { glTotal: number; openingTotal: number; difference: number }): string {
  const header = ['metric', 'value']
  const rows = [
    ['gl_total', String(rec.glTotal ?? 0)],
    ['opening_total', String(rec.openingTotal ?? 0)],
    ['difference', String(rec.difference ?? 0)],
  ]
  return [header.join(','), ...rows.map(r => r.join(','))].join('\n')
}
