# 🚀 FISCAL SYSTEM MODERNIZATION - COMPLETE EXECUTION PLAN
> **For**: Al-Baraka Construction Company  
> **Status**: ✅ READY TO EXECUTE (All 10 Fixes Integrated)  
> **Date**: December 5, 2025  
> **Duration**: 4 Weeks  

---

## 📋 EXECUTIVE SUMMARY

Your fiscal system has **5 fragmented services** (2 return fake data) and **14 duplicate UI pages**. This plan consolidates everything into **one unified, enterprise-grade system**.

## 🎯 10 CRITICAL FIXES INTEGRATED

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | Missing update/delete/activate methods | Added to fiscalYearService |
| 2 | get_period_activity RPC unused | Added hook + service method |
| 3 | Simplistic error handling | Enhanced try-catch in canManage |
| 4 | No date validation | Added in create() |
| 5 | FiscalPeriodService incomplete | Added getActivity, setCurrent, update |
| 6 | Week 2 tasks vague | Specified exact file paths |
| 7 | Missing cache keys | Expanded fiscalYearKeys factory |
| 8 | Week 4 services skeletal | Expanded to 3-4 methods each |
| 9 | No dashboard hook | Added useFiscalDashboard |
| 10 | TypeScript paths assumed | Added tsconfig verification |

---

## WEEK 1: CREATE UNIFIED SERVICES

### Directory Structure
```bash
mkdir -p src/services/fiscal/hooks
mkdir -p src/services/fiscal/__tests__
```

### TASK 1: src/services/fiscal/types.ts

```typescript
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
  errors: Array<{ code: string; message: string }>
  warnings: Array<{ code: string; message: string }>
  totals: { count: number; sum: number }
}

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

### TASK 2: src/services/fiscal/fiscalYearService.ts (10 methods)

```typescript
import { supabase } from '@/utils/supabase'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from './types'

export class FiscalYearService {
  // FIX #3: Enhanced error handling
  static async canManage(orgId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user?.id) return false
      const { data, error } = await supabase.rpc('fn_can_manage_fiscal_v2', {
        p_org_id: orgId, p_user_id: user.user.id
      })
      if (error) { console.error('Permission check failed:', error); return false }
      return data === true
    } catch (e) { console.error('canManage exception:', e); return false }
  }

  static async getAll(orgId: string): Promise<FiscalYear[]> {
    const { data, error } = await supabase.from('fiscal_years').select('*')
      .eq('org_id', orgId).order('year_number', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(this.mapFromDb)
  }

  static async getById(id: string): Promise<FiscalYear | null> {
    const { data, error } = await supabase.from('fiscal_years').select('*').eq('id', id).single()
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(error.message)
    return data ? this.mapFromDb(data) : null
  }

  static async getCurrent(orgId: string): Promise<FiscalYear | null> {
    const { data, error } = await supabase.from('fiscal_years').select('*')
      .eq('org_id', orgId).eq('is_current', true).single()
    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(error.message)
    return data ? this.mapFromDb(data) : null
  }

  // FIX #4: Date validation added
  static async create(input: CreateFiscalYearInput): Promise<string> {
    const start = new Date(input.startDate), end = new Date(input.endDate)
    if (start >= end) throw new Error('Start date must be before end date')
    
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) throw new Error('Not authenticated')
    
    const { data, error } = await supabase.rpc('create_fiscal_year', {
      p_org_id: input.orgId, p_year_number: input.yearNumber,
      p_start_date: input.startDate, p_end_date: input.endDate,
      p_user_id: user.user.id, p_create_monthly_periods: input.createMonthlyPeriods ?? true,
      p_name_en: input.nameEn ?? `FY ${input.yearNumber}`, p_name_ar: input.nameAr ?? null,
    })
    if (error) throw new Error(error.message)
    return data as string
  }

  // FIX #1: Added missing method
  static async update(id: string, input: UpdateFiscalYearInput): Promise<FiscalYear> {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (input.nameEn !== undefined) updateData.name_en = input.nameEn
    if (input.nameAr !== undefined) updateData.name_ar = input.nameAr
    if (input.status !== undefined) updateData.status = input.status
    if (input.isCurrent !== undefined) updateData.is_current = input.isCurrent
    
    const { data, error } = await supabase.from('fiscal_years')
      .update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(data)
  }

  // FIX #1: Added missing method
  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fiscal_years').delete().eq('id', id).eq('status', 'draft')
    if (error) throw new Error(error.message)
  }

  // FIX #1: Added missing method
  static async activate(id: string): Promise<FiscalYear> {
    return this.update(id, { status: 'active' })
  }

  static async setCurrent(orgId: string, yearId: string): Promise<void> {
    await supabase.from('fiscal_years').update({ is_current: false }).eq('org_id', orgId)
    const { error } = await supabase.from('fiscal_years').update({ is_current: true }).eq('id', yearId)
    if (error) throw new Error(error.message)
  }

  static async close(id: string): Promise<FiscalYear> {
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('fiscal_years')
      .update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user?.user?.id })
      .eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(data)
  }

  private static mapFromDb(row: any): FiscalYear {
    return {
      id: row.id, orgId: row.org_id, yearNumber: row.year_number,
      nameEn: row.name_en, nameAr: row.name_ar, descriptionEn: row.description_en,
      descriptionAr: row.description_ar, startDate: row.start_date, endDate: row.end_date,
      status: row.status, isCurrent: row.is_current, closedAt: row.closed_at,
      closedBy: row.closed_by, createdBy: row.created_by, updatedBy: row.updated_by,
      createdAt: row.created_at, updatedAt: row.updated_at,
    }
  }
}
```
