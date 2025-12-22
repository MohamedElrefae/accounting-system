import { useSyncedQuery } from './useSyncedQuery'
import { getProfitLoss, type UnifiedFilters } from '../services/reports/unified-financial-query'
import { queryKeys } from '../lib/queryKeys'

export function useProfitLossSheet(filters: UnifiedFilters) {
  return useSyncedQuery({
    queryKey: queryKeys.reports.incomeStatement(filters) as unknown as unknown[],
    queryFn: () => getProfitLoss(filters),
    sync: {
      channelId: 'profit-loss-sync',
      tables: ['transactions', 'transaction_lines', 'accounts'], 
    },
    queryOptions: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    }
  })
}
