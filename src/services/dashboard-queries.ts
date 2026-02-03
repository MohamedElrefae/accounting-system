import { QueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { getCategoryTotalsLegacyFormat } from './reports/unified-financial-query'
import { getReadMode } from '../config/featureFlags'
import useAppStore from '../store/useAppStore'

export interface RecentRow {
  id: string
  entry_date: string
  description: string
  description_ar?: string | null
  amount: number
  debit_account_id: string | null
  credit_account_id: string | null
  type: 'income' | 'expense'
  category?: string | null
  category_ar?: string | null
  status?: string | null
}

export const dashboardQueryKeys = {
  categoryTotals: (f: { orgId?: string; projectId?: string; dateFrom?: string; dateTo?: string; postedOnly?: boolean }) => [
    'dashboard',
    'categoryTotals',
    {
      orgId: f.orgId || null,
      projectId: f.projectId || null,
      dateFrom: f.dateFrom || '',
      dateTo: f.dateTo || '',
      postedOnly: !!f.postedOnly,
    },
  ] as const,
  recentActivity: (f: { orgId?: string; projectId?: string; postedOnly?: boolean }) => [
    'dashboard',
    'recentActivity',
    {
      orgId: f.orgId || null,
      projectId: f.projectId || null,
      postedOnly: !!f.postedOnly,
    },
  ] as const,
}

export async function fetchCategoryTotals(f: { orgId?: string; projectId?: string; dateFrom?: string; dateTo?: string; postedOnly?: boolean }) {
  console.log('🎯 Dashboard fetchCategoryTotals called with:', f)
  try {
    if (useAppStore.getState().demoMode) {
      return {
        asset: 250000,
        liability: 90000,
        equity: 160000,
        revenue: 125420,
        expense: 89320,
      }
    }
    // Use unified financial query service - SINGLE SOURCE OF TRUTH
    const result = await getCategoryTotalsLegacyFormat({
      orgId: f.orgId || null,
      projectId: f.projectId || null,
      dateFrom: f.dateFrom || null,
      dateTo: f.dateTo || null,
      postedOnly: !!f.postedOnly,
    })
    console.log('✅ Dashboard fetchCategoryTotals result:', result)
    return result
  } catch (error) {
    console.error('❌ Dashboard fetchCategoryTotals error:', error)
    throw error
  }
}

export async function fetchRecentActivity(f: { orgId?: string; projectId?: string; postedOnly?: boolean }): Promise<RecentRow[]> {
  if (useAppStore.getState().demoMode) {
    // Demo rows...
    return [
      { id: 'demo-1', entry_date: '2024-01-20', description: 'Demo: Cash sales', amount: 15000, debit_account_id: null, credit_account_id: null, type: 'income', category: 'Sales', status: 'posted' },
      { id: 'demo-2', entry_date: '2024-01-19', description: 'Demo: Office expenses', amount: -3500, debit_account_id: null, credit_account_id: null, type: 'expense', category: 'Office Expenses', status: 'posted' },
      { id: 'demo-3', entry_date: '2024-01-18', description: 'Demo: Consulting services', amount: 12000, debit_account_id: null, credit_account_id: null, type: 'income', category: 'Services', status: 'posted' },
    ]
  }

  const applyScope = (q: any) => {
    if (f.orgId) q = q.eq('org_id', f.orgId)
    if (f.projectId) q = q.eq('project_id', f.projectId)
    return q
  }

  // Fetch from transactions table (the source of truth for all entries)
  // We use total_debits as the primary amount for display
  let recentQ = supabase
    .from('transactions')
    .select('id, entry_date, description, description_ar, total_debits, total_credits, is_posted, approval_status')
    .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  recentQ = applyScope(recentQ)
  if (f.postedOnly) recentQ = recentQ.eq('is_posted', true)

  const { data: rows, error } = await recentQ
  if (error) {
    console.error('❌ Error fetching recent transactions:', error)
    throw error
  }

  if (!rows || rows.length === 0) return []

  // Fetch the lines for these transactions to get accurate totals and account names
  const ids = rows.map(r => r.id)
  const { data: lines, error: linesErr } = await supabase
    .from('v_transaction_lines_enriched')
    .select('transaction_id, account_name, account_name_ar, account_category, debit_amount, credit_amount, line_no')
    .in('transaction_id', ids)
    .order('line_no', { ascending: true })

  if (linesErr) {
    console.error('❌ Error fetching transaction lines:', linesErr)
  }

  // Aggregate lines by transaction ID
  const lineDataMap = new Map()
  if (lines) {
    for (const l of lines) {
      if (!lineDataMap.has(l.transaction_id)) {
        lineDataMap.set(l.transaction_id, {
          total_debit: 0,
          total_credit: 0,
          first_line: l
        })
      }
      const data = lineDataMap.get(l.transaction_id)
      data.total_debit += Number(l.debit_amount || 0)
      data.total_credit += Number(l.credit_amount || 0)
    }
  }

  const out: RecentRow[] = (rows || []).map((r: any) => {
    const lData = lineDataMap.get(r.id)
    const firstLine = lData?.first_line
    
    // Determine type from account category or amounts
    let type: 'income' | 'expense' = 'income'
    const cat = firstLine?.account_category?.toLowerCase() || ''
    if (cat.includes('expense')) type = 'expense'
    else if (cat.includes('revenue') || cat.includes('income')) type = 'income'
    else if ((lData?.total_credit || 0) > (lData?.total_debit || 0)) type = 'income'
    else if ((lData?.total_debit || 0) > (lData?.total_credit || 0)) type = 'expense'

    // Amount for display - use total_debit as the primary measure of transaction size
    const amount = lData?.total_debit || Number(r.total_debits) || Number(r.total_credits) || 0

    return {
      id: r.id,
      entry_date: r.entry_date,
      description: r.description || 'No description',
      description_ar: r.description_ar,
      amount: amount,
      debit_account_id: null,
      credit_account_id: null,
      type,
      category: firstLine?.account_name || r.description || 'Transaction',
      category_ar: firstLine?.account_name_ar || r.description_ar || 'معاملة',
      status: r.is_posted ? 'posted' : (r.approval_status || 'draft')
    }
  })
  return out
}

export async function prefetchDashboardQueries(
  qc: QueryClient,
  f: { orgId?: string; projectId?: string; dateFrom?: string; dateTo?: string; postedOnly?: boolean } = {}
) {
  await Promise.allSettled([
    qc.prefetchQuery({
      queryKey: dashboardQueryKeys.categoryTotals({ orgId: f.orgId, projectId: f.projectId, dateFrom: f.dateFrom, dateTo: f.dateTo, postedOnly: f.postedOnly }),
      queryFn: () => fetchCategoryTotals({ orgId: f.orgId, projectId: f.projectId, dateFrom: f.dateFrom, dateTo: f.dateTo, postedOnly: f.postedOnly }),
      staleTime: 5 * 60 * 1000,
    }),
    qc.prefetchQuery({
      queryKey: dashboardQueryKeys.recentActivity({ orgId: f.orgId, projectId: f.projectId, postedOnly: f.postedOnly }),
      queryFn: () => fetchRecentActivity({ orgId: f.orgId, projectId: f.projectId, postedOnly: f.postedOnly }),
      staleTime: 60 * 1000,
    }),
  ])
}