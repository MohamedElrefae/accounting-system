import React, { useState } from 'react'
import type { EditableTxLineItem } from '../../services/transaction-line-items-enhanced'
import CostAnalysisModal from '../Transactions/CostAnalysisModal'

export interface TransactionLineItemsEditorProps {
  transactionLineId: string
  orgId: string
  items: EditableTxLineItem[]
  onChange: (items: EditableTxLineItem[]) => void
  disabled?: boolean
  // Cost analysis data
  workItems?: Array<{ id: string; code: string; name: string }>
  analysisItems?: Record<string, { code: string; name: string }>
  costCenters?: Array<{ id: string; code: string; name: string }>
  itemCatalog?: Record<string, { code: string; name: string; description?: string }>
  transactionLineDefaults?: {
    work_item_id?: string | null
    analysis_work_item_id?: string | null
    sub_tree_id?: string | null
  }
}

/**
 * 🚀 ENHANCED TRANSACTION LINE ITEMS EDITOR
 * ==========================================
 * 
 * Modern replacement for the deprecated LineItemsEditor.
 * Uses the optimized transaction_line_items system with:
 * ✅ Automatic calculation with triggers
 * ✅ Enhanced validation
 * ✅ Better UX with tokenized styling
 * ✅ Real-time total updates
 */
