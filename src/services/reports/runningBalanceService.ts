/**
 * Running Balance Service
 * 
 * Provides running balance data using direct Supabase queries.
 * Supports filtering by:
 * - Account (from accounts tree)
 * - Sub-tree / Expenses Category (from sub-tree page)
 * - All other dimensions (project, classification, cost center, etc.)
 */

import { supabase } from '../../utils/supabase'

export interface RunningBalanceFilters {
  accountId?: string | null      // Optional - filter by specific account
  subTreeId?: string | null      // Optional - filter by sub_tree (expenses category)
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  classificationId?: string | null
  costCenterId?: string | null
  workItemId?: string | null
  analysisWorkItemId?: string | null
  expensesCategoryId?: string | null  // Alias for subTreeId
  postedOnly?: boolean
  search?: string | null
}

export interface RunningBalanceRow {
  transaction_id: string
  entry_date: string
  entry_number: string | null
  description: string | null
  account_id: string
  account_code: string
  account_name_ar: string | null
  account_name_en: string | null
  debit: number
  credit: number
  running_balance: number
  project_id: string | null
  org_id: string | null
  cost_center_id: string | null
  classification_id: string | null
  sub_tree_id: string | null
}

export interface RunningBalanceSummary {
  openingBalance: number
  totalDebits: number
  totalCredits: number
  netChange: number
  closingBalance: number
  transactionCount: number
  openingDebit: number
  openingCredit: number
  closingDebit: number
  closingCredit: number
}

export interface RunningBalanceResponse {
  rows: RunningBalanceRow[]
  summary: RunningBalanceSummary
  totalCount: number
}

/**
 * Check if we have at least one filter to query
 */
function hasValidFilter(filters: RunningBalanceFilters): boolean {
  return Boolean(
    filters.accountId ||
    filters.subTreeId ||
    filters.expensesCategoryId ||
    filters.projectId ||
    filters.classificationId ||
    filters.costCenterId ||
    filters.workItemId ||
    filters.analysisWorkItemId ||
    filters.dateFrom ||
    filters.dateTo
  )
}

/**
 * Fetch running balance data using direct queries
 * Now supports filtering by account OR sub_tree OR other dimensions
 */
