import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganizations } from '../services/organization';
import type { Organization } from '../types';

// Query key for organizations
export const ORGANIZATIONS_QUERY_KEY = ['organizations'];

/**
 * Hook to fetch organizations with React Query caching
 * - Uses localStorage cache for instant initial load
 * - React Query handles background refetching
 * - 10 minute stale time for reduced API calls
 */
export function useOrganizations() {
  return useQuery<Organization[], Error>({
    queryKey: ORGANIZATIONS_QUERY_KEY,
    queryFn: getOrganizations,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

/**
 * Hook to invalidate organizations cache
 * Call this after creating/updating/deleting an organization
 */
export function useInvalidateOrganizations() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY });
  };
}

/**
 * Prefetch organizations - call this early to warm up the cache
 */
export function usePrefetchOrganizations() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: ORGANIZATIONS_QUERY_KEY,
      queryFn: getOrganizations,
      staleTime: 10 * 60 * 1000,
    });
  };
}
