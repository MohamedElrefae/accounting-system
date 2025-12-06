# Fiscal Year & Periods System - Technical Implementation Plan

> **For**: Perplexity AI-Assisted Implementation  
> **Project**: Al-Baraka Construction Company Accounting System  
> **Date**: December 5, 2025  
> **Duration**: 4 Weeks  
> **Tech Stack**: React 18, TypeScript, Supabase, React Query, MUI

---

## 🎯 Project Overview

### Objective
Consolidate fragmented fiscal year and periods management into a unified, enterprise-grade service layer.

### Current State Analysis
- **5 services** with overlapping responsibilities (2 are STUB implementations)
- **14 UI pages** with duplicate functionality
- **9 database functions** (2 are unused)
- **Data sync issues** between components

### Target State
- **2 unified services** with full CRUD operations
- **7 consolidated UI pages**
- **100% real data** (no stubs)
- **Single source of truth** pattern


---

## 📁 Current Codebase Inventory

### Services to DELETE (STUB - Return Fake Data)

```
FILE: src/services/FiscalYearService.ts
STATUS: ❌ STUB - Returns hardcoded fake data
PROBLEM: Does NOT connect to Supabase
ACTION: DELETE after migration

FILE: src/services/FiscalPeriodService.ts  
STATUS: ❌ STUB - Returns hardcoded fake data
PROBLEM: Does NOT connect to Supabase
ACTION: DELETE after migration
```

### Services to KEEP and MERGE

```
FILE: src/services/FiscalYearManagementService.ts
STATUS: ✅ REAL - Uses Supabase
METHODS: getFiscalYears(), createFiscalYear()
ACTION: MERGE into unified service

FILE: src/services/PeriodClosingService.ts
STATUS: ✅ REAL - Uses Supabase
METHODS: closePeriod(), lockPeriod(), unlockPeriod(), getChecklist()
ACTION: MERGE into unified service

FILE: src/services/FiscalDashboardService.ts
STATUS: ⚠️ PARTIAL - Simple helper
METHODS: summarizeFiscal()
ACTION: MERGE into React Query hooks
```

### UI Pages to CONSOLIDATE

```
DELETE (Basic versions):
- src/pages/Fiscal/FiscalYearDashboard.tsx
- src/pages/Fiscal/FiscalPeriodManager.tsx
- src/pages/Fiscal/OpeningBalanceImport.tsx

KEEP (Enhanced versions - rename to unified):
- src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx → FiscalYearDashboard.tsx
- src/pages/Fiscal/EnhancedFiscalPeriodManager.tsx → FiscalPeriodManager.tsx
- src/pages/Fiscal/EnhancedOpeningBalanceImport.tsx → OpeningBalanceImport.tsx
- src/pages/Fiscal/EnhancedFiscalHub.tsx → FiscalHub.tsx

KEEP (No changes):
- src/pages/Fiscal/ConstructionDashboard.tsx
- src/pages/Fiscal/ValidationRuleManager.tsx
- src/pages/Fiscal/BalanceReconciliationDashboard.tsx
- src/pages/Fiscal/OpeningBalanceApprovalWorkflow.tsx
- src/pages/Fiscal/OpeningBalanceAuditTrail.tsx
- src/pages/Fiscal/ApprovalNotificationCenter.tsx
```

---

## 🗄️ Database Schema (Production Verified)

### Tables

```sql
-- fiscal_years (17 columns)
id, org_id, year_number, name_en, name_ar, description_en, description_ar,
start_date, end_date, status, is_current, closed_at, closed_by,
created_by, updated_by, created_at, updated_at

-- fiscal_periods (20 columns)
id, org_id, fiscal_year_id, period_number, period_code, name_en, name_ar,
description_en, description_ar, start_date, end_date, status, is_current,
closing_notes, closed_at, closed_by, created_by, updated_by, created_at, updated_at

-- Supporting tables
period_closing_checklists, opening_balance_imports, opening_balances,
opening_balance_validation_rules, trial_balance_view_period
```

### Database Functions (RPCs)

```sql
-- MUST USE (Production Ready)
create_fiscal_year(p_org_id, p_year_number, p_start_date, p_end_date, ...) → uuid
close_fiscal_period(p_period_id, p_user_id, p_closing_notes) → boolean
validate_opening_balances(p_org_id, p_fiscal_year_id) → jsonb
import_opening_balances(p_org_id, p_fiscal_year_id, p_import_data, ...) → uuid
fn_can_manage_fiscal_v2(p_org_id, p_user_id) → boolean  -- USE v2, not v1!

-- CURRENTLY UNUSED (Should leverage)
get_period_activity(p_period_id) → record
debug_fiscal_context(p_org_id) → jsonb
```


---

