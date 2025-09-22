import { supabase } from '@/utils/supabase'
import type { PostgrestSingleResponse } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

// Types for import rows (both ID- and code-based)
export interface OpeningBalanceImportRow {
  account_id?: string
  account_code?: string
  project_id?: string | null
  project_code?: string | null
  cost_center_id?: string | null
  cost_center_code?: string | null
  amount: number
  currency_code?: string | null
}

export interface ImportResult {
  importId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partially_completed'
  totalRows: number
  successRows: number
  failedRows: number
  errorReport: unknown[]
}

export interface ValidationIssue {
  code: string
  message: string
  row?: Record<string, unknown>
}

export interface ValidationReport {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  totals?: { count: number; sum: number }
  by_account?: Array<{ account_id: string; total: number }>
  by_project?: Array<{ project_id: string | null; total: number }>
  by_cost_center?: Array<{ cost_center_id: string | null; total: number }>
  active_rules?: Array<{ id: string; rule_code: string; name_en: string; name_ar?: string | null; severity: string; active: boolean }>
}

export class OpeningBalanceImportService {
  // 1) Parse Excel -> rows
  static async importFromExcel(
    orgId: string,
    fiscalYearId: string,
    file: File,
    userId?: string,
  ): Promise<ImportResult> {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null })

    // Normalize headers: support English/Arabic common variants
    const normalized: OpeningBalanceImportRow[] = rows.map((r) => {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') return r[k]
        }
        return null
      }

      const amountRaw = get('amount', 'Amount', 'المبلغ')
      const amount = amountRaw !== null ? Number(amountRaw) : NaN

      const obj: OpeningBalanceImportRow = {
        account_id: get('account_id', 'AccountId'),
        account_code: get('account_code', 'AccountCode', 'كود الحساب') ?? undefined,
        project_id: get('project_id', 'ProjectId'),
        project_code: get('project_code', 'ProjectCode', 'كود المشروع') ?? undefined,
        cost_center_id: get('cost_center_id', 'CostCenterId'),
        cost_center_code: get('cost_center_code', 'CostCenterCode', 'كود مركز التكلفة') ?? undefined,
        amount: isFinite(amount) ? amount : NaN,
        currency_code: get('currency_code', 'Currency', 'العملة') ?? undefined,
      }
      return obj
    })

    // Basic client-side validation before sending
    const validation = OpeningBalanceImportService.validateImportData(normalized)
    if (!validation.ok) {
      // If the client-side validation fails hard, surface immediately
      throw new Error(
        `Validation failed: ${validation.errors.map((e) => `${e.code}: ${e.message}`).join('; ')}`,
      )
    }

    // Call RPC function import_opening_balances
    const payload = normalized.map((r) => ({
      account_id: r.account_id ?? null,
      account_code: r.account_code ?? null,
      project_id: r.project_id ?? null,
      project_code: r.project_code ?? null,
      cost_center_id: r.cost_center_id ?? null,
      cost_center_code: r.cost_center_code ?? null,
      amount: r.amount,
      currency_code: r.currency_code ?? null,
    }))

    const { data: importId, error } = await supabase
      .rpc('import_opening_balances', {
        p_org_id: orgId,
        p_fiscal_year_id: fiscalYearId,
        p_import_data: payload,
      })

    if (error) {
      throw new Error(`import_opening_balances failed: ${error.message}`)
    }

    // Fetch the job status
    return await this.getImportStatus(importId as string)
  }

  // 2) Validate rows on client side (lightweight)
  static validateImportData(rows: OpeningBalanceImportRow[]): ValidationReport {
    const errors: ValidationIssue[] = []
    const warnings: ValidationIssue[] = []

    rows.forEach((r, idx) => {
      if (r.amount === undefined || r.amount === null || isNaN(r.amount)) {
        errors.push({ code: 'missing_amount', message: 'Amount is required', row: { row: idx + 1 } })
      } else if (r.amount === 0) {
        warnings.push({ code: 'zero_amount', message: 'Amount is zero', row: { row: idx + 1 } })
      }

      if (!r.account_id && !r.account_code) {
        errors.push({ code: 'missing_account', message: 'Account ID or code is required', row: { row: idx + 1 } })
      }
    })

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      totals: { count: rows.length, sum: rows.reduce((s, r) => s + (isFinite(r.amount) ? Number(r.amount) : 0), 0) },
    }
  }

  // 3) Query job status/details
  static async getImportStatus(importId: string): Promise<ImportResult> {
    const { data, error }: PostgrestSingleResponse<any> = await supabase
      .from('opening_balance_imports')
      .select('*')
      .eq('id', importId)
      .maybeSingle()

    if (error) throw new Error(`getImportStatus failed: ${error.message}`)
    if (!data) throw new Error('Import job not found')

    return {
      importId: data.id,
      status: data.status,
      totalRows: data.total_rows,
      successRows: data.success_rows,
      failedRows: data.failed_rows,
      errorReport: data.error_report ?? [],
    }
  }

  // 4) Server-side validation summary
  static async validateOpeningBalances(orgId: string, fiscalYearId: string, constructionSpecific = false) {
    const fn = constructionSpecific
      ? 'validate_construction_opening_balances'
      : 'validate_opening_balances'

    const { data, error } = await supabase.rpc(fn, {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId,
    })

    if (error) throw new Error(`${fn} failed: ${error.message}`)
    return data as ValidationReport
  }

  // 5) Generate Excel template (client-side)
  static async generateImportTemplate(): Promise<Blob> {
    const headers = [
      'account_code', 'project_code', 'cost_center_code', 'amount', 'currency_code',
      // Arabic header hints (second header row)
    ]

    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      ['كود الحساب', 'كود المشروع', 'كود مركز التكلفة', 'المبلغ', 'العملة'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  // 6) Import history for a fiscal year
  static async getImportHistory(orgId: string, fiscalYearId: string) {
    const { data, error } = await supabase
      .from('opening_balance_imports')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`getImportHistory failed: ${error.message}`)
    return data as any[]
  }
}