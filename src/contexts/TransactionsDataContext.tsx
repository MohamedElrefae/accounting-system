/**
 * TransactionsDataContext - Centralized Data Provider for Transactions Pages
 * 
 * This context provides a single source of truth for all reference data used across
 * the Transactions pages (/transactions/my and /transactions/all), including:
 * - Organizations
 * - Projects
 * - Accounts
 * - Cost Centers
 * - Work Items
 * - Expense Categories
 * - Classifications
 * - Analysis Work Items
 * 
 * Benefits:
 * 1. Single data fetch on page load - no redundant API calls
 * 2. Consistent data across all components (wizard, filter bar, details panel)
 * 3. Faster page load times
 * 4. Centralized refresh mechanism
 * 5. Type-safe data access
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
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

const TransactionsDataContext = createContext<TransactionsDataContextValue | null>(null)

let sharedInitPromise: Promise<void> | null = null
let sharedSnapshot: {
  organizations: Organization[]
  projects: Project[]
  accounts: Account[]
  costCenters: CostCenterOption[]
  workItems: WorkItemRow[]
  categories: ExpensesCategoryRow[]
  classifications: TransactionClassification[]
  analysisItemsMap: Record<string, AnalysisWorkItemLabel>
  currentUserId: string | null
  loadedOrgIds: string[]
} | null = null

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
  // Core reference data
  const [organizations, setOrganizations] = useState<Organization[]>(() => sharedSnapshot?.organizations ?? [])
  const [projects, setProjects] = useState<Project[]>(() => sharedSnapshot?.projects ?? [])
  const [accounts, setAccounts] = useState<Account[]>(() => sharedSnapshot?.accounts ?? [])
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>(() => sharedSnapshot?.costCenters ?? [])
  const [workItems, setWorkItems] = useState<WorkItemRow[]>(() => sharedSnapshot?.workItems ?? [])
  const [categories, setCategories] = useState<ExpensesCategoryRow[]>(() => sharedSnapshot?.categories ?? [])
  const [classifications, setClassifications] = useState<TransactionClassification[]>(() => sharedSnapshot?.classifications ?? [])
  const [analysisItemsMap, setAnalysisItemsMap] = useState<Record<string, AnalysisWorkItemLabel>>(
    () => sharedSnapshot?.analysisItemsMap ?? {}
  )
  
  // User state
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => sharedSnapshot?.currentUserId ?? null)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(() => !sharedSnapshot)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Track loaded dimensions to avoid redundant fetches
  const loadedDimensionsRef = useRef<Set<string>>(new Set(sharedSnapshot?.loadedOrgIds ?? []))
  const initialLoadCompleteRef = useRef(!!sharedSnapshot)

  /**
   * Load core reference data (organizations, projects, accounts, classifications, user)
   * This is called once on mount
   */
  const loadCoreData = useCallback(async (opts?: { applyState?: boolean }) => {
    console.log('📦 TransactionsDataProvider: Loading core reference data...')
    const applyState = opts?.applyState ?? true
    
    try {
      const [accs, projectsList, orgsList, classificationsList, uid] = await Promise.all([
        getAccounts(),
        getProjects().catch(() => []),
        getOrganizations().catch(() => []),
        getAllTransactionClassifications().catch(() => []),
        getCurrentUserId(),
      ])
      
      if (applyState) {
        setAccounts(accs)
        setProjects(projectsList)
        setOrganizations(orgsList)
        setClassifications(classificationsList)
        setCurrentUserId(uid)
      }
      
      console.log('✅ TransactionsDataProvider: Core data loaded', {
        accounts: accs.length,
        projects: projectsList.length,
        organizations: orgsList.length,
        classifications: classificationsList.length,
        userId: uid
      })
      
      return {
        accs,
        projectsList,
        orgsList,
        classificationsList,
        uid,
      }
    } catch (err: any) {
      console.error('❌ TransactionsDataProvider: Failed to load core data', err)
      if (applyState) {
        setError(err.message || 'فشل تحميل البيانات الأساسية')
      }
      throw err
    }
  }, [])

  /**
   * Load dimension data (cost centers, work items, categories) for all organizations
   * This is called after core data is loaded
   */
  const loadAllDimensions = useCallback(async (orgs: Organization[], opts?: { applyState?: boolean }) => {
    if (!orgs.length) {
      console.log('📦 TransactionsDataProvider: No organizations, skipping dimension load')
      return { categories: [], costCenters: [], workItems: [] }
    }

    const applyState = opts?.applyState ?? true
    
    console.log('📦 TransactionsDataProvider: Loading dimensions for', orgs.length, 'organizations...')
    
    try {
      const [categoryLists, costCenterLists, workItemLists] = await Promise.all([
        Promise.all(orgs.map(org =>
          getExpensesCategoriesList(org.id).catch(err => {
            console.warn('Failed to load categories for org', org.id, err)
            return []
          })
        )),
        Promise.all(orgs.map(org =>
          getCostCentersForSelector(org.id)
            .then(list => list.map(cc => ({ ...cc, org_id: org.id })))
            .catch(err => {
              console.warn('Failed to load cost centers for org', org.id, err)
              return []
            })
        )),
        Promise.all(orgs.map(org =>
          listWorkItemsAll(org.id).catch(err => {
            console.warn('Failed to load work items for org', org.id, err)
            return []
          })
        )),
      ])
      
      // Merge and dedupe
      const mergedCategories: Record<string, ExpensesCategoryRow> = {}
      categoryLists.forEach(list => {
        list.forEach(cat => { mergedCategories[cat.id] = cat })
      })
      
      const mergedCostCenters: Record<string, CostCenterOption> = {}
      costCenterLists.forEach(list => {
        list.forEach(cc => { mergedCostCenters[cc.id] = cc as CostCenterOption })
      })
      
      const mergedWorkItems: Record<string, WorkItemRow> = {}
      workItemLists.forEach(list => {
        list.forEach(item => { mergedWorkItems[item.id] = item })
      })
      
      if (applyState) {
        setCategories(Object.values(mergedCategories))
        setCostCenters(Object.values(mergedCostCenters))
        setWorkItems(Object.values(mergedWorkItems))

        // Mark all orgs as loaded
        orgs.forEach(org => loadedDimensionsRef.current.add(org.id))
      }
      
      console.log('✅ TransactionsDataProvider: Dimensions loaded', {
        categories: Object.keys(mergedCategories).length,
        costCenters: Object.keys(mergedCostCenters).length,
        workItems: Object.keys(mergedWorkItems).length
      })

      return {
        categories: Object.values(mergedCategories),
        costCenters: Object.values(mergedCostCenters),
        workItems: Object.values(mergedWorkItems),
      }
    } catch (err) {
      console.error('❌ TransactionsDataProvider: Failed to load dimensions', err)
      return { categories: [], costCenters: [], workItems: [] }
    }
  }, [])

  /**
   * Load analysis work items for label lookups - loads for ALL organizations
   */
  const loadAnalysisItems = useCallback(async (orgs: Organization[], opts?: { applyState?: boolean }) => {
    if (!orgs.length) return {}

    const applyState = opts?.applyState ?? true
    
    try {
      console.log('📦 TransactionsDataProvider: Loading analysis items for', orgs.length, 'organizations...')
      
      const allItems = await Promise.all(
        orgs.map(org =>
          listAnalysisWorkItems({
            orgId: org.id,
            projectId: null,
            onlyWithTx: false,
            includeInactive: true,
          }).catch(err => {
            console.warn('Failed to load analysis items for org', org.id, err)
            return []
          })
        )
      )
      
      const map: Record<string, AnalysisWorkItemLabel> = {}
      for (const list of allItems) {
        for (const a of list) {
          map[a.id] = { id: a.id, code: a.code, name: a.name }
        }
      }
      
      if (applyState) {
        setAnalysisItemsMap(map)
      }
      console.log('✅ TransactionsDataProvider: Analysis items loaded', Object.keys(map).length)
      return map
    } catch (err) {
      console.warn('Failed to load analysis items', err)
      return {}
    }
  }, [])

  /**
   * Load dimensions for a specific organization on-demand
   */
  const loadDimensionsForOrg = useCallback(async (orgId: string) => {
    if (loadedDimensionsRef.current.has(orgId)) {
      console.log(`📦 Dimensions for org ${orgId} already loaded`)
      return
    }
    
    console.log(`📦 Loading dimensions for org ${orgId} on-demand...`)
    
    try {
      const [categories, costCenters, workItems] = await Promise.all([
        getExpensesCategoriesList(orgId).catch(() => []),
        getCostCentersForSelector(orgId)
          .then(list => list.map(cc => ({ ...cc, org_id: orgId })))
          .catch(() => []),
        listWorkItemsAll(orgId).catch(() => []),
      ])
      
      // Merge with existing data
      setCategories(prev => {
        const existing = new Set(prev.map(cat => cat.id))
        const newCategories = categories.filter(cat => !existing.has(cat.id))
        return [...prev, ...newCategories]
      })
      
      setCostCenters(prev => {
        const existing = new Set(prev.map(cc => cc.id))
        const newCenters = costCenters.filter(cc => !existing.has(cc.id))
        return [...prev, ...newCenters]
      })
      
      setWorkItems(prev => {
        const existing = new Set(prev.map(wi => wi.id))
        const newItems = workItems.filter(wi => !existing.has(wi.id))
        return [...prev, ...newItems]
      })
      
      loadedDimensionsRef.current.add(orgId)
      console.log(`✅ Dimensions loaded for org ${orgId}`)
    } catch (err) {
      console.warn(`Failed to load dimensions for org ${orgId}`, err)
    }
  }, [])

  /**
   * Ensure dimensions are loaded for given organizations
   */
  const ensureDimensionsLoaded = useCallback(async (orgIds: string[]) => {
    const unloadedOrgs = orgIds.filter(id => !loadedDimensionsRef.current.has(id))
    if (unloadedOrgs.length === 0) return
    
    console.log(`📦 Loading dimensions for ${unloadedOrgs.length} organizations...`)
    // Load dimensions in batches of 3 to avoid overwhelming the API
    const batchSize = 3
    for (let i = 0; i < unloadedOrgs.length; i += batchSize) {
      const batch = unloadedOrgs.slice(i, i + batchSize)
      await Promise.all(batch.map(orgId => loadDimensionsForOrg(orgId)))
    }
  }, [loadDimensionsForOrg])

  /**
   * Initial data load on mount - Load all data as it was originally working
   */
  useEffect(() => {
    if (initialLoadCompleteRef.current) return
    
    let cancelled = false

    const applyShared = () => {
      if (!sharedSnapshot) return
      setOrganizations(sharedSnapshot.organizations)
      setProjects(sharedSnapshot.projects)
      setAccounts(sharedSnapshot.accounts)
      setClassifications(sharedSnapshot.classifications)
      setCurrentUserId(sharedSnapshot.currentUserId)
      setCategories(sharedSnapshot.categories)
      setCostCenters(sharedSnapshot.costCenters)
      setWorkItems(sharedSnapshot.workItems)
      setAnalysisItemsMap(sharedSnapshot.analysisItemsMap)
      loadedDimensionsRef.current = new Set(sharedSnapshot.loadedOrgIds)
      initialLoadCompleteRef.current = true
      setIsLoading(false)
    }

    if (sharedSnapshot) {
      applyShared()
      return () => {
        cancelled = true
      }
    }

    if (sharedInitPromise) {
      sharedInitPromise
        .then(() => {
          if (!cancelled) applyShared()
        })
        .catch(() => {
          // ignore
        })

      return () => {
        cancelled = true
      }
    }
    
    const init = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // Load core data first
        const core = await loadCoreData({ applyState: false })
        const orgs = core.orgsList

        // Publish core snapshot ASAP so UI can render while heavy dimensions load in background
        sharedSnapshot = {
          organizations: orgs,
          projects: core.projectsList,
          accounts: core.accs,
          costCenters: [],
          workItems: [],
          categories: [],
          classifications: core.classificationsList,
          analysisItemsMap: {},
          currentUserId: core.uid,
          loadedOrgIds: [],
        }

        if (!cancelled) {
          applyShared()
        }
        
        // Load all dimensions as originally working - this is required for cost analysis
        const dims = await loadAllDimensions(orgs, { applyState: false })
        
        // Load analysis items
        const analysisMap = await loadAnalysisItems(orgs, { applyState: false })

        // Hydrate full snapshot once heavy dimensions are ready
        if (sharedSnapshot) {
          sharedSnapshot = {
            ...sharedSnapshot,
            costCenters: dims.costCenters,
            workItems: dims.workItems,
            categories: dims.categories,
            analysisItemsMap: analysisMap,
            loadedOrgIds: orgs.map(o => o.id),
          }
        }

        if (!cancelled) {
          applyShared()
          console.log('🚀 TransactionsDataProvider: Initial load complete - original functionality restored')
        }
      } catch (err) {
        console.error('❌ Initial load failed', err)
        if (!cancelled) setError('فشل تحميل البيانات')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    const run = async () => {
      if (!sharedInitPromise) {
        sharedInitPromise = init().catch((e) => {
          sharedInitPromise = null
          throw e
        })
      }

      await sharedInitPromise
    }

    run().catch(() => {
      // ignore
    })
    
    return () => { cancelled = true }
  }, [loadCoreData, loadAllDimensions, loadAnalysisItems])

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    loadedDimensionsRef.current.clear()
    
    try {
      const core = await loadCoreData()
      const orgs = core.orgsList
      await loadAllDimensions(orgs)
      await loadAnalysisItems(orgs)
    } finally {
      setIsRefreshing(false)
    }
  }, [loadCoreData, loadAllDimensions, loadAnalysisItems])

  /**
   * Refresh dimensions for a specific org/project
   */
  const refreshDimensions = useCallback(async (orgId: string, projectId?: string | null) => {
    if (!orgId) return
    
    setIsRefreshing(true)
    
    try {
      const [cats, centers, wix] = await Promise.all([
        getExpensesCategoriesList(orgId).catch(() => []),
        getCostCentersForSelector(orgId, projectId)
          .then(list => list.map(cc => ({ ...cc, org_id: orgId })))
          .catch(() => []),
        listWorkItemsAll(orgId).catch(() => []),
      ])
      
      // Merge with existing data
      setCategories(prev => {
        const map: Record<string, ExpensesCategoryRow> = {}
        prev.forEach(c => { map[c.id] = c })
        cats.forEach(c => { map[c.id] = c })
        return Object.values(map)
      })
      
      setCostCenters(prev => {
        const map: Record<string, CostCenterOption> = {}
        prev.forEach(c => { map[c.id] = c })
        centers.forEach(c => { map[c.id] = c as CostCenterOption })
        return Object.values(map)
      })
      
      setWorkItems(prev => {
        const map: Record<string, WorkItemRow> = {}
        prev.forEach(c => { map[c.id] = c })
        wix.forEach(c => { map[c.id] = c })
        return Object.values(map)
      })
      
      loadedDimensionsRef.current.add(orgId)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  /**
   * Refresh analysis items - reloads for all organizations
   */
  const refreshAnalysisItems = useCallback(async () => {
    await loadAnalysisItems(organizations)
  }, [loadAnalysisItems, organizations])

  /**
   * Get cost centers filtered by org and optionally project
   */
  const getCostCentersForOrg = useCallback((orgId: string, projectId?: string | null): CostCenterOption[] => {
    return costCenters.filter(cc => {
      if (cc.org_id && cc.org_id !== orgId) return false
      if (projectId && cc.project_id && cc.project_id !== projectId) return false
      return true
    })
  }, [costCenters])

  /**
   * Get work items filtered by org
   */
  const getWorkItemsForOrg = useCallback((orgId: string): WorkItemRow[] => {
    return workItems.filter(wi => (wi as any).org_id === orgId || !(wi as any).org_id)
  }, [workItems])

  /**
   * Get categories filtered by org
   */
  const getCategoriesForOrg = useCallback((orgId: string): ExpensesCategoryRow[] => {
    return categories.filter(cat => (cat as any).org_id === orgId || !(cat as any).org_id)
  }, [categories])

  const value = useMemo<TransactionsDataContextValue>(() => ({
    // Reference data
    organizations,
    projects,
    accounts,
    costCenters,
    workItems,
    categories,
    classifications,
    analysisItemsMap,
    
    // Current user
    currentUserId,
    
    // Loading states
    isLoading,
    isRefreshing,
    error,
    
    // Filtered data getters
    getCostCentersForOrg,
    getWorkItemsForOrg,
    getCategoriesForOrg,
    
    // On-demand loading functions
    loadDimensionsForOrg,
    ensureDimensionsLoaded,
    
    // Refresh functions
    refreshAll,
    refreshDimensions,
    refreshAnalysisItems,
  }), [
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
  ])

  return (
    <TransactionsDataContext.Provider value={value}>
      {children}
    </TransactionsDataContext.Provider>
  )
}

export default TransactionsDataProvider
