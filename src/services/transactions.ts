import { supabase } from '../utils/supabase'
import { formatDateForSupabase } from '../utils/dateHelpers'
import { getTransactionNumberConfig } from './company-config'

export interface Account {
  id: string
  code: string
  name: string
  is_postable: boolean
  category?: string
  parent_id?: string | null
  level?: number
}

export interface Project {
  id: string
  code: string
  name: string
  description?: string
  status: 'active' | 'inactive' | 'completed'
  start_date?: string
  end_date?: string
  budget_amount?: number
  created_by?: string
  org_id?: string
  created_at: string
  updated_at: string
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
  classification_id?: string | null
  sub_tree_id?: string | null
  work_item_id?: string | null
  cost_center_id?: string | null
  is_posted: boolean
  posted_at: string | null
  posted_by: string | null
  created_by: string | null
  project_id?: string | null
  org_id?: string | null
  // Optional approval workflow fields (may not exist until migration applied)
  approval_status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested' | 'cancelled'
  submitted_at?: string | null
  submitted_by?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  review_action?: 'approved' | 'rejected' | 'revision_requested' | null
  review_reason?: string | null
  created_at: string
  updated_at: string
}

/** Cancel a pending submission before any reviewer action. */
export async function cancelSubmission(transactionId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_transaction_submission', {
    p_transaction_id: transactionId,
    p_reason: reason ?? null,
  } as any)
  if (error) throw error
}

export interface TransactionAudit {
  id: string
  transaction_id: string
  action: 'create' | 'update' | 'delete' | 'post'
  actor_id: string | null
  details: any
  created_at: string
}

// Transaction number configuration
interface TransactionNumberConfig {
  prefix: string
  useYearMonth: boolean
  numberLength: number
  separator: string
}

// Default configuration - can be made configurable later
const DEFAULT_CONFIG: TransactionNumberConfig = {
  prefix: 'JE',
  useYearMonth: true,
  numberLength: 4,
  separator: '-'
}

// Get the next transaction number from database
export async function getNextTransactionNumber(config?: TransactionNumberConfig): Promise<string> {
  // If no config provided, get it from company settings
  let actualConfig = config
  if (!actualConfig) {
    try {
      actualConfig = await getTransactionNumberConfig()
    } catch (error) {
      console.error('Error loading company config, using default:', error)
      actualConfig = DEFAULT_CONFIG
    }
  }
  try {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    
    let pattern: string
    if (actualConfig.useYearMonth) {
      pattern = `${actualConfig.prefix}${actualConfig.separator}${year}${month}${actualConfig.separator}%`
    } else {
      pattern = `${actualConfig.prefix}${actualConfig.separator}%`
    }
    
    // Get the highest number for this pattern
    const { data, error } = await supabase
      .from('transactions')
      .select('entry_number')
      .ilike('entry_number', pattern)
      .order('entry_number', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error fetching transaction numbers:', error)
      // Fallback to simple generation
      return generateEntryNumber(1, actualConfig)
    }
    
    let nextNumber = 1
    if (data && data.length > 0) {
      const lastEntry = data[0].entry_number
      // Extract the number part from the last entry
      const parts = lastEntry.split(actualConfig.separator)
      const lastNumStr = parts[parts.length - 1]
      const lastNum = parseInt(lastNumStr, 10)
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1
      }
    }
    
    return generateEntryNumber(nextNumber, actualConfig)
  } catch (error) {
    console.error('Error generating transaction number:', error)
    return generateEntryNumber(1, actualConfig)
  }
}

// Generate entry number with given count and configuration
export function generateEntryNumber(count: number = 1, config: TransactionNumberConfig = DEFAULT_CONFIG): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const numberPart = String(count).padStart(config.numberLength, '0')
  
  if (config.useYearMonth) {
    return `${config.prefix}${config.separator}${year}${month}${config.separator}${numberPart}`
  } else {
    return `${config.prefix}${config.separator}${numberPart}`
  }
}

// Note: formatDateForSupabase is now imported from '../utils/dateHelpers'

