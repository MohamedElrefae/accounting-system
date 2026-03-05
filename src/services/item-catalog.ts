// src/services/item-catalog.ts
// Service to fetch and manage item catalog for cost analysis

import { supabase } from '../utils/supabase'

export interface ItemCatalogItem {
  id: string
  code: string
  name: string
  name_ar?: string
  description?: string
}

/**
 * Fetch all items from the line_items catalog table
 * Used to populate the Item selector in CostAnalysisModal
 */
export async function getItemCatalog(orgId: string): Promise<Record<string, ItemCatalogItem>> {
  try {
    const { data, error } = await supabase
      .from('line_items')
      .select('id, code, name, name_ar, description')
      .eq('org_id', orgId)
      .order('code', { ascending: true })

    if (error) throw error

    // Convert array to Record<id, item> for easy lookup
    const catalog: Record<string, ItemCatalogItem> = {}
    if (data) {
      data.forEach((item: any) => {
        catalog[item.id] = {
          id: item.id,
          code: item.code,
          name: item.name,
          name_ar: item.name_ar,
          description: item.description,
        }
      })
    }

    return catalog
  } catch (e) {
    console.error('Failed to fetch item catalog:', e)
    return {}
  }
}

/**
 * Fetch a single item from the catalog by ID
 */
export async function getItemCatalogItem(itemId: string): Promise<ItemCatalogItem | null> {
  try {
    const { data, error } = await supabase
      .from('line_items')
      .select('id, code, name, name_ar, description')
      .eq('id', itemId)
      .single()

    if (error) throw error
    return data as ItemCatalogItem
  } catch (e) {
    console.error('Failed to fetch item catalog item:', e)
    return null
  }
}
