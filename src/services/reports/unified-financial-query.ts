/**
 * Unified Financial Query Service
 * 
 * هذه الخدمة هي المصدر الوحيد للحقيقة لجميع الحسابات المالية
 * This service is the SINGLE SOURCE OF TRUTH for all financial calculations
 * 
 * Used by:
 * - Dashboard (category totals)
 * - Trial Balance (all levels)
 * - Balance Sheet
 * - Profit & Loss
 * - General Ledger
 * - Account Explorer
 * 
 * IMPORTANT: All financial reports MUST use this service to ensure consistency
 */

import { supabase } from '../../utils/supabase'

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedFilters {
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  costCenterId?: string | null
  postedOnly?: boolean
  classificationId?: string | null
  analysisWorkItemId?: string | null
  expensesCategoryId?: string | null
  subTreeId?: string | null
  limit?: number | null
  offset?: number | null
}

export interface GLSummaryRow {
  account_id: string
  account_code: string
  account_name_en?: string | null
  account_name_ar?: string | null
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  closing_debit: number
  closing_credit: number
  transaction_count: number
}

export interface CategoryTotals {
  assets: number
  liabilities: number
  equity: number
  revenue: number
  expenses: number
  netIncome: number
}

export interface TrialBalanceRow {
  account_id: string
  account_code: string
  account_name_ar?: string | null
  account_name_en?: string | null
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  closing_debit: number
  closing_credit: number
  transaction_count: number
  category: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses' | null
}

export interface TrialBalanceTotals {
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  closing_debit: number
  closing_credit: number
  is_balanced: boolean
}

export interface BalanceSheetRow {
  account_id: string
  account_code: string
  account_name_ar?: string | null
  account_name_en?: string | null
  account_type: 'assets' | 'liabilities' | 'equity'
  amount: number
  sort_order: number
}

export interface BalanceSheetSummary {
  total_assets: number
  total_liabilities: number
  total_equity: number
  net_worth: number
  balance_check: number
}

export interface ProfitLossRow {
  account_id: string
  account_code: string
  account_name_ar?: string | null
  account_name_en?: string | null
  account_type: 'revenue' | 'cost_of_sales' | 'expenses' | 'other_income' | 'other_expenses'
  amount: number
  sort_order: number
}

export interface ProfitLossSummary {
  total_revenue: number
  total_cost_of_sales: number
  gross_profit: number
  total_operating_expenses: number
  operating_income: number
  total_other_income: number
  total_other_expenses: number
  net_income: number
  // Margin percentages
  gross_margin_percent: number
  operating_margin_percent: number
  net_margin_percent: number
}

// ============================================================================
// CORE FUNCTION - Single Database Call
// ============================================================================

/**
 * Fetches GL account summary data - THE SINGLE SOURCE OF TRUTH
 * All other functions in this service use this data
 */
export async function fetchGLSummary(filters: UnifiedFilters = {}): Promise<GLSummaryRow[]> {
  // Normalize empty strings to null for date parameters
  const dateFrom = filters.dateFrom && filters.dateFrom.trim() !== '' ? filters.dateFrom : null
  const dateTo = filters.dateTo && filters.dateTo.trim() !== '' ? filters.dateTo : null
  const costCenterId = filters.costCenterId && String(filters.costCenterId).trim() !== '' ? filters.costCenterId : null

  console.log('🔍 Unified Financial Query - fetchGLSummary called with:', {
    dateFrom,
    dateTo,
    orgId: filters.orgId,
    projectId: filters.projectId,
    postedOnly: filters.postedOnly
  })

  const callRpc = async (args: Record<string, any>) => {
    const { data, error } = await supabase.rpc('get_gl_account_summary_filtered', args)
    if (error) throw error
    return data
  }

  const baseArgs: Record<string, any> = {
    p_date_from: dateFrom,
    p_date_to: dateTo,
    p_org_id: filters.orgId ?? null,
    p_project_id: filters.projectId ?? null,
    p_posted_only: filters.postedOnly ?? false,
    p_limit: filters.limit ?? null,
    p_offset: filters.offset ?? null,
    p_classification_id: filters.classificationId ?? null,
    p_analysis_work_item_id: filters.analysisWorkItemId ?? null,
    p_expenses_category_id: filters.expensesCategoryId ?? null,
    p_sub_tree_id: filters.subTreeId ?? null
  }

  let data: any
  try {
    data = !costCenterId
      ? await callRpc(baseArgs)
      : await callRpc({
          ...baseArgs,
          p_cost_center_id: costCenterId,
        })
  } catch (error: any) {
    const msg = String(error?.message || '')
    // Backward-compatible: if DB function doesn't accept p_cost_center_id yet, retry without it.
    if (costCenterId && (msg.includes('p_cost_center_id') || msg.toLowerCase().includes('function') || msg.toLowerCase().includes('candidate'))) {
      try {
        data = await callRpc(baseArgs)
      } catch (e: any) {
        console.error('❌ Unified Financial Query - GL Summary error:', e)
        throw e
      }
    } else {
      console.error('❌ Unified Financial Query - GL Summary error:', error)
      throw error
    }
  }

  console.log('✅ Unified Financial Query - GL Summary returned', data?.length || 0, 'rows')

  // Normalize the data to ensure consistent types
  return (data ?? []).map((row: any) => ({
    account_id: row.account_id,
    account_code: row.account_code || '',
    account_name_en: row.account_name_en || null,
    account_name_ar: row.account_name_ar || null,
    opening_debit: Number(row.opening_debit) || 0,
    opening_credit: Number(row.opening_credit) || 0,
    period_debits: Number(row.period_debits) || 0,
    period_credits: Number(row.period_credits) || 0,
    closing_debit: Number(row.closing_debit) || 0,
    closing_credit: Number(row.closing_credit) || 0,
    transaction_count: Number(row.transaction_count) || 0
  }))
}

