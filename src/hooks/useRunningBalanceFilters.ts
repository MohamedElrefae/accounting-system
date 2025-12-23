/**
 * useRunningBalanceFilters - Filter state management for Running Balance page
 * 
 * Similar to useTransactionsFilters but with:
 * - Required accountId field
 * - Running balance specific defaults
 * - Scope integration
 */

import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useFilterState, type FilterState } from './useFilterState'
import { useScopeOptional } from '../contexts/ScopeContext'

const STORAGE_KEY = 'running_balance_filters'

const createDefaults = (): FilterState => ({
  search: '',
  dateFrom: '',
  dateTo: '',
  amountFrom: '',
  amountTo: '',
  orgId: '',
  projectId: '',
  debitAccountId: '', // This is the main account filter for running balance
  creditAccountId: '',
  classificationId: '',
  expensesCategoryId: '',
  workItemId: '',
  analysisWorkItemId: '',
  costCenterId: '',
  approvalStatus: '',
})

export const useRunningBalanceFilters = () => {
  const defaultValues = useMemo(createDefaults, [])
  
  // Get centralized scope from ScopeContext (optional)
  const scope = useScopeOptional()

  const {
    filters,
    updateFilter,
    resetFilters: resetFiltersInternal,
  } = useFilterState({
    storageKey: STORAGE_KEY,
    defaultValues,
  })

  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [filtersDirty, setFiltersDirty] = useState(false)
  const initRef = useRef(false)

  // Sync with centralized scope when it changes
  useEffect(() => {
    if (!scope) return
    
    const scopeOrgId = scope.currentOrg?.id || ''
    const scopeProjectId = scope.currentProject?.id || ''
    
    if (scopeOrgId && (filters.orgId !== scopeOrgId || filters.projectId !== scopeProjectId)) {
      updateFilter('orgId', scopeOrgId)
      updateFilter('projectId', scopeProjectId)
    }
  }, [scope?.currentOrg?.id, scope?.currentProject?.id, filters.orgId, filters.projectId, updateFilter, scope])

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters })
    setFiltersDirty(false)
  }, [filters])

  const resetFilters = useCallback(() => {
    resetFiltersInternal()
    if (scope?.currentOrg?.id) {
      const scopeOrgId = scope.currentOrg.id
      const scopeProjectId = scope.currentProject?.id || ''
      setAppliedFilters({ 
        ...defaultValues, 
        orgId: scopeOrgId, 
        projectId: scopeProjectId 
      })
    } else {
      setAppliedFilters({ ...defaultValues })
    }
    setFiltersDirty(false)
  }, [resetFiltersInternal, defaultValues, scope])

  useEffect(() => {
    if (!initRef.current) {
      if (scope?.currentOrg?.id) {
        const initialFilters = {
          ...filters,
          orgId: scope.currentOrg.id,
          projectId: scope.currentProject?.id || '',
        }
        setAppliedFilters(initialFilters)
      } else {
        setAppliedFilters({ ...filters })
      }
      initRef.current = true
      return
    }
    setFiltersDirty(
      JSON.stringify(filters) !== JSON.stringify(appliedFilters),
    )
  }, [filters, appliedFilters, scope])

  // Compute effective filters that merge local filters with scope
  const effectiveFilters = useMemo(() => {
    if (!scope?.currentOrg?.id) return filters
    return {
      ...filters,
      orgId: scope.currentOrg.id,
      projectId: scope.currentProject?.id || filters.projectId,
    }
  }, [filters, scope])

  const effectiveAppliedFilters = useMemo(() => {
    if (!scope?.currentOrg?.id) return appliedFilters
    return {
      ...appliedFilters,
      orgId: scope.currentOrg.id,
      projectId: scope.currentProject?.id || appliedFilters.projectId,
    }
  }, [appliedFilters, scope])

  // Check if we have at least one valid filter for running balance
  // Account is no longer required - can filter by sub_tree, project, etc.
  const hasValidFilter = useMemo(() => {
    const f = effectiveAppliedFilters
    return Boolean(
      f.debitAccountId ||
      f.expensesCategoryId ||
      f.projectId ||
      f.classificationId ||
      f.costCenterId ||
      f.workItemId ||
      f.analysisWorkItemId ||
      f.dateFrom ||
      f.dateTo
    )
  }, [effectiveAppliedFilters])

  // Legacy alias for backward compatibility
  const hasRequiredAccount = hasValidFilter

  return {
    filters: effectiveFilters,
    appliedFilters: effectiveAppliedFilters,
    filtersDirty,
    updateFilter,
    applyFilters,
    resetFilters,
    hasValidFilter,
    hasRequiredAccount, // Legacy alias
    scope,
  }
}

export type UseRunningBalanceFiltersReturn = ReturnType<typeof useRunningBalanceFilters>
