import { supabase } from '@/utils/supabase'

export interface InventoryLocationRow {
  id: string
  org_id: string
  location_code: string
  location_name: string
  location_name_ar?: string | null
  location_type: string
  parent_location_id?: string | null
  project_id?: string | null
  cost_center_id?: string | null
  address?: string | null
  contact_person?: string | null
  phone?: string | null
  is_main_location: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string | null
}

export async function listInventoryLocations(orgId: string): Promise<InventoryLocationRow[]> {
  const { data, error } = await supabase
    .from('inventory_locations')
    .select('*')
    .eq('org_id', orgId)
    .order('location_code', { ascending: true })
  if (error) throw error
  return (data || []) as InventoryLocationRow[]
}

export async function createInventoryLocation(payload: Partial<InventoryLocationRow> & { org_id: string; location_code: string; location_name: string }): Promise<InventoryLocationRow> {
  const { data, error } = await supabase
    .from('inventory_locations')
    .insert({ ...payload })
    .select('*')
    .single()
  if (error) throw error
  return data as InventoryLocationRow
}

export async function updateInventoryLocation(id: string, updates: Partial<InventoryLocationRow>): Promise<InventoryLocationRow> {
  const { data, error } = await supabase
    .from('inventory_locations')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as InventoryLocationRow
}

export async function deleteInventoryLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_locations')
    .delete()
    .eq('id', id)
  if (error) throw error
}