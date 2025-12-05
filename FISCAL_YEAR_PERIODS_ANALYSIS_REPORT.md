# Fiscal Year & Periods System - Comprehensive Analysis Report

> **Purpose**: This document provides a complete analysis of the current fiscal year and periods implementation for use with Perplexity AI to create a modern, unified service with enterprise features.

---

## 📋 Executive Summary

### Current State: FRAGMENTED & INCONSISTENT

The fiscal year and periods system currently has:
- **5 different services** with overlapping responsibilities
- **14 UI pages** with duplicate functionality (basic vs enhanced)
- **2 parallel implementations** (basic + enhanced/RTL)
- **Stub implementations** mixed with real Supabase integrations
- **Inconsistent patterns** across components

### Key Problems Identified

| Problem | Impact | Severity |
|---------|--------|----------|
| Duplicate services (FiscalYearService vs FiscalYearManagementService) | Confusion, maintenance burden | 🔴 High |
| Stub implementations in production code | Features don't work | 🔴 High |
| Parallel UI pages (basic vs enhanced) | Code duplication, UX inconsistency | 🟡 Medium |
| No unified state management | Data sync issues | 🟡 Medium |
| Missing TypeScript strict types | Runtime errors | 🟡 Medium |

---

## 🗄️ Database Schema (Supabase) - VERIFIED FROM PRODUCTION

### Actual Schema (Extracted December 5, 2025)

### fiscal_years Table (VERIFIED)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| org_id | uuid | NO | null |
| year_number | integer | NO | null |
| name_en | text | NO | null |
| name_ar | text | YES | null |
| description_en | text | YES | null |
| description_ar | text | YES | null |
| start_date | date | NO | null |
| end_date | date | NO | null |
| status | text | NO | 'draft'::text |
| is_current | boolean | NO | false |
| closed_at | timestamp with time zone | YES | null |
| closed_by | uuid | YES | null |
| created_by | uuid | YES | null |
| updated_by | uuid | YES | null |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### fiscal_periods Table (VERIFIED)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| org_id | uuid | NO | null |
| fiscal_year_id | uuid | NO | null |
| period_number | integer | NO | null |
| period_code | text | NO | null |
| name_en | text | NO | null |
| name_ar | text | YES | null |
| description_en | text | YES | null |
| description_ar | text | YES | null |
| start_date | date | NO | null |
| end_date | date | NO | null |
| status | text | NO | 'open'::text |
| is_current | boolean | NO | false |
| closing_notes | text | YES | null |
| closed_at | timestamp with time zone | YES | null |
| closed_by | uuid | YES | null |
| created_by | uuid | YES | null |
| updated_by | uuid | YES | null |
| created_at | timestamp with time zone | NO | now() |
| updated_at | timestamp with time zone | NO | now() |

### All Fiscal-Related Tables (7 tables)

| Table Name | Purpose |
|------------|---------|
| fiscal_years | Main fiscal year records |
| fiscal_periods | Periods within fiscal years |
| period_closing_checklists | Checklist items for period closing |
| opening_balance_imports | Import batch tracking |
| opening_balances | Actual balance data per account |
| opening_balance_validation_rules | Custom validation rules |
| trial_balance_view_period | View for trial balance by period |

### Available Database Functions (8 functions)

| Function Name | Return Type | Purpose |
|---------------|-------------|---------|
| create_fiscal_year | uuid | Create fiscal year with optional monthly periods |
| fn_can_manage_fiscal | boolean | Check user permission (v1) |
| fn_can_manage_fiscal_v2 | boolean | Check user permission (v2) |
| close_fiscal_period | boolean | Close a fiscal period |
| validate_opening_balances | jsonb | Validate opening balances |
| validate_construction_opening_balances | jsonb | Construction-specific validation |
| import_opening_balances | uuid | Bulk import opening balances |
| debug_fiscal_context | jsonb | Debug helper for fiscal context |
| get_period_activity | record | Get activity summary for a period |

### Schema Definition (SQL)