## 🚀 PHASE 1: Create Unified Service Layer (Week 1)

### Task 1.1: Create Directory Structure

**Prompt for Perplexity**:
```
Create the following directory structure in src/services/fiscal/:
- index.ts (exports)
- types.ts (TypeScript interfaces)
- fiscalYearService.ts (fiscal year CRUD)
- fiscalPeriodService.ts (period CRUD)
- hooks/useFiscalYear.ts (React Query hooks)
- hooks/useFiscalPeriods.ts (React Query hooks)
```

**Expected Output**:
```
src/services/fiscal/
├── index.ts
├── types.ts
├── fiscalYearService.ts
├── fiscalPeriodService.ts
└── hooks/
    ├── useFiscalYear.ts
    └── useFiscalPeriods.ts
```

### Task 1.2: Create types.ts

**Prompt for Perplexity**:
```
Create src/services/fiscal/types.ts with TypeScript interfaces for:
1. FiscalYear - matches fiscal_years table (use camelCase)
2. FiscalPeriod - matches fiscal_periods table (use camelCase)
3. FiscalYearStatus = 'draft' | 'active' | 'closed' | 'archived'
4. FiscalPeriodStatus = 'open' | 'locked' | 'closed'
5. CreateFiscalYearInput - for create operations
6. UpdateFiscalYearInput - for update operations
7. PeriodActivity - for get_period_activity RPC result
8. ValidationResult - for validate_opening_balances RPC result
```

**File Content**:
```typescript
// src/services/fiscal/types.ts

export interface FiscalYear {
  id: string
  orgId: string
  yearNumber: number
  nameEn: string
  nameAr?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
  startDate: string
  endDate: string
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
  errors: Array<{ code: string; message: string; row?: any }>
  warnings: Array<{ code: string; message: string; row?: any }>
  totals: { count: number; sum: number }
  byAccount: Array<{ accountId: string; total: number }>
  byProject: Array<{ projectId: string; total: number }>
  byCostCenter: Array<{ costCenterId: string; total: number }>
}
```


### Task 1.3: Create fiscalYearService.ts

**Prompt for Perplexity**:
```
Create src/services/fiscal/fiscalYearService.ts with these methods:
1. canManage(orgId) - uses fn_can_manage_fiscal_v2 RPC
2. getAll(orgId) - fetches all fiscal years
3. getById(id) - fetches single fiscal year
4. getCurrent(orgId) - fetches current fiscal year (is_current=true)
5. create(input) - uses create_fiscal_year RPC
6. update(id, input) - updates fiscal year
7. delete(id) - deletes draft fiscal year
8. setCurrent(orgId, fiscalYearId) - sets current year
9. activate(id) - changes status to 'active'
10. close(id) - changes status to 'closed'

Use Supabase client from @/utils/supabase
Include mapFromDb helper to convert snake_case to camelCase
```

**File Content**:
```typescript
// src/services/fiscal/fiscalYearService.ts

import { supabase } from '@/utils/supabase'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from './types'

export class FiscalYearService {
  // Check permission using v2 function
  static async canManage(orgId: string): Promise<boolean> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user?.id) return false

    const { data, error } = await supabase.rpc('fn_can_manage_fiscal_v2', {
      p_org_id: orgId,
      p_user_id: userData.user.id
    })
    return error ? false : data === true
  }

  // Get all fiscal years for org
  static async getAll(orgId: string): Promise<FiscalYear[]> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .order('year_number', { ascending: false })
    
    if (error) throw new Error(`Failed to fetch fiscal years: ${error.message}`)
    return (data || []).map(this.mapFromDb)
  }

  // Get single fiscal year
  static async getById(id: string): Promise<FiscalYear | null> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`Failed to fetch fiscal year: ${error.message}`)
    return data ? this.mapFromDb(data) : null
  }

  // Get current fiscal year
  static async getCurrent(orgId: string): Promise<FiscalYear | null> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_current', true)
      .single()
    
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`Failed to fetch current fiscal year: ${error.message}`)
    return data ? this.mapFromDb(data) : null
  }

  // Create using RPC (auto-generates periods)
  static async create(input: CreateFiscalYearInput): Promise<string> {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user?.id) throw new Error('Not authenticated')

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

  // Update fiscal year
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

  // Delete (only draft)
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('fiscal_years')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')

    if (error) throw new Error(`Failed to delete fiscal year: ${error.message}`)
  }

  // Set as current (unsets others)
  static async setCurrent(orgId: string, fiscalYearId: string): Promise<void> {
    await supabase
      .from('fiscal_years')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

    const { error } = await supabase
      .from('fiscal_years')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', fiscalYearId)

    if (error) throw new Error(`Failed to set current: ${error.message}`)
  }

  // Activate
  static async activate(id: string): Promise<FiscalYear> {
    return this.update(id, { status: 'active' })
  }

  // Close
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

    if (error) throw new Error(`Failed to close: ${error.message}`)
    return this.mapFromDb(data)
  }

  // Map DB row to TypeScript interface
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


### Task 1.4: Create fiscalPeriodService.ts

**Prompt for Perplexity**:
```
Create src/services/fiscal/fiscalPeriodService.ts with these methods:
1. getAll(orgId, fiscalYearId) - fetches all periods for a fiscal year
2. getById(id) - fetches single period
3. getCurrent(orgId) - fetches current period (is_current=true)
4. getActivity(periodId) - uses get_period_activity RPC
5. lock(periodId) - sets status to 'locked'
6. unlock(periodId) - sets status to 'open'
7. close(periodId, notes) - uses close_fiscal_period RPC
8. setCurrent(orgId, periodId) - sets current period
9. update(id, input) - updates period details

