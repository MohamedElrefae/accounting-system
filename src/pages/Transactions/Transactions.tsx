import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getTransactions,
  deleteTransaction,
  updateTransaction,
  getTransactionAudit,
  postTransaction,
  submitTransaction,
  getUserDisplayMap,
  createTransactionWithLines,
  updateTransactionWithLines,
  type TransactionRecord,
  type TransactionAudit,
} from '../../services/transactions'
import { useHasPermission } from '../../hooks/useHasPermission'
import './Transactions.css'
import { useToast } from '../../contexts/ToastContext'
import { useTransactionsData } from '../../contexts/TransactionsDataContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import ClientErrorLogs from '../admin/ClientErrorLogs'
import PermissionBadge from '../../components/Common/PermissionBadge'
import { WithPermission } from '../../components/Common/withPermission'
import { logClientError } from '../../services/telemetry'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import DraggablePanelContainer from '../../components/Common/DraggablePanelContainer'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'
import { supabase } from '../../utils/supabase'
import { transactionValidationAPI } from '../../services/transaction-validation-api'
import { getCompanyConfig } from '../../services/company-config'
import TransactionWizard from '../../components/Transactions/TransactionWizard'
const TransactionsHeaderTable = React.lazy(() => import('./TransactionsHeaderTable'))
const TransactionLinesTable = React.lazy(() => import('./TransactionLinesTable'))
import TransactionsHeaderControls from '../../components/Transactions/TransactionsHeaderControls'
import TransactionsLinesFilters from '../../components/Transactions/TransactionsLinesFilters'
import TransactionsDocumentsPanel from '../../components/Transactions/TransactionsDocumentsPanel'
import TransactionsSummaryBar from '../../components/Transactions/TransactionsSummaryBar'
import { type UnifiedCRUDFormHandle, type FormField } from '../../components/Common/UnifiedCRUDForm'
import formStyles from '../../components/Common/UnifiedCRUDForm.module.css'
import UnifiedTransactionDetailsPanel from '../../components/Transactions/UnifiedTransactionDetailsPanel'
const EnhancedLineApprovalManager = React.lazy(() => import('../../components/Approvals/EnhancedLineApprovalManager'))
const EnhancedLineReviewModalV2 = React.lazy(() => import('../../components/Approvals/EnhancedLineReviewModalV2'))
// Unused imports commented out - available for future use
// import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel'
// import TransactionsDetailsPanel from '../../components/Transactions/TransactionsDetailsPanel'
// import AttachDocumentsPanel from '../../components/documents/AttachDocumentsPanel'
// const UnifiedCRUDForm = React.lazy(() => import('../../components/Common/UnifiedCRUDForm'))
// import { createTransactionFormConfig } from '../../components/Transactions/TransactionFormConfig'
// import FormLayoutControls from '../../components/Common/FormLayoutControls'
import { Star } from 'lucide-react'
import SearchableSelect from '../../components/Common/SearchableSelect'
import { ApplicationPerformanceMonitor } from '../../services/ApplicationPerformanceMonitor'
import { PerformanceMonitor } from '../../utils/performanceMonitor'
import { OptimizedSuspense } from '../../components/Common/PerformanceOptimizer'
import { useTransactionsFilters } from '../../hooks/useTransactionsFilters'
import { usePersistedPanelState } from '../../hooks/usePersistedPanelState'

