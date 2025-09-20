/**
 * 🚀 ENHANCED TRANSACTION LINE ITEMS API
 * ======================================
 * 
 * Frontend wrapper for the new optimized database functions.
 * Provides a clean, type-safe interface to the JSONB API.
 */

import { supabase } from '../utils/supabase'

export interface TransactionLineItemData {
  id?: string
  transaction_id: string
  line_number?: number
  item_code?: string | null
  item_name?: string | null
  item_name_ar?: string | null
  description?: string | null
  description_ar?: string | null
  quantity: number
  percentage?: number
  unit_price: number
  discount_amount?: number
  tax_amount?: number
  unit_of_measure?: string | null
  analysis_work_item_id?: string | null
  sub_tree_id?: string | null
  line_item_id?: string | null
  org_id?: string | null
}

export interface TransactionLineItemsResponse {
  transaction_id: string
  items: TransactionLineItemData[]
  summary: {
    total_items: number
    total_amount: number
    last_updated: string
  }
}

export interface ValidationResult {
  transaction_id: string
  validation_results: Array<{
    line_item_id: string
    line_number: number
    calculated_total: number
    stored_total: number
    is_accurate: boolean
  }>
  summary: {
    total_items: number
    accurate_items: number
    inaccurate_items: number
  }
}

export class TransactionLineItemsAPI {
  /**
   * Create or update a transaction line item using the enhanced database function
   */
  async upsert(itemData: TransactionLineItemData): Promise<TransactionLineItemData> {
    const { data, error } = await supabase
      .rpc('fn_transaction_line_item_upsert', { 
        p_data: itemData 
      })
    
    if (error) {
      console.error('❌ Failed to upsert transaction line item:', error)
      throw new Error(`Failed to save line item: ${error.message}`)
    }
    
    return data as TransactionLineItemData
  }

  /**
   * Bulk upsert multiple line items
   */
  async upsertMany(transactionId: string, items: TransactionLineItemData[]): Promise<TransactionLineItemData[]> {
    const results: TransactionLineItemData[] = []
    
    for (const item of items) {
      const itemWithTxId = { ...item, transaction_id: transactionId }
      const result = await this.upsert(itemWithTxId)
      results.push(result)
    }
    
    return results
  }

  /**
   * Get all line items for a transaction with summary
   */
  async getByTransaction(transactionId: string): Promise<TransactionLineItemsResponse> {
    const { data, error } = await supabase
      .rpc('fn_transaction_line_items_get', { 
        p_transaction_id: transactionId 
      })
    
    if (error) {
      console.error('❌ Failed to fetch transaction line items:', error)
      throw new Error(`Failed to load line items: ${error.message}`)
    }
    
    return data as TransactionLineItemsResponse
  }

  /**
   * Delete a specific line item
   */
  async delete(itemId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('fn_transaction_line_item_delete', { 
        p_item_id: itemId 
      })
    
    if (error) {
      console.error('❌ Failed to delete transaction line item:', error)
      throw new Error(`Failed to delete line item: ${error.message}`)
    }
    
    return data as boolean
  }

  /**
   * Validate calculations for all line items in a transaction
   */
  async validateCalculations(transactionId: string): Promise<ValidationResult> {
    const { data, error } = await supabase
      .rpc('fn_validate_transaction_line_item_calculations', { 
        p_transaction_id: transactionId 
      })
    
    if (error) {
      console.error('❌ Failed to validate calculations:', error)
      throw new Error(`Failed to validate calculations: ${error.message}`)
    }
    
    return data as ValidationResult
  }

  /**
   * Get transaction line items using the legacy service format for compatibility
   * (bridges the gap during migration)
   */
  async getLegacyFormat(transactionId: string): Promise<any[]> {
    const response = await this.getByTransaction(transactionId)
    
    // Convert to legacy format
    return response.items.map(item => ({
      id: item.id,
      transaction_id: item.transaction_id,
      line_number: item.line_number,
      item_code: item.item_code,
      item_name: item.item_name,
      item_name_ar: item.item_name_ar,
      description: item.description,
      description_ar: item.description_ar,
      quantity: item.quantity,
      percentage: item.percentage ?? 100,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount ?? 0,
      tax_amount: item.tax_amount ?? 0,
      unit_of_measure: item.unit_of_measure,
      analysis_work_item_id: item.analysis_work_item_id,
      sub_tree_id: item.sub_tree_id,
      line_item_id: item.line_item_id,
      org_id: item.org_id,
      // Calculate total on client side for immediate feedback
      total_amount: this.calculateTotal(item),
    }))
  }

  /**
   * Calculate line item total (matches database calculation)
   */
  private calculateTotal(item: TransactionLineItemData): number {
    const quantity = Number(item.quantity) || 0
    const percentage = Number(item.percentage ?? 100)
    const unitPrice = Number(item.unit_price) || 0
    const discount = Number(item.discount_amount) || 0
    const tax = Number(item.tax_amount) || 0
    
    return quantity * (percentage / 100) * unitPrice - discount + tax
  }

  /**
   * Bulk replace all line items for a transaction (delete old, insert new)
   */
  async replaceAll(transactionId: string, items: TransactionLineItemData[]): Promise<TransactionLineItemData[]> {
    // Get existing items
    const existing = await this.getByTransaction(transactionId)
    
    // Delete items that aren't in the new set
    const newItemIds = new Set(items.map(item => item.id).filter(Boolean))
    const itemsToDelete = existing.items.filter(item => item.id && !newItemIds.has(item.id))
    
    for (const item of itemsToDelete) {
      if (item.id) {
        await this.delete(item.id)
      }
    }
    
    // Upsert new items
    return await this.upsertMany(transactionId, items)
  }

  /**
   * Get enhanced statistics for a transaction
   */
  async getStatistics(transactionId: string): Promise<{
    totalItems: number
    totalAmount: number
    averageAmount: number
    maxAmount: number
    minAmount: number
    validationScore: number
  }> {
    const [lineItems, validation] = await Promise.all([
      this.getByTransaction(transactionId),
      this.validateCalculations(transactionId)
    ])
    
    const amounts = lineItems.items.map(item => this.calculateTotal(item))
    
    return {
      totalItems: lineItems.summary.total_items,
      totalAmount: lineItems.summary.total_amount,
      averageAmount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
      maxAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
      minAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
      validationScore: validation.summary.total_items > 0 
        ? (validation.summary.accurate_items / validation.summary.total_items) * 100 
        : 100
    }
  }
}

// Export singleton instance
export const transactionLineItemsAPI = new TransactionLineItemsAPI()

// Export for backward compatibility
export default transactionLineItemsAPI