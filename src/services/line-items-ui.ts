import { supabase } from '../utils/supabase'
import { transactionLineItemsEnhancedService } from './transaction-line-items-enhanced'
import type { 
  LineItemTreeNode, 
  EditableTxLineItem,
  ChildLineItemRequest 
} from './transaction-line-items-enhanced'

export interface LineItemUINode {
  id: string
  code: string
  name: string
  name_ar?: string
  level: number
  status: 'active' | 'inactive'
  parent_id: string | null
  has_children?: boolean
  has_active_children?: boolean
  transaction_id: string
  line_number: number
  quantity: number
  unit_price: number
  total_amount: number
  item_type?: string
  unit_of_measure?: string
}

export interface CreateLineItemPayload {
  transaction_id: string
  parent_code?: string
  item_code?: string
  item_name: string
  item_name_ar?: string
  quantity?: number
  percentage?: number
  unit_price?: number
  discount_amount?: number
  tax_amount?: number
  unit_of_measure?: string
  analysis_work_item_id?: string
  sub_tree_id?: string
}

export interface UpdateLineItemPayload {
  id: string
  item_code?: string
  item_name?: string
  item_name_ar?: string
  quantity?: number
  percentage?: number
  unit_price?: number
  discount_amount?: number
  tax_amount?: number
  unit_of_measure?: string
  is_active?: boolean
}

/**
 * Enhanced Line Items UI Service
 * Provides UI-specific operations for transaction line items with tree functionality
 * Following the same patterns as your accounts tree UI
 */
export class LineItemsUIService {
  
  /**
   * Load root level line items for a transaction
   */
  async loadRootLineItems(transactionId: string): Promise<LineItemUINode[]> {
    try {
      console.log('🌳 Loading root line items for transaction:', transactionId)
      
      const tree = await transactionLineItemsEnhancedService.getLineItemsTree(transactionId)
      const flatItems = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      
      // Convert tree nodes to UI nodes
      const rootNodes = tree.map(node => this.convertToUINode(node, flatItems))
      
      console.log('✅ Loaded', rootNodes.length, 'root line items')
      return rootNodes
    } catch (error) {
      console.error('❌ Error loading root line items:', error)
      throw new Error('Failed to load root line items')
    }
  }

  /**
   * Load child line items for a parent item
   */
  async loadChildLineItems(transactionId: string, parentCode: string): Promise<LineItemUINode[]> {
    try {
      console.log('📂 Loading child line items for parent:', parentCode)
      
      const descendants = await transactionLineItemsEnhancedService.getLineItemDescendants(transactionId, parentCode)
      const flatItems = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      
      // Filter for direct children only (not all descendants)
      const directChildren = descendants.filter(desc => {
        const parentCodeFromChild = this.extractParentCode(desc.item_code || '')
        return parentCodeFromChild === parentCode
      })
      
      const childNodes = directChildren.map(child => this.convertToUINode(child, flatItems))
      
      console.log('✅ Loaded', childNodes.length, 'child line items')
      return childNodes
    } catch (error) {
      console.error('❌ Error loading child line items:', error)
      throw new Error('Failed to load child line items')
    }
  }

  /**
   * Create parent line item (إضافة أصل)
   */
  async createParentLineItem(payload: CreateLineItemPayload): Promise<string> {
    try {
      console.log('➕ Creating parent line item:', payload.item_name)
      
      // Get suggested code for root level
      const suggestedCode = await transactionLineItemsEnhancedService.fetchNextLineItemCode(
        payload.transaction_id
      )
      
      // Get current items to determine line number
      const existingItems = await transactionLineItemsEnhancedService.getLineItemsList(payload.transaction_id)
      const maxLineNumber = Math.max(0, ...existingItems.map(item => item.line_number))
      
      const newItem: EditableTxLineItem = {
        line_number: maxLineNumber + 1,
        item_code: payload.item_code || suggestedCode,
        item_name: payload.item_name,
        item_name_ar: payload.item_name_ar,
        quantity: payload.quantity ?? 1,
        percentage: payload.percentage ?? 100,
        unit_price: payload.unit_price ?? 0,
        discount_amount: payload.discount_amount ?? 0,
        tax_amount: payload.tax_amount ?? 0,
        unit_of_measure: payload.unit_of_measure ?? 'piece',
        analysis_work_item_id: payload.analysis_work_item_id || null,
        sub_tree_id: payload.sub_tree_id || null,
        line_item_id: null
      }
      
      await transactionLineItemsEnhancedService.createLineItem(payload.transaction_id, newItem)
      
      console.log('✅ Created parent line item with code:', newItem.item_code)
      return newItem.item_code || suggestedCode
    } catch (error) {
      console.error('❌ Error creating parent line item:', error)
      throw new Error('Failed to create parent line item')
    }
  }

