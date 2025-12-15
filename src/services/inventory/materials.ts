import { supabase } from '@/utils/supabase'

export interface MaterialRow {
  id: string
  org_id: string
  material_code: string
  material_name: string
  material_name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  category_id?: string | null
  analysis_work_item_id?: string | null
  work_item_id?: string | null
  default_cost_center_id?: string | null
  is_material_for_analysis: boolean
  base_uom_id: string
  material_type: string
  standard_cost?: number | null
  minimum_stock_level?: number | null
  reorder_point?: number | null
  reorder_quantity?: number | null
  is_active: boolean
  is_trackable: boolean
  valuation_method: string
  created_at: string
  updated_at: string
  created_by?: string | null
}

export async function listMaterials(orgId: string): Promise<MaterialRow[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('org_id', orgId)
    .order('material_code', { ascending: true })
  if (error) throw error
  return (data || []) as MaterialRow[]
}

export async function createMaterial(payload: Partial<MaterialRow> & { org_id: string; material_code: string; material_name: string; base_uom_id: string }): Promise<MaterialRow> {
  const { data, error } = await supabase
    .from('materials')
    .insert({ ...payload })
    .select('*')
    .single()
  if (error) throw error
  return data as MaterialRow
}

export async function updateMaterial(id: string, updates: Partial<MaterialRow>): Promise<MaterialRow> {
  const { data, error } = await supabase
    .from('materials')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as MaterialRow
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id)
  if (error) throw error
}