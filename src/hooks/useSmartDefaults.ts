import { useEffect, useMemo } from 'react'
import { FilterState } from './useFilterState'
import { smartDefaultsEngine, PageContext } from '../services/filters/SmartDefaultsEngine'
import { useScopeOptional } from '../contexts/ScopeContext'

interface UseSmartDefaultsOptions {
  pageScope: string
  userId?: string
  userRole?: string
  enabled?: boolean
}

export const useSmartDefaults = (options: UseSmartDefaultsOptions) => {
  const { pageScope, userId, userRole, enabled = true } = options
  const scope = useScopeOptional()

  // Initialize user preferences on mount
  useEffect(() => {
    if (enabled && userId) {
      smartDefaultsEngine.initializeUser(userId)
    }
  }, [enabled, userId])

  // Build page context
  const pageContext: PageContext = useMemo(() => ({
    pageScope,
    userId,
    orgId: scope?.currentOrg?.id,
    projectId: scope?.currentProject?.id,
    userRole
  }), [pageScope, userId, scope?.currentOrg?.id, scope?.currentProject?.id, userRole])

  // Get smart defaults
  const smartDefaults = useMemo(() => {
    if (!enabled) return {}
    return smartDefaultsEngine.getPageDefaults(pageContext)
  }, [enabled, pageContext])

  // Get suggestions
  const suggestions = useMemo(() => {
    if (!enabled) return []
    return smartDefaultsEngine.getSuggestions(pageContext)
  }, [enabled, pageContext])

  // Save user preferences
  const saveUserPreferences = (filters: Partial<FilterState>) => {
    if (enabled && userId) {
      smartDefaultsEngine.setUserPreferences(userId, pageScope, filters)
    }
  }

  // Get user preferences
  const getUserPreferences = () => {
    if (!enabled || !userId) return null
    return smartDefaultsEngine.getUserPreferences(userId, pageScope)
  }

  return {
    smartDefaults,
    suggestions,
    saveUserPreferences,
    getUserPreferences,
    pageContext
  }
}

export default useSmartDefaults