# Unified Fiscal Enterprise Services - Implementation Plan

> **Purpose**: Complete migration plan to consolidate fragmented fiscal year and periods system into unified enterprise services.  
> **Target**: Al-Baraka Construction Company accounting system  
> **Duration**: 4 weeks  
> **Status**: Ready for implementation

---

## 📋 Executive Summary

### Current Problems (CRITICAL)
- **5 services** with overlapping responsibilities
- **14 UI pages** with duplicate functionality (basic vs enhanced)
- **Stub implementations** returning hardcoded fake data instead of real database records
- **No unified state management** causing data sync issues
- **Unused database functions** not leveraged in services

### Solution
Consolidate into **unified service layer** with proper TypeScript types, React Query hooks, and atomic database operations using existing Supabase RPCs.

### Expected Outcomes
- Eliminate stub implementations
- Reduce code duplication by ~60%
- Establish enterprise-grade audit trail
- Enable bulk operations for multi-period management
- Support bilingual (EN/AR) operations fully

---

## 🗄️ Database Schema (Production Verified - Dec 5, 2025)

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
  status text NOT NULL DEFAULT 'draft',  -- 'draft' | 'active' | 'closed' | 'archived'
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
  status text NOT NULL DEFAULT 'open',  -- 'open' | 'locked' | 'closed'
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

### Supporting Tables
- `period_closing_checklists` - Checklist items for closing workflow
- `opening_balance_imports` - Import batch tracking
- `opening_balances` - Actual balance data per account
- `opening_balance_validation_rules` - Custom validation rules
- `trial_balance_view_period` - View for trial balance by period

### Available Database Functions (RPCs)

| Function | Returns | Must Use |
|----------|---------|----------|
| `create_fiscal_year()` | uuid | For creating years with auto-period generation |
| `fn_can_manage_fiscal_v2()` | boolean | Permission check (use v2, not v1) |
| `close_fiscal_period()` | boolean | For closing periods |
| `validate_opening_balances()` | jsonb | For opening balance validation |
| `validate_construction_opening_balances()` | jsonb | Construction-specific validation |
| `import_opening_balances()` | uuid | For bulk imports |
| `get_period_activity()` | record | **CURRENTLY UNUSED** - for activity summaries |
| `debug_fiscal_context()` | jsonb | Development helper |

---

## 🚀 Phase 1: Create Unified Service Layer (Week 1)

### Step 1.1: Create Directory Structure

```bash
mkdir -p src/services/fiscal/hooks
touch src/services/fiscal/index.ts
touch src/services/fiscal/types.ts
touch src/services/fiscal/fiscalYearService.ts
touch src/services/fiscal/fiscalPeriodService.ts
touch src/services/fiscal/openingBalanceService.ts
touch src/services/fiscal/validationService.ts
touch src/services/fiscal/reconciliationService.ts
touch src/services/fiscal/hooks/useFiscalYear.ts
touch src/services/fiscal/hooks/useFiscalPeriods.ts
touch src/services/fiscal/hooks/useOpeningBalances.ts
touch src/services/fiscal/hooks/useFiscalDashboard.ts
```

### Step 1.2: Implement types.ts

**File**: `src/services/fiscal/types.ts`

```typescript
// Fiscal Year
export interface FiscalYear {
  id: string
  orgId: string
  yearNumber: number
  nameEn: string
  nameAr?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
  startDate: string  // ISO date
  endDate: string    // ISO date
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

// Fiscal Period
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

// Dashboard Summary
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

// Create/Update DTOs
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

// Period Activity (from get_period_activity RPC)
export interface PeriodActivity {
  periodId: string
  transactionCount: number
  totalDebits: number
  totalCredits: number
  netAmount: number
  lastTransactionDate?: string
  accountsAffected: number
}

// Validation Result (from validate_opening_balances RPC)
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

// Import Result (from import_opening_balances RPC)
export interface ImportResult {
  importId: string
  totalRows: number
  successRows: number
  failedRows: number
  status: 'processing' | 'completed' | 'partially_completed' | 'failed'
  errors: ValidationIssue[]
}
```

### Step 1.3: Implement fiscalYearService.ts

