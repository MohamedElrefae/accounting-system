import { supabase } from '../utils/supabase'

export interface CatalogItem {
  id: string
  org_id: string
  code: string
  name: string
  name_ar?: string | null
  parent_id?: string | null
  level: number
  path: string
  is_selectable: boolean
  item_type?: 'material' | 'service' | 'equipment' | 'labor'
  specifications?: any
  base_unit_of_measure?: string | null
  standard_cost?: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface CatalogSelectorItem {
  id: string
  item_code: string
  item_name: string
  item_name_ar?: string
  parent_id?: string | null
  unit_of_measure?: string | null
  unit_price?: number
  is_active: boolean
}

class LineItemsCatalogService {
  async list(orgId: string, includeInactive = false): Promise<CatalogItem[]> {
    // Use the safe view exclusively to avoid PostgREST recursion on the table/RPC
    const selectCols = [
      'id', 'org_id', 'code', 'name', 'name_ar', 'parent_id', 'level', 'path',
      'is_selectable', 'item_type', 'specifications', 'base_unit_of_measure',
      'standard_cost', 'is_active', 'created_at', 'updated_at'
    ].join(', ')

    let q = supabase
      .from('v_line_items_browse')
      .select(selectCols)
      .eq('org_id', orgId)
      .order('path', { ascending: true })

    if (!includeInactive) {
      q = q.eq('is_active', true)
    }

    const { data, error } = await q
    if (error) throw error
    return (data || []) as CatalogItem[]
  }

  async tree(orgId: string, includeInactive = false): Promise<CatalogItem[]> {
    // Client builds tree grouped by parent_id; return flat list for now
    return this.list(orgId, includeInactive)
  }

  async create(orgId: string, payload: Partial<CatalogItem>): Promise<CatalogItem> {
    const { data, error } = await supabase
      .from('line_items')
      .insert([{
        org_id: orgId,
        code: payload.code!,
        name: payload.name!,
        name_ar: payload.name_ar ?? null,
        parent_id: payload.parent_id ?? null,
        is_selectable: payload.is_selectable ?? false,
        item_type: payload.item_type ?? null,
        specifications: payload.specifications ?? null,
        base_unit_of_measure: payload.base_unit_of_measure ?? null,
        standard_cost: payload.standard_cost ?? null,
        is_active: payload.is_active ?? true,
      }])
      .select()
      .single()
    if (error) throw error
    return data as CatalogItem
  }

  async update(id: string, orgId: string, updates: Partial<CatalogItem>): Promise<CatalogItem> {
    const { data, error } = await supabase
      .from('line_items')
      .update({
        code: updates.code,
        name: updates.name,
        name_ar: updates.name_ar,
        parent_id: updates.parent_id,
        is_selectable: updates.is_selectable,
        item_type: updates.item_type,
        specifications: updates.specifications,
        base_unit_of_measure: updates.base_unit_of_measure,
        standard_cost: updates.standard_cost,
        is_active: updates.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()
    if (error) throw error
    return data as CatalogItem
  }

  async remove(id: string, orgId: string): Promise<void> {
    // Guard: prevent delete if used by transaction_line_items
    const { count, error: cErr } = await supabase
      .from('transaction_line_items')
      .select('*', { head: true, count: 'exact' })
      .eq('line_item_id', id)
    if (cErr) throw cErr
    if ((count || 0) > 0) {
      throw new Error('Cannot delete: item is used in transactions')
    }

    const { error } = await supabase
      .from('line_items')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)
    if (error) throw error
  }

  async getNextCode(orgId: string, parentId?: string | null): Promise<string> {
    // Numeric 4-digit hierarchy: 1000 -> 1100 -> 1110 -> 1111
    if (!parentId) {
      const { data, error } = await supabase
        .from('line_items')
        .select('code')
        .eq('org_id', orgId)
        .is('parent_id', null)
        .order('code', { ascending: false })
        .limit(1)
      if (error) throw error
      const max = data?.[0]?.code
      if (max && /^\d{4}$/.test(max)) return (parseInt(max, 10) + 1000).toString()
      return '1000'
    }

    // Child: choose increment based on parent code granularity
    const { data: parent, error: pErr } = await supabase
      .from('line_items')
      .select('code')
      .eq('id', parentId)
      .single()
    if (pErr) throw pErr
    const pCode = parent?.code || '1000'

    let step = 100
    if (/^\d{4}$/.test(pCode)) {
      const n = parseInt(pCode, 10)
      if (n % 1000 === 0) step = 100
      else if (n % 100 === 0) step = 10
      else step = 1
      const { data: children, error: cErr } = await supabase
        .from('line_items')
        .select('code')
        .eq('parent_id', parentId)
        .order('code', { ascending: false })
        .limit(1)
      if (cErr) throw cErr
      const maxChild = children?.[0]?.code
      if (maxChild && /^\d{4}$/.test(maxChild)) return (parseInt(maxChild, 10) + step).toString()
      return (Math.floor(parseInt(pCode, 10) / step) * step + step).toString()
    }

    // Non-numeric parent: fallback to dash pattern
    const { data: dashChildren } = await supabase
      .from('line_items')
      .select('code')
      .eq('parent_id', parentId)
    const next = (dashChildren || [])
      .map(r => r.code)
      .filter((c): c is string => !!c && c.startsWith(pCode + '-'))
      .map(c => Number(c.split('-').pop()))
      .filter(n => Number.isFinite(n))
    const max = next.length ? Math.max(...next) : 0
    return `${pCode}-${max + 1}`
  }

  async toSelectorItems(orgId: string): Promise<CatalogSelectorItem[]> {
    const items = await this.list(orgId, false)
    return items.map(i => ({
      id: i.id,
      item_code: i.code,
      item_name: i.name,
      item_name_ar: i.name_ar || undefined,
      parent_id: i.parent_id ?? null,
      unit_of_measure: i.base_unit_of_measure ?? null,
      unit_price: i.standard_cost ?? 0,
      is_active: i.is_active,
    }))
  }
}

export const lineItemsCatalogService = new LineItemsCatalogService()
