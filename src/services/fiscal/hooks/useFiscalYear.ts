// ============================================
// FISCAL YEAR HOOKS - React Query
// Al-Baraka Construction Company
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalYearService } from '../fiscalYearService'
import type { CreateFiscalYearInput, UpdateFiscalYearInput } from '../types'

// ============================================
// QUERY KEYS FACTORY
// ============================================

export const fiscalYearKeys = {
  all: ['fiscalYears'] as const,
  lists: () => [...fiscalYearKeys.all, 'list'] as const,
  list: (orgId: string) => [...fiscalYearKeys.lists(), orgId] as const,
  details: () => [...fiscalYearKeys.all, 'detail'] as const,
  detail: (id: string) => [...fiscalYearKeys.details(), id] as const,
  current: (orgId: string) => [...fiscalYearKeys.all, 'current', orgId] as const,
  permission: (orgId: string) => [...fiscalYearKeys.all, 'permission', orgId] as const,
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch all fiscal years for an organization
 */
export function useFiscalYears(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.list(orgId || ''),
    queryFn: () => FiscalYearService.getAll(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single fiscal year by ID
 */
export function useFiscalYear(id: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.detail(id || ''),
    queryFn: () => FiscalYearService.getById(id!),
    enabled: !!id,
  })
}

/**
 * Fetch the current fiscal year
 */
export function useCurrentFiscalYear(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.current(orgId || ''),
    queryFn: () => FiscalYearService.getCurrent(orgId!),
    enabled: !!orgId,
  })
}

/**
 * Check if user can manage fiscal data
 */
export function useCanManageFiscal(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.permission(orgId || ''),
    queryFn: () => FiscalYearService.canManage(orgId!),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new fiscal year
 */
export function useCreateFiscalYear() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateFiscalYearInput) => FiscalYearService.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(variables.orgId) })
    },
  })
}

/**
 * Update a fiscal year
 */
export function useUpdateFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFiscalYearInput }) =>
      FiscalYearService.update(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
      queryClient.setQueryData(fiscalYearKeys.detail(data.id), data)
    },
  })
}

/**
 * Delete a fiscal year
 */
export function useDeleteFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => FiscalYearService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
    },
  })
}

/**
 * Set a fiscal year as current
 */
export function useSetCurrentFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fiscalYearId: string) => FiscalYearService.setCurrent(orgId, fiscalYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.current(orgId) })
    },
  })
}

/**
 * Activate a fiscal year
 */
export function useActivateFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => FiscalYearService.activate(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
      queryClient.setQueryData(fiscalYearKeys.detail(data.id), data)
    },
  })
}

/**
 * Close a fiscal year
 */
export function useCloseFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => FiscalYearService.close(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
      queryClient.setQueryData(fiscalYearKeys.detail(data.id), data)
    },
  })
}

/**
 * Archive a fiscal year
 */
export function useArchiveFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => FiscalYearService.archive(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
      queryClient.setQueryData(fiscalYearKeys.detail(data.id), data)
    },
  })
}
