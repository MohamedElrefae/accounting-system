// src/services/transaction-line-items.ts
// Service for managing transaction line items with adjustment support

import { supabase } from '../utils/supabase'

export interface TransactionLineItem {
  id: string
  transaction_line_id: string
  line_number: number
  line_item_id: string
  quantity: number
  percentage: number
  unit_price: number
  unit_of_measure: string
  deduction_percentage: number | null
  addition_percentage: number | null
  deduction_amount: number
  addition_amount: number
  net_amount: number
  org_id: string
  created_at: string
  updated_at: string
}

export interface TransactionLineItemCreate {
  transaction_line_id: string
  line_item_id: string
  line_number?: number
  quantity: number
  percentage: number
  unit_price: number
  unit_of_measure: string
  deduction_percentage?: number
  addition_percentage?: number
}

export interface TransactionLineItemUpdate {
  id?: string
  quantity?: number
  percentage?: number
  unit_price?: number
  unit_of_measure?: string
  deduction_percentage?: number
  addition_percentage?: number
}

export interface TransactionLineItemWithAdjustment extends TransactionLineItem {
  item_code?: string
  item_name?: string
  item_name_ar?: string
  transaction_description?: string
  project_name?: string
  cost_center_name?: string
  work_item_name?: string
  analysis_work_item_name?: string
  classification_name?: string
  classification_code?: string
  sub_tree_code?: string
  sub_tree_name?: string
}

/**
 * Get transaction line items for a specific transaction
 */
export async function getTransactionLineItems(transactionLineId: string): Promise<TransactionLineItem[]> {
  if (transactionLineId.startsWith('temp_')) {
    return []
  }

  const { data, error } = await supabase
    .from('transaction_line_items')
    .select('*')
    .eq('transaction_line_id', transactionLineId)
    .order('line_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch transaction line items: ${error.message}`)
  }

  return data || []
}

/**
 * Get transaction line items with adjustments for an organization
 */
export async function getTransactionLineItemsWithAdjustments(orgId: string): Promise<TransactionLineItemWithAdjustment[]> {
  const { data, error } = await supabase
    .from('v_transaction_line_items_report')
    .select('*')
    .eq('org_id', orgId)
    .order('line_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch transaction line items: ${error.message}`)
  }

  return data || []
}

/**
 * Create a new transaction line item
 */
export async function createTransactionLineItem(item: TransactionLineItemCreate): Promise<TransactionLineItem> {
  const { data, error } = await supabase
    .from('transaction_line_items')
    .insert([{
      transaction_line_id: item.transaction_line_id,
      line_item_id: item.line_item_id,
      line_number: item.line_number || 1,
      quantity: item.quantity,
      percentage: item.percentage,
      unit_price: item.unit_price,
      unit_of_measure: item.unit_of_measure,
      deduction_percentage: item.deduction_percentage,
      addition_percentage: item.addition_percentage
    }])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create transaction line item: ${error.message}`)
  }

  return data
}

/**
 * Update an existing transaction line item
 */
export async function updateTransactionLineItem(id: string, updates: TransactionLineItemUpdate): Promise<TransactionLineItem> {
  const { data, error } = await supabase
    .from('transaction_line_items')
    .update({
      quantity: updates.quantity,
      percentage: updates.percentage,
      unit_price: updates.unit_price,
      unit_of_measure: updates.unit_of_measure,
      deduction_percentage: updates.deduction_percentage,
      addition_percentage: updates.addition_percentage,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update transaction line item: ${error.message}`)
  }

  return data
}

/**
 * Delete a transaction line item
 */
export async function deleteTransactionLineItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('transaction_line_items')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete transaction line item: ${error.message}`)
  }
}

/**
 * Get available line items from catalog
 */
export async function getLineItemCatalog(orgId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('line_items')
    .select('id, code, name, name_ar, base_unit_of_measure, standard_cost')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch line item catalog: ${error.message}`)
  }

  return data || []
}

/**
 * Apply adjustment percentages to transaction line items
 */
export async function applyAdjustmentToTransactionLineItems(
  transactionLineId: string,
  deductionPercentage?: number,
  additionPercentage?: number
): Promise<void> {
  const { error } = await supabase.rpc('apply_adjustments_to_transaction_lines', {
    transaction_line_id: transactionLineId,
    deduction_percentage: deductionPercentage,
    addition_percentage: additionPercentage
  })

  if (error) {
    throw new Error(`Failed to apply adjustments: ${error.message}`)
  }
}

/**
 * Calculate line totals for a transaction
 */
export async function calculateTransactionLineTotals(transactionLineId: string): Promise<{
    total_amount: number
    total_deduction: number
    total_addition: number
    total_net: number
  }> {
  const { data, error } = await supabase.rpc('calculate_transaction_line_totals', {
    p_transaction_line_id: transactionLineId
  })

  if (error) {
    throw new Error(`Failed to calculate totals: ${error.message}`)
  }

  return data
}