export async function fetchRunningBalance(
  filters: RunningBalanceFilters,
  limit: number = 100,
  offset: number = 0
): Promise<RunningBalanceResponse> {
  // Normalize subTreeId - use expensesCategoryId as alias
  const effectiveSubTreeId = filters.subTreeId || filters.expensesCategoryId

  // Need at least one filter
  if (!hasValidFilter(filters)) {
    return {
      rows: [],
      summary: getDefaultSummary(),
      totalCount: 0
    }
  }

  try {
    // Build query for transaction lines
    let query = supabase
      .from('transaction_lines')
      .select(`
        id,
        transaction_id,
        account_id,
        debit_amount,
        credit_amount,
        description,
        project_id,
        cost_center_id,
        classification_id,
        work_item_id,
        analysis_work_item_id,
        sub_tree_id,
        transactions!inner (
          id,
          entry_number,
          entry_date,
          description,
          org_id,
          is_posted
        ),
        accounts!inner (
          id,
          code,
          name,
          name_ar
        )
      `, { count: 'exact' })

    // Apply account filter if provided
    if (filters.accountId) {
      query = query.eq('account_id', filters.accountId)
    }

    // Apply sub_tree filter if provided
    if (effectiveSubTreeId) {
      query = query.eq('sub_tree_id', effectiveSubTreeId)
    }

    // Apply other filters
    if (filters.orgId) {
      query = query.eq('transactions.org_id', filters.orgId)
    }
    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId)
    }
    if (filters.dateFrom) {
      query = query.gte('transactions.entry_date', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.lte('transactions.entry_date', filters.dateTo)
    }
    if (filters.classificationId) {
      query = query.eq('classification_id', filters.classificationId)
    }
    if (filters.costCenterId) {
      query = query.eq('cost_center_id', filters.costCenterId)
    }
    if (filters.workItemId) {
      query = query.eq('work_item_id', filters.workItemId)
    }
    if (filters.analysisWorkItemId) {
      query = query.eq('analysis_work_item_id', filters.analysisWorkItemId)
    }
    if (filters.postedOnly) {
      query = query.eq('transactions.is_posted', true)
    }

    // Order by date and entry number for running balance calculation
    query = query.order('transactions(entry_date)', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching running balance:', error)
      throw error
    }

    // Transform and calculate running balance
    let runningBalance = 0
    let runningDebit = 0
    let runningCredit = 0

    const rows: RunningBalanceRow[] = (data || []).map((row: any) => {
      const tx = row.transactions || {}
      const acc = row.accounts || {}
      const debit = Number(row.debit_amount) || 0
      const credit = Number(row.credit_amount) || 0
      
      runningDebit += debit
      runningCredit += credit
      runningBalance += (debit - credit)

      return {
        transaction_id: row.transaction_id,
        entry_date: tx.entry_date || '',
        entry_number: tx.entry_number || null,
        description: row.description || tx.description || null,
        account_id: row.account_id,
        account_code: acc.code || '',
        account_name_ar: acc.name_ar || null,
        account_name_en: acc.name || null,
        debit,
        credit,
        running_balance: runningBalance,
        project_id: row.project_id,
        org_id: tx.org_id,
        cost_center_id: row.cost_center_id,
        classification_id: row.classification_id,
        sub_tree_id: row.sub_tree_id,
      }
    })

    // Apply search filter client-side
    let filteredRows = rows
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredRows = rows.filter(row => 
        row.description?.toLowerCase().includes(searchLower) ||
        row.entry_number?.toLowerCase().includes(searchLower) ||
        row.account_code?.toLowerCase().includes(searchLower) ||
        row.account_name_ar?.toLowerCase().includes(searchLower)
      )
    }

    // Apply pagination
    const paginatedRows = filteredRows.slice(offset, offset + limit)

    // Calculate summary
    const summary = calculateSummary(filteredRows)

    return {
      rows: paginatedRows,
      summary,
      totalCount: filteredRows.length
    }
  } catch (error) {
    console.error('Running balance service error:', error)
    throw error
  }
}

/**
 * Calculate summary from running balance rows
 */
function calculateSummary(rows: RunningBalanceRow[]): RunningBalanceSummary {
  if (rows.length === 0) {
    return getDefaultSummary()
  }

  const totalDebits = rows.reduce((sum, row) => sum + row.debit, 0)
  const totalCredits = rows.reduce((sum, row) => sum + row.credit, 0)
  const lastRow = rows[rows.length - 1]

  return {
    openingBalance: 0,
    totalDebits,
    totalCredits,
    netChange: totalDebits - totalCredits,
    closingBalance: lastRow.running_balance,
    transactionCount: rows.length,
    openingDebit: 0,
    openingCredit: 0,
    closingDebit: totalDebits,
    closingCredit: totalCredits,
  }
}

/**
 * Get default empty summary
 */
function getDefaultSummary(): RunningBalanceSummary {
  return {
    openingBalance: 0,
    totalDebits: 0,
    totalCredits: 0,
    netChange: 0,
    closingBalance: 0,
    transactionCount: 0,
    openingDebit: 0,
    openingCredit: 0,
    closingDebit: 0,
    closingCredit: 0,
  }
}

/**
 * Fetch running balance summary only
 */
export async function fetchRunningBalanceSummary(
  filters: RunningBalanceFilters
): Promise<RunningBalanceSummary> {
  const response = await fetchRunningBalance(filters, 10000, 0)
  return response.summary
}

export default {
  fetchRunningBalance,
  fetchRunningBalanceSummary,
}