#### fiscal_years Table
```sql
CREATE TABLE public.fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
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
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id) ON DELETE RESTRICT,
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

### Related Tables
- `opening_balance_imports` - Import tracking
- `opening_balances` - Actual balance data
- `opening_balance_validation_rules` - Validation rules
- `period_closing_checklists` - Closing workflow
- `balance_reconciliations` - Reconciliation data

---

## 📁 Current Service Files Analysis

### 1. FiscalYearService.ts (STUB - NOT FUNCTIONAL)
**Location**: `src/services/FiscalYearService.ts`
**Status**: ⚠️ STUB IMPLEMENTATION - Returns hardcoded data

```typescript
// Current implementation - DOES NOT USE SUPABASE
export class FiscalYearService {
  static async getFiscalYears(orgId: string): Promise<FiscalYear[]> {
    // Returns hardcoded array - NOT REAL DATA
    return [
      { id: '1', name: 'Fiscal Year 2024', ... },
      { id: '2', name: 'Fiscal Year 2025', ... }
    ]
  }
  // All methods are stubs
}
```

**Problems**:
- Returns fake data
- No Supabase integration
- Misleading interface

### 2. FiscalYearManagementService.ts (REAL - FUNCTIONAL)
**Location**: `src/services/FiscalYearManagementService.ts`
**Status**: ✅ REAL IMPLEMENTATION - Uses Supabase

```typescript
// Current implementation - USES SUPABASE
export class FiscalYearManagementService {
  static async getFiscalYears(orgId: string): Promise<FiscalYearRow[]> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .order('year_number', { ascending: true })
    // Real data
  }
  
  static async createFiscalYear(input: CreateFiscalYearInput): Promise<string> {
    // Uses RPC: create_fiscal_year
  }
}
```

**Problems**:
- Naming confusion with FiscalYearService
- Limited CRUD operations
- No update/delete methods

### 3. FiscalPeriodService.ts (STUB - NOT FUNCTIONAL)
**Location**: `src/services/FiscalPeriodService.ts`
**Status**: ⚠️ STUB IMPLEMENTATION - Returns hardcoded data

```typescript
// Current implementation - DOES NOT USE SUPABASE
export class FiscalPeriodService {
  static async getPeriods(orgId: string, fiscalYearId?: string): Promise<FiscalPeriod[]> {
    // Returns hardcoded array - NOT REAL DATA
    return [
      { id: '1', name: 'Q1 2024', ... },
      { id: '2', name: 'Q2 2024', ... }
    ]
  }
  // All methods are stubs
}
```

### 4. PeriodClosingService.ts (REAL - FUNCTIONAL)
**Location**: `src/services/PeriodClosingService.ts`
**Status**: ✅ REAL IMPLEMENTATION - Uses Supabase

```typescript
// Handles period closing workflow
export class PeriodClosingService {
  static async closePeriod(periodId: string, notes?: string) {
    // Uses RPC: close_fiscal_period
  }
  static async lockPeriod(periodId: string) { /* Direct update */ }
  static async unlockPeriod(periodId: string) { /* Direct update */ }
  static async getChecklist(orgId: string, fiscalPeriodId: string) { /* Real query */ }
  static async getValidation(orgId: string, fiscalYearId: string) { /* Uses RPC */ }
  static async getReconciliation(orgId: string, fiscalYearId: string, periodId: string) { /* Real query */ }
}
```

### 5. FiscalDashboardService.ts (PARTIAL)
**Location**: `src/services/FiscalDashboardService.ts`
**Status**: ⚠️ PARTIAL - Simple summarization helper

```typescript
// Only provides summary function
export async function summarizeFiscal(orgId?: string, fiscalYearId?: string, client?: any): Promise<FiscalSummary> {
  // Requires client to be passed in
}
```

### 🚨 UNUSED DATABASE FUNCTIONS

The following database functions exist but are **NOT USED** in any service:

| Function | Purpose | Should Be Used In |
|----------|---------|-------------------|
| `fn_can_manage_fiscal_v2` | Permission check (newer version) | All fiscal services |
| `debug_fiscal_context` | Debug helper | Development/troubleshooting |
| `get_period_activity` | Period activity summary | FiscalPeriodService, Dashboard |

**Recommendation**: The unified service should leverage these existing functions!

---

## 📄 Current UI Pages Analysis

### Basic Pages (14 total)

| Page | Path | Service Used | Status |
|------|------|--------------|--------|
| FiscalYearDashboard | `/fiscal/dashboard` | Direct Supabase | ✅ Works |
| FiscalPeriodManager | `/fiscal/periods` | PeriodClosingService | ✅ Works |
| OpeningBalanceImport | `/fiscal/opening-balance-import` | OpeningBalanceImportService | ✅ Works |
| EnhancedFiscalHub | `/fiscal/enhanced` | Mixed | ⚠️ Partial |
| EnhancedFiscalYearDashboard | `/fiscal/enhanced/dashboard` | FiscalYearManagementService | ✅ Works |
| EnhancedFiscalPeriodManager | `/fiscal/enhanced/periods` | FiscalPeriodService (STUB!) | ❌ Broken |
| EnhancedOpeningBalanceImport | `/fiscal/enhanced/opening-balance-import` | OpeningBalanceImportService | ✅ Works |
| ConstructionDashboard | `/fiscal/construction` | Mixed | ⚠️ Partial |
| OpeningBalanceApprovalWorkflow | `/fiscal/approval-workflow` | approvals.ts | ✅ Works |
| ValidationRuleManager | `/fiscal/validation-rules` | Direct Supabase | ✅ Works |
| BalanceReconciliationDashboard | `/fiscal/reconciliation` | PeriodClosingService | ✅ Works |
| OpeningBalanceAuditTrail | `/fiscal/audit-trail` | Direct Supabase | ✅ Works |
| ApprovalNotificationCenter | `/fiscal/approvals` | approvals.ts | ✅ Works |

### Duplicate Functionality

```
Basic                          Enhanced (RTL)
─────────────────────────────────────────────────
FiscalYearDashboard      ←→    EnhancedFiscalYearDashboard
FiscalPeriodManager      ←→    EnhancedFiscalPeriodManager
OpeningBalanceImport     ←→    EnhancedOpeningBalanceImport
```

---

## 🧩 Current Components

### Location: `src/components/Fiscal/`

| Component | Purpose | Used By |
|-----------|---------|---------|
| FiscalYearSelector | Dropdown to select fiscal year | Multiple pages |
| BalanceReconciliationPanel | Shows GL vs Opening balance | FiscalPeriodManager |
| ClosingChecklistManager | Period closing checklist | FiscalPeriodManager |
| ValidationResults | Import validation display | OpeningBalanceImport |
| OpeningBalanceImportWizard | Multi-step import | OpeningBalanceImport |
| OpeningBalanceManualCrud | Manual balance entry | OpeningBalanceImport |
| ImportProgressTracker | Import progress | OpeningBalanceImport |
| EnhancedOBImportResultsModal | Import results modal | EnhancedOpeningBalanceImport |
| LoadingOverlay | Loading state | Multiple |
| ConstructionComplianceMonitor | Construction compliance | ConstructionDashboard |
| ConstructionDateRangeControls | Date range picker | ConstructionDashboard |
| CostPerformanceAnalytics | Cost analytics | ConstructionDashboard |
| MaterialManagementDashboard | Materials tracking | ConstructionDashboard |
| ProjectPhaseProgressChart | Project progress | ConstructionDashboard |
| SubcontractorManagementInterface | Subcontractor mgmt | ConstructionDashboard |

---

## 🔧 Database Functions (RPCs) - VERIFIED

### Available Functions (8 Total - From Production)

| Function | Returns | Description |
|----------|---------|-------------|
| `create_fiscal_year` | uuid | Creates fiscal year with optional monthly periods |
| `fn_can_manage_fiscal` | boolean | Permission check v1 |
| `fn_can_manage_fiscal_v2` | boolean | Permission check v2 (use this one) |
| `close_fiscal_period` | boolean | Closes a fiscal period |
| `validate_opening_balances` | jsonb | Validates opening balances |
| `validate_construction_opening_balances` | jsonb | Construction-specific validation |
| `import_opening_balances` | uuid | Bulk import opening balances |
| `debug_fiscal_context` | jsonb | Debug helper |
| `get_period_activity` | record | Get period activity summary |

### Function Signatures

```sql
-- Create Fiscal Year (with auto-period generation)
create_fiscal_year(
  p_org_id uuid,
  p_year_number integer,
  p_start_date date,
  p_end_date date,
  p_user_id uuid DEFAULT fn_current_user_id(),
  p_create_monthly_periods boolean DEFAULT true,
  p_name_en text DEFAULT NULL,
  p_name_ar text DEFAULT NULL,
  p_description_en text DEFAULT NULL,
  p_description_ar text DEFAULT NULL
) RETURNS uuid