// ============================================================================
// ACCOUNT CLASSIFICATION
// ============================================================================

type AccountCategory = 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses' | null

/**
 * Classifies account by code - CANONICAL IMPLEMENTATION
 * 1 = Assets, 2 = Liabilities, 3 = Equity, 4 = Revenue, 5 = Expenses
 */
function classifyAccountByCode(code: string): AccountCategory {
  if (!code) return null
  
  const firstChar = code.charAt(0)
  
  switch (firstChar) {
    case '1': return 'assets'
    case '2': return 'liabilities'
    case '3': return 'equity'
    case '4': return 'revenue'
    case '5': return 'expenses'
    default: return null
  }
}

/**
 * Checks if account is a Balance Sheet account (1, 2, 3)
 */
export function isBalanceSheetAccount(code: string): boolean {
  const category = classifyAccountByCode(code)
  return category === 'assets' || category === 'liabilities' || category === 'equity'
}

/**
 * Checks if account is a P&L account (4, 5)
 */
export function isProfitLossAccount(code: string): boolean {
  const category = classifyAccountByCode(code)
  return category === 'revenue' || category === 'expenses'
}

// ============================================================================
// DASHBOARD TOTALS
// ============================================================================

/**
 * Gets category totals for Dashboard - USES SAME DATA AS REPORTS
 * This ensures Dashboard shows EXACTLY the same numbers as financial reports
 */
export async function getCategoryTotals(filters: UnifiedFilters = {}): Promise<CategoryTotals> {
  console.log('🔍 getCategoryTotals called with filters:', filters)
  const rows = await fetchGLSummary(filters)
  console.log('📊 getCategoryTotals processing', rows.length, 'rows')

  const totals: CategoryTotals = {
    assets: 0,
    liabilities: 0,
    equity: 0,
    revenue: 0,
    expenses: 0,
    netIncome: 0
  }

  for (const row of rows) {
    const category = classifyAccountByCode(row.account_code)
    if (!category) continue

    // Use closing_debit + closing_credit - SAME AS ALL REPORTS
    const closingDebit = row.closing_debit || 0
    const closingCredit = row.closing_credit || 0
    
    // Skip zero activity accounts
    if (closingDebit === 0 && closingCredit === 0) continue

    const displayAmount = closingDebit + closingCredit

    switch (category) {
      case 'assets':
        totals.assets += displayAmount
        break
      case 'liabilities':
        totals.liabilities += displayAmount
        break
      case 'equity':
        totals.equity += displayAmount
        break
      case 'revenue':
        totals.revenue += displayAmount
        break
      case 'expenses':
        totals.expenses += displayAmount
        break
    }
  }

  totals.netIncome = totals.revenue - totals.expenses

  console.log('💰 getCategoryTotals result:', totals)
  return totals
}

/**
 * Gets category totals in legacy format for backward compatibility
 */
export async function getCategoryTotalsLegacyFormat(filters: UnifiedFilters = {}): Promise<Record<string, number>> {
  console.log('🔍 getCategoryTotalsLegacyFormat called')
  const totals = await getCategoryTotals(filters)
  
  const legacy = {
    asset: totals.assets,
    liability: totals.liabilities,
    equity: totals.equity,
    revenue: totals.revenue,
    expense: totals.expenses,
    net_income: totals.netIncome
  }
  console.log('📤 getCategoryTotalsLegacyFormat returning:', legacy)
  return legacy
}

// ============================================================================
// TRIAL BALANCE
// ============================================================================

/**
 * Gets Trial Balance data - USES SAME DATA AS DASHBOARD
 */
