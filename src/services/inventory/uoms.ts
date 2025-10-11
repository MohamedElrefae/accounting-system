import { supabase } from '@/utils/supabase'

export interface UomRow {
  id: string
  org_id: string
  code: string
  name: string
  name_ar?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function listUOMs(orgId: string): Promise<UomRow[]> {
  const { data, error } = await supabase
    .from('uoms')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('code', { ascending: true })
  if (error) throw error
  return (data || []) as UomRow[]
}