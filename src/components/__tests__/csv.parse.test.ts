import { parseCsv } from '../../utils/csv'

describe('parseCsv', () => {
  it('parses simple csv with quotes and commas', () => {
    const csv = 'code,amount\n"1000, A",12.5\n2000,0\n'
    const rows = parseCsv(csv)
    expect(rows.length).toBe(2)
    expect(rows[0].code).toBe('1000, A')
    expect(rows[0].amount).toBe('12.5')
    expect(rows[1].amount).toBe('0')
  })
})
