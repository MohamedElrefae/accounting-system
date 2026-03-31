import { supabase } from '../../utils/supabase'

export interface DateRangeFilters {
  orgId?: string | null
  projectId?: string | null
  postedOnly?: boolean
}

export interface TransactionDateRange {
  min_date: string | null
  max_date: string | null
}

/**
 * Fetch the minimum and maximum transaction dates for the specified filters
 * This is used to automatically set date ranges in reports
 */
export async function fetchTransactionsDateRange(filters: DateRangeFilters): Promise<TransactionDateRange | null> {
  try {
    let query = supabase
      .from('transactions')
      .select('entry_date')
      .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
      .not('entry_date', 'is', null)
      .order('entry_date', { ascending: true })

    // Apply filters
    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId)
    }
    if (filters.orgId) {
      query = query.eq('org_id', filters.orgId)
    }
    if (filters.postedOnly) {
      query = query.eq('is_posted', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching transaction date range:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return {
        min_date: null,
        max_date: null
      }
    }

    // Get min and max dates from the sorted results
    const dates = data.map(t => t.entry_date).filter(Boolean).sort()
    
    return {
      min_date: dates[0] || null,
      max_date: dates[dates.length - 1] || null
    }
    
  } catch (error) {
    console.error('Error in fetchTransactionsDateRange:', error)
    throw error
  }
}

/**
 * Get account balance for a specific account and date range
 */
export async function getAccountBalance(accountId: string, dateFrom?: string, dateTo?: string, postedOnly: boolean = false): Promise<{ debit: number; credit: number; balance: number }> {
  try {
    // Query transaction_lines instead of transactions header
    const { data: lines, error } = await supabase
      .from('transaction_lines')
      .select('debit_amount, credit_amount, transactions!inner(is_posted, is_wizard_draft, entry_date)')
      .eq('account_id', accountId)
      .or('transactions.is_wizard_draft.is.null,transactions.is_wizard_draft.eq.false')

    if (error) throw error

    let debit = 0
    let credit = 0

    for (const line of lines || []) {
      const tx = (line as any).transactions
      if (postedOnly && !tx.is_posted) continue
      if (dateFrom && tx.entry_date < dateFrom) continue
      if (dateTo && tx.entry_date > dateTo) continue

      debit += Number(line.debit_amount || 0)
      credit += Number(line.credit_amount || 0)
    }

    return {
      debit,
      credit,
      balance: debit - credit
    }
  } catch (error) {
    console.error('Error getting account balance:', error)
    throw error
  }
}
