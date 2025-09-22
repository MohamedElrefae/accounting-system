import { supabase } from '@/utils/supabase'

export interface CreateFiscalYearInput {
  orgId: string
  yearNumber: number
  startDate: string // ISO date
  endDate: string   // ISO date
  createMonthlyPeriods?: boolean
  nameEn?: string
  nameAr?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
}

export class FiscalYearManagementService {
  static async createFiscalYear(input: CreateFiscalYearInput) {
    const { orgId, yearNumber, startDate, endDate, createMonthlyPeriods = true, nameEn, nameAr, descriptionEn, descriptionAr } = input

    const { data, error } = await supabase.rpc('create_fiscal_year', {
      p_org_id: orgId,
      p_year_number: yearNumber,
      p_start_date: startDate,
      p_end_date: endDate,
      p_create_monthly_periods: createMonthlyPeriods,
      p_name_en: nameEn ?? null,
      p_name_ar: nameAr ?? null,
      p_description_en: descriptionEn ?? null,
      p_description_ar: descriptionAr ?? null,
    })

    if (error) throw new Error(`create_fiscal_year failed: ${error.message}`)
    return data as string // fiscal_year id
  }

  static async getFiscalYears(orgId: string) {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .order('year_number', { ascending: true })

    if (error) throw new Error(`getFiscalYears failed: ${error.message}`)
    return data
  }

  static async getFiscalPeriods(orgId: string, fiscalYearId: string) {
    const { data, error } = await supabase
      .from('fiscal_periods')
      .select('*')
      .eq('org_id', orgId)
      .eq('fiscal_year_id', fiscalYearId)
      .order('period_number', { ascending: true })

    if (error) throw new Error(`getFiscalPeriods failed: ${error.message}`)
    return data
  }

  // Aggregated status for a fiscal year
  static async getFiscalYearStatus(orgId: string, fiscalYearId: string) {
    const [{ data: periods, error: e1 }, { data: imports, error: e2 }] = await Promise.all([
      supabase.from('fiscal_periods').select('status').eq('org_id', orgId).eq('fiscal_year_id', fiscalYearId),
      supabase.from('opening_balance_imports').select('id,status').eq('org_id', orgId).eq('fiscal_year_id', fiscalYearId),
    ])
    if (e1) throw e1
    if (e2) throw e2
    const open = (periods || []).filter(p => p.status === 'open').length
    const locked = (periods || []).filter(p => p.status === 'locked').length
    const closed = (periods || []).filter(p => p.status === 'closed').length
    return { open, locked, closed, imports: (imports || []).length }
  }

  // Start closing: ensure checklist exists (jsonb), optionally lock period
  static async initiatePeriodClosing(periodId: string, lock = true) {
    if (lock) {
      await supabase.from('fiscal_periods').update({ status: 'locked', updated_at: new Date().toISOString() }).eq('id', periodId)
    }
    // If no checklist exists for this period, create a minimal default
    // We need org_id and fiscal_year_id to insert
    const { data: period, error } = await supabase.from('fiscal_periods').select('org_id,fiscal_year_id').eq('id', periodId).maybeSingle()
    if (error) throw error
    if (!period) throw new Error('Period not found')

    const { data: existing } = await supabase
      .from('period_closing_checklists')
      .select('id')
      .eq('org_id', period.org_id)
      .eq('fiscal_period_id', periodId)
      .limit(1)
    if (!existing || existing.length === 0) {
      await supabase.from('period_closing_checklists').insert({
        org_id: period.org_id,
        fiscal_year_id: period.fiscal_year_id,
        fiscal_period_id: periodId,
        name_en: 'Default Closing Checklist',
        status: 'pending',
        items: [
          { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), code: 'BANK_REC', title_en: 'Bank reconciliation', status: 'pending' },
          { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), code: 'PROJECT_COST', title_en: 'Project cost review', status: 'pending' },
          { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), code: 'VAT', title_en: 'VAT compliance', status: 'pending' },
        ],
      })
    }
    return { ok: true }
  }

  // Validate period closure readiness (light): checks checklists and validation
  static async validatePeriodClosure(orgId: string, fiscalYearId: string, periodId: string) {
    const [{ data: checklists }, { data: validation, error: vErr }] = await Promise.all([
      supabase
        .from('period_closing_checklists')
        .select('status,items')
        .eq('org_id', orgId)
        .eq('fiscal_period_id', periodId),
      supabase.rpc('validate_opening_balances', { p_org_id: orgId, p_fiscal_year_id: fiscalYearId }),
    ])
    if (vErr) throw vErr
    const allItems = (checklists || []).flatMap((c: any) => (Array.isArray(c.items) ? c.items : []))
    const pendingCount = allItems.filter((i: any) => i.status !== 'completed').length
    return {
      ok: pendingCount === 0 && (validation?.errors?.length || 0) === 0,
      pendingChecklistItems: pendingCount,
      validation,
    }
  }
}
