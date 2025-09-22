import { supabase } from '@/utils/supabase'

// Construction cost allocation service
export class ConstructionCostAllocation {
  static async allocateDirectCosts(transactionId: string, allocationRules: any) {
    return { ok: true }
  }
  static async calculateOverheadAllocation(periodId: string, projectIds: string[]) {
    return { ok: true, details: [] }
  }
  static async manageProcurementCosts(periodId: string, procurementData: any) {
    return { ok: true }
  }
  static async handleSubcontractorPayments(periodId: string, subcontractorId: string) {
    return { ok: true }
  }

  static async listSubcontractors(orgId: string, projectId?: string | null) {
    let q = supabase
      .from('subcontractor_progress')
      .select('subcontractor_name,progress_percent,retention_percent,issues_count')
      .eq('org_id', orgId)
    if (projectId) q = q.eq('project_id', projectId)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map((r: any) => ({
      name: r.subcontractor_name as string,
      progress: Number(r.progress_percent || 0),
      retention: Number(r.retention_percent || 0),
      issues: Number(r.issues_count || 0),
    }))
  }

  static async listMaterials(orgId: string, projectId?: string | null) {
    let q = supabase
      .from('materials_summary')
      .select('material_name,stock,usage,variance')
      .eq('org_id', orgId)
    if (projectId) q = q.eq('project_id', projectId)
    const { data, error } = await q
    if (error) throw error
    return (data || []).map((r: any) => ({
      name: r.material_name as string,
      stock: Number(r.stock || 0),
      usage: Number(r.usage || 0),
      variance: typeof r.variance === 'number' ? Number(r.variance) : undefined,
    }))
  }

  // Compute monthly actuals from transactions within range [from,to]
  static async listMonthlyActuals(orgId: string, projectId?: string | null, from?: string, to?: string) {
    let q = supabase
      .from('transactions')
      .select('entry_date,amount,project_id')
      .eq('org_id', orgId)
    if (projectId) q = q.eq('project_id', projectId)
    if (from) q = q.gte('entry_date', from)
    if (to) q = q.lte('entry_date', to)
    const { data, error } = await q
    if (error) throw error
    const map = new Map<string, number>()
    for (const r of data || []) {
      const d = new Date(r.entry_date)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      const amt = Number(r.amount || 0)
      map.set(key, (map.get(key) || 0) + amt)
    }
    // sort by key
    const periods = Array.from(map.entries()).sort((a,b) => a[0] < b[0] ? -1 : 1)
    return periods.map(([period, actual]) => ({ period, budget: 0, actual }))
  }
}
