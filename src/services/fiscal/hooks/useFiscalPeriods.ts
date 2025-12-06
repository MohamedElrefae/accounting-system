// ============================================
// FISCAL PERIOD HOOKS - React Query
// Al-Baraka Construction Company
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalPeriodService } from '../fiscalPeriodService'
import type { UpdateFiscalPeriodInput } from '../types'

// ============================================
// QUERY KEYS FACTORY
// ============================================

export const fiscalPeriodKeys = {
  all: ['fiscalPeriods'] as const,
  lists: () => [...fiscalPeriodKeys.all, 'list'] as const,
  list: (orgId: string, fiscalYearId: string) => [...fiscalPeriodKeys.lists(), orgId, fiscalYearId] as const,
  details: () => [...fiscalPeriodKeys.all, 'detail'] as const,
  detail: (id: string) => [...fiscalPeriodKeys.details(), id] as const,
  current: (orgId: string) => [...fiscalPeriodKeys.all, 'current', orgId] as const,
  activity: (periodId: string) => [...fiscalPeriodKeys.all, 'activity', periodId] as const,
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all periods for a fiscal year
 */
export function useFiscalPeriods(orgId: string | null | undefined, fiscalYearId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.list(orgId || '', fiscalYearId || ''),
    queryFn: () => FiscalPeriodService.getAll(orgId!, fiscalYearId!),
    enabled: !!orgId && !!fiscalYearId,
  })
}

/**
 * Fetch a single period by ID
 */
export function useFiscalPeriod(id: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.detail(id || ''),
    queryFn: () => FiscalPeriodService.getById(id!),
    enabled: !!id,
  })
}

/**
 * Fetch the current period
 */
export function useCurrentFiscalPeriod(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.current(orgId || ''),
    queryFn: () => FiscalPeriodService.getCurrent(orgId!),
    enabled: !!orgId,
  })
}

/**
 * Fetch period activity (transaction counts, totals)
 * Uses the previously UNUSED get_period_activity RPC!
 */
export function usePeriodActivity(periodId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.activity(periodId || ''),
    queryFn: () => FiscalPeriodService.getActivity(periodId!),
    enabled: !!periodId,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Update a period
 */
export function useUpdateFiscalPeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFiscalPeriodInput }) =>
      FiscalPeriodService.update(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
      queryClient.setQueryData(fiscalPeriodKeys.detail(data.id), data)
    },
  })
}

/**
 * Lock a period
 */
export function useLockPeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (periodId: string) => FiscalPeriodService.lock(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
    },
  })
}

/**
 * Unlock a period
 */
export function useUnlockPeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (periodId: string) => FiscalPeriodService.unlock(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
    },
  })
}

/**
 * Close a period
 */
export function useClosePeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ periodId, notes }: { periodId: string; notes?: string }) =>
      FiscalPeriodService.close(periodId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
    },
  })
}

/**
 * Set a period as current
 */
export function useSetCurrentPeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (periodId: string) => FiscalPeriodService.setCurrent(orgId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.current(orgId) })
    },
  })
}