-- Close Fiscal Period
close_fiscal_period(
  p_period_id uuid,
  p_user_id uuid DEFAULT fn_current_user_id(),
  p_closing_notes text DEFAULT NULL
) RETURNS boolean

-- Validate Opening Balances
validate_opening_balances(
  p_org_id uuid,
  p_fiscal_year_id uuid
) RETURNS jsonb
-- Returns: { ok, errors[], warnings[], totals, by_account, by_project, by_cost_center, active_rules }

-- Import Opening Balances
import_opening_balances(
  p_org_id uuid,
  p_fiscal_year_id uuid,
  p_import_data jsonb,  -- Array of { account_id/account_code, amount, project_id?, cost_center_id? }
  p_user_id uuid DEFAULT fn_current_user_id(),
  p_source text DEFAULT 'excel',
  p_source_file_url text DEFAULT NULL
) RETURNS uuid  -- Returns import_id

-- Permission Check (use v2)
fn_can_manage_fiscal_v2(
  p_org_id uuid,
  p_user_id uuid
) RETURNS boolean

-- Get Period Activity (NEW - not in current services!)
get_period_activity(
  p_period_id uuid
) RETURNS record
-- Returns transaction counts, totals, etc. for a period
```

---

## 🎨 Theme Token Integration

### Current Theme Usage

The app uses a token-based theme system. Key tokens for fiscal components:

```typescript
// From src/theme/tokens.ts
tokens.palette.background.default  // Page background
tokens.palette.background.paper    // Card background
tokens.palette.primary.main        // Primary actions
tokens.palette.divider             // Borders
tokens.shadows.panel               // Card shadows