**File**: `src/services/fiscal/fiscalYearService.ts`

```typescript
import { supabase } from '@/utils/supabase'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from './types'

export class FiscalYearService {
  /**
   * Check if user can manage fiscal data for an org
   * Uses the newer fn_can_manage_fiscal_v2 function
   */
  static async canManage(orgId: string): Promise<boolean> {
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError || !userData?.user?.id) return false

    const { data, error } = await supabase.rpc('fn_can_manage_fiscal_v2', {
      p_org_id: orgId,
      p_user_id: userData.user.id
    })
    if (error) return false
    return data === true
  }

  /**
   * Get all fiscal years for an organization
   */
  static async getAll(orgId: string): Promise<FiscalYear[]> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .order('year_number', { ascending: false })
    
    if (error) throw new Error(`Failed to fetch fiscal years: ${error.message}`)
    return (data || []).map(this.mapFromDb)
  }

  /**
   * Get a single fiscal year by ID
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
   * Get the current active fiscal year
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
   * Create a new fiscal year with optional monthly periods
   * Uses RPC: create_fiscal_year
   */
  static async create(input: CreateFiscalYearInput): Promise<string> {
    const { data: userData, error: authError } = await supabase.auth.getUser()
    if (authError || !userData?.user?.id) throw new Error('Not authenticated')

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

    if (error) throw new Error(`Failed to create fiscal year: ${error.message}`)
    return data as string
  }

  /**
   * Update a fiscal year
   */
  static async update(id: string, input: UpdateFiscalYearInput): Promise<FiscalYear> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    
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

    if (error) throw new Error(`Failed to update fiscal year: ${error.message}`)
    return this.mapFromDb(data)
  }

  /**
   * Delete a fiscal year (only if draft and no periods)
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('fiscal_years')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')

    if (error) throw new Error(`Failed to delete fiscal year: ${error.message}`)
  }

  /**
   * Set a fiscal year as current (unsets others)
   */
  static async setCurrent(orgId: string, fiscalYearId: string): Promise<void> {
    await supabase
      .from('fiscal_years')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

    const { error } = await supabase
      .from('fiscal_years')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', fiscalYearId)

    if (error) throw new Error(`Failed to set current fiscal year: ${error.message}`)
  }

  /**
   * Activate a fiscal year
   */
  static async activate(id: string): Promise<FiscalYear> {
    return this.update(id, { status: 'active' })
  }

  /**
   * Close a fiscal year
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

    if (error) throw new Error(`Failed to close fiscal year: ${error.message}`)
    return this.mapFromDb(data)
  }

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

### Step 1.4: Implement fiscalPeriodService.ts

**File**: `src/services/fiscal/fiscalPeriodService.ts`

```typescript
import { supabase } from '@/utils/supabase'
import type { FiscalPeriod, CreateFiscalPeriodInput, PeriodActivity } from './types'

export class FiscalPeriodService {
  /**
   * Get all periods for a fiscal year
   */
  static async getAll(orgId: string, fiscalYearId: string): Promise<FiscalPeriod[]> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .order('period_number', { ascending: true })
    
    if (error) throw new Error(`Failed to fetch periods: ${error.message}`)
    return (data || []).map(this.mapFromDb)
  }

  /**
   * Get a single period by ID
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
   * Get the current period for an org
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
   * Get period activity using the database function
   * Uses RPC: get_period_activity
   */
  static async getActivity(periodId: string): Promise<PeriodActivity> {
    const { data, error } = await supabase.rpc('get_period_activity', {
      p_period_id: periodId
    })
    
    if (error) throw new Error(`Failed to get period activity: ${error.message}`)
    return data as PeriodActivity
  }

  /**
   * Lock a period (prevents new transactions)
   */
  static async lock(periodId: string): Promise<FiscalPeriod> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .eq('id', periodId)
      .select()
      .single()

    if (error) throw new Error(`Failed to lock period: ${error.message}`)
    return this.mapFromDb(data)
  }

  /**
   * Unlock a period
   */
  static async unlock(periodId: string): Promise<FiscalPeriod> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', periodId)
      .select()
      .single()

    if (error) throw new Error(`Failed to unlock period: ${error.message}`)
    return this.mapFromDb(data)
  }

  /**
   * Close a period permanently
   * Uses RPC: close_fiscal_period
   */
  static async close(periodId: string, notes?: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('close_fiscal_period', {
      p_period_id: periodId,
      p_user_id: userData?.user?.id,
      p_closing_notes: notes ?? null,
    })

    if (error) throw new Error(`Failed to close period: ${error.message}`)
    return data as boolean
  }

  /**
   * Set a period as current
   */
  static async setCurrent(orgId: string, periodId: string): Promise<void> {
    await supabase
      .from('fiscal_periods')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

    const { error } = await supabase
      .from('fiscal_periods')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', periodId)

    if (error) throw new Error(`Failed to set current period: ${error.message}`)
  }

  /**
   * Update period details
   */
  static async update(id: string, input: Partial<FiscalPeriod>): Promise<FiscalPeriod> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    
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

    if (error) throw new Error(`Failed to update period: ${error.message}`)
    return this.mapFromDb(data)
  }

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

