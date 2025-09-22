import { validateOpeningBalanceRows, type OpeningBalanceRow } from '../../utils/csv'

describe('validateOpeningBalanceRows', () => {
  it('flags missing account_code and invalid amount', () => {
    const rows: OpeningBalanceRow[] = [
      { account_code: '', amount: NaN },
      { account_code: '1000', amount: 0 },
      { account_code: '2000', amount: 10 },
    ]
    const r = validateOpeningBalanceRows(rows)
    expect(r.ok).toBe(false)
    expect(r.errors.find(e => e.code === 'E_ACC_CODE')).toBeTruthy()
    expect(r.errors.find(e => e.code === 'E_AMOUNT')).toBeTruthy()
    expect(r.warnings.find(w => w.code === 'W_ZERO')).toBeTruthy()
    expect(r.totals.count).toBe(3)
  })
})
