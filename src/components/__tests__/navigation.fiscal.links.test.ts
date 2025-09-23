import nav from '../../data/navigation'

// Smoke test to ensure fiscal links exist in navigation data

describe('navigation fiscal links', () => {
  it('contains Opening Balance Import and Fiscal Year Dashboard entries', () => {
    const all = JSON.stringify(nav)
    expect(all.includes('/fiscal/opening-balance-import')).toBe(true)
    expect(all.includes('/fiscal/dashboard')).toBe(true)
  })
})