### Step 1.5: Implement React Query Hooks

**File**: `src/services/fiscal/hooks/useFiscalYear.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalYearService } from '../fiscalYearService'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from '../types'

// Query Keys
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
 */
export function useFiscalYears(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.list(orgId || ''),
    queryFn: () => FiscalYearService.getAll(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch a single fiscal year
 */
export function useFiscalYear(id: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.detail(id || ''),
    queryFn: () => FiscalYearService.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to fetch the current fiscal year
 */
export function useCurrentFiscalYear(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.current(orgId || ''),
    queryFn: () => FiscalYearService.getCurrent(orgId!),
    enabled: !!orgId,
  })
}

/**
 * Hook to create a fiscal year
 */
export function useCreateFiscalYear() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (input: CreateFiscalYearInput) => FiscalYearService.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(variables.orgId) })
    },
  })
}

/**
 * Hook to update a fiscal year
 */
export function useUpdateFiscalYear(orgId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFiscalYearInput }) => 
      FiscalYearService.update(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
      queryClient.setQueryData(fiscalYearKeys.detail(data.id), data)
    },
  })
}

/**
 * Hook to delete a fiscal year
 */
export function useDeleteFiscalYear(orgId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => FiscalYearService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
    },
  })
}

/**
 * Hook to set current fiscal year
 */
export function useSetCurrentFiscalYear(orgId: string) {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (fiscalYearId: string) => FiscalYearService.setCurrent(orgId, fiscalYearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.current(orgId) })
    },
  })
}
```

**File**: `src/services/fiscal/hooks/useFiscalPeriods.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalPeriodService } from '../fiscalPeriodService'
import type { FiscalPeriod } from '../types'

// Query Keys
export const fiscalPeriodKeys = {
  all: ['fiscalPeriods'] as const,
  lists: () => [...fiscalPeriodKeys.all, 'list'] as const,
  list: (orgId: string, fiscalYearId: string) => [...fiscalPeriodKeys.lists(), orgId, fiscalYearId] as const,
  details: () => [...fiscalPeriodKeys.all, 'detail'] as const,
  detail: (id: string) => [...fiscalPeriodKeys.details(), id] as const,
  current: (orgId: string) => [...fiscalPeriodKeys.all, 'current', orgId] as const,
  activities: () => [...fiscalPeriodKeys.all, 'activity'] as const,
  activity: (periodId: string) => [...fiscalPeriodKeys.activities(), periodId] as const,
}

/**
 * Hook to fetch all periods for a fiscal year
 */
export function useFiscalPeriods(orgId: string | null | undefined, fiscalYearId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.list(orgId || '', fiscalYearId || ''),
    queryFn: () => FiscalPeriodService.getAll(orgId!, fiscalYearId!),
    enabled: !!orgId && !!fiscalYearId,
  })
}

/**
 * Hook to fetch a single period
 */
export function useFiscalPeriod(id: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.detail(id || ''),
    queryFn: () => FiscalPeriodService.getById(id!),
    enabled: !!id,
  })
}

/**
 * Hook to fetch the current period
 */
export function useCurrentFiscalPeriod(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.current(orgId || ''),
    queryFn: () => FiscalPeriodService.getCurrent(orgId!),
    enabled: !!orgId,
  })
}

/**
 * Hook to fetch period activity
 */
export function usePeriodActivity(periodId: string | null | undefined) {
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
```

