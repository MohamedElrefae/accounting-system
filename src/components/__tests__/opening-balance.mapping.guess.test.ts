import { guessOpeningBalanceMapping } from '../../utils/csv'

describe('guessOpeningBalanceMapping', () => {
  it('detects English headers', () => {
    const g = guessOpeningBalanceMapping(['account_code','amount','cc','project'])
    expect(g.account_code).toBe('account_code')
    expect(g.amount).toBe('amount')
    expect(g.cost_center_code).toBe('cc')
    expect(g.project_code).toBe('project')
  })

  it('detects Arabic-like headers', () => {
    const g = guessOpeningBalanceMapping(['الحساب','المبلغ','مركز التكلفة','مشروع'])
    expect(g.account_code).toBe('الحساب')
    expect(g.amount).toBe('المبلغ')
    expect(g.cost_center_code).toBe('مركز التكلفة')
    expect(g.project_code).toBe('مشروع')
  })
})
