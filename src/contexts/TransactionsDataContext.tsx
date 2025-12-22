/**
 * TransactionsDataContext - Centralized Data Provider for Transactions Pages
 * Refactored to use React Query & Realtime Sync (Phase 1)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAccounts, getProjects, getCurrentUserId, type Account, type Project } from '../services/transactions'
import { getOrganizations } from '../services/organization'
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

  // =========================================================================
  // 1. CORE DATA (React Query)
  // =========================================================================

  // Accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: queryKeys.accounts.all(),
    queryFn: () => getAccounts(null), // Pass null for orgId to get all accounts
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: queryKeys.projects.all(),
    queryFn: getProjects,
    staleTime: 5 * 60 * 1000,
  })

  // Organizations
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: queryKeys.organizations.all(),
    queryFn: getOrganizations,
    staleTime: Infinity, // Rarely changes
  })

  // Classifications
  const { data: classifications = [], isLoading: classLoading } = useQuery({
    queryKey: queryKeys.classifications.all(),
    queryFn: getAllTransactionClassifications,
    staleTime: Infinity,
  })

  // Current User
  const { data: currentUserId = null, isLoading: userLoading } = useQuery({
    queryKey: ['current_user_id'],
    queryFn: getCurrentUserId,
    staleTime: Infinity,
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

  // Auto-refresh projects on change
  useUnifiedSync({
    channelId: 'context-projects-sync',
    tables: ['projects'],
    onDataChange: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() })
    }
  })

  // Auto-refresh organizations on change
  useUnifiedSync({
    channelId: 'context-orgs-sync',
    tables: ['organizations'],
    onDataChange: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all() })
    }
  })

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
  const isLoading = accountsLoading || projectsLoading || orgsLoading || classLoading || userLoading || compLoading

  /**
   * Load dimension data (cost centers, work items, categories) for a specific org
   */
  const loadDimensionsForOrg = useCallback(async (orgId: string) => {
    if (loadedDimensionsRef.current.has(orgId)) return

    // Check if we already have a promise pending for this org? (Could add optimization)
    // For now, proceed.

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
   * Attempt to load dimensions for ALL available organizations on mount if not too many
   * to replicate original behavior of "loadAllDimensions"
   */
  useEffect(() => {
    if (orgsLoading || !organizations.length) return

    // If < 10 orgs, load all dimensions automatically
    if (organizations.length > 0 && organizations.length < 10) {
      ensureDimensionsLoaded(organizations.map(o => o.id))
      loadAnalysisItems(organizations)
    }
  }, [organizations, orgsLoading, ensureDimensionsLoaded, loadAnalysisItems])


  /**
   * Refresh All
   * 1. Invalidates core React Query caches
   * 2. Clears functionality of dimension cache to force re-fetch
   */
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // 1. Invalidate core data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.classifications.all() }),
      ])

      // 2. Clear dimension cache markers so next ensureLoaded fetches fresh data
      loadedDimensionsRef.current.clear()

      // 3. Re-fetch for currently known orgs
      if (organizations.length > 0) {
        // We only re-fetch for orgs that were previously loaded? 
        // Or just all if small count. 
        // Let's re-run the auto-load logic by triggering ensureDimensionsLoaded
        await ensureDimensionsLoaded(organizations.map(o => o.id))
        await loadAnalysisItems(organizations)
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient, organizations, ensureDimensionsLoaded, loadAnalysisItems])

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
    await loadAnalysisItems(organizations)
  }, [loadAnalysisItems, organizations])

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
    organizations,
    projects,
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
    organizations, projects, accounts, costCenters, workItems, categories, classifications, analysisItemsMap,
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