### Step 1.6: Create index.ts Exports

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

### Step 1.7: Add Unit Tests

**File**: `src/services/fiscal/__tests__/fiscalYearService.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FiscalYearService } from '../fiscalYearService'
import * as supabase from '@/utils/supabase'

// Mock supabase
vi.mock('@/utils/supabase')

describe('FiscalYearService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should fetch all fiscal years for an org', async () => {
      const mockData = [
        { id: '1', org_id: 'org-1', year_number: 2024, name_en: 'FY 2024' },
        { id: '2', org_id: 'org-1', year_number: 2025, name_en: 'FY 2025' },
      ]

      vi.mocked(supabase.supabase)
        .from('fiscal_years')
        .select()
        .eq()
        .order()
        // Configure mock return

      // Test
      // Verify call
    })
  })

  describe('create', () => {
    it('should create a fiscal year using RPC', async () => {
      // Test implementation
    })
  })
})
```

---

## 🔧 Phase 2: Migrate UI Components (Week 2)

### Step 2.1: Update FiscalYearSelector Component

**File**: `src/components/Fiscal/FiscalYearSelector.tsx`

Replace all direct Supabase calls with new service:

```typescript
import { useFiscalYears } from '@/services/fiscal'

export function FiscalYearSelector({ orgId, value, onChange }) {
  const { data: fiscalYears, isLoading, error } = useFiscalYears(orgId)

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select fiscal year" />
      </SelectTrigger>
      <SelectContent>
        {fiscalYears?.map((fy) => (
          <SelectItem key={fy.id} value={fy.id}>
            {fy.nameEn}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### Step 2.2: Consolidate FiscalYearDashboard + EnhancedFiscalYearDashboard

**File**: `src/pages/Fiscal/FiscalYearDashboard.tsx` (New unified version)

- Use new service hooks
- Support both RTL and LTR with single component
- Replace hardcoded logic with service calls

### Step 2.3: Consolidate FiscalPeriodManager + EnhancedFiscalPeriodManager

**File**: `src/pages/Fiscal/FiscalPeriodManager.tsx` (New unified version)

- Replace FiscalPeriodService (STUB) calls with FiscalPeriodService (new unified)
- Update period locking/closing to use new hooks
- Add period activity display using `usePeriodActivity()` hook

### Step 2.4: Update Route Configuration

**File**: `src/routes/index.tsx` or router config

```typescript
// DELETE these routes
// DELETE: /fiscal/dashboard (basic)
// DELETE: /fiscal/enhanced/dashboard (enhanced basic)
// DELETE: /fiscal/periods (basic)
// DELETE: /fiscal/enhanced/periods (enhanced basic)

// ADD unified routes
{
  path: '/fiscal/dashboard',
  element: <FiscalYearDashboard />,  // New unified component
}

{
  path: '/fiscal/periods',
  element: <FiscalPeriodManager />,  // New unified component
}

// Keep construction and specialized pages
{
  path: '/fiscal/construction',
  element: <ConstructionDashboard />,
}
```

---

## 🗑️ Phase 3: Remove Legacy Code (Week 3)

### Step 3.1: Delete Stub Services

```bash
# These are STUB implementations returning fake data - DELETE THEM
rm src/services/FiscalYearService.ts
rm src/services/FiscalPeriodService.ts
```

### Step 3.2: Merge FiscalYearManagementService into Unified Service

- Copy any unique methods from `FiscalYearManagementService.ts` into `src/services/fiscal/fiscalYearService.ts`
- Delete `src/services/FiscalYearManagementService.ts`

### Step 3.3: Enhance PeriodClosingService

- Import from unified service instead of stub
- Add new methods leveraging database functions
- Keep as specialized service for complex workflows

### Step 3.4: Update All Imports

```bash
# Find all imports of deleted services
grep -r "FiscalYearService" src/ --include="*.tsx" --include="*.ts"
grep -r "FiscalPeriodService" src/ --include="*.tsx" --include="*.ts"