Use Supabase client from @/utils/supabase
Include mapFromDb helper to convert snake_case to camelCase
```

**File Content**:
```typescript
// src/services/fiscal/fiscalPeriodService.ts

import { supabase } from '@/utils/supabase'
import type { FiscalPeriod, PeriodActivity } from './types'

export class FiscalPeriodService {
  // Get all periods for fiscal year
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

  // Get single period
  static async getById(id: string): Promise<FiscalPeriod | null> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`Failed to fetch period: ${error.message}`)
    return data ? this.mapFromDb(data) : null
  }

  // Get current period
  static async getCurrent(orgId: string): Promise<FiscalPeriod | null> {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_current', true)
      .single()
    
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`Failed to fetch current period: ${error.message}`)
    return data ? this.mapFromDb(data) : null
  }

  // Get period activity (uses RPC)
  static async getActivity(periodId: string): Promise<PeriodActivity> {
    const { data, error } = await supabase.rpc('get_period_activity', {
      p_period_id: periodId
    })
    
    if (error) throw new Error(`Failed to get activity: ${error.message}`)
    return data as PeriodActivity
  }

  // Lock period
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

  // Unlock period
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

  // Close period (uses RPC)
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

  // Set as current
  static async setCurrent(orgId: string, periodId: string): Promise<void> {
    await supabase
      .from('fiscal_periods')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

    const { error } = await supabase
      .from('fiscal_periods')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', periodId)

    if (error) throw new Error(`Failed to set current: ${error.message}`)
  }

  // Update period
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

  // Map DB row to TypeScript interface
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


### Task 1.5: Create React Query Hooks

**Prompt for Perplexity**:
```
Create src/services/fiscal/hooks/useFiscalYear.ts with React Query hooks:
1. useFiscalYears(orgId) - fetches all fiscal years
2. useFiscalYear(id) - fetches single fiscal year
3. useCurrentFiscalYear(orgId) - fetches current fiscal year
4. useCreateFiscalYear() - mutation to create
5. useUpdateFiscalYear(orgId) - mutation to update
6. useDeleteFiscalYear(orgId) - mutation to delete
7. useSetCurrentFiscalYear(orgId) - mutation to set current

Use @tanstack/react-query
Include proper query key management for cache invalidation
```

**File Content**:
```typescript
// src/services/fiscal/hooks/useFiscalYear.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalYearService } from '../fiscalYearService'
import type { CreateFiscalYearInput, UpdateFiscalYearInput } from '../types'

// Query Keys
export const fiscalYearKeys = {
  all: ['fiscalYears'] as const,
  lists: () => [...fiscalYearKeys.all, 'list'] as const,
  list: (orgId: string) => [...fiscalYearKeys.lists(), orgId] as const,
  details: () => [...fiscalYearKeys.all, 'detail'] as const,
  detail: (id: string) => [...fiscalYearKeys.details(), id] as const,
  current: (orgId: string) => [...fiscalYearKeys.all, 'current', orgId] as const,
}

// Fetch all fiscal years
export function useFiscalYears(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.list(orgId || ''),
    queryFn: () => FiscalYearService.getAll(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch single fiscal year
export function useFiscalYear(id: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.detail(id || ''),
    queryFn: () => FiscalYearService.getById(id!),
    enabled: !!id,
  })
}

// Fetch current fiscal year
export function useCurrentFiscalYear(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalYearKeys.current(orgId || ''),
    queryFn: () => FiscalYearService.getCurrent(orgId!),
    enabled: !!orgId,
  })
}

// Create fiscal year
export function useCreateFiscalYear() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFiscalYearInput) => FiscalYearService.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(variables.orgId) })
    },
  })
}

// Update fiscal year
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

// Delete fiscal year
export function useDeleteFiscalYear(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => FiscalYearService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalYearKeys.list(orgId) })
    },
  })
}

// Set current fiscal year
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

**File Content for Periods**:
```typescript
// src/services/fiscal/hooks/useFiscalPeriods.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiscalPeriodService } from '../fiscalPeriodService'

