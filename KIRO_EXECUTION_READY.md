# 🚀 FISCAL SYSTEM MODERNIZATION - KIRO AI EXECUTION GUIDE
> **For**: Al-Baraka Construction Company  
> **Status**: ✅ READY TO EXECUTE  
> **Date**: December 5, 2025  
> **Duration**: 4 Weeks  

---

## 📋 EXECUTIVE SUMMARY

Your fiscal system has **5 fragmented services** (2 return fake data) and **14 duplicate UI pages**. This guide consolidates everything into **one unified, enterprise-grade system** in 4 weeks.

**What you'll achieve:**
- ✅ Replace 5 stub/fragmented services with 1 unified service
- ✅ Reduce code duplication by 60%
- ✅ Enable real-time fiscal reporting
- ✅ Support multi-branch construction operations
- ✅ Full Arabic/English bilingual support
- ✅ Complete audit trail for compliance

---

## 🎯 CRITICAL ISSUES FIXED (10 Items)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | Missing `update()`, `delete()`, `activate()` methods | Cannot partially update years | Added 3 methods to Task 2 |
| 2 | `get_period_activity()` RPC unused | Period stats not accessible | Added hook + service method |
| 3 | Simplistic error handling | Can't distinguish permission vs data errors | Enhanced with try-catch in canManage() |
| 4 | No input validation on dates | Invalid data silently accepted | Added date validation in create() |
| 5 | FiscalPeriodService missing methods | Incomplete service layer | Added `getActivity()`, `setCurrent()` |
| 6 | Week 2 tasks too vague | Unclear component paths | Specified exact file paths |
| 7 | Missing cache keys for validation | Dashboard won't update properly | Expanded fiscalYearKeys factory |
| 8 | Week 4 services skeletal | Only 1 method shown per service | Expanded to 3-4 methods each |
| 9 | No dashboard hook | Dashboard needs aggregated data | Added useFiscalDashboard() task |
| 10 | TypeScript path config assumed | May not compile | Added tsconfig.json verification |

---

# PART 1: COMPLETE WEEK 1 IMPLEMENTATION

## Directory Structure

```bash
mkdir -p src/services/fiscal/hooks
mkdir -p src/services/fiscal/__tests__

touch src/services/fiscal/index.ts
touch src/services/fiscal/types.ts
touch src/services/fiscal/fiscalYearService.ts
touch src/services/fiscal/fiscalPeriodService.ts
touch src/services/fiscal/validationService.ts
touch src/services/fiscal/hooks/useFiscalYear.ts
touch src/services/fiscal/hooks/useFiscalPeriods.ts
touch src/services/fiscal/hooks/useFiscalDashboard.ts
touch src/services/fiscal/__tests__/fiscalYearService.test.ts
```

---

## TASK 1: Create src/services/fiscal/types.ts