// Status colors (should be standardized)
const statusColors = {
  draft: tokens.palette.grey[500],
  active: tokens.palette.success.main,
  closed: tokens.palette.grey[700],
  archived: tokens.palette.grey[400],
  open: tokens.palette.success.main,
  locked: tokens.palette.warning.main
}
```

---

## 🚀 Recommended Unified Architecture

### New Service Structure

```
src/services/fiscal/
├── index.ts                    # Public exports
├── types.ts                    # All TypeScript types
├── fiscalYearService.ts        # Unified fiscal year operations
├── fiscalPeriodService.ts      # Unified period operations
├── openingBalanceService.ts    # Opening balance operations
├── validationService.ts        # Validation operations
├── reconciliationService.ts    # Reconciliation operations
└── hooks/
    ├── useFiscalYear.ts        # React Query hook
    ├── useFiscalPeriods.ts     # React Query hook
    ├── useOpeningBalances.ts   # React Query hook
    └── useFiscalDashboard.ts   # Dashboard data hook
```

### Unified Types (types.ts)

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

### Unified FiscalYearService (fiscalYearService.ts)

```typescript
import { supabase } from '@/utils/supabase'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from './types'

export class FiscalYearService {
  /**
   * Check if user can manage fiscal data for an org
   * Uses the newer fn_can_manage_fiscal_v2 function
   */
  static async canManage(orgId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('fn_can_manage_fiscal_v2', {
      p_org_id: orgId,
      p_user_id: (await supabase.auth.getUser()).data.user?.id
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
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.user) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('create_fiscal_year', {
      p_org_id: input.orgId,
      p_year_number: input.yearNumber,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      p_user_id: session.session.user.id,
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

  static async activate(id: string): Promise<FiscalYear> {
    return this.update(id, { status: 'active' })
  }

  static async close(id: string): Promise<FiscalYear> {
    const { data: session } = await supabase.auth.getSession()
    
    const { data, error } = await supabase
      .from('fiscal_years')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: session?.session?.user?.id,
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

### Unified FiscalPeriodService (fiscalPeriodService.ts)

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
    const { data, error } = await supabase.rpc('close_fiscal_period', {
      p_period_id: periodId,
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
```



### React Query Hooks (useFiscalYear.ts)

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

---

## 📋 Migration Checklist

### Phase 1: Create Unified Service Layer (Week 1)

- [ ] Create `src/services/fiscal/` directory structure
- [ ] Create `types.ts` with all TypeScript interfaces
- [ ] Create `fiscalYearService.ts` with full CRUD
- [ ] Create `fiscalPeriodService.ts` with full CRUD
- [ ] Create React Query hooks
- [ ] Add unit tests for services

### Phase 2: Migrate UI Components (Week 2)

- [ ] Update `FiscalYearSelector` to use new service
- [ ] Consolidate basic + enhanced dashboards into single component
- [ ] Consolidate basic + enhanced period managers
- [ ] Remove duplicate pages
- [ ] Update routes

### Phase 3: Remove Legacy Code (Week 3)

- [ ] Delete `FiscalYearService.ts` (stub)
- [ ] Delete `FiscalPeriodService.ts` (stub)
- [ ] Merge `FiscalYearManagementService.ts` into new service
- [ ] Update all imports
- [ ] Remove unused components

### Phase 4: Enterprise Features (Week 4)

- [ ] Add audit logging
- [ ] Add bulk operations
- [ ] Add export/import functionality
- [ ] Add advanced validation rules
- [ ] Add period templates

---

## 🎯 Enterprise Features to Add

### 1. Fiscal Year Templates
```typescript
interface FiscalYearTemplate {
  id: string
  name: string
  periodType: 'monthly' | 'quarterly' | 'custom'
  periods: {
    name: string
    startOffset: number  // days from year start
    endOffset: number
  }[]
}
```

### 2. Period Locking Rules
```typescript
interface PeriodLockingRule {
  id: string
  orgId: string
  autoLockAfterDays: number
  requireApproval: boolean
  approverRoles: string[]
  notifyBeforeLock: number  // days
}
```

### 3. Fiscal Year Comparison
```typescript
interface FiscalYearComparison {
  currentYear: FiscalYear
  previousYear: FiscalYear
  metrics: {
    transactionCountChange: number
    totalAmountChange: number
    periodStatusComparison: Record<string, { current: string; previous: string }>
  }
}
```

### 4. Bulk Period Operations
```typescript
interface BulkPeriodOperation {
  action: 'lock' | 'unlock' | 'close'
  periodIds: string[]
  notes?: string
}
```

### 5. Audit Trail Integration
```typescript
interface FiscalAuditEntry {
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
```

---

## 🔗 Files to Delete After Migration

```
src/services/FiscalYearService.ts          # Stub - replace with unified
src/services/FiscalPeriodService.ts        # Stub - replace with unified
src/pages/Fiscal/FiscalYearDashboard.tsx   # Merge into unified
src/pages/Fiscal/FiscalPeriodManager.tsx   # Merge into unified
```

## 🔗 Files to Keep and Enhance

```
src/services/FiscalYearManagementService.ts  # Merge into unified service
src/services/PeriodClosingService.ts         # Keep, enhance
src/services/FiscalDashboardService.ts       # Merge into hooks
src/pages/Fiscal/EnhancedFiscalYearDashboard.tsx  # Keep as base
src/pages/Fiscal/EnhancedFiscalPeriodManager.tsx  # Keep as base
src/components/Fiscal/FiscalYearSelector.tsx      # Update to use new service
```

---

## 📊 Current vs Proposed Architecture

### Current (Fragmented)
```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
├─────────────────────────────────────────────────────────────┤
│ FiscalYearDashboard │ EnhancedFiscalYearDashboard │ ...     │
│ FiscalPeriodManager │ EnhancedFiscalPeriodManager │ ...     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│ FiscalYearService (STUB) │ FiscalYearManagementService      │
│ FiscalPeriodService (STUB) │ PeriodClosingService           │
│ FiscalDashboardService │ Direct Supabase calls              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
└─────────────────────────────────────────────────────────────┘
```

### Proposed (Unified)
```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
├─────────────────────────────────────────────────────────────┤
│ UnifiedFiscalDashboard │ UnifiedPeriodManager │ ...         │
│ (Single component with RTL/LTR support)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Query Hooks                         │
├─────────────────────────────────────────────────────────────┤
│ useFiscalYears │ useFiscalPeriods │ useFiscalDashboard      │
│ useCreateFiscalYear │ useUpdatePeriod │ ...                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Unified Service Layer                      │
├─────────────────────────────────────────────────────────────┤
│ FiscalYearService │ FiscalPeriodService │ ValidationService │
│ ReconciliationService │ OpeningBalanceService               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                                │
│ (Tables + RPCs + RLS Policies)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏷️ Theme Token Standards

### Status Colors (Standardize Across App)

```typescript
// src/theme/fiscalTokens.ts
export const fiscalStatusColors = {
  // Fiscal Year Status
  fiscalYear: {
    draft: {
      bg: 'rgba(158, 158, 158, 0.1)',
      text: '#9E9E9E',
      border: '#9E9E9E'
    },
    active: {
      bg: 'rgba(76, 175, 80, 0.1)',
      text: '#4CAF50',
      border: '#4CAF50'
    },
    closed: {
      bg: 'rgba(97, 97, 97, 0.1)',
      text: '#616161',
      border: '#616161'
    },
    archived: {
      bg: 'rgba(189, 189, 189, 0.1)',
      text: '#BDBDBD',
      border: '#BDBDBD'
    }
  },
  
  // Fiscal Period Status
  fiscalPeriod: {
    open: {
      bg: 'rgba(76, 175, 80, 0.1)',
      text: '#4CAF50',
      border: '#4CAF50'
    },
    locked: {
      bg: 'rgba(255, 152, 0, 0.1)',
      text: '#FF9800',
      border: '#FF9800'
    },
    closed: {
      bg: 'rgba(97, 97, 97, 0.1)',
      text: '#616161',
      border: '#616161'
    }
  }
}

// Usage in components
import { fiscalStatusColors } from '@/theme/fiscalTokens'

const StatusChip = ({ status, type }: { status: string; type: 'fiscalYear' | 'fiscalPeriod' }) => {
  const colors = fiscalStatusColors[type][status]
  return (
    <Chip
      label={status}
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        border: '1px solid'
      }}
    />
  )
}
```

---

## 📝 Summary for Perplexity AI

When using this document with Perplexity AI, ask for:

1. **"Create a unified FiscalYearService class following the recommended architecture"**
2. **"Generate React Query hooks for fiscal year management with optimistic updates"**
3. **"Design a unified FiscalDashboard component that supports RTL/LTR"**
4. **"Create TypeScript interfaces for enterprise fiscal year features"**
5. **"Generate Supabase RPC functions for bulk period operations"**

### Key Requirements to Mention:
- Use Supabase as backend
- Support Arabic (RTL) and English (LTR)
- Follow React Query patterns for data fetching
- Use MUI components with theme tokens
- Include audit logging
- Support multi-organization (org_id filtering)
- Include proper TypeScript types
- Follow existing code patterns from this analysis

---

---

## ✅ Verified Production Data Summary

### Database Tables (7)
- `fiscal_years` - 17 columns
- `fiscal_periods` - 20 columns  
- `period_closing_checklists`
- `opening_balance_imports`
- `opening_balances`
- `opening_balance_validation_rules`
- `trial_balance_view_period` (view)

### Database Functions (9)
- `create_fiscal_year` → uuid
- `close_fiscal_period` → boolean
- `validate_opening_balances` → jsonb
- `validate_construction_opening_balances` → jsonb
- `import_opening_balances` → uuid
- `fn_can_manage_fiscal` → boolean
- `fn_can_manage_fiscal_v2` → boolean (USE THIS)
- `debug_fiscal_context` → jsonb
- `get_period_activity` → record (UNUSED!)

### Services to Consolidate (5 → 2)
| Current | Status | Action |
|---------|--------|--------|
| FiscalYearService.ts | STUB | DELETE |
| FiscalPeriodService.ts | STUB | DELETE |
| FiscalYearManagementService.ts | REAL | MERGE |
| PeriodClosingService.ts | REAL | MERGE |
| FiscalDashboardService.ts | PARTIAL | MERGE |

### UI Pages to Consolidate (14 → 7)
| Keep | Delete/Merge |
|------|--------------|
| EnhancedFiscalYearDashboard | FiscalYearDashboard |
| EnhancedFiscalPeriodManager | FiscalPeriodManager |
| EnhancedOpeningBalanceImport | OpeningBalanceImport |
| EnhancedFiscalHub | - |
| ConstructionDashboard | - |
| ValidationRuleManager | - |
| BalanceReconciliationDashboard | - |

---

*Generated: December 5, 2025*
*Verified against production Supabase schema*
*For: Fiscal Year & Periods System Modernization*
