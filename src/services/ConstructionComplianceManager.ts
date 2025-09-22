import { supabase } from '@/utils/supabase'

// Construction compliance manager service
export class ConstructionComplianceManager {
  static async validateConstructionPermits(projectId: string, periodId: string) {
    return { ok: true }
  }
  static async manageSafetyCompliance(periodId: string, projectIds: string[]) {
    return { ok: true }
  }
  static async handleQualityControl(periodId: string, phaseId: string) {
    return { ok: true }
  }
  static async manageInsuranceAndBonding(periodId: string, projectId: string) {
    return { ok: true }
  }

  static async listCompliance(orgId: string, projectId?: string | null) {
    let q = supabase
      .from('construction_compliance_items')
      .select('name,status,details')
      .eq('org_id', orgId)
    if (projectId) q = q.eq('project_id', projectId)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map((r: any) => ({ name: r.name, status: r.status, details: r.details }))
  }
}