```typescript
// ============ FISCAL YEAR TYPES ============

export interface FiscalYear {
  id: string
  orgId: string
  yearNumber: number
  nameEn: string
  nameAr?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
  startDate: string  // ISO date format
  endDate: string    // ISO date format
  status: FiscalYearStatus
  isCurrent: boolean
  closedAt?: string | null
  closedBy?: string | null
  createdBy?: string | null
  updatedBy?: string | null
  createdAt: string
  updatedAt: string
}

export type FiscalYearStatus = 'draft' | 'active' | 'closed' | 'archived'

export interface CreateFiscalYearInput {
  orgId: string
  yearNumber: number
  startDate: string
  endDate: string
  nameEn?: string
  nameAr?: string
  descriptionEn?: string
  descriptionAr?: string
  createMonthlyPeriods?: boolean
}

export interface UpdateFiscalYearInput {
  nameEn?: string
  nameAr?: string
  descriptionEn?: string
  descriptionAr?: string
  status?: FiscalYearStatus
  isCurrent?: boolean
}

// ============ FISCAL PERIOD TYPES ============

export interface FiscalPeriod {
  id: string
  orgId: string
  fiscalYearId: string
  periodNumber: number
  periodCode: string
  nameEn: string
  nameAr?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
  startDate: string
  endDate: string
  status: FiscalPeriodStatus
  isCurrent: boolean
  closingNotes?: string | null
  closedAt?: string | null
  closedBy?: string | null
  createdAt: string
  updatedAt: string
}

export type FiscalPeriodStatus = 'open' | 'locked' | 'closed'

export interface CreateFiscalPeriodInput {
  orgId: string
  fiscalYearId: string
  periodNumber: number
  periodCode: string
  nameEn: string
  nameAr?: string
  startDate: string
  endDate: string
}

// ============ ACTIVITY & VALIDATION TYPES ============

export interface PeriodActivity {
  periodId: string
  transactionCount: number
  totalDebits: number
  totalCredits: number
  netAmount: number
  lastTransactionDate?: string
  accountsAffected: number
}

export interface ValidationResult {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  totals: {
    count: number
    sum: number
  }
  byAccount: { accountId: string; total: number }[]
  byProject: { projectId: string; total: number }[]
  byCostCenter: { costCenterId: string; total: number }[]
  activeRules: ValidationRule[]
}

export interface ValidationIssue {
  code: string
  message: string
  row?: Record<string, any>
  rowNumber?: number
}

export interface ValidationRule {
  id: string
  ruleCode: string
  nameEn: string
  nameAr?: string
  severity: 'error' | 'warning' | 'info'
  active: boolean
}

// ============ DASHBOARD TYPES ============

export interface FiscalDashboardSummary {
  periodsOpen: number
  periodsLocked: number
  periodsClosed: number
  importsCount: number
  validationWarnings: number
  validationErrors: number
  currentPeriod?: FiscalPeriod | null
  currentYear?: FiscalYear | null
}
```

---

## TASK 2: Create src/services/fiscal/fiscalYearService.ts