# Replace with:
import { FiscalYearService, FiscalPeriodService, useFiscalYears, useFiscalPeriods } from '@/services/fiscal'
```

### Step 3.5: Delete Duplicate Pages

```bash
# DELETE basic pages (keep enhanced as base)
rm src/pages/Fiscal/FiscalYearDashboard.tsx.old
rm src/pages/Fiscal/FiscalPeriodManager.tsx.old
rm src/pages/Fiscal/OpeningBalanceImport.tsx.old  # If basic version exists

# DELETE direct Supabase integration pages
# Keep specialized pages like ConstructionDashboard
```

### Step 3.6: Remove Unused Components

```bash
# These may become obsolete:
# - LoadingOverlay (if not used elsewhere)
# - Old form components for basic fiscal operations
# Verify usage before deleting
```

---

## 🚀 Phase 4: Enterprise Features (Week 4)

### Step 4.1: Implement Audit Trail Service

**File**: `src/services/fiscal/auditService.ts`

```typescript
export interface FiscalAuditEntry {
  id: string
  entityType: 'fiscal_year' | 'fiscal_period'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'status_change'
  previousValue: Record<string, any>
  newValue: Record<string, any>
  userId: string
  timestamp: string
  ipAddress?: string
}

export class FiscalAuditService {
  static async getAuditTrail(entityId: string, entityType: string) {
    const { data, error } = await supabase
      .from('fiscal_audit_logs')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('timestamp', { ascending: false })
    
    if (error) throw error
    return data
  }

  static async logAction(entry: Omit<FiscalAuditEntry, 'id' | 'timestamp'>) {
    const { error } = await supabase
      .from('fiscal_audit_logs')
      .insert({ ...entry, timestamp: new Date().toISOString() })
    
    if (error) throw error
  }
}
```

### Step 4.2: Implement Bulk Operations Service

**File**: `src/services/fiscal/bulkOperationService.ts`

```typescript
export class BulkOperationService {
  /**
   * Lock multiple periods atomically
   */
  static async lockMultiplePeriods(periodIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .in('id', periodIds)
    
    if (error) throw error
  }

  /**
   * Close multiple periods with notes
   */
  static async closeMultiplePeriods(operations: Array<{ periodId: string; notes?: string }>) {
    for (const op of operations) {
      await FiscalPeriodService.close(op.periodId, op.notes)
    }
  }

  /**
   * Activate multiple fiscal years (set to active, unset others)
   */
  static async bulkActivatePeriods(fiscalYearId: string) {
    // Implement bulk activation logic
  }
}
```

### Step 4.3: Implement Fiscal Year Templates

**File**: `src/services/fiscal/templateService.ts`

```typescript
export interface FiscalYearTemplate {
  id: string
  orgId: string
  name: string
  nameAr?: string
  periodType: 'monthly' | 'quarterly' | 'bimonthly' | 'custom'
  periods: {
    periodNumber: number
    name: string
    nameAr?: string
    startOffset: number  // days from year start
    endOffset: number
  }[]
}

export class TemplateService {
  static async createTemplate(template: Omit<FiscalYearTemplate, 'id'>) {
    const { data, error } = await supabase
      .from('fiscal_year_templates')
      .insert(template)
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  static async getTemplates(orgId: string) {
    const { data, error } = await supabase
      .from('fiscal_year_templates')
      .select('*')
      .eq('org_id', orgId)
    
    if (error) throw error
    return data
  }

  static async applyTemplate(fiscalYearId: string, templateId: string) {
    // Apply template structure to fiscal year
  }
}
```

### Step 4.4: Add Advanced Validation Rules

**File**: `src/services/fiscal/validationService.ts`

```typescript
export class ValidationService {
  /**
   * Validate opening balances using database function
   */
  static async validateOpeningBalances(orgId: string, fiscalYearId: string) {
    const { data, error } = await supabase.rpc('validate_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId
    })
    
    if (error) throw error
    return data
  }

  /**
   * Validate construction-specific opening balances
   */
  static async validateConstructionBalances(orgId: string, fiscalYearId: string) {
    const { data, error } = await supabase.rpc('validate_construction_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId
    })
    
