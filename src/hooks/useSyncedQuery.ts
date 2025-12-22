import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { useUnifiedSync } from './useUnifiedSync'

export interface SyncedQueryOptions<TData, TError = unknown> {
  queryKey: unknown[]
  queryFn: () => Promise<TData>
  queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
  sync: {
    channelId: string // Unique ID for this data view (e.g. 'transactions-list-all')
    tables: string[]  // DB tables to listen to
    enablePresence?: boolean
  }
}

/**
 * The standard hook for data fetching in the sophisticated app.
 * Combines React Query (Caching, Deduping, Loading States) with 
 * UnifiedSync (Realtime Updates, Presence).
 */
export function useSyncedQuery<TData = any, TError = unknown>(
  options: SyncedQueryOptions<TData, TError>
) {
  const queryClient = useQueryClient()
  const { queryKey, queryFn, queryOptions, sync } = options

  // Standard Query
  const queryResult = useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  } as UseQueryOptions<TData, TError>)

  // Connected Sync
  const syncState = useUnifiedSync({
    channelId: sync.channelId,
    tables: sync.tables,
    enablePresence: sync.enablePresence,
    onDataChange: (event) => {
      // Smart Invalidation:
      // We could inspect event.metadata to see if it Matches current filters
      // For now, we simply invalidate the queryKey to be safe and consistent.
      console.log(`🔄 Sync Trigger: Invalidating ${JSON.stringify(queryKey)} due to ${event.type}`)
      queryClient.invalidateQueries({ queryKey })
    }
  })

  return {
    ...queryResult,
    sync: syncState,
    refresh: () => {
      queryResult.refetch()
    }
  }
}