  /**
   * Create child line item (إضافة فرعي)
   */
  async createChildLineItem(payload: CreateLineItemPayload): Promise<string> {
    try {
      console.log('➕ Creating child line item for parent:', payload.parent_code)
      
      if (!payload.parent_code) {
        throw new Error('Parent code is required for child line items')
      }
      
      // Use the enhanced service's child creation method
      const childRequest: ChildLineItemRequest = {
        parent_item_code: payload.parent_code,
        suggested_code: payload.item_code,
        item_name: payload.item_name,
        item_name_ar: payload.item_name_ar,
        quantity: payload.quantity,
        percentage: payload.percentage,
        unit_price: payload.unit_price,
        discount_amount: payload.discount_amount,
        tax_amount: payload.tax_amount,
        unit_of_measure: payload.unit_of_measure
      }
      
      const createdItem = await transactionLineItemsEnhancedService.createChildLineItem(
        payload.transaction_id,
        childRequest
      )
      
      console.log('✅ Created child line item with code:', createdItem.item_code)
      return createdItem.item_code || ''
    } catch (error) {
      console.error('❌ Error creating child line item:', error)
      throw new Error('Failed to create child line item')
    }
  }

  /**
   * Update line item (تعديل)
   */
  async updateLineItem(transactionId: string, payload: UpdateLineItemPayload): Promise<boolean> {
    try {
      console.log('✏️ Updating line item:', payload.id)
      
      const updates: Partial<EditableTxLineItem> = {
        item_code: payload.item_code,
        item_name: payload.item_name,
        item_name_ar: payload.item_name_ar,
        quantity: payload.quantity,
        percentage: payload.percentage,
        unit_price: payload.unit_price,
        discount_amount: payload.discount_amount,
        tax_amount: payload.tax_amount,
        unit_of_measure: payload.unit_of_measure
      }
      
      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates]
        }
      })
      
      await transactionLineItemsEnhancedService.updateLineItem(transactionId, payload.id, updates)
      
      console.log('✅ Updated line item successfully')
      return true
    } catch (error) {
      console.error('❌ Error updating line item:', error)
      throw new Error('Failed to update line item')
    }
  }

  /**
   * Toggle line item status (تفعيل/تعطيل)
   */
  async toggleLineItemStatus(transactionId: string, itemId: string): Promise<boolean> {
    try {
      console.log('🔄 Toggling line item status:', itemId)
      
      // Get current item to check status
      const items = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      const item = items.find(i => i.id === itemId)
      
      if (!item) {
        throw new Error('Line item not found')
      }
      
      // For now, we'll use a simple active flag in item_name_ar
      // In a full implementation, you'd have an is_active field
      const currentlyActive = !(item.item_name_ar?.includes('(معطل)'))
      const newName = currentlyActive 
        ? `${item.item_name} (معطل)`
        : item.item_name?.replace(' (معطل)', '') || item.item_name
      
      await transactionLineItemsEnhancedService.updateLineItem(transactionId, itemId, {
        item_name_ar: newName
      })
      
      console.log('✅ Toggled line item status')
      return !currentlyActive
    } catch (error) {
      console.error('❌ Error toggling line item status:', error)
      throw new Error('Failed to toggle line item status')
    }
  }

  /**
   * Delete line item (حذف)
   */
  async deleteLineItem(transactionId: string, itemId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting line item:', itemId)
      
      // Check if item has children
      const items = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      const item = items.find(i => i.id === itemId)
      
      if (!item) {
        throw new Error('Line item not found')
      }
      
      // Check for children
      const hasChildren = items.some(i => {
        const parentCode = this.extractParentCode(i.item_code || '')
        return parentCode === item.item_code
      })
      
      if (hasChildren) {
        throw new Error('Cannot delete line item with children')
      }
      
      const result = await transactionLineItemsEnhancedService.deleteLineItem(transactionId, itemId)
      
      console.log('✅ Deleted line item successfully')
      return result
    } catch (error) {
      console.error('❌ Error deleting line item:', error)
      throw new Error('Failed to delete line item')
    }
  }

  /**
   * Get line item statistics for UI display
   */
  async getLineItemStats(transactionId: string): Promise<{
    totalItems: number
    rootItems: number
    maxDepth: number
    totalValue: number
    hasInactiveItems: boolean
  }> {
    try {
      const baseStats = await transactionLineItemsEnhancedService.getLineItemStats(transactionId)
      const items = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      
      const hasInactiveItems = items.some(item => 
        item.item_name_ar?.includes('(معطل)') || 
        item.item_name?.includes('(معطل)')
      )
      
      return {
        ...baseStats,
        hasInactiveItems
      }
    } catch (error) {
      console.error('❌ Error getting line item stats:', error)
      throw new Error('Failed to get line item statistics')
    }
  }

  /**
   * Search line items by code or name
   */
  async searchLineItems(
    transactionId: string, 
    searchTerm: string
  ): Promise<LineItemUINode[]> {
    try {
      console.log('🔍 Searching line items:', searchTerm)
      
      const items = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      const term = searchTerm.toLowerCase()
      
      const matches = items.filter(item => 
        (item.item_code?.toLowerCase().includes(term)) ||
        (item.item_name?.toLowerCase().includes(term)) ||
        (item.item_name_ar?.toLowerCase().includes(term))
      )
      
      const uiNodes = matches.map(item => this.convertToUINode(item, items))
      
      console.log('✅ Found', uiNodes.length, 'matching line items')
      return uiNodes
    } catch (error) {
      console.error('❌ Error searching line items:', error)
      throw new Error('Failed to search line items')
    }
  }

  /**
   * Get line items by level for filtering
   */
  async getLineItemsByLevel(transactionId: string, level: number): Promise<LineItemUINode[]> {
    try {
      const levelItems = await transactionLineItemsEnhancedService.getLineItemsByLevel(transactionId, level)
      const allItems = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      
      return levelItems.map(item => this.convertToUINode(item, allItems))
    } catch (error) {
      console.error('❌ Error getting line items by level:', error)
      throw new Error('Failed to get line items by level')
    }
  }

  // Helper methods

  private convertToUINode(treeNode: LineItemTreeNode, allItems: any[]): LineItemUINode {
    const isActive = !(treeNode.item_name_ar?.includes('(معطل)') || treeNode.item_name?.includes('(معطل)'))
    
    return {
      id: treeNode.id,
      code: treeNode.item_code || '',
      name: treeNode.item_name || '',
      name_ar: treeNode.item_name_ar || treeNode.item_name || '',
      level: treeNode.depth || 1,
      status: isActive ? 'active' : 'inactive',
      parent_id: treeNode.parent_code || null,
      has_children: treeNode.has_children || false,
      has_active_children: treeNode.has_children || false, // Simplified
      transaction_id: treeNode.transaction_id || '',
      line_number: treeNode.line_number,
      quantity: treeNode.quantity,
      unit_price: treeNode.unit_price,
      total_amount: treeNode.total_amount || 0,
      item_type: 'line_item', // Default type
      unit_of_measure: treeNode.unit_of_measure || 'piece'
    }
  }

  private extractParentCode(itemCode: string): string | null {
    if (!itemCode) return null
    
    // Dash pattern: "1-2-3" -> "1-2"
    if (itemCode.includes('-')) {
      const parts = itemCode.split('-')
      if (parts.length > 1) {
        parts.pop()
        return parts.join('-')
      }
    }
    
    // Numeric pattern: "123" -> "12" (if meaningful)
    if (/^\d+$/.test(itemCode) && itemCode.length > 1) {
      const parentCode = itemCode.substring(0, itemCode.length - 1)
      if (parentCode.length > 0) {
        return parentCode
      }
    }
    
    return null
  }

  /**
   * Validate line item before creation/update
   */
  async validateLineItem(transactionId: string, payload: CreateLineItemPayload | UpdateLineItemPayload): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      // Check required fields
      if ('item_name' in payload && !payload.item_name?.trim()) {
        errors.push('اسم البند مطلوب')
      }
      
      if ('item_code' in payload && payload.item_code) {
        // Check for duplicate codes
        const items = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
        const existingItem = items.find(item => 
          item.item_code === payload.item_code && 
          ('id' in payload ? item.id !== payload.id : true)
        )
        
        if (existingItem) {
          errors.push(`كود البند ${payload.item_code} موجود بالفعل`)
        }
      }
      
      // Validate numeric fields
      if ('quantity' in payload && payload.quantity !== undefined && payload.quantity < 0) {
        errors.push('الكمية لا يمكن أن تكون سالبة')
      }
      
      if ('unit_price' in payload && payload.unit_price !== undefined && payload.unit_price < 0) {
        errors.push('سعر الوحدة لا يمكن أن يكون سالباً')
      }
      
      return {
        valid: errors.length === 0,
        errors
      }
    } catch (error) {
      console.error('Error validating line item:', error)
      return {
        valid: false,
        errors: ['خطأ في التحقق من البيانات']
      }
    }
  }
}

// Export singleton instance
export const lineItemsUIService = new LineItemsUIService()

// Export types for use in components
export type {
  LineItemUINode,
  CreateLineItemPayload,
  UpdateLineItemPayload
}