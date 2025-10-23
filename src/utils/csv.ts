export type OpeningBalanceRow = {
  account_code: string
  amount: number
  cost_center_code?: string
  project_code?: string
  currency_code?: string
}

export type OpeningBalanceClientValidation = {
  ok: boolean
  errors: { code: string; message: string; rowIndex: number }[]
  warnings: { code: string; message: string; rowIndex: number }[]
  totals: { count: number; sum: number; balanced?: boolean }
}

export type OpeningBalanceMapping = {
  account_code?: string
  amount?: string
  opening_balance_debit?: string
  opening_balance_credit?: string
  cost_center_code?: string
  project_code?: string
  currency_code?: string
}

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

export function guessOpeningBalanceMapping(headers: string[]): OpeningBalanceMapping {
  const inHeaders = (patterns: RegExp[]) => headers.find(h => patterns.some(p => p.test(h)))
  const acc = inHeaders([/acc|account|code/i, /الحساب|رمز/i])
  const debit = inHeaders([/^(opening_)?balance.*debit$/i, /^(debit|dr)$/i, /مدين/i])
  const credit = inHeaders([/^(opening_)?balance.*credit$/i, /^(credit|cr)$/i, /دائن/i])
  const amt = inHeaders([/amount|balance|value/i, /المبلغ|رصيد/i])
  const cc = inHeaders([/(^cc$)|cost.*center/i, /مركز.*تكلفة/i])
  const prj = inHeaders([/project/i, /مشروع/i])
  const cur = inHeaders([/currency/i, /العملة|عملة/i])
  return {
    account_code: acc || headers[0],
    // Prefer explicit debit/credit if present; keep amount as fallback
    opening_balance_debit: debit || undefined,
    opening_balance_credit: credit || undefined,
    amount: amt || headers[1],
    cost_center_code: cc || undefined,
    project_code: prj || undefined,
    currency_code: cur || undefined,
  }
}

export function normalizeOpeningBalanceRows(raw: any[], mapping: OpeningBalanceMapping): OpeningBalanceRow[] {
  const map = (name?: string) => (name || '').trim()
  return raw.map((r) => {
    const accKey = map(mapping.account_code)
    const amtKey = map(mapping.amount)
    const debitKey = map(mapping.opening_balance_debit)
    const creditKey = map(mapping.opening_balance_credit)
    const ccKey = map(mapping.cost_center_code)
    const prjKey = map(mapping.project_code)
    const curKey = map(mapping.currency_code)

    // Compute amount: prefer debit/credit when provided; both non-negative
    const debitVal = debitKey ? Number(r[debitKey] ?? '') : NaN
    const creditVal = creditKey ? Number(r[creditKey] ?? '') : NaN
    const debit = Number.isFinite(debitVal) && debitVal >= 0 ? debitVal : NaN
    const credit = Number.isFinite(creditVal) && creditVal >= 0 ? creditVal : NaN

    let amount: number
    if (Number.isFinite(debit) || Number.isFinite(credit)) {
      const d = Number.isFinite(debit) ? debit : 0
      const c = Number.isFinite(credit) ? credit : 0
      amount = d - c
    } else {
      const amt = amtKey ? Number(r[amtKey] ?? '') : NaN
      amount = Number.isFinite(amt) ? amt : NaN
    }

    return {
      account_code: String(accKey ? r[accKey] ?? '' : ''),
      amount,
      cost_center_code: ccKey ? (r[ccKey] as any) ?? undefined : undefined,
      project_code: prjKey ? (r[prjKey] as any) ?? undefined : undefined,
      currency_code: curKey ? (r[curKey] as any) ?? undefined : undefined,
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
    if (typeof r.amount === 'number' && r.amount < 0) warnings.push({ code: 'W_NEGATIVE', message: 'Negative amount interpreted as credit', rowIndex: i })
  })
  const balanced = Math.round(sum * 100) === 0
  return { ok: errors.length === 0, errors, warnings, totals: { count: rows.length, sum, balanced } }
}

export function parseCsv(text: string): any[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length === 0) return []
  const parseLine = (line: string) => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i=0;i<line.length;i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue }
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        out.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out
  }
  const headers = parseLine(lines[0]).map(h => h.trim())
  const rows = lines.slice(1).map(l => parseLine(l)).map(cols => {
    const obj: any = {}
    headers.forEach((h, i) => { obj[h] = cols[i] ?? null })
    return obj
  })
  return rows
}

export function countMapped(mapping: OpeningBalanceMapping): number {
  return ['account_code','amount','opening_balance_debit','opening_balance_credit','cost_center_code','project_code','currency_code']
    .reduce((n, k) => n + ((mapping as any)[k] ? 1 : 0), 0)
}
