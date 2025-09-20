import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Edit2, Trash2, X, RefreshCw, Search } from 'lucide-react'
import { lineItemsUIService } from '../../services/line-items-ui'
import { LineItemsTreeView } from '../../components/LineItems/LineItemsTreeView'
import type { LineItemUINode, CreateLineItemPayload, UpdateLineItemPayload } from '../../services/line-items-ui'
import { useToast } from '../../contexts/ToastContext'

const AssignCostAnalysis: React.FC = () => {
  const [orgId, setOrgId] = useState<string>('')
  const [currentTransactionId, setCurrentTransactionId] = useState<string>('')
  const [availableTransactions, setAvailableTransactions] = useState<{ id: string; entry_number: string; description: string }[]>([])
  const [stats, setStats] = useState<{ totalItems: number; rootItems: number; maxDepth: number; totalValue: number }>({
    totalItems: 0, rootItems: 0, maxDepth: 0, totalValue: 0
  })
  
  const { showToast } = useToast()

  // Load organization and available transactions
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { getActiveOrgId } = await import('../../utils/org')
        const id = getActiveOrgId() || ''
        if (mounted) {
          setOrgId(id)
          await loadAvailableTransactions(id)
        }
      } catch {
        if (mounted) setOrgId('')
      }
    })()
    return () => { mounted = false }
  }, [])

  // Load available transactions for the organization
  const loadAvailableTransactions = async (orgId: string) => {
    try {
      const { supabase } = await import('../../utils/supabase')
      const { data, error } = await supabase
        .from('transactions')
        .select('id, entry_number, description')
        .eq('org_id', orgId)
        .order('entry_number', { ascending: true })
        .limit(100)
      
      if (error) throw error
      setAvailableTransactions(data || [])
      
      // Select the first transaction by default for editing
      if (data && data.length > 0 && !currentTransactionId) {
        setCurrentTransactionId(data[0].id)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
      setAvailableTransactions([])
    }
  }

  // Handle line items changes callback from TreeView
  const handleLineItemsChange = (items: LineItemUINode[]) => {
    // Update statistics when items change
    const totalItems = items.length
    const rootItems = items.filter(item => !item.parent_id).length
    const totalValue = items.reduce((sum, item) => sum + item.total_amount, 0)
    
    setStats({ totalItems, rootItems, maxDepth: 0, totalValue })
    
    console.log('✅ Line items updated:', { totalItems, rootItems, totalValue })
  }

  return (
    <div className="page-root flex-col gap-4">
      <div className="page-header flex-row items-center justify-between">
        <div>
          <h2 className="text-title">تسجيل التكاليف</h2>
          <div className="text-secondary flex-row gap-4 items-center">
            <span>إنشاء وتعديل وحذف بنود المعاملات بعرض هرمي</span>
            {stats.totalItems > 0 && (
              <div className="flex-row gap-4 text-sm">
                <span className="badge bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  إجمالي البنود: {stats.totalItems}
                </span>
                <span className="badge bg-green-100 text-green-800 px-2 py-1 rounded">
                  البنود الرئيسية: {stats.rootItems}
                </span>
                <span className="badge bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  إجمالي القيمة: {stats.totalValue.toFixed(2)} ر.س
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-row gap-2 items-center">
          {/* Transaction Selection */}
          <select 
            className="field w-64"
            value={currentTransactionId}
            onChange={(e) => setCurrentTransactionId(e.target.value)}
          >
            <option value="">اختر معاملة لتسجيل التكاليف...</option>
            {availableTransactions.map(tx => (
              <option key={tx.id} value={tx.id}>
                {tx.entry_number} - {tx.description || 'بلا وصف'}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {!currentTransactionId ? (
        <div className="empty-state text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold mb-2">اختر معاملة لبدء تسجيل التكاليف</h3>
          <p className="text-gray-600 mb-4">
            يمكنك إضافة وتعديل وحذف بنود المعاملات بعرض هرمي متقدم
          </p>
        </div>
      ) : (
        <LineItemsTreeView
          transactionId={currentTransactionId}
          orgId={orgId}
          onLineItemsChange={handleLineItemsChange}
        />
      )}
    </div>
  )
}

export default AssignCostAnalysis