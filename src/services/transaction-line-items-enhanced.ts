import { supabase } from '../utils/supabase'
import { transactionLineItemsService } from './transaction-line-items'
import type { DbTxLineItem, EditableTxLineItem } from './transaction-line-items'

// Re-export types for convenience
export type { DbTxLineItem, EditableTxLineItem } from './transaction-line-items'

// Extended interface for tree functionality
export interface LineItemTreeNode extends DbTxLineItem {
  depth: number;
  has_children: boolean;
  sort_path: number[];
  calculated_total: number;
  children?: LineItemTreeNode[];
  parent_code?: string;
  path?: string; // hierarchy path like "1.2.3"
  child_count?: number;
}

// Cache system following sub-tree pattern
interface TransactionLineItemsCache {
  tree: Map<string, LineItemTreeNode[]>; // keyed by transactionId
  list: Map<string, DbTxLineItem[]>;     // keyed by transactionId
  metadata: Map<string, { lastUpdated: number; orgId: string }>;
}

const cache: TransactionLineItemsCache = {
  tree: new Map<string, LineItemTreeNode[]>(),
  list: new Map<string, DbTxLineItem[]>(),
  metadata: new Map<string, { lastUpdated: number; orgId: string }>(),
}

/**
 * Build hierarchical tree structure from flat line items data
 * Following the same pattern as sub-tree service
 */
function buildLineItemTree(rows: DbTxLineItem[]): LineItemTreeNode[] {
  const map = new Map<string, LineItemTreeNode>()
  const roots: LineItemTreeNode[] = []

  // First pass: create tree nodes with metadata
  rows.forEach(r => {
    const treeNode: LineItemTreeNode = {
      ...r,
      depth: calculateDepthFromCode(r.item_code || ''),
      has_children: false, // Will be updated in second pass
      sort_path: [r.line_number],
      calculated_total: r.total_amount || 0,
      children: [],
      parent_code: extractParentCode(r.item_code || ''),
      path: buildHierarchyPath(r.item_code || ''),
      child_count: 0
    }
    map.set(r.id, treeNode)
  })

  // Second pass: build parent-child relationships
  rows.forEach(r => {
    const node = map.get(r.id)!
    const parentCode = node.parent_code
    
    if (parentCode) {
      // Find parent by item_code
      const parent = Array.from(map.values()).find(n => n.item_code === parentCode)
      if (parent) {
        parent.children!.push(node)
        parent.has_children = true
        parent.child_count = (parent.child_count || 0) + 1
      } else {
        // Orphaned item - treat as root
        roots.push(node)
      }
    } else {
      // Root level item
      roots.push(node)
    }
  })

  // Sort children recursively by item_code
  const sortChildren = (nodes: LineItemTreeNode[]) => {
    nodes.sort((a, b) => (a.item_code || '').localeCompare(b.item_code || ''))
    nodes.forEach(n => n.children && sortChildren(n.children))
  }
  sortChildren(roots)
  
  return roots
}

/**
 * Calculate depth from item code (following the dash/numeric patterns)
 */
function calculateDepthFromCode(itemCode: string): number {
  if (!itemCode) return 0
  
  // Count dashes for dash pattern (e.g., "1-2-3" = depth 3)
  if (itemCode.includes('-')) {
    return itemCode.split('-').length
  }
  
  // For numeric pattern, depth is based on length/complexity
  // e.g., "1" = depth 1, "11" = depth 2, "111" = depth 3
  if (/^\d+$/.test(itemCode)) {
    return Math.min(itemCode.length, 4) // Cap at 4 levels
  }
  
  return 1 // Default depth
}

/**
 * Extract parent code from item code
 */
function extractParentCode(itemCode: string): string | undefined {
  if (!itemCode) return undefined
  
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
    // Only if the parent would be a meaningful code
    const parentCode = itemCode.substring(0, itemCode.length - 1)
    if (parentCode.length > 0) {
      return parentCode
    }
  }
  
  return undefined
}

/**
 * Build hierarchy path for sorting and navigation
 */
function buildHierarchyPath(itemCode: string): string {
  if (!itemCode) return ''
  
  // For dash pattern, use as-is
  if (itemCode.includes('-')) {
    return itemCode.replace(/-/g, '.')
  }
  
  // For numeric pattern, split by digits
  if (/^\d+$/.test(itemCode)) {
    return itemCode.split('').join('.')
  }
  
  return itemCode
}

export interface CodeSuggestionResult {
  suggested_code: string;
  parent_code?: string;
  pattern_used: 'root_numeric' | 'numeric' | 'dash';
}

