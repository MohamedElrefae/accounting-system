import { supabase } from '@/utils/supabase'

// Construction progress integration service
export class ConstructionProgressIntegration {
  static async linkFiscalPeriodToConstructionPhase(periodId: string, projectId: string, phaseData: any) {
    // Placeholder for future insert/upsert into construction_phase_progress
    return { ok: true }
  }
  static async updateConstructionProgress(projectId: string, periodId: string, progressData: any) {
    return { ok: true }
  }
  static async validateProgressAlignment(periodId: string, projectId: string) {
    return { ok: true, issues: [] }
  }
  static async calculateWIPBalances(periodId: string, projectId: string) {
    return { ok: true, wip: [] }
  }

  static async getPhaseProgress(orgId: string, projectId?: string | null, periodId?: string | null) {
    let q = supabase
      .from('construction_phase_progress')
      .select('phase,physical_percent,financial_percent')
      .eq('org_id', orgId)
    if (projectId) q = q.eq('project_id', projectId)
    if (periodId) q = q.eq('fiscal_period_id', periodId)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map((r: any) => ({
      phase: r.phase as string,
      physical: Number(r.physical_percent || 0),
      financial: Number(r.financial_percent || 0),
    }))
  }
}
