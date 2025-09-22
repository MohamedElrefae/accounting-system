import { normalizeOpeningBalanceRows, type OpeningBalanceMapping } from '../../utils/csv'

describe('normalizeOpeningBalanceRows', () => {
  it('maps selected headers to normalized rows', () => {
    const raw = [
      { Code: '1000', Balance: '12.5', CC: 'HQ', Project: 'P1' },
      { Code: '2000', Balance: '0', CC: 'HQ', Project: 'P2' },
    ]
    const mapping: OpeningBalanceMapping = {
      account_code: 'Code',
      amount: 'Balance',
      cost_center_code: 'CC',
      project_code: 'Project',
    }
    const norm = normalizeOpeningBalanceRows(raw, mapping)
    expect(norm[0].account_code).toBe('1000')
    expect(norm[0].amount).toBe(12.5)
    expect(norm[1].amount).toBe(0)
    expect(norm[1].project_code).toBe('P2')
  })
})
