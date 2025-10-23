import { supabase } from '@/utils/supabase'

export interface CreateFiscalYearInput {
  orgId: string
  yearNumber: number
  startDate: string // ISO date (YYYY-MM-DD)
  endDate: string   // ISO date (YYYY-MM-DD)
  createMonthlyPeriods?: boolean
  nameEn?: string | null
  nameAr?: string | null
  descriptionEn?: string | null
  descriptionAr?: string | null
}

export interface FiscalYearRow {
  id: string
  org_id: string
  year_number: number
  name_en: string | null
  name_ar: string | null
  description_en: string | null
  description_ar: string | null
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'closed' | 'archived'
  is_current: boolean
  created_at?: string
  updated_at?: string
}

export class FiscalYearManagementService {
  // Fetch fiscal years for org (simple list)
  static async getFiscalYears(orgId: string): Promise<FiscalYearRow[]> {
    const { data, error } = await supabase
      .from('fiscal_years')
      .select('*')
      .eq('org_id', orgId)
      .order('year_number', { ascending: true })

    if (error) throw new Error(`getFiscalYears failed: ${error.message}`)
    return (data ?? []) as FiscalYearRow[]
  }

  // Create fiscal year via RPC create_fiscal_year
  static async createFiscalYear(input: CreateFiscalYearInput): Promise<string> {
    // Ensure session so Authorization header is present
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Not signed in — Authorization header missing')

    // Basic validations to fail fast UI-side
    const sd = new Date(input.startDate)
    const ed = new Date(input.endDate)
    if (!(sd instanceof Date) || isNaN(+sd)) throw new Error('Invalid start date')
    if (!(ed instanceof Date) || isNaN(+ed)) throw new Error('Invalid end date')
    if (ed < sd) throw new Error('end_date must be >= start_date')

    const params = {
      p_org_id: input.orgId,
      p_year_number: input.yearNumber,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      // Pass the current user id to satisfy function signature and created_by triggers
      p_user_id: session.user.id,
      p_create_monthly_periods: input.createMonthlyPeriods ?? false, // default OFF to isolate
      p_name_en: input.nameEn ?? null,
      p_name_ar: input.nameAr ?? null,
      p_description_en: input.descriptionEn ?? null,
      p_description_ar: input.descriptionAr ?? null,
    }

    const { data, error } = await supabase.rpc('create_fiscal_year', params)
    if (error) {
      // Expose helpful error
      throw new Error(`create_fiscal_year failed: ${error.message}`)
    }
    return data as string
  }
}

export default FiscalYearManagementService