    if (error) throw error
    return data
  }

  /**
   * Get active validation rules for an org
   */
  static async getActiveRules(orgId: string) {
    const { data, error } = await supabase
      .from('opening_balance_validation_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('active', true)
    
    if (error) throw error
    return data
  }
}
```

### Step 4.5: Implement Fiscal Year Comparison

**File**: `src/services/fiscal/comparisonService.ts`

```typescript
export class ComparisonService {
  /**
   * Compare two fiscal years
   */
  static async compareFiscalYears(currentYearId: string, previousYearId: string) {
    const [current, previous] = await Promise.all([
      FiscalYearService.getById(currentYearId),
      FiscalYearService.getById(previousYearId)
    ])

    // Calculate metrics
    const currentPeriods = await FiscalPeriodService.getAll(current?.orgId!, currentYearId)
    const previousPeriods = await FiscalPeriodService.getAll(previous?.orgId!, previousYearId)

    return {
      currentYear: current,
      previousYear: previous,
      metrics: {
        periodCountChange: currentPeriods.length - previousPeriods.length,
        openPeriodsChange: currentPeriods.filter(p => p.status === 'open').length,
        closedPeriodsChange: currentPeriods.filter(p => p.status === 'closed').length,
      }
    }
  }
}
```

---

## 📊 Files Summary

### DELETE (Stub/Duplicate)
```
src/services/FiscalYearService.ts
src/services/FiscalPeriodService.ts
src/pages/Fiscal/FiscalYearDashboard.tsx (old basic version)
src/pages/Fiscal/FiscalPeriodManager.tsx (old basic version)
src/pages/Fiscal/OpeningBalanceImport.tsx (old basic version)
```

### CREATE (New Unified)
```
src/services/fiscal/
├── index.ts
├── types.ts
├── fiscalYearService.ts
├── fiscalPeriodService.ts
├── auditService.ts (Phase 4)
├── bulkOperationService.ts (Phase 4)
├── templateService.ts (Phase 4)
├── validationService.ts (Phase 4)
├── comparisonService.ts (Phase 4)
├── reconciliationService.ts
├── openingBalanceService.ts
└── hooks/
    ├── useFiscalYear.ts
    ├── useFiscalPeriods.ts
    ├── useOpeningBalances.ts
    └── useFiscalDashboard.ts
```

### REPLACE (Update imports)
```
src/pages/Fiscal/FiscalYearDashboard.tsx (new unified)
src/pages/Fiscal/FiscalPeriodManager.tsx (new unified)
src/components/Fiscal/FiscalYearSelector.tsx (use new hooks)
src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx (merge into unified)
src/pages/Fiscal/EnhancedFiscalPeriodManager.tsx (merge into unified)
```

### KEEP (No changes needed)
```
src/pages/Fiscal/ConstructionDashboard.tsx
src/pages/Fiscal/OpeningBalanceImport.tsx (enhanced)
src/pages/Fiscal/ValidationRuleManager.tsx
src/pages/Fiscal/BalanceReconciliationDashboard.tsx
src/services/PeriodClosingService.ts (enhance)
src/services/FiscalDashboardService.ts (refactor)
```

---

## ✅ Verification Checklist

### Phase 1 Complete
- [ ] All service files created with full TypeScript types
- [ ] `fiscalYearService.ts` has 10+ methods with proper error handling
- [ ] `fiscalPeriodService.ts` has 8+ methods including lock/unlock/close
- [ ] React Query hooks created with proper query key management
- [ ] Unit tests written for core service methods
- [ ] All methods use Supabase client correctly (not stubs)

### Phase 2 Complete
- [ ] FiscalYearSelector component updated to use new hooks
- [ ] Basic and Enhanced dashboards consolidated into one
- [ ] Basic and Enhanced period managers consolidated into one
- [ ] Routes updated to point to unified components
- [ ] All pages use new service instead of stubs
- [ ] No direct Supabase calls in UI components

### Phase 3 Complete
- [ ] Deleted: FiscalYearService.ts (stub)
- [ ] Deleted: FiscalPeriodService.ts (stub)
- [ ] Deleted: All duplicate basic pages
- [ ] Updated: All imports across codebase
- [ ] Verified: No more references to deleted files
- [ ] Merged: FiscalYearManagementService into unified service

### Phase 4 Complete
- [ ] Audit trail service implemented
- [ ] Bulk operations service implemented
- [ ] Fiscal year templates working
- [ ] Advanced validation rules implemented
- [ ] Fiscal year comparison working
- [ ] All new services have tests
- [ ] Dashboard displays new features

### Quality Assurance
- [ ] All TypeScript strict mode passes
- [ ] No console errors in browser
- [ ] Fiscal years load real data (not stubs)
- [ ] Fiscal periods load real data (not stubs)
- [ ] Creating fiscal year works end-to-end
- [ ] Closing periods works end-to-end
- [ ] Permission checks work (fn_can_manage_fiscal_v2)
- [ ] Bilingual support works (EN/AR)
- [ ] Audit trail captures all changes
- [ ] Performance: list queries under 500ms

---

## 🎨 Theme Token Configuration

**File**: `src/theme/fiscal-tokens.ts`

```typescript
import { tokens } from '@/theme/tokens'

