// Placeholder test for CSV utility
import { issuesToCsv } from '../../utils/csv'

describe('issuesToCsv (placeholder)', () => {
  it('builds a csv string', () => {
    const csv = issuesToCsv([{ code: 'X', message: 'Y', row: { a: 1 } }])
    expect(typeof csv).toBe('string')
    expect(csv.includes('code')).toBe(true)
  })
})