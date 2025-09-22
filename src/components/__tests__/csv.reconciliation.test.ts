// Placeholder test for reconciliationToCsv
import { reconciliationToCsv } from '../../utils/csv'

describe('reconciliationToCsv (placeholder)', () => {
  it('produces csv string with metrics', () => {
    const csv = reconciliationToCsv({ glTotal: 100, openingTotal: 80, difference: 20 })
    expect(csv.includes('gl_total')).toBe(true)
    expect(csv.includes('difference')).toBe(true)
  })
})