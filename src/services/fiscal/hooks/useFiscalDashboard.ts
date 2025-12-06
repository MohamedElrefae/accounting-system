// ============================================
// FISCAL DASHBOARD HOOK - React Query
// Al-Baraka Construction Company
// ============================================

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase'
import type { FiscalDashboardSummary, FiscalYear, FiscalPeriod } from '../types'

// ============================================
// QUERY KEYS
// ============================================

export const fiscalDashboardKeys = {
  all: ['fiscalDashboard'] as const,
  summary: (orgId: string, fiscalYearId?: string) => 
    [...fiscalDashboardKeys.all, 'summary', orgId, fiscalYearId] as const,
}

// ============================================
// DASHBOARD HOOK
// ============================================

/**
 * Fetch fiscal dashboard summary
 * Combines data from multiple tables into a single summary
 */
export function useFiscalDashboard(orgId: string | null | undefined, fiscalYearId?: string | null) {
  return useQuery({
    queryKey: fiscalDashboardKeys.summary(orgId || '', fiscalYearId || undefined),
    queryFn: async (): Promise<FiscalDashboardSummary> => {
      if (!orgId) throw new Error('orgId required')

      // Get current fiscal year if not specified
      let targetYearId = fiscalYearId
      let currentYear: FiscalYear | null = null

      if (!targetYearId) {
        const { data: yearData } = await supabase
          .from('fiscal_years')
          .select('*')
          .eq('org_id', orgId)
          .eq('is_current', true)
          .single()

        if (yearData) {
          targetYearId = yearData.id
          currentYear = mapFiscalYear(yearData)
        }
      } else {
        const { data: yearData } = await supabase
          .from('fiscal_years')
          .select('*')
          .eq('id', targetYearId)
          .single()

        if (yearData) {
          currentYear = mapFiscalYear(yearData)
        }
      }

      // Get periods summary
      const { data: periods } = await supabase
        .from('fiscal_periods')
        .select('*')
        .eq('org_id', orgId)
        .eq('fiscal_year_id', targetYearId || '')

      const periodsOpen = periods?.filter(p => p.status === 'open').length || 0
      const periodsLocked = periods?.filter(p => p.status === 'locked').length || 0
      const periodsClosed = periods?.filter(p => p.status === 'closed').length || 0

      // Get current period
      const currentPeriodData = periods?.find(p => p.is_current)
      const currentPeriod = currentPeriodData ? mapFiscalPeriod(currentPeriodData) : null

      // Get imports count
      const { count: importsCount } = await supabase
        .from('opening_balance_imports')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('fiscal_year_id', targetYearId || '')

      // Get validation status
      let validationWarnings = 0
      let validationErrors = 0

      if (targetYearId) {
        try {
          const { data: validation } = await supabase.rpc('validate_opening_balances', {
            p_org_id: orgId,
            p_fiscal_year_id: targetYearId
          })

          if (validation) {
            validationWarnings = validation.warnings?.length || 0
            validationErrors = validation.errors?.length || 0
          }
        } catch {
          // Validation may fail if no balances exist - that's OK
        }
      }

      return {
        periodsOpen,
        periodsLocked,
        periodsClosed,
        importsCount: importsCount || 0,
        validationWarnings,
        validationErrors,
        currentPeriod,
        currentYear,
      }
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// ============================================
// HELPER MAPPERS
// ============================================

function mapFiscalYear(row: Record<string, unknown>): FiscalYear {
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

function mapFiscalPeriod(row: Record<string, unknown>): FiscalPeriod {
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