export interface ChildLineItemRequest {
  parent_item_code?: string;
  suggested_code?: string;
  item_name?: string;
  item_name_ar?: string;
  quantity?: number;
  percentage?: number;
  unit_price?: number;
  discount_amount?: number;
  tax_amount?: number;
  unit_of_measure?: string;
}

/**
 * Enhanced service that extends the basic TransactionLineItemsService
 * with tree functionality and child creation capabilities
 * Following the same patterns as sub-tree service
 */
export class TransactionLineItemsEnhancedService {
  
  // Cache management methods (following sub-tree pattern)
  
  /**
   * Get line items as tree structure with caching
   */
  async getLineItemsTree(transactionLineId: string, force = false): Promise<LineItemTreeNode[]> {
    if (!force && cache.tree.has(transactionLineId)) {
      return cache.tree.get(transactionLineId)!
    }

    console.log('🌳 Loading line items tree for transaction line:', transactionLineId)
    try {
      // Load flat data from basic service
      const items = await transactionLineItemsService.listByTransactionLine(transactionLineId)
      
      // Build tree structure
      const tree = buildLineItemTree(items)
      
      // Cache results
      cache.tree.set(transactionLineId, tree)
      cache.list.set(transactionLineId, items)
      cache.metadata.set(transactionLineId, { 
        lastUpdated: Date.now(),
        orgId: items[0]?.org_id || '' // Store for reference
      })
      
      console.log('🌳 Built tree with', tree.length, 'roots for transaction line', transactionLineId)
      return tree
    } catch (error) {
      console.error('❌ Error building line items tree:', error)
      throw error
    }
  }

  /**
   * Get line items as flat list with caching
   */
  async getLineItemsList(transactionLineId: string, force = false): Promise<DbTxLineItem[]> {
    if (!force && cache.list.has(transactionLineId)) {
      return cache.list.get(transactionLineId)!
    }

    // Load and cache via tree method (which also caches the list)
    await this.getLineItemsTree(transactionLineId, force)
    return cache.list.get(transactionLineId) || []
  }

  /**
   * Clear cache for specific transaction or all
   */
  clearCache(transactionId?: string): void {
    if (transactionId) {
      cache.tree.delete(transactionId)
      cache.list.delete(transactionId) 
      cache.metadata.delete(transactionId)
    } else {
      cache.tree.clear()
      cache.list.clear()
      cache.metadata.clear()
    }
  }

  /**
   * Get next available line item code following hierarchy patterns
   */
  async fetchNextLineItemCode(transactionId: string, parentCode?: string): Promise<string> {
    try {
      // Try database function first if available
      const { data, error } = await supabase.rpc('fn_get_next_line_item_code', {
        p_transaction_id: transactionId,
        p_parent_code: parentCode || null,
      })
      
      if (!error && data) {
        return data as string
      }
    } catch {
      // RPC not available, fall back to client-side logic
    }

    // Fallback: use existing code suggestion logic
    const suggestion = await this.getCodeSuggestion(transactionId, parentCode)
    return suggestion.suggested_code
  }

  /**
   * Get code suggestion for new child line item
   * This would ideally call the database function fn_get_next_line_item_code
   */
  async getCodeSuggestion(
    transactionLineId: string, 
    parentItemCode?: string
  ): Promise<CodeSuggestionResult> {
    try {
      // For now, we'll implement the logic here
      // In production, you'd call: fn_get_next_line_item_code(transactionLineId, parentItemCode)
      const items = await transactionLineItemsService.listByTransactionLine(transactionLineId);
      
      if (!parentItemCode) {
        // Root level suggestion
        const maxRoot = Math.max(0, ...items
          .filter(item => item.item_code && /^\d+$/.test(item.item_code))
          .map(item => parseInt(item.item_code!, 10))
        );
        return {
          suggested_code: (maxRoot + 1).toString(),
          pattern_used: 'root_numeric'
        };
      }

      // Child level suggestion
      const siblings = items.filter(item => 
        item.item_code && (
          item.item_code.startsWith(parentItemCode + '-') ||
          (item.item_code.startsWith(parentItemCode) && 
           !item.item_code.includes('-') && 
           item.item_code.length > parentItemCode.length)
        )
      );

      const dashSiblings = siblings.filter(s => s.item_code?.includes('-'));
      const numericSiblings = siblings.filter(s => !s.item_code?.includes('-'));

      if (numericSiblings.length >= dashSiblings.length) {
        // Numeric pattern
        const maxSuffix = Math.max(0, ...numericSiblings
          .map(s => s.item_code?.substring(parentItemCode.length))
          .filter(suffix => suffix && /^\d+$/.test(suffix))
          .map(suffix => parseInt(suffix!, 10))
        );
        return {
          suggested_code: parentItemCode + (maxSuffix + 1),
          parent_code: parentItemCode,
          pattern_used: 'numeric'
        };
      } else {
        // Dash pattern
        const maxChild = Math.max(0, ...dashSiblings
          .map(s => s.item_code?.split('-').pop())
          .filter(part => part && /^\d+$/.test(part))
          .map(part => parseInt(part!, 10))
        );
        return {
          suggested_code: `${parentItemCode}-${maxChild + 1}`,
          parent_code: parentItemCode,
          pattern_used: 'dash'
        };
      }
    } catch (error) {
      console.error('Error getting code suggestion:', error);
      throw new Error('Failed to generate code suggestion');
    }
  }

