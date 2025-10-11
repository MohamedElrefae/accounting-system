import { describe, it, expect } from 'vitest'
import { normalizeOpeningBalanceRows, guessOpeningBalanceMapping } from '../csv'

describe('opening balance normalization with currency', () => {
  it('maps currency_code when present in mapping', () => {
    const raw = [
      { ACC: '1000', AMT: '12.50', CUR: 'USD' },
      { ACC: '2000', AMT: '0', CUR: 'EUR' },
    ]
    const mapping = {
      account_code: 'ACC',
      amount: 'AMT',
      currency_code: 'CUR',
    }
    const out = normalizeOpeningBalanceRows(raw as any, mapping)
    expect(out[0]).toMatchObject({ account_code: '1000', amount: 12.5, currency_code: 'USD' })
    expect(out[1]).toMatchObject({ account_code: '2000', amount: 0, currency_code: 'EUR' })
  })

  it('guessOpeningBalanceMapping detects currency header', () => {
    const headers = ['account_code', 'amount', 'currency']
    const m = guessOpeningBalanceMapping(headers)
    expect(m.currency_code).toBe('currency')
  })
})