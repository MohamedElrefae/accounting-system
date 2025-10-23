import React, { useEffect, useMemo, useRef, useState } from 'react'
import './TransactionAnalysisModal.css'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns } from '../../hooks/useUniversalExport'
import type { UniversalTableData } from '../../utils/UniversalExportManager'
import { listLineItems, upsertLineItems, bulkReplaceLineItems, computeLineTotal, validateItems, deleteLineItem, type TransactionLineItem } from '../../services/cost-analysis'
import { supabase } from '../../utils/supabase'
import { listAnalysisWorkItems } from '../../services/analysis-work-items'
import { getCompanyConfig } from '../../services/company-config'
import { lineItemsCatalogService, type CatalogSelectorItem } from '../../services/line-items-catalog'
import { getExpensesCategoriesList } from '../../services/sub-tree'
import { listWorkItemsUnion } from '../../services/work-items'
import { SearchableDropdown } from '../Common/SearchableDropdown'

// Types for the analysis data
interface TransactionAnalysisDetail {
  entry_number?: string
  description?: string
  transaction_amount?: number
  transaction_line_items_total?: number
  transaction_line_items_count?: number
  variance_amount?: number
  variance_pct?: number
  is_matched?: boolean
  needs_attention?: boolean
}

interface AnalysisWorkItem {
  id: string
  code: string
  name: string
}

interface ExpenseCategory {
  id: string
  code: string
  description: string
}

// Real API functions
async function getTransactionAnalysisDetail(transactionId: string): Promise<TransactionAnalysisDetail> {
  try {
    const { data, error } = await supabase
      .rpc('get_transaction_analysis_detail', { p_transaction_id: transactionId })
    if (error) throw error
    return data?.[0] || {
      entry_number: '',
      description: '',
      transaction_amount: 0,
      transaction_line_items_total: 0,
      transaction_line_items_count: 0,
      variance_amount: 0,
      variance_pct: 0,
      is_matched: true,
      needs_attention: false
    }
  } catch (error) {
    console.error('Error fetching transaction analysis detail:', error)
    // Fallback: get basic transaction info
    const { data: txData } = await supabase
      .from('transactions')
      .select('entry_number, description, amount')
      .eq('id', transactionId)
      .single()
    
    const lineItems = await listLineItems(transactionId)
    const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    const variance = (txData?.amount || 0) - lineItemsTotal
    
    return {
      entry_number: txData?.entry_number || '',
      description: txData?.description || '',
      transaction_amount: txData?.amount || 0,
      transaction_line_items_total: lineItemsTotal,
      transaction_line_items_count: lineItems.length,
      variance_amount: variance,
      variance_pct: txData?.amount ? (variance / txData.amount) * 100 : 0,
      is_matched: Math.abs(variance) < 1,
      needs_attention: Math.abs(variance) >= 1
    }
  }
}

interface WorkItem {
  id: string
  code: string
  name: string
}

interface Props {
  open: boolean
  transactionId: string | null
  transactionLineId: string | null // Selected GL line to attach/view items
  onClose: () => void
  // Optional: pass known fields to avoid initial blank header
  entryNumber?: string
  description?: string
  effectiveTolerance?: number
  // Additional props for full functionality
  transactionAmount?: number
  orgId?: string
  // Cost dimension data for dropdowns
  workItems?: WorkItem[]
}

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen' | 'custom'

type ModalConfig = {
  size: ModalSize
  defaultTab: 'header' | 'line_items' | 'by_item' | 'by_cost_center' | 'by_category'
  showExport: boolean
}