// Query Keys
export const fiscalPeriodKeys = {
  all: ['fiscalPeriods'] as const,
  lists: () => [...fiscalPeriodKeys.all, 'list'] as const,
  list: (orgId: string, fiscalYearId: string) => [...fiscalPeriodKeys.lists(), orgId, fiscalYearId] as const,
  details: () => [...fiscalPeriodKeys.all, 'detail'] as const,
  detail: (id: string) => [...fiscalPeriodKeys.details(), id] as const,
  current: (orgId: string) => [...fiscalPeriodKeys.all, 'current', orgId] as const,
  activity: (periodId: string) => [...fiscalPeriodKeys.all, 'activity', periodId] as const,
}

// Fetch all periods
export function useFiscalPeriods(orgId: string | null | undefined, fiscalYearId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.list(orgId || '', fiscalYearId || ''),
    queryFn: () => FiscalPeriodService.getAll(orgId!, fiscalYearId!),
    enabled: !!orgId && !!fiscalYearId,
  })
}

// Fetch single period
export function useFiscalPeriod(id: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.detail(id || ''),
    queryFn: () => FiscalPeriodService.getById(id!),
    enabled: !!id,
  })
}

// Fetch current period
export function useCurrentFiscalPeriod(orgId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.current(orgId || ''),
    queryFn: () => FiscalPeriodService.getCurrent(orgId!),
    enabled: !!orgId,
  })
}

// Fetch period activity
export function usePeriodActivity(periodId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalPeriodKeys.activity(periodId || ''),
    queryFn: () => FiscalPeriodService.getActivity(periodId!),
    enabled: !!periodId,
  })
}

// Lock period
export function useLockPeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (periodId: string) => FiscalPeriodService.lock(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
    },
  })
}

// Unlock period
export function useUnlockPeriod(orgId: string, fiscalYearId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (periodId: string) => FiscalPeriodService.unlock(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fiscalPeriodKeys.list(orgId, fiscalYearId) })
    },
  })
}

// Close period
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


### Task 1.6: Create index.ts Exports

**File Content**:
```typescript
// src/services/fiscal/index.ts

// Types
export * from './types'

// Services
export { FiscalYearService } from './fiscalYearService'
export { FiscalPeriodService } from './fiscalPeriodService'

// Hooks
export * from './hooks/useFiscalYear'
export * from './hooks/useFiscalPeriods'
```

### Task 1.7: Verification Checklist for Phase 1

**Prompt for Perplexity**:
```
Verify Phase 1 implementation:
1. Check src/services/fiscal/ directory exists with all files
2. Run TypeScript compiler: npx tsc --noEmit
3. Verify no import errors
4. Test FiscalYearService.getAll() returns real data
5. Test FiscalPeriodService.getAll() returns real data
6. Verify hooks work with React Query DevTools
```

---

## 🔧 PHASE 2: Migrate UI Components (Week 2)

### Task 2.1: Update FiscalYearSelector Component

**Current File**: `src/components/Fiscal/FiscalYearSelector.tsx`

**Prompt for Perplexity**:
```
Update src/components/Fiscal/FiscalYearSelector.tsx to:
1. Remove direct Supabase calls
2. Import useFiscalYears from '@/services/fiscal'
3. Use the hook instead of useState + useEffect
4. Keep the same props interface for backward compatibility
```

**Updated Code**:
```typescript
// src/components/Fiscal/FiscalYearSelector.tsx

import React from 'react'
import { MenuItem, TextField, Skeleton } from '@mui/material'
import { useFiscalYears } from '@/services/fiscal'
import { getActiveOrgId } from '@/utils/org'

export interface FiscalYearSelectorProps {
  orgId?: string | null
  value?: string | null
  onChange?: (fiscalYearId: string) => void
  label?: string
  helperText?: string
  size?: 'small' | 'medium'
  persistKey?: string
  sx?: any
}

export const FiscalYearSelector: React.FC<FiscalYearSelectorProps> = ({
  orgId,
  value,
  onChange,
  label = 'Fiscal Year',
  helperText,
  size = 'small',
  persistKey = 'fiscal_year_id',
  sx,
}) => {
  const effectiveOrg = orgId ?? getActiveOrgId()
  const { data: years, isLoading, error } = useFiscalYears(effectiveOrg)
  
  const [selected, setSelected] = React.useState<string>(() => {
    try {
      return value ?? localStorage.getItem(persistKey) ?? ''
    } catch {
      return value ?? ''
    }
  })

  // Auto-select current year if none selected
  React.useEffect(() => {
    if (!selected && years?.length) {
      const current = years.find(y => y.isCurrent) || years[0]
      if (current) {
        setSelected(current.id)
        try { localStorage.setItem(persistKey, current.id) } catch {}
        onChange?.(current.id)
      }
    }
  }, [years, selected, persistKey, onChange])

  const handleChange = (id: string) => {
    setSelected(id)
    try { localStorage.setItem(persistKey, id) } catch {}
    onChange?.(id)
  }

  if (isLoading) return <Skeleton variant="rectangular" width={200} height={40} />
  if (error) return <TextField disabled label={label} value="Error loading" size={size} sx={sx} />

  return (
    <TextField
      select
      size={size}
      label={label}
      value={selected}
      onChange={(e) => handleChange(e.target.value)}
      helperText={helperText}
      sx={sx}
      disabled={!effectiveOrg}
    >
      {(years || []).map((y) => (
        <MenuItem key={y.id} value={y.id}>
          {y.yearNumber} - {y.nameEn}
        </MenuItem>
      ))}
    </TextField>
  )
}
```

