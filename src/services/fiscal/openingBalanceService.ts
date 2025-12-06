// ============================================
// OPENING BALANCE SERVICE - UNIFIED
// Al-Baraka Construction Company
// ============================================

import { supabase } from '@/utils/supabase'
import type { 
  OpeningBalance, 
  OpeningBalanceImport, 
  ValidationResult,
  CreateOpeningBalanceInput,
  ImportOpeningBalanceItem
} from './types'
import { fiscalLogger } from './logger'

export class OpeningBalanceService {
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get all opening balances for a fiscal year
   */
  static async getAll(orgId: string, fiscalYearId: string): Promise<OpeningBalance[]> {
    fiscalLogger.debug('getAll opening balances', { orgId, fiscalYearId })

    const { data, error } = await supabase
      .from('opening_balances')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .order('created_at', { ascending: false })

    if (error) {
      fiscalLogger.error('getAll opening balances failed', error)
      throw new Error(`Failed to fetch opening balances: ${error.message}`)
    }

    return (data || []).map(this.mapBalanceFromDb)
  }

  /**
   * Get opening balance by account
   */
  static async getByAccount(
    orgId: string,
    fiscalYearId: string,
    accountId: string
  ): Promise<OpeningBalance | null> {
    fiscalLogger.debug('getByAccount', { orgId, fiscalYearId, accountId })

    const { data, error } = await supabase
      .from('opening_balances')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .eq('account_id', accountId)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) {
      fiscalLogger.error('getByAccount failed', error)
      throw new Error(`Failed to fetch opening balance: ${error.message}`)
    }

    return data ? this.mapBalanceFromDb(data) : null
  }

  /**
   * Get all imports for a fiscal year
   */
  static async getImports(orgId: string, fiscalYearId: string): Promise<OpeningBalanceImport[]> {
    fiscalLogger.debug('getImports', { orgId, fiscalYearId })

    const { data, error } = await supabase
      .from('opening_balance_imports')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .order('created_at', { ascending: false })

    if (error) {
      fiscalLogger.error('getImports failed', error)
      throw new Error(`Failed to fetch imports: ${error.message}`)
    }

    return (data || []).map(this.mapImportFromDb)
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Import opening balances in bulk
   * Uses RPC: import_opening_balances
   */
  static async import(
    orgId: string,
    fiscalYearId: string,
    items: ImportOpeningBalanceItem[],
    source: 'excel' | 'csv' | 'manual' = 'excel',
    sourceFileUrl?: string
  ): Promise<string> {
    fiscalLogger.debug('import opening balances', { orgId, fiscalYearId, itemCount: items.length })

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user?.id) throw new Error('Not authenticated')

    const { data: importId, error } = await supabase.rpc('import_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId,
      p_import_data: items,
      p_user_id: userData.user.id,
      p_source: source,
      p_source_file_url: sourceFileUrl ?? null,
    })

    if (error) {
      fiscalLogger.error('import failed', error)
      throw new Error(`Failed to import: ${error.message}`)
    }

    fiscalLogger.info('import success', { importId })
    return importId as string
  }

  /**
   * Create a single opening balance entry
   */
  static async create(input: CreateOpeningBalanceInput): Promise<OpeningBalance> {
    fiscalLogger.debug('create opening balance', input)

    const { data, error } = await supabase
      .from('opening_balances')
      .insert({
        org_id: input.orgId,
        fiscal_year_id: input.fiscalYearId,
        account_id: input.accountId,
        amount: input.amount,
        project_id: input.projectId ?? null,
        cost_center_id: input.costCenterId ?? null,
        currency: input.currency ?? 'SAR',
        notes: input.notes ?? null,
      })
      .select()
      .single()

    if (error) {
      fiscalLogger.error('create opening balance failed', error)
      throw new Error(`Failed to create opening balance: ${error.message}`)
    }

    fiscalLogger.info('create opening balance success', { id: data.id })
    return this.mapBalanceFromDb(data)
  }

  /**
   * Update an opening balance
   */
  static async update(id: string, input: Partial<OpeningBalance>): Promise<OpeningBalance> {
    fiscalLogger.debug('update opening balance', { id, input })

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.projectId !== undefined) updateData.project_id = input.projectId
    if (input.costCenterId !== undefined) updateData.cost_center_id = input.costCenterId

    const { data, error } = await supabase
      .from('opening_balances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      fiscalLogger.error('update opening balance failed', error)
      throw new Error(`Failed to update opening balance: ${error.message}`)
    }

    fiscalLogger.info('update opening balance success', { id })
    return this.mapBalanceFromDb(data)
  }

  /**
   * Delete an opening balance
   */
  static async delete(id: string): Promise<void> {
    fiscalLogger.debug('delete opening balance', { id })

    const { error } = await supabase
      .from('opening_balances')
      .delete()
      .eq('id', id)

    if (error) {
      fiscalLogger.error('delete opening balance failed', error)
      throw new Error(`Failed to delete opening balance: ${error.message}`)
    }

    fiscalLogger.info('delete opening balance success', { id })
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate opening balances
   * Uses RPC: validate_opening_balances
   */
  static async validate(orgId: string, fiscalYearId: string): Promise<ValidationResult> {
    fiscalLogger.debug('validate opening balances', { orgId, fiscalYearId })

    const { data, error } = await supabase.rpc('validate_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId,
    })

    if (error) {
      fiscalLogger.error('validate failed', error)
      throw new Error(`Failed to validate: ${error.message}`)
    }

    fiscalLogger.debug('validate success', { ok: data?.ok })
    return data as ValidationResult
  }

  /**
   * Validate for construction-specific rules
   * Uses RPC: validate_construction_opening_balances
   */
  static async validateConstruction(orgId: string, fiscalYearId: string): Promise<ValidationResult> {
    fiscalLogger.debug('validateConstruction', { orgId, fiscalYearId })

    const { data, error } = await supabase.rpc('validate_construction_opening_balances', {
      p_org_id: orgId,
      p_fiscal_year_id: fiscalYearId,
    })

    if (error) {
      fiscalLogger.error('validateConstruction failed', error)
      throw new Error(`Failed to validate construction: ${error.message}`)
    }

    return data as ValidationResult
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static mapBalanceFromDb(row: Record<string, unknown>): OpeningBalance {
    return {
      id: row.id as string,
      orgId: row.org_id as string,
      fiscalYearId: row.fiscal_year_id as string,
      accountId: row.account_id as string,
      projectId: row.project_id as string | null,
      costCenterId: row.cost_center_id as string | null,
      amount: row.amount as number,
      currency: row.currency as string,
      notes: row.notes as string | null,
      importId: row.import_id as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  private static mapImportFromDb(row: Record<string, unknown>): OpeningBalanceImport {
    return {
      id: row.id as string,
      orgId: row.org_id as string,
      fiscalYearId: row.fiscal_year_id as string,
      source: row.source as OpeningBalanceImport['source'],
      sourceFileUrl: row.source_file_url as string | null,
      status: row.status as OpeningBalanceImport['status'],
      totalRows: row.total_rows as number,
      successRows: row.success_rows as number,
      failedRows: row.failed_rows as number,
      errorDetails: row.error_details as Record<string, unknown> | null,
      importedBy: row.imported_by as string,
      createdAt: row.created_at as string,
    }
  }
}
