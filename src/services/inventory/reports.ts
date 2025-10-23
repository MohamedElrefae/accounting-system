import { supabase } from '@/utils/supabase'

export type MovementDetailRow = {
  org_id: string
  material_id: string
  location_id: string
  project_id: string | null
  movement_date: string
  movement_type: string
  quantity: number
  unit_cost: number | null
  total_cost: number | null
  document_id: string | null
  document_line_id: string | null
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_at: string
}

export const InventoryMovementService = {
  async getDetail(filters: { org_id: string, material_id?: string, location_id?: string, project_id?: string, from?: string, to?: string, movement_types?: string[] }): Promise<MovementDetailRow[]> {
    let query = supabase.from('v_inv_movement_detail').select('*').eq('org_id', filters.org_id)
    if (filters.material_id) query = query.eq('material_id', filters.material_id)
    if (filters.location_id) query = query.eq('location_id', filters.location_id)
    if (filters.project_id) query = query.eq('project_id', filters.project_id)
    if (filters.from) query = query.gte('movement_date', filters.from)
    if (filters.to) query = query.lte('movement_date', filters.to)
    if (filters.movement_types && filters.movement_types.length > 0) query = query.in('movement_type', filters.movement_types)
    const { data, error } = await query.order('movement_date', { ascending: true })
    if (error) throw error
    return (data as MovementDetailRow[]) || []
  }
}

export type OnHandRow = {
  org_id: string
  material_id: string
  location_id: string
  project_id: string | null
  on_hand_qty: number
}

export type ValuationRow = {
  org_id: string
  material_id: string
  location_id: string
  project_id: string | null
  on_hand_qty: number
  method_used: 'STANDARD' | 'MOVING_AVERAGE' | 'LAST_PURCHASE' | 'LAST_PURCHASE_PLUS_PERCENT' | 'MANUAL'
  effective_unit_cost: number
  last_purchase_unit_cost: number | null
  moving_average_unit_cost: number | null
  standard_unit_cost: number | null
  extended_value: number
}

export type AgeingRow = {
  org_id: string
  material_id: string
  location_id: string
  project_id: string | null
  on_hand_qty: number
  last_inbound_at: string | null
  days_since_inbound: number
  ageing_bucket: string
}

export type MovementSummaryRow = {
  org_id: string
  material_id: string
  location_id: string
  project_id: string | null
  period_month: string
  qty_in: number
  qty_out: number
}

export const InventoryReportsService = {
  async getOnHand(): Promise<OnHandRow[]> {
    const { data, error } = await supabase
      .from('v_inv_stock_on_hand')
      .select('*')
    if (error) throw error
    return (data as OnHandRow[]) || []
  },

async getValuation(filters?: { org_id?: string, material_id?: string, location_id?: string, project_id?: string }): Promise<ValuationRow[]> {
    let query = supabase.from('inventory.v_inventory_valuation').select('*')
    if (filters?.org_id) query = query.eq('org_id', filters.org_id)
    if (filters?.material_id) query = query.eq('material_id', filters.material_id)
    if (filters?.location_id) query = query.eq('location_id', filters.location_id)
    if (filters?.project_id) query = query.eq('project_id', filters.project_id)
    const { data, error } = await query
    if (error) throw error
    return (data as ValuationRow[]) || []
  },

  async getAgeing(filters?: { org_id?: string, material_id?: string, location_id?: string, project_id?: string, min_days?: number, max_days?: number }): Promise<AgeingRow[]> {
    let query = supabase.from('v_inv_stock_ageing').select('*')
    if (filters?.org_id) query = query.eq('org_id', filters.org_id)
    if (filters?.material_id) query = query.eq('material_id', filters.material_id)
    if (filters?.location_id) query = query.eq('location_id', filters.location_id)
    if (filters?.project_id) query = query.eq('project_id', filters.project_id)
    if (filters?.min_days !== undefined) query = query.gte('days_since_inbound', filters.min_days)
    if (filters?.max_days !== undefined) query = query.lte('days_since_inbound', filters.max_days)
    const { data, error } = await query
    if (error) throw error
    return (data as AgeingRow[]) || []
  },

  async getMovementSummary(filters?: { org_id?: string, material_id?: string, location_id?: string, project_id?: string, from?: string, to?: string }): Promise<MovementSummaryRow[]> {
    let query = supabase.from('v_inv_movement_summary').select('*')
    if (filters?.org_id) query = query.eq('org_id', filters.org_id)
    if (filters?.material_id) query = query.eq('material_id', filters.material_id)
    if (filters?.location_id) query = query.eq('location_id', filters.location_id)
    if (filters?.project_id) query = query.eq('project_id', filters.project_id)
    if (filters?.from) query = query.gte('period_month', filters.from)
    if (filters?.to) query = query.lte('period_month', filters.to)
    const { data, error } = await query
    if (error) throw error
    return (data as MovementSummaryRow[]) || []
  }
}