  /**
   * Create line item with tree-aware cache invalidation
   */
  async createLineItem(
    transactionLineId: string,
    itemData: EditableTxLineItem
  ): Promise<EditableTxLineItem> {
    try {
      // Get current items
      const items = await this.getLineItemsList(transactionLineId)
      
      // Add new item
      const updatedItems = [...items.map(item => ({
        id: item.id,
        line_number: item.line_number,
        quantity: item.quantity,
        percentage: item.percentage,
        unit_price: item.unit_price,
        item_code: item.item_code,
        item_name: item.item_name,
        analysis_work_item_id: item.analysis_work_item_id,
        sub_tree_id: item.sub_tree_id,
        unit_of_measure: item.unit_of_measure
      })), itemData]
      
      // Update via basic service
      await transactionLineItemsService.upsertMany(transactionLineId, updatedItems)
      
      // Invalidate cache
      this.clearCache(transactionLineId)
      
      return itemData
    } catch (error) {
      console.error('Error creating line item:', error)
      throw new Error('Failed to create line item')
    }
  }

  /**
   * Update line item with tree-aware cache invalidation
   */
  async updateLineItem(
    transactionLineId: string,
    itemId: string,
    updates: Partial<EditableTxLineItem>
  ): Promise<EditableTxLineItem> {
    try {
      const items = await this.getLineItemsList(transactionLineId)
      const itemIndex = items.findIndex(item => item.id === itemId)
      
      if (itemIndex === -1) {
        throw new Error('Line item not found')
      }
      
      // Update the item
      const updatedItem = { ...items[itemIndex], ...updates }
      const updatedItems = items.map((item, index) => 
        index === itemIndex 
          ? {
              id: updatedItem.id,
              line_number: updatedItem.line_number,
              quantity: updatedItem.quantity,
              percentage: updatedItem.percentage,
              unit_price: updatedItem.unit_price,
              item_code: updatedItem.item_code,
              item_name: updatedItem.item_name,
              analysis_work_item_id: updatedItem.analysis_work_item_id,
              sub_tree_id: updatedItem.sub_tree_id,
              unit_of_measure: updatedItem.unit_of_measure
            }
          : {
              id: item.id,
              line_number: item.line_number,
              quantity: item.quantity,
              percentage: item.percentage,
              unit_price: item.unit_price,
              item_code: item.item_code,
              item_name: item.item_name,
              analysis_work_item_id: item.analysis_work_item_id,
              sub_tree_id: item.sub_tree_id,
              unit_of_measure: item.unit_of_measure
            }
      )
      
      // Update via basic service
      await transactionLineItemsService.upsertMany(transactionLineId, updatedItems)
      
      // Invalidate cache
      this.clearCache(transactionLineId)
      
      return updatedItem as EditableTxLineItem
    } catch (error) {
      console.error('Error updating line item:', error)
      throw new Error('Failed to update line item')
    }
  }

  /**
   * Delete line item with tree-aware cache invalidation
   */
  async deleteLineItem(
    transactionLineId: string,
    itemId: string
  ): Promise<boolean> {
    try {
      const items = await this.getLineItemsList(transactionLineId)
      const updatedItems = items
        .filter(item => item.id !== itemId)
        .map(item => ({
          id: item.id,
          line_number: item.line_number,
          quantity: item.quantity,
          percentage: item.percentage,
          unit_price: item.unit_price,
          item_code: item.item_code,
          item_name: item.item_name,
          analysis_work_item_id: item.analysis_work_item_id,
          sub_tree_id: item.sub_tree_id,
          unit_of_measure: item.unit_of_measure
        }))
      
      await transactionLineItemsService.upsertMany(transactionLineId, updatedItems)
      
      // Invalidate cache
      this.clearCache(transactionLineId)
      
      return true
    } catch (error) {
      console.error('Error deleting line item:', error)
      throw new Error('Failed to delete line item')
    }
  }

