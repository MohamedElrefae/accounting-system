import { transactionLineItemsEnhancedService } from './transaction-line-items-enhanced'
import type { 
  LineItemTreeNode, 
  EditableTxLineItem
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
  line_number?: number
  item_code?: string
  item_name: string
  item_name_ar?: string
  quantity?: number
  percentage?: number
  unit_price?: number
  unit_of_measure?: string
  analysis_work_item_id?: string
  sub_tree_id?: string
  work_item_id?: string
  line_item_catalog_id?: string
}

export interface UpdateLineItemPayload {
  id: string
  item_code?: string
  item_name?: string
  item_name_ar?: string
  quantity?: number
  percentage?: number
  unit_price?: number
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
      if (import.meta.env.DEV) console.log('🌳 Loading root line items for transaction:', transactionId)
      
      const tree = await transactionLineItemsEnhancedService.getLineItemsTree(transactionId)
      const flatItems = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      
      // Convert tree nodes to UI nodes
      const rootNodes = tree.filter(node => node.depth === 0).map(node => this.convertToUINode(node, flatItems))
      
      if (import.meta.env.DEV) console.log('✅ Loaded', rootNodes.length, 'root line items')
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
      if (import.meta.env.DEV) console.log('📂 Loading child line items for parent:', parentCode)
      
      const descendants = await transactionLineItemsEnhancedService.getLineItemDescendants(transactionId, parentCode)
      const flatItems = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      
      // Filter for direct children only (not all descendants)
      const directChildren = descendants.filter(desc => {
        const parentCodeFromChild = this.extractParentCode(desc.item_code || '')
        return parentCodeFromChild === parentCode
      })
      
      const childNodes = directChildren.map(child => this.convertToUINode(child, flatItems))
      
      if (import.meta.env.DEV) console.log('✅ Loaded', childNodes.length, 'child line items')
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
      if (import.meta.env.DEV) console.log('➕ Creating parent line item:', payload.item_name)

      const newItem: EditableTxLineItem = {
        line_number: payload.line_number ?? 1,
        item_code: payload.item_code ?? null,
        item_name: payload.item_name,
        item_name_ar: payload.item_name_ar ?? null,
        quantity: payload.quantity ?? 1,
        percentage: payload.percentage ?? 100,
        unit_price: payload.unit_price ?? 0,
        unit_of_measure: payload.unit_of_measure ?? 'piece',
        analysis_work_item_id: payload.analysis_work_item_id ?? null,
        sub_tree_id: payload.sub_tree_id ?? null,
        work_item_id: payload.work_item_id ?? null,
        line_item_catalog_id: payload.line_item_catalog_id ?? null,
      }

      await transactionLineItemsEnhancedService.createLineItem(payload.transaction_id, newItem)

      if (import.meta.env.DEV) console.log('✅ Created parent line item with code:', newItem.item_code)
      return newItem.item_code || ''
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
      if (import.meta.env.DEV) console.log('➕ Creating child line item for parent:', payload.parent_code)
      
      if (!payload.parent_code) {
        throw new Error('Parent code is required for child line items')
      }
      
      const newItem: EditableTxLineItem = {
        line_number: payload.line_number ?? 1,
        item_code: payload.item_code ?? null,
        item_name: payload.item_name,
        item_name_ar: payload.item_name_ar ?? null,
        quantity: payload.quantity ?? 1,
        percentage: payload.percentage ?? 100,
        unit_price: payload.unit_price ?? 0,
        unit_of_measure: payload.unit_of_measure ?? 'piece',
        analysis_work_item_id: payload.analysis_work_item_id ?? null,
        sub_tree_id: payload.sub_tree_id ?? null,
        work_item_id: payload.work_item_id ?? null,
        line_item_catalog_id: payload.line_item_catalog_id ?? null,
      }

      const createdItem = await transactionLineItemsEnhancedService.createChildLineItem(
        payload.transaction_id,
        {
          parent_item_code: payload.parent_code,
          suggested_code: newItem.item_code ?? undefined,
          item_name: newItem.item_name ?? undefined,
          item_name_ar: newItem.item_name_ar ?? undefined,
          quantity: newItem.quantity ?? undefined,
          percentage: newItem.percentage ?? undefined,
          unit_price: newItem.unit_price ?? undefined,
          unit_of_measure: newItem.unit_of_measure ?? undefined,
        }
      )