### Task 2.2: Update FiscalYearDashboard Page

**Prompt for Perplexity**:
```
Update src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx:
1. Rename to FiscalYearDashboard.tsx (unified version)
2. Replace FiscalYearManagementService with FiscalYearService from '@/services/fiscal'
3. Use useFiscalYears, useCreateFiscalYear hooks
4. Remove any stub data references
5. Keep RTL/Arabic support
```

### Task 2.3: Update FiscalPeriodManager Page

**Prompt for Perplexity**:
```
Update src/pages/Fiscal/EnhancedFiscalPeriodManager.tsx:
1. Rename to FiscalPeriodManager.tsx (unified version)
2. Replace FiscalPeriodService (STUB) with FiscalPeriodService from '@/services/fiscal'
3. Use useFiscalPeriods, useLockPeriod, useClosePeriod hooks
4. Add usePeriodActivity to show transaction counts
5. Keep RTL/Arabic support
```

### Task 2.4: Update Routes

**File**: `src/routes/FiscalRoutes.tsx`

**Prompt for Perplexity**:
```
Update src/routes/FiscalRoutes.tsx:
1. Remove duplicate routes for basic versions
2. Point /fiscal/dashboard to unified FiscalYearDashboard
3. Point /fiscal/periods to unified FiscalPeriodManager
4. Remove /fiscal/enhanced/* routes (merged into main routes)
5. Keep construction and specialized routes unchanged
```

**Updated Routes**:
```typescript
// src/routes/FiscalRoutes.tsx

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { OptimizedSuspense } from '../components/Common/PerformanceOptimizer'

// Unified pages (no more basic/enhanced split)
const FiscalYearDashboard = React.lazy(() => import('../pages/Fiscal/FiscalYearDashboard'))
const FiscalPeriodManager = React.lazy(() => import('../pages/Fiscal/FiscalPeriodManager'))
const OpeningBalanceImport = React.lazy(() => import('../pages/Fiscal/OpeningBalanceImport'))
const FiscalHub = React.lazy(() => import('../pages/Fiscal/FiscalHub'))

// Specialized pages (unchanged)
const ConstructionDashboard = React.lazy(() => import('../pages/Fiscal/ConstructionDashboard'))
const ValidationRuleManager = React.lazy(() => import('../pages/Fiscal/ValidationRuleManager'))
const BalanceReconciliation = React.lazy(() => import('../pages/Fiscal/BalanceReconciliationDashboard'))
const OpeningBalanceApproval = React.lazy(() => import('../pages/Fiscal/OpeningBalanceApprovalWorkflow'))
const AuditTrail = React.lazy(() => import('../pages/Fiscal/OpeningBalanceAuditTrail'))
const ApprovalCenter = React.lazy(() => import('../pages/Fiscal/ApprovalNotificationCenter'))

const FiscalRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Main Fiscal Routes */}
      <Route path="/fiscal/dashboard" element={<OptimizedSuspense><FiscalYearDashboard /></OptimizedSuspense>} />
      <Route path="/fiscal/periods" element={<OptimizedSuspense><FiscalPeriodManager /></OptimizedSuspense>} />
      <Route path="/fiscal/opening-balance-import" element={<OptimizedSuspense><OpeningBalanceImport /></OptimizedSuspense>} />
      <Route path="/fiscal/hub" element={<OptimizedSuspense><FiscalHub /></OptimizedSuspense>} />
      
      {/* Specialized Routes */}
      <Route path="/fiscal/construction" element={<OptimizedSuspense><ConstructionDashboard /></OptimizedSuspense>} />
      <Route path="/fiscal/validation-rules" element={<OptimizedSuspense><ValidationRuleManager /></OptimizedSuspense>} />
      <Route path="/fiscal/reconciliation" element={<OptimizedSuspense><BalanceReconciliation /></OptimizedSuspense>} />
      <Route path="/fiscal/approval-workflow" element={<OptimizedSuspense><OpeningBalanceApproval /></OptimizedSuspense>} />
      <Route path="/fiscal/audit-trail" element={<OptimizedSuspense><AuditTrail /></OptimizedSuspense>} />
      <Route path="/fiscal/approvals" element={<OptimizedSuspense><ApprovalCenter /></OptimizedSuspense>} />
    </Routes>
  )
}

export default FiscalRoutes
```


