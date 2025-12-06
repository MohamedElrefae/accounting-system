// ============================================
// FISCAL YEAR SERVICE - UNIFIED
// Al-Baraka Construction Company
// ============================================

import { supabase } from '@/utils/supabase'
import type { FiscalYear, CreateFiscalYearInput, UpdateFiscalYearInput } from './types'
import { fiscalLogger } from './logger'

export class FiscalYearService {
  // ============================================
  // PERMISSION CHECK
  // ============================================
  
  /**
   * Check if user can manage fiscal data
   * Uses fn_can_manage_fiscal_v2 (NOT v1!)
   */
  static async canManage(orgId: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) {
        fiscalLogger.warn('canManage: No authenticated user')
        return false
      }

      const { data, error } = await supabase.rpc('fn_can_manage_fiscal_v2', {
        p_org_id: orgId,
        p_user_id: userData.user.id
      })

      if (error) {
        fiscalLogger.error('canManage RPC error', error)
        return false
      }

      return data === true
    } catch (e) {
      fiscalLogger.error('canManage exception', e)
      return false
    }
  }

  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get all fiscal years for an organization
   * Enterprise-grade implementation with optimized query and proper error handling
   */
  static async getAll(orgId: string): Promise<FiscalYear[]> {
    fiscalLogger.debug('getAll', { orgId })

    // Validate input
    if (!orgId || typeof orgId !== 'string') {
      throw new Error('Invalid organization ID provided')
    }

    try {
      // Use optimized query with specific column selection to avoid RLS complexity
      const { data, error } = await supabase
        .from('fiscal_years')
        .select(`
          id,
          org_id,
          year_number,
          name_en,
          name_ar,
          description_en,
          description_ar,
          start_date,
          end_date,
          status,
          is_current,
          closed_at,
          closed_by,
          created_by,
          updated_by,
          created_at,
          updated_at
        `)
        .eq('org_id', orgId)
        .order('year_number', { ascending: false })
        .limit(100) // Reasonable limit for enterprise use

      if (error) {
        fiscalLogger.error('getAll failed', error)
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`)
      }

      fiscalLogger.debug('getAll success', { count: data?.length })
      return (data || []).map(this.mapFromDb)
    } catch (error: any) {
      fiscalLogger.error('getAll exception', error)
      
      // Re-throw with context for proper error handling upstream
      if (error.message?.includes('Database error:')) {
        throw error
      }
      
      throw new Error(`Failed to retrieve fiscal years: ${error.message}`)
    }
  }

  /**
   * Get a single fiscal year by ID
   */
  static async getById(id: string): Promise<FiscalYear | null> {
    fiscalLogger.debug('getById', { id })

    // Use maybeSingle() to avoid 406 errors when no rows found
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error?.code === 'PGRST116') return null // Not found
    if (error) {
      fiscalLogger.error('getById failed', error)
      throw new Error(`Failed to fetch fiscal year: ${error.message}`)
    }

    return data ? this.mapFromDb(data) : null
  }

  /**
   * Get the current active fiscal year
   */
  static async getCurrent(orgId: string): Promise<FiscalYear | null> {
    fiscalLogger.debug('getCurrent', { orgId })

    // Use maybeSingle() instead of single() to avoid 406 errors when no rows found
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_current', true)
      .maybeSingle()

    // PGRST116 = no rows found (shouldn't happen with maybeSingle but handle anyway)
    if (error?.code === 'PGRST116') return null
    if (error) {
      fiscalLogger.error('getCurrent failed', error)
      throw new Error(`Failed to fetch current fiscal year: ${error.message}`)
    }

    return data ? this.mapFromDb(data) : null
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Create a new fiscal year with optional monthly periods
   * Uses RPC: create_fiscal_year
   */
  static async create(input: CreateFiscalYearInput): Promise<string> {
    fiscalLogger.debug('create', { input })

    // Date validation
    const startDate = new Date(input.startDate)
    const endDate = new Date(input.endDate)
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date')
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user?.id) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('create_fiscal_year', {
      p_org_id: input.orgId,
      p_year_number: input.yearNumber,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      p_user_id: userData.user.id,
      p_create_monthly_periods: input.createMonthlyPeriods ?? true,
      p_name_en: input.nameEn ?? `FY ${input.yearNumber}`,
      p_name_ar: input.nameAr ?? null,
      p_description_en: input.descriptionEn ?? null,
      p_description_ar: input.descriptionAr ?? null,
    })

    if (error) {
      fiscalLogger.error('create failed', error)
      throw new Error(`Failed to create fiscal year: ${error.message}`)
    }

    fiscalLogger.info('create success', { id: data })
    return data as string
  }

  /**
   * Update a fiscal year
   */
  static async update(id: string, input: UpdateFiscalYearInput): Promise<FiscalYear> {
    fiscalLogger.debug('update', { id, input })

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (input.nameEn !== undefined) updateData.name_en = input.nameEn
    if (input.nameAr !== undefined) updateData.name_ar = input.nameAr
    if (input.descriptionEn !== undefined) updateData.description_en = input.descriptionEn
    if (input.descriptionAr !== undefined) updateData.description_ar = input.descriptionAr
    if (input.status !== undefined) updateData.status = input.status
    if (input.isCurrent !== undefined) updateData.is_current = input.isCurrent

    const { data, error } = await supabase
      .from('fiscal_years')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      fiscalLogger.error('update failed', error)
      throw new Error(`Failed to update fiscal year: ${error.message}`)
    }

    fiscalLogger.info('update success', { id })
    return this.mapFromDb(data)
  }

  /**
   * Delete a fiscal year (only if draft status)
   */
  static async delete(id: string): Promise<void> {
    fiscalLogger.debug('delete', { id })

    const { error } = await supabase
      .from('fiscal_years')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')

    if (error) {
      fiscalLogger.error('delete failed', error)
      throw new Error(`Failed to delete fiscal year: ${error.message}`)
    }

    fiscalLogger.info('delete success', { id })
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  /**
   * Set a fiscal year as current (unsets others)
   */
  static async setCurrent(orgId: string, fiscalYearId: string): Promise<void> {
    fiscalLogger.debug('setCurrent', { orgId, fiscalYearId })

    // First, unset all current flags
    await supabase
      .from('fiscal_years')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

    // Then set the new current
    const { error } = await supabase
      .from('fiscal_years')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', fiscalYearId)

    if (error) {
      fiscalLogger.error('setCurrent failed', error)
      throw new Error(`Failed to set current fiscal year: ${error.message}`)
    }

    fiscalLogger.info('setCurrent success', { fiscalYearId })
  }

  /**
   * Activate a fiscal year (change status to 'active')
   */
  static async activate(id: string): Promise<FiscalYear> {
    fiscalLogger.debug('activate', { id })
    return this.update(id, { status: 'active' })
  }

  /**
   * Close a fiscal year
   */
  static async close(id: string): Promise<FiscalYear> {
    fiscalLogger.debug('close', { id })

    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('fiscal_years')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: userData?.user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      fiscalLogger.error('close failed', error)
      throw new Error(`Failed to close fiscal year: ${error.message}`)
    }

    fiscalLogger.info('close success', { id })
    return this.mapFromDb(data)
  }

  /**
   * Archive a fiscal year
   */
  static async archive(id: string): Promise<FiscalYear> {
    fiscalLogger.debug('archive', { id })
    return this.update(id, { status: 'archived' })
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map database row to TypeScript interface (snake_case → camelCase)
   */
  private static mapFromDb(row: Record<string, unknown>): FiscalYear {
    return {
      id: row.id as string,
      orgId: row.org_id as string,
      yearNumber: row.year_number as number,
      nameEn: row.name_en as string,
      nameAr: row.name_ar as string | null,
      descriptionEn: row.description_en as string | null,
      descriptionAr: row.description_ar as string | null,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      status: row.status as FiscalYear['status'],
      isCurrent: row.is_current as boolean,
      closedAt: row.closed_at as string | null,
      closedBy: row.closed_by as string | null,
      createdBy: row.created_by as string | null,
      updatedBy: row.updated_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