/**
 * Get adjustment types for selection dropdown
 */
export async function getAdjustmentTypesForDropdown(orgId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('adjustment_types')
    .select('id, code, name, default_percentage')
    .eq('org_id', orgId)
    .order('code', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch adjustment types: ${error.message}`)
  }

  return data || []
}

/**
 * Check if a transaction line is editable (status = 'draft')
 */
export async function canEditTransactionLine(transactionLineId: string): Promise<boolean> {
  // Offline/temporary lines are always editable drafts
  if (transactionLineId.startsWith('temp_')) {
    return true
  }

  const { data, error } = await supabase.rpc('can_edit_transaction_line', {
    p_line_id: transactionLineId
  })
  
  if (error) {
    console.error('Error checking if line is editable:', error)
    return false
  }
  
  return !!data
}

/**
 * Atomically replace all line items for a transaction line
 */
export async function replaceLineItems(transactionLineId: string, items: any[]): Promise<any> {
  const cleanItems = items.map(item => ({
    ...item,
    line_item_id: item.line_item_id === "" ? null : item.line_item_id
  }));

  const { data, error } = await supabase.rpc('replace_line_items_atomic', {
    p_transaction_line_id: transactionLineId,
    p_items: cleanItems
  })
  
  if (error) {
    throw new Error(`Failed to save line items: ${error.message}`)
  }
  
  return data
}

/**
 * Gets count of line items for a list of transaction line IDs
 * Used for displaying badges in the wizard
 */
export async function getTransactionLineItemCounts(lineIds: string[]): Promise<Record<string, number>> {
  if (lineIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('transaction_line_items')
    .select('transaction_line_id')
    .in('transaction_line_id', lineIds);

  if (error) {
    console.error('Error fetching line item counts:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  data.forEach(item => {
    counts[item.transaction_line_id] = (counts[item.transaction_line_id] || 0) + 1;
  });
  
  return counts;
}

/**
 * Calculate totals strictly for UI side
 */
export function calculateTotals(items: TransactionLineItem[]): { grossTotal: number, totalDeductions: number, totalAdditions: number, netTotal: number } {
  let grossTotal = 0
  let totalDeductions = 0
  let totalAdditions = 0

  items.forEach(item => {
    // 1. Calculate Base Value = quantity * unit_price
    const baseValue = (item.quantity || 0) * (item.unit_price || 0)
    
    // 2. Adjust for percentage share (if applicable) - fallback to 100%
    const sharePercentage = typeof item.percentage === 'number' ? item.percentage : 100
    const itemGross = baseValue * (sharePercentage / 100)
    
    grossTotal += itemGross
    
    // 3. Calculate Deductions & Additions on the item gross
    if (item.deduction_percentage) {
      totalDeductions += itemGross * (item.deduction_percentage / 100)
    }
    
    if (item.addition_percentage) {
      totalAdditions += Math.abs(itemGross * (item.addition_percentage / 100))
    }
  })

  // 4. Calculate final net total
  const netTotal = grossTotal - totalDeductions + totalAdditions

  return { grossTotal, totalDeductions, totalAdditions, netTotal }
}

import { enqueueOperation } from './offline/sync/SyncQueueManager'

// ... existing interfaces ...

/**
 * Queue line items for background sync when offline
 */
export async function queueLineItemsForSync(transactionLineId: string, items: any[]): Promise<any> {
  return enqueueOperation({
    id: crypto.randomUUID(),
    type: 'UPDATE',
    entityType: 'transaction_line_items',
    entityId: transactionLineId,
    data: { 
      transaction_line_id: transactionLineId, 
      items 
    },
    timestamp: new Date().toISOString(),
    userId: 'TODO_USER_ID', // Usually from auth context
    deviceId: 'TODO_DEVICE_ID',
    vectorClock: {},
    dependencies: [],
    checksum: ''
  })
}

/**
 * Validate a single line item before saving
 */
export function validateLineItem(item: any): string[] {
  const errors: string[] = []
  
  if (!item.line_item_id) errors.push('Item selection is required')
  // Negative values allowed as per Amendment #4
  if (item.quantity === undefined || item.quantity === null || isNaN(Number(item.quantity))) {
    errors.push('Quantity is required')
  }
  if (item.unit_price === undefined || item.unit_price === null || isNaN(Number(item.unit_price))) {
    errors.push('Price is required')
  }
  if (item.percentage !== undefined && (item.percentage < 0 || item.percentage > 100)) {
    errors.push('Percentage must be between 0 and 100')
  }
  
  return errors
}

/**
 * Format currency for UI
 */
export function formatCurrency(amount: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format numbers for UI
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}
