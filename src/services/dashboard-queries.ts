import { QueryClient } from '@tanstack/react-query'
import { supabase } from '../utils/supabase'
import { getCategoryTotalsLegacyFormat } from './reports/unified-financial-query'
import { getReadMode } from '../config/featureFlags'
import useAppStore from '../store/useAppStore'

export interface RecentRow {
  id: string
  entry_date: string
  description: string
  amount: number
  debit_account_id: string | null
  credit_account_id: string | null
  type: 'income' | 'expense'
  category?: string | null
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
    // A small, read-only set of demo rows (never touches Supabase)
    return [
      {
        id: 'demo-1',
        entry_date: '2024-01-20',
        description: 'Demo: Cash sales',
        amount: 15000,
        debit_account_id: null,
        credit_account_id: null,
        type: 'income',
        category: 'Sales',
      },
      {
        id: 'demo-2',
        entry_date: '2024-01-19',
        description: 'Demo: Office expenses',
        amount: -3500,
        debit_account_id: null,
        credit_account_id: null,
        type: 'expense',
        category: 'Office Expenses',
      },
      {
        id: 'demo-3',
        entry_date: '2024-01-18',
        description: 'Demo: Consulting services',
        amount: 12000,
        debit_account_id: null,
        credit_account_id: null,
        type: 'income',
        category: 'Services',
      },
    ]
  }
  const readMode = getReadMode()

  // Fetch accounts to map categories by id or code
  const { data: accts, error: acctErr } = await supabase
    .from('accounts')
    .select('id, code, name, category, normal_balance')
  if (acctErr) throw acctErr
  const acctById: Record<string, { id: string; code?: string | null; name?: string | null; category?: string | null; normal_balance?: 'debit' | 'credit' | null }> = {}
  const acctByCode: Record<string, { id: string; code?: string | null; name?: string | null; category?: string | null; normal_balance?: 'debit' | 'credit' | null }> = {}
  for (const a of accts || []) {
    const rec = { id: (a as any).id, code: (a as any).code ?? null, name: (a as any).name ?? null, category: (a as any).category ?? null, normal_balance: (a as any).normal_balance ?? null }
    acctById[(a as any).id] = rec
    if ((a as any).code) acctByCode[(a as any).code] = rec
  }

  const applyScope = (q: any) => {
    if (f.orgId) q = q.eq('org_id', f.orgId)
    if (f.projectId) q = q.eq('project_id', f.projectId)
    return q
  }

  if (readMode !== 'legacy') {
    let recentQ = supabase
      .from('v_gl2_journals_enriched')
      .select('journal_id, doc_date, posting_date, status, debit_account_code, credit_account_code, amount')
      .order('posting_date', { ascending: false, nullsFirst: false })
      .limit(10)
    recentQ = applyScope(recentQ)
    if (f.postedOnly) recentQ = (recentQ as any).eq('status', 'posted')
    const { data: rows, error } = (await recentQ) as any
    if (error) throw error

    const out: RecentRow[] = (rows || []).map((r: any) => {
      const debitCat = r.debit_account_code ? acctByCode[r.debit_account_code]?.category || null : null
      const creditCat = r.credit_account_code ? acctByCode[r.credit_account_code]?.category || null : null
      let type: 'income' | 'expense' = 'income'
      if (debitCat === 'expense') type = 'expense'
      else if (creditCat === 'revenue') type = 'income'
      let category: string | null = null
      if (type === 'expense') category = (r.debit_account_code && (acctByCode[r.debit_account_code]?.name ?? debitCat)) ?? null
      else category = (r.credit_account_code && (acctByCode[r.credit_account_code]?.name ?? creditCat)) ?? null
      return {
        id: r.journal_id,
        entry_date: r.doc_date || r.posting_date,
        description: '',
        amount: Number(r.amount ?? 0),
        debit_account_id: r.debit_account_code,
        credit_account_id: r.credit_account_code,
        type,
        category,
      }
    })
    return out
  }

  // Legacy (exclude wizard drafts)
  let recentQ = supabase
    .from('transactions')
    .select('id, entry_date, description, amount, debit_account_id, credit_account_id, is_posted')
    .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)
  recentQ = applyScope(recentQ)
  if (f.postedOnly) recentQ = recentQ.eq('is_posted', true)
  const { data: rows, error } = await recentQ
  if (error) throw error
  const out: RecentRow[] = (rows || []).map((r: any) => {
    const debitCat = r.debit_account_id ? (acctById[r.debit_account_id]?.category || null) : null
    const creditCat = r.credit_account_id ? (acctById[r.credit_account_id]?.category || null) : null
    let type: 'income' | 'expense' = 'income'
    if (debitCat === 'expense') type = 'expense'
    else if (creditCat === 'revenue') type = 'income'
    let category: string | null = null
    if (type === 'expense') category = acctById[r.debit_account_id]?.name ?? debitCat ?? null
    else category = acctById[r.credit_account_id]?.name ?? creditCat ?? null
    return {
      id: r.id,
      entry_date: r.entry_date,
      description: r.description,
      amount: r.amount,
      debit_account_id: r.debit_account_id,
      credit_account_id: r.credit_account_id,
      type,
      category,
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