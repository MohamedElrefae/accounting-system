import { supabase } from '../utils/supabase'

export interface Account {
  id: string
  code: string
  name: string
  is_postable: boolean
}

export interface TransactionRecord {
  id: string
  entry_number: string
  entry_date: string
  description: string
  reference_number: string | null
  debit_account_id: string
  credit_account_id: string
  amount: number
  notes: string | null
  is_posted: boolean
  posted_at: string | null
  posted_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TransactionAudit {
  id: string
  transaction_id: string
  action: 'create' | 'update' | 'delete' | 'post'
  actor_id: string | null
  details: any
  created_at: string
}

// Generate a simple entry number like JE-YYYYMM-####
export function generateEntryNumber(countHint: number = 1): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `JE-${year}${month}-${String(countHint).padStart(4, '0')}`
}

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, code, name, is_postable')
    .eq('status', 'active')
    .order('code', { ascending: true })

  if (error) throw error
  return (data as Account[]) || []
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data?.user?.id ?? null
}

export interface ListTransactionsFilters {
  scope?: 'my' | 'all'
  pendingOnly?: boolean
  search?: string
  dateFrom?: string
  dateTo?: string
  amountFrom?: number
  amountTo?: number
  debitAccountId?: string
  creditAccountId?: string
}

export interface ListTransactionsOptions {
  filters?: ListTransactionsFilters
  page?: number
  pageSize?: number
}

export interface PagedResult<T> {
  rows: T[]
  total: number
}

export async function getTransactions(options?: ListTransactionsOptions): Promise<PagedResult<TransactionRecord>> {
  const scope = options?.filters?.scope ?? 'all'
  const pendingOnly = options?.filters?.pendingOnly ?? false
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .order('entry_date', { ascending: false })

  if (scope === 'my') {
    const uid = await getCurrentUserId()
    if (uid) {
      query = query.eq('created_by', uid)
    } else {
      return { rows: [], total: 0 }
    }
  }

  if (pendingOnly) {
    query = query.eq('is_posted', false)
  }

  const f = options?.filters
  if (f) {
    if (f.search && f.search.trim()) {
      const s = f.search.trim()
      // Use ilike on a few columns
      query = query.or(
        `entry_number.ilike.%${s}%,description.ilike.%${s}%,reference_number.ilike.%${s}%,notes.ilike.%${s}%`
      )
    }
    if (f.dateFrom) query = query.gte('entry_date', f.dateFrom)
    if (f.dateTo) query = query.lte('entry_date', f.dateTo)
    if (f.amountFrom != null) query = query.gte('amount', f.amountFrom)
    if (f.amountTo != null) query = query.lte('amount', f.amountTo)
    if (f.debitAccountId) query = query.eq('debit_account_id', f.debitAccountId)
    if (f.creditAccountId) query = query.eq('credit_account_id', f.creditAccountId)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { rows: (data as TransactionRecord[]) || [], total: count ?? 0 }
}

export interface CreateTransactionInput {
  entry_number: string
  entry_date: string
  description: string
  reference_number?: string
  debit_account_id: string
  credit_account_id: string
  amount: number
  notes?: string
}

export async function createTransaction(input: CreateTransactionInput): Promise<TransactionRecord> {
  // Basic business rules
  if (!input.debit_account_id || !input.credit_account_id) {
    throw new Error('يجب اختيار حساب مدين وحساب دائن')
  }
  if (input.debit_account_id === input.credit_account_id) {
    throw new Error('لا يمكن أن يكون الحساب المدين والدائن نفس الحساب')
  }
  if (!input.amount || input.amount <= 0) {
    throw new Error('المبلغ غير صالح')
  }

  const uid = await getCurrentUserId()

  const payload = {
    entry_number: input.entry_number,
    entry_date: input.entry_date,
    description: input.description,
    reference_number: input.reference_number || null,
    debit_account_id: input.debit_account_id,
    credit_account_id: input.credit_account_id,
    amount: input.amount,
    notes: input.notes || null,
    created_by: uid ?? null,
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as TransactionRecord
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updateTransaction(id: string, updates: Partial<Omit<TransactionRecord, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'posted_at' | 'posted_by'>>): Promise<TransactionRecord> {
  const payload: any = { ...updates, updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as TransactionRecord
}

export async function getTransactionAudit(transactionId: string): Promise<TransactionAudit[]> {
  const { data, error } = await supabase
    .from('transaction_audit')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as TransactionAudit[]) || []
}

export async function postTransaction(id: string): Promise<void> {
  const uid = await getCurrentUserId()
  const { error } = await supabase.rpc('post_transaction', {
    p_transaction_id: id,
    p_posted_by: uid,
  })
  if (error) throw error
}

export async function getUserDisplayMap(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return {}
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name_ar, first_name, last_name, email')
    .in('id', unique)
  if (error) return {}
  const map: Record<string, string> = {}
  for (const row of (data || []) as any[]) {
    const full = row.full_name_ar || [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || row.id
    map[row.id] = full
  }
  return map
}

