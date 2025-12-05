/**
 * Report Query Hooks - React Query Integration
 * 
 * هذه الـ hooks توفر caching ذكي لجميع التقارير المالية
 * These hooks provide smart caching for all financial reports
 * 
 * Features:
 * - 5-minute stale time for all reports
 * - Automatic cache invalidation on mutations
 * - Shared data between related reports
 * - Loading and error states
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  fetchGLSummary,
  getCategoryTotals,
  getCategoryTotalsLegacyFormat,
  getTrialBalance,
  getBalanceSheet,
  getProfitLoss,
  verifyConsistency,
  type UnifiedFilters,
  type GLSummaryRow,
  type CategoryTotals,
  type TrialBalanceRow,
  type TrialBalanceTotals,
  type BalanceSheetRow,
  type BalanceSheetSummary,
  type ProfitLossRow,
  type ProfitLossSummary
} from './unified-financial-query'

// ============================================================================
// QUERY KEYS - Centralized key management
// ============================================================================

export const reportQueryKeys = {
  all: ['reports'],
  
  // GL Summary - base data for all reports
  glSummary: (filters: UnifiedFilters) => 
    ['reports', 'gl-summary', normalizeFilters(filters)],
  
  // Dashboard totals
  categoryTotals: (filters: UnifiedFilters) => 
    ['reports', 'category-totals', normalizeFilters(filters)],
  
  // Trial Balance
  trialBalance: (filters: UnifiedFilters) => 
    ['reports', 'trial-balance', normalizeFilters(filters)],
  
  // Balance Sheet
  balanceSheet: (filters: UnifiedFilters) => 
    ['reports', 'balance-sheet', normalizeFilters(filters)],
  
  // Profit & Loss
  profitLoss: (filters: UnifiedFilters) => 
    ['reports', 'profit-loss', normalizeFilters(filters)],
  
  // Consistency verification
  consistency: (filters: UnifiedFilters) => 
    ['reports', 'consistency', normalizeFilters(filters)],
}

// Normalize filters for consistent cache keys
function normalizeFilters(filters: UnifiedFilters): Record<string, unknown> {
  return {
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    orgId: filters.orgId || null,
    projectId: filters.projectId || null,
    postedOnly: !!filters.postedOnly,
    classificationId: filters.classificationId || null,
    analysisWorkItemId: filters.analysisWorkItemId || null,
    expensesCategoryId: filters.expensesCategoryId || null,
    subTreeId: filters.subTreeId || null,
  }
}

// ============================================================================
// STALE TIME CONFIGURATION
// ============================================================================

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for GL Summary data - base data for all reports
 */
export function useGLSummary(filters: UnifiedFilters, options?: { enabled?: boolean }) {
  return useQuery(
    reportQueryKeys.glSummary(filters),
    () => fetchGLSummary(filters),
    {
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      enabled: options?.enabled !== false,
    }
  )
}

/**
 * Hook for Dashboard category totals
 */
export function useCategoryTotals(filters: UnifiedFilters, options?: { enabled?: boolean }) {
  return useQuery(
    reportQueryKeys.categoryTotals(filters),
    () => getCategoryTotals(filters),
    {
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      enabled: options?.enabled !== false,
    }
  )
}

/**
 * Hook for Dashboard category totals in legacy format
 */
export function useCategoryTotalsLegacy(filters: UnifiedFilters, options?: { enabled?: boolean }) {
  return useQuery(
    [...reportQueryKeys.categoryTotals(filters), 'legacy'],
    () => getCategoryTotalsLegacyFormat(filters),
    {
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      enabled: options?.enabled !== false,
    }
  )
}

/**
 * Hook for Trial Balance report
 */
export function useTrialBalanceReport(filters: UnifiedFilters, options?: { enabled?: boolean }) {
  return useQuery(
    reportQueryKeys.trialBalance(filters),
    () => getTrialBalance(filters),
    {
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      enabled: options?.enabled !== false,
    }
  )
}

/**
 * Hook for Balance Sheet report
 */
export function useBalanceSheetReport(filters: UnifiedFilters, options?: { enabled?: boolean }) {
  return useQuery(
    reportQueryKeys.balanceSheet(filters),
    () => getBalanceSheet(filters),
    {
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      enabled: options?.enabled !== false,
    }
  )
}

/**
 * Hook for Profit & Loss report
 */
export function useProfitLossReport(filters: UnifiedFilters, options?: { enabled?: boolean }) {
  return useQuery(
    reportQueryKeys.profitLoss(filters),
    () => getProfitLoss(filters),
    {
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      enabled: options?.enabled !== false,
    }
  )
}

/**
 * Hook for consistency verification
 */
export function useConsistencyCheck(filters: UnifiedFilters, options?: { enabled?: boolean }) {
  return useQuery(
    reportQueryKeys.consistency(filters),
    () => verifyConsistency(filters),
    {
      staleTime: STALE_TIME,
      cacheTime: CACHE_TIME,
      enabled: options?.enabled !== false,
    }
  )
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Hook to invalidate all report caches
 * Call this after posting/approving transactions
 */
export function useInvalidateReports() {
  const queryClient = useQueryClient()
  
  return {
    /**
     * Invalidate all report caches
     */
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: reportQueryKeys.all })
    },
    
    /**
     * Invalidate specific report type
     */
    invalidateReport: (type: 'gl-summary' | 'category-totals' | 'trial-balance' | 'balance-sheet' | 'profit-loss') => {
      queryClient.invalidateQueries({ 
        queryKey: [...reportQueryKeys.all, type] 
      })
    },
    
    /**
     * Invalidate reports for specific filters
     */
    invalidateForFilters: (filters: UnifiedFilters) => {
      const normalizedFilters = normalizeFilters(filters)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          if (!Array.isArray(key) || key[0] !== 'reports') return false
          
          // Check if filters match
          const queryFilters = key[2]
          if (!queryFilters || typeof queryFilters !== 'object') return true
          
          // Match on org and project
          return (
            (queryFilters as any).orgId === normalizedFilters.orgId &&
            (queryFilters as any).projectId === normalizedFilters.projectId
          )
        }
      })
    },
    
    /**
     * Prefetch reports for faster navigation
     */
    prefetchReports: async (filters: UnifiedFilters) => {
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: reportQueryKeys.categoryTotals(filters),
          queryFn: () => getCategoryTotals(filters),
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: reportQueryKeys.trialBalance(filters),
          queryFn: () => getTrialBalance(filters),
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: reportQueryKeys.balanceSheet(filters),
          queryFn: () => getBalanceSheet(filters),
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: reportQueryKeys.profitLoss(filters),
          queryFn: () => getProfitLoss(filters),
          staleTime: STALE_TIME,
        }),
      ])
    }
  }
}

// ============================================================================
// MUTATION HOOKS WITH AUTO-INVALIDATION
// ============================================================================

/**
 * Example mutation hook that auto-invalidates reports
 * Use this pattern for transaction posting/approval
 */
export function useTransactionMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    invalidateFilters?: UnifiedFilters
  }
) {
  const { invalidateAll } = useInvalidateReports()
  
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Auto-invalidate all reports after successful mutation
      invalidateAll()
      
      // Call custom onSuccess if provided
      options?.onSuccess?.(data, variables)
    }
  })
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  UnifiedFilters,
  GLSummaryRow,
  CategoryTotals,
  TrialBalanceRow,
  TrialBalanceTotals,
  BalanceSheetRow,
  BalanceSheetSummary,
  ProfitLossRow,
  ProfitLossSummary
}