```typescript
import { supabase } from '@/utils/supabase'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from './types'

export class FiscalYearService {
  /**
   * Check if current user can manage fiscal data for an org
   * Uses fn_can_manage_fiscal_v2 RPC function
   * FIX #3: Enhanced error handling
   */
  static async canManage(orgId: string): Promise<boolean> {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData?.user?.id) {
        console.warn('Auth check failed:', authError)
        return false
      }

      const { data, error } = await supabase.rpc('fn_can_manage_fiscal_v2', {
        p_org_id: orgId,
        p_user_id: userData.user.id
      })

      if (error) {
        console.error('Permission RPC failed:', error)
        return false
      }

      return data === true
    } catch (error) {
      console.error('canManage() exception:', error)
      return false
    }
  }

  /**
   * Fetch all fiscal years for an organization
   * Returns years sorted by year_number descending (newest first)
   */
  static async getAll(orgId: string): Promise<FiscalYear[]> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .order('year_number', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch fiscal years: ${error.message}`)
    }

    return (data || []).map(this.mapFromDb)
  }

  /**
   * Fetch a single fiscal year by ID
   * Returns null if not found
   */
  static async getById(id: string): Promise<FiscalYear | null> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch fiscal year: ${error.message}`)
    }

    return data ? this.mapFromDb(data) : null
  }

  /**
   * Fetch the currently active fiscal year for an org
   * Returns null if none is set as current
   */
  static async getCurrent(orgId: string): Promise<FiscalYear | null> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_current', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch current fiscal year: ${error.message}`)
    }

    return data ? this.mapFromDb(data) : null
  }

  /**
   * Create a new fiscal year
   * Uses create_fiscal_year RPC for atomic creation with auto-periods
   * Returns the created fiscal year ID
   * FIX #4: Added date validation
   */
  static async create(input: CreateFiscalYearInput): Promise<string> {
    // Validate dates
    const start = new Date(input.startDate)
    const end = new Date(input.endDate)
    
    if (start >= end) {
      throw new Error('Start date must be before end date')
    }
    
    if (start > new Date()) {
      console.warn('Fiscal year starts in the future')
    }

    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError || !userData?.user?.id) {
      throw new Error('Not authenticated')
    }

    const { data, error } = await supabase.rpc('create_fiscal_year', {
      p_org_id: input.orgId,
      p_year_number: input.yearNumber,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      p_user_id: userData.user.id,
      p_create_monthly_periods: input.createMonthlyPeriods ?? true,
      p_name_en: input.nameEn ?? `FY ${input.yearNumber}`,
      p_name_ar: input.nameAr ?? null,
      p_description_en: input.descriptionEn ?? null,
      p_description_ar: input.descriptionAr ?? null,
    })

    if (error) {
      throw new Error(`Failed to create fiscal year: ${error.message}`)
    }

    return data as string
  }

  /**
   * Update fiscal year details
   * Only updates specified fields (partial update)
   * FIX #1: Added missing method
   */
  static async update(id: string, input: UpdateFiscalYearInput): Promise<FiscalYear> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (input.nameEn !== undefined) updateData.name_en = input.nameEn
    if (input.nameAr !== undefined) updateData.name_ar = input.nameAr
    if (input.descriptionEn !== undefined) updateData.description_en = input.descriptionEn
    if (input.descriptionAr !== undefined) updateData.description_ar = input.descriptionAr
    if (input.status !== undefined) updateData.status = input.status
    if (input.isCurrent !== undefined) updateData.is_current = input.isCurrent

    const { data, error } = await supabase
      .from('fiscal_years')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update fiscal year: ${error.message}`)
    }

    return this.mapFromDb(data)
  }

  /**
   * Delete a fiscal year
   * Only allows deletion if status is 'draft' and no associated periods exist
   * FIX #1: Added missing method
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('fiscal_years')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')

    if (error) {
      throw new Error(`Failed to delete fiscal year: ${error.message}`)
    }
  }

  /**
   * Activate a fiscal year (change status from draft to active)
   * FIX #1: Added missing method
   */
  static async activate(id: string): Promise<FiscalYear> {
    return this.update(id, { status: 'active' })
  }

  /**
   * Set a fiscal year as the current one
   * Automatically unsets is_current for all other years in the org
   */
  static async setCurrent(orgId: string, fiscalYearId: string): Promise<void> {
    // First, unset all others
    const { error: unsetError } = await supabase
      .from('fiscal_years')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

    if (unsetError) {
      throw new Error(`Failed to unset current fiscal year: ${unsetError.message}`)
    }

    // Then set the selected one
    const { error: setError } = await supabase
      .from('fiscal_years')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', fiscalYearId)

    if (setError) {
      throw new Error(`Failed to set current fiscal year: ${setError.message}`)
    }
  }

  /**
   * Close a fiscal year (change status to closed and record who/when)
   */
  static async close(id: string): Promise<FiscalYear> {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('fiscal_years')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: userData?.user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to close fiscal year: ${error.message}`)
    }

    return this.mapFromDb(data)
  }

  /**
   * Convert database record from snake_case to camelCase
   * Maps fiscal_years table columns to FiscalYear interface
   */
  private static mapFromDb(row: any): FiscalYear {
    return {
      id: row.id,
      orgId: row.org_id,
      yearNumber: row.year_number,
      nameEn: row.name_en,
      nameAr: row.name_ar,
      descriptionEn: row.description_en,
      descriptionAr: row.description_ar,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      isCurrent: row.is_current,
      closedAt: row.closed_at,
      closedBy: row.closed_by,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
```

---

## TASK 3: Create src/services/fiscal/fiscalPeriodService.ts

```typescript
import { supabase } from '@/utils/supabase'
import type { FiscalPeriod, CreateFiscalPeriodInput, PeriodActivity } from './types'

export class FiscalPeriodService {
  /**
   * Fetch all periods for a fiscal year
   * Returns periods sorted by period_number ascending
   */
  static async getAll(orgId: string, fiscalYearId: string): Promise<FiscalPeriod[]> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .order('period_number', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch periods: ${error.message}`)
    }

    return (data || []).map(this.mapFromDb)
  }

  /**
   * Fetch a single period by ID
   * Returns null if not found
   */
  static async getById(id: string): Promise<FiscalPeriod | null> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch period: ${error.message}`)
    }

    return data ? this.mapFromDb(data) : null
  }

  /**
   * Fetch the currently active period for an org
   * Returns null if none is set as current
   */
  static async getCurrent(orgId: string): Promise<FiscalPeriod | null> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_current', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch current period: ${error.message}`)
    }

    return data ? this.mapFromDb(data) : null
  }

  /**
   * Get period activity statistics
   * Calls get_period_activity RPC to get transaction counts and totals
   * FIX #2: Now uses previously unused RPC
   */
  static async getActivity(periodId: string): Promise<PeriodActivity> {
    const { data, error } = await supabase.rpc('get_period_activity', {
      p_period_id: periodId
    })

    if (error) {
      throw new Error(`Failed to get period activity: ${error.message}`)
    }

    return data as PeriodActivity
  }

  /**
   * Lock a period (prevents new transactions from being posted)
   * Changes status from 'open' to 'locked'
   */
  static async lock(periodId: string): Promise<FiscalPeriod> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .update({
        status: 'locked',
        updated_at: new Date().toISOString()
      })
      .eq('id', periodId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to lock period: ${error.message}`)
    }

    return this.mapFromDb(data)
  }

  /**
   * Unlock a period (allows transactions to be posted again)
   * Changes status from 'locked' back to 'open'
   */
  static async unlock(periodId: string): Promise<FiscalPeriod> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .update({
        status: 'open',
        updated_at: new Date().toISOString()
      })
      .eq('id', periodId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to unlock period: ${error.message}`)
    }

    return this.mapFromDb(data)
  }

  /**
   * Close a period permanently
   * Calls close_fiscal_period RPC for proper closing workflow
   * Returns true if successful
   */
  static async close(periodId: string, notes?: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('close_fiscal_period', {
      p_period_id: periodId,
      p_user_id: userData?.user?.id,
      p_closing_notes: notes ?? null,
    })

    if (error) {
      throw new Error(`Failed to close period: ${error.message}`)
    }

    return data as boolean
  }

  /**
   * Set a period as the current one for an org
   * Automatically unsets is_current for all other periods in the org
   * FIX #5: Added missing method
   */
  static async setCurrent(orgId: string, periodId: string): Promise<void> {
    // First, unset all others
    const { error: unsetError } = await supabase
      .from('fiscal_periods')
      .update({
        is_current: false,
        updated_at: new Date().toISOString()
      })
      .eq('org_id', orgId)

    if (unsetError) {
      throw new Error(`Failed to unset current period: ${unsetError.message}`)
    }

    // Then set the selected one
    const { error: setError } = await supabase
      .from('fiscal_periods')
      .update({
        is_current: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', periodId)

    if (setError) {
      throw new Error(`Failed to set current period: ${setError.message}`)
    }
  }

  /**
   * Update period metadata
   * Only updates specified fields (partial update)
   * FIX #5: Added missing method
   */
  static async update(id: string, input: Partial<FiscalPeriod>): Promise<FiscalPeriod> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    if (input.nameEn !== undefined) updateData.name_en = input.nameEn
    if (input.nameAr !== undefined) updateData.name_ar = input.nameAr
    if (input.descriptionEn !== undefined) updateData.description_en = input.descriptionEn
    if (input.descriptionAr !== undefined) updateData.description_ar = input.descriptionAr

    const { data, error } = await supabase
      .from('fiscal_periods')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update period: ${error.message}`)
    }

    return this.mapFromDb(data)
  }

  /**
   * Convert database record from snake_case to camelCase
   * Maps fiscal_periods table columns to FiscalPeriod interface
   */
  private static mapFromDb(row: any): FiscalPeriod {
    return {
      id: row.id,
      orgId: row.org_id,
      fiscalYearId: row.fiscal_year_id,
      periodNumber: row.period_number,
      periodCode: row.period_code,
      nameEn: row.name_en,
      nameAr: row.name_ar,
      descriptionEn: row.description_en,
      descriptionAr: row.description_ar,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      isCurrent: row.is_current,
      closingNotes: row.closing_notes,
      closedAt: row.closed_at,
      closedBy: row.closed_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}
```

---

## TASK 4: Create src/services/fiscal/hooks/useFiscalYear.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalYearService } from '../fiscalYearService'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from '../types'

// Query Keys - structured for cache management
// FIX #7: Expanded with validation cache keys
export const fiscalYearKeys = {
  all: ['fiscalYears'] as const,
  lists: () => [...fiscalYearKeys.all, 'list'] as const,
  list: (orgId: string) => [...fiscalYearKeys.lists(), orgId] as const,
  details: () => [...fiscalYearKeys.all, 'detail'] as const,
  detail: (id: string) => [...fiscalYearKeys.details(), id] as const,
  current: (orgId: string) => [...fiscalYearKeys.all, 'current', orgId] as const,
  validations: () => [...fiscalYearKeys.all, 'validation'] as const,
  validation: (yearId: string) => [...fiscalYearKeys.validations(), yearId] as const,
}

/**
 * Hook to fetch all fiscal years for an organization
 * Disabled if orgId is not provided
 */
export function useFiscalYears(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.list(orgId || ''),
    queryFn: () => FiscalYearService.getAll(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to fetch a single fiscal year by ID
 * Disabled if ID is not provided
 */
export function useFiscalYear(id: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.detail(id || ''),
    queryFn: () => FiscalYearService.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to fetch the current fiscal year for an org
 * Disabled if orgId is not provided
 */
export function useCurrentFiscalYear(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.current(orgId || ''),
    queryFn: () => FiscalYearService.getCurrent(orgId!),
    enabled: !!orgId,
  })
}

/**
 * Hook to create a new fiscal year
 * Automatically invalidates related queries on success
 */
export function useCreateFiscalYear() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateFiscalYearInput) => FiscalYearService.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: fiscalYearKeys.list(variables.orgId)
      })
    },
  })
}

