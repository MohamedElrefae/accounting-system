import { supabase } from '@/utils/supabase'

export type MovementType =
  | 'receipt'
  | 'issue'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjust_increase'
  | 'adjust_decrease'
  | 'return_to_vendor'
  | 'return_from_project'

export interface SetGLMappingByCodeParams {
  orgId: string
  movementType: MovementType
  debitCode: string
  creditCode: string
  priority?: number
  isActive?: boolean
  notes?: string | null
}

export async function setGLMappingByCode(params: SetGLMappingByCodeParams): Promise<{ success: boolean; error?: string | null }>{
  const { orgId, movementType, debitCode, creditCode, priority = 10, isActive = true, notes = null } = params
  const { error } = await supabase.rpc('inventory_set_gl_mapping_by_code', {
    p_org_id: orgId,
    p_movement_type: movementType,
    p_debit_code: debitCode,
    p_credit_code: creditCode,
    p_priority: priority,
    p_is_active: isActive,
    p_notes: notes,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}