const TransactionsPage: React.FC = () => {
  const {
    organizations,
    projects,
    accounts,
    costCenters,
    workItems,
    categories,
    classifications,
    analysisItemsMap,
    currentUserId,
    isLoading: dataLoading,
    error: contextError,
    loadDimensionsForOrg,
    // _ensureDimensionsLoaded, // Available for future batch loading
    refreshAnalysisItems,
  } = useTransactionsData()
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, _setError] = useState<string | null>(null)
  const [_isSaving, _setIsSaving] = useState(false)
  const [_formErrors, _setFormErrors] = useState<Record<string, string>>({})

  // Unified form state
  const [formOpen, setFormOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null)
  const [_detailsOpen, _setDetailsOpen] = useState(false)

  // Debug details panel state changes
  useEffect(() => {
    if (import.meta.env.DEV) console.log('🔍 Details panel state changed:', _detailsOpen);
  }, [_detailsOpen]);
  const [detailsFor, setDetailsFor] = useState<TransactionRecord | null>(null)
  const [autoOpenDeleteModal, setAutoOpenDeleteModal] = useState(false)
  const [createdTxId, setCreatedTxId] = useState<string | null>(null)

  // Debug: track which form is open
  useEffect(() => { try { if (import.meta.env.DEV) console.log('🧪 Form state -> wizardOpen:', wizardOpen, 'formOpen:', formOpen); } catch { } }, [wizardOpen, formOpen])
  const [audit, setAudit] = useState<TransactionAudit[]>([])
  const [approvalHistory, setApprovalHistory] = useState<any[]>([])

  // Define onClose function with useCallback to ensure it's stable across re-renders
  const handleDetailsPanelClose = useCallback(() => {
    _setDetailsOpen(false);
    setAutoOpenDeleteModal(false);
  }, []);

  // Keep create-mode title even after header insert until user saves draft/post
  const [_keepCreateTitle, _setKeepCreateTitle] = useState<boolean>(false)

  // Documents panel state
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [documentsFor, setDocumentsFor] = useState<TransactionRecord | null>(null)
  const [documentsForLine, setDocumentsForLine] = useState<any | null>(null)


  // Inline editor toggles in modal
  // _showHeaderEditor, _setShowHeaderEditor // Available for future inline editing
  const [_docsInlineOpen, _setDocsInlineOpen] = useState<boolean>(true)

  const formPanelState = usePersistedPanelState({
    storagePrefix: 'transactionFormPanel',
    defaultPosition: { x: 100, y: 100 },
    defaultSize: { width: 800, height: 700 },
    defaultDockPosition: 'right',
  })
  const {
    position: panelPosition,
    setPosition: setPanelPosition,
    size: panelSize,
    setSize: setPanelSize,
    maximized: panelMax,
    setMaximized: setPanelMax,
    docked: panelDocked,
    setDocked: setPanelDocked,
    dockPosition: panelDockPos,
    setDockPosition: setPanelDockPos,
  } = formPanelState

  const formRef = React.useRef<UnifiedCRUDFormHandle>(null)

  const {
    headerFilters,
    headerAppliedFilters,
    headerFiltersDirty,
    updateHeaderFilter,
    applyHeaderFilters,
    resetHeaderFilters,
    lineFilters,
    updateLineFilter,
    resetLineFilters,
  } = useTransactionsFilters()

  const recordPerformanceEvent = useCallback((name: string, duration: number) => {
    ApplicationPerformanceMonitor.record(name, duration)
    if (import.meta.env.DEV) {
      console.log(`📈 ${name}: ${duration.toFixed(2)}ms`)
    }
  }, [])

  const measurePerformance = useCallback(async (name: string, fn: () => Promise<void> | void) => {
    PerformanceMonitor.startMeasure(name)
    const start = typeof performance !== 'undefined' ? performance.now() : 0
    try {
      await fn()
    } finally {
      const measured = PerformanceMonitor.endMeasure(name)
      const duration = measured || (typeof performance !== 'undefined' ? performance.now() - start : 0)
      recordPerformanceEvent(name, duration)
    }
  }, [recordPerformanceEvent])

  // Handle apply filters - copy unifiedFilters to appliedFilters and trigger reload
  const handleApplyFilters = useCallback(() => {
    void measurePerformance('transactions.filters.apply', async () => {
      applyHeaderFilters()
      setPage(1)
    })
  }, [applyHeaderFilters, measurePerformance])

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    void measurePerformance('transactions.filters.reset', async () => {
      resetHeaderFilters()
      setPage(1)
    })
  }, [resetHeaderFilters, measurePerformance])

  // Note: Filter width and visibility are now managed by UnifiedFilterBar internally

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  // Wrap mode preference (persisted per user locally)
  const [wrapMode, _setWrapMode] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('transactions_table_wrap')
      return raw ? raw === '1' : false
    } catch { return false }
  })

  // Persist wrapMode to server when available
  useEffect(() => {
    if (!currentUserId) return
      ; (async () => {
        try {
          const mod = await import('../../services/column-preferences')
          if (mod.isColumnPreferencesRpcDisabled()) return
          await mod.upsertUserColumnPreferences({
            tableKey: 'transactions_table',
            columnConfig: { wrapMode },
            version: 2,
          })
        } catch {
          // best-effort
        }
      })()
  }, [wrapMode, currentUserId])

  // Persist wrap mode selection
  useEffect(() => {
    try { localStorage.setItem('transactions_table_wrap', wrapMode ? '1' : '0') } catch { }
  }, [wrapMode])

  // Transaction & Line selection state
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [_selectedLineId, _setSelectedLineId] = useState<string | null>(null)

  // Lines state for bottom table
  const [transactionLines, setTransactionLines] = useState<any[]>([])

  // Lines filter using unified filter system
  // Filter transaction lines based on linesUnifiedFilters (client-side, immediate)
  const filteredTransactionLines = useMemo(() => {
    if (!transactionLines.length) return transactionLines
    const f = lineFilters
    return transactionLines.filter(line => {
      // Search filter - matches description or account name/code
      if (f.search) {
        const searchLower = f.search.toLowerCase()
        const desc = (line.description || '').toLowerCase()
        const accName = (line.account_name_ar || line.account_name || '').toLowerCase()
        const accCode = (line.account_code || '').toLowerCase()
        if (!desc.includes(searchLower) && !accName.includes(searchLower) && !accCode.includes(searchLower)) {
          return false
        }
      }
      // Amount range filter
      if (f.amountFrom) {
        const minAmt = parseFloat(f.amountFrom)
        const lineAmt = Math.max(line.debit_amount || 0, line.credit_amount || 0)
        if (lineAmt < minAmt) return false
      }
      if (f.amountTo) {
        const maxAmt = parseFloat(f.amountTo)
        const lineAmt = Math.max(line.debit_amount || 0, line.credit_amount || 0)
        if (lineAmt > maxAmt) return false
      }
      // Debit account filter
      if (f.debitAccountId && (line.debit_amount || 0) > 0 && line.account_id !== f.debitAccountId) return false
      // Credit account filter  
      if (f.creditAccountId && (line.credit_amount || 0) > 0 && line.account_id !== f.creditAccountId) return false
      // Project filter
      if (f.projectId && line.project_id !== f.projectId) return false
      // Cost center filter
      if (f.costCenterId && line.cost_center_id !== f.costCenterId) return false
      // Work item filter
      if (f.workItemId && line.work_item_id !== f.workItemId) return false
      // Analysis work item filter
      if (f.analysisWorkItemId && line.analysis_work_item_id !== f.analysisWorkItemId) return false
      // Classification filter
      if (f.classificationId && line.classification_id !== f.classificationId) return false
      // Expenses category filter
      if (f.expensesCategoryId && line.sub_tree_id !== f.expensesCategoryId) return false
      return true
    })
  }, [transactionLines, lineFilters])

  const [lineWrapMode, setLineWrapMode] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('transactions_lines_table_wrap')
      return raw ? raw === '1' : false
    } catch { return false }
  })

  // Persist line wrap mode selection
  useEffect(() => {
    try { localStorage.setItem('transactions_lines_table_wrap', lineWrapMode ? '1' : '0') } catch { }
  }, [lineWrapMode])

  // Fetch transaction lines when transaction is selected
  useEffect(() => {
    const fetchLines = async () => {
      if (import.meta.env.DEV) console.log('🔄 useEffect triggered, selectedTransactionId:', selectedTransactionId);

      if (!selectedTransactionId) {
        if (import.meta.env.DEV) console.log('⚠️ No transaction selected, clearing lines');
        setTransactionLines([])
        _setSelectedLineId(null)
        return
      }
      try {
        if (import.meta.env.DEV) console.log('📡 Querying transaction_lines for transaction:', selectedTransactionId);

        // Use the centralized service that handles enrichment and cost aggregation
        const { getTransactionLinesWithCosts } = await import('../../services/transaction-lines')
        const data = await getTransactionLinesWithCosts(selectedTransactionId)

        if (Array.isArray(data)) {
          if (import.meta.env.DEV) {
            console.log('✅ Lines fetched successfully:', data.length, 'lines for transaction', selectedTransactionId);
            console.log('📊 Line data:', data);
          }
          setTransactionLines(data)
        } else {
          console.warn('⚠️ Unexpected data format:', data);
          setTransactionLines([])
        }
      } catch (error) {
        console.error('❌ Exception fetching lines:', error)
        setTransactionLines([])
      }
    }
    fetchLines()
  }, [selectedTransactionId])

  // Refresh Analysis Work Items label cache when org/project filter changes
  // Note: analysisItemsMap now comes from TransactionsDataContext, so this effect
  // is only needed if we want to refresh based on filter changes. For now, we rely on context.
  useEffect(() => {
    // Context already provides analysisItemsMap; this effect can trigger refreshAnalysisItems if needed
    if (headerAppliedFilters.orgId) {
      refreshAnalysisItems(headerAppliedFilters.orgId, headerAppliedFilters.projectId || null).catch(() => { })
    }
  }, [headerAppliedFilters.orgId, headerAppliedFilters.projectId, refreshAnalysisItems])

  // Column configuration state (renamed for clarity - headers table)
  const [headersColumnConfigOpen, setHeadersColumnConfigOpen] = useState(false)

  // Column configuration state for lines table
  const [lineColumnsConfigOpen, setLineColumnsConfigOpen] = useState(false)

  // Transactions config modal state
  const [transactionsConfigOpen, setTransactionsConfigOpen] = useState(false)

  // Configuration options state
  const [transactionsConfig, setTransactionsConfig] = useState<{
    showAuditInfo: boolean;
    showApprovalBadges: boolean;
    defaultAmountFilter: 'all' | 'positive' | 'negative';
    defaultDateRange: 'all' | 'month' | 'quarter' | 'year';
    defaultPageSize: number;
    autoRefresh: boolean;
    exportFormat: 'excel' | 'pdf' | 'csv';
    groupByOrganization: boolean;
    highlightPostedTransactions: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('transactionsConfig');
      return saved ? JSON.parse(saved) : {
        showAuditInfo: true,
        showApprovalBadges: true,
        defaultAmountFilter: 'all' as 'all' | 'positive' | 'negative',
        defaultDateRange: 'all' as 'all' | 'month' | 'quarter' | 'year',
        defaultPageSize: 20,
        autoRefresh: false,
        exportFormat: 'excel' as 'excel' | 'pdf' | 'csv',
        groupByOrganization: false,
        highlightPostedTransactions: true
      };
    } catch {
      return {
        showAuditInfo: true,
        showApprovalBadges: true,
        defaultAmountFilter: 'all' as 'all' | 'positive' | 'negative',
        defaultDateRange: 'all' as 'all' | 'month' | 'quarter' | 'year',
        defaultPageSize: 20,
        autoRefresh: false,
        exportFormat: 'excel' as 'excel' | 'pdf' | 'csv',
        groupByOrganization: false,
        highlightPostedTransactions: true
      };
    }
  })

  // Persist transactions config
  useEffect(() => {
    try {
      localStorage.setItem('transactionsConfig', JSON.stringify(transactionsConfig));
    } catch { }
  }, [transactionsConfig])

  // Persist form panel position
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:position', JSON.stringify(panelPosition));
    } catch { }
  }, [panelPosition])

  // Persist form panel size
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:size', JSON.stringify(panelSize));
    } catch { }
  }, [panelSize])

  // Persist form panel maximized state
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:maximized', String(panelMax));
    } catch { }
  }, [panelMax])

  // Persist form panel docked state
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:docked', String(panelDocked));
    } catch { }
  }, [panelDocked])

  // Persist form panel dock position
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:dockPosition', panelDockPos);
    } catch { }
  }, [panelDockPos])

  const location = useLocation()
  // Apply workItemId from URL query (drill-through)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const wid = params.get('workItemId') || ''
      if (wid && wid !== headerFilters.workItemId) {
        updateHeaderFilter('workItemId', wid)
        setPage(1)
      }
    } catch { }
  }, [location.search, headerFilters.workItemId, updateHeaderFilter])
  const hasPerm = useHasPermission()
  const { showToast } = useToast()
  const [showDiag, setShowDiag] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [autoPostOnApprove, setAutoPostOnApprove] = useState<boolean>(false)

  // Notify user if server-backed preferences are unavailable (local-only fallback)
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('../../services/column-preferences')
        if (mod.isColumnPreferencesRpcDisabled()) {
          const warned = (() => { try { return sessionStorage.getItem('column_prefs_rpc_warned') === '1' } catch { return false } })()
          if (!warned) {
            showToast('سيتم حفظ إعدادات الأعمدة محلياً فقط مؤقتاً — سيتم المزامنة تلقائياً عند توفر الخادم.', { severity: 'warning' })
            try { sessionStorage.setItem('column_prefs_rpc_warned', '1') } catch { }
          }
        }
      } catch {/* silent */ }
    })()
  }, [showToast])

  // Helper: unify Supabase error text for user-facing toasts
  const formatSupabaseError = (e: any): string => {
    try {
      const { message, details, hint, code } = e || {}
      const parts = [message, details, hint, code ? `code: ${code}` : ''].filter(Boolean)
      return parts.join(' — ')
    } catch {
      return (e?.message || 'خطأ غير متوقع') as string
    }
  }

  const openDetails = useCallback(async (tx: TransactionRecord, options?: { openDeleteModal?: boolean }) => {
    setDetailsFor(tx)
    setSelectedTransactionId(tx.id)
    _setSelectedLineId(null)

    // Load dimensions for this transaction's organization on-demand
    if (tx.org_id) {
      if (import.meta.env.DEV) console.log(`🔄 Loading dimensions for transaction details org ${tx.org_id}`)
      await loadDimensionsForOrg(tx.org_id)
    }

    // Fetch audit data
    try {
      if (import.meta.env.DEV) console.log('🔄 Fetching transaction audit data...')
      const rows = await getTransactionAudit(tx.id)
      setAudit(rows)
      if (import.meta.env.DEV) console.log(`✅ Loaded ${rows.length} audit records`)
    } catch (error) {
      console.error('❌ Failed to fetch audit data:', error)
      setAudit([])
    }

    // Fetch approval history
    try {
      if (import.meta.env.DEV) console.log('🔄 Fetching approval history...')
      const { getLineReviewsForTransaction } = await import('../../services/lineReviewService')
      const lines = await getLineReviewsForTransaction(tx.id)
      const hist = lines.flatMap(line => line.approval_history || [])
      setApprovalHistory(hist)
      if (import.meta.env.DEV) console.log(`✅ Loaded ${hist.length} approval history records`)
    } catch (error) {
      console.error('❌ Failed to fetch approval history:', error)
      setApprovalHistory([])
    }

    // Fetch transaction lines
    try {
      if (import.meta.env.DEV) console.log('🔄 Fetching transaction lines...')
      const { getTransactionLines } = await import('../../services/transaction-lines')
      const lines = await getTransactionLines(tx.id)
      if (import.meta.env.DEV) console.log(`✅ Loaded ${lines.length} transaction lines`)
      setDetailsFor(prev => prev ? { ...prev, lines } : null)
    } catch (error) {
      console.error('❌ Failed to fetch transaction lines:', error)
    }

    _setDetailsOpen(true)
    if (options?.openDeleteModal) setAutoOpenDeleteModal(true)
  }, [loadDimensionsForOrg, setSelectedTransactionId])

  // Helper: small retry wrapper for flaky RPCs (e.g., 400 from transient state)
  const withRetry = async <T,>(fn: () => Promise<T>, attempts = 2, delayMs = 400): Promise<T> => {
    let lastErr: any
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn()
      } catch (e: any) {
        lastErr = e
        if (i < attempts - 1) {
          await new Promise(res => setTimeout(res, delayMs))
        }
      }
    }
    throw lastErr
  }

  // Confirm helper with "Don't ask again"
  const confirmRestore = (suppressKey: string, message: string): boolean => {
    try {
      const suppressed = localStorage.getItem(suppressKey) === '1'
      if (suppressed) return true
      const ok = window.confirm(message + '\n\nهل تريد المتابعة؟')
      if (!ok) return false
      const dontAsk = window.confirm('عدم السؤال مجدداً لهذا الزر؟')
      if (dontAsk) {
        try { localStorage.setItem(suppressKey, '1') } catch { }
      }
      return true
    } catch {
      return window.confirm(message)
    }
  }

  // Save current form panel layout and size as preferred
  // _handleSaveFormPanelLayout // Available for future form panel layout saving
  const _handleSaveFormPanelLayout = () => {
    try {
      const panelPreference = {
        position: panelPosition,
        size: panelSize,
        maximized: panelMax,
        docked: panelDocked,
        dockPosition: panelDockPos,
        savedTimestamp: Date.now(),
        userPreferred: true
      };
      localStorage.setItem('transactionFormPanel:preferred', JSON.stringify(panelPreference));
      if (import.meta.env.DEV) console.log('✅ تم حفظ تخطيط مودال النموذج كمفضل');
      showToast('✅ تم حفظ تخطيط النموذج', { severity: 'success' });
    } catch (error) {
      console.error('Failed to save form panel layout:', error);
      showToast('⚠️ فشل في حفظ تخطيط النموذج', { severity: 'error' });
    }
  }

  // _handleResetFormPanelLayout // Available for future form panel layout reset
  const _handleResetFormPanelLayout = () => {
    setPanelPosition({ x: 100, y: 100 });
    setPanelSize({ width: 800, height: 700 });
    setPanelMax(false);
    setPanelDocked(false);
    setPanelDockPos('right');

    // Clear saved preferences
    try {
      localStorage.removeItem('transactionFormPanel:preferred');
      localStorage.removeItem('transactionFormPanel:position');
      localStorage.removeItem('transactionFormPanel:size');
      localStorage.removeItem('transactionFormPanel:maximized');
      localStorage.removeItem('transactionFormPanel:docked');
      localStorage.removeItem('transactionFormPanel:dockPosition');
      if (import.meta.env.DEV) console.log('🔄 تم إعادة تعيين تخطيط مودال النموذج');
      showToast('🔄 تم إعادة تعيين تخطيط النموذج', { severity: 'info' });
    } catch { }
  }

  // Modern Approval Workflow state
  const [approvalWorkflowOpen, setApprovalWorkflowOpen] = useState(false)
  const [selectedReviewTxId, setSelectedReviewTxId] = useState<string | null>(null)

  // Line Review state
  const [lineReviewOpen, setLineReviewOpen] = useState(false)
  const [selectedLineForReview, setSelectedLineForReview] = useState<any | null>(null)

  // determine mode: my | pending | all
  const mode: 'my' | 'pending' | 'all' = location.pathname.includes('/transactions/my')
    ? 'my'
    : location.pathname.includes('/transactions/pending')
      ? 'pending'
      : 'all'

  // Load company config to know if auto-post-on-approve is enabled
  useEffect(() => {
    (async () => {
      try {
        const cfg = await getCompanyConfig()
        setAutoPostOnApprove(Boolean((cfg as any)?.auto_post_on_approve))
      } catch { }
    })()
  }, [])

  // Line Review Handlers
  const handleOpenLineReview = useCallback((line: any) => {
    // Enrich with names from local DIMENSIONS data if missing
    // This is useful for lines opened from TransactionLinesTable or Details Panel
    const enrichedLine = {
      ...line,
      line_id: line.id || line.line_id, // ensure we have both
      org_name: line.org_name || (line.org_id ? organizations.find(o => o.id === line.org_id)?.name : undefined),
      org_name_ar: line.org_name_ar || (line.org_id ? (organizations.find(o => o.id === line.org_id) as any)?.name_ar : undefined),
      project_name: line.project_name || (line.project_id ? projects.find(p => p.id === line.project_id)?.name : undefined),
      project_name_ar: line.project_name_ar || (line.project_id ? (projects.find(p => p.id === line.project_id) as any)?.name_ar : undefined),
    }
    setSelectedLineForReview(enrichedLine)
    setLineReviewOpen(true)
  }, [organizations, projects])

  const handleAddLineComment = useCallback(async (comment: string, reviewType: string) => {
    if (!selectedLineForReview) return
    const { addLineReviewComment } = await import('../../services/lineReviewService')
    await addLineReviewComment(null, selectedLineForReview.line_id || selectedLineForReview.id, comment, reviewType as any)
    showToast('تم إضافة التعليق بنجاح', { severity: 'success' })
    // Refresh lines if possible, or just the whole tx
    if (selectedTransactionId) {
      const { getTransactionLinesWithCosts } = await import('../../services/transaction-lines')
      const data = await getTransactionLinesWithCosts(selectedTransactionId)
      setTransactionLines(data)
    }
  }, [selectedLineForReview, selectedTransactionId, showToast])

  const handleRequestLineEdit = useCallback(async (reason: string) => {
    if (!selectedLineForReview) return
    const { requestLineEdit } = await import('../../services/lineReviewService')
    await requestLineEdit(null as any, selectedLineForReview.line_id || selectedLineForReview.id, reason)
    showToast('تم طلب التعديل بنجاح', { severity: 'warning' })
    if (selectedTransactionId) {
      const { getTransactionLinesWithCosts } = await import('../../services/transaction-lines')
      const data = await getTransactionLinesWithCosts(selectedTransactionId)
      setTransactionLines(data)
    }
  }, [selectedLineForReview, selectedTransactionId, showToast])

  const handleApproveLine = useCallback(async (notes?: string) => {
    if (!selectedLineForReview) return
    const { approveLineReview } = await import('../../services/lineReviewService')
    await approveLineReview(null as any, selectedLineForReview.line_id || selectedLineForReview.id, notes)
    showToast('تم اعتماد السطر بنجاح', { severity: 'success' })
    if (selectedTransactionId) {
      const { getTransactionLinesWithCosts } = await import('../../services/transaction-lines')
      const data = await getTransactionLinesWithCosts(selectedTransactionId)
      setTransactionLines(data)
    }
  }, [selectedLineForReview, selectedTransactionId, showToast])

  const handleFlagLine = useCallback(async (reason: string) => {
    if (!selectedLineForReview) return
    const { flagLine } = await import('../../services/lineReviewService')
    await flagLine(null as any, selectedLineForReview.line_id || selectedLineForReview.id, reason)
    showToast('تم إضافة تنبيه على السطر', { severity: 'info' })
    if (selectedTransactionId) {
      const { getTransactionLinesWithCosts } = await import('../../services/transaction-lines')
      const data = await getTransactionLinesWithCosts(selectedTransactionId)
      setTransactionLines(data)
    }
  }, [selectedLineForReview, selectedTransactionId, showToast])

  // Default column configuration for transactions table (documents column moved to lines table)
  const defaultColumns: ColumnConfig[] = useMemo(() => [
    { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, minWidth: 100, maxWidth: 200, type: 'text', resizable: true },
    { key: 'entry_date', label: 'التاريخ', visible: true, width: 130, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
    { key: 'description', label: 'البيان', visible: true, width: 280, minWidth: 200, maxWidth: 480, type: 'text', resizable: true },
    { key: 'total_debits', label: 'إجمالي المدين', visible: false, width: 150, minWidth: 130, maxWidth: 220, type: 'currency', resizable: true },
    { key: 'total_credits', label: 'إجمالي الدائن', visible: false, width: 150, minWidth: 130, maxWidth: 220, type: 'currency', resizable: true },
    { key: 'organization_name', label: 'المؤسسة', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'project_name', label: 'المشروع', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'reference_number', label: 'المرجع', visible: false, width: 120, minWidth: 100, maxWidth: 180, type: 'text', resizable: true },
    { key: 'notes', label: 'الملاحظات', visible: false, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'created_by_name', label: 'أنشئت بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'posted_by_name', label: 'مرحلة بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'posted_at', label: 'تاريخ الترحيل', visible: false, width: 160, minWidth: 140, maxWidth: 220, type: 'date', resizable: true },
    { key: 'approval_status', label: 'حالة الاعتماد', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'badge', resizable: false },
    { key: 'actions', label: 'الإجراءات', visible: true, width: 220, minWidth: 180, maxWidth: 400, type: 'actions', resizable: true }
  ], [])

  // Column preferences hook for headers table
  const {
    columns,
    handleColumnResize,
    handleColumnConfigChange,
    resetToDefaults
  } = useColumnPreferences({
    storageKey: 'transactions_table',
    defaultColumns,
    userId: currentUserId || undefined
  })

  // Default column configuration for lines table
  const defaultLineColumns: ColumnConfig[] = useMemo(() => [
    { key: 'line_no', label: 'رقم السطر', visible: true, width: 80, minWidth: 60, maxWidth: 120, type: 'number', resizable: true },
    { key: 'account_label', label: 'الحساب', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'debit_amount', label: 'المبلغ المدين', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
    { key: 'credit_amount', label: 'المبلغ الدائن', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'currency', resizable: true },
    { key: 'description', label: 'البيان', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'project_label', label: 'المشروع', visible: true, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'cost_center_label', label: 'مركز التكلفة', visible: true, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'line_items_count', label: 'عدد سطور التحليل', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'number', resizable: true },
    { key: 'line_items_total', label: 'اجمالي تحليل التكلفة', visible: true, width: 160, minWidth: 140, maxWidth: 220, type: 'currency', resizable: true },
    { key: 'work_item_label', label: 'عنصر العمل', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'classification_label', label: 'التصنيف', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'sub_tree_label', label: 'الشجرة الفرعية', visible: false, width: 150, minWidth: 120, maxWidth: 220, type: 'text', resizable: true },
    { key: 'cost_analysis', label: 'التكلفة', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'actions', resizable: true },
    { key: 'documents', label: 'المستندات', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'actions', resizable: true },
    { key: 'actions', label: 'الإجراءات', visible: true, width: 120, minWidth: 100, maxWidth: 180, type: 'actions', resizable: true }
  ], [])

  // Column preferences hook for lines table
  const {
    columns: lineColumns,
    handleColumnResize: handleLineColumnResize,
    handleColumnConfigChange: handleLineColumnConfigChange,
    resetToDefaults: resetLineColumnsToDefaults
  } = useColumnPreferences({
    storageKey: 'transactions_lines_table',
    defaultColumns: defaultLineColumns,
    userId: currentUserId || undefined
  })

  // Server-side load
  const [totalCount, setTotalCount] = useState(0)
  const [summaryStats, setSummaryStats] = useState({
    totalDebit: 0,
    totalCredit: 0,
    lineCount: 0,
    transactionCount: 0,
  })

  const reload = useCallback(async () => {
    await measurePerformance('transactions.reload', async () => {
      const effectiveFilters = headerAppliedFilters
      const txDebug = Boolean((window as any).__TX_DEBUG)
      if (import.meta.env.DEV && txDebug) {
        console.log('🚀 Reload triggered with filters:', {
          mode,
          approvalStatus: effectiveFilters.approvalStatus || 'none',
          orgId: effectiveFilters.orgId || 'none',
          projectId: effectiveFilters.projectId || 'none',
          page,
          pageSize
        });
      }

      const filtersToUse = {
        scope: (mode === 'my' ? 'my' : 'all') as 'all' | 'my',
        pendingOnly: mode === 'pending',
        search: effectiveFilters.search || undefined,
        dateFrom: effectiveFilters.dateFrom || undefined,
        dateTo: effectiveFilters.dateTo || undefined,
        amountFrom: effectiveFilters.amountFrom ? parseFloat(effectiveFilters.amountFrom) : undefined,
        amountTo: effectiveFilters.amountTo ? parseFloat(effectiveFilters.amountTo) : undefined,
        debitAccountId: effectiveFilters.debitAccountId || undefined,
        creditAccountId: effectiveFilters.creditAccountId || undefined,
        orgId: effectiveFilters.orgId || undefined,
        projectId: effectiveFilters.projectId || undefined,
        classificationId: effectiveFilters.classificationId || undefined,
        expensesCategoryId: effectiveFilters.expensesCategoryId || undefined,
        workItemId: effectiveFilters.workItemId || undefined,
        costCenterId: effectiveFilters.costCenterId || undefined,
        analysisWorkItemId: effectiveFilters.analysisWorkItemId || undefined,
        approvalStatus: effectiveFilters.approvalStatus ? (effectiveFilters.approvalStatus as 'submitted' | 'approved' | 'draft' | 'rejected' | 'revision_requested' | 'cancelled' | 'posted') : undefined,
      };
      if (import.meta.env.DEV && txDebug) console.log('🔍 Calling getTransactions with filters:', filtersToUse);

      const { rows, total } = await getTransactions({
        filters: filtersToUse,
        page,
        pageSize,
      })

      if (import.meta.env.DEV) {
        const uniqueStatuses = (rows || [])
          .map((r: any) => r.approval_status)
          .filter((v: any, i: number, a: any[]) => a.indexOf(v) === i)
        console.log('📊 getTransactions result:', {
          rowCount: rows?.length || 0,
          totalCount: total,
          statuses: uniqueStatuses,
        })
        if (txDebug) {
          console.log('🗂️ Full transaction list:', rows)
        }
      }

      setTransactions(rows || [])
      setTotalCount(total)

      // Fetch ALL matching transactions (without pagination) for accurate summary totals
      // This is a parallel query similar to AllLinesEnriched implementation
      const { rows: allRows } = await getTransactions({
        filters: filtersToUse,
        page: 1,
        pageSize: 999999, // Get all matching transactions
      })

      // Calculate summary statistics from ALL matching data (not just current page)
      const totalDebit = (allRows || []).reduce((sum, tx: any) => sum + Number(tx.total_debits || 0), 0)
      const totalCredit = (allRows || []).reduce((sum, tx: any) => sum + Number(tx.total_credits || 0), 0)
      const lineCount = (allRows || []).reduce((sum, tx: any) => sum + Number(tx.line_items_count || 0), 0)

      setSummaryStats({
        totalDebit,
        totalCredit,
        lineCount,
        transactionCount: (allRows || []).length,
      })

      // Note: categories, workItems now come from TransactionsDataContext
      // No need to fetch them here - context provides them

      // resolve creator/poster names
      const ids: string[] = []
      rows.forEach(t => { if (t.created_by) ids.push(t.created_by); if (t.posted_by) ids.push(t.posted_by!) })
      try {
        const map = await getUserDisplayMap(ids)
        setUserNames(map || {})
      } catch { }
    })
  }, [headerAppliedFilters, mode, page, pageSize, measurePerformance])

  // Helper function to get active filter labels
  const getActiveFilterLabels = useCallback((): string[] => {
    const labels: string[] = []
    const filters = headerAppliedFilters

    if (filters.search) labels.push(`بحث: ${filters.search}`)
    if (filters.dateFrom) labels.push(`من تاريخ: ${filters.dateFrom}`)
    if (filters.dateTo) labels.push(`إلى تاريخ: ${filters.dateTo}`)
    if (filters.amountFrom) labels.push(`من مبلغ: ${filters.amountFrom}`)
    if (filters.amountTo) labels.push(`إلى مبلغ: ${filters.amountTo}`)
    // Org and Project filters are persistent in the Top Bar ScopeContext, so we don't need to show them as badges again
    // if (filters.orgId) {
    //   const org = organizations.find(o => o.id === filters.orgId)
    //   if (org) labels.push(`مؤسسة: ${org.name_ar || org.name}`)
    // }
    // if (filters.projectId) {
    //   const project = projects.find(p => p.id === filters.projectId)
    //   if (project) labels.push(`مشروع: ${project.name_ar || project.name}`)
    // }
    if (filters.debitAccountId) {
      const account = accounts.find(a => a.id === filters.debitAccountId)
      if (account) labels.push(`حساب مدين: ${account.name_ar || account.name}`)
    }
    if (filters.creditAccountId) {
      const account = accounts.find(a => a.id === filters.creditAccountId)
      if (account) labels.push(`حساب دائن: ${account.name_ar || account.name}`)
    }
    if (filters.classificationId) {
      const classification = classifications.find(c => c.id === filters.classificationId)
      if (classification) labels.push(`تصنيف: ${(classification as any).name_ar || (classification as any).name}`)
    }
    if (filters.expensesCategoryId) {
      const category = categories.find(c => c.id === filters.expensesCategoryId)
      if (category) labels.push(`فئة مصروفات: ${(category as any).name_ar || (category as any).name}`)
    }
    if (filters.workItemId) {
      const workItem = workItems.find(w => w.id === filters.workItemId)
      if (workItem) labels.push(`عنصر عمل: ${(workItem as any).name_ar || (workItem as any).name}`)
    }
    if (filters.costCenterId) {
      const costCenter = costCenters.find(c => c.id === filters.costCenterId)
      if (costCenter) labels.push(`مركز تكلفة: ${(costCenter as any).name_ar || (costCenter as any).name}`)
    }
    if (filters.approvalStatus) {
      const statusLabels: Record<string, string> = {
        draft: 'مسودة',
        submitted: 'مُرسلة',
        approved: 'معتمدة',
        rejected: 'مرفوضة',
        revision_requested: 'طلب تعديل',
        cancelled: 'ملغاة',
        posted: 'مرحلة'
      }
      labels.push(`حالة: ${statusLabels[filters.approvalStatus] || filters.approvalStatus}`)
    }

    return labels
  }, [headerAppliedFilters, organizations, projects, accounts, classifications, categories, workItems, costCenters])

  // When opening the CRUD form, log for debugging
  // Note: accounts, categories, costCenters now come from TransactionsDataContext
  useEffect(() => {
    if (!formOpen) return
    // Runtime verification badge log
    console.log('🟢 line-editor v2 active', { createdTxId, isEditing: !!editingTx })
    console.log('🌳 Form opened - using context data:', {
      accountsCount: accounts.length,
      categoriesCount: categories.length,
      costCentersCount: costCenters.length,
      organizationsCount: organizations.length
    })
  }, [formOpen, editingTx, createdTxId, accounts.length, categories.length, costCenters.length, organizations.length])

  // Client-side status filter (other filters are server-side)
  // Server-side approval filter now applied; no extra client filtering
  const paged = transactions

  // Prepare table data for ResizableTable
  const tableData = useMemo(() => {
    return paged.map((t: any) => {
      const orgName = organizations.find(o => o.id === (t.org_id || ''))?.name || '—'
      const projectName = projects.find(p => p.id === (t.project_id || ''))?.name || '—'
      const createdBy = t.created_by ? (userNames[t.created_by] || t.created_by.substring(0, 8)) : '—'
      const postedBy = t.posted_by ? (userNames[t.posted_by] || t.posted_by.substring(0, 8)) : '—'
      const lineCount = Number((t as any).line_items_count ?? 0)
      const total = (() => {
        const lt = Number((t as any).line_items_total ?? 0)
        if (lt) return lt
        const d = Number((t as any).total_debits ?? 0)
        const c = Number((t as any).total_credits ?? 0)
        return Math.max(d, c)
      })()
      return {
        entry_number: t.entry_number,
        entry_date: t.entry_date,
        description: t.description,
        total_debits: Number((t as any).total_debits ?? 0),
        total_credits: Number((t as any).total_credits ?? 0),
        organization_name: orgName,
        project_name: projectName,
        reference_number: t.reference_number || '—',
        notes: t.notes || '—',
        created_by_name: createdBy,
        posted_by_name: postedBy,
        posted_at: (t as any).posted_at || null,
        approval_status: t.is_posted ? 'posted' : ((t as any).approval_status || 'draft'),
        actions: null,
        original: t,
      }
    })
  }, [paged, organizations, projects, userNames])

  // Export data
  const exportData = useMemo(() => {
    const activeFilters = getActiveFilterLabels()
    const filterInfo = activeFilters.length > 0
      ? `الفلاتر المطبقة: ${activeFilters.join(' | ')}`
      : 'عرض جميع البيانات (بدون فلاتر)'

    const columns = createStandardColumns([
      { key: 'filter_info', header: 'معلومات الفلتر', type: 'text' },
      { key: 'entry_number', header: 'رقم القيد', type: 'text' },
      { key: 'entry_date', header: 'التاريخ', type: 'date' },
      { key: 'description', header: 'البيان', type: 'text' },
      { key: 'total_debits', header: 'إجمالي المدين', type: 'currency' },
      { key: 'total_credits', header: 'إجمالي الدائن', type: 'currency' },
      { key: 'organization_name', header: 'المؤسسة', type: 'text' },
      { key: 'project_name', header: 'المشروع', type: 'text' },
      { key: 'reference_number', header: 'المرجع', type: 'text' },
      { key: 'notes', header: 'الملاحظات', type: 'text' },
      { key: 'created_by', header: 'أنشئت بواسطة', type: 'text' },
      { key: 'posted_by', header: 'مرحلة بواسطة', type: 'text' },
      { key: 'posted_at', header: 'تاريخ الترحيل', type: 'date' },
      { key: 'approval_status', header: 'حالة الاعتماد', type: 'text' },
    ])

    // Add summary row at the top
    const summaryRow = {
      filter_info: filterInfo,
      entry_number: `الإجمالي: ${summaryStats.transactionCount} معاملة`,
      entry_date: '',
      description: `عدد السطور: ${summaryStats.lineCount}`,
      total_debits: summaryStats.totalDebit,
      total_credits: summaryStats.totalCredit,
      organization_name: '',
      project_name: '',
      reference_number: '',
      notes: '',
      created_by: '',
      posted_by: '',
      posted_at: null,
      approval_status: '',
    }

    const rows = paged.map((t: any) => ({
      filter_info: '', // Only show in summary row
      entry_number: t.entry_number,
      entry_date: t.entry_date,
      description: t.description,
      total_debits: Number((t as any).total_debits ?? 0),
      total_credits: Number((t as any).total_credits ?? 0),
      organization_name: organizations.find(o => o.id === (t.org_id || ''))?.name || '',
      project_name: projects.find(p => p.id === (t.project_id || ''))?.name || '',
      reference_number: t.reference_number || '',
      notes: t.notes || '',
      created_by: t.created_by ? (userNames[t.created_by] || t.created_by) : '',
      posted_by: t.posted_by ? (userNames[t.posted_by] || t.posted_by) : '',
      posted_at: (t as any).posted_at || null,
      approval_status: t.is_posted
        ? 'مرحلة'
        : (({ draft: 'مسودة', submitted: 'مُرسلة', revision_requested: 'طلب تعديل', approved: 'معتمدة', rejected: 'مرفوضة', cancelled: 'ملغاة' } as any)[(t as any).approval_status || 'draft'] || 'مسودة'),
    }))

    return prepareTableData(columns, [summaryRow, ...rows])
  }, [paged, userNames, organizations, projects, summaryStats, getActiveFilterLabels])

  // Snapshot initial form data at open time to prevent clearing user selections
  const initialFormDataRef = React.useRef<any | null>(null)

  const buildInitialFormDataForEdit = (tx: TransactionRecord) => ({
    entry_number: tx.entry_number,
    entry_date: tx.entry_date,
    description: tx.description,
    description_ar: (tx as any).description_ar || '',
    debit_account_id: tx.debit_account_id,
    credit_account_id: tx.credit_account_id,
    amount: tx.amount,
    reference_number: tx.reference_number || '',
    notes: tx.notes || '',
    notes_ar: (tx as any).notes_ar || '',
    classification_id: tx.classification_id || '',
    sub_tree_id: (tx as any).sub_tree_id || '',
    work_item_id: (tx as any).work_item_id || '',
    analysis_work_item_id: (tx as any).analysis_work_item_id || '',
    cost_center_id: tx.cost_center_id || '',
    org_id: tx.org_id || '',
    project_id: tx.project_id || ''
  })

  const _buildInitialFormDataForCreate = () => {
    // Default organization (MAIN) and project (GENERAL)
    const defaultOrg = organizations.find(org => org.code === 'MAIN');
    const defaultProject = projects.find(project => project.code === 'GENERAL');

    console.log('🌳 buildInitialFormDataForCreate - organizations available:', organizations.length);
    console.log('🌳 Default org found:', defaultOrg ? { id: defaultOrg.id, code: defaultOrg.code, name: defaultOrg.name } : null);

    // Restore last selected debit/credit if available
    let lastDebit = ''
    let lastCredit = ''
    try {
      lastDebit = localStorage.getItem('tx_last_debit_account_id') || ''
      lastCredit = localStorage.getItem('tx_last_credit_account_id') || ''
    } catch { }

    const initialData = {
      entry_number: 'سيتم توليده تلقائياً',
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      description_ar: '',
      debit_account_id: lastDebit,
      credit_account_id: lastCredit,
      amount: 0,
      reference_number: '',
      notes: '',
      notes_ar: '',
      org_id: defaultOrg?.id || '',
      project_id: defaultProject?.id || ''
    }

    console.log('🌳 Initial form data created with org_id:', initialData.org_id);
    return initialData;
  }

  // Helper to enrich a transaction with display fields so UI reflects org/project immediately
  const enrichTx = (tx: TransactionRecord) => {
    const orgName = organizations.find(o => o.id === (tx.org_id || ''))?.name || null
    const projectName = projects.find(p => p.id === (tx.project_id || ''))?.name || null
    return { ...(tx as any), organization_name: orgName, project_name: projectName } as any
  }

  // Unified form handlers
  const _handleFormSubmit = async (data: any) => {
    _setFormErrors({})
    try {
      _setIsSaving(true)

      // Perform backend validation only when editing an existing transaction (header-only create has no lines yet)
      if (editingTx) {
        try {
          if (!transactionValidationAPI || typeof transactionValidationAPI.validateTransactionBeforeSave !== 'function') {
            console.warn('Transaction validation API not available, skipping backend validation')
            throw new Error('Validation API not available')
          }

          const validationResult = await transactionValidationAPI.validateTransactionBeforeSave({
            transaction_id: editingTx.id,
            description: data.description,
            entry_date: data.entry_date,
            debit_account_id: '', // Header validation doesn't have line details
            credit_account_id: '',
            amount: 0,
          } as any)

          // Show validation warnings (but allow proceeding)
          if (validationResult.warnings.length > 0) {
            const warningMessage = validationResult.warnings.map((w: any) => w.message).join('\n')
            const proceed = window.confirm(`تحذيرات التحقق:\n${warningMessage}\n\nهل تريد المتابعة؟`)
            if (!proceed) {
              _setIsSaving(false)
              return
            }
          }

          // Block submission if there are errors
          if (!validationResult.is_valid) {
            const errorMessage = validationResult.errors.map((e: any) => e.message).join('\n')
            showToast(`أخطاء في التحقق من صحة المعاملة:\n${errorMessage}`, { severity: 'error' })
            _setIsSaving(false)
            return
          }
        } catch (validationError) {
          console.warn('Backend validation skipped for header-only or failed gracefully:', validationError)
          // Continue with normal processing if backend validation fails
        }
      }

      if (editingTx) {
        // Update existing transaction
        const attemptedUpdate = {
          entry_date: data.entry_date,
          description: data.description,
          description_ar: data.description_ar || null,
          reference_number: data.reference_number || null,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          notes: data.notes || null,
          notes_ar: data.notes_ar || null,
          classification_id: data.classification_id || null,
          sub_tree_id: data.sub_tree_id || null,
          work_item_id: data.work_item_id || null,
          analysis_work_item_id: data.analysis_work_item_id || null,
          cost_center_id: data.cost_center_id || null,
          org_id: data.org_id || null,
          project_id: data.project_id || null,
        } as const
        const updated = await updateTransaction(editingTx.id, attemptedUpdate as any)
        // Ensure display fields (organization_name/project_name) are updated locally
        const updatedEnriched = enrichTx(updated)
        setTransactions(prev => prev.map(t => t.id === updated.id ? updatedEnriched : t))
        showToast('تم تحديث المعاملة', { severity: 'success' })
        // Ensure server truth is reflected (joins, computed fields)
        await reload()
      } else {
        // Create draft header (header-only fields)
        const payload = {
          entry_date: data.entry_date,
          description: data.description,
          description_ar: data.description_ar || null,
          reference_number: data.reference_number || null,
          notes: data.notes || null,
          notes_ar: data.notes_ar || null,
          org_id: data.org_id || null,
          project_id: data.project_id || null,
        } as const
        const { data: created, error } = await supabase
          .from('transactions')
          .insert(payload)
          .select('*')
          .single()
        if (error) throw error
        const createdEnriched = enrichTx(created as unknown as TransactionRecord)
        // Keep panel open, switch to edit mode so lines section is available
        setEditingTx(createdEnriched)
        setCreatedTxId(createdEnriched.id)
        _setKeepCreateTitle(true)
        initialFormDataRef.current = {
          entry_number: createdEnriched.entry_number || '—',
          entry_date: createdEnriched.entry_date,
          description: createdEnriched.description || '',
          description_ar: (createdEnriched as any).description_ar || '',
          reference_number: createdEnriched.reference_number || '',
          notes: createdEnriched.notes || '',
          notes_ar: (createdEnriched as any).notes_ar || '',
          org_id: createdEnriched.org_id || '',
          project_id: createdEnriched.project_id || ''
        }
        setFormOpen(true)
        // Also add to list on top
        setTransactions(prev => [createdEnriched as any, ...prev])
        showToast('تم إنشاء مسودة المعاملة — أضف القيود التفصيلية ثم احفظ المسودة', { severity: 'success' })
      }

      // Keep panel open in edit mode after header creation; do not close here
    } catch (e: any) {
      // Rollback optimistic update if it was a create
      if (!editingTx) {
        setTransactions(prev => prev.filter(t => !(typeof t.id === 'string' && t.id.startsWith('temp-'))))
      }
      const msg = e?.message || 'خطأ في حفظ المعاملة'
      _setFormErrors({ general: msg })
      const operation = editingTx ? 'تحديث' : 'إنشاء'
      const detail = editingTx ? ` (رقم القيد ${editingTx.entry_number})` : ''
      showToast(`فشل ${operation} المعاملة${detail}. تم التراجع عن العملية. السبب: ${msg}`.trim(), { severity: 'error' })
      logClientError({
        context: editingTx ? 'transactions.update' : 'transactions.create',
        message: msg,
        extra: editingTx ? {
          id: editingTx.id, attempted: {
            entry_date: data.entry_date,
            description: data.description,
            reference_number: data.reference_number || null,
            debit_account_id: data.debit_account_id,
            credit_account_id: data.credit_account_id,
            amount: parseFloat(data.amount),
            notes: data.notes || null,
            classification_id: data.classification_id || null,
            sub_tree_id: data.sub_tree_id || null,
            work_item_id: data.work_item_id || null,
            cost_center_id: data.cost_center_id || null,
            org_id: data.org_id || null,
            project_id: data.project_id || null,
          }
        } : data
      })
    } finally {
      _setIsSaving(false)
    }
  }

  // Lines summary state for current editing transaction
  const [lines, setLines] = useState<any[]>([])
  const [linesTotals, setLinesTotals] = useState<{ debits: number; credits: number; count: number; balanced: boolean }>({ debits: 0, credits: 0, count: 0, balanced: false })

  // Section 2: single-row line entry form (mapped to transaction_lines)
  const [lineForm, setLineForm] = useState<{
    id?: string | null;
    account_id: string;
    debit_amount: string;
    credit_amount: string;
    description: string;
    project_id?: string;
    cost_center_id?: string;
    work_item_id?: string;
    analysis_work_item_id?: string;
    classification_id?: string;
    sub_tree_id?: string;
  }>({ id: null, account_id: '', debit_amount: '', credit_amount: '', description: '', project_id: '', cost_center_id: '', work_item_id: '', analysis_work_item_id: '', classification_id: '', sub_tree_id: '' })
  const [editingLine, setEditingLine] = useState<boolean>(false)

  const resetLineForm = () => setLineForm({ id: null, account_id: '', debit_amount: '', credit_amount: '', description: '', project_id: '', cost_center_id: '', work_item_id: '', analysis_work_item_id: '', classification_id: '', sub_tree_id: '' })

  const submitLine = useCallback(async () => {
    const txId = editingTx?.id || createdTxId
    if (!txId) return
    const d = Number(lineForm.debit_amount || 0)
    const c = Number(lineForm.credit_amount || 0)
    if ((d > 0 && c > 0) || (d === 0 && c === 0)) {
      showToast('يجب أن يكون السطر إما مدين أو دائن فقط', { severity: 'error' })
      return
    }
    try {
      if (editingLine && lineForm.id) {
        const { error } = await supabase
          .from('transaction_lines')
          .update({
            account_id: lineForm.account_id,
            debit_amount: d,
            credit_amount: c,
            description: lineForm.description || null,
            project_id: lineForm.project_id || null,
            cost_center_id: lineForm.cost_center_id || null,
            work_item_id: lineForm.work_item_id || null,
            analysis_work_item_id: lineForm.analysis_work_item_id || null,
            classification_id: lineForm.classification_id || null,
            sub_tree_id: lineForm.sub_tree_id || null,
          })
          .eq('id', lineForm.id)
        if (error) throw error
        showToast('تم تحديث السطر', { severity: 'success' })
      } else {
        const nextLineNo = (lines[lines.length - 1]?.line_no || 0) + 1
        const { error } = await supabase
          .from('transaction_lines')
          .insert({
            transaction_id: txId,
            line_no: nextLineNo,
            account_id: lineForm.account_id,
            debit_amount: d,
            credit_amount: c,
            description: lineForm.description || null,
            project_id: lineForm.project_id || null,
            cost_center_id: lineForm.cost_center_id || null,
            work_item_id: lineForm.work_item_id || null,
            analysis_work_item_id: lineForm.analysis_work_item_id || null,
            classification_id: lineForm.classification_id || null,
            sub_tree_id: lineForm.sub_tree_id || null,
          })
        if (error) throw error
        showToast('تم إضافة السطر', { severity: 'success' })
      }
      resetLineForm()
      setEditingLine(false)
    } catch (e: any) {
      showToast(e?.message || 'فشل حفظ السطر', { severity: 'error' })
    }
  }, [createdTxId, editingLine, editingTx?.id, lineForm, lines, showToast])

  // Poll lines when form open and editingTx is set — pause when tab hidden and back off interval
  useEffect(() => {
    let timer: any = null
    let lastKeyAt = 0

    const onKey = () => { lastKeyAt = Date.now() }
    const onVisibility = () => {
      // Trigger a fast refresh when the tab gains focus again
      if (!document.hidden) {
        void tick(true)
      }
    }

    async function tick(immediate = false) {
      try {
        const txId = editingTx?.id || createdTxId
        // Skip when not visible or form closed
        if (!document.hidden && formOpen && txId) {
          // If the user typed in the last 1500ms, delay a bit to avoid jank while typing
          const sinceType = Date.now() - lastKeyAt
          if (!immediate && sinceType < 1500) {
            schedule(800)
            return
          }
          const { data, error } = await supabase
            .from('v_transaction_lines_enriched')
            .select('*')
            .eq('transaction_id', txId)
            .order('line_no', { ascending: true })
          if (!error && Array.isArray(data)) {
            setLines(data)
            const d = data.reduce((s, l: any) => s + Number(l.debit_amount || 0), 0)
            const c = data.reduce((s, l: any) => s + Number(l.credit_amount || 0), 0)
            setLinesTotals({ debits: d, credits: c, count: data.length, balanced: Math.abs(d - c) < 0.01 && data.length >= 2 })
          }
        }
      } catch { }
      // Back off slightly to reduce churn
      schedule(2500)
    }

    function schedule(ms: number) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void tick(), ms)
    }

    // Start
    schedule(300)
    window.addEventListener('keydown', onKey, { capture: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('keydown', onKey, { capture: true } as any)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [formOpen, editingTx, createdTxId])

  // Lines layout preferences (columns/order/visibility)
  const [_linesLayoutOpen, _setLinesLayoutOpen] = useState(false)
  const [linesColumnCount, _setLinesColumnCount] = useState<1 | 2 | 3>(() => { try { return Number(localStorage.getItem('txLines:columns') || '3') as 1 | 2 | 3 } catch { return 3 } })
  const defaultLinesOrder = useMemo(() => ['account', 'debit', 'credit', 'description_line', 'project', 'cost_center', 'work_item', 'classification', 'sub_tree'], [])
  const [linesFieldOrder, _setLinesFieldOrder] = useState<string[]>(() => { try { const s = localStorage.getItem('txLines:order'); return s ? JSON.parse(s) : defaultLinesOrder } catch { return defaultLinesOrder } })
  const [linesFullWidth, _setLinesFullWidth] = useState<Set<string>>(() => { try { const s = localStorage.getItem('txLines:fullWidth'); return s ? new Set(JSON.parse(s)) : new Set(['description_line']) } catch { return new Set(['description_line']) } })
  const [linesVisible, _setLinesVisible] = useState<Set<string>>(() => { try { const s = localStorage.getItem('txLines:visible'); return s ? new Set(JSON.parse(s)) : new Set(['account', 'debit', 'credit', 'description_line', 'project', 'cost_center', 'work_item', 'classification', 'sub_tree']) } catch { return new Set(['account', 'debit', 'credit', 'description_line', 'project', 'cost_center', 'work_item', 'classification', 'sub_tree']) } })

  useEffect(() => { try { localStorage.setItem('txLines:columns', String(linesColumnCount)) } catch { } }, [linesColumnCount])
  useEffect(() => { try { localStorage.setItem('txLines:order', JSON.stringify(linesFieldOrder)) } catch { } }, [linesFieldOrder])
  useEffect(() => { try { localStorage.setItem('txLines:fullWidth', JSON.stringify(Array.from(linesFullWidth))) } catch { } }, [linesFullWidth])
  useEffect(() => { try { localStorage.setItem('txLines:visible', JSON.stringify(Array.from(linesVisible))) } catch { } }, [linesVisible])

  const _lineFieldsMeta: FormField[] = [
    { id: 'account', type: 'searchable-select', label: 'الحساب' },
    { id: 'debit', type: 'number', label: 'مدين' },
    { id: 'credit', type: 'number', label: 'دائن' },
    { id: 'description_line', type: 'text', label: 'البيان' },
    { id: 'project', type: 'searchable-select', label: 'المشروع' },
    { id: 'cost_center', type: 'searchable-select', label: 'مركز التكلفة' },
    { id: 'work_item', type: 'searchable-select', label: 'عنصر العمل' },
    { id: 'classification', type: 'searchable-select', label: 'تصنيف المعاملة' },
    { id: 'sub_tree', type: 'searchable-select', label: 'الشجرة الفرعية' },
  ]

  const _orderedLineFields = React.useMemo(() => {
    const base = linesFieldOrder && linesFieldOrder.length ? linesFieldOrder : defaultLinesOrder
    return base.filter(id => linesVisible.has(id))
  }, [linesFieldOrder, linesVisible, defaultLinesOrder])

  const _renderLineField = (id: string) => {
    switch (id) {
      case 'account': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_account"><span>الحساب</span><span className={formStyles.requiredStar}><Star size={12} fill="currentColor" /></span></label>
          <SearchableSelect
            id="line_account"
            value={lineForm.account_id}
            options={accounts
              .filter(a => a.is_postable)
              .sort((x, y) => x.code.localeCompare(y.code))
              .map(a => {
                const nameAr = (a as any).name_ar || a.name
                return {
                  value: a.id,
                  label: `${a.code} - ${nameAr}`,
                  searchText: `${a.code} ${nameAr}`.toLowerCase(),
                }
              })}
            onChange={(val: string | number | null) => setLineForm(f => ({ ...f, account_id: String(val || '') }))}
            placeholder="اختر الحساب…"
          />
        </div>
      )
      case 'debit': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_debit"><span>مدين</span></label>
          <input id="line_debit" type="number" step="0.01" placeholder="0.00" value={lineForm.debit_amount} onChange={e => setLineForm(f => ({ ...f, debit_amount: e.target.value, credit_amount: '' }))} style={{ width: '100%', textAlign: 'right' }} />
        </div>
      )
      case 'credit': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_credit"><span>دائن</span></label>
          <input id="line_credit" type="number" step="0.01" placeholder="0.00" value={lineForm.credit_amount} onChange={e => setLineForm(f => ({ ...f, credit_amount: e.target.value, debit_amount: '' }))} style={{ width: '100%', textAlign: 'right' }} />
        </div>
      )
      case 'description_line': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_desc"><span>البيان</span></label>
          <input id="line_desc" type="text" placeholder="اكتب البيان..." value={lineForm.description} onChange={e => setLineForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%' }} />
        </div>
      )
      case 'project': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_project"><span>المشروع</span></label>
          <SearchableSelect
            id="line_project"
            value={lineForm.project_id || ''}
            options={[{ value: '', label: 'بدون مشروع', searchText: '' }, ...projects.map(p => ({ value: p.id, label: `${p.code} - ${p.name}`, searchText: `${p.code} ${p.name}`.toLowerCase() }))]}
            onChange={(val: string | number | null) => setLineForm(f => ({ ...f, project_id: String(val || '') }))}
            placeholder="المشروع"
          />
        </div>
      )
      case 'cost_center': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_cc"><span>مركز التكلفة</span></label>
          <SearchableSelect
            id="line_cc"
            value={lineForm.cost_center_id || ''}
            options={[{ value: '', label: 'بدون مركز تكلفة', searchText: '' }, ...costCenters.map(cc => ({ value: cc.id, label: `${cc.code} - ${cc.name}`, searchText: `${cc.code} ${cc.name}`.toLowerCase() }))]}
            onChange={(val: string | number | null) => setLineForm(f => ({ ...f, cost_center_id: String(val || '') }))}
            placeholder="مركز التكلفة"
          />
        </div>
      )
      case 'work_item': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_work"><span>عنصر العمل</span></label>
          <SearchableSelect
            id="line_work"
            value={lineForm.work_item_id || ''}
            options={[{ value: '', label: 'بدون عنصر', searchText: '' }, ...workItems.map(w => ({ value: w.id, label: `${w.code} - ${w.name}`, searchText: `${w.code} ${w.name}`.toLowerCase() }))]}
            onChange={(val: string | number | null) => setLineForm(f => ({ ...f, work_item_id: String(val || '') }))}
            placeholder="عنصر العمل"
          />
        </div>
      )
      case 'classification': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_class"><span>تصنيف المعاملة</span></label>
          <SearchableSelect
            id="line_class"
            value={lineForm.classification_id || ''}
            options={[{ value: '', label: 'بدون تصنيف', searchText: '' }, ...classifications.map(c => ({ value: c.id, label: `${c.code} - ${c.name}`, searchText: `${c.code} ${c.name}`.toLowerCase() }))]}
            onChange={(val: string | number | null) => setLineForm(f => ({ ...f, classification_id: String(val || '') }))}
            placeholder="تصنيف المعاملة"
          />
        </div>
      )
      case 'sub_tree': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_sub"><span>الشجرة الفرعية</span></label>
          <SearchableSelect
            id="line_sub"
            value={lineForm.sub_tree_id || ''}
            options={[{ value: '', label: 'بدون عقدة', searchText: '' }, ...categories.map(cat => ({ value: cat.id, label: `${cat.code} - ${cat.description}`, searchText: `${cat.code} ${cat.description}`.toLowerCase() }))]}
            onChange={(val: string | number | null) => setLineForm(f => ({ ...f, sub_tree_id: String(val || '') }))}
            placeholder="الشجرة الفرعية"
          />
        </div>
      )
      default: return null
    }
  }

  // Keyboard shortcuts for power users inside the modal
  useEffect(() => {
    if (!formOpen) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (editingTx || createdTxId) {
          if (linesTotals.balanced) {
            setFormOpen(false); setEditingTx(null)
            showToast('تم حفظ المسودة بنجاح', { severity: 'success' })
            void reload()
          } else {
            showToast('القيود غير متوازنة — لا يمكن الحفظ', { severity: 'warning' as any })
          }
        } else {
          formRef.current?.submit()
        }
      }
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        if (editingTx || createdTxId) submitLine()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [formOpen, editingTx, createdTxId, linesTotals.balanced, reload, showToast, submitLine])

  const _handleFormCancel = () => {
    setEditingTx(null)
    setCreatedTxId(null)
    setFormOpen(false)
    _setKeepCreateTitle(false)
    _setFormErrors({})
  }

  const handleDelete = async (id: string) => {
    const ok = window.confirm('هل أنت متأكد من حذف هذه المعاملة غير المرحلة؟')
    if (!ok) return
    // optimistic remove
    const prev = transactions
    const rec = transactions.find(t => t.id === id)
    const next = transactions.filter(t => t.id !== id)
    setTransactions(next)
    try {
      await measurePerformance('transactions.delete', async () => {
        await deleteTransaction(id)
        showToast('تم حذف المعاملة', { severity: 'success' })
      })
      // Refresh table data from server after successful deletion
      await reload()
    } catch (e: any) {
      // rollback
      setTransactions(prev)
      const detail = rec ? ` (رقم القيد ${rec.entry_number})` : ''
      const msg = e?.message || ''
      showToast(`فشل حذف المعاملة${detail}. تم التراجع عن العملية. السبب: ${msg}`.trim(), { severity: 'error' })
      logClientError({ context: 'transactions.delete', message: msg, extra: { id } })
    }
  }

  const openEnhancedReview = (id: string) => {
    setSelectedReviewTxId(id)
    setApprovalWorkflowOpen(true)
  }


  // Reload transactions when appliedFilters, pagination, or mode changes
  useEffect(() => {
    if (dataLoading) return
    setLoading(true)
    reload()
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [dataLoading, reload])

  if (dataLoading) {
    if (contextError) return <div className="error-container">خطأ: {contextError}</div>
    return <div className="loading-container"><div className="loading-spinner" />جاري تحميل البيانات الأساسية...</div>
  }
  if (error) return <div className="error-container">خطأ: {error}</div>

  return (
    <div className="transactions-container" dir="rtl">
      <div className="transactions-header">
        <h1 className="transactions-title">المعاملات</h1>
        <div className="transactions-actions">
          <WithPermission perm="transactions.create">
            <button className="ultimate-btn ultimate-btn-add" onClick={() => { console.log('🟢 New Transaction button clicked'); setWizardOpen(true); setFormOpen(false); setEditingTx(null); setCreatedTxId(null); }}>
              <div className="btn-content"><span className="btn-text">+ معاملة جديدة</span></div>
            </button>
          </WithPermission>
          <ExportButtons
            data={exportData}
            config={{ title: 'تقرير المعاملات', rtlLayout: true, useArabicNumerals: true }}
            size="small"
            layout="horizontal"
          />
          <WithPermission perm="transactions.manage">
            <button className="ultimate-btn ultimate-btn-warning" onClick={() => setShowLogs(true)}>
              <div className="btn-content"><span className="btn-text">سجل الأخطاء</span></div>
            </button>
          </WithPermission>
          <button className="ultimate-btn ultimate-btn-warning" onClick={() => setShowDiag(v => !v)}>
            <div className="btn-content"><span className="btn-text">{showDiag ? 'إخفاء الصلاحيات' : 'عرض الصلاحيات'}</span></div>
          </button>
        </div>
      </div>

      {showDiag && (
        <div className="diag-panel">
          <div className="diag-perms-box">
            {['transactions.create', 'transactions.update', 'transactions.delete', 'transactions.post', 'transactions.review', 'transactions.manage'].map(key => (
              <PermissionBadge key={key} allowed={hasPerm(key)} label={key} />
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="transactions-content">

        {/* SECTION 1: TRANSACTION HEADERS TABLE (T1) */}
        <div className="transactions-section headers-section">

          <TransactionsHeaderControls
            title="المعاملات (رؤوس القيود)"
            onOpenColumns={() => setHeadersColumnConfigOpen(true)}
            filters={headerFilters}
            onFilterChange={updateHeaderFilter}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
            filtersDirty={headerFiltersDirty}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={nextPage => setPage(nextPage)}
            onPageSizeChange={nextSize => { setPageSize(nextSize); setPage(1) }}
            filterStorageKey="transactions_filters"
            filterConfig={{
              showClassification: false,
              showExpensesCategory: false,
              showWorkItem: false,
              showAnalysisWorkItem: false,
              showCostCenter: false,
              showAmountRange: false
            }}
            summaryBar={
              <TransactionsSummaryBar
                totalCount={totalCount}
                totalDebit={summaryStats.totalDebit}
                totalCredit={summaryStats.totalCredit}
                lineCount={summaryStats.lineCount}
                transactionCount={summaryStats.transactionCount}
                activeFilters={getActiveFilterLabels()}
                onClearFilters={handleResetFilters}
              />
            }
          />

          {/* Headers table (T1) */}
          <OptimizedSuspense fallback={<div className="p-4 text-center">جاري تحميل جدول المعاملات...</div>}>
            <TransactionsHeaderTable
              key={`headers-table-${transactions.length}`}
              transactions={transactions}
              accounts={accounts}
              organizations={organizations}
              projects={projects}
              categories={categories}
              workItems={workItems}
              analysisItemsMap={analysisItemsMap}
              classifications={classifications.map(c => ({ ...c, code: String(c.code) }))}
              userNames={userNames}
              columns={columns}
              wrapMode={wrapMode}
              loading={loading}
              onColumnResize={handleColumnResize}
              onSelectTransaction={async (tx: TransactionRecord) => {
                setSelectedTransactionId(tx.id)
                _setSelectedLineId(null)

                // Load dimensions for this transaction's organization on-demand
                if (tx.org_id) {
                  console.log(`🔄 Loading dimensions for transaction org ${tx.org_id}`)
                  await loadDimensionsForOrg(tx.org_id)
                }
              }}
              onOpenDetails={(tx: TransactionRecord) => openDetails(tx)}
              selectedTransactionId={selectedTransactionId ?? undefined}
              onEdit={(tx: TransactionRecord) => {
                _setKeepCreateTitle(false)
                setEditingTx(tx)
                initialFormDataRef.current = buildInitialFormDataForEdit(tx)
                setWizardOpen(true)  // Open TransactionWizard instead of form
                setFormOpen(false)   // Ensure form is closed
              }}
              onDelete={(tx: TransactionRecord) => openDetails(tx, { openDeleteModal: true })}
              onOpenDocuments={(tx: TransactionRecord) => {
                setDocumentsFor(tx)
                setDocumentsOpen(true)
              }}
              onOpenApprovalWorkflow={(tx: TransactionRecord) => openEnhancedReview(tx.id)}
              mode={mode}
              currentUserId={currentUserId || undefined}
              hasPerm={hasPerm}
            />
          </OptimizedSuspense>
        </div>

        {/* DIVIDER */}
        <div className="transactions-section-divider">
          <span>القيود التفصيلية للمعاملة المحددة</span>
        </div>

        {/* Lines Filter Bar - Using UnifiedFilterBar */}
        {selectedTransactionId && (
          <TransactionsLinesFilters
            totalLines={transactionLines.length}
            filteredLines={filteredTransactionLines.length}
            filters={lineFilters}
            onFilterChange={updateLineFilter}
            onResetFilters={resetLineFilters}
          />
        )}

        {/* SECTION 2: TRANSACTION LINES TABLE (T2) */}
        {selectedTransactionId && (
          <div className="transactions-section lines-section">
            <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2>القيود التفصيلية</h2>
                <div className="section-controls">
                  <button
                    className="ultimate-btn ultimate-btn-edit"
                    onClick={() => setLineColumnsConfigOpen(true)}
                    disabled={!selectedTransactionId}
                    title="إعدادات أعمدة جدول القيود التفصيلية"
                  >
                    <div className="btn-content"><span className="btn-text">⚙️ إعدادات الأعمدة</span></div>
                  </button>
                  <label className="wrap-toggle">
                    <input
                      type="checkbox"
                      checked={lineWrapMode}
                      onChange={(e) => setLineWrapMode(e.target.checked)}
                    />
                    <span>التفاف النص</span>
                  </label>
                  <button
                    className="ultimate-btn ultimate-btn-warning"
                    onClick={async () => {
                      if (!confirmRestore('transactions_lines_table_reset_confirm_suppressed', 'سيتم استعادة الإعدادات الافتراضية لأعمدة جدول القيود التفصيلية.')) return
                      try {
                        setLineWrapMode(false)
                        try { localStorage.setItem('transactions_lines_table_wrap', '0') } catch { }
                        handleLineColumnConfigChange(defaultLineColumns)
                        if (currentUserId) {
                          const mod = await import('../../services/column-preferences')
                          await mod.upsertUserColumnPreferences({
                            tableKey: 'transactions_lines_table',
                            columnConfig: { columns: defaultLineColumns, wrapMode: false },
                            version: 1,
                          })
                        }
                        showToast('تمت استعادة الإعدادات الافتراضية للجدول', { severity: 'success' })
                      } catch {
                        showToast('فشل استعادة الإعدادات الافتراضية', { severity: 'error' })
                      }
                    }}
                    title="استعادة الإعدادات الافتراضية"
                    disabled={!selectedTransactionId}
                  >
                    <div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div>
                  </button>
                </div>
              </div>
            </div>

            <OptimizedSuspense fallback={<div className="p-4 text-center">جاري تحميل جدول القيود...</div>}>
              <TransactionLinesTable
                lines={transactionLines}
                transaction={transactions.find(t => t.id === selectedTransactionId) || detailsFor}
                audit={audit}
                approvalHistory={approvalHistory}
                userNames={userNames}
                accounts={accounts}
                projects={projects}
                organizations={organizations}
                classifications={classifications}
                categories={categories}
                workItems={workItems}
                costCenters={costCenters}
                analysisItemsMap={analysisItemsMap}
                currentUserId={currentUserId}
                mode={mode}
                canEdit={hasPerm('transactions.update')}
                canDelete={hasPerm('transactions.delete')}
                canReview={hasPerm('transactions.review')}
                canPost={hasPerm('transactions.post')}
                canManage={hasPerm('transactions.manage')}
                onSelectLine={(line) => _setSelectedLineId(line.id)}
                onEditLine={(line) => {
                  console.log('Edit line functionality to be implemented:', line.id)
                  // TODO: Implement line editing
                }}
                onDeleteLine={async (id) => {
                  const ok = window.confirm('هل أنت متأكد من حذف هذا السطر؟')
                  if (!ok) return
                  try {
                    const { deleteTransactionLine } = await import('../../services/transaction-lines')
                    await deleteTransactionLine(id)
                    showToast('تم حذف السطر', { severity: 'success' })
                    // Reload transaction lines
                    if (selectedTransactionId) {
                      const { data } = await supabase
                        .from('v_transaction_lines_enriched')
                        .select('*')
                        .eq('transaction_id', selectedTransactionId)
                        .order('line_no', { ascending: true })
                      setTransactionLines(data || [])
                    }
                  } catch (error: any) {
                    showToast('فشل في حذف السطر: ' + error.message, { severity: 'error' })
                  }
                }}
                onOpenDocuments={(line) => {
                  setDocumentsForLine(line)
                  setDocumentsOpen(true)
                }}
                onOpenLineReview={handleOpenLineReview}
                onClose={() => _setDetailsOpen(false)}
                onUpdate={async (updatedTransaction) => {
                  try {
                    const updateData = {
                      entry_date: updatedTransaction.entry_date,
                      description: updatedTransaction.description,
                      reference_number: updatedTransaction.reference_number || null,
                      debit_account_id: updatedTransaction.debit_account_id,
                      credit_account_id: updatedTransaction.credit_account_id,
                      amount: updatedTransaction.amount,
                      notes: updatedTransaction.notes || null,
                      classification_id: updatedTransaction.classification_id || null,
                      sub_tree_id: (updatedTransaction as any).sub_tree_id || null,
                      work_item_id: (updatedTransaction as any).work_item_id || null,
                      analysis_work_item_id: (updatedTransaction as any).analysis_work_item_id || null,
                      cost_center_id: updatedTransaction.cost_center_id || null,
                      org_id: updatedTransaction.org_id || null,
                      project_id: updatedTransaction.project_id || null,
                    }
                    const updated = await updateTransaction(updatedTransaction.id, updateData as any)
                    const enrichedUpdated = enrichTx(updated)
                    setTransactions(prev => prev.map(t => t.id === updated.id ? enrichedUpdated : t))
                    showToast('تم تحديث المعاملة', { severity: 'success' })
                    await reload()
                  } catch (e: any) {
                    throw new Error(e?.message || 'فشل في تحديث المعاملة')
                  }
                }}
                onDelete={async (transactionId: string) => {
                  await handleDelete(transactionId)
                }}
                onPost={async (transactionId: string) => {
                  await measurePerformance('transactions.post.inline', async () => {
                    await withRetry(() => postTransaction(transactionId))
                    showToast('تم ترحيل المعاملة', { severity: 'success' })
                  })
                  await reload()
                }}
                columns={lineColumns}
                wrapMode={lineWrapMode}
                loading={loading}
                selectedLineId={_selectedLineId || undefined}
                onColumnResize={handleLineColumnResize}
              />
            </OptimizedSuspense>
          </div>
        )}

        {/* Admin: Client Error Logs Viewer */}
        {showLogs && (
          <div className="transaction-modal" onClick={() => setShowLogs(false)}>
            <div className="transaction-modal-content transaction-modal-content--wide" onClick={e => e.stopPropagation()}>
              <div className="modal-header-row">
                <h3 className="modal-title">سجل أخطاء العميل</h3>
                <button className="ultimate-btn ultimate-btn-delete" onClick={() => setShowLogs(false)}>
                  <div className="btn-content"><span className="btn-text">إغلاق</span></div>
                </button>
              </div>
              <ClientErrorLogs />
            </div>
          </div>
        )}

        {/* Enhanced Line Approval Manager Modal */}
        {approvalWorkflowOpen && selectedReviewTxId && (
          <OptimizedSuspense fallback={<div className="p-4 text-center">جاري تحميل نظام الموافقات الجديد...</div>}>
            <EnhancedLineApprovalManager
              transactionId={selectedReviewTxId}
              onClose={() => {
                setApprovalWorkflowOpen(false)
                setSelectedReviewTxId(null)
              }}
              onApprovalComplete={async () => {
                setApprovalWorkflowOpen(false)
                setSelectedReviewTxId(null)
                await reload()
              }}
              onApprovalFailed={(error) => {
                console.error('Approval failed:', error)
                showToast('فشل إجراء الموافقة: ' + error, { severity: 'error' })
              }}
            />
          </OptimizedSuspense>
        )}

        {/* Enhanced Line Review Modal (Single Line) */}
        {lineReviewOpen && selectedLineForReview && (
          <OptimizedSuspense fallback={<div className="p-4 text-center">جاري تحميل مراجعة السطر...</div>}>
            <EnhancedLineReviewModalV2
              open={lineReviewOpen}
              onClose={() => {
                setLineReviewOpen(false)
                setSelectedLineForReview(null)
              }}
              lineData={selectedLineForReview}
              onAddComment={handleAddLineComment}
              onRequestEdit={handleRequestLineEdit}
              onApprove={handleApproveLine}
              onFlag={handleFlagLine}
            />
          </OptimizedSuspense>
        )}

        {/* Transactions Configuration Modal */}
        {transactionsConfigOpen && (
          <div className="transaction-modal" onClick={() => setTransactionsConfigOpen(false)}>
            <div className="config-modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header-row">
                <h3 className="modal-title">تخطيط عرض المعاملات</h3>
                <button className="ultimate-btn ultimate-btn-delete" onClick={() => setTransactionsConfigOpen(false)}>
                  <div className="btn-content"><span className="btn-text">إغلاق</span></div>
                </button>
              </div>

              <div className="config-modal-body">
                <div className="config-section">
                  <h4>إعدادات العرض</h4>

                  <div className="config-field">
                    <label className="config-label">
                      <input
                        type="checkbox"
                        checked={transactionsConfig.showAuditInfo}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, showAuditInfo: e.target.checked }))}
                      />
                      عرض معلومات التدقيق
                    </label>
                  </div>

                  <div className="config-field">
                    <label className="config-label">
                      <input
                        type="checkbox"
                        checked={transactionsConfig.showApprovalBadges}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, showApprovalBadges: e.target.checked }))}
                      />
                      عرض رموز حالة الاعتماد
                    </label>
                  </div>

                  <div className="config-field">
                    <label className="config-label">
                      <input
                        type="checkbox"
                        checked={transactionsConfig.highlightPostedTransactions}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, highlightPostedTransactions: e.target.checked }))}
                      />
                      تمييز المعاملات المرحلة
                    </label>
                  </div>

                  <div className="config-field">
                    <label className="config-label">
                      <input
                        type="checkbox"
                        checked={transactionsConfig.groupByOrganization}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, groupByOrganization: e.target.checked }))}
                      />
                      تجميع حسب المؤسسة
                    </label>
                  </div>

                  <div className="config-field">
                    <label className="config-label">
                      <input
                        type="checkbox"
                        checked={transactionsConfig.autoRefresh}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                      />
                      تحديث تلقائي
                    </label>
                  </div>

                  <div className="config-field">
                    <label className="config-label-block">
                      حجم الصفحة الافتراضي:
                      <select
                        value={transactionsConfig.defaultPageSize}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, defaultPageSize: parseInt(e.target.value) }))}
                        className="config-select"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </label>
                  </div>

                  <div className="config-field">
                    <label className="config-label-block">
                      فلتر المبلغ الافتراضي:
                      <select
                        value={transactionsConfig.defaultAmountFilter}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, defaultAmountFilter: e.target.value as 'all' | 'positive' | 'negative' }))}
                        className="config-select"
                      >
                        <option value="all">جميع المبالغ</option>
                        <option value="positive">مبالغ موجبة</option>
                        <option value="negative">مبالغ سالبة</option>
                      </select>
                    </label>
                  </div>

                  <div className="config-field">
                    <label className="config-label-block">
                      نطاق التاريخ الافتراضي:
                      <select
                        value={transactionsConfig.defaultDateRange}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, defaultDateRange: e.target.value as 'all' | 'month' | 'quarter' | 'year' }))}
                        className="config-select"
                      >
                        <option value="all">جميع التواريخ</option>
                        <option value="month">الشهر الحالي</option>
                        <option value="quarter">الربع الحالي</option>
                        <option value="year">العام الحالي</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="config-section">
                  <h4>إعدادات التصدير</h4>

                  <div className="config-field">
                    <label className="config-label-block">
                      تنسيق التصدير الافتراضي:
                      <select
                        value={transactionsConfig.exportFormat}
                        onChange={(e) => setTransactionsConfig(prev => ({ ...prev, exportFormat: e.target.value as 'excel' | 'pdf' | 'csv' }))}
                        className="config-select"
                      >
                        <option value="excel">Excel (.xlsx)</option>
                        <option value="pdf">PDF (.pdf)</option>
                        <option value="csv">CSV (.csv)</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="config-section">
                  <h4>عرض تحكم التخطيط</h4>
                  <div className="layout-control-section">
                    <button
                      className="ultimate-btn ultimate-btn-primary"
                      onClick={() => {
                        setTransactionsConfigOpen(false);
                        setLineColumnsConfigOpen(true);
                      }}
                    >
                      <div className="btn-content"><span className="btn-text">فتح تعديل الأعمدة</span></div>
                    </button>
                    <p className="config-help-text">يمكنك تخصيص عرض وترتيب وعرض الأعمدة</p>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="ultimate-btn ultimate-btn-success"
                  onClick={() => setTransactionsConfigOpen(false)}
                >
                  <div className="btn-content"><span className="btn-text">حفظ الإعدادات</span></div>
                </button>

                <button
                  className="ultimate-btn ultimate-btn-warning"
                  onClick={() => {
                    setTransactionsConfig({
                      showAuditInfo: true,
                      showApprovalBadges: true,
                      defaultAmountFilter: 'all',
                      defaultDateRange: 'all',
                      defaultPageSize: 20,
                      autoRefresh: false,
                      exportFormat: 'excel',
                      groupByOrganization: false,
                      highlightPostedTransactions: true
                    });
                  }}
                >
                  <div className="btn-content"><span className="btn-text">إعادة تعيين</span></div>
                </button>

                <button
                  className="ultimate-btn ultimate-btn-delete"
                  onClick={() => setTransactionsConfigOpen(false)}
                >
                  <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Column Configuration Modal - Headers Table */}
        <DraggablePanelContainer>
          <ColumnConfiguration
            columns={columns}
            onConfigChange={handleColumnConfigChange}
            isOpen={headersColumnConfigOpen}
            onClose={() => setHeadersColumnConfigOpen(false)}
            onReset={resetToDefaults}
            sampleData={tableData as any}
          />
        </DraggablePanelContainer>

        {/* Column Configuration Modal - Lines Table */}
        <ColumnConfiguration
          columns={lineColumns}
          onConfigChange={handleLineColumnConfigChange}
          isOpen={lineColumnsConfigOpen}
          onClose={() => setLineColumnsConfigOpen(false)}
          onReset={resetLineColumnsToDefaults}
          sampleData={transactionLines as any}
        />


        <TransactionsDocumentsPanel
          open={documentsOpen}
          onClose={() => {
            setDocumentsOpen(false)
            setDocumentsFor(null)
            setDocumentsForLine(null)
          }}
          transaction={documentsFor}
          transactionLine={documentsForLine}
        />

        {/* Transaction Wizard - Using TransactionsDataContext for all dimensions */}
        <TransactionWizard
          open={wizardOpen}
          onClose={() => {
            setWizardOpen(false)
            setEditingTx(null) // Clear edit state when closing
          }}
          onSubmit={async (data) => {
            try {
              let transaction: any

              if (editingTx) {
                console.log('📦 Updating transaction via hardened service:', data)
                transaction = await updateTransactionWithLines(editingTx.id, {
                  entry_date: data.entry_date,
                  description: data.description,
                  description_ar: data.description_ar,
                  org_id: data.org_id,
                  project_id: data.project_id,
                  reference_number: data.reference_number,
                  notes: data.notes,
                  notes_ar: data.notes_ar,
                  classification_id: data.classification_id,
                  lines: data.lines,
                  version: data.version
                })
              } else {
                console.log('📦 Creating transaction via hardened service:', data)
                // Use the hardened service which handles offline enqueuing automatically
                transaction = await createTransactionWithLines({
                  entry_date: data.entry_date,
                  description: data.description,
                  description_ar: data.description_ar,
                  org_id: data.org_id,
                  project_id: data.project_id,
                  reference_number: data.reference_number,
                  notes: data.notes,
                  notes_ar: data.notes_ar,
                  classification_id: data.classification_id,
                  lines: data.lines
                })
                setCreatedTxId(transaction.id)
              }

              console.log('✅ Transaction processed:', transaction.id)

              // Upload and link staged documents (Background task, does not block UI success)
              if (data.attachments) {
                const { uploadDocument } = await import('../../services/documents')

                // Process line attachments
                if (data.attachments.lines) {
                  for (const [_lineIdx, files] of Object.entries(data.attachments.lines)) {
                    if (Array.isArray(files) && files.length > 0) {
                      for (const file of files) {
                        try {
                          await uploadDocument({
                            orgId: data.org_id,
                            title: (file as File).name,
                            file: file as File,
                            projectId: data.project_id || undefined
                          })
                        } catch (e) { console.warn('Document upload skipped or failed:', e) }
                      }
                    }
                  }
                }

                // Process transaction attachments
                if (data.attachments.transaction && data.attachments.transaction.length > 0) {
                  for (const file of data.attachments.transaction) {
                    try {
                      await uploadDocument({
                        orgId: data.org_id,
                        title: (file as File).name,
                        file: file as File,
                        projectId: data.project_id || undefined
                      })
                    } catch (e) { console.warn('Transaction document upload failed:', e) }
                  }
                }
              }

              // Handle approval submission if requested
              if (data.submitForApproval) {
                try {
                  await submitTransaction(transaction.id)
                  showToast('تم حفظ المعاملة وإرسالها للاعتماد', { severity: 'success' })
                } catch (submitError: any) {
                  console.warn('Submission for approval failed (might be offline):', submitError)
                  showToast('تم حفظ المعاملة محلياً (سيتم إرسالها للاعتماد عند الاتصال)', { severity: 'info' })
                }
              } else {
                showToast('تم حفظ المعاملة بنجاح', { severity: 'success' })
              }

              // Reload transactions list
              await reload()

            } catch (error: any) {
              if (error.message === 'VERSION_MISMATCH') {
                showToast('حدث تعارض: قام مستخدم آخر بتعديل هذه المعاملة. يرجى مراجعة التغييرات.', { severity: 'warning' })
                // Trigger conflict resolution flow
                window.dispatchEvent(new CustomEvent('offline-sync-conflict', {
                  detail: {
                    entityType: 'transaction',
                    message: 'تم تعديل المعاملة من قبل مستخدم آخر (تعديل مباشر)'
                  }
                }))
                return
              }
              console.error('❌ Transaction operation failed:', error)
              showToast('فشل حفظ المعاملة: ' + (error.message || 'خطأ غير معروف'), { severity: 'error' })
              throw error
            }
          }}
          // All data from TransactionsDataContext - single source of truth
          accounts={accounts}
          projects={projects}
          organizations={organizations}
          classifications={classifications}
          categories={categories}
          workItems={workItems}
          costCenters={costCenters}
          analysisItemsMap={analysisItemsMap}

          // Edit mode support
          mode={editingTx ? 'edit' : 'create'}
          transactionId={editingTx?.id}
          initialData={editingTx ? {
            header: {
              ...editingTx, // Include version and all fields
              entry_date: editingTx.entry_date,
              description: editingTx.description,
              description_ar: (editingTx as any).description_ar || '',
              org_id: editingTx.org_id,
              project_id: editingTx.project_id,
              reference_number: editingTx.reference_number || '',
              notes: editingTx.notes || '',
              notes_ar: (editingTx as any).notes_ar || '',
              classification_id: editingTx.classification_id || '',
              default_cost_center_id: editingTx.cost_center_id || '',
              default_work_item_id: (editingTx as any).work_item_id || '',
              default_sub_tree_id: (editingTx as any).sub_tree_id || ''
            },
            lines: transactionLines.map((line, idx) => ({
              id: line.id,
              line_no: idx + 1,
              account_id: line.account_id,
              debit_amount: Number(line.debit_amount || 0),
              credit_amount: Number(line.credit_amount || 0),
              description: line.description || '',
              org_id: line.org_id || editingTx.org_id,
              project_id: line.project_id || editingTx.project_id,
              cost_center_id: line.cost_center_id || '',
              work_item_id: line.work_item_id || '',
              analysis_work_item_id: line.analysis_work_item_id || '',
              classification_id: line.classification_id || '',
              sub_tree_id: line.sub_tree_id || ''
            }))
          } : undefined}
          approvalStatus={editingTx ? (editingTx as any).approval_status : undefined}
          canEdit={editingTx ? hasPerm('transactions.update') : true}
          onEditComplete={() => {
            setEditingTx(null)
            setWizardOpen(false)
            reload() // Refresh the transactions list
          }}
        />

        {/* Unified Transaction Details Panel */}
        {_detailsOpen && detailsFor && (
          <UnifiedTransactionDetailsPanel
            transaction={detailsFor}
            audit={audit}
            approvalHistory={approvalHistory}
            userNames={userNames}
            transactionLines={detailsFor?.lines || []}
            accounts={accounts}
            projects={projects}
            organizations={organizations}
            classifications={classifications}
            categories={categories}
            workItems={workItems}
            costCenters={costCenters}
            analysisItemsMap={analysisItemsMap}
            currentUserId={currentUserId}
            mode={mode}
            canEdit={hasPerm('transactions.update')}
            canDelete={hasPerm('transactions.delete')}
            canReview={hasPerm('transactions.review')}
            canPost={hasPerm('transactions.post')}
            canManage={hasPerm('transactions.manage')}
            autoOpenDeleteModal={autoOpenDeleteModal}
            onDeleteModalHandled={() => setAutoOpenDeleteModal(false)}
            onRefresh={reload} // Pass reload function for refreshing after deletion
            onClose={handleDetailsPanelClose}
            onUpdate={async (updatedTransaction: TransactionRecord) => {
              try {
                const updateData = {
                  entry_date: updatedTransaction.entry_date,
                  description: updatedTransaction.description,
                  reference_number: updatedTransaction.reference_number || null,
                  debit_account_id: updatedTransaction.debit_account_id,
                  credit_account_id: updatedTransaction.credit_account_id,
                  amount: updatedTransaction.amount,
                  org_id: updatedTransaction.org_id,
                  project_id: updatedTransaction.project_id,
                  cost_center_id: updatedTransaction.cost_center_id,
                  classification_id: updatedTransaction.classification_id,
                  notes: updatedTransaction.notes
                }
                await updateTransaction(detailsFor.id, updateData)
                showToast('تم تحديث المعاملة', { severity: 'success' })
                reload()
                _setDetailsOpen(false)
              } catch (error: any) {
                showToast('فشل في تحديث المعاملة', { severity: 'error' })
                console.error('Update error:', error)
              }
            }}
            onEditWithWizard={async (tx: TransactionRecord) => {
              // Close details panel and open wizard for editing
              _setDetailsOpen(false)
              setEditingTx(tx)
              setWizardOpen(true)
            }}
            onOpenEnhancedReview={(id) => openEnhancedReview(id)}
            onOpenLineReview={handleOpenLineReview}
            onPost={async (txId: string) => {
              try {
                await postTransaction(txId)
                showToast('تم ترحيل المعاملة', { severity: 'success' })
                reload()
                _setDetailsOpen(false)
              } catch {
                showToast('فشل في ترحيل المعاملة', { severity: 'error' })
              }
            }}
            onDelete={async (txId: string) => {
              try {
                await deleteTransaction(txId)
                showToast('تم حذف المعاملة', { severity: 'success' })
                reload()
                _setDetailsOpen(false)
              } catch {
                showToast('فشل في حذف المعاملة', { severity: 'error' })
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

export default TransactionsPage



