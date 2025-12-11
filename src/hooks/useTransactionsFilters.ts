import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useFilterState, type FilterState } from './useFilterState'
import { getActiveProjectId } from '../utils/org'

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

  const [useGlobalProjectTx, setUseGlobalProjectTx] = useState<boolean>(() => {
    try {
      return localStorage.getItem('transactions:useGlobalProject') === '1'
    } catch {
      return false // Default to false - don't auto-sync with global project
    }
  })

  const applyHeaderFilters = useCallback(() => {
    setHeaderAppliedFilters({ ...headerFilters })
    setHeaderFiltersDirty(false)
  }, [headerFilters])

  const resetHeaderFilters = useCallback(() => {
    resetHeaderFiltersInternal()
    setHeaderAppliedFilters({ ...headerDefaultValues })
    setHeaderFiltersDirty(false)
  }, [resetHeaderFiltersInternal, headerDefaultValues])

  useEffect(() => {
    if (!headerInitRef.current) {
      setHeaderAppliedFilters({ ...headerFilters })
      headerInitRef.current = true
      return
    }
    setHeaderFiltersDirty(
      JSON.stringify(headerFilters) !== JSON.stringify(headerAppliedFilters),
    )
  }, [headerFilters, headerAppliedFilters])

  useEffect(() => {
    // Only sync with global project if explicitly enabled AND user hasn't manually cleared the filter
    if (!useGlobalProjectTx) return
    try {
      const pid = getActiveProjectId() || ''
      // Only update if there's a global project AND current filter is empty (not manually cleared)
      if (pid && !headerFilters.projectId) {
        updateHeaderFilter('projectId', pid)
      }
    } catch {
      // ignore
    }
  }, [useGlobalProjectTx, headerFilters.projectId, updateHeaderFilter])

  useEffect(() => {
    try {
      localStorage.setItem('transactions:useGlobalProject', useGlobalProjectTx ? '1' : '0')
    } catch {
      // ignore
    }
  }, [useGlobalProjectTx])

  return {
    headerFilters,
    headerAppliedFilters,
    headerFiltersDirty,
    updateHeaderFilter,
    applyHeaderFilters,
    resetHeaderFilters,
    useGlobalProjectTx,
    setUseGlobalProjectTx,
    lineFilters,
    updateLineFilter,
    resetLineFilters,
  }
}

export type UseTransactionsFiltersReturn = ReturnType<typeof useTransactionsFilters>