  /**
   * Create a child line item with auto-suggested properties
   */
  async createChildLineItem(
    transactionLineId: string,
    childData: ChildLineItemRequest
  ): Promise<EditableTxLineItem> {
    try {
      const items = await this.getLineItemsList(transactionLineId);
      
      // Get code suggestion if not provided
      let itemCode = childData.suggested_code;
      if (!itemCode) {
        const suggestion = await this.getCodeSuggestion(transactionLineId, childData.parent_item_code);
        itemCode = suggestion.suggested_code;
      }

      // Find parent item for inheritance
      const parentItem = childData.parent_item_code 
        ? items.find(item => item.item_code === childData.parent_item_code)
        : null;

      // Generate names if not provided
      let itemName = childData.item_name;
      let itemNameAr = childData.item_name_ar;
      
      if (!itemName && !itemNameAr) {
        if (parentItem) {
          itemName = `${parentItem.item_name || 'Parent Item'} - Sub Item`;
          itemNameAr = `${parentItem.item_name_ar || 'البند الأساسي'} - بند فرعي`;
        } else {
          itemName = 'New Line Item';
          itemNameAr = 'بند جديد';
        }
      }

      // Create the new item
      const newItem: EditableTxLineItem = {
        line_number: Math.max(...items.map(i => i.line_number), 0) + 1,
        item_code: itemCode,
        item_name: itemName,
        quantity: childData.quantity ?? 1,
        percentage: childData.percentage ?? 100,
        unit_price: childData.unit_price ?? 0,
        unit_of_measure: childData.unit_of_measure ?? 'piece',
        // Inherit from parent if available
        analysis_work_item_id: parentItem?.analysis_work_item_id,
        sub_tree_id: parentItem?.sub_tree_id
      };

      // Save the new item using the enhanced create method
      await this.createLineItem(transactionLineId, newItem);
      
      return newItem;
    } catch (error) {
      console.error('Error creating child line item:', error);
      throw new Error('Failed to create child line item');
    }
  }

  /**
   * Get line items as a tree structure
   */
  async getTreeStructure(transactionLineId: string): Promise<LineItemTreeNode[]> {
    try {
      const items = await transactionLineItemsService.listByTransactionLine(transactionLineId);
      
      // Transform to tree nodes
      const treeNodes: LineItemTreeNode[] = items.map(item => ({
        ...item,
        depth: this.calculateDepth(item.item_code || ''),
        has_children: this.hasChildren(item.item_code || '', items),
        sort_path: [item.line_number],
        calculated_total: item.total_amount || 0,
        children: []
      }));

      // Build hierarchical structure
      const rootNodes = treeNodes.filter(node => node.depth === 0);
      const nodeMap = new Map(treeNodes.map(node => [node.id, node]));

      // For each node, find its children
      treeNodes.forEach(node => {
        if (node.item_code) {
          const children = treeNodes.filter(child => 
            child.item_code && 
            child.item_code !== node.item_code && 
            this.isDirectChild(node.item_code!, child.item_code)
          );
          node.children = children;
        }
      });

      return rootNodes;
    } catch (error) {
      console.error('Error getting tree structure:', error);
      throw new Error('Failed to get tree structure');
    }
  }

  /**
   * Calculate depth from item code
   */
  private calculateDepth(code: string): number {
    if (!code) return 0;
    if (code.includes('-')) {
      return code.split('-').length - 1;
    }
    // Numeric pattern depth detection
    const baseMatch = code.match(/^(\d+)/);
    if (baseMatch) {
      const base = baseMatch[1];
      return Math.max(0, Math.floor((code.length - base.length) / base.length));
    }
    return 0;
  }

  /**
   * Check if item has children
   */
  private hasChildren(code: string, items: DbTxLineItem[]): boolean {
    return items.some(item => 
      item.item_code && 
      item.item_code !== code && 
      this.isDirectChild(code, item.item_code)
    );
  }

  /**
   * Check if childCode is a direct child of parentCode
   */
  private isDirectChild(parentCode: string, childCode: string): boolean {
    if (childCode === parentCode) return false;
    
    // Dash pattern: parent-1, parent-2, etc.
    if (childCode.startsWith(parentCode + '-')) {
      const suffix = childCode.substring(parentCode.length + 1);
      // Must be direct child (no additional dashes)
      return /^\d+$/.test(suffix);
    }
    
    // Numeric pattern: parent1, parent2, etc.
    if (childCode.startsWith(parentCode) && !childCode.includes('-')) {
      const suffix = childCode.substring(parentCode.length);
      return /^\d+$/.test(suffix) && suffix.length <= 2; // Limit depth
    }
    
    return false;
  }

