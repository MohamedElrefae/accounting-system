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
  
  // Refresh functions
  refreshAll: () => Promise<void>
  refreshDimensions: (orgId: string, projectId?: string | null) => Promise<void>
  refreshAnalysisItems: (orgId: string, projectId?: string | null) => Promise<void>
}

const TransactionsDataContext = createContext<TransactionsDataContextValue | null>(null)

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
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([])
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([])
  const [categories, setCategories] = useState<ExpensesCategoryRow[]>([])
  const [classifications, setClassifications] = useState<TransactionClassification[]>([])
  const [analysisItemsMap, setAnalysisItemsMap] = useState<Record<string, AnalysisWorkItemLabel>>({})
  
  // User state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Track loaded dimensions to avoid redundant fetches
  const loadedDimensionsRef = useRef<Set<string>>(new Set())
  const initialLoadCompleteRef = useRef(false)

  /**
   * Load core reference data (organizations, projects, accounts, classifications, user)
   * This is called once on mount
   */
  const loadCoreData = useCallback(async () => {
    console.log('📦 TransactionsDataProvider: Loading core reference data...')
    
    try {
      const [accs, projectsList, orgsList, classificationsList, uid] = await Promise.all([
        getAccounts(),
        getProjects().catch(() => []),
        getOrganizations().catch(() => []),
        getAllTransactionClassifications().catch(() => []),
        getCurrentUserId(),
      ])
      
      setAccounts(accs)
      setProjects(projectsList)
      setOrganizations(orgsList)
      setClassifications(classificationsList)
      setCurrentUserId(uid)
      
      console.log('✅ TransactionsDataProvider: Core data loaded', {
        accounts: accs.length,
        projects: projectsList.length,
        organizations: orgsList.length,
        classifications: classificationsList.length,
        userId: uid
      })
      
      return orgsList
    } catch (err: any) {
      console.error('❌ TransactionsDataProvider: Failed to load core data', err)
      setError(err.message || 'فشل تحميل البيانات الأساسية')
      throw err
    }
  }, [])

  /**
   * Load dimension data (cost centers, work items, categories) for all organizations
   * This is called after core data is loaded
   */
  const loadAllDimensions = useCallback(async (orgs: Organization[]) => {
    if (!orgs.length) {
      console.log('📦 TransactionsDataProvider: No organizations, skipping dimension load')
      return
    }
    
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
      
      setCategories(Object.values(mergedCategories))
      setCostCenters(Object.values(mergedCostCenters))
      setWorkItems(Object.values(mergedWorkItems))
      
      // Mark all orgs as loaded
      orgs.forEach(org => loadedDimensionsRef.current.add(org.id))
      
      console.log('✅ TransactionsDataProvider: Dimensions loaded', {
        categories: Object.keys(mergedCategories).length,
        costCenters: Object.keys(mergedCostCenters).length,
        workItems: Object.keys(mergedWorkItems).length
      })
    } catch (err) {
      console.error('❌ TransactionsDataProvider: Failed to load dimensions', err)
    }
  }, [])

  /**
   * Load analysis work items for label lookups - loads for ALL organizations
   */
  const loadAnalysisItems = useCallback(async (orgs: Organization[]) => {
    if (!orgs.length) return
    
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
      
      setAnalysisItemsMap(map)
      console.log('✅ TransactionsDataProvider: Analysis items loaded', Object.keys(map).length)
    } catch (err) {
      console.warn('Failed to load analysis items', err)
    }
  }, [])

  /**
   * Initial data load on mount
   */
  useEffect(() => {
    if (initialLoadCompleteRef.current) return
    
    let cancelled = false
    
    const init = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const orgs = await loadCoreData()
        if (cancelled) return
        
        await loadAllDimensions(orgs)
        if (cancelled) return
        
        // Load analysis items for all orgs
        await loadAnalysisItems(orgs)
        
        initialLoadCompleteRef.current = true
      } catch {
        // Error already set in loadCoreData
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    
    init()
    
    return () => { cancelled = true }
  }, [loadCoreData, loadAllDimensions, loadAnalysisItems])

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    setIsRefreshing(true)
    loadedDimensionsRef.current.clear()
    
    try {
      const orgs = await loadCoreData()
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
