import { summarizeFiscal } from '../../services/FiscalDashboardService'

describe('summarizeFiscal', () => {
  it('returns zeros when org/year missing', async () => {
    const s = await summarizeFiscal(undefined, undefined, {})
    expect(s).toEqual({ open:0, locked:0, closed:0, imports:0, warnings:0, errors:0 })
  })

  it('aggregates counts with a mock client', async () => {
    const chain = (data: any) => ({ eq: () => ({ eq: () => ({ data }) }) })
    const mockClient = {
      from: (table: string) => ({
        select: () => chain(table === 'fiscal_periods' ? [
          { status: 'open' }, { status: 'locked' }, { status: 'closed' }, { status: 'open' }
        ] : [{ id: 1 }, { id: 2 }])
      }),
      rpc: () => ({ data: { warnings: [{}, {}], errors: [{}] } })
    }
    const s = await summarizeFiscal('org', 'fy', mockClient)
    expect(s.open).toBe(2)
    expect(s.locked).toBe(1)
    expect(s.closed).toBe(1)
    expect(s.imports).toBe(2)
    expect(s.warnings).toBe(2)
    expect(s.errors).toBe(1)
  })
})