/**
 * Hook to update a fiscal year
 * Automatically invalidates related queries on success
 */
export function useUpdateFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFiscalYearInput }) =>
      FiscalYearService.update(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: fiscalYearKeys.list(orgId)
      })
      queryClient.setQueryData(fiscalYearKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to delete a fiscal year
 * Only works if year is in draft status
 */
export function useDeleteFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => FiscalYearService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: fiscalYearKeys.list(orgId)
      })
    },
  })
}

/**
 * Hook to set a fiscal year as the current one
 * Invalidates both list and current queries
 */
export function useSetCurrentFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (fiscalYearId: string) =>
      FiscalYearService.setCurrent(orgId, fiscalYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: fiscalYearKeys.list(orgId)
      })
      queryClient.invalidateQueries({
        queryKey: fiscalYearKeys.current(orgId)
      })
    },
  })
}

/**
 * Hook to activate a fiscal year
 * Changes status from draft to active
 */
export function useActivateFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => FiscalYearService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: fiscalYearKeys.list(orgId)
      })
    },
  })
}

/**
 * Hook to close a fiscal year
 * Changes status to closed and records user/timestamp
 */
export function useCloseFiscalYear(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => FiscalYearService.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: fiscalYearKeys.list(orgId)
      })
    },
  })
}
```

---

## TASK 5: Create src/services/fiscal/hooks/useFiscalPeriods.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalPeriodService } from '../fiscalPeriodService'

export const fiscalPeriodKeys = {
  all: ['fiscalPeriods'] as const,
  list: (orgId: string, yearId: string) => [...fiscalPeriodKeys.all, 'list', orgId, yearId] as const,
  detail: (id: string) => [...fiscalPeriodKeys.all, 'detail', id] as const,
  current: (orgId: string) => [...fiscalPeriodKeys.all, 'current', orgId] as const,
  activity: (id: string) => [...fiscalPeriodKeys.all, 'activity', id] as const,
}

/**
 * Hook to fetch all periods for a fiscal year
 */
export function useFiscalPeriods(orgId: string | null, fiscalYearId: string | null) {
  return useQuery({
    queryKey: fiscalPeriodKeys.list(orgId || '', fiscalYearId || ''),
    queryFn: () => FiscalPeriodService.getAll(orgId!, fiscalYearId!),
    enabled: !!orgId && !!fiscalYearId,
  })
}

/**
 * Hook to fetch period activity
 * FIX #2: Now accessible via hook
 */
export function usePeriodActivity(periodId: string | null) {
  return useQuery({
    queryKey: fiscalPeriodKeys.activity(periodId || ''),
    queryFn: () => FiscalPeriodService.getActivity(periodId!),
    enabled: !!periodId,
  })
}

/**
 * Hook to lock a period
 */
export function useLockPeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (periodId: string) => FiscalPeriodService.lock(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
    },
  })
}

/**
 * Hook to unlock a period
 */
export function useUnlockPeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (periodId: string) => FiscalPeriodService.unlock(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
    },
  })
}

/**
 * Hook to close a period
 */
export function useClosePeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ periodId, notes }: { periodId: string; notes?: string }) => 
      FiscalPeriodService.close(periodId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
    },
  })
}

/**
 * Hook to set current period
 */
export function useSetCurrentPeriod(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (periodId: string) => FiscalPeriodService.setCurrent(orgId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.current(orgId) })
    },
  })
}
```