export async function getTrialBalance(filters: UnifiedFilters = {}): Promise<{
  rows: TrialBalanceRow[]
  totals: TrialBalanceTotals
}> {
  const glRows = await fetchGLSummary(filters)

  const rows: TrialBalanceRow[] = []
  const totals: TrialBalanceTotals = {
    opening_debit: 0,
    opening_credit: 0,
    period_debits: 0,
    period_credits: 0,
    closing_debit: 0,
    closing_credit: 0,
    is_balanced: false
  }

  for (const row of glRows) {
    // Skip zero activity accounts
    if (row.closing_debit === 0 && row.closing_credit === 0) continue

    const category = classifyAccountByCode(row.account_code)

    rows.push({
      account_id: row.account_id,
      account_code: row.account_code,
      account_name_ar: row.account_name_ar,
      account_name_en: row.account_name_en,
      opening_debit: row.opening_debit,
      opening_credit: row.opening_credit,
      period_debits: row.period_debits,
      period_credits: row.period_credits,
      closing_debit: row.closing_debit,
      closing_credit: row.closing_credit,
      transaction_count: row.transaction_count,
      category
    })

    // Accumulate totals
    totals.opening_debit += row.opening_debit
    totals.opening_credit += row.opening_credit
    totals.period_debits += row.period_debits
    totals.period_credits += row.period_credits
    totals.closing_debit += row.closing_debit
    totals.closing_credit += row.closing_credit
  }

  // Check if balanced (debits should equal credits)
  totals.is_balanced = Math.abs(totals.closing_debit - totals.closing_credit) < 0.01

  // Sort by account code
  rows.sort((a, b) => a.account_code.localeCompare(b.account_code))

  return { rows, totals }
}

// ============================================================================
// BALANCE SHEET
// ============================================================================

/**
 * Gets Balance Sheet data - USES SAME DATA AS DASHBOARD AND TRIAL BALANCE
 */
export async function getBalanceSheet(filters: UnifiedFilters = {}): Promise<{
  rows: BalanceSheetRow[]
  summary: BalanceSheetSummary
}> {
  const glRows = await fetchGLSummary(filters)

  const rows: BalanceSheetRow[] = []
  const summary: BalanceSheetSummary = {
    total_assets: 0,
    total_liabilities: 0,
    total_equity: 0,
    net_worth: 0,
    balance_check: 0
  }

  for (const row of glRows) {
    const category = classifyAccountByCode(row.account_code)
    
    // Only include Balance Sheet accounts
    if (category !== 'assets' && category !== 'liabilities' && category !== 'equity') continue

    const closingDebit = row.closing_debit || 0
    const closingCredit = row.closing_credit || 0
    
    // Skip zero activity
    if (closingDebit === 0 && closingCredit === 0) continue

    const displayAmount = closingDebit + closingCredit

    rows.push({
      account_id: row.account_id,
      account_code: row.account_code,
      account_name_ar: row.account_name_ar,
      account_name_en: row.account_name_en,
      account_type: category as 'assets' | 'liabilities' | 'equity',
      amount: displayAmount,
      sort_order: category === 'assets' ? 1 : category === 'liabilities' ? 2 : 3
    })

    // Accumulate totals
    switch (category) {
      case 'assets':
        summary.total_assets += displayAmount
        break
      case 'liabilities':
        summary.total_liabilities += displayAmount
        break
      case 'equity':
        summary.total_equity += displayAmount
        break
    }
  }

  summary.net_worth = summary.total_assets - summary.total_liabilities
  summary.balance_check = summary.total_assets - (summary.total_liabilities + summary.total_equity)

  // Sort by type then code
  rows.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.account_code.localeCompare(b.account_code)
  })

  return { rows, summary }
}

// ============================================================================
// PROFIT & LOSS
// ============================================================================

/**
 * Gets Profit & Loss data - USES SAME DATA AS DASHBOARD AND TRIAL BALANCE
 */
