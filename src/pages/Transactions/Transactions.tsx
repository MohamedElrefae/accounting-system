import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAccounts, getTransactions, createTransaction, deleteTransaction, updateTransaction, getTransactionAudit, getCurrentUserId, getProjects, approveTransaction, requestRevision, rejectTransaction, submitTransaction, cancelSubmission, postTransaction, getUserDisplayMap, type Account, type TransactionRecord, type TransactionAudit, type Project } from '../../services/transactions'
import { getTransactionLines } from '../../services/transaction-lines'
import { uploadDocument, linkDocumentToTransactionLine } from '../../services/documents'
import { listWorkItemsAll } from '../../services/work-items'
import type { WorkItemRow } from '../../types/work-items'
import { getOrganizations } from '../../services/organization'
import { getActiveProjectId } from '../../utils/org'
import { getAllTransactionClassifications, type TransactionClassification } from '../../services/transaction-classification'
import { getExpensesCategoriesList } from '../../services/sub-tree'
import { listAnalysisWorkItems } from '../../services/analysis-work-items'
import type { Organization } from '../../types'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import { useHasPermission } from '../../hooks/useHasPermission'
import './Transactions.css'
import { useToast } from '../../contexts/ToastContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import UnifiedTransactionDetailsPanel from '../../components/Transactions/UnifiedTransactionDetailsPanel'
import { getApprovalHistoryByTransactionId, type ApprovalHistoryRow } from '../../services/approvals'
import ClientErrorLogs from '../admin/ClientErrorLogs'
import PermissionBadge from '../../components/Common/PermissionBadge'
import { WithPermission } from '../../components/Common/withPermission'
import { logClientError } from '../../services/telemetry'
import UnifiedCRUDForm, { type UnifiedCRUDFormHandle } from '../../components/Common/UnifiedCRUDForm'
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel'
import { createTransactionFormConfig } from '../../components/Transactions/TransactionFormConfig'
import { getCostCentersForSelector } from '../../services/cost-centers'
import ResizableTable from '../../components/Common/ResizableTable'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'
import SearchableSelect, { type SearchableSelectOption } from '../../components/Common/SearchableSelect'
import { supabase } from '../../utils/supabase'
import { transactionValidationAPI } from '../../services/transaction-validation-api'
import { getCompanyConfig } from '../../services/company-config'
import TransactionAnalysisModal from '../../components/Transactions/TransactionAnalysisModal'
import TransactionWizard from '../../components/Transactions/TransactionWizard'
import AttachDocumentsPanel from '../../components/documents/AttachDocumentsPanel'
import { getReadMode } from '../../config/featureFlags'
import TransactionsHeaderTable from './TransactionsHeaderTable'
import TransactionLinesTable from './TransactionLinesTable'
import formStyles from '../../components/Common/UnifiedCRUDForm.module.css'
import FormLayoutControls from '../../components/Common/FormLayoutControls'
import type { FormField } from '../../components/Common/UnifiedCRUDForm'
import { Star } from 'lucide-react'
import ReactDOM from 'react-dom'

interface FilterState {
  dateFrom: string
  dateTo: string
  amountFrom: string
  amountTo: string
}

const TransactionsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [classifications, setClassifications] = useState<TransactionClassification[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ExpensesCategoryRow[]>([])
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([])
  const [analysisItemsMap, setAnalysisItemsMap] = useState<Record<string, { code: string; name: string }>>({})
  const [costCenters, setCostCenters] = useState<Array<{ id: string; code: string; name: string; name_ar?: string | null; project_id?: string | null; level: number }>>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [_formErrors, _setFormErrors] = useState<Record<string, string>>({})
  // const [postingId, setPostingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Unified form state
  const [formOpen, setFormOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
    const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null)
  const [creatingDraft, setCreatingDraft] = useState<boolean>(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsFor, setDetailsFor] = useState<TransactionRecord | null>(null)
  const [createdTxId, setCreatedTxId] = useState<string | null>(null)
  
  // Debug: track which form is open
  useEffect(() => { try { console.log('🧪 Form state -> wizardOpen:', wizardOpen, 'formOpen:', formOpen); } catch {} }, [wizardOpen, formOpen])
  const [audit, setAudit] = useState<TransactionAudit[]>([])
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryRow[]>([])
  // Keep create-mode title even after header insert until user saves draft/post
  const [keepCreateTitle, setKeepCreateTitle] = useState<boolean>(false)
  
  // Cost Analysis Modal state
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false)
  const [analysisTransactionId, setAnalysisTransactionId] = useState<string | null>(null)
  const [analysisTransactionLineId, setAnalysisTransactionLineId] = useState<string | null>(null)
  const [analysisTransaction, setAnalysisTransaction] = useState<TransactionRecord | null>(null)

  // Documents panel state
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [documentsFor, setDocumentsFor] = useState<TransactionRecord | null>(null)
  const [documentsForLine, setDocumentsForLine] = useState<any | null>(null)


  // Documents panel layout state with persistence
  const [docsPanelPosition, setDocsPanelPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('documentsPanel:position');
      return saved ? JSON.parse(saved) : { x: 120, y: 120 };
    } catch { return { x: 120, y: 120 }; }
  })
  const [docsPanelSize, setDocsPanelSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('documentsPanel:size');
      return saved ? JSON.parse(saved) : { width: 900, height: 700 };
    } catch { return { width: 900, height: 700 }; }
  })
  const [docsPanelMax, setDocsPanelMax] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('documentsPanel:maximized');
      return saved === 'true';
    } catch { return false; }
  })
  const [docsPanelDocked, setDocsPanelDocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('documentsPanel:docked');
      return saved === 'true';
    } catch { return false; }
  })
  const [docsPanelDockPos, setDocsPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>(() => {
    try {
      const saved = localStorage.getItem('documentsPanel:dockPosition');
      return (saved as 'left' | 'right' | 'top' | 'bottom') || 'right';
    } catch { return 'right'; }
  })
  
  // Inline editor toggles in modal
  const [showHeaderEditor, setShowHeaderEditor] = useState<boolean>(false)
  const [docsInlineOpen, setDocsInlineOpen] = useState<boolean>(true)
  
  // Unified form panel state with persistence
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('transactionFormPanel:position');
      return saved ? JSON.parse(saved) : { x: 100, y: 100 };
    } catch { return { x: 100, y: 100 }; }
  })
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('transactionFormPanel:size');
      return saved ? JSON.parse(saved) : { width: 800, height: 700 };
    } catch { return { width: 800, height: 700 }; }
  })
  const [panelMax, setPanelMax] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('transactionFormPanel:maximized');
      return saved === 'true';
    } catch { return false; }
  })
  const [panelDocked, setPanelDocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('transactionFormPanel:docked');
      return saved === 'true';
    } catch { return false; }
  })
  const [panelDockPos, setPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>(() => {
    try {
      const saved = localStorage.getItem('transactionFormPanel:dockPosition');
      return (saved as 'left' | 'right' | 'top' | 'bottom') || 'right';
    } catch { return 'right'; }
  })
  
  const formRef = React.useRef<UnifiedCRUDFormHandle>(null)
  
  // Function to open cost analysis modal
  const openCostAnalysisModal = (transaction: TransactionRecord, opts?: { transactionLineId?: string }) => {
    setAnalysisTransaction(transaction)
    setAnalysisTransactionId(transaction.id)
    setAnalysisTransactionLineId(opts?.transactionLineId || null)
    setAnalysisModalOpen(true)
  }
  
  const closeCostAnalysisModal = () => {
    setAnalysisModalOpen(false)
    setAnalysisTransactionId(null)
    setAnalysisTransactionLineId(null)
    setAnalysisTransaction(null)
  }

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: '',
  })
  const [debitFilterId, setDebitFilterId] = useState<string>('')
  const [creditFilterId, setCreditFilterId] = useState<string>('')
  const [orgFilterId, setOrgFilterId] = useState<string>('')
  const [projectFilterId, setProjectFilterId] = useState<string>(() => {
    try { return (localStorage.getItem('project_id') || '') as string } catch { return '' }
  })
  const [useGlobalProjectTx, setUseGlobalProjectTx] = useState<boolean>(() => { try { return localStorage.getItem('transactions:useGlobalProject') === '1' } catch { return true } })
  const [classificationFilterId, setClassificationFilterId] = useState<string>('')
  const [expensesCategoryFilterId, setExpensesCategoryFilterId] = useState<string>('')
  const [workItemFilterId, setWorkItemFilterId] = useState<string>('')
  const [costCenterFilterId, setCostCenterFilterId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  // Quick approval status filter (client-side)
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'draft' | 'submitted' | 'revision_requested' | 'approved' | 'rejected' | 'cancelled'>(() => {
    try {
      return (localStorage.getItem('transactions_approval_filter') as any) || 'all'
    } catch { return 'all' }
  })
  // Wrap mode preference (persisted per user locally)
  const [wrapMode, setWrapMode] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('transactions_table_wrap')
      return raw ? raw === '1' : false
    } catch { return false }
  })
  
  // Sync project filter with global when enabled
  useEffect(() => {
    if (!useGlobalProjectTx) return
    try {
      const pid = getActiveProjectId() || ''
      setProjectFilterId(pid)
    } catch {}
  }, [useGlobalProjectTx, orgFilterId])

  useEffect(() => {
    try { localStorage.setItem('transactions:useGlobalProject', useGlobalProjectTx ? '1' : '0') } catch {}
  }, [useGlobalProjectTx])

  // Persist wrapMode to server when available
  useEffect(() => {
    if (!currentUserId) return
    ;(async () => {
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

  // Persist approval filter selection
  useEffect(() => {
    try { localStorage.setItem('transactions_approval_filter', approvalFilter) } catch {}
  }, [approvalFilter])
  // Persist wrap mode selection
  useEffect(() => {
    try { localStorage.setItem('transactions_table_wrap', wrapMode ? '1' : '0') } catch {}
  }, [wrapMode])

  // Transaction & Line selection state
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  
  // Lines state for bottom table
  const [transactionLines, setTransactionLines] = useState<any[]>([])
  const [lineWrapMode, setLineWrapMode] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('transactions_lines_table_wrap')
      return raw ? raw === '1' : false
    } catch { return false }
  })

  // Persist line wrap mode selection
  useEffect(() => {
    try { localStorage.setItem('transactions_lines_table_wrap', lineWrapMode ? '1' : '0') } catch {}
  }, [lineWrapMode])
  
  // Fetch transaction lines when transaction is selected
  useEffect(() => {
    const fetchLines = async () => {
      console.log('🔄 useEffect triggered, selectedTransactionId:', selectedTransactionId);
      
      if (!selectedTransactionId) {
        console.log('⚠️ No transaction selected, clearing lines');
        setTransactionLines([])
        setSelectedLineId(null)
        return
      }
      try {
        console.log('📡 Querying transaction_lines for transaction:', selectedTransactionId);
        const { data, error } = await supabase
          .from('v_transaction_lines_enriched')
          .select('*')
          .eq('transaction_id', selectedTransactionId)
          .order('line_no', { ascending: true })
        
        if (error) {
          console.error('❌ Supabase error fetching lines:', error);
          setTransactionLines([])
        } else if (Array.isArray(data)) {
          console.log('✅ Lines fetched successfully:', data.length, 'lines for transaction', selectedTransactionId);
          console.log('📊 Line data:', data);
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
  useEffect(() => {
    (async () => {
      try {
        const effectiveOrgId = orgFilterId || organizations[0]?.id || ''
        if (!effectiveOrgId) return
        const list = await listAnalysisWorkItems({
          orgId: effectiveOrgId,
          projectId: projectFilterId || null,
          onlyWithTx: false,
          includeInactive: true,
        })
        const map: Record<string, { code: string; name: string }> = {}
        for (const a of list) map[a.id] = { code: a.code, name: a.name }
        setAnalysisItemsMap(map)
      } catch {
        // no-op on failure; keep previous cache
      }
    })()
  }, [orgFilterId, projectFilterId, organizations])
  
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
    } catch {}
  }, [transactionsConfig])
  
  // Persist form panel position
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:position', JSON.stringify(panelPosition));
    } catch {}
  }, [panelPosition])
  
  // Persist form panel size
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:size', JSON.stringify(panelSize));
    } catch {}
  }, [panelSize])
  
  // Persist form panel maximized state
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:maximized', String(panelMax));
    } catch {}
  }, [panelMax])
  
  // Persist form panel docked state
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:docked', String(panelDocked));
    } catch {}
  }, [panelDocked])
  
  // Persist form panel dock position
  useEffect(() => {
    try {
      localStorage.setItem('transactionFormPanel:dockPosition', panelDockPos);
    } catch {}
  }, [panelDockPos])

  // Persist documents panel layout
  useEffect(() => {
    try { localStorage.setItem('documentsPanel:position', JSON.stringify(docsPanelPosition)); } catch {}
  }, [docsPanelPosition])
  useEffect(() => {
    try { localStorage.setItem('documentsPanel:size', JSON.stringify(docsPanelSize)); } catch {}
  }, [docsPanelSize])
  useEffect(() => {
    try { localStorage.setItem('documentsPanel:maximized', String(docsPanelMax)); } catch {}
  }, [docsPanelMax])
  useEffect(() => {
    try { localStorage.setItem('documentsPanel:docked', String(docsPanelDocked)); } catch {}
  }, [docsPanelDocked])
  useEffect(() => {
    try { localStorage.setItem('documentsPanel:dockPosition', docsPanelDockPos); } catch {}
  }, [docsPanelDockPos])

  const location = useLocation()
  // Apply workItemId from URL query (drill-through)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const wid = params.get('workItemId') || ''
      if (wid && wid !== workItemFilterId) {
        setWorkItemFilterId(wid)
        setPage(1)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])
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
            try { sessionStorage.setItem('column_prefs_rpc_warned', '1') } catch {}
          }
        }
      } catch {/* silent */}
    })()
  }, [])

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
        try { localStorage.setItem(suppressKey, '1') } catch {}
      }
      return true
    } catch {
      return window.confirm(message)
    }
  }
  
  // Save current form panel layout and size as preferred
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveFormPanelLayout = () => {
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
      console.log('✅ تم حفظ تخطيط مودال النموذج كمفضل');
      showToast('✅ تم حفظ تخطيط النموذج', { severity: 'success' });
    } catch (error) {
      console.error('Failed to save form panel layout:', error);
      showToast('⚠️ فشل في حفظ تخطيط النموذج', { severity: 'error' });
    }
  }
  
  // Reset form panel to default layout and size
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleResetFormPanelLayout = () => {
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
      console.log('🔄 تم إعادة تعيين تخطيط مودال النموذج');
      showToast('🔄 تم إعادة تعيين تخطيط النموذج', { severity: 'info' });
    } catch {}
  }

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'revise' | 'reject' | null>(null)
  const [reviewReason, setReviewReason] = useState('')
  const [reviewTargetId, setReviewTargetId] = useState<string | null>(null)
  const [reviewBusy, setReviewBusy] = useState(false)

  // Submit modal state
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  const [submitTargetId, setSubmitTargetId] = useState<string | null>(null)
  const [submitBusy, setSubmitBusy] = useState(false)

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
      } catch {}
    })()
  }, [])

  // Default column configuration for transactions table (documents column moved to lines table)
  const defaultColumns: ColumnConfig[] = useMemo(() => [
    { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, minWidth: 100, maxWidth: 200, type: 'text', resizable: true },
    { key: 'entry_date', label: 'التاريخ', visible: true, width: 130, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
    { key: 'description', label: 'البيان', visible: true, width: 280, minWidth: 200, maxWidth: 480, type: 'text', resizable: true },
    { key: 'line_items_count', label: 'عدد سطور التحليل', visible: true, width: 110, minWidth: 100, maxWidth: 160, type: 'number', resizable: true },
    { key: 'line_items_total', label: 'اجمالي تحليل التكلفة', visible: true, width: 150, minWidth: 130, maxWidth: 220, type: 'currency', resizable: true },
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

  // Refetch transactions whenever filters/scope/pagination change
  useEffect(() => {
    // Note: reload() uses current state (including mode and filters)
    reload().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchTerm,
    filters.dateFrom,
    filters.dateTo,
    filters.amountFrom,
    filters.amountTo,
    (filters as any).analysis_work_item_id,
    debitFilterId,
    creditFilterId,
    orgFilterId,
    projectFilterId,
    classificationFilterId,
    expensesCategoryFilterId,
    workItemFilterId,
    costCenterFilterId,
    page,
    pageSize,
    mode,
    approvalFilter, // now server-side filtered
  ])

  // Global refresh via CustomEvent (from details panel or elsewhere)
  useEffect(() => {
    const handler = (_e: Event) => { reload().catch(() => {}) }
    window.addEventListener('transactions:refresh', handler)
    return () => window.removeEventListener('transactions:refresh', handler)
  }, [])

  // Server-side load
  const [totalCount, setTotalCount] = useState(0)
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [accs, projectsList, orgsList, classificationsList, uid] = await Promise.all([
          getAccounts(),
          getProjects().catch(() => []), // Don't fail if projects service isn't available
          getOrganizations().catch(() => []), // Don't fail if organizations service isn't available
          getAllTransactionClassifications().catch(() => []), // Don't fail if classifications service isn't available
          getCurrentUserId(),
        ])
        // Prime analysis items map for all projects (shallow) — optional light cache
        try {
          const defaultOrgId = orgsList[0]?.id || ''
          if (defaultOrgId) {
            const list = await listAnalysisWorkItems({ orgId: defaultOrgId, projectId: null, onlyWithTx: false, includeInactive: true })
            const map: Record<string, { code: string; name: string }> = {}
            for (const a of list) map[a.id] = { code: a.code, name: a.name }
            setAnalysisItemsMap(map)
          }
        } catch {}
        setAccounts(accs)
        setProjects(projectsList)
        setOrganizations(orgsList)
        setClassifications(classificationsList)
        setCurrentUserId(uid)

        // Load server preferences (wrapMode + columns + frozenCount) when user is known
        try {
          if (uid) {
            const mod = await import('../../services/column-preferences')
            if (!mod.isColumnPreferencesRpcDisabled()) {
              const res = await mod.getUserColumnPreferences('transactions_table')
              if (res && res.column_config) {
              // Apply wrapMode if provided
              if (typeof res.column_config.wrapMode === 'boolean') {
                setWrapMode(!!res.column_config.wrapMode)
                try { localStorage.setItem('transactions_table_wrap', res.column_config.wrapMode ? '1' : '0') } catch {}
              }
              // Apply columns if present by updating via hook handler
              if (Array.isArray(res.column_config.columns) && res.column_config.columns.length > 0) {
                try {
                  // useColumnPreferences hook will merge and persist locally when it loads server columns
                } catch {}
              }
            }
          }
        }
        } catch {}

        await reload()
      } catch (e: any) {
        setError(e.message || 'فشل تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [location.pathname])

  // When opening the CRUD form, refresh accounts to pick up newly added accounts from the tree
  useEffect(() => {
    if (!formOpen) return
    // Runtime verification badge log
    console.log('🟢 line-editor v2 active', { createdTxId, isEditing: !!editingTx })
    getAccounts().then(setAccounts).catch(() => {})
    
    // Load categories for ALL organizations to ensure dropdown works for any selected org
    // This is more robust than loading just for one org
    if (organizations.length > 0) {
      console.log('🌳 Form opened - loading categories for all orgs:', organizations.length);
      Promise.all(organizations.map(org => 
        getExpensesCategoriesList(org.id).catch(err => {
          console.warn('Failed to load categories for org', org.id, err);
          return [];
        })
      )).then(orgCategoriesLists => {
        // Merge all categories from all organizations
        const merged: Record<string, ExpensesCategoryRow> = {}
        let totalCategories = 0;
        for (const catList of orgCategoriesLists) {
          for (const cat of catList) {
            merged[cat.id] = cat;
            totalCategories++;
          }
        }
        const allCategories = Object.values(merged);
        console.log('🌳 Categories loaded for form - total:', totalCategories, 'unique:', allCategories.length);
        setCategories(allCategories);
      }).catch(err => {
        console.error('🌳 Failed to load categories for form:', err);
        setCategories([]);
      });
      
      // Load cost centers for the form's organization
      const orgIdForForm = editingTx?.org_id || organizations.find(org => org.code === 'MAIN')?.id || organizations[0]?.id || ''
      if (orgIdForForm) {
        getCostCentersForSelector(orgIdForForm).then(setCostCenters).catch(() => setCostCenters([]))
      }
    } else {
      console.log('🌳 No organizations available, clearing categories');
      setCategories([])
      setCostCenters([])
    }
  }, [formOpen, editingTx, organizations])

  async function reload() {
    console.log('🚀 Reload triggered with filters:', {
      mode,
      approvalFilter,
      debitFilterId: debitFilterId || 'none',
      creditFilterId: creditFilterId || 'none',
      orgFilterId: orgFilterId || 'none',
      page,
      pageSize
    });
    
    const filtersToUse = {
      scope: mode === 'my' ? 'my' : 'all',
      pendingOnly: mode === 'pending',
      search: searchTerm,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      amountFrom: filters.amountFrom ? parseFloat(filters.amountFrom) : undefined,
      amountTo: filters.amountTo ? parseFloat(filters.amountTo) : undefined,
      debitAccountId: debitFilterId || undefined,
      creditAccountId: creditFilterId || undefined,
      orgId: orgFilterId || undefined,
      projectId: projectFilterId || undefined,
      classificationId: classificationFilterId || undefined,
      expensesCategoryId: expensesCategoryFilterId || undefined,
      workItemId: workItemFilterId || undefined,
      costCenterId: costCenterFilterId || undefined,
      analysisWorkItemId: (filters as any).analysis_work_item_id || undefined,
      approvalStatus: approvalFilter !== 'all' ? (approvalFilter as any as ('submitted' | 'approved' | 'draft' | 'rejected' | 'revision_requested' | 'cancelled' | 'posted')) : undefined,
    };
    console.log('🔍 Calling getTransactions with filters:', filtersToUse);
    
    const { rows, total } = await getTransactions({
      filters: filtersToUse,
      page,
      pageSize,
    })
    
    console.log('📊 Response from getTransactions:', {
      rowCount: rows?.length || 0,
      totalCount: total,
      statuses: rows?.map((r: any) => r.approval_status).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i),
      hasContent: rows && rows.length > 0
    });
    console.log('🗂️ Full transaction list:', rows);
    console.log('🐛 DEBUG: Setting transactions state with', rows?.length || 0, 'rows');
    
    setTransactions(rows || [])
    setTotalCount(total)

    // Load expenses categories for all orgs present in the page results (union)
    try {
      const orgIds = Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      if (orgIds.length > 0) {
        const lists = await Promise.all(orgIds.map(id => getExpensesCategoriesList(id).catch(() => [])))
        const merged: Record<string, ExpensesCategoryRow> = {}
        for (const list of lists) {
          for (const r of list) merged[r.id] = r
        }
        setCategories(Object.values(merged))
      } else {
        setCategories([])
      }
    } catch {
      // non-fatal
    }

    // Load work items for all orgs present (all items incl. overrides) for id->label mapping
    try {
      const orgIds = Array.from(new Set((rows || []).map(r => r.org_id).filter(Boolean))) as string[]
      if (orgIds.length > 0) {
        const lists = await Promise.all(orgIds.map(id => listWorkItemsAll(id).catch(() => [])))
        const merged: Record<string, WorkItemRow> = {}
        for (const list of lists) {
          for (const r of list) merged[r.id] = r
        }
        setWorkItems(Object.values(merged))
      } else {
        setWorkItems([])
      }
    } catch {
      // non-fatal
    }

    // resolve creator/poster names
    const ids: string[] = []
    rows.forEach(t => { if (t.created_by) ids.push(t.created_by); if (t.posted_by) ids.push(t.posted_by!) })
    try {
      const map = await getUserDisplayMap(ids)
      setUserNames(map)
    } catch {}
  }

  // Client-side status filter (other filters are server-side)
  // Server-side approval filter now applied; no extra client filtering
  const paged = transactions

  // Build account options for filters: all accounts (including non-postable) + drilldown tree
  const accountFlatAllOptions: SearchableSelectOption[] = useMemo(() => {
    return accounts
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a => ({
        value: a.id,
        label: `${a.code} - ${a.name}`,
        searchText: `${a.code} ${a.name}`.toLowerCase(),
        disabled: false,
      }))
  }, [accounts])
  const accountTreeOptionsAll: SearchableSelectOption[] = useMemo(() => {
    // Build by parent map
    const byId: Record<string, Account> = {}
    const byParent: Record<string, Account[]> = {}
    const roots: Account[] = []
    for (const a of accounts) byId[a.id] = a
    for (const a of accounts) {
      if (a.parent_id && byId[a.parent_id]) {
        if (!byParent[a.parent_id]) byParent[a.parent_id] = []
        byParent[a.parent_id].push(a)
      } else {
        roots.push(a)
      }
    }
    const sortByCode = (list: Account[]) => list.sort((x, y) => x.code.localeCompare(y.code))
    sortByCode(roots)
    for (const k of Object.keys(byParent)) sortByCode(byParent[k])
    const makeNode = (acc: Account): SearchableSelectOption => {
      const children = (byParent[acc.id] || []).map(makeNode)
      return {
        value: acc.id,
        label: `${acc.code} - ${acc.name}`,
        searchText: `${acc.code} ${acc.name}`.toLowerCase(),
        disabled: false, // allow selecting all accounts in filters, incl. non-postable
        children: children.length ? children : undefined,
      }
    }
    return roots.map(makeNode)
  }, [accounts])

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
        line_items_count: lineCount,
        line_items_total: total,
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
    const columns = createStandardColumns([
      { key: 'entry_number', header: 'رقم القيد', type: 'text' },
      { key: 'entry_date', header: 'التاريخ', type: 'date' },
      { key: 'description', header: 'البيان', type: 'text' },
      { key: 'line_items_count', header: 'عدد سطور التحليل', type: 'number' },
      { key: 'line_items_total', header: 'اجمالي تحليل التكلفة', type: 'currency' },
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
    const rows = paged.map((t: any) => ({
      entry_number: t.entry_number,
      entry_date: t.entry_date,
      description: t.description,
      line_items_count: Number((t as any).line_items_count ?? 0),
      line_items_total: Number((t as any).line_items_total ?? (Math.max(Number((t as any).total_debits ?? 0), Number((t as any).total_credits ?? 0)))),
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
    return prepareTableData(columns, rows)
  }, [paged, userNames, organizations, projects])

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

  const buildInitialFormDataForCreate = () => {
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
    } catch {}
    
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
  const handleFormSubmit = async (data: any) => {
    _setFormErrors({})
    try {
      setIsSaving(true)

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
          })

          // Show validation warnings (but allow proceeding)
          if (validationResult.warnings.length > 0) {
            const warningMessage = validationResult.warnings.map((w: any) => w.message).join('\n')
            const proceed = window.confirm(`تحذيرات التحقق:\n${warningMessage}\n\nهل تريد المتابعة؟`)
            if (!proceed) {
              setIsSaving(false)
              return
            }
          }

          // Block submission if there are errors
          if (!validationResult.is_valid) {
            const errorMessage = validationResult.errors.map((e: any) => e.message).join('\n')
            showToast(`أخطاء في التحقق من صحة المعاملة:\n${errorMessage}`, { severity: 'error' })
            setIsSaving(false)
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
        setKeepCreateTitle(true)
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
        extra: editingTx ? { id: editingTx.id, attempted: {
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
        }} : data
      })
    } finally {
      setIsSaving(false)
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

  const submitLine = async () => {
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
  }

  // Poll lines when form open and editingTx is set (simple, minimal-change wiring)
  useEffect(() => {
    let timer: any = null
    const tick = async () => {
      try {
        const txId = editingTx?.id || createdTxId
        if (formOpen && txId) {
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
      } catch {}
      timer = setTimeout(tick, 1200)
    }
    tick()
    return () => { if (timer) clearTimeout(timer) }
  }, [formOpen, editingTx, createdTxId])

  // Lines layout preferences (columns/order/visibility)
  const [linesLayoutOpen, setLinesLayoutOpen] = useState(false)
  const [linesColumnCount, setLinesColumnCount] = useState<1 | 2 | 3>(() => { try { return Number(localStorage.getItem('txLines:columns')||'3') as 1|2|3 } catch { return 3 } })
  const defaultLinesOrder = ['account','debit','credit','description_line','project','cost_center','work_item','classification','sub_tree']
  const [linesFieldOrder, setLinesFieldOrder] = useState<string[]>(() => { try { const s = localStorage.getItem('txLines:order'); return s ? JSON.parse(s) : defaultLinesOrder } catch { return defaultLinesOrder } })
  const [linesFullWidth, setLinesFullWidth] = useState<Set<string>>(() => { try { const s = localStorage.getItem('txLines:fullWidth'); return s ? new Set(JSON.parse(s)) : new Set(['description_line']) } catch { return new Set(['description_line']) } })
  const [linesVisible, setLinesVisible] = useState<Set<string>>(() => { try { const s = localStorage.getItem('txLines:visible'); return s ? new Set(JSON.parse(s)) : new Set(['account','debit','credit','description_line','project','cost_center','work_item','classification','sub_tree']) } catch { return new Set(['account','debit','credit','description_line','project','cost_center','work_item','classification','sub_tree']) } })

  useEffect(() => { try { localStorage.setItem('txLines:columns', String(linesColumnCount)) } catch {} }, [linesColumnCount])
  useEffect(() => { try { localStorage.setItem('txLines:order', JSON.stringify(linesFieldOrder)) } catch {} }, [linesFieldOrder])
  useEffect(() => { try { localStorage.setItem('txLines:fullWidth', JSON.stringify(Array.from(linesFullWidth))) } catch {} }, [linesFullWidth])
  useEffect(() => { try { localStorage.setItem('txLines:visible', JSON.stringify(Array.from(linesVisible))) } catch {} }, [linesVisible])

  const lineFieldsMeta: FormField[] = [
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

  const orderedLineFields = React.useMemo(() => {
    const base = linesFieldOrder && linesFieldOrder.length ? linesFieldOrder : defaultLinesOrder
    return base.filter(id => linesVisible.has(id))
  }, [linesFieldOrder, linesVisible])

  const isFullWidth = (id: string) => linesFullWidth.has(id)

  const renderLineField = (id: string) => {
    switch(id){
      case 'account': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_account"><span>الحساب</span><span className={formStyles.requiredStar}><Star size={12} fill="currentColor" /></span></label>
          <SearchableSelect id="line_account" value={lineForm.account_id} options={accounts.filter(a=>a.is_postable).sort((x,y)=>x.code.localeCompare(y.code)).map(a=>({ value:a.id, label:`${a.code} - ${a.name}`, searchText:`${a.code} ${a.name}`.toLowerCase() }))} onChange={(val)=>setLineForm(f=>({ ...f, account_id: String(val||'') }))} placeholder="اختر الحساب…" />
        </div>
      )
      case 'debit': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_debit"><span>مدين</span></label>
          <input id="line_debit" type="number" step="0.01" placeholder="0.00" value={lineForm.debit_amount} onChange={e=>setLineForm(f=>({ ...f, debit_amount: e.target.value, credit_amount: '' }))} style={{ width:'100%', textAlign:'right' }} />
        </div>
      )
      case 'credit': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_credit"><span>دائن</span></label>
          <input id="line_credit" type="number" step="0.01" placeholder="0.00" value={lineForm.credit_amount} onChange={e=>setLineForm(f=>({ ...f, credit_amount: e.target.value, debit_amount: '' }))} style={{ width:'100%', textAlign:'right' }} />
        </div>
      )
      case 'description_line': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_desc"><span>البيان</span></label>
          <input id="line_desc" type="text" placeholder="اكتب البيان..." value={lineForm.description} onChange={e=>setLineForm(f=>({ ...f, description: e.target.value }))} style={{ width:'100%' }} />
        </div>
      )
      case 'project': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_project"><span>المشروع</span></label>
          <SearchableSelect id="line_project" value={lineForm.project_id || ''} options={[{ value:'', label:'بدون مشروع', searchText:'' }, ...projects.map(p=>({ value:p.id, label:`${p.code} - ${p.name}`, searchText:`${p.code} ${p.name}`.toLowerCase() }))]} onChange={(val)=>setLineForm(f=>({ ...f, project_id: String(val||'') }))} placeholder="المشروع" />
        </div>
      )
      case 'cost_center': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_cc"><span>مركز التكلفة</span></label>
          <SearchableSelect id="line_cc" value={lineForm.cost_center_id || ''} options={[{ value:'', label:'بدون مركز تكلفة', searchText:'' }, ...costCenters.map(cc=>({ value:cc.id, label:`${cc.code} - ${cc.name}`, searchText:`${cc.code} ${cc.name}`.toLowerCase() }))]} onChange={(val)=>setLineForm(f=>({ ...f, cost_center_id: String(val||'') }))} placeholder="مركز التكلفة" />
        </div>
      )
      case 'work_item': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_work"><span>عنصر العمل</span></label>
          <SearchableSelect id="line_work" value={lineForm.work_item_id || ''} options={[{ value:'', label:'بدون عنصر', searchText:'' }, ...workItems.map(w=>({ value:w.id, label:`${w.code} - ${w.name}`, searchText:`${w.code} ${w.name}`.toLowerCase() }))]} onChange={(val)=>setLineForm(f=>({ ...f, work_item_id: String(val||'') }))} placeholder="عنصر العمل" />
        </div>
      )
      case 'classification': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_class"><span>تصنيف المعاملة</span></label>
          <SearchableSelect id="line_class" value={lineForm.classification_id || ''} options={[{ value:'', label:'بدون تصنيف', searchText:'' }, ...classifications.map(c=>({ value:c.id, label:`${c.code} - ${c.name}`, searchText:`${c.code} ${c.name}`.toLowerCase() }))]} onChange={(val)=>setLineForm(f=>({ ...f, classification_id: String(val||'') }))} placeholder="تصنيف المعاملة" />
        </div>
      )
      case 'sub_tree': return (
        <div>
          <label className={formStyles.labelRow} htmlFor="line_sub"><span>الشجرة الفرعية</span></label>
          <SearchableSelect id="line_sub" value={lineForm.sub_tree_id || ''} options={[{ value:'', label:'بدون عقدة', searchText:'' }, ...categories.map(cat=>({ value:cat.id, label:`${cat.code} - ${cat.description}`, searchText:`${cat.code} ${cat.description}`.toLowerCase() }))]} onChange={(val)=>setLineForm(f=>({ ...f, sub_tree_id: String(val||'') }))} placeholder="الشجرة الفرعية" />
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
            setFormOpen(false); setEditingTx(null); setCreatingDraft(false)
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
  }, [formOpen, editingTx, createdTxId, linesTotals.balanced])

  const handleFormCancel = () => {
    setEditingTx(null)
    setCreatedTxId(null)
    setFormOpen(false)
    setCreatingDraft(false)
    setKeepCreateTitle(false)
    _setFormErrors({})
  }

  const openNewTransactionForm = () => {
    // Open panel in header-only mode; user fills data then submits to create header
    setEditingTx(null)
    setKeepCreateTitle(true)
    initialFormDataRef.current = buildInitialFormDataForCreate()
    setCreatingDraft(false)
    setFormOpen(true)
  }


  const handleDelete = async (id: string) => {
    const ok = window.confirm('هل أنت متأكد من حذف هذه المعاملة غير المرحلة؟')
    if (!ok) return
    setDeletingId(id)
    // optimistic remove
    const prev = transactions
    const rec = transactions.find(t => t.id === id)
    const next = transactions.filter(t => t.id !== id)
    setTransactions(next)
    try {
      await deleteTransaction(id)
      showToast('تم حذف المعاملة', { severity: 'success' })
    } catch (e: any) {
      // rollback
      setTransactions(prev)
      const detail = rec ? ` (رقم القيد ${rec.entry_number})` : ''
      const msg = e?.message || ''
      showToast(`فشل حذف المعاملة${detail}. تم التراجع عن العملية. السبب: ${msg}`.trim(), { severity: 'error' })
      logClientError({ context: 'transactions.delete', message: msg, extra: { id } })
    } finally {
      setDeletingId(null)
    }
  }

  const openReview = (action: 'approve' | 'revise' | 'reject', id: string) => {
    setReviewAction(action)
    setReviewReason('')
    setReviewTargetId(id)
    setReviewOpen(true)
  }

  const submitReview = async () => {
    if (!reviewAction || !reviewTargetId) return
    setReviewBusy(true)
    try {
      if (reviewAction === 'approve') {
        await withRetry(() => approveTransaction(reviewTargetId, reviewReason || null as any))
        // After approval, check whether posting actually happened. If posting permissions
        // are missing, the RPC succeeds (approved) but posting is skipped gracefully.
        let posted = false
        try {
          const { data } = await supabase
            .from('transactions')
            .select('is_posted')
            .eq('id', reviewTargetId)
            .single()
          posted = Boolean(data?.is_posted)
        } catch {}
        if (!posted && autoPostOnApprove) {
          // Client-side fallback auto-post (best-effort)
          try {
            await postTransaction(reviewTargetId)
            posted = true
          } catch {}
        }
        if (posted) {
          showToast('تم اعتماد المعاملة (وتم ترحيلها)', { severity: 'success' })
        } else {
          showToast(autoPostOnApprove ? 'تم الاعتماد — جارٍ انتظار الترحيل (تحقق من الصلاحيات)' : 'تم اعتماد المعاملة (لم تُرحَّل — صلاحية الترحيل مطلوبة)', { severity: 'warning' as any })
        }
      } else if (reviewAction === 'revise') {
        if (!reviewReason.trim()) {
          showToast('يرجى إدخال سبب الإرجاع للتعديل', { severity: 'error' })
          setReviewBusy(false)
          return
        }
        await withRetry(() => requestRevision(reviewTargetId, reviewReason))
        showToast('تم إرجاع المعاملة للتعديل', { severity: 'success' })
      } else if (reviewAction === 'reject') {
        if (!reviewReason.trim()) {
          showToast('يرجى إدخال سبب الرفض', { severity: 'error' })
          setReviewBusy(false)
          return
        }
        await withRetry(() => rejectTransaction(reviewTargetId, reviewReason))
        showToast('تم رفض المعاملة', { severity: 'success' })
      }
      setReviewOpen(false)
      setReviewTargetId(null)
      setReviewAction(null)
      setReviewReason('')
      await reload()
    } catch (e: any) {
      const msg = formatSupabaseError(e) || 'فشل إجراء المراجعة'
      showToast(msg, { severity: 'error' })
      logClientError({ context: `transactions.review.${reviewAction}`, message: msg, extra: { id: reviewTargetId, reason: reviewReason } })
    } finally {
      setReviewBusy(false)
    }
  }

  useEffect(() => { reload().catch(() => {}) }, [searchTerm, filters.dateFrom, filters.dateTo, filters.amountFrom, filters.amountTo, (filters as any).analysis_work_item_id, debitFilterId, creditFilterId, orgFilterId, projectFilterId, classificationFilterId, expensesCategoryFilterId, workItemFilterId, costCenterFilterId, page, pageSize, mode])

  if (loading) return <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
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
          <button className="ultimate-btn ultimate-btn-edit" onClick={() => setHeadersColumnConfigOpen(true)}>
            <div className="btn-content"><span className="btn-text">⚙️ إعدادات الأعمدة</span></div>
          </button>
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
            {['transactions.create','transactions.update','transactions.delete','transactions.post','transactions.review','transactions.manage'].map(key => (
              <PermissionBadge key={key} allowed={hasPerm(key)} label={key} />
            ))}
          </div>
        </div>
      )}

      {/* Compact unified filters row - inspired by General Ledger */}
      <div className="transactions-filters-row">
        {/* Search */}
        <input
          placeholder="بحث..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
          className="filter-input filter-input--search"
        />
        
        {/* Date range */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1) }}
          className="filter-input filter-input--date"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1) }}
          className="filter-input filter-input--date"
        />
        

        {/* Quick approval status chips */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {/* Indicator for auto-post policy */}
          <span className={`ultimate-btn ${autoPostOnApprove ? 'ultimate-btn-success' : 'ultimate-btn-neutral'}`} title={autoPostOnApprove ? 'اعتماد = ترحيل تلقائي مفعّل' : 'اعتماد = ترحيل تلقائي غير مفعّل'} style={{ minHeight: 28, padding: '4px 8px' }}>
            <span className="btn-text">{autoPostOnApprove ? 'Auto-post: On' : 'Auto-post: Off'}</span>
          </span>
          <select
            value={approvalFilter === 'all' ? '' : approvalFilter}
            onChange={e => { const v = e.target.value || 'all'; setApprovalFilter(v as any); setPage(1) }}
            className="filter-select filter-select--approval"
            title="تصفية حسب حالة الاعتماد"
          >
            <option value="">حالة الاعتماد</option>
            {/* Priority group */}
            <option value="approved">معتمدة</option>
            <option value="posted">مرحلة</option>
            {/* Other statuses */}
            <option value="submitted">مُرسلة</option>
            <option value="revision_requested">طلب تعديل</option>
            <option value="draft">مسودة</option>
            <option value="rejected">مرفوضة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
        
        {/* Organization filter */}
        <select
          value={orgFilterId}
          onChange={e => { setOrgFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--org"
        >
          <option value="">جميع المؤسسات</option>
          {organizations.map(o => (
            <option key={o.id} value={o.id}>
              {`${o.code} - ${o.name}`.substring(0, 40)}
            </option>
          ))}
        </select>
        
        {/* Project filter */}
        <select
          value={projectFilterId}
          onChange={e => { setProjectFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--project"
        >
          <option value="">جميع المشاريع</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {`${p.code} - ${p.name}`.substring(0, 40)}
            </option>
          ))}
        </select>
        
        {/* Debit account filter (all accounts, searchable, with drilldown) */}
        <div style={{ minWidth: 280 }}>
          <SearchableSelect
            id="transactions.filter.debit"
            value={debitFilterId}
            options={[{ value: '', label: 'جميع الحسابات المدينة', searchText: '' }, ...accountFlatAllOptions]}
            onChange={(v) => { setDebitFilterId(v); setPage(1) }}
            placeholder="جميع الحسابات المدينة"
            clearable={true}
            showDrilldownModal={true}
            treeOptions={accountTreeOptionsAll}
          />
        </div>
        
        {/* Credit account filter (all accounts, searchable, with drilldown) */}
        <div style={{ minWidth: 280 }}>
          <SearchableSelect
            id="transactions.filter.credit"
            value={creditFilterId}
            options={[{ value: '', label: 'جميع الحسابات الدائنة', searchText: '' }, ...accountFlatAllOptions]}
            onChange={(v) => { setCreditFilterId(v); setPage(1) }}
            placeholder="جميع الحسابات الدائنة"
            clearable={true}
            showDrilldownModal={true}
            treeOptions={accountTreeOptionsAll}
          />
        </div>
        
        {/* Classification filter */}
        <select
          value={classificationFilterId}
          onChange={e => { setClassificationFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--classification"
        >
          <option value="">جميع التصنيفات</option>
          {classifications.map(c => (
            <option key={c.id} value={c.id}>
              {`${c.code} - ${c.name}`.substring(0, 40)}
            </option>
          ))}
        </select>

        {/* Expenses category filter */}
        <select
          value={expensesCategoryFilterId}
          onChange={e => { setExpensesCategoryFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--expenses"
        >
          <option value="">جميع الشجرة الفرعية</option>
          {categories
            .slice()
            .sort((a, b) => `${a.code} - ${a.description}`.localeCompare(`${b.code} - ${b.description}`))
            .map(cat => (
              <option key={cat.id} value={cat.id}>
                {`${cat.code} - ${cat.description}`.substring(0, 52)}
              </option>
            ))}
        </select>

        {/* Work Item filter */}
        <select
          value={workItemFilterId}
          onChange={e => { setWorkItemFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--workitem"
        >
          <option value="">جميع عناصر العمل</option>
          {workItems
            .slice()
            .sort((a, b) => `${a.code} - ${a.name}`.localeCompare(`${b.code} - ${b.name}`))
            .map(w => (
              <option key={w.id} value={w.id}>
                {`${w.code} - ${w.name}`.substring(0, 52)}
              </option>
            ))}
        </select>

        {/* Analysis Work Item filter */}
        <select
          value={(filters as any).analysis_work_item_id || ''}
          onChange={e => { (setFilters as any)({ ...filters, analysis_work_item_id: e.target.value }); setPage(1) }}
          className="filter-select filter-select--analysisworkitem"
        >
          <option value="">جميع بنود التحليل</option>
          {Object.entries(analysisItemsMap)
            .sort((a, b) => `${a[1].code} - ${a[1].name}`.localeCompare(`${b[1].code} - ${b[1].name}`))
            .map(([id, a]) => (
              <option key={id} value={id}>
                {`${a.code} - ${a.name}`.substring(0, 52)}
              </option>
            ))}
        </select>
        
        {/* Cost Center filter */}
        <select
          value={costCenterFilterId}
          onChange={e => { setCostCenterFilterId(e.target.value); setPage(1) }}
          className="filter-select filter-select--costcenter"
        >
          <option value="">جميع مراكز التكلفة</option>
          {costCenters
            .slice()
            .sort((a, b) => `${a.code} - ${a.name}`.localeCompare(`${b.code} - ${b.name}`))
            .map(cc => (
              <option key={cc.id} value={cc.id}>
                {`${cc.code} - ${cc.name}`.substring(0, 52)}
              </option>
            ))}
        </select>
        
        {/* Amount range filters */}
        <input
          type="number"
          placeholder="من مبلغ"
          value={filters.amountFrom}
          onChange={e => { setFilters({ ...filters, amountFrom: e.target.value }); setPage(1) }}
          className="filter-input filter-input--amount"
        />
        <input
          type="number"
          placeholder="إلى مبلغ"
          value={filters.amountTo}
          onChange={e => { setFilters({ ...filters, amountTo: e.target.value }); setPage(1) }}
          className="filter-input filter-input--amount"
        />
        
        {/* Clear filters button */}
        <button
          onClick={() => {
            setSearchTerm('')
            setFilters({ dateFrom: '', dateTo: '', amountFrom: '', amountTo: '' })
            setDebitFilterId('')
            setCreditFilterId('')
            setOrgFilterId('')
            setProjectFilterId('')
            setClassificationFilterId('')
            setExpensesCategoryFilterId('')
            setCostCenterFilterId('')
            setPage(1)
          }}
          className="ultimate-btn ultimate-btn-warning filter-clear-btn"
          title="مسح جميع الفلاتر"
        >
          🔄
        </button>
      </div>

      {/* Table */}
      <div className="transactions-content">
        <div className="transactions-tablebar">
        <div className="transactions-toolbar">
            <span className="transactions-count">عدد السجلات: {totalCount}</span>
            <button className="ultimate-btn" onClick={() => reload().catch(() => {})} title="تحديث"><div className="btn-content"><span className="btn-text">تحديث</span></div></button>
            <button className="ultimate-btn" onClick={() => window.dispatchEvent(new CustomEvent('transactions:refresh'))} title="تحديث سريع"><div className="btn-content"><span className="btn-text">تحديث 🔁</span></div></button>
            <label className="wrap-toggle">
              <input
                type="checkbox"
                checked={wrapMode}
                onChange={(e) => setWrapMode(e.target.checked)}
              />
              <span>التفاف النص</span>
            </label>
            <button className="ultimate-btn" onClick={() => reload().catch(() => {})}>
              <div className="btn-content"><span className="btn-text">تحديث</span></div>
            </button>
            <button
              className="ultimate-btn ultimate-btn-warning"
              onClick={async () => {
                if (!confirmRestore('transactions_table_reset_confirm_suppressed', 'سيتم استعادة الإعدادات الافتراضية لأعمدة جدول المعاملات.')) return
                try {
                  // reset local
                  setWrapMode(false)
                  try { localStorage.setItem('transactions_table_wrap', '0') } catch {}
                  handleColumnConfigChange(defaultColumns)
                  // reset server (best effort)
                  if (currentUserId) {
                    const mod = await import('../../services/column-preferences')
                    await mod.upsertUserColumnPreferences({
                      tableKey: 'transactions_table',
                      columnConfig: { columns: defaultColumns, wrapMode: false },
                      version: 2,
                    })
                  }
                  showToast('تمت استعادة الإعدادات الافتراضية للجدول', { severity: 'success' })
                } catch (e: any) {
                  showToast('فشل استعادة الإعدادات الافتراضية — تمت إعادة تحميل الإعدادات المحلية فقط', { severity: 'error' })
                }
              }}
              title="استعادة الإعدادات الافتراضية"
            >
              <div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div>
            </button>
          </div>
          {/* GL2 read-mode toggle removed for unified model */}
          <div className="transactions-pagination">
            <button className="ultimate-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><div className="btn-content"><span className="btn-text">السابق</span></div></button>
            <span>صفحة {page} من {Math.max(1, Math.ceil(totalCount / pageSize))}</span>
            <button className="ultimate-btn" onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize) || 1, p + 1))} disabled={page >= Math.ceil(totalCount / pageSize)}><div className="btn-content"><span className="btn-text">التالي</span></div></button>
            <select className="filter-select" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value) || 20); setPage(1) }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        {/* SECTION 1: TRANSACTION HEADERS TABLE (T1) */}
        <div className="transactions-section headers-section">
          <div className="section-header">
            <h2>المعاملات (رؤوس القيود)</h2>
            <div className="section-controls">
              <button 
                className="ultimate-btn ultimate-btn-edit"
                onClick={() => setHeadersColumnConfigOpen(true)}
                title="إعدادات أعمدة جدول المعاملات"
              >
                <div className="btn-content"><span className="btn-text">⚙️ إعدادات الأعمدة</span></div>
              </button>
            </div>
          </div>
          
          {/* Toolbar and pagination for headers table */}
          <div className="transactions-tablebar">
            <div className="transactions-toolbar">
              <span className="transactions-count">عدد السجلات: {totalCount}</span>
              <label className="wrap-toggle">
                <input
                  type="checkbox"
                  checked={wrapMode}
                  onChange={(e) => setWrapMode(e.target.checked)}
                />
                <span>التفاف النص</span>
              </label>
              <button className="ultimate-btn" onClick={() => reload().catch(() => {})}>
                <div className="btn-content"><span className="btn-text">تحديث</span></div>
              </button>
              <button
                className="ultimate-btn ultimate-btn-warning"
                onClick={async () => {
                  if (!confirmRestore('transactions_table_reset_confirm_suppressed', 'سيتم استعادة الإعدادات الافتراضية لأعمدة جدول المعاملات.')) return
                  try {
                    setWrapMode(false)
                    try { localStorage.setItem('transactions_table_wrap', '0') } catch {}
                    handleColumnConfigChange(defaultColumns)
                    if (currentUserId) {
                      const mod = await import('../../services/column-preferences')
                      await mod.upsertUserColumnPreferences({
                        tableKey: 'transactions_table',
                        columnConfig: { columns: defaultColumns, wrapMode: false },
                        version: 2,
                      })
                    }
                    showToast('تمت استعادة الإعدادات الافتراضية للجدول', { severity: 'success' })
                  } catch (e: any) {
                    showToast('فشل استعادة الإعدادات الافتراضية', { severity: 'error' })
                  }
                }}
                title="استعادة الإعدادات الافتراضية"
              >
                <div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div>
              </button>
            </div>
            <div className="transactions-pagination">
              <button className="ultimate-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><div className="btn-content"><span className="btn-text">السابق</span></div></button>
              <span>صفحة {page} من {Math.max(1, Math.ceil(totalCount / pageSize))}</span>
              <button className="ultimate-btn" onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize) || 1, p + 1))} disabled={page >= Math.ceil(totalCount / pageSize)}><div className="btn-content"><span className="btn-text">التالي</span></div></button>
              <select className="filter-select" value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value) || 20); setPage(1) }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          
          {/* Headers table (T1) */}
          <TransactionsHeaderTable
            key={`headers-table-${transactions.length}`}
            transactions={transactions}
            accounts={accounts}
            organizations={organizations}
            projects={projects}
            categories={categories}
            workItems={workItems}
            analysisItemsMap={analysisItemsMap}
            classifications={classifications}
            userNames={userNames}
            columns={columns}
            wrapMode={wrapMode}
            loading={loading}
            onColumnResize={handleColumnResize}
            onSelectTransaction={(tx) => {
              setSelectedTransactionId(tx.id)
              setSelectedLineId(null)
            }}
            selectedTransactionId={selectedTransactionId}
            onEdit={(tx) => {
              setKeepCreateTitle(false)
              setEditingTx(tx)
              initialFormDataRef.current = buildInitialFormDataForEdit(tx)
              setFormOpen(true)
            }}
            onDelete={handleDelete}
            onOpenDetails={async (tx) => {
              setDetailsFor(tx)
              try {
                const rows = await getTransactionAudit(tx.id)
                setAudit(rows)
              } catch {}
              try {
                const hist = await getApprovalHistoryByTransactionId(tx.id)
                setApprovalHistory(hist)
              } catch {}
              setDetailsOpen(true)
            }}
            onOpenDocuments={(tx) => {
              setDocumentsFor(tx)
              setDocumentsOpen(true)
            }}
            onOpenCostAnalysis={openCostAnalysisModal}
            onSubmit={(id) => {
              setSubmitTargetId(id)
              setSubmitNote('')
              setSubmitOpen(true)
            }}
            onApprove={(id) => openReview('approve', id)}
            onRevise={(id) => openReview('revise', id)}
            onReject={(id) => openReview('reject', id)}
            onResubmit={(id) => {
              setSubmitTargetId(id)
              setSubmitNote('')
              setSubmitOpen(true)
            }}
            onPost={async (id) => {
              try {
                await withRetry(() => postTransaction(id))
                showToast('تم الترحيل', { severity: 'success' })
                await reload()
              } catch (e: any) {
                showToast(formatSupabaseError(e) || 'فشل ترحيل المعاملة', { severity: 'error' })
              }
            }}
            onCancelSubmission={async (id) => {
              try {
                await withRetry(() => cancelSubmission(id))
                showToast('تم إلغاء الإرسال', { severity: 'success' })
                await reload()
              } catch (e: any) {
                showToast(formatSupabaseError(e) || 'تعذر إلغاء الإرسال', { severity: 'error' })
              }
            }}
            mode={mode}
            currentUserId={currentUserId || undefined}
            hasPerm={hasPerm}
          />
        </div>
        
        {/* DIVIDER */}
        <div className="transactions-section-divider">
          <span>القيود التفصيلية للمعاملة المحددة</span>
        </div>
        
        {/* SECTION 2: TRANSACTION LINES TABLE (T2) */}
        <div className="transactions-section lines-section">
          <div className="section-header">
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
                    try { localStorage.setItem('transactions_lines_table_wrap', '0') } catch {}
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
                  } catch (e: any) {
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
          
          {/* Lines table (T2) */}
          <TransactionLinesTable
            lines={transactionLines}
            accounts={accounts}
            projects={projects}
            categories={categories}
            workItems={workItems}
            costCenters={costCenters}
            classifications={classifications}
            columns={lineColumns}
            wrapMode={lineWrapMode}
            loading={loading}
            selectedLineId={selectedLineId}
            onColumnResize={handleLineColumnResize}
            onEditLine={(line) => {
              setLineForm({
                id: line.id,
                account_id: line.account_id,
                debit_amount: String(line.debit_amount || 0),
                credit_amount: String(line.credit_amount || 0),
                description: line.description || '',
                project_id: line.project_id || '',
                cost_center_id: line.cost_center_id || '',
                work_item_id: line.work_item_id || '',
                analysis_work_item_id: line.analysis_work_item_id || '',
                classification_id: line.classification_id || '',
                sub_tree_id: line.sub_tree_id || ''
              })
              setEditingLine(true)
            }}
            onDeleteLine={async (id) => {
              const ok = window.confirm('هل تريد حذف هذا السطر؟')
              if (!ok) return
              try {
                const { error } = await supabase
                  .from('transaction_lines')
                  .delete()
                  .eq('id', id)
                if (error) throw error
                showToast('تم حذف السطر', { severity: 'success' })
                if (selectedTransactionId) {
          const { data } = await supabase
                    .from('v_transaction_lines_enriched')
                    .select('*')
                    .eq('transaction_id', selectedTransactionId)
                    .order('line_no', { ascending: true })
                  if (data) setTransactionLines(data)
                }
              } catch (e: any) {
                showToast(e?.message || 'فشل حذف السطر', { severity: 'error' })
              }
            }}
            onSelectLine={(line) => setSelectedLineId(line.id)}
            onOpenDocuments={(line) => {
              setDocumentsFor(line as any)
              setDocumentsOpen(true)
            }}
            onOpenCostAnalysis={(line) => {
              if (!line.transaction_id) {
                showToast('خطأ: معرف المعاملة غير صحيح', { severity: 'error' })
                return
              }
              setAnalysisTransaction({ id: line.transaction_id } as any)
              setAnalysisTransactionId(line.transaction_id)
              setAnalysisTransactionLineId(line.id)
              openCostAnalysisModal({ id: line.transaction_id } as any, { transactionLineId: line.id })
            }}
          />
        </div>
      </div>

      {/* OLD CODE BELOW - TO BE REMOVED */}
      <div style={{display: 'none'}}>
        <ResizableTable
          columns={columns}
          data={tableData}
          onColumnResize={handleColumnResize}
          className={`transactions-resizable-table ${wrapMode ? 'wrap' : 'nowrap'}`}
          isLoading={loading}
          emptyMessage="لا توجد معاملات"
          renderCell={(_value, column, row, _rowIndex) => {
            if (column.key === 'approval_status') {
              const st = row.original.is_posted ? 'posted' : String((row.original as any).approval_status || 'draft')
              const map: Record<string, { label: string; cls: string; tip: string }> = {
                draft: { label: 'مسودة', cls: 'ultimate-btn-neutral', tip: 'لم يتم إرسالها للمراجعة بعد' },
                submitted: { label: 'مُرسلة', cls: 'ultimate-btn-edit', tip: 'بإنتظار المراجعة' },
                revision_requested: { label: 'طلب تعديل', cls: 'ultimate-btn-warning', tip: 'أُعيدت للتعديل — أعد الإرسال بعد التصحيح' },
                approved: { label: 'معتمدة', cls: 'ultimate-btn-success', tip: autoPostOnApprove ? 'تم الاعتماد — قد يتم الترحيل تلقائياً بحسب الإعداد' : 'تم الاعتماد (الترحيل يتطلب صلاحية)' },
                rejected: { label: 'مرفوضة', cls: 'ultimate-btn-delete', tip: 'تم الرفض' },
                cancelled: { label: 'ملغاة', cls: 'ultimate-btn-neutral', tip: 'ألغى المُرسل الإرسال' },
                posted: { label: 'مرحلة', cls: 'ultimate-btn-posted', tip: 'تم الترحيل (مُثبت في الدفاتر)' },
              }
              const conf = map[st] || map['draft']
              return (
                <span className={`ultimate-btn ${conf.cls}`} style={{ cursor: 'default', padding: '4px 8px', minHeight: 28 }} title={conf.tip}>
                  <span className="btn-text">{conf.label}</span>
                </span>
              )
            }
            if (column.key === 'documents_count') {
              const count = (row.original as any).documents_count || 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{count}</span>
                  {count > 0 && <span title={`عدد المرفقات: ${count}`}>📎</span>}
                </div>
              )
            }
            if (column.key === 'documents') {
              return (
                <WithPermission perm="documents.read">
                  <button
                    className="ultimate-btn ultimate-btn-edit"
                    title="إدارة مستندات المعاملة"
                    onClick={() => {
                      setDocumentsFor(row.original)
                      setDocumentsOpen(true)
                    }}
                  >
                    <div className="btn-content"><span className="btn-text">مستندات</span></div>
                  </button>
                </WithPermission>
              )
            }
            if (column.key === 'actions') {
              return (
                <div className="tree-node-actions">
                  {/* View details (audit) */}
                  <button className="ultimate-btn ultimate-btn-edit" onClick={async () => {
                    setDetailsFor(row.original)
                    try {
                      const rows = await getTransactionAudit(row.original.id)
                      setAudit(rows)
                    } catch {}
                    try {
                      const hist = await getApprovalHistoryByTransactionId(row.original.id)
                      setApprovalHistory(hist)
                    } catch {}
                    setDetailsOpen(true)
                  }}><div className="btn-content"><span className="btn-text">تفاصيل</span></div></button>
                  {/* Cost Analysis Button */}
                  <button className="ultimate-btn ultimate-btn-success" 
                    onClick={() => openCostAnalysisModal(row.original)}
                    title="تحليل التكلفة - إدارة بنود التكلفة التفصيلية">
                    <div className="btn-content"><span className="btn-text">تحليل التكلفة</span></div>
                  </button>
                  {/* Review actions in pending mode if permitted */}
                  {mode === 'pending' && !row.original.is_posted && (
                    <>
                      {/* Resubmit if revision requested (owner or manager) */}
                      {((row.original as any).approval_status === 'revision_requested') && (
                        ((row.original.created_by === currentUserId) || hasPerm('transactions.manage')) && (
                          <button className="ultimate-btn ultimate-btn-success" onClick={() => { setSubmitTargetId(row.original.id); setSubmitNote(''); setSubmitOpen(true) }}>
                            <div className="btn-content"><span className="btn-text">إرسال مجددًا</span></div>
                          </button>
                        )
                      )}
                      {/* Show approve only if not already approved */}
                      {(row.original as any).approval_status !== 'approved' && (
                        <WithPermission perm="transactions.review">
                          <button className="ultimate-btn ultimate-btn-success" title="اعتماد المعاملة" onClick={() => openReview('approve', row.original.id)}>
                            <div className="btn-content"><span className="btn-text">اعتماد</span></div>
                          </button>
                        </WithPermission>
                      )}
                      {/* If user has post permission and tx is approved but not posted, show Post button */}
                      {hasPerm('transactions.post') && (row.original as any).approval_status === 'approved' && !row.original.is_posted && (
                        <button className="ultimate-btn ultimate-btn-warning" title="ترحيل المعاملة (يتطلب صلاحية)" onClick={async () => { try { await withRetry(() => postTransaction(row.original.id)); showToast('تم الترحيل', { severity: 'success' }); await reload(); } catch (e: any) { showToast(formatSupabaseError(e) || 'فشل ترحيل المعاملة', { severity: 'error' }); } }}>
                          <div className="btn-content"><span className="btn-text">ترحيل</span></div>
                        </button>
                      )}
                      <WithPermission perm="transactions.review">
                        <button className="ultimate-btn ultimate-btn-edit" onClick={() => openReview('revise', row.original.id)}>
                          <div className="btn-content"><span className="btn-text">إرجاع للتعديل</span></div>
                        </button>
                      </WithPermission>
                      <WithPermission perm="transactions.review">
                        <button className="ultimate-btn ultimate-btn-delete" onClick={() => openReview('reject', row.original.id)}>
                          <div className="btn-content"><span className="btn-text">رفض</span></div>
                        </button>
                      </WithPermission>
                    </>
                  )}
                  {/* Submit for review (my) */}
                  {(!row.original.is_posted &&
                    (((mode === 'my' && row.original.created_by === currentUserId) ||
                      (mode === 'all' && hasPerm('transactions.manage')))) &&
                    !['submitted','approved','rejected'].includes(((row.original as any).approval_status || 'draft'))
                  ) && (
                    <button className="ultimate-btn ultimate-btn-success" onClick={() => {
                      setSubmitTargetId(row.original.id)
                      setSubmitNote('')
                      setSubmitOpen(true)
                    }}>
                      <div className="btn-content"><span className="btn-text">إرسال للمراجعة</span></div>
                    </button>
                  )}
                  {/* Cancel submission for own submitted tx (before review) or managers in All view */}
                  {(!row.original.is_posted &&
                    ((row.original as any).approval_status === 'submitted') &&
                    (((mode === 'my' && row.original.created_by === currentUserId) ||
                      (mode === 'all' && hasPerm('transactions.manage'))))
                  ) && (
                    <button className="ultimate-btn ultimate-btn-warning" onClick={async () => {
                      try {
                        await withRetry(() => cancelSubmission(row.original.id))
                        showToast('تم إلغاء الإرسال', { severity: 'success' })
                        await reload()
                      } catch (e: any) {
                        const msg = formatSupabaseError(e)
                        showToast(msg || 'تعذر إلغاء الإرسال', { severity: 'error' })
                        logClientError({ context: 'transactions.cancelSubmission', message: msg || (e?.message || ''), extra: { id: row.original.id } })
                      }
                    }}>
                      <div className="btn-content"><span className="btn-text">إلغاء الإرسال</span></div>
                    </button>
                  )}
                  {/* If approved and not posted, allow posting in All/My when user has permission */}
                  {hasPerm('transactions.post') && (row.original as any).approval_status === 'approved' && !row.original.is_posted && (
                    <button className="ultimate-btn ultimate-btn-warning" title="ترحيل المعاملة (يتطلب صلاحية)" onClick={async () => { try { await withRetry(() => postTransaction(row.original.id)); showToast('تم الترحيل', { severity: 'success' }); await reload(); } catch (e: any) { showToast(formatSupabaseError(e) || 'فشل ترحيل المعاملة', { severity: 'error' }); } }}>
                      <div className="btn-content"><span className="btn-text">ترحيل</span></div>
                    </button>
                  )}
                  {/* Edit (my) */}
                  {mode === 'my' && !row.original.is_posted && hasPerm('transactions.update') && row.original.created_by === currentUserId && (
                    <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                      setKeepCreateTitle(false)
                      setEditingTx(row.original)
                      // Snapshot initial data for edit
                      initialFormDataRef.current = buildInitialFormDataForEdit(row.original)
                      setFormOpen(true)
                    }}><div className="btn-content"><span className="btn-text">تعديل</span></div></button>
                  )}
                  {/* Edit (all) via manage */}
                  {mode === 'all' && !row.original.is_posted && hasPerm('transactions.manage') && (
                    <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                      setKeepCreateTitle(false)
                      setEditingTx(row.original)
                      // Snapshot initial data for edit
                      initialFormDataRef.current = buildInitialFormDataForEdit(row.original)
                      setFormOpen(true)
                    }}><div className="btn-content"><span className="btn-text">تعديل</span></div></button>
                  )}
                  {/* Delete only in my mode, unposted, with permission */}
                  {mode === 'my' && !row.original.is_posted && hasPerm('transactions.delete') && row.original.created_by === currentUserId && (
                    <button className="ultimate-btn ultimate-btn-delete" onClick={() => handleDelete(row.original.id)} disabled={deletingId === row.original.id}><div className="btn-content"><span className="btn-text">{deletingId === row.original.id ? 'جارٍ الحذف...' : 'حذف'}</span></div></button>
                  )}
                  {/* Manage delete in all view if privileged (still only unposted) */}
                  {mode === 'all' && !row.original.is_posted && hasPerm('transactions.manage') && (
                    <button className="ultimate-btn ultimate-btn-delete" onClick={() => handleDelete(row.original.id)}><div className="btn-content"><span className="btn-text">حذف</span></div></button>
                  )}
                </div>
              )
            }
            return undefined // Let default formatting handle other columns
          }}
        />
      </div>

      
      {/* Unified Transaction Form Panel */}
      <DraggableResizablePanel
        title={keepCreateTitle ? 'إضافة المعاملة' : (editingTx ? 'تعديل المعاملة' : 'إضافة المعاملة')}
        isOpen={formOpen}
        onClose={handleFormCancel}
        position={panelPosition}
        size={panelSize}
        onMove={setPanelPosition}
        onResize={setPanelSize}
        isMaximized={panelMax}
        onMaximize={() => setPanelMax(!panelMax)}
        isDocked={panelDocked}
        dockPosition={panelDockPos}
        onDock={(pos) => {
          setPanelDocked(true)
          setPanelDockPos(pos)
        }}
        onResetPosition={() => {
          setPanelPosition({ x: 100, y: 100 })
          setPanelSize({ width: 800, height: 700 })
          setPanelMax(false)
          setPanelDocked(false)
        }}
      >
          <div className="panel-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Settings modal open */}
            <button
              className="ultimate-btn ultimate-btn-secondary"
              title="الإعدادات"
              onClick={() => setTransactionsConfigOpen(true)}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <div className="btn-content"><span className="btn-text">الإعدادات</span></div>
            </button>
            {/* Edit header toggle */}
            <button
              className="ultimate-btn ultimate-btn-edit"
              title="تعديل بيانات الرأس"
              onClick={() => setShowHeaderEditor(v => !v)}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <div className="btn-content"><span className="btn-text">{showHeaderEditor ? 'إخفاء نموذج الرأس' : 'تعديل بيانات الرأس'}</span></div>
            </button>

            {/* Save Form Panel Layout Button */}
            <button
              className="ultimate-btn ultimate-btn-success"
              title="حفظ حجم وموضع نموذج المعاملة كمفضل"
              onClick={handleSaveFormPanelLayout}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <div className="btn-content"><span className="btn-text">💾 حفظ التخطيط</span></div>
            </button>

            {/* Reset Form Panel Layout Button */}
            <button
              className="ultimate-btn ultimate-btn-warning"
              title="إعادة تعيين حجم وموضع نموذج المعاملة"
              onClick={handleResetFormPanelLayout}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <div className="btn-content"><span className="btn-text">🔄 إعادة تعيين</span></div>
            </button>

            {(editingTx || createdTxId) && (
              <>
                <button
                  className="ultimate-btn ultimate-btn-success"
                  title="إرسال للمراجعة"
                  onClick={() => { const id = (editingTx?.id || createdTxId)!; setSubmitTargetId(id); setSubmitNote(''); setSubmitOpen(true) }}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <div className="btn-content"><span className="btn-text">إرسال للمراجعة</span></div>
                </button>
                <button
                  className="ultimate-btn ultimate-btn-delete"
                  title="حذف المعاملة"
                  onClick={() => { const id = (editingTx?.id || createdTxId)!; handleDelete(id) }}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <div className="btn-content"><span className="btn-text">حذف</span></div>
                </button>
                {hasPerm('transactions.post') && !(editingTx && editingTx.is_posted) && ((editingTx as any)?.approval_status === 'approved') && (
                  <button
                    className="ultimate-btn ultimate-btn-warning"
                    title="ترحيل المعاملة"
                    onClick={async () => { try { await withRetry(() => postTransaction((editingTx?.id || createdTxId)!)); showToast('تم الترحيل', { severity: 'success' }); await reload(); } catch (e: any) { showToast(formatSupabaseError(e) || 'فشل الترحيل', { severity: 'error' }) } }}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    <div className="btn-content"><span className="btn-text">ترحيل</span></div>
                  </button>
                )}
              </>
            )}
          </div>
          {/* Header form (visible only before header creation) */}
          {!(editingTx || createdTxId) && (
            <>
              <UnifiedCRUDForm
                ref={formRef}
                config={createTransactionFormConfig(
                  false,
                  accounts,
                  projects,
                  organizations,
                  classifications,
                  undefined,
                  categories,
                  workItems,
                  costCenters,
                  { headerOnly: true }
                )}
                initialData={initialFormDataRef.current || buildInitialFormDataForCreate()}
                resetOnInitialDataChange={false}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isLoading={isSaving}
                hideDefaultActions={true}
              />
              {/* Primary action below the form for cleaner flow */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="ultimate-btn ultimate-btn-success"
                  title="إضافة قيود المعاملة"
                  onClick={() => formRef.current?.submit()}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <div className="btn-content"><span className="btn-text">إضافة قيود المعاملة</span></div>
                </button>
              </div>
            </>
          )}
          {/* Header edit form (collapsible) */}
          {(editingTx || createdTxId) && showHeaderEditor && editingTx && (
            <div style={{ margin: '8px 0' }}>
              <UnifiedCRUDForm
                ref={formRef}
                config={createTransactionFormConfig(
                  true,
                  accounts,
                  projects,
                  organizations,
                  classifications,
                  editingTx,
                  categories,
                  workItems,
                  costCenters,
                  { headerOnly: false, linesBalanced: linesTotals.balanced, linesCount: linesTotals.count }
                )}
                initialData={buildInitialFormDataForEdit(editingTx)}
                resetOnInitialDataChange={false}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowHeaderEditor(false)}
                isLoading={isSaving}
                hideDefaultActions={false}
              />
            </div>
          )}

          {/* Add Lines + Documents + Summary */}
          {(editingTx || createdTxId) && (
            <div>
              <div style={{ marginTop: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <h3 style={{ marginBottom: 8 }}>إضافة قيود المعاملة</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ultimate-btn" onClick={() => setLinesLayoutOpen(true)} style={{ fontSize: 12, padding: '4px 8px' }}>
                      <div className="btn-content"><span className="btn-text">إعدادات التخطيط</span></div>
                    </button>
                    <button className="ultimate-btn ultimate-btn-warning" onClick={() => { if (!confirmRestore('txLinesLayout_reset_confirm_suppressed', 'سيتم استعادة تخطيط نموذج القيود التفصيلية للإعدادات الافتراضية.')) return; setLinesColumnCount(3); setLinesFieldOrder(defaultLinesOrder); setLinesFullWidth(new Set(['description_line'])); setLinesVisible(new Set(defaultLinesOrder)); try { localStorage.removeItem('txLines:columns'); localStorage.removeItem('txLines:order'); localStorage.removeItem('txLines:fullWidth'); localStorage.removeItem('txLines:visible'); } catch {} }} style={{ fontSize: 12, padding: '4px 8px' }} title="استعادة التخطيط الافتراضي">
                      <div className="btn-content"><span className="btn-text">استعادة الافتراضي</span></div>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, alignItems: 'start', gridTemplateColumns: linesColumnCount === 1 ? '1fr' : linesColumnCount === 2 ? '1fr 1fr' : '1fr 1fr 1fr' }}>
                  {orderedLineFields.map((id) => (
                    <div key={id} style={linesFullWidth.has(id) ? { gridColumn: '1 / -1' } : undefined}>
                      {renderLineField(id)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout controls portal */}
              {linesLayoutOpen && ReactDOM.createPortal(
                <FormLayoutControls
                  fields={lineFieldsMeta}
                  fieldOrder={linesFieldOrder.length ? linesFieldOrder : defaultLinesOrder}
                  columnCount={linesColumnCount}
                  onColumnCountChange={(c)=>setLinesColumnCount(c)}
                  onFieldOrderChange={(o)=>setLinesFieldOrder(o)}
                  fullWidthFields={linesFullWidth}
                  onFullWidthToggle={(fid)=>setLinesFullWidth(prev=>{ const n=new Set(prev); if(n.has(fid)) n.delete(fid); else n.add(fid); return n })}
                  visibleFields={linesVisible}
                  onVisibilityToggle={(fid)=>setLinesVisible(prev=>{ const n=new Set(prev); if(n.has(fid)) n.delete(fid); else n.add(fid); return n })}
                  onResetLayout={()=>{ setLinesColumnCount(3); setLinesFieldOrder(defaultLinesOrder); setLinesFullWidth(new Set(['description_line'])); setLinesVisible(new Set(defaultLinesOrder)); }}
                  onSaveLayout={()=>{ try { localStorage.setItem('txLines:columns', String(linesColumnCount)); localStorage.setItem('txLines:order', JSON.stringify(linesFieldOrder.length?linesFieldOrder:defaultLinesOrder)); localStorage.setItem('txLines:fullWidth', JSON.stringify(Array.from(linesFullWidth))); localStorage.setItem('txLines:visible', JSON.stringify(Array.from(linesVisible))); } catch {} setLinesLayoutOpen(false) }}
                  isOpen={linesLayoutOpen}
                  onToggle={()=>setLinesLayoutOpen(false)}
                  showToggleButton={false}
                />,
                document.body
              )}

              {/* Documents */}
              <div style={{ marginTop: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ marginBottom: 8 }}>المستندات المرفقة</h3>
                  <button className="ultimate-btn" onClick={() => setDocsInlineOpen(v => !v)} style={{ fontSize: 12, padding: '4px 8px' }}>
                    <div className="btn-content"><span className="btn-text">{docsInlineOpen ? 'إخفاء' : 'عرض'}</span></div>
                  </button>
                </div>
                {docsInlineOpen && (
                  <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 8, background: 'var(--surface)' }}>
                    <AttachDocumentsPanel orgId={editingTx?.org_id || ''} transactionId={(editingTx?.id || createdTxId) || undefined} projectId={editingTx?.project_id || undefined} />
                  </div>
                )}
              </div>

              {/* Lines summary */}
              <div style={{ marginTop: 'var(--spacing-lg)' }}>
                <h3 style={{ marginBottom: 8 }}>ملخص القيود</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'center' }}>#</th>
                        <th>الحساب</th>
                        <th style={{ textAlign: 'right' }}>مدين</th>
                        <th style={{ textAlign: 'right' }}>دائن</th>
                        <th>البيان</th>
                        <th style={{ textAlign: 'center' }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l: any, idx: number) => (
                        <tr key={l.id || idx}>
                          <td style={{ textAlign: 'center' }}>{l.line_no}</td>
                          <td>{(() => { const acc = accounts.find(a => a.id === l.account_id); return acc ? `${acc.code} - ${acc.name}` : l.account_id; })()}</td>
                          <td style={{ textAlign: 'right' }}>{Number(l.debit_amount || 0).toLocaleString('ar-EG')}</td>
                          <td style={{ textAlign: 'right' }}>{Number(l.credit_amount || 0).toLocaleString('ar-EG')}</td>
                          <td>{l.description || ''}</td>
                          <td style={{ textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button className="ultimate-btn ultimate-btn-edit" onClick={() => { setLineForm({ id: l.id, account_id: l.account_id, debit_amount: l.debit_amount ? String(l.debit_amount) : '', credit_amount: l.credit_amount ? String(l.credit_amount) : '', description: l.description || '', project_id: l.project_id || '', cost_center_id: l.cost_center_id || '', work_item_id: l.work_item_id || '', analysis_work_item_id: l.analysis_work_item_id || '', classification_id: l.classification_id || '', sub_tree_id: l.sub_tree_id || '', }); setEditingLine(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                              <div className="btn-content"><span className="btn-text">Edit</span></div>
                            </button>
                            <button className="ultimate-btn ultimate-btn-delete" onClick={async () => { try { await supabase.from('transaction_lines').delete().eq('id', l.id); showToast('تم حذف السطر', { severity: 'success' }); } catch (e: any) { showToast(e?.message || 'فشل حذف السطر', { severity: 'error' }); } }}>
                              <div className="btn-content"><span className="btn-text">Delete</span></div>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>الإجمالي مدين:</strong> {linesTotals.debits.toLocaleString('ar-EG')} —
                    <strong> الإجمالي دائن:</strong> {linesTotals.credits.toLocaleString('ar-EG')} —
                    <strong> الفرق:</strong> {(linesTotals.debits - linesTotals.credits).toFixed(2)} {linesTotals.balanced ? '✅ متوازن' : '❌ غير متوازن'} —
                    <strong> عدد الأسطر:</strong> {linesTotals.count}
                  </div>
                  <button className="ultimate-btn ultimate-btn-success" disabled={!linesTotals.balanced} onClick={() => { setFormOpen(false); setEditingTx(null); setCreatingDraft(false); showToast('تم حفظ المسودة بنجاح', { severity: 'success' }); void reload(); }}>
                    <div className="btn-content"><span className="btn-text">Save draft</span></div>
                  </button>
                </div>
              </div>
            </div>
          )}
      </DraggableResizablePanel>
      
      {/* Details Panel */}
      {detailsOpen && detailsFor && (
        <UnifiedTransactionDetailsPanel
          transaction={detailsFor}
          audit={audit}
          approvalHistory={approvalHistory}
          userNames={userNames}
          categoryLabel={(detailsFor as any).sub_tree_id ? (() => {
            const m: Record<string,string> = {}
            for (const c of categories) { m[c.id] = `${c.code} - ${c.description}` }
            return m[(detailsFor as any).sub_tree_id] || '—'
          })() : '—'}
          
          // Data for editing
          accounts={accounts}
          projects={projects}
          organizations={organizations}
          classifications={classifications}
          categories={categories}
          workItems={workItems}
          costCenters={costCenters}
          analysisItemsMap={analysisItemsMap}
          
          // Callbacks
          onClose={() => setDetailsOpen(false)}
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
          onDelete={async (transactionId) => {
            await handleDelete(transactionId)
          }}
          onSubmitForReview={async (transactionId, note) => {
            await withRetry(() => submitTransaction(transactionId, note))
            showToast('تم إرسال المعاملة للمراجعة بنجاح', { severity: 'success' })
            await reload()
          }}
          onApprove={async (transactionId, reason) => {
            await withRetry(() => approveTransaction(transactionId, reason || null as any))
            showToast('تم اعتماد المعاملة', { severity: 'success' })
            await reload()
          }}
          onReject={async (transactionId, reason) => {
            await withRetry(() => rejectTransaction(transactionId, reason))
            showToast('تم رفض المعاملة', { severity: 'success' })
            await reload()
          }}
          onRequestRevision={async (transactionId, reason) => {
            await withRetry(() => requestRevision(transactionId, reason))
            showToast('تم إرجاع المعاملة للتعديل', { severity: 'success' })
            await reload()
          }}
          onPost={async (transactionId) => {
            await withRetry(() => postTransaction(transactionId))
            showToast('تم ترحيل المعاملة', { severity: 'success' })
            await reload()
          }}
          
          // Permissions
          canEdit={hasPerm('transactions.update')}
          canDelete={hasPerm('transactions.delete')}
          canReview={hasPerm('transactions.review')}
          canPost={hasPerm('transactions.post')}
          canManage={hasPerm('transactions.manage')}
          
          // UI state
          currentUserId={currentUserId}
          mode={mode}
        />
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

      {/* Review Modal */}
      {reviewOpen && (
        <div className="transaction-modal" onClick={() => !reviewBusy && setReviewOpen(false)}>
          <div className="transaction-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title">{reviewAction === 'approve' ? 'اعتماد المعاملة' : reviewAction === 'revise' ? 'إرجاع للتعديل' : 'رفض المعاملة'}</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => !reviewBusy && setReviewOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <div>
              <label className="modal-title modal-label">سبب الإجراء</label>
              <textarea
                className="textarea-field"
                placeholder={reviewAction === 'approve' ? 'ملاحظات (اختياري)' : 'السبب (إلزامي)'}
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
              />
              <div className="button-container">
                <button className="ultimate-btn ultimate-btn-success" onClick={submitReview} disabled={reviewBusy}>
                  <div className="btn-content"><span className="btn-text">تأكيد</span></div>
                </button>
                <button className="ultimate-btn ultimate-btn-warning" onClick={() => !reviewBusy && setReviewOpen(false)} disabled={reviewBusy}>
                  <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Note Modal */}
      {submitOpen && (
        <div className="transaction-modal" onClick={() => !submitBusy && setSubmitOpen(false)}>
          <div className="transaction-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3 className="modal-title">إرسال للمراجعة</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => !submitBusy && setSubmitOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <div>
              <label className="modal-title modal-label">ملاحظات الإرسال (اختياري)</label>
              <textarea
                className="textarea-field"
                placeholder={'أدخل سبب/ملاحظات الإرسال'}
                value={submitNote}
                onChange={e => setSubmitNote(e.target.value)}
              />
              <div className="button-container">
                <button className="ultimate-btn ultimate-btn-success" onClick={async () => {
                  if (!submitTargetId) return
                  setSubmitBusy(true)
                  try {
                    await submitTransaction(submitTargetId, submitNote)
                    showToast('تم إرسال المعاملة للمراجعة بنجاح', { severity: 'success' })
                    setSubmitOpen(false)
                    setSubmitTargetId(null)
                    setSubmitNote('')
                    await reload()
                    try { window.location.href = '/transactions/pending' } catch { /* ignore navigation error */ }
                  } catch (e: any) {
                    showToast(e?.message || 'فشل إرسال المعاملة للمراجعة', { severity: 'error' })
                    logClientError({ context: 'transactions.submit', message: e?.message || '', extra: { id: submitTargetId, note: submitNote } })
                  } finally {
                    setSubmitBusy(false)
                  }
                }} disabled={submitBusy}>
                  <div className="btn-content"><span className="btn-text">تأكيد الإرسال</span></div>
                </button>
                <button className="ultimate-btn ultimate-btn-warning" onClick={() => !submitBusy && setSubmitOpen(false)} disabled={submitBusy}>
                  <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                </button>
              </div>
            </div>
          </div>
        </div>
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
                      setColumnConfigOpen(true);
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

      
      {/* Transaction Analysis Modal */}
      <TransactionAnalysisModal
        open={analysisModalOpen}
        transactionId={analysisTransactionId}
        transactionLineId={analysisTransactionLineId}
        onClose={closeCostAnalysisModal}
        entryNumber={analysisTransaction?.entry_number}
        description={analysisTransaction?.description}
        effectiveTolerance={1.0}
        transactionAmount={analysisTransaction?.amount}
        orgId={analysisTransaction?.org_id || ''}
        workItems={workItems}
        costCenters={costCenters}
      />
      
      {/* Column Configuration Modal - Headers Table */}
      <ColumnConfiguration
        columns={columns}
        onConfigChange={handleColumnConfigChange}
        isOpen={headersColumnConfigOpen}
        onClose={() => setHeadersColumnConfigOpen(false)}
        onReset={resetToDefaults}
        sampleData={tableData as any}
      />

      {/* Column Configuration Modal - Lines Table */}
      <ColumnConfiguration
        columns={lineColumns}
        onConfigChange={handleLineColumnConfigChange}
        isOpen={lineColumnsConfigOpen}
        onClose={() => setLineColumnsConfigOpen(false)}
        onReset={resetLineColumnsToDefaults}
        sampleData={transactionLines as any}
      />


      {/* Documents Panel */}
      {documentsOpen && (documentsFor || documentsForLine) && (
        <DraggableResizablePanel
          title={documentsForLine ? `مستندات القيد التفصيلي` : `مستندات المعاملة - ${documentsFor?.entry_number}`}
          isOpen={documentsOpen}
          onClose={() => {
            setDocumentsOpen(false)
            setDocumentsFor(null)
            setDocumentsForLine(null)
          }}
          position={docsPanelPosition}
          size={docsPanelSize}
          onMove={setDocsPanelPosition}
          onResize={setDocsPanelSize}
          isMaximized={docsPanelMax}
          onMaximize={() => setDocsPanelMax(!docsPanelMax)}
          isDocked={docsPanelDocked}
          dockPosition={docsPanelDockPos}
          onDock={(pos) => {
            setDocsPanelDocked(true)
            setDocsPanelDockPos(pos)
          }}
          onResetPosition={() => {
            setDocsPanelPosition({ x: 120, y: 120 })
            setDocsPanelSize({ width: 900, height: 700 })
            setDocsPanelMax(false)
            setDocsPanelDocked(false)
          }}
        >
          <div className="panel-actions">
            <button
              className="ultimate-btn ultimate-btn-success"
              title="حفظ تخطيط لوحة المستندات"
              onClick={() => {
                try {
                  const pref = {
                    position: docsPanelPosition,
                    size: docsPanelSize,
                    maximized: docsPanelMax,
                    docked: docsPanelDocked,
                    dockPosition: docsPanelDockPos,
                    savedTimestamp: Date.now(),
                    userPreferred: true
                  }
                  localStorage.setItem('documentsPanel:preferred', JSON.stringify(pref))
                } catch {}
              }}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <div className="btn-content"><span className="btn-text">💾 حفظ التخطيط</span></div>
            </button>
            <button
              className="ultimate-btn ultimate-btn-warning"
              title="إعادة تعيين تخطيط لوحة المستندات"
              onClick={() => {
                setDocsPanelPosition({ x: 120, y: 120 })
                setDocsPanelSize({ width: 900, height: 700 })
                setDocsPanelMax(false)
                setDocsPanelDocked(false)
                setDocsPanelDockPos('right')
                try {
                  localStorage.removeItem('documentsPanel:preferred')
                  localStorage.removeItem('documentsPanel:position')
                  localStorage.removeItem('documentsPanel:size')
                  localStorage.removeItem('documentsPanel:maximized')
                  localStorage.removeItem('documentsPanel:docked')
                  localStorage.removeItem('documentsPanel:dockPosition')
                } catch {}
              }}
              style={{ fontSize: '12px', padding: '6px 10px' }}
            >
              <div className="btn-content"><span className="btn-text">🔄 إعادة تعيين</span></div>
            </button>
          </div>
          <AttachDocumentsPanel
            orgId={documentsFor?.org_id || ''}
            transactionId={documentsFor?.id}
            transactionLineId={documentsForLine?.id}
            projectId={documentsFor?.project_id || undefined}
          />
        </DraggableResizablePanel>
      )}

      {/* Simple Transaction Wizard */}
      <TransactionWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={async (data) => {
          console.log('New transaction data:', data)
          // TODO: Implement transaction creation logic
          await reload()
        }}
        accounts={accounts}
        projects={projects}
        organizations={organizations}
      />
    </div>
  )
}

export default TransactionsPage