  /**
   * Delete line item and all its children
   */
  async deleteLineItemWithChildren(transactionLineId: string, itemCode: string): Promise<void> {
    try {
      const items = await transactionLineItemsService.listByTransactionLine(transactionLineId);
      
      // Find item and all its descendants
      const toDelete = new Set<string>();
      const findDescendants = (code: string) => {
        items.forEach(item => {
          if (item.item_code === code) {
            toDelete.add(item.id);
          } else if (item.item_code && this.isDescendant(code, item.item_code)) {
            toDelete.add(item.id);
            findDescendants(item.item_code);
          }
        });
      };
      
      findDescendants(itemCode);
      
      // Keep only items not marked for deletion
      const remainingItems = items
        .filter(item => !toDelete.has(item.id))
        .map(item => ({
          id: item.id,
          line_number: item.line_number,
          quantity: item.quantity,
          percentage: item.percentage,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
          tax_amount: item.tax_amount,
          item_code: item.item_code,
          item_name: item.item_name,
          analysis_work_item_id: item.analysis_work_item_id,
          sub_tree_id: item.sub_tree_id,
          line_item_id: item.line_item_id,
          unit_of_measure: item.unit_of_measure
        }));

      await transactionLineItemsService.upsertMany(transactionLineId, remainingItems);
    } catch (error) {
      console.error('Error deleting line item with children:', error);
      throw new Error('Failed to delete line item with children');
    }
  }

  /**
   * Check if childCode is a descendant of parentCode
   */
  private isDescendant(parentCode: string, childCode: string): boolean {
    if (childCode === parentCode) return false;
    
    // Dash pattern
    if (childCode.startsWith(parentCode + '-')) {
      return true;
    }
    
    // Numeric pattern
    if (childCode.startsWith(parentCode) && !childCode.includes('-') && !parentCode.includes('-')) {
      return childCode.length > parentCode.length;
    }
    
    return false;
  }