export async function getProfitLoss(filters: UnifiedFilters = {}): Promise<{
  rows: ProfitLossRow[]
  summary: ProfitLossSummary
}> {
  const glRows = await fetchGLSummary(filters)

  const rows: ProfitLossRow[] = []
  const summary: ProfitLossSummary = {
    total_revenue: 0,
    total_cost_of_sales: 0,
    gross_profit: 0,
    total_operating_expenses: 0,
    operating_income: 0,
    total_other_income: 0,
    total_other_expenses: 0,
    net_income: 0,
    gross_margin_percent: 0,
    operating_margin_percent: 0,
    net_margin_percent: 0
  }

  for (const row of glRows) {
    const category = classifyAccountByCode(row.account_code)
    
    // Only include P&L accounts (4, 5)
    if (category !== 'revenue' && category !== 'expenses') continue

    const closingDebit = row.closing_debit || 0
    const closingCredit = row.closing_credit || 0
    
    // Skip zero activity
    if (closingDebit === 0 && closingCredit === 0) continue

    const displayAmount = closingDebit + closingCredit

    // Classify account types more granularly based on first two digits
    let accountType: ProfitLossRow['account_type']
    const firstTwo = row.account_code.substring(0, 2)

    if (category === 'revenue') {
      if (firstTwo === '48' || firstTwo === '49') {
        accountType = 'other_income'
        summary.total_other_income += displayAmount
      } else {
        accountType = 'revenue'
        summary.total_revenue += displayAmount
      }
    } else {
      // Expenses
      if (firstTwo === '50' || firstTwo === '51' || firstTwo === '52') {
        accountType = 'cost_of_sales'
        summary.total_cost_of_sales += displayAmount
      } else if (firstTwo === '58' || firstTwo === '59') {
        accountType = 'other_expenses'
        summary.total_other_expenses += displayAmount
      } else {
        accountType = 'expenses'
        summary.total_operating_expenses += displayAmount
      }
    }

    rows.push({
      account_id: row.account_id,
      account_code: row.account_code,
      account_name_ar: row.account_name_ar,
      account_name_en: row.account_name_en,
      account_type: accountType,
      amount: displayAmount,
      sort_order: accountType === 'revenue' ? 1 : 
                  accountType === 'cost_of_sales' ? 2 : 
                  accountType === 'expenses' ? 3 : 
                  accountType === 'other_income' ? 4 : 5
    })
  }

  summary.gross_profit = summary.total_revenue - summary.total_cost_of_sales
  summary.operating_income = summary.gross_profit - summary.total_operating_expenses
  summary.net_income = summary.operating_income + summary.total_other_income - summary.total_other_expenses
  
  // Calculate margin percentages (avoid division by zero)
  if (summary.total_revenue !== 0) {
    summary.gross_margin_percent = (summary.gross_profit / summary.total_revenue) * 100
    summary.operating_margin_percent = (summary.operating_income / summary.total_revenue) * 100
    summary.net_margin_percent = (summary.net_income / summary.total_revenue) * 100
  }

  // Sort by type then code
  rows.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.account_code.localeCompare(b.account_code)
  })

  return { rows, summary }
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

/**
 * Verifies that all reports show consistent totals
 * Returns true if all totals match, false otherwise
 */
export async function verifyConsistency(filters: UnifiedFilters = {}): Promise<{
  isConsistent: boolean
  dashboard: CategoryTotals
  trialBalance: TrialBalanceTotals
  balanceSheet: BalanceSheetSummary
  profitLoss: ProfitLossSummary
  discrepancies: string[]
}> {
  const [dashboard, tb, bs, pl] = await Promise.all([
    getCategoryTotals(filters),
    getTrialBalance(filters),
    getBalanceSheet(filters),
    getProfitLoss(filters)
  ])

  const discrepancies: string[] = []

  // Check Dashboard vs Balance Sheet
  if (Math.abs(dashboard.assets - bs.summary.total_assets) > 0.01) {
    discrepancies.push(`Assets mismatch: Dashboard=${dashboard.assets}, BS=${bs.summary.total_assets}`)
  }
  if (Math.abs(dashboard.liabilities - bs.summary.total_liabilities) > 0.01) {
    discrepancies.push(`Liabilities mismatch: Dashboard=${dashboard.liabilities}, BS=${bs.summary.total_liabilities}`)
  }
  if (Math.abs(dashboard.equity - bs.summary.total_equity) > 0.01) {
    discrepancies.push(`Equity mismatch: Dashboard=${dashboard.equity}, BS=${bs.summary.total_equity}`)
  }

  // Check Dashboard vs P&L
  if (Math.abs(dashboard.revenue - pl.summary.total_revenue) > 0.01) {
    discrepancies.push(`Revenue mismatch: Dashboard=${dashboard.revenue}, PL=${pl.summary.total_revenue}`)
  }
  const totalExpenses = pl.summary.total_cost_of_sales + pl.summary.total_operating_expenses
  if (Math.abs(dashboard.expenses - totalExpenses) > 0.01) {
    discrepancies.push(`Expenses mismatch: Dashboard=${dashboard.expenses}, PL=${totalExpenses}`)
  }
  if (Math.abs(dashboard.netIncome - pl.summary.net_income) > 0.01) {
    discrepancies.push(`Net Income mismatch: Dashboard=${dashboard.netIncome}, PL=${pl.summary.net_income}`)
  }

  // Check Trial Balance is balanced
  if (!tb.totals.is_balanced) {
    discrepancies.push(`Trial Balance not balanced: Debit=${tb.totals.closing_debit}, Credit=${tb.totals.closing_credit}`)
  }

  return {
    isConsistent: discrepancies.length === 0,
    dashboard,
    trialBalance: tb.totals,
    balanceSheet: bs.summary,
    profitLoss: pl.summary,
    discrepancies
  }
}
