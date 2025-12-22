import { getCompanyConfig } from './company-config'
import { getCategoryTotals, type UnifiedFilters } from './reports/unified-financial-query'
import { supabase } from '../utils/supabase'

// Fire-and-forget prefetch to warm up connections and caches.
export async function prefetchDashboard(orgId?: string | null): Promise<void> {
  try {
    const effectiveOrgId = orgId ?? null

    // 1) Company config (currency/format + shortcuts)
    void getCompanyConfig(effectiveOrgId).catch(() => {})

    // 2) Unified category totals used for stat cards - SINGLE SOURCE OF TRUTH
    const filters: UnifiedFilters = {
      dateFrom: null,
      dateTo: null,
      postedOnly: false,
      orgId: effectiveOrgId,
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