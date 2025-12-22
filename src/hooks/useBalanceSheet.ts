import { useSyncedQuery } from './useSyncedQuery'
import { getBalanceSheet, type UnifiedFilters } from '../services/reports/unified-financial-query'
import { queryKeys } from '../lib/queryKeys'

export function useBalanceSheet(filters: UnifiedFilters) {
  return useSyncedQuery({
    queryKey: queryKeys.reports.balanceSheet(filters) as unknown as unknown[],
    queryFn: () => getBalanceSheet(filters),
    sync: {
      channelId: 'balance-sheet-sync',
      tables: ['transactions', 'transaction_lines', 'accounts'], 
    },
    queryOptions: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    }
  })
}