export const TransactionLineItemsEditor: React.FC<TransactionLineItemsEditorProps> = ({
  transactionLineId: _transactionLineId,
  orgId: _orgId,
  items,
  onChange,
  disabled = false,
  workItems,
  analysisItems,
  costCenters,
  itemCatalog,
  transactionLineDefaults,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [costModalOpen, setCostModalOpen] = useState(false)
  const [selectedItemForCost, setSelectedItemForCost] = useState<EditableTxLineItem | null>(null)

  // Calculate totals
  const calculateLineTotal = (item: EditableTxLineItem): number => {
    const qty = Number(item.quantity || 0)
    const pct = Number(item.percentage == null ? 100 : item.percentage)
    const price = Number(item.unit_price || 0)
    return qty * (pct / 100) * price
  }

  const grandTotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0)

  // Add new line item
  const addItem = () => {
    const maxLineNumber = items.reduce((max, item) => Math.max(max, item.line_number), 0)
    const newItem: EditableTxLineItem = {
      line_number: maxLineNumber + 1,
      quantity: 1,
      percentage: 100,
      unit_price: 0,
      unit_of_measure: 'piece',
      item_code: '',
      item_name: '',
      analysis_work_item_id: null,
      sub_tree_id: null,
    }
    onChange([...items, newItem])
  }

  // Update item
  const updateItem = (index: number, updates: Partial<EditableTxLineItem>) => {
    const newItems = items.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    )
    onChange(newItems)
  }

  // Remove item
  const removeItem = (index: number) => {
    if (window.confirm('هل تريد حذف هذا البند؟')) {
      const newItems = items.filter((_, i) => i !== index)
      // Renumber line items
      const renumbered = newItems.map((item, i) => ({ ...item, line_number: i + 1 }))
      onChange(renumbered)
    }
  }

  // Duplicate item
  const duplicateItem = (index: number) => {
    const itemToDuplicate = items[index]
    const maxLineNumber = items.reduce((max, item) => Math.max(max, item.line_number), 0)
    const duplicated: EditableTxLineItem = {
      ...itemToDuplicate,
      id: undefined, // Remove ID so it's treated as new
      line_number: maxLineNumber + 1,
      item_name: `${itemToDuplicate.item_name} (نسخة)`,
    }
    onChange([...items, duplicated])
  }

  return (
    <div className="transaction-line-items-editor">
      {/* Header with controls */}
      <div className="editor-header flex-row items-center justify-between mb-4">
        <div className="flex-row items-center gap-4">
          <h4 className="text-title m-0">بنود المعاملة</h4>
          <div className="text-secondary text-sm">
            العدد: {items.length} • الإجمالي: {grandTotal.toFixed(2)} ر.س
          </div>
        </div>
        <div className="flex-row items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '🔽 إخفاء المتقدم' : '🔼 إظهار المتقدم'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={addItem}
            disabled={disabled}
          >
            ➕ إضافة بند
          </button>
        </div>
      </div>

      {/* Items table */}
      {items.length === 0 ? (
        <div className="empty-state text-center py-8">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-title mb-2">لا توجد بنود</h3>
          <p className="text-secondary mb-4">ابدأ بإضافة بند جديد لهذه المعاملة</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={addItem}
            disabled={disabled}
          >
            ➕ إضافة أول بند
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-right text-sm font-semibold text-gray-700">#</th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700">كود البند</th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700">اسم البند</th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700">الكمية</th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700">النسبة%</th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700">سعر الوحدة</th>
                {showAdvanced && (
                  <th className="p-3 text-right text-sm font-semibold text-gray-700">وحدة القياس</th>
                )}
                <th className="p-3 text-right text-sm font-semibold text-gray-700">التحليل</th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700">الإجمالي</th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700">العمليات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const lineTotal = calculateLineTotal(item)
                
                // Get cost analysis labels
                const workItem = workItems?.find(w => w.id === item.work_item_id)
                const analysisItem = analysisItems?.[item.analysis_work_item_id || '']
                const costCenter = costCenters?.find(c => c.id === item.sub_tree_id)
                
                const hasCostAnalysis = workItem || analysisItem || costCenter
                
                return (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-600">{item.line_number}</td>
                    
                    {/* Item Code */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.item_code || ''}
                        onChange={(e) => updateItem(index, { item_code: e.target.value })}
                        className="field w-full"
                        placeholder="رمز البند"
                        disabled={disabled}
                      />
                    </td>
                    
                    {/* Item Name */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.item_name || ''}
                        onChange={(e) => updateItem(index, { item_name: e.target.value })}
                        className="field w-full"
                        placeholder="اسم البند"
                        disabled={disabled}
                      />
                    </td>
                    
                    {/* Quantity */}
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                        className="field w-20"
                        disabled={disabled}
                      />
                    </td>
                    
                    {/* Percentage */}
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="999.99"
                        value={item.percentage ?? 100}
                        onChange={(e) => updateItem(index, { percentage: Number(e.target.value) || 100 })}
                        className="field w-20"
                        disabled={disabled}
                      />
                    </td>
                    
                    {/* Unit Price */}
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) || 0 })}
                        className="field w-24"
                        disabled={disabled}
                      />
                    </td>
                    
                    {/* Advanced fields */}
                    {showAdvanced && (
                      <td className="p-3">
                        <select
                          value={item.unit_of_measure || 'piece'}
                          onChange={(e) => updateItem(index, { unit_of_measure: e.target.value })}
                          className="field w-24"
                          disabled={disabled}
                        >
                          <option value="piece">قطعة</option>
                          <option value="meter">متر</option>
                          <option value="kg">كيلو</option>
                          <option value="liter">لتر</option>
                          <option value="hour">ساعة</option>
                          <option value="day">يوم</option>
                          <option value="set">طقم</option>
                          <option value="box">صندوق</option>
                        </select>
                      </td>
                    )}
                    
                    {/* Cost Analysis Display */}
                    <td className="p-3">
                      {hasCostAnalysis ? (
                        <div className="flex flex-col gap-1 text-xs">
                          {workItem && (
                            <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              📌 {workItem.code}
                            </div>
                          )}
                          {analysisItem && (
                            <div className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                              🔍 {analysisItem.code}
                            </div>
                          )}
                          {costCenter && (
                            <div className="px-2 py-1 bg-green-100 text-green-800 rounded">
                              🏢 {costCenter.code}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">—</div>
                      )}
                    </td>
                    
                    {/* Total */}
                    <td className="p-3">
                      <div className="text-sm font-semibold text-green-600">
                        {lineTotal.toFixed(2)} ر.س
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItemForCost(item)
                            setCostModalOpen(true)
                          }}
                          className="btn btn-ghost btn-sm text-green-600 hover:text-green-800"
                          title="تحديد التكاليف - Cost Analysis"
                          disabled={disabled}
                        >
                          💰
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateItem(index)}
                          className="btn btn-ghost btn-sm text-blue-600 hover:text-blue-800"
                          title="تكرار البند"
                          disabled={disabled}
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="btn btn-ghost btn-sm text-red-600 hover:text-red-800"
                          title="حذف البند"
                          disabled={disabled}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            
            {/* Footer with totals */}
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={showAdvanced ? 9 : 6} className="p-3 text-right">
                  الإجمالي العام:
                </td>
                <td className="p-3 text-green-600">
                  {grandTotal.toFixed(2)} ر.س
                </td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Summary info */}
      {items.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="flex justify-between items-center mb-2">
              <span>📊 ملخص البنود:</span>
              <span className="font-semibold">{items.length} بند</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span>💰 المبلغ الإجمالي:</span>
              <span className="font-semibold">{grandTotal.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between items-center">
              <span>📈 متوسط البند:</span>
              <span className="font-semibold">{(grandTotal / items.length).toFixed(2)} ر.س</span>
            </div>
          </div>
        </div>
      )}

      {/* Cost Analysis Modal */}
      <CostAnalysisModal
        item={selectedItemForCost}
        isOpen={costModalOpen}
        onClose={() => {
          setCostModalOpen(false)
          setSelectedItemForCost(null)
        }}
        onSave={(updatedItem) => {
          // Find and update the item in the list
          const index = items.findIndex(i => i.id === updatedItem.id)
          if (index !== -1) {
            const newItems = [...items]
            newItems[index] = updatedItem
            onChange(newItems)
          }
        }}
        workItems={workItems || []}
        analysisItems={analysisItems || {}}
        costCenters={costCenters || []}
        itemCatalog={itemCatalog}
        transactionLineDefaults={transactionLineDefaults}
      />
    </div>
  )
}

export default TransactionLineItemsEditor
