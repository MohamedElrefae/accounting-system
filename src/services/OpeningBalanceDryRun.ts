// Client-side dry-run simulator for Opening Balance Import
// This does NOT call any backend or SQL; used for preview only.

import type { OpeningBalanceRow } from '@/utils/csv'

export type DryRunOutcome = 'success' | 'warning' | 'error'
export type DryRunRowResult = OpeningBalanceRow & { outcome: DryRunOutcome; message?: string }
export type DryRunSummary = { total: number; success: number; warnings: number; errors: number }

export function simulateOpeningBalanceImport(rows: OpeningBalanceRow[]): { results: DryRunRowResult[]; summary: DryRunSummary } {
  const results: DryRunRowResult[] = rows.map((r) => {
    if (!r.account_code || Number.isNaN(r.amount)) {
      return { ...r, outcome: 'error', message: 'Missing account_code or invalid amount' }
    }
    if (r.amount === 0) {
      return { ...r, outcome: 'warning', message: 'Zero amount' }
    }
    return { ...r, outcome: 'success' }
  })
  const summary: DryRunSummary = {
    total: results.length,
    success: results.filter(r => r.outcome === 'success').length,
    warnings: results.filter(r => r.outcome === 'warning').length,
    errors: results.filter(r => r.outcome === 'error').length,
  }
  return { results, summary }
}
