import { summarizeFiscal } from '../../services/FiscalDashboardService'

describe('summarizeFiscal error handling', () => {
  it('handles rpc errors gracefully', async () => {
    const mockClient = {
      from: (table: string) => ({
        select: () => ({ eq: () => ({ data: table === 'fiscal_periods' ? [{ status: 'open' }] : [{ id: 1 }] }) })
      }),
      rpc: () => { throw new Error('rpc failure') }
    }
    const s = await summarizeFiscal('org', 'fy', mockClient).catch(() => null)
    expect(s).toBeTruthy()
    expect(s?.warnings).toBe(0)
    expect(s?.errors).toBe(0)
  })
})
