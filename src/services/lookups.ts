import { supabase } from '../utils/supabase'

export interface LookupOption {
  id: string
  code?: string | null
  name: string
  name_ar?: string | null
  category?: string | null
  normal_balance?: string | null
}

export async function fetchOrganizations(): Promise<LookupOption[]> {
  // Try full selection first; fall back to minimal columns if REST errors
  let data: any[] | null = null
  let error: any = null
  try {
    const res = await supabase
      .from('organizations')
      .select('id, code, name, name_ar')
      .order('code', { ascending: true })
    data = res.data as any[] | null
    error = res.error
  } catch (e) {
    error = e
  }
  if (error) {
    try {
      const res2 = await supabase
        .from('organizations')
        .select('id, name')
        .order('name', { ascending: true })
      data = res2.data as any[] | null
      error = res2.error
    } catch {}
  }
  if (error) return []
  return (data || []).map((r: any) => ({ id: r.id, code: (r as any).code ?? null, name: r.name ?? (r as any).name_ar ?? '', name_ar: (r as any).name_ar ?? null }))
}

export async function fetchProjects(): Promise<LookupOption[]> {
  // Try full selection first; fall back to minimal columns if REST errors
  let data: any[] | null = null
  let error: any = null
  try {
    const res = await supabase
      .from('projects')
      .select('id, code, name, name_ar')
      .order('code', { ascending: true })
    data = res.data as any[] | null
    error = res.error
  } catch (e) {
    error = e
  }
  if (error) {
    try {
      const res2 = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true })
      data = res2.data as any[] | null
      error = res2.error
    } catch {}
  }
  if (error) return []
  return (data || []).map((r: any) => ({ id: r.id, code: (r as any).code ?? null, name: r.name ?? (r as any).name_ar ?? '', name_ar: (r as any).name_ar ?? null }))
}

export async function fetchAccountsMinimal(): Promise<LookupOption[]> {
  // Align with schema: use status (enum account_status) and available columns only
  let data: any[] | null = null
  let error: any = null
  try {
    const res = await supabase
      .from('accounts')
      .select('id, code, name, name_ar, status, category, normal_balance')
      .eq('status', 'active')
      .order('code', { ascending: true })
    data = res.data as any[] | null
    error = res.error
  } catch (e) {
    error = e
  }
  // Fallback to minimal selection without status if some instances lack the column
  if (error) {
    try {
      const res2 = await supabase
        .from('accounts')
        .select('id, code, name, name_ar')
        .order('code', { ascending: true })
      data = res2.data as any[] | null
      error = res2.error
    } catch {}
  }
  if (error) return []
  return (data || []).map((r: any) => ({ id: r.id, code: r.code ?? null, name: r.name ?? r.name_ar ?? '', name_ar: r.name_ar ?? null, category: r.category ?? null, normal_balance: r.normal_balance ?? null }))
}
