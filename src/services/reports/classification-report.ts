import { supabase } from '../../utils/supabase'

export interface ClassificationReportFilters {
  dateFrom?: string | null
  dateTo?: string | null
  projectId?: string | null
  orgId?: string | null
  postedOnly?: boolean
  includeUnclassified?: boolean
  classificationIds?: string[] // Multi-select support
}

export interface ClassificationSummaryRow {
  classification_id: string | null
  classification_name: string
  transaction_count: number
  total_amount: number
  avg_amount: number
  posted_count: number
  unposted_count: number
  posted_amount: number
  unposted_amount: number
}

export interface ClassificationAccountBreakdown {
  account_id: string
  account_code: string
  account_name: string
  debit_count: number
  credit_count: number
  debit_amount: number
  credit_amount: number
  net_amount: number
}

export interface ClassificationTimelinePoint {
  period: string // YYYY-MM format
  transaction_count: number
  total_amount: number
  posted_count: number
  unposted_count: number
}

export interface ClassificationReportResult {
  rows: ClassificationSummaryRow[]
  totals: {
    total_transactions: number
    total_amount: number
    classifications_count: number
    posted_transactions: number
    unposted_transactions: number
    posted_amount: number
    unposted_amount: number
  }
}

export async function fetchTransactionClassificationSummary(filters: ClassificationReportFilters): Promise<ClassificationReportResult> {
  // Load transactions with minimal fields and org info via project
  let q = supabase
    .from('transactions')
    .select(`
      classification_id, 
      amount, 
      entry_date, 
      project_id, 
      is_posted,
      projects(org_id)
    `)

  if (filters.dateFrom) q = q.gte('entry_date', filters.dateFrom)
  if (filters.dateTo) q = q.lte('entry_date', filters.dateTo)
  if (filters.projectId) q = q.eq('project_id', filters.projectId)
  if (filters.postedOnly) q = q.eq('is_posted', true)
  
  // Multi-select classification filter
  if (filters.classificationIds && filters.classificationIds.length > 0) {
    if (filters.classificationIds.includes('__unclassified__')) {
      // Include both selected classifications and unclassified
      const selectedIds = filters.classificationIds.filter(id => id !== '__unclassified__')
      if (selectedIds.length > 0) {
        q = q.or(`classification_id.in.(${selectedIds.join(',')}),classification_id.is.null`)
      } else {
        q = q.is('classification_id', null)
      }
    } else {
      q = q.in('classification_id', filters.classificationIds)
    }
  }

  const { data: txs, error } = await q
  if (error) throw error
  
  // Filter by org if specified (via project relationship)
  let filteredTxs = txs || []
  if (filters.orgId) {
    filteredTxs = filteredTxs.filter(tx => (tx as any).projects?.org_id === filters.orgId)
  }

  // Load classification names
  const { data: classRows } = await supabase
    .from('transaction_classifications')
    .select('id, name')

  const nameById = new Map<string, string>()
  for (const c of classRows || []) {
    if (c?.id) nameById.set(c.id, c.name || c.id)
  }

  // Aggregate in memory with posted/unposted breakdown
  const map = new Map<string | null, { count: number; total: number; postedCount: number; unpostedCount: number; postedAmount: number; unpostedAmount: number }>()
  for (const tx of filteredTxs) {
    const key: string | null = tx.classification_id ?? null
    if (!filters.includeUnclassified && key === null) continue
    const entry = map.get(key) || { count: 0, total: 0, postedCount: 0, unpostedCount: 0, postedAmount: 0, unpostedAmount: 0 }
    entry.count += 1
    const amt = Number(tx.amount || 0)
    const absAmt = isFinite(amt) ? Math.abs(amt) : 0
    entry.total += absAmt
    
    if (tx.is_posted) {
      entry.postedCount += 1
      entry.postedAmount += absAmt
    } else {
      entry.unpostedCount += 1
      entry.unpostedAmount += absAmt
    }
    
    map.set(key, entry)
  }

  const rows: ClassificationSummaryRow[] = Array.from(map.entries()).map(([key, v]) => ({
    classification_id: key,
    classification_name: key ? (nameById.get(key) || key) : 'غير مصنف',
    transaction_count: v.count,
    total_amount: v.total,
    avg_amount: v.count > 0 ? v.total / v.count : 0,
    posted_count: v.postedCount,
    unposted_count: v.unpostedCount,
    posted_amount: v.postedAmount,
    unposted_amount: v.unpostedAmount,
  }))
  // Sort by total desc
  rows.sort((a, b) => b.total_amount - a.total_amount)

  const totals = {
    total_transactions: rows.reduce((s, r) => s + r.transaction_count, 0),
    total_amount: rows.reduce((s, r) => s + r.total_amount, 0),
    classifications_count: rows.length,
    posted_transactions: rows.reduce((s, r) => s + r.posted_count, 0),
    unposted_transactions: rows.reduce((s, r) => s + r.unposted_count, 0),
    posted_amount: rows.reduce((s, r) => s + r.posted_amount, 0),
    unposted_amount: rows.reduce((s, r) => s + r.unposted_amount, 0),
  }

  return { rows, totals }
}

