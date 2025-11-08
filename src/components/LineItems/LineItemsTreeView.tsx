import React, { useState, useEffect, useCallback } from 'react'
import { lineItemsUIService } from '../../services/line-items-ui'
import type { 
  LineItemUINode, 
  CreateLineItemPayload
} from '../../services/line-items-ui'
import { useToast } from '../../contexts/ToastContext'

interface LineItemsTreeViewProps {
  transactionId: string
  orgId: string
  disabled?: boolean
  onLineItemsChange?: (items: LineItemUINode[]) => void
}

/**
 * Line Items Tree View Component
 * Replicates the UI functionality shown in your screenshot with CRUD operations
 */
export const LineItemsTreeView: React.FC<LineItemsTreeViewProps> = ({
  transactionId,
  orgId: _orgId,
  disabled = false,
  onLineItemsChange
}) => {
  const [lineItems, setLineItems] = useState<LineItemUINode[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addDialogType, setAddDialogType] = useState<'parent' | 'child'>('parent')
  const [addDialogParentCode, setAddDialogParentCode] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalItems: 0,
    rootItems: 0,
    maxDepth: 0,
    totalValue: 0,
    hasInactiveItems: false
  })

  const { showToast } = useToast()

  /**
   * Load line items data
   */
  const loadLineItems = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load root items and statistics
      const [rootItems, itemStats] = await Promise.all([
        lineItemsUIService.loadRootLineItems(transactionId),
        lineItemsUIService.getLineItemStats(transactionId)
      ])
      
      setLineItems(rootItems)
      setStats(itemStats)
      
      // Notify parent component
      onLineItemsChange?.(rootItems)
      
      console.log('✅ Loaded', rootItems.length, 'root line items')
    } catch (error) {
      console.error('❌ Error loading line items:', error)
      showToast('خطأ في تحميل بنود المعاملة', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [transactionId, onLineItemsChange, showToast])

  // Load line items on mount and when transaction changes
  useEffect(() => {
    if (transactionId) {
      loadLineItems()
    }
  }, [transactionId, loadLineItems])

  /**
   * Handle Add Parent Item (إضافة أصل - Orange button)
   */
  const handleAddParentItem = async (formData: any) => {
    try {
      setSaving(true)
      
      const payload: CreateLineItemPayload = {
        transaction_id: transactionId,
        line_number: lineItems.length + 1,
        item_name: formData.item_name,
        item_name_ar: formData.item_name_ar || formData.item_name,
        quantity: formData.quantity || 1,
        unit_price: formData.unit_price || 0,
        unit_of_measure: formData.unit_of_measure || 'piece',
        percentage: formData.percentage || 100,
      }
      
      // Validate before creating
      const validation = await lineItemsUIService.validateLineItem(transactionId, payload)
      if (!validation.valid) {
        showToast(`خطأ في البيانات: ${validation.errors.join(', ')}`, { severity: 'error' })
        return
      }
      
      const newCode = await lineItemsUIService.createParentLineItem(payload)
      
      // Reload data
      await loadLineItems()
      
      showToast(`تم إضافة العنصر الأساسي بنجاح (كود: ${newCode})`, { severity: 'success' })
      setShowAddDialog(false)
    } catch (error) {
      console.error('❌ Error creating parent item:', error)
      const message = error instanceof Error ? error.message : String(error)
      showToast(`خطأ في إضافة العنصر: ${message}`, { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle Add Child Item (إضافة فرعي - Green button)
   */
  const handleAddChildItem = async (parentCode: string, formData: any) => {
    try {
      setSaving(true)
      
      const payload: CreateLineItemPayload = {
        transaction_id: transactionId,
        parent_code: parentCode,
        line_number: lineItems.length + 1,
        item_name: formData.item_name,
        item_name_ar: formData.item_name_ar || formData.item_name,
        quantity: formData.quantity || 1,
        unit_price: formData.unit_price || 0,
        unit_of_measure: formData.unit_of_measure || 'piece',
        percentage: formData.percentage || 100,
      }
      
      const validation = await lineItemsUIService.validateLineItem(transactionId, payload)
      if (!validation.valid) {
        showToast(`خطأ في البيانات: ${validation.errors.join(', ')}`, { severity: 'error' })
        return
      }
      
      const newCode = await lineItemsUIService.createChildLineItem(payload)
      
      await loadLineItems()
      
      showToast(`تم إضافة العنصر الفرعي بنجاح (كود: ${newCode})`, { severity: 'success' })
      setShowAddDialog(false)
    } catch (error) {
      console.error('❌ Error creating child item:', error)
      const message = error instanceof Error ? error.message : String(error)
      showToast(`خطأ في إضافة العنصر: ${message}`, { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle Toggle Status (تفعيل/تعطيل)
   */
  const handleToggleStatus = async (item: LineItemUINode) => {
    try {
      setSaving(true)
      
      const newStatus = await lineItemsUIService.toggleLineItemStatus(transactionId, item.id)
      await loadLineItems()
      
      const statusText = newStatus ? 'تفعيل' : 'تعطيل'
      showToast(`تم ${statusText} العنصر بنجاح`, { severity: 'success' })
    } catch (error) {
      console.error('❌ Error toggling status:', error)
      const message = error instanceof Error ? error.message : String(error)
      showToast(`خطأ في تغيير الحالة: ${message}`, { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle Delete Item (حذف)
   */
  const handleDeleteItem = async (item: LineItemUINode) => {
    if (!window.confirm(`هل أنت متأكد من حذف "${item.name_ar || item.name}"؟`)) {
      return
    }

    try {
      setSaving(true)
      
      await lineItemsUIService.deleteLineItem(transactionId, item.id)
      await loadLineItems()
      
      showToast('تم حذف العنصر بنجاح', { severity: 'success' })
    } catch (error) {
      console.error('❌ Error deleting item:', error)
      const message = error instanceof Error ? error.message : String(error)
      showToast(`خطأ في الحذف: ${message}`, { severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle Search
   */
  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    
    if (!term.trim()) {
      await loadLineItems()
      return
    }

    try {
      const searchResults = await lineItemsUIService.searchLineItems(transactionId, term)
      setLineItems(searchResults)
    } catch (error) {
      console.error('❌ Error searching:', error)
      const message = error instanceof Error ? error.message : String(error)
      showToast(`خطأ في البحث: ${message}`, { severity: 'error' })
    }
  }

  /**
   * Toggle node expansion
   */
  const toggleNodeExpansion = async (item: LineItemUINode) => {
    const newExpanded = new Set(expandedNodes)
    
    if (expandedNodes.has(item.id)) {
      newExpanded.delete(item.id)
    } else {
      newExpanded.add(item.id)
      
      // Load children if not already loaded
      try {
        const children = await lineItemsUIService.loadChildLineItems(transactionId, item.code)
        // In a full implementation, you'd merge children into the tree structure
        console.log('Loaded children:', children)
      } catch (error) {
        console.error('Error loading children:', error)
      }
    }
    
    setExpandedNodes(newExpanded)
  }

  return (
    <div className="line-items-tree-view">
      {/* Header with statistics and actions */}
      <div className="tree-header flex-row items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="stats flex-row gap-6">
          <div className="stat">
            <span className="text-sm text-gray-600">إجمالي البنود:</span>
            <span className="font-bold text-lg ml-2">{stats.totalItems}</span>
          </div>
          <div className="stat">
            <span className="text-sm text-gray-600">البنود الجذرية:</span>
            <span className="font-bold text-lg ml-2">{stats.rootItems}</span>
          </div>
          <div className="stat">
            <span className="text-sm text-gray-600">أقصى عمق:</span>
            <span className="font-bold text-lg ml-2">{stats.maxDepth}</span>
          </div>
          <div className="stat">
            <span className="text-sm text-gray-600">القيمة الإجمالية:</span>
            <span className="font-bold text-lg ml-2">{stats.totalValue.toFixed(2)} ر.س</span>
          </div>
        </div>

        <div className="actions flex-row gap-2">
          {/* إضافة أصل - Add Parent Item (Orange button from your UI) */}
          <button
            className="btn bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
            onClick={() => {
              setAddDialogType('parent')
              setAddDialogParentCode(null)
              setShowAddDialog(true)
            }}
            disabled={disabled || saving}
            title="إضافة عنصر أساسي جديد"
          >
            📋 إضافة أصل
          </button>
          
          {/* Search */}
          <div className="search-box">
            <input
              type="text"
              placeholder="البحث في البنود..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="px-3 py-2 border rounded-md"
              disabled={disabled || loading}
            />
          </div>
          
          {/* Refresh */}
          <button
            className="btn btn-secondary"
            onClick={loadLineItems}
            disabled={disabled || loading}
            title="تحديث البيانات"
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-state text-center py-8">
          <div className="text-lg">جاري التحميل...</div>
        </div>
      )}

      {/* Tree content */}
      {!loading && (
        <div className="tree-content">
          {lineItems.length === 0 ? (
            <div className="empty-state text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">لا توجد بنود معاملة</h3>
              <p className="text-gray-600 mb-4">ابدأ بإضافة بند جديد لهذه المعاملة</p>
              <button
                className="btn bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg"
                onClick={() => {
                  setAddDialogType('parent')
                  setAddDialogParentCode(null)
                  setShowAddDialog(true)
                }}
                disabled={disabled}
              >
                ➕ إضافة أول بند
              </button>
            </div>
          ) : (
            <div className="tree-items">
              {lineItems.map(item => (
                <TreeNodeComponent
                  key={item.id}
                  item={item}
                  expanded={expandedNodes.has(item.id)}
                  onToggleExpand={() => toggleNodeExpansion(item)}
                  onAddChild={() => {
                    setAddDialogType('child')
                    setAddDialogParentCode(item.code)
                    setShowAddDialog(true)
                  }}
                  onToggleStatus={() => handleToggleStatus(item)}
                  onDelete={() => handleDeleteItem(item)}
                  disabled={disabled || saving}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Dialog - In a real implementation, this would be a proper modal */}
      {showAddDialog && (
        <AddItemDialog
          type={addDialogType}
          parentCode={addDialogParentCode ?? undefined}
          onSubmit={(formData, parentCode) => {
            if (addDialogType === 'parent') {
              return handleAddParentItem(formData)
            }
            const effectiveParent = parentCode ?? addDialogParentCode
            if (!effectiveParent) {
              showToast('يجب اختيار عنصر أساسي لإضافة بند فرعي', { severity: 'warning' })
              return
            }
            return handleAddChildItem(effectiveParent, formData)
          }}
          onCancel={() => setShowAddDialog(false)}
          saving={saving}
        />
      )}
    </div>
  )
}

/**
 * Individual tree node component
 */
interface TreeNodeProps {
  item: LineItemUINode
  expanded: boolean
  onToggleExpand: () => void
  onAddChild: () => void
  onToggleStatus: () => void
  onDelete: () => void
  disabled: boolean
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
  item,
  expanded,
  onToggleExpand,
  onAddChild,
  onToggleStatus,
  onDelete,
  disabled
}) => {
  return (
    <div className={`tree-node ${item.status === 'inactive' ? 'inactive' : ''}`}>
      <div className="node-content flex-row items-center justify-between p-3 border rounded-lg mb-2 hover:bg-gray-50">
        <div className="node-info flex-row items-center gap-4">
          {/* Expand/Collapse button */}
          {item.has_children && (
            <button onClick={onToggleExpand} className="expand-btn">
              {expanded ? '📂' : '📁'}
            </button>
          )}
          
          {/* Item details */}
          <div className="item-details">
            <div className="flex-row items-center gap-2">
              <span className="item-code font-mono bg-gray-200 px-2 py-1 rounded text-sm">
                {item.code}
              </span>
              <span className="item-name font-semibold">
                {item.name_ar || item.name}
              </span>
              {item.status === 'inactive' && (
                <span className="status-badge bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                  معطل
                </span>
              )}
            </div>
            <div className="item-meta text-sm text-gray-600 mt-1">
              الكمية: {item.quantity} | السعر: {item.unit_price} | الإجمالي: {item.total_amount.toFixed(2)} ر.س
            </div>
          </div>
        </div>

        <div className="node-actions flex-row gap-2">
          {/* إضافة فرعي - Add Child (Green button from your UI) */}
          <button
            className="btn bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
            onClick={onAddChild}
            disabled={disabled}
            title="إضافة عنصر فرعي"
          >
            ➕ إضافة فرعي
          </button>
          
          {/* تفعيل/تعطيل - Toggle Status */}
          <button
            className={`btn px-3 py-1 rounded text-sm ${
              item.status === 'active' 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
            onClick={onToggleStatus}
            disabled={disabled}
            title={item.status === 'active' ? 'تعطيل' : 'تفعيل'}
          >
            {item.status === 'active' ? '⏸️ تعطيل' : '▶️ تفعيل'}
          </button>
          
          {/* حذف - Delete */}
          <button
            className="btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
            onClick={onDelete}
            disabled={disabled || item.has_children}
            title={item.has_children ? 'لا يمكن حذف عنصر له فروع' : 'حذف'}
          >
            🗑️ حذف
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Add Item Dialog - Simplified version
 */
interface AddItemDialogProps {
  type: 'parent' | 'child'
  parentCode?: string
  onSubmit: (formData: any, parentCode?: string) => void
  onCancel: () => void
  saving: boolean
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  type,
  parentCode,
  onSubmit,
  onCancel,
  saving
}) => {
  const [formData, setFormData] = useState({
    item_name: '',
    item_name_ar: '',
    quantity: 1,
    unit_price: 0,
    unit_of_measure: 'piece'
  })
  const [localParentCode, setLocalParentCode] = useState(parentCode ?? '')

  useEffect(() => {
    setLocalParentCode(parentCode ?? '')
  }, [parentCode])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">
          {type === 'parent' ? 'إضافة عنصر أساسي جديد' : 'إضافة عنصر فرعي جديد'}
        </h3>
        
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const effectiveParent = type === 'child' ? (localParentCode || parentCode || undefined) : undefined
            onSubmit(formData, effectiveParent)
          }}
          className="space-y-4"
        >
          {type === 'child' && (
            <input
              type="text"
              placeholder="كود العنصر الأساسي"
              value={localParentCode}
              onChange={(e) => setLocalParentCode(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
              disabled={Boolean(parentCode)}
            />
          )}
          <input
            type="text"
            placeholder="اسم البند"
            value={formData.item_name}
            onChange={(e) => setFormData({...formData, item_name: e.target.value})}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          
          <input
            type="number"
            placeholder="الكمية"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
            className="w-full px-3 py-2 border rounded-md"
            min="0"
            step="0.001"
          />
          
          <input
            type="number"
            placeholder="سعر الوحدة"
            value={formData.unit_price}
            onChange={(e) => setFormData({...formData, unit_price: Number(e.target.value)})}
            className="w-full px-3 py-2 border rounded-md"
            min="0"
            step="0.01"
          />
          
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md"
              disabled={saving}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-md"
              disabled={saving}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LineItemsTreeView