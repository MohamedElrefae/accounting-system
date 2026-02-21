// NOTE: The functions appended at the end of this file provide unified access
// to either legacy or gl2 data paths based on feature flags. They are additive
// and should not break existing imports.

// GL2 feature flags removed; unified model only
import { supabase } from '../utils/supabase'
import { formatDateForSupabase } from '../utils/dateHelpers'
import { getTransactionNumberConfig } from './company-config'

export type UnifiedListParams = { limit?: number };

// GL2 journal listing/reading removed — use unified data sources (transactions + transaction_lines).
export async function listJournalsUnified(params?: UnifiedListParams) {
  const limit = params?.limit ?? 50;
  return supabase
    .from('transactions_enriched')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
}

export async function getJournalDetailsUnified(journalId: string) {
  // Fallback to enriched transactions view by id
  return supabase
    .from('transactions_enriched')
    .select('*')
    .eq('id', journalId)
    .single();
}

export type CreateJournalUnifiedArgs = {
  orgId: string;
  number: string;
  docType: string;
  docDate: string; // ISO date (YYYY-MM-DD)
  description?: string;
  sourceModule?: string;
  sourceRefId?: string | null;
  entityCode?: string | null;
  lines: Array<{
    account_code: string;
    debit_base: string | number;
    credit_base: string | number;
    description?: string;
    // Optional line-level dimensions to be stored in gl2.journal_line_dimensions
    // Keys should match the dimension_key values expected by the DB function
    dimensions?: Partial<Record<'project_id' | 'cost_center_id' | 'work_item_id' | 'analysis_work_item_id' | 'classification_id' | 'expenses_category_id', string>>;
  }>;
};

// GL2 journal create/post/void/reverse functions removed.
// Use transactions + transaction_lines flows instead.

// Helper: fetch a transaction header with its lines (for edit forms)
import { getTransactionLines } from './transaction-lines'

