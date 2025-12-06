// ============================================
// FISCAL SYSTEM - UNIFIED TYPES
// Al-Baraka Construction Company
// ============================================

// ============================================
// FISCAL YEAR TYPES
// ============================================

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

// ============================================
// FISCAL PERIOD TYPES
// ============================================

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

export interface UpdateFiscalPeriodInput {
  nameEn?: string
  nameAr?: string
  descriptionEn?: string
  descriptionAr?: string
}

// ============================================
// PERIOD ACTIVITY (from get_period_activity RPC)
// ============================================

export interface PeriodActivity {
  periodId: string
  transactionCount: number
  totalDebits: number
  totalCredits: number
  netAmount: number
  lastTransactionDate?: string
  accountsAffected: number
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  totals: { count: number; sum: number }
  byAccount: Array<{ accountId: string; total: number }>
  byProject: Array<{ projectId: string; total: number }>
  byCostCenter: Array<{ costCenterId: string; total: number }>
}

export interface ValidationIssue {
  code: string
  message: string
  row?: Record<string, unknown>
  rowNumber?: number
}

// ============================================
// DASHBOARD TYPES
// ============================================

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

// ============================================
// OPENING BALANCE TYPES
// ============================================

export interface OpeningBalanceImport {
  id: string
  orgId: string
  fiscalYearId: string
  source: 'excel' | 'csv' | 'manual' | 'migration'
  sourceFileUrl?: string | null
  status: 'processing' | 'completed' | 'partially_completed' | 'failed'
  totalRows: number
  successRows: number
  failedRows: number
  errorDetails?: Record<string, unknown> | null
  importedBy: string
  createdAt: string
}

export interface OpeningBalance {
  id: string
  orgId: string
  fiscalYearId: string
  accountId: string
  projectId?: string | null
  costCenterId?: string | null
  amount: number
  currency: string
  notes?: string | null
  importId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOpeningBalanceInput {
  orgId: string
  fiscalYearId: string
  accountId: string
  amount: number
  projectId?: string
  costCenterId?: string
  currency?: string
  notes?: string
}

export interface ImportOpeningBalanceItem {
  accountId?: string
  accountCode?: string
  amount: number
  projectId?: string
  costCenterId?: string
}