---

## 🗑️ PHASE 3: Remove Legacy Code (Week 3)

### Task 3.1: Delete Stub Services

**Prompt for Perplexity**:
```
Delete these STUB service files that return fake data:
1. src/services/FiscalYearService.ts
2. src/services/FiscalPeriodService.ts

These are being replaced by:
- src/services/fiscal/fiscalYearService.ts
- src/services/fiscal/fiscalPeriodService.ts
```

### Task 3.2: Delete Duplicate Pages

**Prompt for Perplexity**:
```
Delete these duplicate page files (basic versions):
1. src/pages/Fiscal/FiscalYearDashboard.tsx (old basic version)
2. src/pages/Fiscal/FiscalPeriodManager.tsx (old basic version)
3. src/pages/Fiscal/OpeningBalanceImport.tsx (old basic version)

Rename enhanced versions to unified names:
1. EnhancedFiscalYearDashboard.tsx → FiscalYearDashboard.tsx
2. EnhancedFiscalPeriodManager.tsx → FiscalPeriodManager.tsx
3. EnhancedOpeningBalanceImport.tsx → OpeningBalanceImport.tsx
4. EnhancedFiscalHub.tsx → FiscalHub.tsx
```

### Task 3.3: Update All Imports

**Prompt for Perplexity**:
```
Search and replace all imports across the codebase:

OLD IMPORTS (find and replace):
import { FiscalYearService } from '@/services/FiscalYearService'
import { FiscalPeriodService } from '@/services/FiscalPeriodService'
import FiscalYearService from '@/services/FiscalYearService'
import FiscalPeriodService from '@/services/FiscalPeriodService'

NEW IMPORTS (replace with):
import { FiscalYearService, FiscalPeriodService } from '@/services/fiscal'

Also update hook imports:
import { useFiscalYears, useFiscalPeriods } from '@/services/fiscal'
```

### Task 3.4: Merge FiscalYearManagementService

**Prompt for Perplexity**:
```
Check src/services/FiscalYearManagementService.ts for any unique methods
not in the new FiscalYearService. If found, add them to the new service.
Then delete FiscalYearManagementService.ts.

Update any imports:
OLD: import { FiscalYearManagementService } from '@/services/FiscalYearManagementService'
NEW: import { FiscalYearService } from '@/services/fiscal'
```

### Task 3.5: Merge FiscalDashboardService

**Prompt for Perplexity**:
```
The summarizeFiscal function from FiscalDashboardService.ts should be
converted to a React Query hook. Create:

src/services/fiscal/hooks/useFiscalDashboard.ts

Then delete src/services/FiscalDashboardService.ts
```

**New Hook**:
```typescript
// src/services/fiscal/hooks/useFiscalDashboard.ts

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import type { FiscalDashboardSummary } from '../types'

export const fiscalDashboardKeys = {
  summary: (orgId: string, fiscalYearId: string) => ['fiscalDashboard', 'summary', orgId, fiscalYearId] as const,
}

export function useFiscalDashboardSummary(orgId: string | null | undefined, fiscalYearId: string | null | undefined) {
  return useQuery({
    queryKey: fiscalDashboardKeys.summary(orgId || '', fiscalYearId || ''),
    queryFn: async (): Promise<FiscalDashboardSummary> => {
      if (!orgId || !fiscalYearId) {
        return { periodsOpen: 0, periodsLocked: 0, periodsClosed: 0, importsCount: 0, validationWarnings: 0, validationErrors: 0 }
      }

      const [{ data: periods }, { data: imports }] = await Promise.all([
        supabase.from('fiscal_periods').select('status').eq('org_id', orgId).eq('fiscal_year_id', fiscalYearId),
        supabase.from('opening_balance_imports').select('id').eq('org_id', orgId).eq('fiscal_year_id', fiscalYearId),
      ])

      const periodsOpen = (periods || []).filter(p => p.status === 'open').length
      const periodsLocked = (periods || []).filter(p => p.status === 'locked').length
      const periodsClosed = (periods || []).filter(p => p.status === 'closed').length
      const importsCount = (imports || []).length

      let validationWarnings = 0, validationErrors = 0
      try {
        const { data: v } = await supabase.rpc('validate_opening_balances', { p_org_id: orgId, p_fiscal_year_id: fiscalYearId })
        validationWarnings = v?.warnings?.length || 0
        validationErrors = v?.errors?.length || 0
      } catch {}

      return { periodsOpen, periodsLocked, periodsClosed, importsCount, validationWarnings, validationErrors }
    },
    enabled: !!orgId && !!fiscalYearId,
    staleTime: 2 * 60 * 1000,
  })
}
```

