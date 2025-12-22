import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useFilterState, type FilterState } from './useFilterState'
import { useScopeOptional } from '../contexts/ScopeContext'

const HEADER_STORAGE_KEY = 'transactions_filters'
const LINE_STORAGE_KEY = 'transactions_lines_filters'

const createHeaderDefaults = (): FilterState => ({
  search: '',
  dateFrom: '',
  dateTo: '',
  amountFrom: '',
  amountTo: '',
  orgId: '',
  projectId: '', // Always start with empty (All Projects)
  debitAccountId: '',
  creditAccountId: '',
  classificationId: '',
  expensesCategoryId: '',
  workItemId: '',
  analysisWorkItemId: '',
  costCenterId: '',
  approvalStatus: '',
})

const createLineDefaults = (): FilterState => ({
  search: '',
  amountFrom: '',
  amountTo: '',
  debitAccountId: '',
  creditAccountId: '',
  projectId: '',
  costCenterId: '',
  workItemId: '',
  analysisWorkItemId: '',
  classificationId: '',
  expensesCategoryId: '',
})

export const useTransactionsFilters = () => {
  const headerDefaultValues = useMemo(createHeaderDefaults, [])
  const lineDefaultValues = useMemo(createLineDefaults, [])
  
  // Get centralized scope from ScopeContext (optional - won't throw if outside provider)
  const scope = useScopeOptional()

  const {
    filters: headerFilters,
    updateFilter: updateHeaderFilter,
    resetFilters: resetHeaderFiltersInternal,
  } = useFilterState({
    storageKey: HEADER_STORAGE_KEY,
    defaultValues: headerDefaultValues,
  })

  const {
    filters: lineFilters,
    updateFilter: updateLineFilter,
    resetFilters: resetLineFilters,
  } = useFilterState({
    storageKey: LINE_STORAGE_KEY,
    defaultValues: lineDefaultValues,
  })

  const [headerAppliedFilters, setHeaderAppliedFilters] = useState(headerFilters)
  const [headerFiltersDirty, setHeaderFiltersDirty] = useState(false)
  const headerInitRef = useRef(false)
  const scopeSyncRef = useRef(false)

  // Sync with centralized scope when it changes
  // This ensures transactions page uses the same org/project as TopBar
  useEffect(() => {
    if (!scope) return
    
    const scopeOrgId = scope.currentOrg?.id || ''
    const scopeProjectId = scope.currentProject?.id || ''
    
    // Only sync if scope has changed and we have a valid org
    if (scopeOrgId && (headerFilters.orgId !== scopeOrgId || headerFilters.projectId !== scopeProjectId)) {
      console.log('[useTransactionsFilters] Syncing with ScopeContext:', { scopeOrgId, scopeProjectId })
      updateHeaderFilter('orgId', scopeOrgId)
      updateHeaderFilter('projectId', scopeProjectId)
      scopeSyncRef.current = true
    }
  }, [scope?.currentOrg?.id, scope?.currentProject?.id, headerFilters.orgId, headerFilters.projectId, updateHeaderFilter, scope])

  const applyHeaderFilters = useCallback(() => {
    setHeaderAppliedFilters({ ...headerFilters })
    setHeaderFiltersDirty(false)
  }, [headerFilters])

  const resetHeaderFilters = useCallback(() => {
    resetHeaderFiltersInternal()
    // When resetting, also sync back to scope values if available
    if (scope?.currentOrg?.id) {
      const scopeOrgId = scope.currentOrg.id
      const scopeProjectId = scope.currentProject?.id || ''
      setHeaderAppliedFilters({ 
        ...headerDefaultValues, 
        orgId: scopeOrgId, 
        projectId: scopeProjectId 
      })
    } else {
      setHeaderAppliedFilters({ ...headerDefaultValues })
    }
    setHeaderFiltersDirty(false)
  }, [resetHeaderFiltersInternal, headerDefaultValues, scope])

  useEffect(() => {
    if (!headerInitRef.current) {
      // On initial load, prefer scope values if available
      if (scope?.currentOrg?.id) {
        const initialFilters = {
          ...headerFilters,
          orgId: scope.currentOrg.id,
          projectId: scope.currentProject?.id || '',
        }
        setHeaderAppliedFilters(initialFilters)
      } else {
        setHeaderAppliedFilters({ ...headerFilters })
      }
      headerInitRef.current = true
      return
    }
    setHeaderFiltersDirty(
      JSON.stringify(headerFilters) !== JSON.stringify(headerAppliedFilters),
    )
  }, [headerFilters, headerAppliedFilters, scope])

  // Compute effective filters that merge local filters with scope
  const effectiveHeaderFilters = useMemo(() => {
    if (!scope?.currentOrg?.id) return headerFilters
    return {
      ...headerFilters,
      orgId: scope.currentOrg.id,
      projectId: scope.currentProject?.id || headerFilters.projectId,
    }
  }, [headerFilters, scope])

  const effectiveAppliedFilters = useMemo(() => {
    if (!scope?.currentOrg?.id) return headerAppliedFilters
    return {
      ...headerAppliedFilters,
      orgId: scope.currentOrg.id,
      projectId: scope.currentProject?.id || headerAppliedFilters.projectId,
    }
  }, [headerAppliedFilters, scope])

  return {
    headerFilters: effectiveHeaderFilters,
    headerAppliedFilters: effectiveAppliedFilters,
    headerFiltersDirty,
    updateHeaderFilter,
    applyHeaderFilters,
    resetHeaderFilters,
    // Expose scope for components that need it
    scope,
    lineFilters,
    updateLineFilter,
    resetLineFilters,
  }
}

export type UseTransactionsFiltersReturn = ReturnType<typeof useTransactionsFilters>
