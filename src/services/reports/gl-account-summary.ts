/**
 * GL Account Summary Service - WRAPPER
 * 
 * This service wraps unified-financial-query for backward compatibility.
 * New code should use unified-financial-query.ts directly.
 */

import { fetchGLSummary, type UnifiedFilters, type GLSummaryRow } from './unified-financial-query'

export interface GLAccountSummaryFilters {
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  postedOnly?: boolean
  limit?: number | null
  offset?: number | null
  classificationId?: string | null
  analysisWorkItemId?: string | null
  expensesCategoryId?: string | null
}

export interface GLAccountSummaryRow {
  account_id: string
  account_code: string
  account_name_ar: string | null
  account_name_en: string | null
  opening_balance: number
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  period_net: number
  closing_balance: number
  closing_debit: number
  closing_credit: number
  transaction_count: number
  total_rows?: number
}

export async function fetchGLAccountSummary(filters: GLAccountSummaryFilters): Promise<GLAccountSummaryRow[]> {
  const unifiedFilters: UnifiedFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    orgId: filters.orgId,
    projectId: filters.projectId,
    postedOnly: filters.postedOnly ?? true,
    limit: filters.limit,
    offset: filters.offset,
    classificationId: filters.classificationId,
    analysisWorkItemId: filters.analysisWorkItemId,
    expensesCategoryId: filters.expensesCategoryId,
    subTreeId: filters.expensesCategoryId,
  }

  const rows = await fetchGLSummary(unifiedFilters)
  
  // Map to legacy format
  return rows.map((row: GLSummaryRow) => ({
    account_id: row.account_id,
    account_code: row.account_code,
    account_name_ar: row.account_name_ar || null,
    account_name_en: row.account_name_en || null,
    opening_balance: row.opening_debit - row.opening_credit,
    opening_debit: row.opening_debit,
    opening_credit: row.opening_credit,
    period_debits: row.period_debits,
    period_credits: row.period_credits,
    period_net: row.period_debits - row.period_credits,
    closing_balance: row.closing_debit - row.closing_credit,
    closing_debit: row.closing_debit,
    closing_credit: row.closing_credit,
    transaction_count: row.transaction_count,
  }))
}

export interface GLTotals {
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  closing_debit: number
  closing_credit: number
  transaction_count: number
}

export async function fetchGLTotals(filters: Omit<GLAccountSummaryFilters, 'limit' | 'offset'>): Promise<GLTotals> {
  // Use unified service and calculate totals
  const rows = await fetchGLAccountSummary(filters)
  
  const totals: GLTotals = {
    opening_debit: 0,
    opening_credit: 0,
    period_debits: 0,
    period_credits: 0,
    closing_debit: 0,
    closing_credit: 0,
    transaction_count: 0,
  }
  
  for (const row of rows) {
    totals.opening_debit += row.opening_debit
    totals.opening_credit += row.opening_credit
    totals.period_debits += row.period_debits
    totals.period_credits += row.period_credits
    totals.closing_debit += row.closing_debit
    totals.closing_credit += row.closing_credit
    totals.transaction_count += row.transaction_count
  }
  
  return totals
}
