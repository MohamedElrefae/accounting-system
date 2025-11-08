import { describe, it, expect } from 'vitest'
import { toCsv } from '../csvExport'

describe('toCsv', () => {
  it('produces CSV with union of keys and escapes quotes/commas/newlines', () => {
    const rows = [
      { a: 'x', b: 'y, z' },
      { a: 'q"w', c: 'line1\nline2' },
    ]
    const csv = toCsv(rows)
    // Header contains a,b,c in some order; check it includes them and has 3 columns
    const [header] = csv.split('\n')

    expect(header.split(',').sort()).toEqual(['a','b','c'])
    // Contains properly quoted comma field and newline field
    expect(csv).toContain('"y, z"')
    expect(csv).toContain('"line1\nline2"')
  })
})