export async function getTransactionWithLines(transactionId: string) {
  if (!transactionId) throw new Error('transactionId is required')

  const { data: header, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (error) throw error

  const lines = await getTransactionLines(transactionId)
  return { header, lines }
}


export interface Account {
  id: string
  code: string
  name: string
  name_ar?: string
  is_postable: boolean
  allow_transactions?: boolean
  category?: string
  parent_id?: string | null
  level?: number
  org_id?: string
}

export interface Project {
  id: string
  code: string
  name: string
  description?: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'inactive'
  start_date?: string
  end_date?: string
  budget_amount?: number
  created_by?: string
  org_id?: string
  is_active?: boolean | null
  created_at: string
  updated_at: string
}

export interface TransactionRecord {
  id: string
  entry_number: string
  entry_date: string
  description: string
  description_ar?: string | null
  reference_number: string | null
  // Legacy single-line fields (removed in multiline schema) kept optional for compatibility
  debit_account_id?: string | null
  credit_account_id?: string | null
  amount?: number | null
  // Header-level fields
  notes: string | null
  notes_ar?: string | null
  project_id?: string | null
  org_id?: string | null
  is_posted: boolean
  posted_at: string | null
  posted_by: string | null
  created_by: string | null
  // Aggregates from lines (new schema)
  has_line_items?: boolean
  line_items_total?: number | null
  line_items_count?: number | null
  total_debits?: number | null
  total_credits?: number | null
  // Line-level dimension placeholders (optional in headers)
  classification_id?: string | null
  sub_tree_id?: string | null
  work_item_id?: string | null
  analysis_work_item_id?: string | null
  cost_center_id?: string | null
  // Approval workflow
  approval_status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested' | 'cancelled' | 'pending'
  submitted_at?: string | null
  submitted_by?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  review_action?: 'approved' | 'rejected' | 'revision_requested' | null
  review_reason?: string | null
  // Aggregated approval stats
  lines_total_count?: number
  lines_approved_count?: number
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
    
    // Get the highest number for this pattern (exclude wizard drafts)
    const { data, error } = await supabase
      .from('transactions')
      .select('entry_number')
      .ilike('entry_number', pattern)
      .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')
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

export async function getAccounts(orgId?: string | null): Promise<Account[]> {
  // Debug: Log the orgId to see what type it is
  if (import.meta.env.DEV) {
    console.log('getAccounts called with orgId:', orgId, typeof orgId)
  }
  
  // Defensive check: ensure orgId is a string, not an object
  if (orgId && typeof orgId !== 'string') {
    console.error('getAccounts: orgId is not a string:', orgId)
    orgId = null
  }
  
  // Try to scope by current org to match the tree-of-accounts view
  const effectiveOrgId: string | null = orgId ?? null
  if (import.meta.env.DEV) {
    console.log('effectiveOrgId:', effectiveOrgId, typeof effectiveOrgId)
  }

  let query = supabase
    .from('accounts')
    .select('id, code, name, name_ar, is_postable, allow_transactions, category, parent_id, level, org_id')
    .eq('status', 'active')
    .order('code', { ascending: true })

  if (effectiveOrgId) {
    query = query.eq('org_id', effectiveOrgId)
  }

  const { data, error } = await query
  if (error) throw error
  // Strip org_id before returning, but include name_ar
  return ((data as any[]) || []).map(row => ({ 
    id: row.id, 
    code: row.code, 
    name: row.name, 
    name_ar: row.name_ar,
    is_postable: (row.is_postable ?? row.allow_transactions ?? false),
    allow_transactions: row.allow_transactions ?? undefined,
    category: row.category, 
    parent_id: row.parent_id, 
    level: row.level,
    org_id: row.org_id,
  })) as Account[]
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
  expensesCategoryId?: string // Note: Only applicable to transaction_lines, not transactions table
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

  const f = options?.filters

  // Build query on transactions table directly
  let query = supabase
    .from('transactions')
    // Using 'planned' count is significantly faster than 'exact' on large tables.
    // This impacts only pagination totals; row data remains exact.
    .select('*', { count: 'planned' })
    // Exclude wizard drafts - these are temporary records for document attachment
    .or('is_wizard_draft.is.null,is_wizard_draft.eq.false')

  // Apply filters
  if (scope === 'my') {
    const uid = await getCurrentUserId()
    if (uid) query = query.eq('created_by', uid)
  }

  if (pendingOnly) {
    query = query.eq('is_posted', false)
  }

  if (f?.search) {
    const s = f.search
    // Search in description, reference_number, entry_number
    query = query.or(`description.ilike.%${s}%,reference_number.ilike.%${s}%,entry_number.ilike.%${s}%`)
  }

  if (f?.dateFrom) query = query.gte('entry_date', f.dateFrom)
  if (f?.dateTo) query = query.lte('entry_date', f.dateTo)
  if (f?.amountFrom) query = query.gte('amount', f.amountFrom)
  if (f?.amountTo) query = query.lte('amount', f.amountTo)
  
  if (f?.debitAccountId) query = query.eq('debit_account_id', f.debitAccountId)
  if (f?.creditAccountId) query = query.eq('credit_account_id', f.creditAccountId)
  
  if (f?.projectId) query = query.eq('project_id', f.projectId)
  if (f?.orgId) query = query.eq('org_id', f.orgId)
  if (f?.classificationId) query = query.eq('classification_id', f.classificationId)
  // Note: sub_tree_id filter removed - it only exists on transaction_lines table, not transactions table
  if (f?.workItemId) query = query.eq('work_item_id', f.workItemId)
  if (f?.analysisWorkItemId) query = query.eq('analysis_work_item_id', f.analysisWorkItemId)
  if (f?.costCenterId) query = query.eq('cost_center_id', f.costCenterId)
  
  if (f?.approvalStatus) query = query.eq('approval_status', f.approvalStatus)

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  query = query
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  const rows = (data || []) as TransactionRecord[]
  const total = count || 0

  // Patch header aggregates from live view to avoid relying on triggers
  try {
    if (rows.length > 0) {
      const ids = rows.map(r => r.id)

      // Fetch page-level aggregates in parallel to reduce RTT cost.
      const pendingIds = rows.filter(r => !r.is_posted).map(r => r.id)

      const [aggsResult, approvalStatsResult] = await Promise.all([
        supabase
          .from('v_tx_line_items_agg')
          .select('transaction_id, line_items_count, line_items_total')
          .in('transaction_id', ids),
        pendingIds.length > 0
          ? supabase
              .from('transaction_lines')
              .select('transaction_id, line_status')
              .in('transaction_id', pendingIds)
          : Promise.resolve({ data: null as any, error: null as any }),
      ])

      const { data: aggs, error: aggErr } = aggsResult as any
      const { data: approvalStats } = approvalStatsResult as any

      const approvalStatsMap = new Map<string, { total: number; approved: number }>()
      if (approvalStats) {
        for (const stat of approvalStats) {
          const current = approvalStatsMap.get(stat.transaction_id) || { total: 0, approved: 0 }
          current.total++
          if (stat.line_status === 'approved') current.approved++
          approvalStatsMap.set(stat.transaction_id, current)
        }
      }

      if (!aggErr && Array.isArray(aggs)) {
        const map = new Map<string, { c: number; t: number }>()
        for (const a of aggs as any[]) map.set(a.transaction_id, { c: Number(a.line_items_count || 0), t: Number(a.line_items_total || 0) })
        for (const r of rows) {
          const m = map.get(r.id)
          if (m) {
            ;(r as any).line_items_count = m.c
            ;(r as any).line_items_total = m.t
            ;(r as any).has_line_items = m.c > 0
          }

          // Patch approval stats
          const stats = approvalStatsMap.get(r.id)
          if (stats) {
            ;(r as any).lines_total_count = stats.total
            ;(r as any).lines_approved_count = stats.approved

            // Patch approval status if all lines are approved but header status is lagging
            if (stats.total > 0 && stats.approved === stats.total && (r.approval_status === 'draft' || r.approval_status === 'submitted' || r.approval_status === 'pending')) {
              r.approval_status = 'approved'
            } else if (stats.approved > 0 && stats.approved < stats.total && (r.approval_status === 'draft' || r.approval_status === 'submitted')) {
              r.approval_status = 'pending'
            }
          }
        }
      }
    }
  } catch {}

  return { rows, total }
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
    description_ar: (input as any).description_ar || null,
    reference_number: input.reference_number || null,
    debit_account_id: input.debit_account_id,
    credit_account_id: input.credit_account_id,
    amount: input.amount,
    notes: input.notes || null,
    notes_ar: (input as any).notes_ar || null,
    classification_id: input.classification_id || null,
    sub_tree_id: input.sub_tree_id || null,
    work_item_id: input.work_item_id || null,
    analysis_work_item_id: input.analysis_work_item_id || null,
    cost_center_id: input.cost_center_id || null,
    project_id: input.project_id || null,
    org_id: input.org_id || null,
    created_by: uid ?? null,
  }

  // Wired transaction creation
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  const isOffline = !getConnectionMonitor().getHealth().isOnline;

  if (isOffline) {
    try {
      console.log('[createTransaction] Offline detected. Enqueuing operation.');
      // 1. Create local ID
      const localId = crypto.randomUUID();
      
      // 2. Prepare payload for local DB (ensure all required fields)
      const now = new Date().toISOString();
      const localTx = {
        id: localId,
        ...payload,
        created_at: now,
        updated_at: now,
        is_posted: false,
        is_synced: false,
        // Add any other required fields for local DB schema
      };

      // 3. Save to IndexedDB
      const { getOfflineDB } = await import('./offline/core/OfflineSchema');
      const db = getOfflineDB();
      await db.transactions.add(localTx as any);

      // 4. Enqueue Sync Operation
      const { enqueueOperation } = await import('./offline/sync/SyncQueueManager');
      await enqueueOperation({
        type: 'CREATE',
        entityType: 'transaction',
        entityId: localId,
        data: localTx as any,
        userId: uid || 'offline-user',
        timestamp: Date.now(),
        id: crypto.randomUUID(), // Sync op ID
        deviceId: 'device-id-placeholder', // TODO: Get actual device ID
      });

      console.log('[createTransaction] Offline operation enqueued:', localId);
      return localTx as unknown as TransactionRecord;
    } catch (offlineErr) {
      console.error('[createTransaction] Offline save failed:', offlineErr);
      throw offlineErr;
    }
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
      payload.entry_number = String(newEntryNumber)
      const { data: retryData, error: retryError } = await supabase
        .from('transactions')
        .insert(payload)
        .select('*')
        .single()
      
      if (retryError) throw retryError
      return retryData as TransactionRecord
    }
    
    // If network error, fallback to offline
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
       console.warn('[createTransaction] Network error detected during create. Falling back to offline queue.');
       // ... (Reuse offline logic or recursive call with forced offline flag?)
       // For now, let's keep it simple: throw to let UI handle or duplicate logic. 
       // Duplicating logic here for robustness:
       try {
          // 1. Create local ID
          const localId = crypto.randomUUID();
          const now = new Date().toISOString();
          const localTx = { id: localId, ...payload, created_at: now, updated_at: now, is_posted: false, is_synced: false };
          
          // 2. Save
          const { getOfflineDB } = await import('./offline/core/OfflineSchema');
          const db = getOfflineDB();
          await db.transactions.add(localTx as any);

          // 3. Queue
          const { enqueueOperation } = await import('./offline/sync/SyncQueueManager');
          await enqueueOperation({
            type: 'CREATE',
            entityType: 'transaction',
            entityId: localId,
            data: localTx as any,
            userId: uid || 'offline-user',
            timestamp: Date.now(),
            id: crypto.randomUUID(),
            deviceId: 'device-id-placeholder',
          });
          
          return localTx as unknown as TransactionRecord;
       } catch (fallbackErr) {
          throw error; // Throw original error if fallback fails
       }
    }

    throw error
  }
  return data as TransactionRecord
}