// Currency formatting function
const formatCurrency = (amount: number | null | undefined, currencyCode = 'SAR') => {
  if (amount == null) return '0.00'
  try {
    const formatted = amount.toLocaleString('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    const symbol = currencyCode === 'SAR' ? 'ر.س' : currencyCode
    return `${formatted} ${symbol}`
  } catch {
    return `${amount || 0} ${currencyCode === 'SAR' ? 'ر.س' : currencyCode}`
  }
}

const formatNumber = (n: number | null | undefined) => {
  if (n == null) return '0'
  try {
    return n.toLocaleString('ar-SA', { maximumFractionDigits: 2 })
  } catch {
    return String(n || 0)
  }
}

const TransactionAnalysisModal: React.FC<Props> = ({ 
  open, 
  transactionId, 
  transactionLineId,
  onClose, 
  entryNumber, 
  description, 
  effectiveTolerance,
  transactionAmount,
  orgId,
  workItems = [],
  costCenters = []
}) => {
  const [loading, setLoading] = useState(false)
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [data, setData] = useState<TransactionAnalysisDetail | null>(null)
  // Modal configuration (persisted)
  const storageKey = 'tx-analysis-modal-config'
  const loadConfig = (): ModalConfig => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) return JSON.parse(raw) as ModalConfig
    } catch { /* ignore */ }
    return { size: 'xl', defaultTab: 'line_items', showExport: true }
  }
  const [config, setConfig] = useState<ModalConfig>(loadConfig())
  const [showSettings, setShowSettings] = useState(false)
  // Custom size state for drag-resize
  const loadCustomSize = () => {
    try { const raw = localStorage.getItem(storageKey + ':customSize'); if (raw) return JSON.parse(raw) as { w: number; h: number } } catch {}
    return { w: 1100, h: 850 }
  }
  const [customSize, setCustomSize] = useState<{ w: number; h: number }>(loadCustomSize())
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number; axis: 'both' | 'x' | 'y' } | null>(null)
  const [showSizeBadge, setShowSizeBadge] = useState(false)
  const [preResizeSize, setPreResizeSize] = useState<{ w: number; h: number } | null>(null)
  // Drag state for moving the window
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const { w, h } = loadCustomSize()
    const cx = Math.max(0, Math.floor((window.innerWidth - w) / 2))
    const cy = Math.max(0, Math.floor((window.innerHeight - h) / 2))
    return { x: cx, y: cy }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; origX: number; origY: number }>({ x: 0, y: 0, origX: 0, origY: 0 })

  const [tab, setTab] = useState<'header' | 'line_items' | 'by_item' | 'by_cost_center' | 'by_category'>(loadConfig().defaultTab)
  const [lineItems, setLineItems] = useState<TransactionLineItem[]>([])
  const [analysisWorkItems, setAnalysisWorkItems] = useState<AnalysisWorkItem[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [loadedWorkItems, setLoadedWorkItems] = useState<WorkItem[]>([])
  const [loadedSubTree, setLoadedSubTree] = useState<any[]>([])
  const [currency, setCurrency] = useState<string>('SAR')
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [rowsByItem, setRowsByItem] = useState<Array<{ analysis_work_item_id: string; analysis_work_item_code: string; analysis_work_item_name: string; amount: number }>>([])
  const [rowsByCC, setRowsByCC] = useState<Array<{ cost_center_id: string; cost_center_code: string; cost_center_name: string; amount: number }>>([])
  const [rowsByCat, setRowsByCat] = useState<Array<{ expenses_category_id: string; expenses_category_code: string; expenses_category_name: string; amount: number }>>([])
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  
  // State for cost dimension editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingDimensions, setEditingDimensions] = useState<{
    work_item_id: string | null
    analysis_work_item_id: string | null
    sub_tree_id: string | null
  } | null>(null)


  const lastLoadKeyRef = useRef<string>('')
  useEffect(() => {
    let cancelled = false
    const key = `${open}:${transactionId || ''}:${transactionLineId || ''}:${orgId || ''}`
    if (key === lastLoadKeyRef.current) return
    lastLoadKeyRef.current = key

    async function load() {
      if (!open || !transactionId) return
      setLoading(true)
      // Force default to line items tab for clarity
      setTab('line_items')
      setError('')
      try {
        // Resolve effective org id for loading org-scoped resources
        let effectiveOrg = orgId || ''
        if (!effectiveOrg) {
          const { data: tx } = await supabase
            .from('transactions')
            .select('org_id')
            .eq('id', transactionId)
            .single()
          effectiveOrg = tx?.org_id || ''
        }

        // Load all data (skip org-scoped lists if we still lack org)
        const [analysisDetail, lineItemsData, analysisItemsList, workItemsList, subTreeData, categories, companyConfig] = await Promise.all([
          getTransactionAnalysisDetail(transactionId),
          listLineItems(transactionId, transactionLineId || undefined).catch(() => []),
          effectiveOrg ? listAnalysisWorkItems({ orgId: effectiveOrg, includeInactive: false }).catch(() => []) : Promise.resolve([]),
          effectiveOrg ? listWorkItemsUnion(effectiveOrg, null, true).catch(() => []) : Promise.resolve([]),
          effectiveOrg ? getExpensesCategoriesList(effectiveOrg, false).catch(() => []) : Promise.resolve([]),
          Promise.resolve([]),
          getCompanyConfig().catch(() => ({ currency_code: 'SAR' }))
        ])
        
        if (!cancelled) {
          setData(analysisDetail)
          setLineItems(lineItemsData || [])
          setAnalysisWorkItems(analysisItemsList.map(w => ({ id: w.id, code: w.code, name: w.name })))
          setLoadedWorkItems(workItemsList || [])
          setLoadedSubTree(subTreeData || [])
          setExpenseCategories(categories.map(c => ({ id: c.id, code: c.code, description: c.description })))
          setCurrency(companyConfig.currency_code || 'SAR')
          
          // Process breakdown data
          setRowsByItem([])
          setRowsByCC([])
          setRowsByCat([])
        }
      } catch (e: unknown) {
        const error = e as { message?: string };
        if (!cancelled) setError(error?.message || 'حدث خطأ أثناء تحميل التحليل')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    
    // Close on Escape
    const onKey = (ev: KeyboardEvent) => {
      if (!open) return
      if (ev.key === 'Escape') {
        try { onClose() } catch { /* ignore close errors */ }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { cancelled = true; window.removeEventListener('keydown', onKey) }
  }, [open, transactionId, transactionLineId, orgId])

  // Recenter the modal when opening or when switching size preset
  useEffect(() => {
    if (!open) return
    const dims = (() => {
      if (config.size === 'custom') return { w: customSize.w, h: customSize.h }
      const w = config.size === 'sm' ? 640 : config.size === 'md' ? 860 : config.size === 'lg' ? 1060 : config.size === 'xl' ? 1300 : Math.round(window.innerWidth * 0.98)
      const h = config.size === 'fullscreen' ? Math.round(window.innerHeight * 0.96) : Math.round(window.innerHeight * 0.90)
      return { w, h }
    })()
    const cx = Math.max(0, Math.floor((window.innerWidth - dims.w) / 2))
    const cy = Math.max(0, Math.floor((window.innerHeight - dims.h) / 2))
    setPosition({ x: cx, y: cy })
  }, [open, config.size, customSize.w, customSize.h])

  // Keyboard shortcuts for size presets
  useEffect(() => {
    const presets: ModalSize[] = ['sm','md','lg','xl','fullscreen']
    const onKey = (ev: KeyboardEvent) => {
      if (!open) return
      // Cancel in-progress resize
      if (ev.key === 'Escape' && isResizing) {
        if (preResizeSize) setCustomSize(preResizeSize)
        setIsResizing(false)
        setResizeStart(null)
        setShowSizeBadge(false)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        return
      }
      const ctrlAlt = ev.ctrlKey && ev.altKey
      if (ctrlAlt) {
        if (ev.key === '1') setConfig(p => ({ ...p, size: 'sm' }))
        if (ev.key === '2') setConfig(p => ({ ...p, size: 'md' }))
        if (ev.key === '3') setConfig(p => ({ ...p, size: 'lg' }))
        if (ev.key === '4') setConfig(p => ({ ...p, size: 'xl' }))
        if (ev.key === '5') setConfig(p => ({ ...p, size: 'fullscreen' }))
        if (ev.key === '0') setConfig(p => ({ ...p, size: 'custom' }))
      }
      if (ev.altKey && !ev.ctrlKey && !ev.shiftKey) {
        const idx = presets.indexOf(config.size as any)
        if (ev.key === '=' || ev.key === '+') { // next size
          const next = presets[Math.min((idx >= 0 ? idx + 1 : 0), presets.length - 1)]
          setConfig(p => ({ ...p, size: next }))
        }
        if (ev.key === '-') { // prev size
          const prev = presets[Math.max((idx >= 0 ? idx - 1 : 0), 0)]
          setConfig(p => ({ ...p, size: prev }))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [config.size, open])

  // Persist custom size changes
  useEffect(() => {
    try { localStorage.setItem(storageKey + ':customSize', JSON.stringify(customSize)) } catch {}
  }, [customSize])

  // Drag handlers for moving the modal freely
  useEffect(() => {
    if (!isDragging) return
    const onMove = (ev: MouseEvent) => {
      let nextX = ev.clientX - dragStart.x
      let nextY = ev.clientY - dragStart.y
      if (ev.shiftKey) {
        const dx = nextX - dragStart.origX
        const dy = nextY - dragStart.origY
        if (Math.abs(dx) > Math.abs(dy)) nextY = dragStart.origY
        else nextX = dragStart.origX
      }
      const maxX = Math.max(0, window.innerWidth - (config.size === 'custom' ? customSize.w : Math.min(window.innerWidth * 0.98, customSize.w)))
      const maxY = Math.max(0, window.innerHeight - (config.size === 'custom' ? customSize.h : Math.min(window.innerHeight * 0.96, customSize.h)))
      setPosition({ x: Math.min(Math.max(0, nextX), maxX), y: Math.min(Math.max(0, nextY), maxY) })
    }
    const onUp = () => setIsDragging(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [isDragging, dragStart, customSize.w, customSize.h, config.size])

  // Drag-resize handlers
  useEffect(() => {
    if (!isResizing || !resizeStart) return
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - resizeStart.x
      const dy = ev.clientY - resizeStart.y
      const maxW = Math.round(window.innerWidth * 0.98)
      const maxH = Math.round(window.innerHeight * 0.96)
      const nextWBase = clamp(resizeStart.w + dx, 720, maxW)
      const nextHBase = clamp(resizeStart.h + dy, 480, maxH)
      // Shift-drag to lock axis when using corner handle (both)
      let lockX = false, lockY = false
      if (resizeStart.axis === 'both' && ev.shiftKey) {
        if (Math.abs(dx) >= Math.abs(dy)) lockY = true; else lockX = true
      }
      const nextW = (resizeStart.axis === 'y' || lockX) ? customSize.w : nextWBase
      const nextH = (resizeStart.axis === 'x' || lockY) ? customSize.h : nextHBase
      setCustomSize({ w: nextW, h: nextH })
      setConfig(p => (p.size === 'custom' ? p : { ...p, size: 'custom' }))
      setShowSizeBadge(true)
    }
    const onUp = () => {
      // Snap to grid and optional presets
      const round10 = (n: number) => Math.round(n / 10) * 10
      const snapped = { w: round10(customSize.w), h: round10(customSize.h) }
      // Preset widths to snap to if within 24px
      const presetPairs: Array<{ size: ModalSize; w: number }> = [
        { size: 'sm', w: 640 },
        { size: 'md', w: 860 },
        { size: 'lg', w: 1060 },
        { size: 'xl', w: 1300 },
        { size: 'fullscreen', w: Math.round(window.innerWidth * 0.98) }
      ]
      let snappedSize: ModalSize = 'custom'
      let bestDiff = Infinity
      presetPairs.forEach(p => {
        const diff = Math.abs(snapped.w - p.w)
        if (diff < bestDiff && diff <= 24) { bestDiff = diff; snappedSize = p.size }
      })
      setCustomSize(snapped)
      setConfig(prev => ({ ...prev, size: snappedSize }))

      setIsResizing(false)
      setResizeStart(null)
      setShowSizeBadge(false)
      try { localStorage.setItem(storageKey + ':customSize', JSON.stringify(snapped)) } catch {}
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'nwse-resize'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp, { once: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp as any)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isResizing, resizeStart, customSize, storageKey])

  const header = useMemo(() => {
    return data ?? null
  }, [data])
  
  // Merge work items from props and locally loaded data
  const effectiveWorkItems = useMemo(() => {
    const combined = new Map<string, WorkItem>()
    // Add props-based items first
    workItems.forEach(w => combined.set(w.id, w))
    // Add locally loaded items (will override if same ID)
    loadedWorkItems.forEach(w => combined.set(w.id, w))
    return Array.from(combined.values())
  }, [workItems, loadedWorkItems])
  
  // Effective sub tree list (expenses categories)
  const effectiveSubTree = useMemo(() => loadedSubTree || [], [loadedSubTree])

  // Helper function for unit labels - moved before useMemo hooks to fix hoisting issue
  const getUnitLabel = (unit: string) => {
    const unitLabels: { [key: string]: string } = {
      'piece': 'قطعة',
      'meter': 'متر',
      'kg': 'كيلو',
      'liter': 'لتر',
      'hour': 'ساعة',
      'day': 'يوم',
      'bag': 'شكارة',
      'box': 'صندوق'
    }
    return unitLabels[unit] || unit
  }

  // Export data preparation functions
  const prepareLineItemsExportData = useMemo((): UniversalTableData => {
    const columns = createStandardColumns([
      { key: 'line_number', header: 'رقم البند', type: 'number', width: 80 },
      { key: 'item_name_ar', header: 'اسم البند', type: 'text', width: 200 },
      { key: 'quantity', header: 'الكمية', type: 'number', width: 100 },
      { key: 'percentage', header: 'النسبة %', type: 'number', width: 100 },
      { key: 'unit_price', header: 'سعر الوحدة', type: 'currency', width: 120 },
      { key: 'unit_of_measure', header: 'وحدة القياس', type: 'text', width: 100 },
      { key: 'total_amount', header: 'إجمالي البند', type: 'currency', width: 120 }
    ])

    const rows = lineItems.map(item => ({
      line_number: item.line_number || 0,
      item_name_ar: item.item_name_ar || 'بند غير محدد',
      quantity: item.quantity || 0,
      percentage: item.percentage || 0,
      unit_price: item.unit_price || 0,
      unit_of_measure: getUnitLabel(item.unit_of_measure || 'piece'),
      total_amount: item.total_amount || 0
    }))

    // Add totals row
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    const summaryRow = {
      line_number: '',
      item_name_ar: 'إجمالي بنود التكلفة',
      quantity: lineItems.length,
      percentage: '',
      unit_price: '',
      unit_of_measure: '',
      total_amount: totalAmount
    }

    return {
      columns,
      rows: [...rows, summaryRow],
      summary: {
        totalItems: lineItems.length,
        totalAmount: totalAmount,
        transactionAmount: header?.transaction_amount || transactionAmount || 0,
        variance: (header?.transaction_amount || transactionAmount || 0) - totalAmount
      }
    }
  }, [lineItems, header, transactionAmount])

  const prepareSummaryExportData = useMemo((): UniversalTableData => {
    const txAmount = header?.transaction_amount || transactionAmount || 0
    const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    const variance = txAmount - lineItemsTotal
    const variancePct = txAmount ? (variance / txAmount) * 100 : 0
    const isMatched = Math.abs(variance) < 1.0

    const columns = createStandardColumns([
      { key: 'metric', header: 'البند', type: 'text', width: 200 },
      { key: 'value', header: 'القيمة', type: 'currency', width: 150 },
      { key: 'status', header: 'الحالة', type: 'text', width: 100 }
    ])

    const rows = [
      {
        metric: 'مبلغ المعاملة الأصلي',
        value: txAmount,
        status: '✓ أساسي'
      },
      {
        metric: 'إجمالي بنود التكلفة',
        value: lineItemsTotal,
        status: `${lineItems.length} بند`
      },
      {
        metric: 'قيمة التباين',
        value: Math.abs(variance),
        status: variance > 0 ? 'المعاملة أكبر' : variance < 0 ? 'البنود أكبر' : 'متطابق'
      },
      {
        metric: 'نسبة التباين',
        value: Math.abs(variancePct),
        status: `${formatNumber(Math.abs(variancePct))}%`
      },
      {
        metric: 'حالة المطابقة',
        value: 0,
        status: isMatched ? '✅ متطابق' : '⚠️ غير متطابق'
      }
    ]

    return {
      columns,
      rows,
      summary: {
        transactionAmount: txAmount,
        lineItemsTotal,
        variance,
        variancePercentage: variancePct,
        isMatched,
        lineItemsCount: lineItems.length
      },
      metadata: {
        reportType: 'cost_analysis_summary',
        transactionId: transactionId,
        entryNumber: entryNumber || header?.entry_number,
        description: description || header?.description,
        currency: currency
      }
    }
  }, [lineItems, header, transactionAmount, currency, transactionId, entryNumber, description])

  // Professional print function
  const printCostAnalysis = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const currentDate = new Date().toLocaleDateString('ar-EG')
    const txAmount = header?.transaction_amount || transactionAmount || 0
    const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
    const variance = txAmount - lineItemsTotal
    const isMatched = Math.abs(variance) < 1.0

    const reportHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>تحليل التكلفة والبنود التفصيلية</title>
          <style>
            /* Professional Commercial Cost Analysis Report Styles */
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            body { 
              font-family: 'Arial', 'Tahoma', sans-serif;
              direction: rtl;
              background: white;
              color: black;
              font-size: 12px;
              line-height: 1.4;
              padding: 15mm;
            }
            
            /* Report Header */
            .print-header {
              text-align: center;
              margin-bottom: 25px;
              border: 3px solid #026081;
              padding: 20px;
              background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
              border-radius: 12px;
              color: white;
              box-shadow: 0 6px 16px rgba(2, 96, 129, 0.3);
            }
            
            .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 8px;
              text-transform: uppercase;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .report-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 8px;
              border-bottom: 2px solid rgba(255, 255, 255, 0.3);
              display: inline-block;
              padding-bottom: 4px;
            }
            
            .transaction-info {
              font-size: 14px;
              margin-bottom: 8px;
              background: rgba(0, 0, 0, 0.1);
              padding: 8px;
              border-radius: 6px;
            }
            
            .report-meta {
              font-size: 11px;
              border-top: 1px solid rgba(255, 255, 255, 0.2);
              padding-top: 8px;
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
            }
            
            .meta-item {
              margin: 2px 8px;
            }
            
            /* Variance Status Banner */
            .variance-status {
              margin: 15px 0;
              padding: 12px 20px;
              border-radius: 8px;
              text-align: center;
              font-weight: bold;
              font-size: 16px;
            }
            
            .variance-status.matched {
              background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
              border: 2px solid #22c55e;
              color: #15803d;
            }
            
            .variance-status.unmatched {
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              border: 2px solid #f59e0b;
              color: #92400e;
            }
            
            /* Summary Cards */
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin: 20px 0;
            }
            
            .summary-card {
              border: 2px solid #026081;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            }
            
            .summary-card h4 {
              font-size: 13px;
              color: #64748b;
              margin-bottom: 8px;
              font-weight: 600;
            }
            
            .summary-card .value {
              font-size: 16px;
              font-weight: bold;
              color: #026081;
              font-family: 'Courier New', monospace;
            }
            
            /* Line Items Table */
            .line-items-section {
              margin: 25px 0;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              padding: 8px 15px;
              background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
              color: white;
              border-radius: 6px;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .line-items-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #026081;
              background: white;
              font-size: 11px;
              box-shadow: 0 4px 12px rgba(2, 96, 129, 0.2);
              border-radius: 8px;
              overflow: hidden;
            }
            
            .line-items-table thead {
              background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
            }
            
            .line-items-table th {
              padding: 12px 8px;
              text-align: center;
              font-size: 12px;
              font-weight: bold;
              color: white;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
              border-right: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .line-items-table th:last-child {
              border-right: none;
            }
            
            .line-items-table td {
              padding: 8px;
              border-right: 1px solid #e5e7eb;
              border-bottom: 1px solid #f3f4f6;
              color: #374151;
            }
            
            .line-items-table td:last-child {
              border-right: none;
            }
            
            .line-items-table .total-row {
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              font-weight: bold;
              border-top: 2px solid #f59e0b;
            }
            
            .line-items-table .total-row td {
              color: #92400e;
              font-weight: bold;
            }
            
            .item-number { text-align: center; width: 80px; }
            .item-name { text-align: right; }
            .item-quantity, .item-percentage { text-align: center; width: 100px; }
            .item-price, .item-total { text-align: right; width: 120px; font-family: 'Courier New', monospace; font-weight: bold; }
            .item-unit { text-align: center; width: 100px; }
            
            /* Analysis Section */
            .analysis-section {
              margin: 25px 0;
              border: 2px solid #026081;
              border-radius: 8px;
              overflow: hidden;
            }
            
            .analysis-header {
              background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
              color: white;
              padding: 15px;
              text-align: center;
              font-weight: bold;
              font-size: 16px;
            }
            
            .analysis-content {
              padding: 20px;
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            }
            
            .analysis-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #cbd5e1;
              font-size: 14px;
            }
            
            .analysis-row:last-child {
              border-bottom: none;
              background: linear-gradient(135deg, #026081 0%, #0abbfa 100%);
              color: white;
              font-weight: bold;
              margin: 10px -20px -20px -20px;
              padding: 15px 20px;
            }
            
            .analysis-label {
              flex: 1;
              font-weight: 600;
            }
            
            .analysis-value {
              width: 150px;
              text-align: right;
              font-family: 'Courier New', monospace;
              font-weight: bold;
            }
            
            /* Print Specific */
            @media print {
              body { padding: 10mm; font-size: 10px; }
              .summary-cards { grid-template-columns: repeat(2, 1fr); }
              .line-items-table { font-size: 9px; }
              @page { size: A4; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="company-name">شركة المحاسبة التجارية</div>
            <div class="report-title">تحليل التكلفة والبنود التفصيلية</div>
            <div class="transaction-info">
              ${entryNumber ? `رقم القيد: ${entryNumber}` : header?.entry_number ? `رقم القيد: ${header.entry_number}` : 'رقم القيد: غير محدد'}
              ${description ? ` • ${description}` : header?.description ? ` • ${header.description}` : ''}
            </div>
            <div class="report-meta">
              <span class="meta-item">تاريخ الطباعة: ${currentDate}</span>
              <span class="meta-item">عدد البنود: ${lineItems.length}</span>
              <span class="meta-item">العملة: ${currency}</span>
            </div>
          </div>
          
          <div class="variance-status ${isMatched ? 'matched' : 'unmatched'}">
            ${isMatched 
              ? '✅ المعاملة متطابقة مع بنود التكلفة' 
              : `⚠️ يوجد تباين قدره ${formatCurrency(Math.abs(variance), currency)} (${formatNumber(Math.abs((variance/txAmount)*100))}%)`
            }
          </div>
          
          <div class="summary-cards">
            <div class="summary-card">
              <h4>مبلغ المعاملة الأصلي</h4>
              <div class="value">${formatCurrency(txAmount, currency)}</div>
            </div>
            <div class="summary-card">
              <h4>إجمالي بنود التكلفة</h4>
              <div class="value">${formatCurrency(lineItemsTotal, currency)}</div>
            </div>
            <div class="summary-card">
              <h4>عدد البنود</h4>
              <div class="value">${lineItems.length} بند</div>
            </div>
          </div>
          
          ${lineItems.length > 0 ? `
            <div class="line-items-section">
              <div class="section-title">تفاصيل بنود التكلفة</div>
              <table class="line-items-table">
                <thead>
                  <tr>
                    <th class="item-number">رقم البند</th>
                    <th class="item-name">اسم البند</th>
                    <th class="item-quantity">الكمية</th>
                    <th class="item-percentage">النسبة %</th>
                    <th class="item-price">سعر الوحدة</th>
                    <th class="item-unit">وحدة القياس</th>
                    <th class="item-total">إجمالي البند</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItems.map(item => `
                    <tr>
                      <td class="item-number">${item.line_number || 0}</td>
                      <td class="item-name">${item.item_name_ar || 'بند غير محدد'}</td>
                      <td class="item-quantity">${formatNumber(item.quantity || 0)}</td>
                      <td class="item-percentage">${formatNumber(item.percentage || 0)}%</td>
                      <td class="item-price">${formatCurrency(item.unit_price || 0, currency)}</td>
                      <td class="item-unit">${getUnitLabel(item.unit_of_measure || 'piece')}</td>
                      <td class="item-total">${formatCurrency(item.total_amount || 0, currency)}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="6">إجمالي بنود التكلفة</td>
                    <td class="item-total">${formatCurrency(lineItemsTotal, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ` : ''}
          
          <div class="analysis-section">
            <div class="analysis-header">تحليل التباين والمطابقة</div>
            <div class="analysis-content">
              <div class="analysis-row">
                <div class="analysis-label">مبلغ المعاملة الأصلي</div>
                <div class="analysis-value">${formatCurrency(txAmount, currency)}</div>
              </div>
              <div class="analysis-row">
                <div class="analysis-label">إجمالي بنود التكلفة</div>
                <div class="analysis-value">${formatCurrency(lineItemsTotal, currency)}</div>
              </div>
              <div class="analysis-row">
                <div class="analysis-label">قيمة التباين</div>
                <div class="analysis-value">${formatCurrency(Math.abs(variance), currency)}</div>
              </div>
              <div class="analysis-row">
                <div class="analysis-label">نسبة التباين</div>
                <div class="analysis-value">${formatNumber(Math.abs((variance/txAmount)*100))}%</div>
              </div>
              <div class="analysis-row">
                <div class="analysis-label">حالة المطابقة النهائية</div>
                <div class="analysis-value">${isMatched ? '✅ متطابق' : '⚠️ غير متطابق'}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(reportHTML)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 500)
  }
  
  // Function to add new line item manually
  const addLineItem = () => {
    const newItem: TransactionLineItem = {
      transaction_id: transactionId!,
      transaction_line_id: transactionLineId || undefined,
      line_number: lineItems.length + 1,
      item_code: '',
      item_name: '',
      item_name_ar: '',
      description: '',
      quantity: 1,
      percentage: 100,
      unit_price: 0,
      unit_of_measure: 'piece',
      analysis_work_item_id: null,
      sub_tree_id: null,
      total_amount: 0,
      org_id: orgId
    }
    setLineItems(prev => [...prev, newItem])
    // Auto-select the newly added item
    setSelectedItemIndex(lineItems.length)
  }

  // Catalog items state for dropdown
  const [catalogItems, setCatalogItems] = useState<CatalogSelectorItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  
  
  // Load catalog items when modal opens
  useEffect(() => {
    const loadCatalogItems = async () => {
      if (!open) return
      setLoadingCatalog(true)
      try {
        let effectiveOrgId = orgId || ''
        if (!effectiveOrgId && transactionId) {
          // Fallback: read org_id from the transaction
          const { data: tx, error: txErr } = await supabase
            .from('transactions')
            .select('org_id')
            .eq('id', transactionId)
            .single()
          if (!txErr && tx?.org_id) effectiveOrgId = tx.org_id
        }
        if (!effectiveOrgId) {
          setCatalogItems([])
          return
        }
        const items = await lineItemsCatalogService.toSelectorItems(effectiveOrgId)
        setCatalogItems(items)
      } catch (error) {
        console.error('Failed to load catalog items:', error)
        setCatalogItems([])
      } finally {
        setLoadingCatalog(false)
      }
    }
    
    loadCatalogItems()
  }, [open, orgId, transactionId])
  
  
  // Function to add item from catalog (used by both dropdown and dialog)
  const addFromCatalog = (catalogItemId: string) => {
    const catalogItem = catalogItems.find(item => item.id === catalogItemId)
    if (!catalogItem) return
    
    const newItem: TransactionLineItem = {
      transaction_id: transactionId!,
      transaction_line_id: transactionLineId || undefined,
      line_number: lineItems.length + 1,
      line_item_catalog_id: catalogItem.id,
      item_code: catalogItem.item_code,
      item_name: catalogItem.item_name,
      item_name_ar: catalogItem.item_name_ar,
      description: '',
      quantity: 1,
      percentage: 100,
      unit_price: catalogItem.unit_price || 0,
      unit_of_measure: catalogItem.unit_of_measure || 'piece',
      analysis_work_item_id: null,
      sub_tree_id: null,
      org_id: orgId
    }
    
    setLineItems(prev => [...prev, newItem])
    // Auto-select the newly added item
    setSelectedItemIndex(lineItems.length)
  }
  
  
  // Function to remove line item - delete from DB first if it has an ID
  const removeLineItem = async (index: number) => {
    const item = lineItems[index]
    if (!item) return
    
    // If item has a database ID, delete it first
    if (item.id && item.id !== 'undefined') {
      try {
        await deleteLineItem(item.id)
      } catch (e: any) {
        console.error('Failed to delete line item:', e)
        setError(`فشل حذف البند: ${e.message}`)
        return
      }
    }
    
    // Then remove from local state and renumber
    setLineItems(prev => {
      const filtered = prev.filter((_, i) => i !== index)
      // Renumber the remaining items
      return filtered.map((item, i) => ({ ...item, line_number: i + 1 }))
    })
  }
  
  // Function to duplicate a line item
  const duplicateLineItem = (index: number) => {
    const item = lineItems[index]
    if (!item) return
    
    const duplicated: TransactionLineItem = {
      ...item,
      id: undefined, // Remove ID so it creates new on save
      line_number: lineItems.length + 1,
      created_at: undefined,
      updated_at: undefined
    }
    
    setLineItems(prev => [...prev, duplicated])
    // Auto-scroll to duplicated item
    setTimeout(() => {
      const lastRow = document.querySelector('table tbody tr:last-child')
      lastRow?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }
  
  // Function to bulk delete selected items
  const bulkDeleteSelected = async () => {
    setSaving(true)
    try {
      const indices = Array.from(selectedForDelete).sort((a, b) => b - a) // Delete from end first
      
      for (const idx of indices) {
        const item = lineItems[idx]
        if (item?.id && item.id !== 'undefined') {
          try {
            await deleteLineItem(item.id)
          } catch (e: any) {
            console.error(`Failed to delete item at index ${idx}:`, e)
          }
        }
      }
      
      // Remove from local state and renumber
      setLineItems(prev => {
        const filtered = prev.filter((_, i) => !selectedForDelete.has(i))
        return filtered.map((item, i) => ({ ...item, line_number: i + 1 }))
      })
      
      setSelectedForDelete(new Set())
      setShowBulkDeleteConfirm(false)
    } catch (e: any) {
      console.error('Bulk delete failed:', e)
      setError(`فشل حذف البنود: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }
  
  // Function to update line item
  const updateLineItem = (index: number, updates: Partial<TransactionLineItem>) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, ...updates }
        // Calculate total_amount locally for UI display (database will recalculate on save)
        updated.total_amount = computeLineTotal(
          updated.quantity || 0,
          updated.percentage || 0,
          updated.unit_price || 0
        )
        return updated
      }
      return item
    }))
  }
  
  // Function to save line items
  const saveLineItems = async () => {
    if (!transactionId) return
    setSaving(true)
    try {
      // Validate items before saving
      const { ok, errors } = validateItems(lineItems)
      if (!ok) {
        setError('تحقق من البيانات: ' + errors.join(', '))
        setSaving(false)
        return
      }
      
      // Save to database - use upsert for safe insert/update
      // This preserves existing items and only adds/modifies what's needed
      // Items deleted from UI are gone (removeLineItem already removed them from state)
      await upsertLineItems(transactionId, lineItems, { transactionLineId: transactionLineId || undefined })
      
      // Reload data to verify persistence
      const [analysisDetail, lineItemsData] = await Promise.all([
        getTransactionAnalysisDetail(transactionId),
        listLineItems(transactionId, transactionLineId || undefined)
      ])
      setData(analysisDetail)
      setLineItems(lineItemsData)
      setError('') // Clear any previous errors
      
      // Show success and switch to header tab
      setTimeout(() => setTab('header'), 500)
    } catch (e: any) {
      console.error('Error saving line items:', e)
      setError(e.message || 'فشل في حفظ بنود التكلفة')
    } finally {
      setSaving(false)
    }
  }

  // Function to save cost dimensions for a single line item
  const saveCostDimension = async (lineItemId: string, updatedItem: TransactionLineItem) => {
    // Only save if the item has a valid ID (was already saved to DB)
    if (!lineItemId || lineItemId === 'undefined' || typeof lineItemId !== 'string' || lineItemId.trim() === '') {
      console.warn('Skipping cost dimension save for unsaved item (no ID)')
      return
    }
    
    try {
      const { error } = await supabase
        .from('transaction_line_items')
        .update({
          work_item_id: updatedItem.work_item_id || null,
          analysis_work_item_id: updatedItem.analysis_work_item_id || null,
          sub_tree_id: updatedItem.sub_tree_id || null
        })
        .eq('id', lineItemId)

      if (error) throw error
      // Success - item saved to database
    } catch (e: any) {
      console.error('Failed to save cost dimension:', e.message)
      setError(`Failed to save cost dimension: ${e.message}`)
    }
  }

  // Totals for breakdowns - must be called before any early returns
  const totalByItem = useMemo(() => rowsByItem.reduce((s, r) => s + (r?.amount || 0), 0), [rowsByItem])
  const totalByCC = useMemo(() => rowsByCC.reduce((s, r) => s + (r?.amount || 0), 0), [rowsByCC])
  const totalByCat = useMemo(() => rowsByCat.reduce((s, r) => s + (r?.amount || 0), 0), [rowsByCat])

  if (!open) return null

  // Compute modal dimensions based on config.size
  const presetLabel = (sz: ModalSize) => sz === 'sm' ? 'صغير' : sz === 'md' ? 'متوسط' : sz === 'lg' ? 'كبير' : sz === 'xl' ? 'واسع' : sz === 'fullscreen' ? 'ملء الشاشة' : 'مخصص'

  const getModalWidth = () => {
    if (config.size === 'custom') return `${customSize.w}px`
    switch (config.size) {
      case 'sm': return '640px'
      case 'md': return '860px'
      case 'lg': return '1060px'
      case 'xl': return '1300px'
      case 'fullscreen': return '98vw'
      default: return '1200px'
    }
  }
  const getModalHeight = () => config.size === 'fullscreen' ? '96vh' : (config.size === 'custom' ? `${customSize.h}px` : '90vh')

  return (
    <div className="transaction-modal" role="dialog" aria-modal="true" dir="rtl" 
         onClick={onClose} style={{ 
           position: 'fixed', 
           inset: 0, 
           backgroundColor: 'rgba(0, 0, 0, 0.75)', 
           zIndex: 1000,
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center'
         }}>
      <div ref={contentRef} className="transaction-modal-content transaction-modal-content--wide" 
           onClick={(e) => e.stopPropagation()}
           style={{
             backgroundColor: 'var(--surface, #0f0f0f)',
             border: '1px solid var(--border, rgba(255,255,255,0.12))',
             borderRadius: '12px',
             maxWidth: '98vw',
             width: getModalWidth(),
             height: getModalHeight(),
             position: 'fixed',
             left: position.x,
             top: position.y,
             overflow: 'hidden',
             display: 'flex',
             flexDirection: 'column'
           }}>
        {/* Live size badge */}
        {showSizeBadge && (
          <div style={{ position: 'absolute', top: 8, left: 12, background: 'rgba(0,0,0,0.6)', color: '#eaeaea', padding: '4px 8px', borderRadius: 6, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{customSize.w} × {customSize.h}</span>
            <span style={{ opacity: 0.8, fontSize: 11 }}>({presetLabel(config.size)})</span>
          </div>
        )}
        {/* Resize handle overlay (bottom-right) */}
        <div
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const rect = contentRef.current ? contentRef.current.getBoundingClientRect() : { width: customSize.w, height: customSize.h }
            setResizeStart({ x: e.clientX, y: e.clientY, w: Math.round(rect.width), h: Math.round(rect.height), axis: 'both' })
            setPreResizeSize(customSize)
            setIsResizing(true)
          }}
          style={{ position: 'absolute', right: 8, bottom: 8, width: 18, height: 18, cursor: 'nwse-resize', opacity: 0.6 }}
          title="اسحب لتغيير الحجم"
        >
          <div style={{ width: '100%', height: '100%', borderRight: '2px solid #888', borderBottom: '2px solid #888' }} />
        </div>
        {/* Right edge resize */}
        <div
          onMouseDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            const rect = contentRef.current ? contentRef.current.getBoundingClientRect() : { width: customSize.w, height: customSize.h }
            setResizeStart({ x: e.clientX, y: e.clientY, w: Math.round(rect.width), h: Math.round(rect.height), axis: 'x' });
            setPreResizeSize(customSize)
            setIsResizing(true)
          }}
          style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', opacity: 0.001 }}
          title="اسحب لزيادة العرض"
        />
        {/* Bottom edge resize */}
        <div
          onMouseDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            const rect = contentRef.current ? contentRef.current.getBoundingClientRect() : { width: customSize.w, height: customSize.h }
            setResizeStart({ x: e.clientX, y: e.clientY, w: Math.round(rect.width), h: Math.round(rect.height), axis: 'y' });
            setPreResizeSize(customSize)
            setIsResizing(true)
          }}
          style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: '100%', cursor: 'ns-resize', opacity: 0.001 }}
          title="اسحب لزيادة الارتفاع"
        />
        {/* Left edge resize */}
        <div
          onMouseDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            const rect = contentRef.current ? contentRef.current.getBoundingClientRect() : { width: customSize.w, height: customSize.h }
            setResizeStart({ x: e.clientX, y: e.clientY, w: Math.round(rect.width), h: Math.round(rect.height), axis: 'x' });
            setPreResizeSize(customSize)
            setIsResizing(true)
          }}
          style={{ position: 'absolute', left: 0, top: 0, width: 6, height: '100%', cursor: 'ew-resize', opacity: 0.001 }}
          title="اسحب لتغيير العرض"
        />
        {/* Top edge resize */}
        <div
          onMouseDown={(e) => {
            e.preventDefault(); e.stopPropagation();
            const rect = contentRef.current ? contentRef.current.getBoundingClientRect() : { width: customSize.w, height: customSize.h }
            setResizeStart({ x: e.clientX, y: e.clientY, w: Math.round(rect.width), h: Math.round(rect.height), axis: 'y' });
            setPreResizeSize(customSize)
            setIsResizing(true)
          }}
          style={{ position: 'absolute', left: 0, top: 0, height: 6, width: '100%', cursor: 'ns-resize', opacity: 0.001 }}
          title="اسحب لتغيير الارتفاع"
        />
        <div className="modal-header-row" style={{ 
          padding: '16px 20px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true)
          setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y, origX: position.x, origY: position.y })
        }}
        >
          <div>
            <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text, #eaeaea)' }}>
              تحليل تكلفة سطر المعاملة - البنود التفصيلية
            </h3>
            <div style={{ color: '#a3a3a3', fontSize: 12, marginTop: 4 }}>
              {entryNumber ? `رقم القيد: ${entryNumber}` : header?.entry_number ? `رقم القيد: ${header.entry_number}` : ''}
              {description ? ` — ${description}` : header?.description ? ` — ${header.description}` : ''}
              {typeof effectiveTolerance === 'number' && (
                <span style={{ marginInlineStart: 8 }}>(الهامش: {effectiveTolerance})</span>
              )}
              <div style={{ fontSize: '11px', marginTop: '4px', fontStyle: 'italic' }}>تحليل تفصيلي لبنود التكلفة المرتبطة بسطر المعاملة المحدد</div>
            </div>
          </div>
          <div className="button-container" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Settings toggle */}
            <button
              className="ultimate-btn ultimate-btn-edit"
              onClick={() => setShowSettings((s) => !s)}
              title="إعدادات النافذة"
            >
              <div className="btn-content"><span className="btn-text">الإعدادات ⚙️</span></div>
            </button>
            <button className="ultimate-btn ultimate-btn-delete" onClick={onClose}>
              <div className="btn-content"><span className="btn-text">إغلاق</span></div>
            </button>
          </div>
        </div>

        {/* Tabs */}
        {/* Config Panel */}
        {showSettings && (
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))',
            backgroundColor: 'var(--surface-2, #1a1a1a)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12
          }}>
            <div>
              <div style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 6 }}>حجم النافذة</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['sm','md','lg','xl','fullscreen','custom'] as ModalSize[]).map(sz => (
                  <button
                    key={sz}
                    className={`ultimate-btn ${config.size === sz ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`}
                    onClick={() => setConfig(prev => ({ ...prev, size: sz }))}
                  >
                    <div className="btn-content"><span className="btn-text">{sz === 'sm' ? 'صغير' : sz === 'md' ? 'متوسط' : sz === 'lg' ? 'كبير' : sz === 'xl' ? 'واسع' : sz === 'fullscreen' ? 'ملء الشاشة' : 'مخصص'}</span></div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 6 }}>التبويب الافتراضي عند الفتح</div>
              <select
                value={config.defaultTab}
                onChange={(e) => setConfig(prev => ({ ...prev, defaultTab: e.target.value as ModalConfig['defaultTab'] }))}
                style={{ padding: '6px 8px', backgroundColor: 'var(--surface, #0f0f0f)', color: 'var(--text, #eaeaea)', borderRadius: 6, border: '1px solid var(--border, rgba(255,255,255,0.12))' }}
              >
                <option value="header">الملخص</option>
                <option value="line_items">بنود التكلفة</option>
                <option value="by_item">حسب عنصر التحليل</option>
                <option value="by_cost_center">حسب مركز التكلفة</option>
                <option value="by_category">حسب فئة المصروف</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={config.showExport} onChange={(e) => setConfig(prev => ({ ...prev, showExport: e.target.checked }))} />
                <span style={{ color: 'var(--text, #eaeaea)' }}>إظهار أزرار التصدير</span>
              </label>
            </div>
            {/* Manual size inputs */}
            <div>
              <div style={{ color: '#a3a3a3', fontSize: 12, marginBottom: 6 }}>الحجم المخصص (بالبكسل)</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min={720}
                  max={Math.round(window.innerWidth * 0.98)}
                  value={customSize.w}
                  onChange={(e) => setCustomSize(s => ({ ...s, w: Math.max(720, Math.min(Number(e.target.value) || 0, Math.round(window.innerWidth * 0.98))) }))}
                  style={{ padding: '6px 8px', backgroundColor: 'var(--surface, #0f0f0f)', color: 'var(--text, #eaeaea)', borderRadius: 6, border: '1px solid var(--border, rgba(255,255,255,0.12))', width: 120 }}
                  placeholder="العرض"
                />
                <span style={{ color: '#a3a3a3' }}>×</span>
                <input
                  type="number"
                  min={480}
                  max={Math.round(window.innerHeight * 0.96)}
                  value={customSize.h}
                  onChange={(e) => setCustomSize(s => ({ ...s, h: Math.max(480, Math.min(Number(e.target.value) || 0, Math.round(window.innerHeight * 0.96))) }))}
                  style={{ padding: '6px 8px', backgroundColor: 'var(--surface, #0f0f0f)', color: 'var(--text, #eaeaea)', borderRadius: 6, border: '1px solid var(--border, rgba(255,255,255,0.12))', width: 120 }}
                  placeholder="الارتفاع"
                />
                <button
                  className="ultimate-btn ultimate-btn-edit"
                  onClick={() => { setConfig(p => ({ ...p, size: 'custom' })); try { localStorage.setItem(storageKey + ':customSize', JSON.stringify(customSize)); } catch {} }}
                >
                  <div className="btn-content"><span className="btn-text">تطبيق المخصص</span></div>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="ultimate-btn ultimate-btn-success"
                onClick={() => { try { localStorage.setItem(storageKey, JSON.stringify(config)); } catch {} setShowSettings(false) }}
              >
                <div className="btn-content"><span className="btn-text">حفظ الإعدادات</span></div>
              </button>
              <button
                className="ultimate-btn ultimate-btn-delete"
                onClick={() => { const defaults: ModalConfig = { size: 'xl', defaultTab: 'header', showExport: true }; setConfig(defaults); try { localStorage.setItem(storageKey, JSON.stringify(defaults)); } catch {} }}
              >
                <div className="btn-content"><span className="btn-text">إعادة الضبط</span></div>
              </button>
            </div>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: 8, 
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', 
          paddingBottom: 8, 
          padding: '8px 20px 8px 20px',
          backgroundColor: 'var(--surface-1, #151515)'
        }}>
          <button className={`ultimate-btn ${tab === 'header' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('header')}>
            <div className="btn-content"><span className="btn-text">الملخص</span></div>
          </button>
          <button className={`ultimate-btn ${tab === 'line_items' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('line_items')}>
            <div className="btn-content"><span className="btn-text">بنود التكلفة</span></div>
          </button>
          <button className={`ultimate-btn ${tab === 'by_item' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('by_item')}>
            <div className="btn-content"><span className="btn-text">حسب عنصر التحليل</span></div>
          </button>
          <button className={`ultimate-btn ${tab === 'by_cost_center' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('by_cost_center')}>
            <div className="btn-content"><span className="btn-text">حسب مركز التكلفة</span></div>
          </button>
          <button className={`ultimate-btn ${tab === 'by_category' ? 'ultimate-btn-success' : 'ultimate-btn-edit'}`} onClick={() => setTab('by_category')}>
            <div className="btn-content"><span className="btn-text">حسب فئة المصروف</span></div>
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <div style={{ color: '#a3a3a3' }}>جاري تحميل بيانات التحليل...</div>
            </div>
          )}
          {error && !loading && (
            <div style={{ 
              padding: '16px', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid #ef4444', 
              borderRadius: '8px',
              color: '#ef4444',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {!loading && !error && tab === 'header' && (
            <>
            <div>
              {/* Export Options for Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: 'var(--text, #eaeaea)', fontSize: '18px' }}>
                  ملخص تحليل التكلفة - سطر المعاملة
                </h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button 
                    onClick={printCostAnalysis}
                    className="ultimate-btn ultimate-btn-edit"
                    style={{ minWidth: '120px' }}
                  >
                    <div className="btn-content">
                      <span className="btn-text">🖨️ طباعة متقدمة</span>
                    </div>
                  </button>
                  {config.showExport && lineItems.length > 0 && (
                    <ExportButtons 
                      data={prepareSummaryExportData}
                      config={{
                        title: `تحليل التكلفة - سطر المعاملة: ${entryNumber || header?.entry_number || 'غير محدد'}`,
                        subtitle: `${description || header?.description || ''} - تاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
                        useArabicNumerals: true,
                        rtlLayout: true,
                        orientation: 'portrait'
                      }}
                      size="small"
                      layout="horizontal"
                      showAllFormats={true}
                      showBatchExport={false}
                      showCustomizedPDF={true}
                    />
                  )}
                </div>
              </div>
              
              {/* Show comparison only if line items exist */}
              {lineItems.length > 0 ? (
                <div>
                  {/* Comparison Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 24 }}>
                    <div style={{ 
                      backgroundColor: 'var(--surface-1, #151515)',
                      border: '1px solid var(--border, rgba(255,255,255,0.12))',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: 8 }}>مبلغ سطر المعاملة</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#3b82f6' }}>
                        {formatCurrency(header?.transaction_amount || transactionAmount, currency)}
                      </div>
                    </div>
                    <div style={{ 
                      backgroundColor: 'var(--surface-1, #151515)',
                      border: '1px solid var(--border, rgba(255,255,255,0.12))',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: 8 }}>إجمالي بنود التكلفة</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#10b981' }}>
                        {formatCurrency(lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0), currency)}
                      </div>
                    </div>
                    <div style={{ 
                      backgroundColor: 'var(--surface-1, #151515)',
                      border: '1px solid var(--border, rgba(255,255,255,0.12))',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: 8 }}>عدد البنود</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6' }}>{lineItems.length}</div>
                    </div>
                  </div>
                  
                  {/* Variance Analysis */}
                  {(() => {
                    const txAmountLocal = header?.transaction_amount || transactionAmount || 0
                    const lineItemsTotal = lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)
                    const variance = txAmountLocal - lineItemsTotal
                    const variancePct = txAmountLocal ? (variance / txAmountLocal) * 100 : 0
                    const isMatched = Math.abs(variance) < 1.0
                    
                    return (
                      <div style={{
                        backgroundColor: isMatched ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        border: `1px solid ${isMatched ? '#22c55e' : '#f59e0b'}`,
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: 20
                      }}>
                        <h4 style={{ 
                          margin: '0 0 16px 0', 
                          color: isMatched ? '#22c55e' : '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          {isMatched ? '✅' : '⚠️'} تحليل التباين
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                          <div>
                            <div style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: 4 }}>قيمة التباين</div>
                            <div style={{ 
                              fontSize: '16px', 
                              fontWeight: 700, 
                              fontVariantNumeric: 'tabular-nums',
                              color: isMatched ? '#22c55e' : '#f59e0b'
                            }}>
                              {formatCurrency(Math.abs(variance), currency)}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: 4 }}>نسبة التباين</div>
                            <div style={{ 
                              fontSize: '16px', 
                              fontWeight: 700, 
                              fontVariantNumeric: 'tabular-nums',
                              color: isMatched ? '#22c55e' : '#f59e0b'
                            }}>
                              {formatNumber(Math.abs(variancePct))}%
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#a3a3a3', fontSize: '12px', marginBottom: 4 }}>حالة المطابقة</div>
                            <div style={{ 
                              fontSize: '16px', 
                              fontWeight: 700,
                              color: isMatched ? '#22c55e' : '#f59e0b'
                            }}>
                              {isMatched ? 'متطابق ✓' : 'غير متطابق'}
                            </div>
                          </div>
                        </div>
                        
                        {!isMatched && (
                          <div style={{ marginTop: 12, padding: '8px 12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                            <div style={{ fontSize: '14px', color: '#f59e0b' }}>
                              💡 <strong>تحليل التباين:</strong> {variance > 0 ? 'المعاملة أكبر من مجموع البنود' : 'مجموع البنود أكبر من المعاملة'}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  
                  {/* Line Items Summary */}
                  <div style={{
                    backgroundColor: 'var(--surface-1, #151515)',
                    border: '1px solid var(--border, rgba(255,255,255,0.12))',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text, #eaeaea)' }}>ملخص بنود التكلفة</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <div>
                        <div style={{ color: '#a3a3a3', fontSize: '12px' }}>أعلى قيمة بند</div>
                        <div style={{ fontWeight: 600, color: '#10b981' }}>
                          {formatCurrency(Math.max(...lineItems.map(item => item.total_amount || 0)), currency)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#a3a3a3', fontSize: '12px' }}>أقل قيمة بند</div>
                        <div style={{ fontWeight: 600, color: '#3b82f6' }}>
                          {formatCurrency(Math.min(...lineItems.map(item => item.total_amount || 0)), currency)}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#a3a3a3', fontSize: '12px' }}>متوسط قيمة البند</div>
                        <div style={{ fontWeight: 600, color: '#8b5cf6' }}>
                          {formatCurrency(lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0) / lineItems.length, currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Show helpful message when no line items exist */
                <div style={{
                  textAlign: 'center',
                  padding: '60px 40px',
                  backgroundColor: 'var(--surface-1, #151515)',
                  border: '2px dashed var(--border, rgba(255,255,255,0.12))',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: 16 }}>📊</div>
                  <h3 style={{ margin: '0 0 12px 0', color: 'var(--text, #eaeaea)', fontSize: '20px' }}>
                    لا توجد بنود تكلفة
                  </h3>
                  <p style={{ margin: '0 0 24px 0', color: '#a3a3a3', fontSize: '16px', lineHeight: 1.5 }}>
                    لم يتم إضافة أي بنود تكلفة لهذه المعاملة بعد.<br/>
                    قم باختيار بنود التكلفة من الكتالوج المعتمد لرؤية تحليل شامل ومقارنة الأرقام.
                  </p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                      className="ultimate-btn ultimate-btn-success"
                      onClick={() => setTab('line_items')}
                      style={{ minWidth: '160px' }}
                    >
                      <div className="btn-content">
                        <span className="btn-text">+ إضافة بنود التكلفة</span>
                      </div>
                    </button>
                    <div style={{
                      backgroundColor: 'var(--surface-2, #1a1a1a)',
                      border: '1px solid var(--border, rgba(255,255,255,0.12))',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span style={{ color: '#a3a3a3', fontSize: '14px' }}>مبلغ المعاملة:</span>
                      <span style={{ fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(header?.transaction_amount || transactionAmount, currency)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Instructions */}
                  <div style={{ marginTop: 24, padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                    <div style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 600, marginBottom: 8 }}>
                      💡 كيفية استخدام تحليل التكلفة:
                    </div>
                    <ul style={{ textAlign: 'right', margin: 0, padding: '0 0 0 20px', color: '#a3a3a3', fontSize: '14px' }}>
                      <li>انقر على "بنود التكلفة" لفتح قائمة إدارة البنود</li>
                      <li>اختر "اختيار من الكتالوج" لاختيار بنود من القوالب الجاهزة</li>
                      <li>عدّل الكمية والنسبة والأسعار حسب الحاجة</li>
                      <li>احفظ التغييرات لرؤية التحليل المقارن هنا</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            </>
          )}
          
          {/* Line Items Management Tab */}
          {!loading && !error && tab === 'line_items' && (
            <>
            <div>
              {/* Bulk delete confirmation dialog */}
              {showBulkDeleteConfirm && (
                <div style={{
                  padding: '12px',
                  marginBottom: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>
                    حذف {selectedForDelete.size} بند(أ)؟
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      className="ultimate-btn ultimate-btn-delete"
                      onClick={bulkDeleteSelected}
                      disabled={saving}
                    >
                      <div className="btn-content"><span className="btn-text">{saving ? 'جاري الحذف...' : 'تأكيد الحذف'}</span></div>
                    </button>
                    <button 
                      className="ultimate-btn ultimate-btn-edit"
                      onClick={() => setShowBulkDeleteConfirm(false)}
                      disabled={saving}
                    >
                      <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                    </button>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h4 style={{ margin: 0, color: 'var(--text, #eaeaea)' }}>بنود التكلفة التفصيلية</h4>
                  {selectedForDelete.size > 0 && (
                    <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>
                      ({selectedForDelete.size} محدد)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {selectedForDelete.size > 0 && (
                    <>
                      <button 
                        className="ultimate-btn ultimate-btn-delete"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        disabled={saving}
                      >
                        <div className="btn-content"><span className="btn-text">🗑️ حذف المحدد</span></div>
                      </button>
                      <button 
                        className="ultimate-btn ultimate-btn-edit"
                        onClick={() => setSelectedForDelete(new Set())}
                        disabled={saving}
                      >
                        <div className="btn-content"><span className="btn-text">إلغاء التحديد</span></div>
                      </button>
                    </>
                  )}
                  {config.showExport && lineItems.length > 0 && (
                    <ExportButtons 
                      data={prepareLineItemsExportData}
                      config={{
                        title: `بنود التكلفة التفصيلية - سطر المعاملة: ${entryNumber || header?.entry_number || 'غير محدد'}`,
                        subtitle: `${description || header?.description || ''} - عدد البنود: ${lineItems.length}`,
                        useArabicNumerals: true,
                        rtlLayout: true,
                        orientation: 'landscape'
                      }}
                      size="small"
                      layout="dropdown"
                      showAllFormats={true}
                      showBatchExport={false}
                      showCustomizedPDF={true}
                    />
                  )}
                  <button className="ultimate-btn ultimate-btn-add" onClick={addLineItem}>
                    <div className="btn-content"><span className="btn-text">+ إضافة بند</span></div>
                  </button>
                  <button className="ultimate-btn ultimate-btn-success" onClick={saveLineItems} disabled={saving}>
                    <div className="btn-content"><span className="btn-text">{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span></div>
                  </button>
                </div>
              </div>
              
              {lineItems.length === 0 ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  backgroundColor: 'var(--surface-1, #151515)',
                  border: '1px dashed var(--border, rgba(255,255,255,0.12))',
                  borderRadius: '8px',
                  color: '#a3a3a3'
                }}>
                  لا توجد بنود تكلفة. اضغط "إضافة بند" لبدء إضافة بنود التكلفة.
                </div>
              ) : (
                <div style={{ 
                  border: '1px solid var(--border, rgba(255,255,255,0.12))',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    backgroundColor: 'var(--surface-1, #151515)'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--surface-2, #1a1a1a)' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '40px' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedForDelete.size === lineItems.length && lineItems.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedForDelete(new Set(lineItems.map((_, i) => i)))
                              } else {
                                setSelectedForDelete(new Set())
                              }
                            }}
                          />
                        </th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '60px' }}>الكود</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))' }}>البند</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '80px' }}>الكمية</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '70px' }}>النسبة%</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '100px' }}>سعر الوحدة</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '100px' }}>وحدة القياس</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '120px' }}>الإجمالي</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '120px' }}>📌 عنصر العمل</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '120px' }}>🔍 بند التحليل</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '140px' }}>📂 الشجرة الفرعية</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '1px solid var(--border, rgba(255,255,255,0.12))', minWidth: '80px' }}>العمليات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Add new item row */}
                      <tr style={{ backgroundColor: 'var(--surface-2, #1a1a1a)', borderBottom: '2px solid var(--border, rgba(255,255,255,0.12))' }}>
                        <td colSpan={12} style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: 'var(--text, #eaeaea)', fontSize: '14px', fontWeight: 600 }}>
                              اختيار بند من الكتالوج:
                            </span>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  addFromCatalog(e.target.value)
                                  e.target.value = '' // Reset selection
                                }
                              }}
                              disabled={loadingCatalog}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border, rgba(255,255,255,0.12))',
                                backgroundColor: 'var(--surface, #0f0f0f)',
                                color: 'var(--text, #eaeaea)',
                                fontSize: '14px',
                                minWidth: '300px',
                                flex: 1
                              }}
                            >
                              <option value="">
                                {loadingCatalog ? 'جاري التحميل...' : 'اختر بند من الكتالوج لإضافته فوراً'}
                              </option>
                              {catalogItems.map(item => (
                                <option key={item.id} value={item.id}>
                                  [{item.item_code || 'غير مرقم'}] {item.item_name_ar || item.item_name || 'بند غير محدد'}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Existing items */}
                      {lineItems.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))', backgroundColor: selectedItemIndex === index ? 'rgba(59, 130, 246, 0.2)' : 'transparent' }}>
                          <td style={{ padding: '8px', textAlign: 'center', minWidth: '40px' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedForDelete.has(index)}
                              onChange={(e) => {
                                e.stopPropagation()
                                const updated = new Set(selectedForDelete)
                                if (e.target.checked) {
                                  updated.add(index)
                                } else {
                                  updated.delete(index)
                                }
                                setSelectedForDelete(updated)
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }} onClick={() => setSelectedItemIndex(index)}>
                            {/* Show dropdown if no item selected, otherwise show code */}
                            {!item.item_code ? (
                              <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  const catalogItem = catalogItems.find(cat => cat.id === e.target.value)
                                  if (catalogItem) {
                                    updateLineItem(index, {
                                      line_item_catalog_id: catalogItem.id,
                                      item_code: catalogItem.item_code,
                                      item_name: catalogItem.item_name,
                                      item_name_ar: catalogItem.item_name_ar,
                                      unit_price: catalogItem.unit_price || 0,
                                      unit_of_measure: catalogItem.unit_of_measure || 'piece',
                                    })
                                  }
                                }
                              }}
                                disabled={loadingCatalog}
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  border: '1px solid var(--border, rgba(255,255,255,0.12))',
                                  borderRadius: '3px',
                                  backgroundColor: 'var(--surface, #0f0f0f)',
                                  color: 'var(--text, #eaeaea)',
                                  fontSize: '11px'
                                }}
                              >
                                <option value="">اختر بند</option>
                                {catalogItems.map(catalogItem => (
                                  <option key={catalogItem.id} value={catalogItem.id}>
                                    [{catalogItem.item_code}] {catalogItem.item_name_ar || catalogItem.item_name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ color: 'var(--text, #eaeaea)', fontSize: '12px', fontWeight: 600 }}>
                                {item.item_code}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px' }}>
                            {/* Show item name and Arabic name in one column (like transactions) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ color: 'var(--text, #eaeaea)', fontSize: '12px', fontWeight: 600 }}>
                                [{item.item_code || 'غير محدد'}] {item.item_name_ar || 'بند غير محدد'}
                              </div>
                              {item.item_name && (
                                <div style={{ color: '#a3a3a3', fontSize: '10px' }}>
                                  {item.item_name}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={item.quantity || 0}
                              onChange={(e) => updateLineItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                              min="0"
                              step="0.01"
                              style={{
                                width: '80px',
                                padding: '6px 8px',
                                border: '1px solid var(--border, rgba(255,255,255,0.12))',
                                borderRadius: '4px',
                                backgroundColor: 'var(--surface, #0f0f0f)',
                                color: 'var(--text, #eaeaea)',
                                fontVariantNumeric: 'tabular-nums'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={item.percentage || 100}
                              onChange={(e) => updateLineItem(index, { percentage: parseFloat(e.target.value) || 0 })}
                              min="0"
                              max="999.99"
                              step="0.01"
                              style={{
                                width: '80px',
                                padding: '6px 8px',
                                border: '1px solid var(--border, rgba(255,255,255,0.12))',
                                borderRadius: '4px',
                                backgroundColor: 'var(--surface, #0f0f0f)',
                                color: 'var(--text, #eaeaea)',
                                fontVariantNumeric: 'tabular-nums'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <input
                              type="number"
                              value={item.unit_price || 0}
                              onChange={(e) => updateLineItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                              min="0"
                              step="0.01"
                              style={{
                                width: '100px',
                                padding: '6px 8px',
                                border: '1px solid var(--border, rgba(255,255,255,0.12))',
                                borderRadius: '4px',
                                backgroundColor: 'var(--surface, #0f0f0f)',
                                color: 'var(--text, #eaeaea)',
                                fontVariantNumeric: 'tabular-nums'
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <select
                              value={item.unit_of_measure || 'piece'}
                              onChange={(e) => updateLineItem(index, { unit_of_measure: e.target.value })}
                              style={{
                                width: '100px',
                                padding: '6px 8px',
                                border: '1px solid var(--border, rgba(255,255,255,0.12))',
                                borderRadius: '4px',
                                backgroundColor: 'var(--surface, #0f0f0f)',
                                color: 'var(--text, #eaeaea)'
                              }}
                            >
                              <option value="piece">قطعة</option>
                              <option value="meter">متر</option>
                              <option value="kg">كيلو</option>
                              <option value="liter">لتر</option>
                              <option value="hour">ساعة</option>
                              <option value="day">يوم</option>
                              <option value="bag">شكارة</option>
                              <option value="box">صندوق</option>
                            </select>
                          </td>
                          <td style={{ 
                            padding: '8px', 
                            fontWeight: 700, 
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--success, #22c55e)'
                          }}>
                            {formatCurrency(item.total_amount || 0, currency)}
                          </td>
                          {/* Work Item Dropdown - Searchable */}
                          <td style={{ padding: '8px' }}>
                            <SearchableDropdown
                              items={effectiveWorkItems.map(w => ({ id: (w as any).id, code: (w as any).code, name: (w as any).name, name_ar: (w as any).name_ar }))}
                              value={item.work_item_id || null}
                              onChange={(id) => updateLineItem(index, { work_item_id: id })}
                              placeholder="— بحث —"
                              maxVisibleItems={50}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <SearchableDropdown
                              items={analysisWorkItems.map(a => ({
                                id: a.id,
                                code: a.code,
                                name: a.name
                              }))}
                              value={item.analysis_work_item_id || null}
                              onChange={(id) => updateLineItem(index, { analysis_work_item_id: id })}
                              placeholder="— بحث —"
                              maxVisibleItems={50}
                            />
                          </td>
                          {/* Expenses Sub-Tree Dropdown - Searchable */}
                          <td style={{ padding: '8px' }}>
                            <SearchableDropdown
                              items={effectiveSubTree.map((st: any) => ({ id: st.id, code: st.code, name: st.description || st.name, name_ar: st.name_ar }))}
                              value={item.sub_tree_id || null}
                              onChange={(id) => updateLineItem(index, { sub_tree_id: id })}
                              placeholder="— بحث —"
                              maxVisibleItems={50}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button
                                onClick={() => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  duplicateLineItem(index)
                                }}
                                disabled={saving}
                                title="نسخ البند"
                                style={{
                                  padding: '4px 6px',
                                  border: '1px solid #3b82f6',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6',
                                  cursor: saving ? 'not-allowed' : 'pointer',
                                  opacity: saving ? 0.5 : 1,
                                  fontSize: '10px'
                                }}
                              >
                                📄
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeLineItem(index)
                                }}
                                disabled={saving}
                                title="حذف البند"
                                style={{
                                  padding: '4px 6px',
                                  border: '1px solid #ef4444',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  cursor: saving ? 'not-allowed' : 'pointer',
                                  opacity: saving ? 0.5 : 1,
                                  fontSize: '10px'
                                }}
                              >
                                {saving ? '...' : '🗑️'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: 'var(--surface-2, #1a1a1a)', fontWeight: 700 }}>
                        <td colSpan={8} style={{ padding: '12px 8px', textAlign: 'left' }}>الإجمالي</td>
                        <td style={{ padding: '12px 8px', fontVariantNumeric: 'tabular-nums', color: 'var(--success, #22c55e)' }}>
                          {formatCurrency(lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0), currency)}
                        </td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
            </>
          )}

        {!loading && !error && tab === 'by_item' && (
          <>
          <div className="placeholder-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, color: 'var(--text, #eaeaea)' }}>تحليل حسب عنصر التحليل</h4>
              {config.showExport && (
                <ExportButtons
                  data={{ columns: createStandardColumns([
                    { key: 'code', header: 'الكود', type: 'text' },
                    { key: 'name', header: 'اسم بند التحليل', type: 'text' },
                    { key: 'amount', header: 'المبلغ', type: 'currency' },
                  ]), rows: rowsByItem.map(r => ({ code: r.analysis_work_item_code, name: r.analysis_work_item_name, amount: r.amount })) }}
                  config={{ 
                    title: `تحليل حسب عنصر التحليل - ${entryNumber || header?.entry_number || 'غير محدد'}`, 
                    subtitle: `${description || header?.description || ''} - عدد العناصر: ${rowsByItem.length}`,
                    rtlLayout: true, 
                    useArabicNumerals: true 
                  }}
                  size="small"
                  layout="dropdown"
                />
              )}
            </div>
            {rowsByItem.length === 0 ? (
              <div style={{ color: '#a3a3a3' }}>لا توجد بيانات</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right' }}>الكود</th>
                    <th style={{ textAlign: 'right' }}>اسم بند التحليل</th>
                    <th style={{ textAlign: 'right' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsByItem.map(r => {
                    const warn = Math.abs(r.amount || 0) > (effectiveTolerance ?? 0)
                    return (
                      <tr key={r.analysis_work_item_id} className={warn ? 'tr-row-warn' : undefined}>
                        <td>{r.analysis_work_item_code}</td>
                        <td>{r.analysis_work_item_name}</td>
                        <td className={`arabic-numbers ${warn ? 'tr-cell-warn' : ''}`}>{formatCurrency(r.amount, currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>الإجمالي</td>
                    <td className="arabic-numbers" style={{ fontWeight: 700 }}>{formatCurrency(totalByItem, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          </>
        )}

        {!loading && !error && tab === 'by_cost_center' && (
          <>
          <div className="placeholder-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, color: 'var(--text, #eaeaea)' }}>تحليل حسب مراكز التكلفة</h4>
              {config.showExport && (
                <ExportButtons
                  data={{ columns: createStandardColumns([
                    { key: 'code', header: 'الكود', type: 'text' },
                    { key: 'name', header: 'اسم مركز التكلفة', type: 'text' },
                    { key: 'amount', header: 'المبلغ', type: 'currency' },
                  ]), rows: rowsByCC.map(r => ({ code: r.cost_center_code, name: r.cost_center_name, amount: r.amount })) }}
                  config={{ 
                    title: `تحليل حسب مراكز التكلفة - ${entryNumber || header?.entry_number || 'غير محدد'}`,
                    subtitle: `${description || header?.description || ''} - عدد المراكز: ${rowsByCC.length}`,
                    rtlLayout: true, 
                    useArabicNumerals: true 
                  }}
                  size="small"
                  layout="dropdown"
                />
              )}
            </div>
            {rowsByCC.length === 0 ? (
              <div style={{ color: '#a3a3a3' }}>لا توجد بيانات</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right' }}>الكود</th>
                    <th style={{ textAlign: 'right' }}>اسم مركز التكلفة</th>
                    <th style={{ textAlign: 'right' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsByCC.map(r => {
                    const warn = Math.abs(r.amount || 0) > (effectiveTolerance ?? 0)
                    return (
                      <tr key={r.cost_center_id} className={warn ? 'tr-row-warn' : undefined}>
                        <td>{r.cost_center_code}</td>
                        <td>{r.cost_center_name}</td>
                        <td className={`arabic-numbers ${warn ? 'tr-cell-warn' : ''}`}>{formatCurrency(r.amount, currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>الإجمالي</td>
                    <td className="arabic-numbers" style={{ fontWeight: 700 }}>{formatCurrency(totalByCC, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          </>
        )}

        {!loading && !error && tab === 'by_category' && (
          <>
          <div className="placeholder-table">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, color: 'var(--text, #eaeaea)' }}>تحليل حسب فئة المصروف</h4>
              {config.showExport && (
                <ExportButtons
                  data={{ columns: createStandardColumns([
                    { key: 'code', header: 'الكود', type: 'text' },
                    { key: 'name', header: 'فئة المصروف', type: 'text' },
                    { key: 'amount', header: 'المبلغ', type: 'currency' },
                  ]), rows: rowsByCat.map(r => ({ code: r.expenses_category_code, name: r.expenses_category_name, amount: r.amount })) }}
                  config={{ 
                    title: `تحليل حسب فئة المصروف - ${entryNumber || header?.entry_number || 'غير محدد'}`,
                    subtitle: `${description || header?.description || ''} - عدد الفئات: ${rowsByCat.length}`,
                    rtlLayout: true, 
                    useArabicNumerals: true 
                  }}
                  size="small"
                  layout="dropdown"
                />
              )}
            </div>
            {rowsByCat.length === 0 ? (
              <div style={{ color: '#a3a3a3' }}>لا توجد بيانات</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right' }}>الكود</th>
                    <th style={{ textAlign: 'right' }}>فئة المصروف</th>
                    <th style={{ textAlign: 'right' }}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsByCat.map(r => {
                    const warn = Math.abs(r.amount || 0) > (effectiveTolerance ?? 0)
                    return (
                      <tr key={r.expenses_category_id} className={warn ? 'tr-row-warn' : undefined}>
                        <td>{r.expenses_category_code}</td>
                        <td>{r.expenses_category_name}</td>
                        <td className={`arabic-numbers ${warn ? 'tr-cell-warn' : ''}`}>{formatCurrency(r.amount, currency)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>الإجمالي</td>
                    <td className="arabic-numbers" style={{ fontWeight: 700 }}>{formatCurrency(totalByCat, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          </>
        )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border, rgba(255,255,255,0.12))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-1, #151515)',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ color: '#a3a3a3', fontSize: '12px', minWidth: '200px' }}>
            <div>إجمالي البنود: {lineItems.length} | إجمالي القيمة: {formatCurrency(lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0), currency)}</div>
            {lineItems.length > 0 && (
              <div style={{ marginTop: 4, fontSize: '11px' }}>
                التباين: {formatCurrency(Math.abs((header?.transaction_amount || transactionAmount || 0) - lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)), currency)} 
                ({formatNumber(Math.abs(((header?.transaction_amount || transactionAmount || 0) - lineItems.reduce((sum, item) => sum + (item.total_amount || 0), 0)) / (header?.transaction_amount || transactionAmount || 1) * 100))}%)
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Global Export Options */}
            {config.showExport && lineItems.length > 0 && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button 
                  onClick={printCostAnalysis}
                  className="ultimate-btn ultimate-btn-warning"
                  style={{ minWidth: '100px' }}
                  title="طباعة تقرير شامل للتحليل"
                >
                  <div className="btn-content">
                    <span className="btn-text">🖨️ طباعة شاملة</span>
                  </div>
                </button>
                
                <ExportButtons 
                  data={prepareSummaryExportData}
                  config={{
                    title: `تحليل التكلفة الشامل - ${entryNumber || header?.entry_number || 'غير محدد'}`,
                    subtitle: `تقرير متكامل - ${description || header?.description || ''} - تاريخ: ${new Date().toLocaleDateString('ar-EG')}`,
                    useArabicNumerals: true,
                    rtlLayout: true,
                    orientation: 'landscape'
                  }}
                  size="small"
                  layout="dropdown"
                  showAllFormats={false}
                  showBatchExport={true}
                  showCustomizedPDF={true}
                />
              </div>
            )}
            
            {/* Action Buttons */}
            {tab === 'line_items' && lineItems.length > 0 && (
              <button className="ultimate-btn ultimate-btn-success" onClick={saveLineItems} disabled={saving}>
                <div className="btn-content"><span className="btn-text">{saving ? 'جاري الحفظ...' : 'حفظ وإغلاق'}</span></div>
              </button>
            )}
            <button className="ultimate-btn ultimate-btn-edit" onClick={() => setTab('header')}>
              <div className="btn-content"><span className="btn-text">عرض الملخص</span></div>
            </button>
            <button className="ultimate-btn ultimate-btn-delete" onClick={onClose}>
              <div className="btn-content"><span className="btn-text">إغلاق</span></div>
            </button>
          </div>
        </div>
      </div>
      
    </div>
  )
}

export default TransactionAnalysisModal
