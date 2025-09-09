import { supabase } from '../utils/supabase'
import type { UniversalTableColumn, UniversalTableData } from '../utils/UniversalExportManager'

export interface ExportableTableMeta {
  table_name: string
  row_estimate?: number
  column_count?: number
  has_rls?: boolean
}

export type ExportLanguage = 'ar' | 'en'

const DEFAULT_TABLE_ALLOWLIST: string[] = [
  'transactions',
  'accounts',
  'organizations',
  'projects',
  'cost_centers',
  'work_items',
  'transaction_classifications',
  'expenses_categories',
]

export async function listExportableTables(): Promise<ExportableTableMeta[]> {
  // Prefer RPC if present
  try {
    const { data, error } = await supabase.rpc('list_exportable_tables')
    if (error) throw error
    if (Array.isArray(data) && data.length) {
      return (data as any[]).map((r) => ({
        table_name: r.table_name,
        row_estimate: Number(r.row_estimate ?? 0),
        column_count: Number(r.column_count ?? 0),
        has_rls: !!r.has_rls,
      }))
    }
  } catch {
    // fall back to allowlist
  }
  return DEFAULT_TABLE_ALLOWLIST.map((name) => ({ table_name: name }))
}

export interface TransactionsFilter {
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
  costCenterId?: string
  status?: 'all' | 'posted' | 'unposted'
}

export async function fetchTransactionsAll(filters: TransactionsFilter = {}, batchSize = 1000): Promise<any[]> {
  const toNull = (v: any) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) ? null : v
  const all: any[] = []
  let offset = 0
  while (true) {
    try {
      const { data, error } = await supabase.rpc('export_transactions_page', {
        p_search: toNull(filters.search),
        p_date_from: toNull(filters.dateFrom),
        p_date_to: toNull(filters.dateTo),
        p_amount_from: filters.amountFrom ?? null,
        p_amount_to: filters.amountTo ?? null,
        p_debit_account_id: toNull(filters.debitAccountId),
        p_credit_account_id: toNull(filters.creditAccountId),
        p_project_id: toNull(filters.projectId),
        p_org_id: toNull(filters.orgId),
        p_classification_id: toNull(filters.classificationId),
        p_expenses_category_id: toNull(filters.expensesCategoryId),
        p_work_item_id: toNull(filters.workItemId),
        p_cost_center_id: toNull(filters.costCenterId),
        p_status: (filters.status && ['all','posted','unposted'].includes(filters.status)) ? filters.status : 'all',
        p_limit: batchSize,
        p_offset: offset,
      })
      if (error) throw error
      const chunk = (data as any[] | null) ?? []
      if (chunk.length === 0) break
      // export_transactions_page returns jsonb rows
      chunk.forEach((j: any) => all.push(j))
      if (chunk.length < batchSize) break
      offset += batchSize
    } catch (err) {
      // Fallback: use client-side service if RPC missing; fetch via transactions service
      // We intentionally keep the fallback simple: stop if RPC unavailable
      // The UI can still use generic table export for `transactions` whole table
      break
    }
  }
  return all
}

export async function fetchGenericTableAll(tableName: string, batchSize = 1000): Promise<any[]> {
  const rows: any[] = []
  let from = 0
  while (true) {
    const to = from + batchSize - 1
    const { data, error } = await supabase.from(tableName).select('*').range(from, to)
    if (error) throw error
    const chunk = (data as any[] | null) ?? []
    rows.push(...chunk)
    if (chunk.length < batchSize) break
    from += batchSize
  }
  return rows
}

export function buildColumnsForTransactions(lang: ExportLanguage): UniversalTableColumn[] {
  const isAr = lang === 'ar'
  return [
    { key: 'entry_number', header: isAr ? 'رقم القيد' : 'Entry Number', type: 'text' },
    { key: 'entry_date', header: isAr ? 'التاريخ' : 'Date', type: 'date' },
    { key: 'description', header: isAr ? 'البيان' : 'Description', type: 'text' },
    { key: 'debit_account', header: isAr ? 'الحساب المدين' : 'Debit Account', type: 'text' },
    { key: 'credit_account', header: isAr ? 'الحساب الدائن' : 'Credit Account', type: 'text' },
    { key: 'amount', header: isAr ? 'المبلغ' : 'Amount', type: 'currency' },
    { key: 'classification_name', header: isAr ? 'التصنيف' : 'Classification', type: 'text' },
    { key: 'expenses_category', header: isAr ? 'فئة المصروف' : 'Expenses Category', type: 'text' },
    { key: 'work_item', header: isAr ? 'عنصر العمل' : 'Work Item', type: 'text' },
    { key: 'organization_name', header: isAr ? 'المؤسسة' : 'Organization', type: 'text' },
    { key: 'project_name', header: isAr ? 'المشروع' : 'Project', type: 'text' },
    { key: 'cost_center', header: isAr ? 'مركز التكلفة' : 'Cost Center', type: 'text' },
    { key: 'reference_number', header: isAr ? 'المرجع' : 'Reference', type: 'text' },
    { key: 'notes', header: isAr ? 'الملاحظات' : 'Notes', type: 'text' },
    { key: 'created_by', header: isAr ? 'أنشئت بواسطة' : 'Created By', type: 'text' },
    { key: 'posted_by', header: isAr ? 'مرحلة بواسطة' : 'Posted By', type: 'text' },
    { key: 'posted_at', header: isAr ? 'تاريخ الترحيل' : 'Posted At', type: 'date' },
    { key: 'status', header: isAr ? 'الحالة' : 'Status', type: 'text' },
  ]
}

export function buildColumnsFromRowsGeneric(rows: any[]): UniversalTableColumn[] {
  const first = rows[0]
  if (!first || typeof first !== 'object') return []
  return Object.keys(first).map((k) => ({ key: k, header: k, type: 'text' as const }))
}

export function toUniversalTableData(columns: UniversalTableColumn[], rows: any[]): UniversalTableData {
  return { columns, rows }
}

