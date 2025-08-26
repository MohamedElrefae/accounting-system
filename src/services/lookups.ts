import { supabase } from '../utils/supabase'

export interface LookupOption {
  id: string
  code?: string | null
  name: string
  name_ar?: string | null
}

export async function fetchOrganizations(): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, code, name, name_ar')
    .order('code', { ascending: true })
  if (error) return []
  return (data || []).map((r: any) => ({ id: r.id, code: r.code ?? null, name: r.name ?? r.name_ar ?? '', name_ar: r.name_ar ?? null }))
}

export async function fetchProjects(): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, code, name, name_ar')
    .order('code', { ascending: true })
  if (error) return []
  return (data || []).map((r: any) => ({ id: r.id, code: r.code ?? null, name: r.name ?? r.name_ar ?? '', name_ar: r.name_ar ?? null }))
}

export async function fetchAccountsMinimal(): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, code, name, name_ar')
    .order('code', { ascending: true })
  if (error) return []
  return (data || []).map((r: any) => ({ id: r.id, code: r.code ?? null, name: r.name ?? r.name_ar ?? '', name_ar: r.name_ar ?? null }))
}