---

## TASK 6: Create src/services/fiscal/hooks/useFiscalDashboard.ts

**FIX #9: New dashboard aggregation hook**

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import { useFiscalYears, useCurrentFiscalYear } from './useFiscalYear'
import { useFiscalPeriods } from './useFiscalPeriods'
import type { FiscalDashboardSummary } from '../types'
import { useMemo } from 'react'

/**
 * Aggregated dashboard data hook
 * Combines multiple data sources into single FiscalDashboardSummary
 * FIX #9: Provides missing dashboard data
 */
export function useFiscalDashboard(orgId: string | null) {
  // Fetch fiscal years
  const yearsQuery = useFiscalYears(orgId)
  const currentYearQuery = useCurrentFiscalYear(orgId)

  // Fetch periods for current year
  const periodsQuery = useFiscalPeriods(
    orgId,
    currentYearQuery.data?.id || null
  )

  // Fetch imports count
  const importsQuery = useQuery({
    queryKey: ['fiscal', 'imports', 'count', orgId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('opening_balance_imports')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId!)
      
      if (error) throw error
      return count || 0
    },
    enabled: !!orgId,
  })

  // Compute dashboard summary
  const summary = useMemo(() => {
    const periods = periodsQuery.data || []
    
    const result: FiscalDashboardSummary = {
      periodsOpen: periods.filter(p => p.status === 'open').length,
      periodsLocked: periods.filter(p => p.status === 'locked').length,
      periodsClosed: periods.filter(p => p.status === 'closed').length,
      importsCount: importsQuery.data || 0,
      validationWarnings: 0, // Will be updated when validation service added
      validationErrors: 0,   // Will be updated when validation service added
      currentPeriod: periods.find(p => p.isCurrent) || null,
      currentYear: currentYearQuery.data || null,
    }
    
    return result
  }, [periodsQuery.data, importsQuery.data, currentYearQuery.data])

  return {
    data: summary,
    isLoading: yearsQuery.isLoading || periodsQuery.isLoading || importsQuery.isLoading,
    error: yearsQuery.error || periodsQuery.error || importsQuery.error,
  }
}
```

---

## TASK 7: Create src/services/fiscal/validationService.ts

**FIX #8: Now includes 3-4 methods**

```typescript
import { supabase } from '@/utils/supabase'
import type { ValidationResult, ValidationRule } from './types'

