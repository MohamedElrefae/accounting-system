// ============================================
// OPENING BALANCE HOOKS - React Query
// Al-Baraka Construction Company
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { OpeningBalanceService } from '../openingBalanceService'
import type { CreateOpeningBalanceInput, ImportOpeningBalanceItem } from '../types'

// ============================================
// QUERY KEYS
// ============================================

export const openingBalanceKeys = {
  all: ['openingBalances'] as const,
  lists: () => [...openingBalanceKeys.all, 'list'] as const,
  list: (orgId: string, fiscalYearId: string) => [...openingBalanceKeys.lists(), orgId, fiscalYearId] as const,
  imports: (orgId: string, fiscalYearId: string) => [...openingBalanceKeys.all, 'imports', orgId, fiscalYearId] as const,
  validation: (orgId: string, fiscalYearId: string) => [...openingBalanceKeys.all, 'validation', orgId, fiscalYearId] as const,
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all opening balances
 */
export function useOpeningBalances(orgId: string | null | undefined, fiscalYearId: string | null | undefined) {
  return useQuery({
    queryKey: openingBalanceKeys.list(orgId || '', fiscalYearId || ''),
    queryFn: () => OpeningBalanceService.getAll(orgId!, fiscalYearId!),
    enabled: !!orgId && !!fiscalYearId,
  })
}

/**
 * Fetch import history
 */
export function useOpeningBalanceImports(orgId: string | null | undefined, fiscalYearId: string | null | undefined) {
  return useQuery({
    queryKey: openingBalanceKeys.imports(orgId || '', fiscalYearId || ''),
    queryFn: () => OpeningBalanceService.getImports(orgId!, fiscalYearId!),
    enabled: !!orgId && !!fiscalYearId,
  })
}

/**
 * Fetch validation results
 */
export function useOpeningBalanceValidation(orgId: string | null | undefined, fiscalYearId: string | null | undefined) {
  return useQuery({
    queryKey: openingBalanceKeys.validation(orgId || '', fiscalYearId || ''),
    queryFn: () => OpeningBalanceService.validate(orgId!, fiscalYearId!),
    enabled: !!orgId && !!fiscalYearId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Import opening balances
 */
export function useImportOpeningBalances(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      items: ImportOpeningBalanceItem[]
      source?: 'excel' | 'csv' | 'manual'
      sourceFileUrl?: string
    }) => OpeningBalanceService.import(orgId, fiscalYearId, params.items, params.source, params.sourceFileUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.list(orgId, fiscalYearId) })
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.imports(orgId, fiscalYearId) })
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.validation(orgId, fiscalYearId) })
    },
  })
}

/**
 * Create single opening balance
 */
export function useCreateOpeningBalance(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<CreateOpeningBalanceInput, 'orgId' | 'fiscalYearId'>) => 
      OpeningBalanceService.create({ orgId, fiscalYearId, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.list(orgId, fiscalYearId) })
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.validation(orgId, fiscalYearId) })
    },
  })
}

/**
 * Update opening balance
 */
export function useUpdateOpeningBalance(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { amount?: number; notes?: string } }) =>
      OpeningBalanceService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.list(orgId, fiscalYearId) })
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.validation(orgId, fiscalYearId) })
    },
  })
}

/**
 * Delete opening balance
 */
export function useDeleteOpeningBalance(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => OpeningBalanceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.list(orgId, fiscalYearId) })
      queryClient.invalidateQueries({ queryKey: openingBalanceKeys.validation(orgId, fiscalYearId) })
    },
  })
}
