/**
 * TransactionsDataContext - Centralized Data Provider for Transactions Pages
 * Refactored to use React Query & Realtime Sync (Phase 1)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAccounts, getCurrentUserId, type Account, type Project } from '../services/transactions'
import { getAllTransactionClassifications, type TransactionClassification } from '../services/transaction-classification'
import { getExpensesCategoriesList } from '../services/sub-tree'
import { getCostCentersForSelector } from '../services/cost-centers'
import { listWorkItemsAll } from '../services/work-items'
import { listAnalysisWorkItems } from '../services/analysis-work-items'
import type { Organization } from '../types'
import type { ExpensesCategoryRow } from '../types/sub-tree'
import type { WorkItemRow } from '../types/work-items'

import { queryKeys } from '../lib/queryKeys'
import { useUnifiedSync } from '../hooks/useUnifiedSync'
import { useAuthScopeData } from '../hooks/useAuthScopeData'
import { useScopeOptional } from './ScopeContext'
import { getConnectionMonitor } from '../utils/connectionMonitor'

// Cost center type with org_id for filtering
export interface CostCenterOption {
  id: string
  code: string
  name: string
  name_ar?: string | null
  project_id?: string | null
  org_id?: string
  level: number
}

// Analysis work item for label lookups
export interface AnalysisWorkItemLabel {
  id: string
  code: string
  name: string
}

export interface TransactionsDataContextValue {
  // Reference data
  organizations: Organization[]
  projects: Project[]
  accounts: Account[]
  costCenters: CostCenterOption[]
  workItems: WorkItemRow[]
  categories: ExpensesCategoryRow[]
  classifications: TransactionClassification[]
  analysisItemsMap: Record<string, AnalysisWorkItemLabel>

  // Current user
  currentUserId: string | null

  // Loading states
  isLoading: boolean
  isRefreshing: boolean
  error: string | null

  // Filtered data getters (for org/project specific filtering)
  getCostCentersForOrg: (orgId: string, projectId?: string | null) => CostCenterOption[]
  getWorkItemsForOrg: (orgId: string) => WorkItemRow[]
  getCategoriesForOrg: (orgId: string) => ExpensesCategoryRow[]

  // On-demand loading functions
  loadDimensionsForOrg: (orgId: string) => Promise<void>
  ensureDimensionsLoaded: (orgIds: string[]) => Promise<void>

  // Refresh functions
  refreshAll: () => Promise<void>
  refreshDimensions: (orgId: string, projectId?: string | null) => Promise<void>
  refreshAnalysisItems: (orgId: string, projectId?: string | null) => Promise<void>
}

export const TransactionsDataContext = createContext<TransactionsDataContextValue | null>(null)

export const useTransactionsData = (): TransactionsDataContextValue => {
  const context = useContext(TransactionsDataContext)
  if (!context) {
    throw new Error('useTransactionsData must be used within a TransactionsDataProvider')
  }
  return context
}

interface TransactionsDataProviderProps {
  children: React.ReactNode
}

export const TransactionsDataProvider: React.FC<TransactionsDataProviderProps> = ({ children }) => {
  const queryClient = useQueryClient()
  const scope = useScopeOptional()
  const currentOrgId = scope?.currentOrg?.id

  // =========================================================================
  // 1. CORE DATA (React Query)
  // =========================================================================

  // Accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: queryKeys.accounts.all(),
    queryFn: () => getAccounts(null), // Pass null for orgId to get all accounts
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: getConnectionMonitor().getHealth().isOnline,
  })

  // Use Unified Auth Data
  const authScopeData = useAuthScopeData();
  const organizationsFromAuth = authScopeData.organizations;
  const projectsFromAuth = authScopeData.projects;

  // Manual queries only for non-unified data

  // Classifications
  const { data: classifications = [], isLoading: classLoading } = useQuery({
    queryKey: queryKeys.classifications.all(),
    queryFn: getAllTransactionClassifications,
    staleTime: Infinity,
    enabled: getConnectionMonitor().getHealth().isOnline,
  })

  // Current User
  const { data: currentUserId = null, isLoading: userLoading } = useQuery({
    queryKey: ['current_user_id'],
    queryFn: getCurrentUserId,
    staleTime: Infinity,
    enabled: getConnectionMonitor().getHealth().isOnline,
  })

  // =========================================================================
  // 2. REALTIME SUBSCRIPTIONS
  // =========================================================================

  // Auto-refresh accounts on change
  // Auto-refresh accounts on change
  useUnifiedSync({
    channelId: 'context-accounts-sync',
    tables: ['accounts'],
    onDataChange: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
    }
  })

  // Redundant sync hooks removed (now handled by auth state)

  // =========================================================================
  // 3. DIMENSIONS (Manual State - preserved for "Accumulate" behavior)
  // =========================================================================
  // In Phase 2/3, we can migrate these to useQueries or normalized cache

  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([])
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([])
  const [categories, setCategories] = useState<ExpensesCategoryRow[]>([])
  const [analysisItemsMap, setAnalysisItemsMap] = useState<Record<string, AnalysisWorkItemLabel>>({})

  // Tracks which orgs we have fully loaded dimensions for
  const loadedDimensionsRef = useRef<Set<string>>(new Set())

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [compLoading, setCompLoading] = useState(false) // Computation loading
  const [error, setError] = useState<string | null>(null)

  // Combined loading state
  const isLoading = accountsLoading || classLoading || userLoading || compLoading || !authScopeData.isReady

  /**
   * Load dimension data (cost centers, work items, categories) for a specific org
   */
  const loadDimensionsForOrg = useCallback(async (orgId: string) => {
    if (loadedDimensionsRef.current.has(orgId)) return

    const monitor = getConnectionMonitor()
    if (!monitor.getHealth().isOnline) return

    try {
      const [newCats, newCenters, newItems] = await Promise.all([
        getExpensesCategoriesList(orgId).catch(() => []),
        getCostCentersForSelector(orgId)
          .then(list => list.map(cc => ({ ...cc, org_id: orgId })))
          .catch(() => []),
        listWorkItemsAll(orgId).catch(() => []),
      ])

      // Merge avoiding duplicates
      setCategories(prev => {
        const existing = new Set(prev.map(c => c.id))
        return [...prev, ...newCats.filter(c => !existing.has(c.id))]
      })

      setCostCenters(prev => {
        const existing = new Set(prev.map(c => c.id))
        return [...prev, ...newCenters.filter(c => !existing.has(c.id))]
      })

      setWorkItems(prev => {
        const existing = new Set(prev.map(c => c.id))
        return [...prev, ...newItems.filter(c => !existing.has(c.id))]
      })

      loadedDimensionsRef.current.add(orgId)
    } catch (err) {
      console.warn(`Failed to load dimensions for org ${orgId}`, err)
    }
  }, [])

  /**
   * Load analysis items for given organizations
   */
  const loadAnalysisItems = useCallback(async (orgs: Organization[]) => {
    if (!orgs.length) return
    const monitor = getConnectionMonitor()
    if (!monitor.getHealth().isOnline) return
    try {
      const allItems = await Promise.all(
        orgs.map(org =>
          listAnalysisWorkItems({
            orgId: org.id,
            projectId: null,
            includeInactive: true,
          }).catch(() => [])
        )
      )

      setAnalysisItemsMap(prev => {
        const next = { ...prev }
        allItems.flat().forEach(item => {
          next[item.id] = { id: item.id, code: item.code, name: item.name }
        })
        return next
      })
    } catch (err) {
      console.warn('Failed to load analysis items', err)
    }
  }, [])

  /**
   * Ensure dimensions are loaded (batch helper)
   */
  const ensureDimensionsLoaded = useCallback(async (orgIds: string[]) => {
    const unloaded = orgIds.filter(id => !loadedDimensionsRef.current.has(id))
    if (!unloaded.length) return

    setCompLoading(true)
    const batchSize = 3
    try {
      for (let i = 0; i < unloaded.length; i += batchSize) {
        await Promise.all(unloaded.slice(i, i + batchSize).map(loadDimensionsForOrg))
      }
    } finally {
      setCompLoading(false)
    }
  }, [loadDimensionsForOrg])

  /**
   * Initial Load Effect
   * Targeted loading: only fetch dimensions for the CURRENT organization.
   * This fixes the 15s login delay caused by bulk-fetching up to 45 orgs at once.
   */
  useEffect(() => {
    if (!authScopeData.isReady || !currentOrgId) return

    // Load dimensions only for the current organization in scope
    ensureDimensionsLoaded([currentOrgId])

    // Load analysis items only for the current organization
    const org = organizationsFromAuth.find(o => o.id === currentOrgId)
    if (org) {
      loadAnalysisItems([org])
    }
  }, [currentOrgId, authScopeData.isReady, organizationsFromAuth, ensureDimensionsLoaded, loadAnalysisItems])


  /**
   * Refresh All
   * 1. Invalidates core React Query caches
   * 2. Clears functionality of dimension cache to force re-fetch
   */
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // 1. Invalidate core data and refresh auth profile
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.classifications.all() }),
        authScopeData.refresh(),
      ])

      // 2. Clear dimension cache markers so next ensureLoaded fetches fresh data
      loadedDimensionsRef.current.clear()

      // 3. Re-fetch for currently known orgs
      if (organizationsFromAuth.length > 0) {
        // We only re-fetch for orgs that were previously loaded?
        // Or just all if small count.
        // Let's re-run the auto-load logic by triggering ensureDimensionsLoaded
        await ensureDimensionsLoaded(organizationsFromAuth.map(o => o.id))
        await loadAnalysisItems(organizationsFromAuth)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient, organizationsFromAuth, ensureDimensionsLoaded, loadAnalysisItems])

  /**
   * Specific Refresh (Project/Dim)
   */
  const refreshDimensions = useCallback(async (orgId: string, projectId?: string | null) => {
    // For specific refresh, we just re-run the manual fetchers and merge updates
    if (!orgId) return
    setIsRefreshing(true)
    try {
      // Invalidate cache for this org if we had one?
      // Since we don't use React Query for dimensions yet, we manually fetch:

      const [cats, centers, wix] = await Promise.all([
        getExpensesCategoriesList(orgId).catch(() => []),
        getCostCentersForSelector(orgId, projectId)
          .then(list => list.map(cc => ({ ...cc, org_id: orgId })))
          .catch(() => []),
        listWorkItemsAll(orgId).catch(() => []),
      ])

      // Force merge (even if exists)
      setCategories(prev => {
        const map = new Map(prev.map(item => [item.id, item]))
        cats.forEach(item => map.set(item.id, item))
        return Array.from(map.values())
      })

      setCostCenters(prev => {
        const map = new Map(prev.map(item => [item.id, item]))
        centers.forEach(item => map.set(item.id, item))
        return Array.from(map.values())
      })

      setWorkItems(prev => {
        const map = new Map(prev.map(item => [item.id, item]))
        wix.forEach(item => map.set(item.id, item))
        return Array.from(map.values())
      })

      loadedDimensionsRef.current.add(orgId)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const refreshAnalysisItems = useCallback(async () => {
    await loadAnalysisItems(organizationsFromAuth)
  }, [loadAnalysisItems, organizationsFromAuth])

  // =========================================================================
  // Getters
  // =========================================================================

  const getCostCentersForOrg = useCallback((orgId: string, projectId?: string | null): CostCenterOption[] => {
    return costCenters.filter(cc => {
      if (cc.org_id && cc.org_id !== orgId) return false
      // Strict project filtering? Original had logic:
      if (projectId && cc.project_id && cc.project_id !== projectId) return false
      return true
    })
  }, [costCenters])

  const getWorkItemsForOrg = useCallback((orgId: string): WorkItemRow[] => {
    // Loose check to allow shared items if any
    return workItems.filter(wi => (wi as any).org_id === orgId || !(wi as any).org_id)
  }, [workItems])

  const getCategoriesForOrg = useCallback((orgId: string): ExpensesCategoryRow[] => {
    return categories.filter(cat => (cat as any).org_id === orgId || !(cat as any).org_id)
  }, [categories])

  // Memoize value
  const value = useMemo<TransactionsDataContextValue>(() => ({
    organizations: organizationsFromAuth,
    projects: projectsFromAuth,
    accounts,
    costCenters,
    workItems,
    categories,
    classifications,
    analysisItemsMap,
    currentUserId,
    isLoading,
    isRefreshing,
    error,
    getCostCentersForOrg,
    getWorkItemsForOrg,
    getCategoriesForOrg,
    loadDimensionsForOrg,
    ensureDimensionsLoaded,
    refreshAll,
    refreshDimensions,
    refreshAnalysisItems,
  }), [
    organizationsFromAuth, projectsFromAuth, accounts, costCenters, workItems, categories, classifications, analysisItemsMap,
    currentUserId, isLoading, isRefreshing, error,
    getCostCentersForOrg, getWorkItemsForOrg, getCategoriesForOrg,
    loadDimensionsForOrg, ensureDimensionsLoaded,
    refreshAll, refreshDimensions, refreshAnalysisItems
  ])

  return (
    <TransactionsDataContext.Provider value={value}>
      {children}
    </TransactionsDataContext.Provider>
  )
}

export default TransactionsDataProvider
