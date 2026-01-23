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

// Internal account shape for template building
interface AccountRow {
  id: string
  org_id: string
  code: string
  name_en?: string | null
  name_ar?: string | null
  parent_id?: string | null
  level?: number | null
  is_active?: boolean | null
  is_postable?: boolean | null
  is_leaf?: boolean | null
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

export type SubscribeToImportParams = {
  /** The import job ID to subscribe to */
  importId: string
  /** Optional callback receiving the latest ImportResult snapshot */
  onTick?: (status: ImportResult) => void
}

export type SubscriptionHandle = { unsubscribe: () => void }

export class OpeningBalanceImportService {
  /**
   * Subscribe to realtime changes for a specific opening balance import.
   *
   * Usage:
   * subscribeToImport({ importId, onTick })
   *
   * @param params - SubscribeToImportParams
   * @returns SubscriptionHandle with an unsubscribe() method
   */
  static subscribeToImport(params: SubscribeToImportParams): SubscriptionHandle {
    if (!params || typeof params !== 'object') {
      throw new Error('subscribeToImport now requires a single params object. Use subscribeToImport({ importId, onTick })')
    }
    const { importId, onTick } = params
    if (!importId || typeof importId !== 'string') {
      throw new Error('subscribeToImport requires params.importId (string)')
    }
    const ch = supabase
      .channel(`obi:${importId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'opening_balance_imports',
        filter: `id=eq.${importId}`,
      }, async (_payload: any) => {
        try {
          const s = await this.getImportStatus(importId)
          onTick?.(s)
        } catch { /* noop */ }
      })
      .subscribe()
    return {
      unsubscribe() { try { ch.unsubscribe() } catch { /* noop */ } },
    }
  }

  // 1) Parse Excel -> rows (supports debit/credit or single amount)
  static async extractAccountCodesFromExcel(file: File): Promise<string[]> {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null })

    const out = new Set<string>()
    for (const r of rows) {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') return r[k]
        }
        return null
      }
      const code = get('account_code', 'AccountCode', 'كود الحساب')
      if (code !== null) {
        const v = String(code).trim()
        if (v) out.add(v)
      }
    }
    return Array.from(out)
  }

  static async importFromExcel(
    orgId: string,
    fiscalYearId: string,
    file: File,
    _userId?: string,
    opts?: {
      overrideProjectCode?: string | null
      overrideCostCenterCode?: string | null
    },
  ): Promise<ImportResult> {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: null })

    // Normalize headers: support English/Arabic common variants
    let usedDebitCredit = false
    const normalized: OpeningBalanceImportRow[] = []
    let sumDebit = 0
    let sumCredit = 0

    for (const r of rows) {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') return r[k]
        }
        return null
      }

      const debitRaw = get('opening_balance_debit','debit','Debit','DR','مدين')
      const creditRaw = get('opening_balance_credit','credit','Credit','CR','دائن')
      let debit = debitRaw !== null ? Number(debitRaw) : NaN
      let credit = creditRaw !== null ? Number(creditRaw) : NaN

      const amountRaw = get('amount', 'Amount', 'المبلغ')
      const amount = amountRaw !== null ? Number(amountRaw) : NaN

      // Clean negatives and NaNs for debit/credit
      if (!isFinite(debit)) debit = NaN
      if (!isFinite(credit)) credit = NaN
      if (isFinite(debit) && debit < 0) debit = NaN
      if (isFinite(credit) && credit < 0) credit = NaN

      let computedAmount: number | null = null
      if (isFinite(debit) || isFinite(credit)) {
        usedDebitCredit = true
        const d = isFinite(debit) ? debit : 0
        const c = isFinite(credit) ? credit : 0
        sumDebit += d
        sumCredit += c
        computedAmount = d - c
      } else if (isFinite(amount)) {
        computedAmount = amount
      }

      // Skip rows with no usable amount or zero result
      if (computedAmount === null || !isFinite(computedAmount) || Number(computedAmount) === 0) {
        continue
      }

      const obj: OpeningBalanceImportRow = {
        account_id: get('account_id', 'AccountId') ?? undefined,
        account_code: get('account_code', 'AccountCode', 'كود الحساب') ?? undefined,
        project_id: get('project_id', 'ProjectId') ?? undefined,
        project_code: (opts?.overrideProjectCode !== undefined ? opts.overrideProjectCode : (get('project_code', 'ProjectCode', 'كود المشروع') ?? undefined)) as any,
        cost_center_id: get('cost_center_id', 'CostCenterId') ?? undefined,
        cost_center_code: (opts?.overrideCostCenterCode !== undefined ? opts.overrideCostCenterCode : (get('cost_center_code', 'CostCenterCode', 'كود مركز التكلفة') ?? undefined)) as any,
        amount: Number(computedAmount),
        currency_code: get('currency_code', 'Currency', 'العملة') ?? undefined,
      }
      normalized.push(obj)
    }

    // Enforce balance if debit/credit columns were present
    if (usedDebitCredit) {
      const fmt = new Intl.NumberFormat()
      if (Math.round((sumDebit - sumCredit) * 100) !== 0) {
        throw new Error(`Opening balances not balanced: Debit = ${fmt.format(sumDebit)}, Credit = ${fmt.format(sumCredit)}, Difference = ${fmt.format(sumDebit - sumCredit)}`)
      }
    }

    // Validate required fields (account, amount) before server
    const validation = OpeningBalanceImportService.validateImportData(normalized)
    if (!validation.ok) {
      throw new Error(
        `Validation failed: ${validation.errors.map((e) => `${e.code}: ${e.message}`).join('; ')}`,
      )
    }

    // Ensure all accounts are postable/leaf
    const codes = Array.from(new Set(normalized.map(r => r.account_code).filter(Boolean))) as string[]
    const ids = Array.from(new Set(normalized.map(r => r.account_id).filter(Boolean))) as string[]
    if (codes.length || ids.length) {
      // Keep verification lightweight and avoid 400 logs: select minimal columns only
      let q2 = supabase.from('accounts').select('id, code, org_id')
      if (codes.length) q2 = q2.in('code', codes)
      if (ids.length) q2 = q2.in('id', ids)
      const res2 = await q2.eq('org_id', orgId)
      if (res2.error) throw new Error(`Failed to verify accounts: ${res2.error.message}`)
      const accs: any[] = (res2.data as any[]) || []
      const nonPostableCodes = new Set<string>()
      const postableById = new Map<string, boolean>()
      const postableByCode = new Map<string, boolean>()
      for (const a of accs || []) {
        const okFlag = (a as any).is_postable === true || (a as any).is_leaf === true
        const ok = (a as any).is_postable === undefined && (a as any).is_leaf === undefined ? true : okFlag
        postableById.set((a as any).id, ok)
        postableByCode.set((a as any).code, ok)
      }
      for (const r of normalized) {
        const ok = r.account_id ? postableById.get(r.account_id) : postableByCode.get(r.account_code || '')
        if (ok === false) {
          if (r.account_code) nonPostableCodes.add(r.account_code)
        }
      }
      if (nonPostableCodes.size) {
        const list = Array.from(nonPostableCodes).slice(0, 20).join(', ')
        throw new Error(`Some accounts are not postable/leaf and cannot have opening balances: ${list}${nonPostableCodes.size>20?' …':''}`)
      }
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

    // Ensure session (Authorization header)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Not signed in — Authorization header missing')

    const { data: importId, error } = await supabase
      .rpc('import_opening_balances_no_approval', {
        p_org_id: orgId,
        p_fiscal_year_id: fiscalYearId,
        p_import_data: payload,
        p_user_id: session.user.id,
        p_source: 'ui',
        p_source_file_url: null,
      })

    if (error) {
      throw new Error(`import_opening_balances failed: ${error.message}`)
    }

    // Fetch the job status
    return await this.getImportStatus(importId as string)
  }

  static async searchAccounts(orgId: string, query: string, limit = 20): Promise<Array<{ id: string; code: string; name?: string; level?: number }>> {
    try {
      let q = supabase
        .from('accounts')
        .select('id, code, name, level')
        .eq('org_id', orgId)
        .limit(limit)
        .order('code', { ascending: true })
      if (query && query.trim()) {
        const term = query.trim()
        q = q.or(`code.ilike.%${term}%,name.ilike.%${term}%`)
      }
      const { data, error } = await q
      if (error) throw error
      return (data as any[]) as Array<{ id: string; code: string; name?: string; level?: number }>
    } catch {
      return []
    }
  }

  static async fetchCurrencies(): Promise<string[]> {
    // Use a static, commonly-used set to avoid noisy 404s when a currencies table is not present
    // If you later add a currencies table or RPC, wire it up here.
    return ['EGP','SAR','AED','USD','EUR','KWD','QAR','BHD']
  }

  static async listAccountsForSelect(orgId: string, limit = 1000): Promise<Array<{ value: string; label: string; searchText?: string }>> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('code, name')
        .eq('org_id', orgId)
        .order('code', { ascending: true })
        .limit(limit)
      if (error) throw error
      return ((data as any[]) || []).map(r => ({ value: r.code, label: r.name ? `${r.code} - ${r.name}` : r.code, searchText: `${r.code} ${r.name||''}` }))
    } catch { return [] }
  }

  static async listProjectsForSelect(orgId: string, limit = 1000): Promise<Array<{ value: string; label: string; searchText?: string; parent?: string }>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, code, name')
        .or(`org_id.eq.${orgId},org_id.is.null`)
        .order('code', { ascending: true })
        .limit(limit)
      if (error) throw error
      return ((data as any[]) || []).map(r => ({ value: r.code, label: r.name ? `${r.code} - ${r.name}` : r.code, searchText: `${r.code} ${r.name||''}`, parent: undefined }))
    } catch { return [] }
  }

  static async listAccountsTreeForSelect(orgId: string, limit = 5000): Promise<Array<{ value: string; label: string; searchText?: string; parent?: string }>> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, parent_id, level')
        .eq('org_id', orgId)
        .order('code', { ascending: true })
        .limit(limit)
      if (error) throw error
      return ((data as any[]) || []).map(r => ({ value: r.code, label: r.name ? `${r.code} - ${r.name}` : r.code, searchText: `${r.code} ${r.name||''}`, parent: r.parent_id || undefined }))
    } catch { return [] }
  }

  static async listCostCentersTreeForSelect(orgId: string, limit = 5000): Promise<Array<{ value: string; label: string; searchText?: string; parent?: string }>> {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, code, name')
        .eq('org_id', orgId)
        .order('code', { ascending: true })
        .limit(limit)
      if (error) throw error
      return ((data as any[]) || []).map(r => ({ value: r.code, label: r.name ? `${r.code} - ${r.name}` : r.code, searchText: `${r.code} ${r.name||''}`, parent: undefined }))
    } catch { return [] }
  }

  static async listCostCentersForSelect(orgId: string, limit = 1000): Promise<Array<{ value: string; label: string; searchText?: string }>> {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('code, name')
        .eq('org_id', orgId)
        .order('code', { ascending: true })
        .limit(limit)
      if (error) throw error
      return ((data as any[]) || []).map(r => ({ value: r.code, label: r.name ? `${r.code} - ${r.name}` : r.code, searchText: `${r.code} ${r.name||''}` }))
    } catch { return [] }
  }

  static async searchProjects(orgId: string, query: string, limit = 20): Promise<Array<{ id: string; code: string; name?: string }>> {
    try {
      let q = supabase
        .from('projects')
        .select('id, code, name')
        .or(`org_id.eq.${orgId},org_id.is.null`)
        .limit(limit)
        .order('code', { ascending: true })
      if (query && query.trim()) {
        const term = query.trim()
        q = q.or(`code.ilike.%${term}%,name.ilike.%${term}%`)
      }
      const { data, error } = await q
      if (error) throw error
      return (data as any[]) as Array<{ id: string; code: string; name?: string }>
    } catch {
      return []
    }
  }

  static async searchCostCenters(orgId: string, query: string, limit = 20): Promise<Array<{ id: string; code: string; name?: string }>> {
    try {
      let q = supabase
        .from('cost_centers')
        .select('id, code, name')
        .eq('org_id', orgId)
        .limit(limit)
        .order('code', { ascending: true })
      if (query && query.trim()) {
        const term = query.trim()
        q = q.or(`code.ilike.%${term}%,name.ilike.%${term}%`)
      }
      const { data, error } = await q
      if (error) throw error
      return (data as any[]) as Array<{ id: string; code: string; name?: string }>
    } catch {
      return []
    }
  }

  // Manual rows import (UI entry)
  static async importFromManualRows(
    orgId: string,
    fiscalYearId: string,
    items: Array<{
      account_id?: string
      account_code?: string
      opening_balance_debit?: number | string | null
      opening_balance_credit?: number | string | null
      amount?: number | string | null
      project_code?: string | null
      cost_center_code?: string | null
      currency_code?: string | null
    }>
  ): Promise<ImportResult> {
    // Normalize like Excel path
    const normalized: OpeningBalanceImportRow[] = []
    let sumDebit = 0, sumCredit = 0, usedDC = false
    for (const r of items) {
      let d = r.opening_balance_debit != null ? Number(r.opening_balance_debit) : NaN
      let c = r.opening_balance_credit != null ? Number(r.opening_balance_credit) : NaN
      const a = r.amount != null ? Number(r.amount) : NaN
      if (!isFinite(d)) d = NaN
      if (!isFinite(c)) c = NaN
      if (isFinite(d) || isFinite(c)) { usedDC = true; sumDebit += isFinite(d)?d:0; sumCredit += isFinite(c)?c:0 }
      const computed = (isFinite(d) || isFinite(c)) ? ((isFinite(d)?d:0) - (isFinite(c)?c:0)) : (isFinite(a) ? a : NaN)
      if (!isFinite(computed) || Number(computed) === 0) continue
      normalized.push({
        account_id: r.account_id ?? undefined,
        account_code: r.account_code ?? undefined,
        project_code: r.project_code ?? undefined,
        cost_center_code: r.cost_center_code ?? undefined,
        amount: Number(computed),
        currency_code: r.currency_code ?? undefined,
      })
    }
    if (usedDC) {
      const diff = Math.round((sumDebit - sumCredit) * 100)
      if (diff !== 0) throw new Error('Debit/Credit do not balance')
    }
    const v = this.validateImportData(normalized)
    if (!v.ok) throw new Error('Validation failed: ' + v.errors.map(e=>e.code).join(','))

    // Reuse the RPC call path
    const payload = normalized.map(r => ({
      account_id: r.account_id ?? null,
      account_code: r.account_code ?? null,
      project_id: null,
      project_code: r.project_code ?? null,
      cost_center_id: null,
      cost_center_code: r.cost_center_code ?? null,
      amount: r.amount,
      currency_code: r.currency_code ?? null,
    }))
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Not signed in')
    const { data: importId, error } = await supabase
      .rpc('import_opening_balances_no_approval', {
        p_org_id: orgId,
        p_fiscal_year_id: fiscalYearId,
        p_import_data: payload,
        p_user_id: session.user.id,
        p_source: 'ui_manual',
        p_source_file_url: null,
      })
    if (error) throw new Error(`import_opening_balances failed: ${error.message}`)
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

  // 5) Generate Excel template (header-only; legacy single-amount)
  static async generateImportTemplate(): Promise<Blob> {
    const headers = [
      'account_code', 'project_code', 'cost_center_code', 'amount', 'currency_code',
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

  // 5b) Generate Excel template prefilled with current accounts (debit/credit mode)
  static async generateAccountsPrefilledTemplate(orgId: string, opts?: { includeCurrency?: boolean }): Promise<Blob> {
    const includeCurrency = !!opts?.includeCurrency
    const accounts = await this.fetchAccountsForTemplate(orgId)
    // With the consolidated RPC, parent_id/level are present; compute lookups directly
    const { parentCodeById, parentPathById } = this.computeParentLookups(accounts)

    // Only active postable/leaf accounts
    const rows = accounts.filter(a => (a.is_active ?? true) && ((a.is_postable === true) || (a.is_leaf === true) || !this.hasChildren(a.id, accounts)))

    const projectScopeId = (()=>{ try { return (typeof window !== 'undefined') ? (localStorage.getItem('project_id') || '') : '' } catch { return '' } })()
    const costCenterScopeId = (()=>{ try { return (typeof window !== 'undefined') ? (localStorage.getItem('cost_center_id') || '') : '' } catch { return '' } })()

    const headers = [
      'account_code', 'account_name_en', 'account_name_ar', /* removed account_id */ 'level', 'parent_code', 'parent_path',
      'opening_balance_debit', 'opening_balance_credit', 'project_code', 'cost_center_code',
      ...(includeCurrency ? ['currency_code'] : []),
      'project_scope_id', 'cost_center_scope_id'
    ]
    const arHeaders = [
      'كود الحساب','اسم الحساب (EN)','اسم الحساب (AR)',/* حُذف معرّف الحساب */'المستوى','كود الأصل','مسار الأصل',
      'مدين رصيد افتتاحي','دائن رصيد افتتاحي','كود المشروع','كود مركز التكلفة',
      ...(includeCurrency ? ['العملة'] : []),
      'معرّف المشروع (نطاق)','معرّف مركز التكلفة (نطاق)'
    ]

    const aoa: (string|number|null)[][] = [headers, arHeaders]
    for (const a of rows) {
      aoa.push([
        a.code,
        a.name_en ?? '',
        a.name_ar ?? '',
        a.level ?? null,
        parentCodeById.get(a.id) ?? '',
        parentPathById.get(a.id) ?? '',
        null,
        null,
        '',
        '',
        ...(includeCurrency ? [''] : []),
        projectScopeId,
        costCenterScopeId,
      ])
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    // Note: Removed sheet protection to allow users to edit the template

    // Best-effort column widths
    ;(ws as any)['!cols'] = [
      { wch: 16 }, // account_code
      { wch: 28 }, // name_en
      { wch: 32 }, // name_ar
      { wch: 38 }, // account_id
      { wch: 8 },  // level
      { wch: 16 }, // parent_code
      { wch: 40 }, // parent_path
      { wch: 14 }, // debit
      { wch: 14 }, // credit
      { wch: 16 }, // project_code
      { wch: 18 }, // cost_center_code
      ...(includeCurrency ? [{ wch: 10 }] : []),
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CurrentAccounts')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }

  // 5c) Generate CSV template prefilled with current accounts (debit/credit mode)
  static async generateAccountsPrefilledCsv(orgId: string, opts?: { includeCurrency?: boolean }): Promise<Blob> {
    const includeCurrency = !!opts?.includeCurrency
    const accounts = await this.fetchAccountsForTemplate(orgId)
    // With consolidated RPC, compute lookups directly
    const { parentCodeById, parentPathById } = this.computeParentLookups(accounts)
    const rows = accounts.filter(a => (a.is_active ?? true) && ((a.is_postable === true) || (a.is_leaf === true) || !this.hasChildren(a.id, accounts)))

    const projectScopeId = (()=>{ try { return (typeof window !== 'undefined') ? (localStorage.getItem('project_id') || '') : '' } catch { return '' } })()
    const costCenterScopeId = (()=>{ try { return (typeof window !== 'undefined') ? (localStorage.getItem('cost_center_id') || '') : '' } catch { return '' } })()

    const headers = [
      'account_code','account_name_en','account_name_ar',/* removed account_id */'level','parent_code','parent_path',
      'opening_balance_debit','opening_balance_credit','project_code','cost_center_code',
      ...(includeCurrency ? ['currency_code'] : []),
      'project_scope_id','cost_center_scope_id'
    ]

    const esc = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v)
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }

    const lines: string[] = []
    lines.push(headers.join(','))
    for (const a of rows) {
      const line = [
        esc(a.code),
        esc(a.name_en ?? ''),
        esc(a.name_ar ?? ''),
        esc(a.level ?? ''),
        esc(parentCodeById.get(a.id) ?? ''),
        esc(parentPathById.get(a.id) ?? ''),
        '',
        '',
        '',
        '',
        ...(includeCurrency ? [''] : []),
        esc(projectScopeId),
        esc(costCenterScopeId),
      ].join(',')
      lines.push(line)
    }

    const csv = lines.join('\n')
    return new Blob([csv], { type: 'text/csv;charset=utf-8' })
  }

  // Helper: fetch accounts for template
  private static async fetchAccountsForTemplate(orgId: string): Promise<AccountRow[]> {
    // Strategy: 1) Prefer consolidated RPC; 2) fallback to trial balance RPC; 3) final fallback to table
    try {
      const { data, error } = await supabase.rpc('get_accounts_for_template', { p_org_id: orgId })
      if (!error && Array.isArray(data)) {
        return (data as any[]).map((r) => ({
          id: r.id,
          org_id: r.org_id,
          code: r.code,
          name_en: r.name, // map to name_en field for convenience
          name_ar: r.name_ar,
          parent_id: r.parent_id,
          level: r.level,
          is_active: true,
          is_postable: undefined,
          is_leaf: undefined,
        }))
      }
    } catch {}

    // 2) Trial balance RPC as safe alternative
    try {
      const { data, error } = await supabase.rpc('get_trial_balance_current_tx', {
        p_org_id: orgId,
        p_mode: 'posted',
      })
      if (!error && Array.isArray(data)) {
        return (data as any[]).map((r) => ({
          id: r.account_id || r.id,
          org_id: orgId,
          code: r.code,
          name_en: r.name,
          name_ar: undefined,
          parent_id: undefined,
          level: undefined,
          is_active: true,
          is_postable: undefined,
          is_leaf: undefined,
        }))
      }
    } catch {}

    // 3) Fallback to direct table with graceful degrade
    let data: any[] | null = null
    try {
      const res = await supabase
        .from('accounts')
        .select('id, org_id, code, name, name_ar, parent_id, level, is_active, is_postable')
      data = res.data as any[]
      if (res.error) throw res.error
      data = (data || []).map(a => ({ ...a, name_en: a.name }))
    } catch {
      const res2 = await supabase
        .from('accounts')
        .select('id, org_id, code, name, name_ar, parent_id, level')
      data = res2.data as any[]
      if (res2.error) throw new Error(`Failed to load accounts (fallback): ${res2.error.message}`)
      data = (data || []).map((a) => ({ ...a, is_active: true, is_postable: undefined, is_leaf: undefined, name_en: a.name }))
    }
    return (data as AccountRow[]) || []
  }

  private static hasChildren(id: string, all: AccountRow[]): boolean {
    for (const a of all) if (a.parent_id === id) return true
    return false
  }

  private static computeParentLookups(all: AccountRow[]): { byId: Map<string, AccountRow>, parentCodeById: Map<string, string>, parentPathById: Map<string, string> } {
    const byId = new Map<string, AccountRow>()
    const codeById = new Map<string, string>()
    for (const a of all) { byId.set(a.id, a); codeById.set(a.id, a.code) }

    const parentCodeById = new Map<string, string>()
    const parentPathById = new Map<string, string>()

    for (const a of all) {
      const parent = a.parent_id ? byId.get(a.parent_id) : undefined
      if (parent) parentCodeById.set(a.id, parent.code)
      // Walk path
      const pathCodes: string[] = []
      let cursor: AccountRow | undefined = a
      while (cursor && cursor.parent_id) {
        const p = byId.get(cursor.parent_id)
        if (!p) break
        pathCodes.push(p.code)
        cursor = p
      }
      parentPathById.set(a.id, pathCodes.reverse().join(' / '))
    }

    return { byId, parentCodeById, parentPathById }
  }

  // Opening Balances results by import id with pagination and basic filters
  static async fetchOpeningBalancesByImport(args: {
    orgId: string
    fiscalYearId: string
    importId: string
    page?: number
    pageSize?: number
    orderBy?: string
    orderDir?: 'asc' | 'desc'
    filters?: { accountCode?: string; projectCode?: string; costCenterCode?: string }
  }): Promise<{ rows: any[]; totalCount: number }> {
    const { orgId, fiscalYearId, importId } = args
    const page = Math.max(1, args.page || 1)
    const pageSize = Math.max(1, Math.min(1000, args.pageSize || 50))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = supabase
      .from('opening_balances')
      .select('id, org_id, fiscal_year_id, account_id, project_id, cost_center_id, amount, currency_code, import_id, created_at, created_by', { count: 'exact', head: false })
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .eq('import_id', importId)

    // Optional filters via code lookups (best-effort lightweight)
    if (args.filters?.accountCode) {
      // Join not available in PostgREST select; use a subquery of accounts table ids
      const { data: accs } = await supabase
        .from('accounts')
        .select('id')
        .eq('org_id', orgId)
        .ilike('code', `%${args.filters.accountCode}%`)
        .limit(500)
      const ids = (accs || []).map((r: any) => r.id)
      if (ids.length) q = q.in('account_id', ids)
      else return { rows: [], totalCount: 0 }
    }
    if (args.filters?.projectCode) {
      const { data: projs } = await supabase
        .from('projects')
        .select('id')
        .or(`org_id.eq.${orgId},org_id.is.null`)
        .ilike('code', `%${args.filters.projectCode}%`)
        .limit(500)
      const ids = (projs || []).map((r: any) => r.id)
      if (ids.length) q = q.in('project_id', ids)
      else return { rows: [], totalCount: 0 }
    }
    if (args.filters?.costCenterCode) {
      const { data: ccs } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('org_id', orgId)
        .ilike('code', `%${args.filters.costCenterCode}%`)
        .limit(500)
      const ids = (ccs || []).map((r: any) => r.id)
      if (ids.length) q = q.in('cost_center_id', ids)
      else return { rows: [], totalCount: 0 }
    }

    if (args.orderBy) q = q.order(args.orderBy as any, { ascending: (args.orderDir || 'desc') === 'asc' })
    const { data, error, count } = await q.range(from, to)
    if (error) throw new Error(`fetchOpeningBalancesByImport failed: ${error.message}`)
    return { rows: (data || []) as any[], totalCount: Number(count || 0) }
  }

  // Enrichment lookups for codes/names
  static async fetchEnrichmentMaps(args: { accountIds: (string|undefined)[]; projectIds: (string|null|undefined)[]; costCenterIds: (string|null|undefined)[] }) {
    const accountIds = Array.from(new Set(args.accountIds.filter(Boolean))) as string[]
    const projectIds = Array.from(new Set(args.projectIds.filter(Boolean))) as string[]
    const costCenterIds = Array.from(new Set(args.costCenterIds.filter(Boolean))) as string[]

    const [accRes, projRes, ccRes] = await Promise.all([
      accountIds.length ? supabase.from('accounts').select('id, code, name, name_ar, level').in('id', accountIds) : Promise.resolve({ data: [], error: null } as any),
      projectIds.length ? supabase.from('projects').select('id, code, name').in('id', projectIds) : Promise.resolve({ data: [], error: null } as any),
      costCenterIds.length ? supabase.from('cost_centers').select('id, code, name').in('id', costCenterIds) : Promise.resolve({ data: [], error: null } as any),
    ])

    const accounts = new Map<string, any>()
    const projects = new Map<string, any>()
    const costCenters = new Map<string, any>()
    for (const r of (accRes.data as any[]) || []) accounts.set(r.id, r)
    for (const r of (projRes.data as any[]) || []) projects.set(r.id, r)
    for (const r of (ccRes.data as any[]) || []) costCenters.set(r.id, r)

    return { accounts, projects, costCenters }
  }

  // Grand totals (debit and credit) for an import
  static async fetchImportGrandTotals(args: { orgId: string; fiscalYearId: string; importId: string }): Promise<{ debit: number; credit: number }> {
    const { orgId, fiscalYearId, importId } = args
    const posQ = await supabase
      .from('opening_balances')
      .select('amount', { count: 'exact', head: false })
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .eq('import_id', importId)
      .gt('amount', 0)
      .limit(100000)
    const negQ = await supabase
      .from('opening_balances')
      .select('amount', { count: 'exact', head: false })
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .eq('import_id', importId)
      .lt('amount', 0)
      .limit(100000)
    if (posQ.error) throw new Error(posQ.error.message)
    if (negQ.error) throw new Error(negQ.error.message)
    const debit = (posQ.data as any[] || []).reduce((s, r) => s + Number(r.amount || 0), 0)
    const credit = (negQ.data as any[] || []).reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0)
    return { debit, credit }
  }

  // RPC-based enrichment for environments where parent_id/level are not available to the client
  // private static async _enrichAccountsWithAncestors(orgId: string, accounts: AccountRow[], cap: number = 1000): Promise<{ parentCodeById: Map<string,string>, parentPathById: Map<string,string> }> {
  //   const parentCodeById = new Map<string, string>()
  //   const parentPathById = new Map<string, string>()
  //   const ids = accounts.map(a => a.id).slice(0, cap)
  //   for (const id of ids) {
  //     try {
  //       const { data, error } = await supabase.rpc('get_account_ancestors', { p_org_id: orgId, p_account_id: id })
  //       if (!error && Array.isArray(data) && data.length) {
  //         // data is root → node, last row is self
  //         const path = (data as any[]).map(r => r.code)
  //         const parentCode = path.length >= 2 ? path[path.length-2] : undefined
  //         if (parentCode) parentCodeById.set(id, parentCode)
  //         parentPathById.set(id, path.slice(0, -1).join(' / '))
  //       }
  //     } catch {}
  //   }
  //   return { parentCodeById, parentPathById }
  // }


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

  // 7) Create approval request for an opening balance import
  static async requestApproval(args: { orgId: string; importId: string; submittedBy?: string }) {
    const { orgId, importId, submittedBy } = args
    
    // Use the proper database function that handles workflow_id resolution
    const { data, error } = await supabase
      .rpc('fn_create_approval_request', {
        p_org_id: orgId,
        p_target_table: 'opening_balances',
        p_target_id: importId,
        p_requested_by: submittedBy || null,
        p_workflow_id: null, // Let the function resolve it
        p_metadata: {}
      })

    if (error) throw new Error(`requestApproval failed: ${error.message}`)
    return data
  }
}