// Get account-level breakdown for a specific classification
export async function fetchClassificationAccountBreakdown(classificationId: string | null, filters: ClassificationReportFilters): Promise<ClassificationAccountBreakdown[]> {
  let q = supabase
    .from('transactions')
    .select(`
      debit_account_id,
      credit_account_id,
      amount,
      entry_date,
      project_id,
      is_posted,
      classification_id,
      projects(org_id)
    `)

  if (filters.dateFrom) q = q.gte('entry_date', filters.dateFrom)
  if (filters.dateTo) q = q.lte('entry_date', filters.dateTo)
  if (filters.projectId) q = q.eq('project_id', filters.projectId)
  if (filters.postedOnly) q = q.eq('is_posted', true)
  
  // Filter by specific classification
  if (classificationId === null) {
    q = q.is('classification_id', null)
  } else {
    q = q.eq('classification_id', classificationId)
  }

  const { data: txs, error } = await q
  if (error) throw error
  
  // Filter by org if specified
  let filteredTxs = txs || []
  if (filters.orgId) {
    filteredTxs = filteredTxs.filter(tx => (tx as any).projects?.org_id === filters.orgId)
  }

  // Load account details
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, name, name_ar')

  const accountMap = new Map<string, { code: string; name: string }>()
  for (const acc of accounts || []) {
    accountMap.set(acc.id, { code: acc.code || '', name: acc.name_ar || acc.name || '' })
  }

  // Aggregate by account
  const accountStats = new Map<string, { debitCount: number; creditCount: number; debitAmount: number; creditAmount: number }>()
  
  for (const tx of filteredTxs) {
    const amt = Number(tx.amount || 0)
    
    // Process debit account
    if (tx.debit_account_id) {
      const stats = accountStats.get(tx.debit_account_id) || { debitCount: 0, creditCount: 0, debitAmount: 0, creditAmount: 0 }
      stats.debitCount += 1
      stats.debitAmount += Math.abs(amt)
      accountStats.set(tx.debit_account_id, stats)
    }
    
    // Process credit account
    if (tx.credit_account_id) {
      const stats = accountStats.get(tx.credit_account_id) || { debitCount: 0, creditCount: 0, debitAmount: 0, creditAmount: 0 }
      stats.creditCount += 1
      stats.creditAmount += Math.abs(amt)
      accountStats.set(tx.credit_account_id, stats)
    }
  }

  const breakdown: ClassificationAccountBreakdown[] = Array.from(accountStats.entries())
    .map(([accountId, stats]) => {
      const account = accountMap.get(accountId)
      return {
        account_id: accountId,
        account_code: account?.code || '',
        account_name: account?.name || '',
        debit_count: stats.debitCount,
        credit_count: stats.creditCount,
        debit_amount: stats.debitAmount,
        credit_amount: stats.creditAmount,
        net_amount: stats.debitAmount - stats.creditAmount,
      }
    })
    .filter(item => item.debit_count > 0 || item.credit_count > 0)
    .sort((a, b) => Math.abs(b.net_amount) - Math.abs(a.net_amount))

  return breakdown
}

// Get timeline data for a specific classification
export async function fetchClassificationTimeline(classificationId: string | null, filters: ClassificationReportFilters): Promise<ClassificationTimelinePoint[]> {
  let q = supabase
    .from('transactions')
    .select('amount, entry_date, is_posted, project_id, classification_id, projects(org_id)')

  if (filters.dateFrom) q = q.gte('entry_date', filters.dateFrom)
  if (filters.dateTo) q = q.lte('entry_date', filters.dateTo)
  if (filters.projectId) q = q.eq('project_id', filters.projectId)
  if (filters.postedOnly) q = q.eq('is_posted', true)
  
  // Filter by specific classification
  if (classificationId === null) {
    q = q.is('classification_id', null)
  } else {
    q = q.eq('classification_id', classificationId)
  }

  const { data: txs, error } = await q
  if (error) throw error
  
  // Filter by org if specified
  let filteredTxs = txs || []
  if (filters.orgId) {
    filteredTxs = filteredTxs.filter(tx => (tx as any).projects?.org_id === filters.orgId)
  }

  // Group by month
  const monthlyStats = new Map<string, { count: number; total: number; postedCount: number; unpostedCount: number }>()
  
  for (const tx of filteredTxs) {
    const date = new Date(tx.entry_date)
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const amt = Math.abs(Number(tx.amount || 0))
    
    const stats = monthlyStats.get(period) || { count: 0, total: 0, postedCount: 0, unpostedCount: 0 }
    stats.count += 1
    stats.total += amt
    
    if (tx.is_posted) {
      stats.postedCount += 1
    } else {
      stats.unpostedCount += 1
    }
    
    monthlyStats.set(period, stats)
  }

  const timeline: ClassificationTimelinePoint[] = Array.from(monthlyStats.entries())
    .map(([period, stats]) => ({
      period,
      transaction_count: stats.count,
      total_amount: stats.total,
      posted_count: stats.postedCount,
      unposted_count: stats.unpostedCount,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))

  return timeline
}