### Task 3.6: Verification Checklist for Phase 3

**Prompt for Perplexity**:
```
Verify Phase 3 cleanup:
1. Run: grep -r "FiscalYearService" src/ --include="*.tsx" --include="*.ts" | grep -v "fiscal/"
   Should return empty (no old imports)
2. Run: grep -r "FiscalPeriodService" src/ --include="*.tsx" --include="*.ts" | grep -v "fiscal/"
   Should return empty (no old imports)
3. Verify deleted files don't exist:
   - src/services/FiscalYearService.ts
   - src/services/FiscalPeriodService.ts
   - src/services/FiscalYearManagementService.ts
   - src/services/FiscalDashboardService.ts
4. Run TypeScript compiler: npx tsc --noEmit
5. Run dev server: npm run dev
6. Test fiscal dashboard loads real data
```

---

## 🚀 PHASE 4: Enterprise Features (Week 4)

### Task 4.1: Add Validation Service

**Prompt for Perplexity**:
```
Create src/services/fiscal/validationService.ts with:
1. validateOpeningBalances(orgId, fiscalYearId) - uses validate_opening_balances RPC
2. validateConstructionBalances(orgId, fiscalYearId) - uses validate_construction_opening_balances RPC
3. getActiveRules(orgId) - fetches active validation rules
```

**File Content**:
```typescript
// src/services/fiscal/validationService.ts

import { supabase } from '@/utils/supabase'
import type { ValidationResult } from './types'

export class ValidationService {
  static async validateOpeningBalances(orgId: string, fiscalYearId: string): Promise<ValidationResult> {
    const { data, error } = await supabase.rpc('validate_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId
    })
    if (error) throw new Error(`Validation failed: ${error.message}`)
    return data as ValidationResult
  }

  static async validateConstructionBalances(orgId: string, fiscalYearId: string): Promise<ValidationResult> {
    const { data, error } = await supabase.rpc('validate_construction_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId
    })
    if (error) throw new Error(`Construction validation failed: ${error.message}`)
    return data as ValidationResult
  }

  static async getActiveRules(orgId: string) {
    const { data, error } = await supabase
      .from('opening_balance_validation_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('active', true)
    if (error) throw new Error(`Failed to fetch rules: ${error.message}`)
    return data
  }
}
```

### Task 4.2: Add Bulk Operations Service

**Prompt for Perplexity**:
```
Create src/services/fiscal/bulkOperationService.ts with:
1. lockMultiplePeriods(periodIds) - lock multiple periods at once
2. unlockMultiplePeriods(periodIds) - unlock multiple periods
3. closeMultiplePeriods(operations) - close multiple periods with notes
```

**File Content**:
```typescript
// src/services/fiscal/bulkOperationService.ts

import { supabase } from '@/utils/supabase'
import { FiscalPeriodService } from './fiscalPeriodService'

export class BulkOperationService {
  static async lockMultiplePeriods(periodIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .in('id', periodIds)
    if (error) throw new Error(`Bulk lock failed: ${error.message}`)
  }

  static async unlockMultiplePeriods(periodIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .in('id', periodIds)
    if (error) throw new Error(`Bulk unlock failed: ${error.message}`)
  }

  static async closeMultiplePeriods(operations: Array<{ periodId: string; notes?: string }>): Promise<void> {
    for (const op of operations) {
      await FiscalPeriodService.close(op.periodId, op.notes)
    }
  }
}
```

### Task 4.3: Update index.ts with New Services

**Prompt for Perplexity**:
```
Update src/services/fiscal/index.ts to export new services:
- ValidationService
- BulkOperationService
- useFiscalDashboardSummary hook
```

**Updated File**:
```typescript
// src/services/fiscal/index.ts

// Types
export * from './types'

// Services
export { FiscalYearService } from './fiscalYearService'
export { FiscalPeriodService } from './fiscalPeriodService'
export { ValidationService } from './validationService'
export { BulkOperationService } from './bulkOperationService'

// Hooks
export * from './hooks/useFiscalYear'
export * from './hooks/useFiscalPeriods'
export * from './hooks/useFiscalDashboard'
```


---

## ✅ VERIFICATION & TESTING

### Final Verification Checklist

