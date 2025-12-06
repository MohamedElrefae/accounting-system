// ============================================
// FISCAL PERIOD SERVICE - UNIFIED
// Al-Baraka Construction Company
// ============================================

import { supabase } from '@/utils/supabase'
import type { FiscalPeriod, UpdateFiscalPeriodInput, PeriodActivity } from './types'
import { fiscalLogger } from './logger'

export class FiscalPeriodService {
  // ============================================
  // READ OPERATIONS
  // ============================================

  /**
   * Get all periods for a fiscal year
   */
  static async getAll(orgId: string, fiscalYearId: string): Promise<FiscalPeriod[]> {
    fiscalLogger.debug('getAll periods', { orgId, fiscalYearId })

    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .order('period_number', { ascending: true })

    if (error) {
      fiscalLogger.error('getAll periods failed', error)
      throw new Error(`Failed to fetch periods: ${error.message}`)
    }

    fiscalLogger.debug('getAll periods success', { count: data?.length })
    return (data || []).map(this.mapFromDb)
  }

  /**
   * Get a single period by ID
   */
  static async getById(id: string): Promise<FiscalPeriod | null> {
    fiscalLogger.debug('getById period', { id })

    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('id', id)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) {
      fiscalLogger.error('getById period failed', error)
      throw new Error(`Failed to fetch period: ${error.message}`)
    }

    return data ? this.mapFromDb(data) : null
  }

  /**
   * Get the current period for an org
   */
  static async getCurrent(orgId: string): Promise<FiscalPeriod | null> {
    fiscalLogger.debug('getCurrent period', { orgId })

    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_current', true)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) {
      fiscalLogger.error('getCurrent period failed', error)
      throw new Error(`Failed to fetch current period: ${error.message}`)
    }

    return data ? this.mapFromDb(data) : null
  }

  /**
   * Get period activity summary
   * Uses RPC: get_period_activity (PREVIOUSLY UNUSED!)
   */
  static async getActivity(periodId: string): Promise<PeriodActivity> {
    fiscalLogger.debug('getActivity', { periodId })

    const { data, error } = await supabase.rpc('get_period_activity', {
      p_period_id: periodId
    })

    if (error) {
      fiscalLogger.error('getActivity failed', error)
      throw new Error(`Failed to get period activity: ${error.message}`)
    }

    fiscalLogger.debug('getActivity success', data)
    return data as PeriodActivity
  }

  // ============================================
  // WRITE OPERATIONS
  // ============================================

  /**
   * Update a period
   */
  static async update(id: string, input: UpdateFiscalPeriodInput): Promise<FiscalPeriod> {
    fiscalLogger.debug('update period', { id, input })

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (input.nameEn !== undefined) updateData.name_en = input.nameEn
    if (input.nameAr !== undefined) updateData.name_ar = input.nameAr
    if (input.descriptionEn !== undefined) updateData.description_en = input.descriptionEn
    if (input.descriptionAr !== undefined) updateData.description_ar = input.descriptionAr

    const { data, error } = await supabase
      .from('fiscal_periods')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      fiscalLogger.error('update period failed', error)
      throw new Error(`Failed to update period: ${error.message}`)
    }

    fiscalLogger.info('update period success', { id })
    return this.mapFromDb(data)
  }

  // ============================================
  // STATUS OPERATIONS
  // ============================================

  /**
   * Lock a period (prevents new transactions)
   */
  static async lock(periodId: string): Promise<FiscalPeriod> {
    fiscalLogger.debug('lock period', { periodId })

    const { data, error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .eq('id', periodId)
      .select()
      .single()

    if (error) {
      fiscalLogger.error('lock period failed', error)
      throw new Error(`Failed to lock period: ${error.message}`)
    }

    fiscalLogger.info('lock period success', { periodId })
    return this.mapFromDb(data)
  }

  /**
   * Unlock a period
   */
  static async unlock(periodId: string): Promise<FiscalPeriod> {
    fiscalLogger.debug('unlock period', { periodId })

    const { data, error } = await supabase
      .from('fiscal_periods')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', periodId)
      .select()
      .single()

    if (error) {
      fiscalLogger.error('unlock period failed', error)
      throw new Error(`Failed to unlock period: ${error.message}`)
    }

    fiscalLogger.info('unlock period success', { periodId })
    return this.mapFromDb(data)
  }

  /**
   * Close a period permanently
   * Uses RPC: close_fiscal_period
   */
  static async close(periodId: string, notes?: string): Promise<boolean> {
    fiscalLogger.debug('close period', { periodId, notes })

    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('close_fiscal_period', {
      p_period_id: periodId,
      p_user_id: userData?.user?.id,
      p_closing_notes: notes ?? null,
    })

    if (error) {
      fiscalLogger.error('close period failed', error)
      throw new Error(`Failed to close period: ${error.message}`)
    }

    fiscalLogger.info('close period success', { periodId })
    return data as boolean
  }

  /**
   * Set a period as current (unsets others)
   */
  static async setCurrent(orgId: string, periodId: string): Promise<void> {
    fiscalLogger.debug('setCurrent period', { orgId, periodId })

    // First, unset all current flags
    await supabase
      .from('fiscal_periods')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

    // Then set the new current
    const { error } = await supabase
      .from('fiscal_periods')
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq('id', periodId)

    if (error) {
      fiscalLogger.error('setCurrent period failed', error)
      throw new Error(`Failed to set current period: ${error.message}`)
    }

    fiscalLogger.info('setCurrent period success', { periodId })
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static mapFromDb(row: Record<string, unknown>): FiscalPeriod {
    return {
      id: row.id as string,
      orgId: row.org_id as string,
      fiscalYearId: row.fiscal_year_id as string,
      periodNumber: row.period_number as number,
      periodCode: row.period_code as string,
      nameEn: row.name_en as string,
      nameAr: row.name_ar as string | null,
      descriptionEn: row.description_en as string | null,
      descriptionAr: row.description_ar as string | null,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      status: row.status as FiscalPeriod['status'],
      isCurrent: row.is_current as boolean,
      closingNotes: row.closing_notes as string | null,
      closedAt: row.closed_at as string | null,
      closedBy: row.closed_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