export const fiscalStatusTokens = {
  fiscalYear: {
    draft: {
      bg: tokens.palette.grey[100],
      text: tokens.palette.grey[500],
      border: tokens.palette.grey[500],
      icon: tokens.palette.grey[500],
    },
    active: {
      bg: tokens.palette.success[100],
      text: tokens.palette.success[500],
      border: tokens.palette.success[500],
      icon: tokens.palette.success[500],
    },
    closed: {
      bg: tokens.palette.grey[900],
      text: tokens.palette.grey[700],
      border: tokens.palette.grey[700],
      icon: tokens.palette.grey[700],
    },
    archived: {
      bg: tokens.palette.grey[300],
      text: tokens.palette.grey[400],
      border: tokens.palette.grey[400],
      icon: tokens.palette.grey[400],
    },
  },
  
  fiscalPeriod: {
    open: {
      bg: tokens.palette.success[100],
      text: tokens.palette.success[500],
      border: tokens.palette.success[500],
      icon: tokens.palette.success[500],
    },
    locked: {
      bg: tokens.palette.warning[100],
      text: tokens.palette.warning[500],
      border: tokens.palette.warning[500],
      icon: tokens.palette.warning[500],
    },
    closed: {
      bg: tokens.palette.grey[900],
      text: tokens.palette.grey[700],
      border: tokens.palette.grey[700],
      icon: tokens.palette.grey[700],
    },
  },
}
```

---

## 🔍 Success Metrics

### Before Implementation
- 5 overlapping services
- 14 duplicate UI pages
- Stub implementations returning fake data
- Multiple sources of truth
- Inconsistent error handling

### After Implementation
- 1 unified service layer with 8 specialized services
- 7 consolidated UI pages
- All real data from Supabase
- Single source of truth
- Consistent error handling and logging
- Full audit trail
- Bulk operations support
- Enterprise validation rules
- ~60% code duplication reduction
- 100% TypeScript strict mode compliance

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue**: Import errors after deleting stub services
**Solution**: Update all imports to use unified service from `src/services/fiscal`

**Issue**: RPC functions not found
**Solution**: Verify function names match exactly (case-sensitive), check Supabase console

**Issue**: Permission denied on fiscal operations
**Solution**: Verify user has correct role, check `fn_can_manage_fiscal_v2` implementation

**Issue**: Data not updating in UI after mutation
**Solution**: Verify React Query cache invalidation in mutation `onSuccess` callback

---

## 📝 Implementation Notes

- Start with Phase 1 to establish solid foundation
- Don't proceed to Phase 2 until Phase 1 is fully tested
- Phase 3 cleanup should be done incrementally
- Phase 4 features add significant value for construction accounting
- Keep PeriodClosingService for complex workflows not covered by base services
- Maintain backward compatibility during migration if needed

---

**Document Version**: 1.0  
**Last Updated**: December 5, 2025  
**Status**: Ready for Implementation  
**Assigned To**: Al-Baraka Construction Company Engineering Team