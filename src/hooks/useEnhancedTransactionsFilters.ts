import { useEffect, useMemo } from 'react'
import { useTransactionsFilters, UseTransactionsFiltersOptions } from './useTransactionsFilters'
import { useSmartDefaults } from './useSmartDefaults'
import { useScopeOptional } from '../contexts/ScopeContext'

interface UseEnhancedTransactionsFiltersOptions extends UseTransactionsFiltersOptions {
  enableSmartDefaults?: boolean
  userRole?: string
}

/**
 * Enhanced version of useTransactionsFilters that includes:
 * - Smart defaults based on page context and user behavior
 * - Visual scope indicators
 * - Filter suggestions and recommendations
 * - User preference learning
 */
export const useEnhancedTransactionsFilters = (options: UseEnhancedTransactionsFiltersOptions = {}) => {
  const { 
    pageScope = 'transactions_header', 
    resetPageFiltersOnMount = false,
    enableSmartDefaults = true,
    userRole
  } = options

  // Get base filter functionality
  const baseFilters = useTransactionsFilters({
    pageScope,
    resetPageFiltersOnMount
  })

  const scope = useScopeOptional()
  const currentUserId = scope?.currentUser?.id

  // Get smart defaults and suggestions
  const smartDefaults = useSmartDefaults({
    pageScope,
    userId: currentUserId,
    userRole,
    enabled: enableSmartDefaults
  })

  // Apply smart defaults on initial load if no filters are set
  useEffect(() => {
    if (!enableSmartDefaults || !smartDefaults.smartDefaults) return

    const hasAnyFilters = Object.values(baseFilters.headerFilters).some(value => 
      value && value !== ''
    )

    // Only apply smart defaults if no filters are currently set
    if (!hasAnyFilters) {
      Object.entries(smartDefaults.smartDefaults).forEach(([key, value]) => {
        if (value && value !== '') {
          baseFilters.updateHeaderFilter(key as any, value as string)
        }
      })
    }
  }, [enableSmartDefaults, smartDefaults.smartDefaults, baseFilters])

  // Save user preferences when filters are applied
  const enhancedApplyFilters = () => {
    baseFilters.applyHeaderFilters()
    
    // Learn from user behavior
    if (enableSmartDefaults && currentUserId) {
      smartDefaults.saveUserPreferences(baseFilters.headerFilters)
    }
  }

  // Enhanced reset that considers smart defaults
  const enhancedResetFilters = () => {
    baseFilters.resetHeaderFilters()
    
    // Apply smart defaults after reset if enabled
    if (enableSmartDefaults && smartDefaults.smartDefaults) {
      setTimeout(() => {
        Object.entries(smartDefaults.smartDefaults).forEach(([key, value]) => {
          if (value && value !== '') {
            baseFilters.updateHeaderFilter(key as any, value as string)
          }
        })
      }, 0)
    }
  }

  // Get filter scope information for visual indicators
  const filterScopeInfo = useMemo(() => {
    const globalFilters = ['orgId', 'projectId']
    const pageFilters = ['search', 'dateFrom', 'dateTo', 'classificationId', 'costCenterId', 'workItemId', 'analysisWorkItemId']
    const sessionFilters = ['approvalStatus']

    return {
      global: globalFilters.reduce((acc, key) => {
        acc[key] = baseFilters.headerFilters[key as keyof typeof baseFilters.headerFilters]
        return acc
      }, {} as Record<string, any>),
      
      page: pageFilters.reduce((acc, key) => {
        acc[key] = baseFilters.headerFilters[key as keyof typeof baseFilters.headerFilters]
        return acc
      }, {} as Record<string, any>),
      
      session: sessionFilters.reduce((acc, key) => {
        acc[key] = baseFilters.headerFilters[key as keyof typeof baseFilters.headerFilters]
        return acc
      }, {} as Record<string, any>)
    }
  }, [baseFilters.headerFilters])

  // Get active filter count by scope
  const activeFilterCounts = useMemo(() => {
    const countActiveFilters = (filters: Record<string, any>) => 
      Object.values(filters).filter(value => value && value !== '').length

    return {
      global: countActiveFilters(filterScopeInfo.global),
      page: countActiveFilters(filterScopeInfo.page),
      session: countActiveFilters(filterScopeInfo.session),
      total: countActiveFilters(baseFilters.headerFilters)
    }
  }, [filterScopeInfo, baseFilters.headerFilters])

  return {
    // Base filter functionality
    ...baseFilters,
    
    // Enhanced methods
    applyHeaderFilters: enhancedApplyFilters,
    resetHeaderFilters: enhancedResetFilters,
    
    // Smart defaults functionality
    smartDefaults: smartDefaults.smartDefaults,
    suggestions: smartDefaults.suggestions,
    saveUserPreferences: smartDefaults.saveUserPreferences,
    getUserPreferences: smartDefaults.getUserPreferences,
    
    // Scope information for visual indicators
    filterScopeInfo,
    activeFilterCounts,
    
    // Page context information
    pageContext: smartDefaults.pageContext,
    
    // Helper methods
    hasSmartDefaults: enableSmartDefaults && Object.keys(smartDefaults.smartDefaults).length > 0,
    hasActiveFilters: activeFilterCounts.total > 0,
    
    // Apply smart default for specific filter
    applySmartDefault: (filterKey: string) => {
      const defaultValue = smartDefaults.smartDefaults[filterKey]
      if (defaultValue && defaultValue !== '') {
        baseFilters.updateHeaderFilter(filterKey as any, defaultValue as string)
      }
    },
    
    // Reset specific scope filters
    resetScopeFilters: (scope: 'global' | 'page' | 'session') => {
      const filtersToReset = Object.keys(filterScopeInfo[scope])
      filtersToReset.forEach(key => {
        baseFilters.updateHeaderFilter(key as any, '')
      })
    }
  }
}

export type UseEnhancedTransactionsFiltersReturn = ReturnType<typeof useEnhancedTransactionsFilters>