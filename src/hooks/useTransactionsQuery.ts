import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTransactionsEnrichedView, type EnrichedViewFilters } from '../services/transactions-enriched';
import { queryKeys } from '../lib/queryKeys';
import { useUnifiedSync } from './useUnifiedSync';

interface UseTransactionsQueryOptions {
  page?: number;
  pageSize?: number;
  filters: EnrichedViewFilters;
  enabled?: boolean;
}

export const useTransactionsQuery = ({ 
  page = 1, 
  pageSize = 20, 
  filters, 
  enabled = true 
}: UseTransactionsQueryOptions) => {
  const queryClient = useQueryClient();

  // Create a stable query key based on filters and pagination
  // We include page/pageSize in the filters object for the key generator if needed, 
  // or just append them to the key array.
  // The factory queryKeys.transactions.by(filters) returns ['transactions', filters]
  // We append { page, pageSize } to make it unique for pagination.
  
  const baseKey = queryKeys.transactions.by(filters);
  const queryKey = [...baseKey, { page, pageSize }] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => getTransactionsEnrichedView(filters, page, pageSize),
    keepPreviousData: true, // Better UX for pagination
    staleTime: 60 * 1000, // 1 minute stale time (since we have realtime)
    enabled,
  });

  // Setup Realtime Subscription
  // Use Unified Sync to listen to both tables and invalidate broadly
  useUnifiedSync({
    channelId: 'transactions-list-sync',
    tables: ['transactions', 'transaction_lines'],
    onDataChange: () => {
       // Invalidate broader scope (all transaction lists)
       queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() });
    }
  });

  return query;
};
