/**
 * useFilterState - Unified Filter State Management Hook
 * 
 * Provides a consistent way to manage filter state across all pages with:
 * - localStorage persistence
 * - Type-safe filter values
 * - Callback on filter changes
 * - Reset functionality
 */

import { useState, useCallback, useEffect, useRef } from 'react'

export interface FilterState {
  // Search
  search?: string
  
  // Date Range
  dateFrom?: string
  dateTo?: string
  
  // Amount Range
  amountFrom?: string
  amountTo?: string
  
  // Organization & Project
  orgId?: string
  projectId?: string
  
  // Accounts
  debitAccountId?: string
  creditAccountId?: string
  
  // Dimensions
  classificationId?: string
  expensesCategoryId?: string
  workItemId?: string
  analysisWorkItemId?: string
  costCenterId?: string
  
  // Approval Status (enhanced - supports line-level approval)
  approvalStatus?: 'draft' | 'submitted' | 'pending' | 'approved' | 'posted' | 'revision_requested' | 'requires_revision' | 'rejected' | 'cancelled' | string
  
  // User & Scope
  createdBy?: string
  scope?: 'all' | 'my'
}

interface UseFilterStateOptions {
  /** Key for localStorage persistence */
  storageKey?: string
  /** Default filter values */
  defaultValues?: Partial<FilterState>
  /** Callback when filters change (debounced) */
  onFilterChange?: (filters: FilterState) => void
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
}

export function useFilterState(options: UseFilterStateOptions = {}) {
  const { 
    storageKey, 
    defaultValues = {}, 
    onFilterChange,
    debounceMs = 300 
  } = options

  // Load saved values from localStorage
  const [filters, setFilters] = useState<FilterState>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          return { ...defaultValues, ...JSON.parse(saved) }
        }
      } catch {
        // Ignore parse errors
      }
    }
    return defaultValues
  })

  // Track if this is the initial mount
  const isInitialMount = useRef(true)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Save to localStorage and trigger callback on change
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Save to localStorage
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(filters))
      } catch {
        // Ignore storage errors
      }
    }

    // Debounced callback
    if (onFilterChange) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      debounceTimer.current = setTimeout(() => {
        onFilterChange(filters)
      }, debounceMs)
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [filters, storageKey, onFilterChange, debounceMs])

  /**
   * Update a single filter value
   */
  const updateFilter = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value || undefined // Remove empty strings
    }))
  }, [])

  /**
   * Reset all filters to default values
   */
  const resetFilters = useCallback(() => {
    setFilters(defaultValues)
  }, [defaultValues])

  /**
   * Update multiple filters at once
   */
  const setMultipleFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  /**
   * Check if any filters are active (non-default)
   */
  const hasActiveFilters = useCallback(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (!value) return false
      const defaultValue = defaultValues[key as keyof FilterState]
      return value !== defaultValue
    })
  }, [filters, defaultValues])

  /**
   * Get filter count (number of active filters)
   */
  const activeFilterCount = useCallback(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (!value) return false
      const defaultValue = defaultValues[key as keyof FilterState]
      return value !== defaultValue
    }).length
  }, [filters, defaultValues])

  return {
    filters,
    updateFilter,
    resetFilters,
    setMultipleFilters,
    setFilters,
    hasActiveFilters,
    activeFilterCount,
  }
}

export default useFilterState
