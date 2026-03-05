// src/services/adjustment-types.ts
// Service for managing adjustment types (deductions and additions)

import { supabase } from '../utils/supabase'

export interface AdjustmentType {
  id?: string
  code: string
  name: string
  name_ar?: string
  default_percentage: number // 0.05 = 5%, 0.14 = 14%
  org_id: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface AdjustmentTypeWithUsage extends AdjustmentType {
  usage_count?: number
}

/**
 * Fetch all adjustment types for an organization
 */
export async function getAdjustmentTypes(orgId: string): Promise<AdjustmentType[]> {
  const { data, error } = await supabase
    .from('adjustment_types')
    .select('*')
    .eq('org_id', orgId)
    .order('code', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Fetch adjustment types with usage statistics
 */
export async function getAdjustmentTypesWithUsage(orgId: string): Promise<AdjustmentTypeWithUsage[]> {
  // First get adjustment types
  const adjustmentTypes = await getAdjustmentTypes(orgId)
  
  // For each type, count usage using the reporting view which includes org_id
  const typesWithUsage = await Promise.all(
    adjustmentTypes.map(async (type) => {
      try {
        // Count deduction usage via reporting view
        const { count: deductionCount } = await supabase
          .from('v_transaction_line_items_report')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('deduction_percentage', type.default_percentage)

        // Count addition usage via reporting view
        const { count: additionCount } = await supabase
          .from('v_transaction_line_items_report')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('addition_percentage', type.default_percentage)

        return {
          ...type,
          usage_count: (deductionCount || 0) + (additionCount || 0)
        }
      } catch (error) {
        console.warn(`Failed to get usage stats for adjustment type ${type.code}:`, error)
        return {
          ...type,
          usage_count: 0
        }
      }
    })
  )

  return typesWithUsage
}

/**
 * Get a single adjustment type by ID
 */
export async function getAdjustmentType(id: string): Promise<AdjustmentType> {
  const { data, error } = await supabase
    .from('adjustment_types')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Get adjustment type by code and organization
 */
export async function getAdjustmentTypeByCode(orgId: string, code: string): Promise<AdjustmentType | null> {
  const { data, error } = await supabase
    .from('adjustment_types')
    .select('*')
    .eq('org_id', orgId)
    .eq('code', code)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data
}

/**
 * Create a new adjustment type
 */
export async function createAdjustmentType(adjustmentType: Omit<AdjustmentType, 'id' | 'created_at' | 'updated_at'>): Promise<AdjustmentType> {
  const { data, error } = await supabase
    .from('adjustment_types')
    .insert([adjustmentType])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an existing adjustment type
 */
export async function updateAdjustmentType(id: string, updates: Partial<Omit<AdjustmentType, 'id' | 'created_at' | 'org_id'>>): Promise<AdjustmentType> {
  const { data, error } = await supabase
    .from('adjustment_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete an adjustment type
 */
export async function deleteAdjustmentType(id: string): Promise<void> {
  const { error } = await supabase
    .from('adjustment_types')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Validate adjustment type data
 */
export function validateAdjustmentType(adjustmentType: Partial<AdjustmentType>): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  if (!adjustmentType.code || adjustmentType.code.trim().length === 0) {
    errors.push('Code is required')
  } else if (adjustmentType.code && !/^[A-Z0-9-_]+$/.test(adjustmentType.code)) {
    errors.push('Code must contain only uppercase letters, numbers, hyphens, and underscores')
  }

  if (!adjustmentType.name || adjustmentType.name.trim().length === 0) {
    errors.push('Name is required')
  }

  if (adjustmentType.default_percentage === undefined || adjustmentType.default_percentage === null) {
    errors.push('Default percentage is required')
  } else if (adjustmentType.default_percentage < 0 || adjustmentType.default_percentage > 1) {
    errors.push('Default percentage must be between 0 and 1 (e.g., 0.05 for 5%)')
  }

  if (!adjustmentType.org_id) {
    errors.push('Organization ID is required')
  }

  return { ok: errors.length === 0, errors }
}

/**
 * Format percentage for display (e.g., 0.05 -> "5%")
 */
export function formatPercentage(percentage: number): string {
  return `${(percentage * 100).toFixed(2)}%`
}

/**
 * Parse percentage from display format (e.g., "5%" -> 0.05)
 */
export function parsePercentage(displayValue: string): number {
  const cleanValue = displayValue.replace('%', '').trim()
  const parsed = parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : parsed / 100
}

/**
 * Get default adjustment types for Egyptian construction accounting
 */
export function getDefaultAdjustmentTypes(orgId: string): Omit<AdjustmentType, 'id' | 'created_at' | 'updated_at'>[] {
  return [
    {
      code: 'RET-5',
      name: 'Retention 5%',
      name_ar: 'استبقاء ٥٪',
      default_percentage: 0.05,
      org_id: orgId,
      description: 'Standard 5% retention deduction'
    },
    {
      code: 'VAT-14',
      name: 'VAT 14%',
      name_ar: 'ضريبة القيمة المضافة ١٤٪',
      default_percentage: 0.14,
      org_id: orgId,
      description: 'Egypt standard VAT 14% addition'
    }
  ]
}

/**
 * Seed default adjustment types for an organization
 */
export async function seedDefaultAdjustmentTypes(orgId: string): Promise<AdjustmentType[]> {
  const defaults = getDefaultAdjustmentTypes(orgId)
  const results: AdjustmentType[] = []

  for (const adjustmentType of defaults) {
    try {
      // Check if already exists
      const existing = await getAdjustmentTypeByCode(orgId, adjustmentType.code)
      if (!existing) {
        const created = await createAdjustmentType(adjustmentType)
        results.push(created)
      } else {
        results.push(existing)
      }
    } catch (error) {
      console.warn(`Failed to seed adjustment type ${adjustmentType.code}:`, error)
    }
  }

  return results
}
