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

export type OpeningBalanceRow = {
  account_code: string
  amount: number
  cost_center_code?: string
  project_code?: string
}

export type OpeningBalanceClientValidation = {
  ok: boolean
  errors: { code: string; message: string; rowIndex: number }[]
  warnings: { code: string; message: string; rowIndex: number }[]
  totals: { count: number; sum: number }
}

export type OpeningBalanceMapping = {
  account_code?: string
  amount?: string
  cost_center_code?: string
  project_code?: string
}

export function normalizeOpeningBalanceRows(raw: any[], mapping: OpeningBalanceMapping): OpeningBalanceRow[] {
  const map = (name?: string) => (name || '').trim()
  return raw.map((r) => {
    const accKey = map(mapping.account_code)
    const amtKey = map(mapping.amount)
    const ccKey = map(mapping.cost_center_code)
    const prjKey = map(mapping.project_code)
    return {
      account_code: String(accKey ? r[accKey] ?? '' : ''),
      amount: Number(amtKey ? r[amtKey] ?? 0 : 0),
      cost_center_code: ccKey ? (r[ccKey] as any) ?? undefined : undefined,
      project_code: prjKey ? (r[prjKey] as any) ?? undefined : undefined,
    }
  })
}

export function validateOpeningBalanceRows(rows: OpeningBalanceRow[]): OpeningBalanceClientValidation {
  const errors: OpeningBalanceClientValidation['errors'] = []
  const warnings: OpeningBalanceClientValidation['warnings'] = []
  let sum = 0
  rows.forEach((r, i) => {
    if (!r.account_code) errors.push({ code: 'E_ACC_CODE', message: 'Missing account_code', rowIndex: i })
    if (typeof r.amount !== 'number' || Number.isNaN(r.amount)) errors.push({ code: 'E_AMOUNT', message: 'Invalid amount', rowIndex: i })
    if (typeof r.amount === 'number') sum += r.amount || 0
    if (r.amount === 0) warnings.push({ code: 'W_ZERO', message: 'Zero amount', rowIndex: i })
  })
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    totals: { count: rows.length, sum }
  }
}