  /**
   * Validate line item tree structure
   */
  async validateTreeStructure(transactionId: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const items = await this.getLineItemsList(transactionId);
      const errors: string[] = [];

      // Check for duplicate codes
      const codes = items.filter(item => item.item_code).map(item => item.item_code!);
      const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate item codes found: ${duplicates.join(', ')}`);
      }

      // Check for orphaned children
      items.forEach(item => {
        if (item.item_code && item.item_code.includes('-')) {
          const parentCode = item.item_code.split('-')[0];
          const parentExists = items.some(parent => parent.item_code === parentCode);
          if (!parentExists) {
            errors.push(`Orphaned child item: ${item.item_code} (parent ${parentCode} not found)`);
          }
        }
      });

      // Check for invalid code formats
      items.forEach(item => {
        if (item.item_code && !/^[\d-]+$/.test(item.item_code)) {
          errors.push(`Invalid code format: ${item.item_code}`);
        }
      });

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating tree structure:', error);
      return {
        valid: false,
        errors: ['Failed to validate tree structure']
      };
    }
  }

  /**
   * Get flat nodes at specific depth level
   */
  async getLineItemsByLevel(transactionLineId: string, level: number): Promise<LineItemTreeNode[]> {
    try {
      const tree = await this.getLineItemsTree(transactionLineId)
      const result: LineItemTreeNode[] = []
      
      const collectAtLevel = (nodes: LineItemTreeNode[], currentLevel: number) => {
        nodes.forEach(node => {
          if (currentLevel === level) {
            result.push(node)
          }
          if (node.children && currentLevel < level) {
            collectAtLevel(node.children, currentLevel + 1)
          }
        })
      }
      
      collectAtLevel(tree, 1)
      return result
    } catch (error) {
      console.error('Error getting line items by level:', error)
      throw new Error('Failed to get line items by level')
    }
  }

  /**
   * Find line item by code in tree structure
   */
  async findLineItemByCode(transactionLineId: string, itemCode: string): Promise<LineItemTreeNode | null> {
    try {
      const tree = await this.getLineItemsTree(transactionLineId)
      
      const findInTree = (nodes: LineItemTreeNode[]): LineItemTreeNode | null => {
        for (const node of nodes) {
          if (node.item_code === itemCode) {
            return node
          }
          if (node.children) {
            const found = findInTree(node.children)
            if (found) return found
          }
        }
        return null
      }
      
      return findInTree(tree)
    } catch (error) {
      console.error('Error finding line item by code:', error)
      return null
    }
  }

  /**
   * Get all descendants of a line item
   */
  async getLineItemDescendants(transactionLineId: string, itemCode: string): Promise<LineItemTreeNode[]> {
    try {
      const parent = await this.findLineItemByCode(transactionLineId, itemCode)
      if (!parent || !parent.children) {
        return []
      }
      
      const descendants: LineItemTreeNode[] = []
      const collectDescendants = (nodes: LineItemTreeNode[]) => {
        nodes.forEach(node => {
          descendants.push(node)
          if (node.children) {
            collectDescendants(node.children)
          }
        })
      }
      
      collectDescendants(parent.children)
      return descendants
    } catch (error) {
      console.error('Error getting line item descendants:', error)
      throw new Error('Failed to get line item descendants')
    }
  }

  /**
   * Get line item statistics
   */
  async getLineItemStats(transactionLineId: string): Promise<{
    totalItems: number;
    rootItems: number;
    maxDepth: number;
    totalValue: number;
  }> {
    try {
      const tree = await this.getLineItemsTree(transactionLineId)
      const flatItems = await this.getLineItemsList(transactionLineId)
      
      let maxDepth = 0
      const calculateMaxDepth = (nodes: LineItemTreeNode[], currentDepth: number) => {
        maxDepth = Math.max(maxDepth, currentDepth)
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            calculateMaxDepth(node.children, currentDepth + 1)
          }
        })
      }
      
      calculateMaxDepth(tree, 1)
      
      const totalValue = flatItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
      
      return {
        totalItems: flatItems.length,
        rootItems: tree.length,
        maxDepth,
        totalValue
      }
    } catch (error) {
      console.error('Error getting line item stats:', error)
      throw new Error('Failed to get line item statistics')
    }
  }

  /**
   * Get line item hierarchy path (breadcrumbs)
   */
  async getLineItemPath(transactionLineId: string, itemCode: string): Promise<LineItemTreeNode[]> {
    try {
      const items = await this.getLineItemsList(transactionLineId);
      const path: LineItemTreeNode[] = [];
      
      // Build path from root to current item
      let currentCode = itemCode;
      while (currentCode) {
        const item = items.find(i => i.item_code === currentCode);
        if (item) {
          const treeNode: LineItemTreeNode = {
            ...item,
            depth: this.calculateDepth(item.item_code || ''),
            has_children: this.hasChildren(item.item_code || '', items),
            sort_path: [item.line_number],
            calculated_total: item.total_amount || 0
          };
          path.unshift(treeNode); // Add to beginning
        }
        
        // Find parent code
        if (currentCode.includes('-')) {
          const parts = currentCode.split('-');
          parts.pop();
          currentCode = parts.join('-');
        } else {
          // For numeric patterns, find the base
          const match = currentCode.match(/^(\d+)/);
          if (match && currentCode.length > match[1].length) {
            currentCode = match[1];
          } else {
            break;
          }
        }
      }
      
      return path;
    } catch (error) {
      console.error('Error getting line item path:', error);
      throw new Error('Failed to get line item path');
    }
  }
}

// Export singleton instance
export const transactionLineItemsEnhancedService = new TransactionLineItemsEnhancedService();

/**
 * Clear all transaction line items cache (global utility)
 * Following sub-tree pattern
 */
export function clearTransactionLineItemsCache(): void {
  cache.tree.clear();
  cache.list.clear();
  cache.metadata.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getTransactionLineItemsCacheStats(): {
  cachedTransactions: number;
  totalTreeNodes: number;
  totalListItems: number;
  oldestCache?: string;
  newestCache?: string;
} {
  const stats = {
    cachedTransactions: cache.metadata.size,
    totalTreeNodes: 0,
    totalListItems: 0,
    oldestCache: undefined as string | undefined,
    newestCache: undefined as string | undefined
  };
  
  // Count tree nodes
  for (const tree of cache.tree.values()) {
    const countNodes = (nodes: LineItemTreeNode[]): number => {
      let count = nodes.length;
      nodes.forEach(node => {
        if (node.children) count += countNodes(node.children);
      });
      return count;
    };
    stats.totalTreeNodes += countNodes(tree);
  }
  
  // Count list items
  for (const list of cache.list.values()) {
    stats.totalListItems += list.length;
  }
  
  // Find oldest and newest cache entries
  let oldest = Number.MAX_SAFE_INTEGER;
  let newest = 0;
  let oldestId: string | undefined;
  let newestId: string | undefined;
  
  for (const [transactionId, metadata] of cache.metadata.entries()) {
    if (metadata.lastUpdated < oldest) {
      oldest = metadata.lastUpdated;
      oldestId = transactionId;
    }
    if (metadata.lastUpdated > newest) {
      newest = metadata.lastUpdated;
      newestId = transactionId;
    }
  }
  
  stats.oldestCache = oldestId;
  stats.newestCache = newestId;
  
  return stats;
}

/**
 * Catalog Management Extension
 * Methods for managing template items (transaction_id = NULL)
 */
class TransactionLineItemsCatalogService {
  
  /**
   * Get catalog items (templates) - items with transaction_id = NULL
   */
  async getCatalogItems(orgId: string, includeInactive = false): Promise<DbTxLineItem[]> {
    try {
      const { data, error } = await supabase
        .from('transaction_line_items')
        .select('*')
        .eq('org_id', orgId)
        .is('transaction_id', null) // Catalog items
        .order('item_code', { ascending: true })
      
      if (error) throw error
      return ((data || []) as DbTxLineItem[])
        .filter(item => includeInactive || item.is_active !== false)
    } catch (error) {
      console.error('❌ Error getting catalog items:', error)
      throw new Error('Failed to get catalog items')
    }
  }

  /**
   * Get catalog items as tree structure
   */
  async getCatalogTree(orgId: string, includeInactive = false): Promise<LineItemTreeNode[]> {
    try {
      const items = await this.getCatalogItems(orgId, includeInactive)
      return buildLineItemTree(items)
    } catch (error) {
      console.error('❌ Error getting catalog tree:', error)
      throw new Error('Failed to get catalog tree')
    }
  }

  /**
   * Create catalog item template
   */
  async createCatalogItem(orgId: string, itemData: {
    item_code?: string
    item_name: string
    item_name_ar?: string
    quantity?: number
    unit_price?: number
    unit_of_measure?: string
    parent_id?: string
    position?: number
  }): Promise<DbTxLineItem> {
    try {
      // Generate code if not provided
      const itemCode = itemData.item_code || await this.getNextCatalogItemCode(orgId, itemData.parent_id)
      
      const { data, error } = await supabase
        .from('transaction_line_items')
        .insert([{
          org_id: orgId,
          transaction_id: null, // Mark as template
          line_number: itemData.position || 1,
          item_code: itemCode,
          item_name: itemData.item_name,
          item_name_ar: itemData.item_name_ar || null,
          quantity: itemData.quantity || 1,
          unit_price: itemData.unit_price || 0,
          unit_of_measure: itemData.unit_of_measure || 'piece',
          parent_id: itemData.parent_id || null,
          is_active: true
        }])
        .select()
        .single()

      if (error) throw error
      console.log('✅ Created catalog item:', itemCode)
      return data as DbTxLineItem
    } catch (error) {
      console.error('❌ Error creating catalog item:', error)
      throw new Error('Failed to create catalog item')
    }
  }

  /**
   * Update catalog item
   */
  async updateCatalogItem(id: string, orgId: string, updates: {
    item_code?: string
    item_name?: string
    item_name_ar?: string
    quantity?: number
    unit_price?: number
    unit_of_measure?: string
    is_active?: boolean
    position?: number
  }): Promise<DbTxLineItem> {
    try {
      // Whitelist fields that exist in the current schema
      const allowed: any = {}
      if (updates.item_code !== undefined) allowed.item_code = updates.item_code
      if (updates.item_name !== undefined) allowed.item_name = updates.item_name
      if (updates.item_name_ar !== undefined) allowed.item_name_ar = updates.item_name_ar
      if (updates.quantity !== undefined) allowed.quantity = updates.quantity
      if (updates.unit_price !== undefined) allowed.unit_price = updates.unit_price
      if (updates.unit_of_measure !== undefined) allowed.unit_of_measure = updates.unit_of_measure
      if (updates.is_active !== undefined) allowed.is_active = updates.is_active
      if (updates.position !== undefined) allowed.line_number = updates.position
      allowed.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('transaction_line_items')
        .update(allowed)
        .eq('id', id)
        .eq('org_id', orgId)
        .is('transaction_id', null) // Ensure it's a catalog item
        .select()
        .single()

      if (error) throw error
      console.log('✅ Updated catalog item:', id)
      return data as DbTxLineItem
    } catch (error) {
      console.error('❌ Error updating catalog item:', error)
      throw new Error('Failed to update catalog item')
    }
  }

  /**
   * Delete catalog item
   */
  async deleteCatalogItem(id: string, orgId: string): Promise<void> {
    try {
      // Check if item is used in any transactions
      const { data: usage } = await supabase
        .from('transaction_line_items')
        .select('item_code')
        .eq('id', id)
        .single()
      
      if (usage?.item_code) {
        const { data: usageCheck } = await supabase
          .from('transaction_line_items')
          .select('id')
          .eq('item_code', usage.item_code)
          .not('transaction_id', 'is', null)
          .limit(1)
        
        if (usageCheck && usageCheck.length > 0) {
          throw new Error('Cannot delete item: it is used in transactions')
        }
      }

      const { error } = await supabase
        .from('transaction_line_items')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId)
        .is('transaction_id', null)

      if (error) throw error
      console.log('✅ Deleted catalog item:', id)
    } catch (error) {
      console.error('❌ Error deleting catalog item:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to delete catalog item')
    }
  }

  /**
   * Get next catalog item code following 1000, 2000 pattern
   */
  async getNextCatalogItemCode(orgId: string, parentId?: string): Promise<string> {
    try {
      if (!parentId) {
        // Root level: 1000, 2000, 3000, etc.
        const { data, error } = await supabase
          .from('transaction_line_items')
          .select('item_code')
          .eq('org_id', orgId)
          .is('transaction_id', null)
          .is('parent_id', null)
          .like('item_code', '[0-9][0-9][0-9][0-9]')
          .order('item_code', { ascending: false })
          .limit(1)

        if (error) throw error
        
        const maxCode = data?.[0]?.item_code
        const nextNumber = maxCode ? parseInt(maxCode, 10) + 1000 : 1000
        return nextNumber.toString()
      }

      // Child level: 1100, 1200, etc.
      const { data: parent, error: parentError } = await supabase
        .from('transaction_line_items')
        .select('item_code')
        .eq('id', parentId)
        .single()

      if (parentError) throw parentError
      if (!parent?.item_code) throw new Error('Parent not found')

      const parentCode = parent.item_code
      const baseLevel = Math.floor(parseInt(parentCode, 10) / 100) * 100
      
      const { data, error } = await supabase
        .from('transaction_line_items')
        .select('item_code')
        .eq('org_id', orgId)
        .eq('parent_id', parentId)
        .order('item_code', { ascending: false })
        .limit(1)

      if (error) throw error

      const maxChild = data?.[0]?.item_code
      const nextNumber = maxChild ? parseInt(maxChild, 10) + 100 : baseLevel + 100
      return nextNumber.toString()
    } catch (error) {
      console.error('❌ Error getting next catalog code:', error)
      throw new Error('Failed to generate next catalog code')
    }
  }

  /**
   * Get catalog item statistics
   */
  async getCatalogStats(orgId: string): Promise<{
    totalItems: number
    rootItems: number
    maxDepth: number
    usageCount: number
  }> {
    try {
      const items = await this.getCatalogItems(orgId, true)
      const tree = await this.getCatalogTree(orgId, true)
      
      // Calculate max depth
      let maxDepth = 0
      const calculateDepth = (nodes: LineItemTreeNode[], currentDepth: number) => {
        maxDepth = Math.max(maxDepth, currentDepth)
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            calculateDepth(node.children, currentDepth + 1)
          }
        })
      }
      calculateDepth(tree, 1)
      
      // Get usage count
      const { data: usage } = await supabase
        .from('transaction_line_items')
        .select('item_code')
        .not('transaction_id', 'is', null)
        .in('item_code', items.map(item => item.item_code).filter(Boolean))
      
      return {
        totalItems: items.length,
        rootItems: tree.length,
        maxDepth,
        usageCount: usage?.length || 0
      }
    } catch (error) {
      console.error('❌ Error getting catalog stats:', error)
      throw new Error('Failed to get catalog statistics')
    }
  }

  /**
   * Get catalog items for selector/dropdown
   */
  async getCatalogItemsForSelector(orgId: string): Promise<Array<{
    id: string
    code: string
    name: string
    name_ar?: string
    level: number
    parent_id?: string
  }>> {
    try {
      const items = await this.getCatalogItems(orgId, false)
      return items.map(item => ({
        id: item.id,
        code: item.item_code || '',
        name: item.item_name || '',
        name_ar: item.item_name_ar || undefined,
        level: item.level || 1,
        parent_id: item.parent_id || undefined
      }))
    } catch (error) {
      console.error('❌ Error getting catalog items for selector:', error)
      throw new Error('Failed to get catalog items for selector')
    }
  }
}

// Export catalog service instance
export const transactionLineItemsCatalogService = new TransactionLineItemsCatalogService();