**Prompt for Perplexity**:
```
Run complete verification:

1. TypeScript Compilation:
   npx tsc --noEmit
   Expected: No errors

2. Lint Check:
   npm run lint
   Expected: No errors

3. Build Test:
   npm run build
   Expected: Successful build

4. Dev Server:
   npm run dev
   Expected: No console errors

5. Functional Tests:
   - Navigate to /fiscal/dashboard
   - Verify fiscal years load from database (not hardcoded)
   - Create a new fiscal year
   - Navigate to /fiscal/periods
   - Verify periods load for selected year
   - Lock a period
   - Unlock a period
   - Close a period with notes
```

### Test Data Verification

**SQL to Run in Supabase**:
```sql
-- Verify fiscal years exist
SELECT id, year_number, name_en, status, is_current 
FROM fiscal_years 
WHERE org_id = 'YOUR_ORG_ID'
ORDER BY year_number DESC;

-- Verify periods exist
SELECT fp.id, fp.period_number, fp.name_en, fp.status, fy.year_number
FROM fiscal_periods fp
JOIN fiscal_years fy ON fp.fiscal_year_id = fy.id
WHERE fp.org_id = 'YOUR_ORG_ID'
ORDER BY fy.year_number DESC, fp.period_number;

-- Test RPC functions
SELECT * FROM fn_can_manage_fiscal_v2('YOUR_ORG_ID', 'YOUR_USER_ID');
SELECT * FROM get_period_activity('PERIOD_ID');
```

---

## 📊 SUCCESS METRICS

### Before Implementation
| Metric | Value |
|--------|-------|
| Services | 5 (2 stubs) |
| UI Pages | 14 (7 duplicates) |
| Stub Data | Yes |
| Data Sync | Broken |
| Code Duplication | ~60% |

### After Implementation
| Metric | Value |
|--------|-------|
| Services | 2 unified |
| UI Pages | 7 consolidated |
| Stub Data | None |
| Data Sync | Single source of truth |
| Code Duplication | ~0% |

---

## 🔄 ROLLBACK PLAN

If issues occur, rollback by phase:

### Phase 1 Rollback
```
Keep old services, delete src/services/fiscal/ directory
```

### Phase 2 Rollback
```
Revert route changes in src/routes/FiscalRoutes.tsx
Restore old component imports
```

### Phase 3 Rollback
```
Restore deleted files from git:
git checkout HEAD~1 -- src/services/FiscalYearService.ts
git checkout HEAD~1 -- src/services/FiscalPeriodService.ts
```

### Phase 4 Rollback
```
Delete new service files:
- src/services/fiscal/validationService.ts
- src/services/fiscal/bulkOperationService.ts
```

---

## 📋 PERPLEXITY AI PROMPTS SUMMARY

### Phase 1 Prompts
1. "Create directory structure for src/services/fiscal/"
2. "Create TypeScript types for fiscal year and period management"
3. "Create FiscalYearService with Supabase integration"
4. "Create FiscalPeriodService with Supabase integration"
5. "Create React Query hooks for fiscal year management"
6. "Create React Query hooks for fiscal period management"

### Phase 2 Prompts
1. "Update FiscalYearSelector to use new hooks"
2. "Consolidate FiscalYearDashboard pages"
3. "Consolidate FiscalPeriodManager pages"
4. "Update FiscalRoutes to remove duplicates"

### Phase 3 Prompts
1. "Delete stub service files"
2. "Delete duplicate page files"
3. "Update all imports to use new services"
4. "Merge FiscalYearManagementService"
5. "Convert FiscalDashboardService to hook"

### Phase 4 Prompts
1. "Create ValidationService for opening balances"
2. "Create BulkOperationService for multi-period operations"
3. "Update exports in index.ts"

---

## 📞 TROUBLESHOOTING

### Common Issues

**Issue**: Import errors after migration
```
Solution: Run grep to find old imports and update them
grep -r "FiscalYearService" src/ --include="*.tsx" --include="*.ts"
```

**Issue**: RPC function not found
```
Solution: Verify function exists in Supabase
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE '%fiscal%';
```

**Issue**: Permission denied
```
Solution: Check fn_can_manage_fiscal_v2 returns true
SELECT fn_can_manage_fiscal_v2('ORG_ID', 'USER_ID');
```

**Issue**: Data not updating in UI
```
Solution: Check React Query cache invalidation
Verify queryClient.invalidateQueries is called in mutation onSuccess
```

---

## 📝 DOCUMENT HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 5, 2025 | Kiro AI | Initial technical plan |

---

**Document Status**: Ready for CEO Review and Perplexity AI Implementation

**Next Steps**:
1. CEO reviews this document
2. CEO uses Perplexity AI to implement each phase
3. Verify each phase before proceeding to next
4. Complete all 4 phases over 4 weeks
