import { useSyncedQuery } from './useSyncedQuery'
import { fetchGeneralLedgerReport, type GLFilters } from '../services/reports/general-ledger'
import { fetchGLAccountSummary, type GLAccountSummaryFilters } from '../services/reports/gl-account-summary'
import { queryKeys } from '../lib/queryKeys'
import { fetchGLSummary, type UnifiedFilters } from '../services/reports/unified-financial-query'

export function useUnifiedGLSummary(filters: UnifiedFilters, options?: { enabled?: boolean }) {
  return useSyncedQuery({
    queryKey: ['unified-gl-summary', filters] as unknown as unknown[],
    queryFn: () => fetchGLSummary(filters),
    sync: {
      channelId: 'unified-gl-summary',
      tables: ['transactions', 'transaction_lines', 'accounts'],
    },
    queryOptions: {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
      refetchOnWindowFocus: false,
    }
  })
}


export function useGeneralLedgerReport(filters: GLFilters, options?: { enabled?: boolean }) {
  return useSyncedQuery({
    queryKey: queryKeys.reports.generalLedger(filters) as unknown as unknown[],
    queryFn: () => fetchGeneralLedgerReport(filters),
    sync: {
      channelId: 'general-ledger-report',
      tables: ['transactions', 'transaction_lines', 'accounts'],
    },
    queryOptions: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: options?.enabled ?? (!!filters.accountId || !!filters.orgId || !!filters.dateFrom), 
      refetchOnWindowFocus: false,
    }
  })
}

// Helper to fetch all summary rows
async function fetchAllGLAccountSummary(filters: GLAccountSummaryFilters) {
  const initialLimit = 500
  const firstBatch = await fetchGLAccountSummary({ ...filters, limit: initialLimit, offset: 0 })
  if (firstBatch.length < initialLimit) return firstBatch

  const allRows = [...firstBatch]
  let offset = initialLimit
  const batchSize = 1000

  while (true) {
    const moreRows = await fetchGLAccountSummary({ ...filters, limit: batchSize, offset })
    if (moreRows.length === 0) break
    allRows.push(...moreRows)
    if (moreRows.length < batchSize) break
    offset += batchSize
  }
  return allRows
}

export function useGLAccountSummary(filters: GLAccountSummaryFilters, options?: { enabled?: boolean }) {
  return useSyncedQuery({
    queryKey: ['gl-account-summary', filters] as unknown as unknown[],
    queryFn: () => fetchAllGLAccountSummary(filters),
    sync: {
      channelId: 'gl-account-summary',
      tables: ['transactions', 'transaction_lines', 'accounts'],
    },
    queryOptions: {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
      refetchOnWindowFocus: false,
    }
  })
}
