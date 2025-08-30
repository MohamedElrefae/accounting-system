// Shared column width definitions for Account Explorer (Tree + Table)
// Keeping in one place to maintain perfect alignment.

export type ExplorerMode = 'asof' | 'range'
export interface ColumnOpts { withTxnCount?: boolean }

// Fixed widths used across both views
export const COL_WIDTHS = {
  expander: '24px',
  status: '12px',
  spacer: '8px',
  code: '120px',
  name: 'minmax(0,1fr)',
  type: '160px',
  level: '100px',
  openingDebit: '120px',
  openingCredit: '120px',
  periodDebits: '140px',
  periodCredits: '140px',
  closingDebit: '140px',
  closingCredit: '140px',
  txCount: '120px',
  actions: '180px',
} as const

export function gridColumnsForMode(mode: ExplorerMode, opts: ColumnOpts = {}): string {
  if (mode === 'range') {
    return [
      COL_WIDTHS.expander,
      COL_WIDTHS.status,
      COL_WIDTHS.spacer,
      COL_WIDTHS.code,
      COL_WIDTHS.name,
      COL_WIDTHS.type,
      COL_WIDTHS.level,
      ...(opts.withTxnCount ? [COL_WIDTHS.txCount] : [] as string[]),
      COL_WIDTHS.openingDebit,
      COL_WIDTHS.openingCredit,
      COL_WIDTHS.periodDebits,
      COL_WIDTHS.periodCredits,
      COL_WIDTHS.actions,
    ].join(' ')
  }
  // asof
  return [
    COL_WIDTHS.expander,
    COL_WIDTHS.status,
    COL_WIDTHS.spacer,
    COL_WIDTHS.code,
    COL_WIDTHS.name,
    COL_WIDTHS.type,
    COL_WIDTHS.level,
    ...(opts.withTxnCount ? [COL_WIDTHS.txCount] : [] as string[]),
    COL_WIDTHS.closingDebit,
    COL_WIDTHS.closingCredit,
    COL_WIDTHS.actions,
  ].join(' ')
}

export function tableColWidths(mode: ExplorerMode, opts: ColumnOpts = {}): string[] {
  if (mode === 'range') {
    return [
      COL_WIDTHS.code,
      COL_WIDTHS.name,
      COL_WIDTHS.type,
      COL_WIDTHS.level,
      ...(opts.withTxnCount ? [COL_WIDTHS.txCount] : [] as string[]),
      COL_WIDTHS.openingDebit,
      COL_WIDTHS.openingCredit,
      COL_WIDTHS.periodDebits,
      COL_WIDTHS.periodCredits,
      COL_WIDTHS.actions,
    ]
  }
  return [
    COL_WIDTHS.code,
    COL_WIDTHS.name,
    COL_WIDTHS.type,
    COL_WIDTHS.level,
    ...(opts.withTxnCount ? [COL_WIDTHS.txCount] : [] as string[]),
    COL_WIDTHS.closingDebit,
    COL_WIDTHS.closingCredit,
    COL_WIDTHS.actions,
  ]
}