// Multi-line transaction creation (new schema)
import { replaceTransactionLines, type TxLineInput } from './transaction-lines'

export interface CreateTransactionWithLinesInput {
  // Header fields (transactions table)
  entry_date: string
  description: string
  description_ar?: string | null
  reference_number?: string | null
  notes?: string | null
  notes_ar?: string | null
  project_id?: string | null
  org_id?: string | null
  // Lines (transaction_lines table)
  lines: TxLineInput[]
}

export async function createTransactionWithLines(input: CreateTransactionWithLinesInput): Promise<TransactionRecord> {
  // Validate input
  if (!input.description || input.description.trim().length < 3) {
    throw new Error('وصف المعاملة مطلوب (3 أحرف على الأقل)')
  }
  if (!input.org_id) {
    throw new Error('المؤسسة مطلوبة')
  }
  if (!Array.isArray(input.lines) || input.lines.length < 1) {
    throw new Error('يجب إضافة سطر واحد على الأقل')
  }

  // Validate lines balance
  let totalDebits = 0
  let totalCredits = 0
  for (const line of input.lines) {
    const d = Number(line.debit_amount || 0)
    const c = Number(line.credit_amount || 0)
    if (d < 0 || c < 0) throw new Error('المبالغ لا يمكن أن تكون سالبة')
    if ((d > 0 && c > 0) || (d === 0 && c === 0)) {
      throw new Error(`السطر ${line.line_no}: يجب إدخال مبلغ مدين أو دائن (ليس كلاهما)`)
    }
    totalDebits += d
    totalCredits += c
  }
  if (Math.abs(totalDebits - totalCredits) >= 0.01) {
    throw new Error(`القيود غير متوازنة - إجمالي المدين: ${totalDebits.toFixed(2)} مقابل إجمالي الدائن: ${totalCredits.toFixed(2)}`)
  }

  const uid = await getCurrentUserId()
  
  // Generate entry number
  const entryNumber = await getNextTransactionNumber()
  
  // Format date
  const formattedDate = formatDateForSupabase(input.entry_date)

  // Create header
  const headerPayload = {
    entry_number: entryNumber,
    entry_date: formattedDate,
    description: input.description.trim(),
    description_ar: input.description_ar?.trim() || null,
    reference_number: input.reference_number?.trim() || null,
    notes: input.notes?.trim() || null,
    notes_ar: input.notes_ar?.trim() || null,
    project_id: input.project_id || null,
    org_id: input.org_id,
    created_by: uid ?? null,
    // Legacy fields set to null (not used in multi-line model)
    debit_account_id: null,
    credit_account_id: null,
    amount: null,
  }

  const { data: header, error: headerError } = await supabase
    .from('transactions')
    .insert(headerPayload)
    .select('*')
    .single()

  if (headerError) {
    // Handle duplicate entry number error
    if (headerError.code === '23505' && headerError.message?.includes('entry_number')) {
      // Retry with a new number
      const newEntryNumber = await getNextTransactionNumber()
      headerPayload.entry_number = String(newEntryNumber)
      const { data: retryData, error: retryError } = await supabase
        .from('transactions')
        .insert(headerPayload)
        .select('*')
        .single()
      
      if (retryError) throw retryError
      
      // Create lines for retry
      await replaceTransactionLines(retryData.id, input.lines)
      return retryData as TransactionRecord
    }
    throw headerError
  }

  // Create lines
  try {
    await replaceTransactionLines(header.id, input.lines)
  } catch (linesError: any) {
    // If lines creation fails, delete the header to maintain consistency
    await supabase.from('transactions').delete().eq('id', header.id)
    throw new Error(`فشل إنشاء القيود: ${linesError.message}`)
  }

  return header as TransactionRecord
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

export async function deleteTransaction(id: string, opts?: { force?: boolean; renumber?: boolean }): Promise<{ renumber_applied: boolean }> {
  // Server-side RPC enforces permissions and cascades deletes to lines and child line items.
  // force=true allows super admins or managers to delete even if posted (if the function permits).
  const { data, error } = await supabase.rpc('sp_delete_transaction_cascade', {
    p_transaction_id: id,
    p_force: opts?.force ?? false,
    p_renumber: typeof opts?.renumber === 'boolean' ? opts!.renumber : null,
  } as any)
  if (error) throw error
  const renumberApplied = (data as any)?.renumber_applied === true
  return { renumber_applied: renumberApplied }
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
    'description_ar',
    'reference_number',
    'debit_account_id',
    'credit_account_id',
    'amount',
    'notes',
    'notes_ar',
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

  // Offline fallback or offline-first handling for updates
  const { getConnectionMonitor } = await import('../utils/connectionMonitor');
  const isOffline = !getConnectionMonitor().getHealth().isOnline;

  if (isOffline) {
    try {
      console.log('[updateTransaction] Offline detected. Enqueuing update.');
      const now = new Date().toISOString();
      
      // 1. Fetch current local state (necessary for delta/consistency)
      const { getOfflineDB } = await import('./offline/core/OfflineSchema');
      const db = getOfflineDB();
      const current = await db.transactions.get(id);

      // If not in local DB, we can't update it offline unless we just queue blindly.
      // Ideally, we should have it. If not, we might be updating a server-only record that 
      // hasn't been cached. For now, assume if offline, we might be editing something we just created.
      // If missing, we queue a blind update.
      
      const updatedRecord = {
        ...(current || { id }), // preserving existing fields if available
        ...payload,
        updated_at: now,
        is_synced: false
      };

      // 2. Save to local DB (upsert)
      await db.transactions.put(updatedRecord as any);

      // 3. Queue Sync Operation
      const { enqueueOperation } = await import('./offline/sync/SyncQueueManager');
      await enqueueOperation({
        type: 'UPDATE',
        entityType: 'transaction',
        entityId: id,
        data: payload as any,        // Send only changed fields
        originalData: current as any,// Send original for potential conflict resolution
        userId: (await getCurrentUserId()) || 'offline-user',
        timestamp: Date.now(),
        id: crypto.randomUUID(),
        deviceId: 'device-id-placeholder',
      });

      console.log('[updateTransaction] Offline update enqueued:', id);
      return updatedRecord as unknown as TransactionRecord;

    } catch (offlineErr) {
      console.error('[updateTransaction] Offline update failed:', offlineErr);
      throw offlineErr;
    }
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
     if (error.message?.includes('fetch') || error.message?.includes('network')) {
       console.warn('[updateTransaction] Network error. Falling back to offline queue.');
       try {
          const now = new Date().toISOString();
          const { getOfflineDB } = await import('./offline/core/OfflineSchema');
          const db = getOfflineDB();
          const current = await db.transactions.get(id);

          const updatedRecord = {
            ...(current || { id }),
            ...payload,
            updated_at: now,
            is_synced: false
          };

          await db.transactions.put(updatedRecord as any);

          const { enqueueOperation } = await import('./offline/sync/SyncQueueManager');
          await enqueueOperation({
            type: 'UPDATE',
            entityType: 'transaction',
            entityId: id,
            data: payload as any,
            originalData: current as any,
            userId: (await getCurrentUserId()) || 'offline-user',
            timestamp: Date.now(),
            id: crypto.randomUUID(),
            deviceId: 'device-id-placeholder',
          });

          return updatedRecord as unknown as TransactionRecord;
       } catch (fallbackErr) {
          throw error;
       }
     }
     throw error
  }
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

export async function submitTransaction(id: string, _note?: string | null): Promise<void> {
  // Get current user ID
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')
  
  // Use line-based approval workflow
  const { data, error } = await supabase.rpc('submit_transaction_for_line_approval', {
    p_transaction_id: id,
    p_submitted_by: userId,
  })
  
  if (error) {
    console.error('Submit transaction error:', error)
    throw error
  }
  
  if (import.meta.env.DEV) {
    console.log('✅ Transaction submitted for line approval:', data)
  }
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