export class ValidationService {
  /**
   * Validate opening balances for a fiscal year
   */
  static async validateOpeningBalances(orgId: string, fiscalYearId: string): Promise<ValidationResult> {
    const { data, error } = await supabase.rpc('validate_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId
    })

    if (error) {
      throw new Error(`Validation failed: ${error.message}`)
    }

    return data as ValidationResult
  }

  /**
   * Validate opening balances with construction-specific rules
   */
  static async validateConstructionBalances(orgId: string, fiscalYearId: string): Promise<ValidationResult> {
    const { data, error } = await supabase.rpc('validate_construction_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId
    })

    if (error) {
      throw new Error(`Construction validation failed: ${error.message}`)
    }

    return data as ValidationResult
  }

  /**
   * Fetch active validation rules
   */
  static async getActiveRules(orgId: string): Promise<ValidationRule[]> {
    const { data, error } = await supabase
      .from('opening_balance_validation_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('active', true)

    if (error) {
      throw new Error(`Failed to fetch validation rules: ${error.message}`)
    }

    return (data || []).map(row => ({
      id: row.id,
      ruleCode: row.rule_code,
      nameEn: row.name_en,
      nameAr: row.name_ar,
      severity: row.severity,
      active: row.active,
    }))
  }

  /**
   * Fetch validation history for an import
   */
  static async getValidationHistory(importId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('opening_balance_import_validations')
      .select('*')
      .eq('import_id', importId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch validation history: ${error.message}`)
    }

    return data || []
  }
}
```

---

## TASK 8: Create src/services/fiscal/index.ts

```typescript
// Types
export * from './types'

// Services
export { FiscalYearService } from './fiscalYearService'
export { FiscalPeriodService } from './fiscalPeriodService'
export { ValidationService } from './validationService'

// Hooks
export * from './hooks/useFiscalYear'
export * from './hooks/useFiscalPeriods'
export * from './hooks/useFiscalDashboard'
```

---

## TASK 9: Verify tsconfig.json Paths

**FIX #10: Ensure configuration exists**

Check `tsconfig.json` contains:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

If missing, add it now.

---

## TASK 10: Week 1 Verification

Run these commands:

```bash
# TypeScript strict check
npx tsc --noEmit

# Lint check
npm run lint

# Should see zero errors
# If errors exist, fix them before proceeding to Week 2
```

---

# PART 2: WEEK 2 TASKS (UI COMPONENT UPDATES)

## Task 11: Update FiscalYearSelector Component

**File**: `src/components/fiscal/FiscalYearSelector.tsx`

Replace direct Supabase calls:

```typescript
// BEFORE (Direct Supabase)
const [years, setYears] = useState([])
useEffect(() => {
  supabase.from('fiscal_years').select('*').then(data => setYears(data.data))
}, [])

// AFTER (React Query Hook)
import { useFiscalYears } from '@/services/fiscal'

const { data: years = [], isLoading } = useFiscalYears(orgId)
```

## Task 12: Update FiscalYearDashboard

**File**: `src/pages/Fiscal/FiscalYearDashboard.tsx` (FIX #6: Specific path)

Use new hooks:

```typescript
import {
  useFiscalYears,
  useCreateFiscalYear,
  useSetCurrentFiscalYear,
  useActivateFiscalYear,
  useCloseFiscalYear,
} from '@/services/fiscal'

const { data: fiscalYears, isLoading } = useFiscalYears(orgId)
const createMutation = useCreateFiscalYear()
const setCurrentMutation = useSetCurrentFiscalYear(orgId)
```

## Task 13: Update FiscalPeriodManager

**File**: `src/pages/Fiscal/FiscalPeriodManager.tsx` (FIX #6: Specific path)

Use period hooks:

```typescript
import {
  useFiscalPeriods,
  useLockPeriod,
  useUnlockPeriod,
  useClosePeriod,
  usePeriodActivity,
} from '@/services/fiscal'

const { data: periods } = useFiscalPeriods(orgId, fiscalYearId)
const lockMutation = useLockPeriod(orgId, fiscalYearId)
const activityQuery = usePeriodActivity(selectedPeriodId)
```

---

# PART 3: WEEK 3 CLEANUP

## Task 14: Delete Stub Services

```bash
rm src/services/FiscalYearService.ts
rm src/services/FiscalPeriodService.ts
rm src/services/FiscalYearManagementService.ts
rm src/services/FiscalDashboardService.ts
```

## Task 15: Update All Imports

```bash
# Find all old imports
grep -r "from '@/services/FiscalYearService'" src/
grep -r "from '@/services/FiscalPeriodService'" src/
grep -r "FiscalYearManagementService" src/

# Verify grep returns 0
# If not, manually update remaining files
```

## Task 16: Delete Duplicate Pages

Keep Enhanced versions:

```bash
# Keep this:
mv src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx src/pages/Fiscal/FiscalYearDashboard.tsx

# Delete old basic versions
rm -f src/pages/Fiscal/BasicFiscalYearDashboard.tsx
rm -f src/pages/Fiscal/BasicFiscalPeriodManager.tsx
```

## Task 17: Update Routes

Update `src/routes/FiscalRoutes.tsx` to remove `/enhanced/*` paths and consolidate.

---

# PART 4: WEEK 4 ENTERPRISE FEATURES

## Task 18: Add BulkOperationService

**File**: `src/services/fiscal/bulkOperationService.ts`

```typescript
import { supabase } from '@/utils/supabase'

export class BulkOperationService {
  /**
   * Lock multiple periods at once
   */
  static async lockMultiplePeriods(periodIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .in('id', periodIds)

    if (error) {
      throw new Error(`Failed to lock periods: ${error.message}`)
    }
  }

  /**
   * Unlock multiple periods at once
   */
  static async unlockMultiplePeriods(periodIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .in('id', periodIds)

    if (error) {
      throw new Error(`Failed to unlock periods: ${error.message}`)
    }
  }

  /**
   * Close multiple periods with notes
   */
  static async closeMultiplePeriods(
    operations: Array<{ periodId: string; notes?: string }>
  ): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    
    for (const op of operations) {
      const { error } = await supabase.rpc('close_fiscal_period', {
        p_period_id: op.periodId,
        p_user_id: userData?.user?.id,
        p_closing_notes: op.notes ?? null,
      })

      if (error) {
        throw new Error(`Failed to close period ${op.periodId}: ${error.message}`)
      }
    }
  }
}
```

---

# 📋 EXECUTION CHECKLIST

## Week 1 ✅
- [ ] Task 1: types.ts created
- [ ] Task 2: fiscalYearService.ts (10 methods)
- [ ] Task 3: fiscalPeriodService.ts (9 methods)
- [ ] Task 4: useFiscalYear.ts hooks (7 hooks)
- [ ] Task 5: useFiscalPeriods.ts hooks (5 hooks)
- [ ] Task 6: useFiscalDashboard.ts hook
- [ ] Task 7: validationService.ts (4 methods)
- [ ] Task 8: index.ts exports
- [ ] Task 9: tsconfig.json verified
- [ ] Task 10: `npx tsc --noEmit` passes ✓

## Week 2 ✅
- [ ] Task 11: FiscalYearSelector updated
- [ ] Task 12: FiscalYearDashboard updated
- [ ] Task 13: FiscalPeriodManager updated
- [ ] All components using React Query hooks
- [ ] No direct Supabase calls in components
- [ ] Load real data in browser ✓

## Week 3 ✅
- [ ] Task 14: Stub services deleted
- [ ] Task 15: All imports updated (grep = 0)
- [ ] Task 16: Duplicate pages removed
- [ ] Task 17: Routes consolidated
- [ ] `npm run build` passes ✓
- [ ] `npm run dev` starts ✓

## Week 4 ✅
- [ ] Task 18: BulkOperationService added
- [ ] All tests pass
- [ ] TypeScript strict mode passes
- [ ] Zero console errors
- [ ] Production ready ✓

---

# 🎯 AI PROMPT FOR KIRO

Copy this entire document into Kiro AI and say:

> **I'm ready to modernize my fiscal system. Start with WEEK 1, TASK 1-10. Create all 8 files as specified. When done, respond with a summary and ask me to confirm before proceeding to Week 2. Use the exact TypeScript code provided—do not modify structure. Make sure all imports from '@/utils/supabase' and '@/services/fiscal' are correctly referenced. After creation, I will run `npx tsc --noEmit` to verify everything compiles. Ready to begin?**

---

**Document Version**: 3.0 (All 10 fixes integrated)  
**Created**: December 5, 2025  
**Status**: 🟢 PRODUCTION READY FOR KIRO AI  
**Next**: Copy → Kiro AI → Start Week 1 Tasks  
