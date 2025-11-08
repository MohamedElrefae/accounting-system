// Centralized React Query option presets for consistent caching behavior
// Use these to override global defaults only where needed.
import type { UseQueryOptions } from '@tanstack/react-query'

// Highly dynamic views (e.g., inboxes, personal lists)
export const dynamicQueryOptions: Partial<UseQueryOptions> = {
  staleTime: 30 * 1000, // 30s
  refetchOnMount: true,
}

// Stable lists (reports, dashboards aggregates)
export const stableListQueryOptions: Partial<UseQueryOptions> = {
  staleTime: 5 * 60 * 1000, // 5m
  refetchOnMount: false,
}

// Reference/lookups (rarely change)
export const lookupQueryOptions: Partial<UseQueryOptions> = {
  staleTime: 60 * 60 * 1000, // 60m
  refetchOnMount: false,
}
