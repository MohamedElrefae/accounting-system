import { simulateOpeningBalanceImport } from '../../services/OpeningBalanceDryRun'
import type { OpeningBalanceRow } from '../../utils/csv'

describe('simulateOpeningBalanceImport', () => {
  it('summarizes success, warnings (zero), and errors (missing/invalid)', () => {
    const rows: OpeningBalanceRow[] = [
      { account_code: '1000', amount: 10 },
      { account_code: '2000', amount: 0 },
      { account_code: '', amount: 5 },
      { account_code: '3000', amount: NaN as any },
    ]
    const { summary } = simulateOpeningBalanceImport(rows)
    expect(summary.total).toBe(4)
    expect(summary.success).toBe(1)
    expect(summary.warnings).toBe(1)
    expect(summary.errors).toBe(2)
  })
})
