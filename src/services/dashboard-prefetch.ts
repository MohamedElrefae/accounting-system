import { getCompanyConfig } from './company-config'
import { getCategoryTotals, type AccountBalanceFilter } from './account-balances'
import { getActiveOrgId } from '../utils/org'
import { supabase } from '../utils/supabase'

// Fire-and-forget prefetch to warm up connections and caches.
export async function prefetchDashboard(): Promise<void> {
  try {
    const orgId = getActiveOrgId() || undefined

    // 1) Company config (currency/format + shortcuts)
    void getCompanyConfig().catch(() => {})

    // 2) Unified category totals used for stat cards
    const filters: AccountBalanceFilter = {
      dateFrom: '',
      dateTo: '',
      postedOnly: false,
      orgId,
    }
    void getCategoryTotals(filters).catch(() => {})

    // 3) Warm minimal queries for recent activity depending on GL mode
    // Try enriched view first; fallback to legacy transactions
    void supabase
      .from('v_gl2_journals_enriched')
      .select('journal_id', { count: 'exact' })
      .limit(1)
      .then(() => {})
      .catch(() => {
        return supabase
          .from('transactions')
          .select('id', { count: 'exact' })
          .limit(1)
          .then(() => {})
          .catch(() => {})
      })
  } catch {
    // ignore
  }
}