// Parse date from various formats to ensure consistency
export function parseDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return dateInput
  }
  
  // Handle different date string formats
  let date = new Date(dateInput)
  
  // If the date is invalid, try parsing as YYYY-MM-DD
  if (isNaN(date.getTime())) {
    const parts = dateInput.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1 // JS months are 0-indexed
      const day = parseInt(parts[2], 10)
      date = new Date(year, month, day)
    }
  }
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateInput}`)
  }
  
  return date
}

export async function getAccounts(): Promise<Account[]> {
  // Try to scope by current org to match the tree-of-accounts view
  const { getActiveOrgId } = await import('../utils/org')
  const orgId: string | null = getActiveOrgId()

  let query = supabase
    .from('accounts')
    .select('id, code, name, is_postable, allow_transactions, category, parent_id, level, org_id')
    .eq('status', 'active')
    .order('code', { ascending: true })

  if (orgId) {
    query = query.eq('org_id', orgId)
  }

  const { data, error } = await query
  if (error) throw error
  // Strip org_id before returning
  return ((data as any[]) || []).map(row => ({ id: row.id, code: row.code, name: row.name, is_postable: (row.is_postable ?? row.allow_transactions ?? false), category: row.category, parent_id: row.parent_id, level: row.level })) as Account[]
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
  projectId?: string
  orgId?: string
  classificationId?: string
  expensesCategoryId?: string
  workItemId?: string
  analysisWorkItemId?: string
  costCenterId?: string
  approvalStatus?: 'draft' | 'submitted' | 'revision_requested' | 'approved' | 'rejected' | 'cancelled' | 'posted'
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

export async function getTransactions(options?: ListTransactionsOptions): Promise<PagedResult<TransactionRecord & { organization_name?: string; project_name?: string; cost_center_code?: string; cost_center_name?: string }>> {
  const scope = options?.filters?.scope ?? 'all'
  const pendingOnly = options?.filters?.pendingOnly ?? false
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Dynamic query with organization, project, classification, and cost center joins
  let query = supabase
    .from('transactions')
    .select(`
      *,
      organizations!left(name),
      projects!left(name),
      transaction_classification!left(code, name),
      cost_centers!left(code, name)
    `, { count: 'exact' })
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
    query = query.eq('is_posted', false).eq('approval_status', 'submitted')
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
    if (f.projectId) query = query.eq('project_id', f.projectId)
    if (f.orgId) query = query.eq('org_id', f.orgId)
    if (f.classificationId) query = query.eq('classification_id', f.classificationId)
    if (f.expensesCategoryId) query = query.eq('sub_tree_id', f.expensesCategoryId)
    if (f.workItemId) query = query.eq('work_item_id', f.workItemId)
    if (f.analysisWorkItemId) query = query.eq('analysis_work_item_id', f.analysisWorkItemId)
    if (f.costCenterId) query = query.eq('cost_center_id', f.costCenterId)

    // New: approval status filter, including "posted"
    if (f.approvalStatus === 'posted') {
      query = query.eq('is_posted', true)
    } else if (f.approvalStatus) {
      query = query.eq('approval_status', f.approvalStatus)
    }
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  
  // Transform the data to include organization, project, and cost center information
  const transformedData = (data || []).map((row: any) => ({
    ...row,
    organization_name: row.organizations?.name || null,
    project_name: row.projects?.name || null,
    cost_center_code: row.cost_centers?.code || null,
    cost_center_name: row.cost_centers?.name || null
  }))
  
  return { rows: transformedData as (TransactionRecord & { organization_name?: string; project_name?: string; cost_center_code?: string; cost_center_name?: string })[], total: count ?? 0 }
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
  classification_id?: string
  sub_tree_id?: string
  work_item_id?: string
  analysis_work_item_id?: string
  cost_center_id?: string
  project_id?: string
  org_id?: string
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
  
  // Generate a new entry number if not provided or if it's a placeholder
  let entryNumber = input.entry_number
  if (!entryNumber || 
      entryNumber.includes('سيتم توليده تلقائياً') || 
      entryNumber.includes('JE-') && entryNumber.endsWith('-0001') ||
      entryNumber.trim() === '') {
    entryNumber = await getNextTransactionNumber()
  }
  
  // Ensure date is properly formatted for Supabase
  const formattedDate = formatDateForSupabase(input.entry_date)

  const payload = {
    entry_number: entryNumber,
    entry_date: formattedDate,
    description: input.description,
    reference_number: input.reference_number || null,
    debit_account_id: input.debit_account_id,
    credit_account_id: input.credit_account_id,
    amount: input.amount,
    notes: input.notes || null,
    classification_id: input.classification_id || null,
    sub_tree_id: input.sub_tree_id || null,
    work_item_id: input.work_item_id || null,
    analysis_work_item_id: input.analysis_work_item_id || null,
    cost_center_id: input.cost_center_id || null,
    project_id: input.project_id || null,
    org_id: input.org_id || null,
    created_by: uid ?? null,
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    // Handle duplicate entry number error
    if (error.code === '23505' && error.message?.includes('entry_number')) {
      // Retry with a new number
      const newEntryNumber = await getNextTransactionNumber()
      payload.entry_number = newEntryNumber
      const { data: retryData, error: retryError } = await supabase
        .from('transactions')
        .insert(payload)
        .select('*')
        .single()
      
      if (retryError) throw retryError
      return retryData as TransactionRecord
    }
    throw error
  }
  return data as TransactionRecord
}

export async function getTransactionById(id: string): Promise<TransactionRecord | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as TransactionRecord
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updateTransaction(
  id: string,
  updates: Partial<Omit<TransactionRecord, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'posted_at' | 'posted_by'>>
): Promise<TransactionRecord> {
  // Whitelist columns we allow to update
  const allowedKeys = new Set([
    'entry_number',
    'entry_date',
    'description',
    'reference_number',
    'debit_account_id',
    'credit_account_id',
    'amount',
    'notes',
    'classification_id',
    'sub_tree_id',
    'work_item_id',
    'analysis_work_item_id',
    'cost_center_id',
    'project_id',
    'org_id',
  ])

  // Build a sanitized payload:
  // - drop unknown keys
  // - convert '' to null for nullable fields
  // - format date
  // - coerce amount to number
  const payload: Record<string, any> = { updated_at: new Date().toISOString() }

  for (const [key, rawValue] of Object.entries(updates || {})) {
    if (!allowedKeys.has(key)) continue

    let value: any = rawValue

    // Normalize empty strings to null for string-like fields
    if (typeof value === 'string' && value.trim() === '') {
      value = null
    }

    // Date normalization
    if (key === 'entry_date' && value) {
      try {
        value = formatDateForSupabase(value as any)
      } catch {
        // If format fails, leave as-is; DB will validate
      }
    }

    // Numeric normalization
    if (key === 'amount' && value != null) {
      const n = typeof value === 'number' ? value : parseFloat(String(value))
      if (!isNaN(n)) value = n
    }

    payload[key] = value
  }

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

// Review actions RPC (approval workflow)
export async function approveTransaction(id: string, reason?: string | null): Promise<void> {
  const { error } = await supabase.rpc('review_transaction', {
    p_transaction_id: id,
    p_action: 'approve',
    p_reason: reason ?? null,
  })
  if (error) throw error
}

export async function requestRevision(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('review_transaction', {
    p_transaction_id: id,
    p_action: 'revise',
    p_reason: reason,
  })
  if (error) throw error
}

export async function rejectTransaction(id: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('review_transaction', {
    p_transaction_id: id,
    p_action: 'reject',
    p_reason: reason,
  })
  if (error) throw error
}

export async function submitTransaction(id: string, note?: string | null): Promise<void> {
  const { error } = await supabase.rpc('submit_transaction', {
    p_transaction_id: id,
    p_note: note ?? null,
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

// Project-related functions
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('code', { ascending: true })

  if (error) throw error
  return (data as Project[]) || []
}

export async function createProject(input: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
  const uid = await getCurrentUserId()
  
  const payload = {
    ...input,
    created_by: uid ?? null,
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return data as Project
}

export async function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) throw error
  return data as Project
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export interface ProjectFinancialSummary {
  project_id: string | null
  project_code: string
  project_name: string
  project_budget: number | null
  total_transactions_count: number
  total_debits: number
  total_credits: number
  net_amount: number
  budget_utilization_percent: number | null
}

export async function getProjectFinancialSummary(
  projectId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ProjectFinancialSummary[]> {
  const { data, error } = await supabase.rpc('get_project_financial_summary', {
    p_project_id: projectId || null,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null
  })

  if (error) throw error
  return (data as ProjectFinancialSummary[]) || []
}

// Get transactions with project information
export async function getTransactionsWithProject(options?: ListTransactionsOptions): Promise<PagedResult<TransactionRecord & { project_code?: string; project_name?: string }>> {
  const scope = options?.filters?.scope ?? 'all'
  const pendingOnly = options?.filters?.pendingOnly ?? false
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('v_transactions_with_project')
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
      query = query.or(
        `entry_number.ilike.%${s}%,description.ilike.%${s}%,reference_number.ilike.%${s}%,notes.ilike.%${s}%,project_code.ilike.%${s}%,project_name.ilike.%${s}%`
      )
    }
    if (f.dateFrom) query = query.gte('entry_date', f.dateFrom)
    if (f.dateTo) query = query.lte('entry_date', f.dateTo)
    if (f.amountFrom != null) query = query.gte('amount', f.amountFrom)
    if (f.amountTo != null) query = query.lte('amount', f.amountTo)
    if (f.debitAccountId) query = query.eq('debit_account_id', f.debitAccountId)
    if (f.creditAccountId) query = query.eq('credit_account_id', f.creditAccountId)
    if (f.projectId) query = query.eq('project_id', f.projectId)
    if (f.orgId) query = query.eq('org_id', f.orgId)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { rows: (data as any[]) || [], total: count ?? 0 }
}