      if (import.meta.env.DEV) console.log('✅ Created child line item with code:', createdItem.item_code)
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
      if (import.meta.env.DEV) console.log('✏️ Updating line item:', payload.id)
      
      const updates: Partial<EditableTxLineItem> = {
        item_code: payload.item_code,
        item_name: payload.item_name,
        item_name_ar: payload.item_name_ar,
        quantity: payload.quantity,
        percentage: payload.percentage,
        unit_price: payload.unit_price,
        unit_of_measure: payload.unit_of_measure
      }
      
      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates]
        }
      })
      
      await transactionLineItemsEnhancedService.updateLineItem(transactionId, payload.id, updates)
      
      if (import.meta.env.DEV) console.log('✅ Updated line item successfully')
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
      if (import.meta.env.DEV) console.log('🔄 Toggling line item status:', itemId)
      
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
      
      if (import.meta.env.DEV) console.log('✅ Toggled line item status')
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
      if (import.meta.env.DEV) console.log('🗑️ Deleting line item:', itemId)
      
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
      
      if (import.meta.env.DEV) console.log('✅ Deleted line item successfully')
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
      if (import.meta.env.DEV) console.log('🔍 Searching line items:', searchTerm)
      
      const items = await transactionLineItemsEnhancedService.getLineItemsList(transactionId)
      const term = searchTerm.toLowerCase()
      
      const matches = items.filter(item => 
        (item.item_code?.toLowerCase().includes(term)) ||
        (item.item_name?.toLowerCase().includes(term)) ||
        (item.item_name_ar?.toLowerCase().includes(term))
      )
      
      const uiNodes = matches.map(item => this.convertToUINode(item, items))
      
      if (import.meta.env.DEV) console.log('✅ Found', uiNodes.length, 'matching line items')
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

  private convertToUINode(node: LineItemTreeNode | EditableTxLineItem, allItems: EditableTxLineItem[]): LineItemUINode {
    const depth = 'depth' in node ? node.depth ?? 0 : this.calculateDepth(node.item_code || '')
    const hasChildren = 'has_children' in node
      ? Boolean(node.has_children)
      : this.hasChildren(node.item_code || '', allItems)
    const isActive = !(node.item_name_ar?.includes('(معطل)') || node.item_name?.includes('(معطل)'))
    const totalAmount = 'total_amount' in node && typeof (node as LineItemTreeNode).total_amount === 'number'
      ? (node as LineItemTreeNode).total_amount ?? this.calculateAmount(node)
      : this.calculateAmount(node)

    return {
      id: node.id!,
      code: node.item_code || '',
      name: node.item_name || '',
      name_ar: node.item_name_ar || node.item_name || '',
      level: depth + 1,
      status: isActive ? 'active' : 'inactive',
      parent_id: this.extractParentCode(node.item_code || ''),
      has_children: hasChildren,
      has_active_children: hasChildren,
      line_number: node.line_number,
      quantity: node.quantity,
      unit_price: node.unit_price,
      total_amount: Number(totalAmount),
      item_type: 'line_item',
      unit_of_measure: node.unit_of_measure || 'piece'
    }
  }

  private calculateAmount(item: EditableTxLineItem): number {
    const qty = Number(item.quantity ?? 0)
    const pct = Number(item.percentage == null ? 100 : item.percentage)
    const price = Number(item.unit_price ?? 0)
    return qty * price * (pct / 100)
  }

  private extractParentCode(itemCode: string | null | undefined): string | null {
    if (!itemCode) return null

    if (itemCode.includes('-')) {
      const parts = itemCode.split('-')
      if (parts.length > 1) {
        parts.pop()
        return parts.join('-')
      }
      return null
    }

    if (/^\d+$/.test(itemCode)) {
      if (itemCode.length <= 1) return null
      return itemCode.slice(0, -1)
    }

    return null
  }

  private hasChildren(parentCode: string, items: EditableTxLineItem[]): boolean {
    if (!parentCode) return false
    return items.some(item => {
      if (!item.item_code) return false
      const candidateParent = this.extractParentCode(item.item_code)
      return candidateParent === parentCode
    })
  }

  private calculateDepth(itemCode: string): number {
    if (!itemCode) return 0
    if (itemCode.includes('-')) {
      return itemCode.split('-').length
    }
    if (/^\d+$/.test(itemCode)) {
      return Math.min(itemCode.length, 4)
    }
    return 1
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