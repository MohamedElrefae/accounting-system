import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import DraggableResizablePanel from '../Common/DraggableResizablePanel'
import { TabsContainer } from '../Common/TabsContainer'
import { ExpandableSection } from '../Common/ExpandableSection'
import { InfoField } from '../Common/InfoField'
import { InfoGrid } from '../Common/InfoGrid'
// import UnifiedCRUDForm, { type UnifiedCRUDFormHandle } from '../Common/UnifiedCRUDForm'
// import { createTransactionFormConfig } from './TransactionFormConfig'
import { type TransactionRecord, type TransactionAudit, type Account, type Project } from '../../services/transactions'
import { TransactionLineCard } from './TransactionLineCard'
// Approval history type - moved to local definition
type ApprovalHistoryRow = {
  id: string
  request_id: string
  step_order: number
  action: 'approve' | 'reject' | 'request_changes' | 'comment'
  reason: string | null
  actor_user_id: string
  created_at: string
}
import type { Organization } from '../../types'
import type { TransactionClassification } from '../../services/transaction-classification'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import type { WorkItemRow } from '../../types/work-items'
import './UnifiedTransactionDetailsPanel.css'
// import { TransactionLineItemsSection } from '../line-items/TransactionLineItemsSection'
import AttachDocumentsPanel from '../documents/AttachDocumentsPanel'
import { useToast } from '../../contexts/ToastContext'
import MultiLineEditor from './MultiLineEditor'
import { TransactionSettingsPanel } from './TransactionSettingsPanel'
import ColumnConfiguration from '../Common/ColumnConfiguration'
import type { ColumnConfig } from '../Common/ColumnConfiguration'
import {
  getDefaultFieldConfig,
  loadFieldConfig,
  saveFieldConfig
} from '../../config/transactionFieldConfigs'

export interface UnifiedTransactionDetailsPanelProps {
  transaction: TransactionRecord
  audit: TransactionAudit[]
  approvalHistory: ApprovalHistoryRow[]
  userNames: Record<string, string>
  categoryLabel?: string

  // Transaction lines (single source of truth)
  transactionLines?: any[]

  // Data for editing
  accounts: Account[]
  projects: Project[]
  organizations: Organization[]
  classifications: TransactionClassification[]
  categories: ExpensesCategoryRow[]
  workItems: WorkItemRow[]
  costCenters: Array<{ id: string; code: string; name: string; name_ar?: string | null; project_id?: string | null; level: number }>
  analysisItemsMap: Record<string, { code: string; name: string }>

  // Callbacks
  onClose: () => void
  onUpdate?: (updatedTransaction: TransactionRecord) => Promise<void>
  onDelete?: (transactionId: string) => Promise<void>
  onSubmitForReview?: (transactionId: string, note: string) => Promise<void>
  onApprove?: (transactionId: string, reason?: string) => Promise<void>
  onReject?: (transactionId: string, reason: string) => Promise<void>
  onRequestRevision?: (transactionId: string, reason: string) => Promise<void>
  onPost?: (transactionId: string) => Promise<void>
  onEditWithWizard?: (transaction: TransactionRecord) => Promise<void>

  // Permissions
  canEdit?: boolean
  canDelete?: boolean
  canReview?: boolean
  canPost?: boolean
  canManage?: boolean

  // UI state
  currentUserId?: string | null
  mode?: 'my' | 'pending' | 'all'
}

type ViewMode = 'view' | 'edit'

const UnifiedTransactionDetailsPanel: React.FC<UnifiedTransactionDetailsPanelProps> = ({
  transaction,
  audit,
  approvalHistory,
  userNames,
  categoryLabel: _categoryLabel,
  transactionLines: propsTransactionLines,
  accounts,
  projects,
  organizations,
  classifications,
  categories,
  workItems,
  costCenters,
  analysisItemsMap,
  onClose,
  onUpdate: _onUpdate,
  onDelete: _onDelete,
  onSubmitForReview,
  onApprove,
  onReject,
  onRequestRevision,
  onPost,
  onEditWithWizard,
  canEdit = false,
  canDelete = false,
  canReview = false,
  canPost = false,
  canManage = false,
  currentUserId,
  mode = 'all'
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('view')
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchedTransaction, setFetchedTransaction] = useState<TransactionRecord | null>(null)
  const [txLines, setTxLines] = useState<any[]>(propsTransactionLines || [])
  // Active tab state with persistence
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('transactionDetails:activeTab')
      return saved || 'basic'
    } catch {
      return 'basic'
    }
  })

  // Display settings from localStorage
  const [displaySettings, setDisplaySettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('transactionSettings:display') || '{}')
    } catch {
      return {}
    }
  })

  // UI settings from localStorage
  const [uiSettings, setUISettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('transactionSettings:ui') || '{}')
    } catch {
      return {}
    }
  })

  // Layout settings from localStorage
  const [layoutSettings, setLayoutSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('transactionSettings:layout') || '{}')
    } catch {
      return {}
    }
  })

  // Listen for settings changes via custom events
  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent
      const { type, settings } = customEvent.detail

      if (type === 'display') {
        setDisplaySettings(settings)
      } else if (type === 'ui') {
        setUISettings(settings)
      } else if (type === 'layout') {
        setLayoutSettings(settings)
      }
    }

    window.addEventListener('transactionSettingsChanged', handleSettingsChange)
    return () => window.removeEventListener('transactionSettingsChanged', handleSettingsChange)
  }, [])

  // Consume transaction lines from props (single source of truth)
  useEffect(() => {
    if (propsTransactionLines) {
      setTxLines(propsTransactionLines)
    }
  }, [propsTransactionLines])

  // Use fetched transaction if available, otherwise fall back to props
  const effectiveTransaction = fetchedTransaction || transaction

  const { showToast } = useToast()

  // Panel state with persistence
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('transactionDetailsPanel:position');
      return saved ? JSON.parse(saved) : { x: 150, y: 150 };
    } catch { return { x: 150, y: 150 }; }
  })
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>(() => {
    try {
      const saved = localStorage.getItem('transactionDetailsPanel:size');
      return saved ? JSON.parse(saved) : { width: 1000, height: 800 };
    } catch { return { width: 1000, height: 800 }; }
  })
  const [panelMax, setPanelMax] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('transactionDetailsPanel:maximized');
      return saved === 'true';
    } catch { return false; }
  })
  const [panelDocked, setPanelDocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('transactionDetailsPanel:docked');
      return saved === 'true';
    } catch { return false; }
  })
  const [panelDockPos, setPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>(() => {
    try {
      const saved = localStorage.getItem('transactionDetailsPanel:dockPosition');
      return (saved as 'left' | 'right' | 'top' | 'bottom') || 'right';
    } catch { return 'right'; }
  })

  // Action modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'revise' | null>(null)
  const [reviewReason, setReviewReason] = useState('')
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)



  // Field configuration modals
  const [basicInfoConfigOpen, setBasicInfoConfigOpen] = useState(false)
  const [lineItemsConfigOpen, setLineItemsConfigOpen] = useState(false)
  const [approvalsConfigOpen, setApprovalsConfigOpen] = useState(false)
  const [documentsConfigOpen, setDocumentsConfigOpen] = useState(false)
  const [auditConfigOpen, setAuditConfigOpen] = useState(false)

  // Field configurations
  const [basicInfoFields, setBasicInfoFields] = useState<ColumnConfig[]>(() =>
    loadFieldConfig('basicInfo') || getDefaultFieldConfig('basicInfo')
  )
  const [lineItemsFields, setLineItemsFields] = useState<ColumnConfig[]>(() =>
    loadFieldConfig('lineItems') || getDefaultFieldConfig('lineItems')
  )
  const [approvalsFields, setApprovalsFields] = useState<ColumnConfig[]>(() =>
    loadFieldConfig('approvals') || getDefaultFieldConfig('approvals')
  )
  const [documentsFields, setDocumentsFields] = useState<ColumnConfig[]>(() =>
    loadFieldConfig('documents') || getDefaultFieldConfig('documents')
  )
  const [auditFields, setAuditFields] = useState<ColumnConfig[]>(() =>
    loadFieldConfig('audit') || getDefaultFieldConfig('audit')
  )

  const formRef = useRef<UnifiedCRUDFormHandle>(null)

  // Helper function to filter visible fields (order is preserved from array)
  const getVisibleFields = (fields: ColumnConfig[]) => {
    return fields.filter(f => f.visible)
  }

  // Field value mapper - maps field keys to actual values
  const getFieldValue = (fieldKey: string): any => {
    const tx = effectiveTransaction
    const fieldMap: Record<string, any> = {
      // Basic transaction fields
      entry_number: tx.entry_number,
      entry_date: formatDate(tx.entry_date),
      description: tx.description,
      reference_number: tx.reference_number || '—',
      status: <span className={`status-badge ${unifiedStatus.cls}`}>{unifiedStatus.label}</span>,

      // Organization & Project
      organization: organizations.find(o => o.id === tx.org_id)?.name || '—',
      project: projects.find(p => p.id === tx.project_id)?.name || '—',
      cost_center: getCostCenterLabel(tx.cost_center_id),
      work_item: getWorkItemLabel((tx as any).work_item_id),
      analysis_work_item: getAnalysisWorkItemLabel((tx as any).analysis_work_item_id),
      category: (tx as any).category_name || '—',

      // Totals (calculated from lines for accuracy)
      total_debits: <span className="amount">{formatCurrency(totalDebits)}</span>,
      total_credits: <span className="amount">{formatCurrency(totalCredits)}</span>,
      balance_status: isBalanced ? '✅ متوازن' : '❌ غير متوازن',
      lines_count: txLines.length,

      // Audit fields
      created_by: userNames[tx.created_by || ''] || '—',
      created_at: tx.created_at ? formatDateTime(tx.created_at) : '—',
      notes: tx.notes || '—',
    }

    return fieldMap[fieldKey] || '—'
  }

  // Line item value mapper - maps field keys to line item values
  const getLineItemValue = (line: any, fieldKey: string, idx: number): any => {
    const fieldMap: Record<string, any> = {
      line_no: idx + 1,
      account: getAccountLabel(line.account_id),
      debit: parseFloat(line.debit || 0).toLocaleString('ar-EG'),
      credit: parseFloat(line.credit || 0).toLocaleString('ar-EG'),
      description: line.description || '—',
      project: projects.find(p => p.id === line.project_id)?.name || '—',
      cost_center: getCostCenterLabel(line.cost_center_id),
      work_item: getWorkItemLabel(line.work_item_id),
      category: (line as any).category_name || '—',
      analysis_work_item: getAnalysisWorkItemLabel(line.analysis_work_item_id),
      line_status: line.status || 'active',
    }

    return fieldMap[fieldKey] || '—'
  }

  // Approval value mapper - maps field keys to approval values
  const getApprovalValue = (approval: ApprovalHistoryRow, fieldKey: string, idx: number): any => {
    const actionMap: Record<string, string> = {
      approve: 'اعتماد',
      request_changes: 'إرجاع للتعديل',
      reject: 'رفض',
    }

    const fieldMap: Record<string, any> = {
      step: idx + 1,
      action: actionMap[approval.action] || 'ملاحظة',
      user: userNames[approval.actor_user_id] || (approval.actor_user_id ? approval.actor_user_id.substring(0, 8) : '—'),
      date: approval.created_at ? formatDateTime(approval.created_at) : '—',
      reason: approval.reason || '—',
      status: approval.action,
    }

    return fieldMap[fieldKey] || '—'
  }

  // Audit value mapper - maps field keys to audit values
  const getAuditValue = (audit: TransactionAudit, fieldKey: string): any => {
    const fieldMap: Record<string, any> = {
      action: audit.action,
      user: audit.actor_id ? (userNames[audit.actor_id] || audit.actor_id.substring(0, 8)) : '—',
      date: audit.created_at ? formatDateTime(audit.created_at) : '—',
      details: audit.action,
      ip_address: '—', // Not available in current schema
    }

    return fieldMap[fieldKey] || '—'
  }

  // Helper functions
  const getAccountLabel = (accountId?: string | null) => {
    if (!accountId) return '—'
    const account = accounts.find(a => a.id === accountId)
    return account ? `${account.code} - ${account.name}` : accountId
  }

  const getWorkItemLabel = (workItemId?: string | null) => {
    if (!workItemId) return '—'
    const workItem = workItems.find(w => w.id === workItemId)
    return workItem ? `${workItem.code} - ${workItem.name}` : workItemId
  }

  const getAnalysisWorkItemLabel = (analysisWorkItemId?: string | null) => {
    if (!analysisWorkItemId) return '—'
    const item = analysisItemsMap[analysisWorkItemId]
    return item ? `${item.code} - ${item.name}` : analysisWorkItemId
  }

  const getCostCenterLabel = (costCenterId?: string | null) => {
    if (!costCenterId) return '—'
    const costCenter = costCenters.find(cc => cc.id === costCenterId)
    return costCenter ? `${costCenter.code} - ${costCenter.name}` : costCenterId
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG')
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('ar-EG')
  }

  // Calculate totals from lines (source of truth for accuracy)
  const { totalDebits, totalCredits, isBalanced } = useMemo(() => {
    const debits = txLines.reduce((sum, line) => sum + (parseFloat(line.debit_amount || line.debit) || 0), 0)
    const credits = txLines.reduce((sum, line) => sum + (parseFloat(line.credit_amount || line.credit) || 0), 0)
    const balanced = Math.abs(debits - credits) < 0.01
    return { totalDebits: debits, totalCredits: credits, isBalanced: balanced }
  }, [txLines])

  // Unified approval status - calculated from lines for accuracy
  const unifiedStatus = useMemo(() => {
    const tx = effectiveTransaction

    // If posted, always show posted
    if (tx.is_posted) {
      return { label: 'مرحلة', cls: 'status-posted', tip: 'تم الترحيل' }
    }

    // Calculate status from lines if available
    if (txLines.length > 0) {
      const approvedCount = txLines.filter(line => line.line_status === 'approved').length
      const rejectedCount = txLines.filter(line => line.line_status === 'rejected').length

      if (approvedCount === txLines.length) {
        return { label: 'معتمدة', cls: 'status-approved', tip: 'تم اعتماد جميع السطور' }
      } else if (rejectedCount > 0) {
        return { label: 'يحتاج تعديل', cls: 'status-revision', tip: 'تم رفض بعض السطور' }
      } else if (approvedCount > 0) {
        return { label: 'قيد المراجعة', cls: 'status-submitted', tip: `${approvedCount} من ${txLines.length} سطور معتمدة` }
      }
    }

    // Fallback to header status
    const st = String((tx as any).approval_status || 'draft')
    const map: Record<string, { label: string; cls: string; tip: string }> = {
      draft: { label: 'مسودة', cls: 'status-draft', tip: 'لم يتم إرسالها للمراجعة بعد' },
      submitted: { label: 'مُرسلة', cls: 'status-submitted', tip: 'بإنتظار المراجعة' },
      pending: { label: 'قيد المراجعة', cls: 'status-submitted', tip: 'بإنتظار اعتماد السطور' },
      revision_requested: { label: 'طلب تعديل', cls: 'status-revision', tip: 'أُعيدت للتعديل' },
      requires_revision: { label: 'يحتاج تعديل', cls: 'status-revision', tip: 'تم رفض بعض السطور' },
      approved: { label: 'معتمدة', cls: 'status-approved', tip: 'تم الاعتماد' },
      rejected: { label: 'مرفوضة', cls: 'status-rejected', tip: 'تم الرفض' },
      cancelled: { label: 'ملغاة', cls: 'status-cancelled', tip: 'ملغاة' },
    }
    return map[st] || map['draft']
  }, [effectiveTransaction, txLines])

  // Use transaction lines from props (single source of truth) - ONLY if not yet fetched
  useEffect(() => {
    if (propsTransactionLines && !fetchedTransaction) {
      setTxLines(propsTransactionLines)
    }
  }, [propsTransactionLines, fetchedTransaction])

  // Persist panel states
  useEffect(() => {
    try {
      localStorage.setItem('transactionDetailsPanel:position', JSON.stringify(panelPosition));
    } catch { }
  }, [panelPosition])

  useEffect(() => {
    try {
      localStorage.setItem('transactionDetailsPanel:size', JSON.stringify(panelSize));
    } catch { }
  }, [panelSize])

  useEffect(() => {
    try {
      localStorage.setItem('transactionDetailsPanel:maximized', String(panelMax));
    } catch { }
  }, [panelMax])

  useEffect(() => {
    try {
      localStorage.setItem('transactionDetailsPanel:docked', String(panelDocked));
    } catch { }
  }, [panelDocked])

  useEffect(() => {
    try {
      localStorage.setItem('transactionDetailsPanel:dockPosition', panelDockPos);
    } catch { }
  }, [panelDockPos])

  // Field configuration handlers
  const handleBasicInfoFieldsChange = (newConfig: ColumnConfig[]) => {
    setBasicInfoFields(newConfig)
    saveFieldConfig('basicInfo', newConfig)
  }

  const handleLineItemsFieldsChange = (newConfig: ColumnConfig[]) => {
    setLineItemsFields(newConfig)
    saveFieldConfig('lineItems', newConfig)
  }

  const handleApprovalsFieldsChange = (newConfig: ColumnConfig[]) => {
    setApprovalsFields(newConfig)
    saveFieldConfig('approvals', newConfig)
  }

  const handleDocumentsFieldsChange = (newConfig: ColumnConfig[]) => {
    setDocumentsFields(newConfig)
    saveFieldConfig('documents', newConfig)
  }

  const handleAuditFieldsChange = (newConfig: ColumnConfig[]) => {
    setAuditFields(newConfig)
    saveFieldConfig('audit', newConfig)
  }

  // Action handlers
  const handleDelete = async () => {
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setIsLoading(true)
    try {
      const { deleteTransaction } = await import('../../services/transactions')
      await deleteTransaction(effectiveTransaction.id)
      setDeleteModalOpen(false)
      showToast('تم حذف المعاملة بنجاح', { severity: 'success' })
      onClose()
    } catch (err: any) {
      setError(err.message)
      showToast(err.message, { severity: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReviewSubmit = async () => {
    if (!reviewAction) return

    setIsLoading(true)
    try {
      if (reviewAction === 'approve' && onApprove) {
        await onApprove(effectiveTransaction.id, reviewReason || undefined)
      } else if (reviewAction === 'reject' && onReject) {
        if (!reviewReason.trim()) throw new Error('يرجى إدخال سبب الرفض')
        await onReject(effectiveTransaction.id, reviewReason)
      } else if (reviewAction === 'revise' && onRequestRevision) {
        if (!reviewReason.trim()) throw new Error('يرجى إدخال سبب الإرجاع للتعديل')
        await onRequestRevision(effectiveTransaction.id, reviewReason)
      }
      setReviewModalOpen(false)
      setReviewAction(null)
      setReviewReason('')
      showToast('تم تنفيذ الإجراء بنجاح', { severity: 'success' })
    } catch (err: any) {
      setError(err.message)
      showToast(err.message, { severity: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!onSubmitForReview) return

    setIsLoading(true)
    try {
      await onSubmitForReview(effectiveTransaction.id, submitNote)
      setSubmitModalOpen(false)
      setSubmitNote('')
      showToast('تم إرسال المعاملة للمراجعة', { severity: 'success' })
    } catch (err: any) {
      setError(err.message)
      showToast(err.message, { severity: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePost = async () => {
    if (!onPost) return

    setIsLoading(true)
    try {
      await onPost(effectiveTransaction.id)
      showToast('تم ترحيل المعاملة بنجاح', { severity: 'success' })
    } catch (err: any) {
      setError(err.message)
      showToast(err.message, { severity: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  // Determine available actions
  const availableActions = useMemo(() => {
    const actions = []
    const tx = effectiveTransaction
    const isPosted = tx.is_posted
    // Use unifiedStatus as the source of truth for approval
    const isApproved = unifiedStatus.cls === 'status-approved' || unifiedStatus.cls === 'status-posted'
    const isOwner = tx.created_by === currentUserId

    // Edit: Only if not posted AND not approved
    if (!isPosted && !isApproved && canEdit && (mode === 'my' ? isOwner : canManage)) {
      actions.push({
        key: 'edit',
        label: 'تعديل',
        className: 'ultimate-btn ultimate-btn-edit',
        onClick: () => {
          // Use TransactionWizard for edit if callback provided
          if (onEditWithWizard) {
            onEditWithWizard(tx)
          } else {
            // Fallback to legacy edit mode
            setViewMode('edit')
          }
        }
      })
    }

    // Delete: Only if not posted AND not approved
    if (!isPosted && !isApproved && canDelete && (mode === 'my' ? isOwner : canManage)) {
      actions.push({
        key: 'delete',
        label: 'حذف',
        className: 'ultimate-btn ultimate-btn-delete',
        onClick: handleDelete
      })
    }

    // Submit: Only if not posted AND not approved AND not already submitted (pending)
    // We check unifiedStatus.cls for 'status-submitted' to see if it's pending
    const isPending = unifiedStatus.cls === 'status-submitted'
    if (!isPosted && !isApproved && !isPending && onSubmitForReview) {
      if ((mode === 'my' && isOwner) || canManage) {
        actions.push({
          key: 'submit',
          label: 'إرسال للمراجعة',
          className: 'ultimate-btn ultimate-btn-success',
          onClick: () => setSubmitModalOpen(true)
        })
      }
    }

    // Approval Actions: Only if pending AND not approved
    if (mode === 'pending' && !isPosted && !isApproved && canReview && onApprove && onReject && onRequestRevision) {
      actions.push({
        key: 'approve',
        label: 'اعتماد',
        className: 'ultimate-btn ultimate-btn-success',
        onClick: () => {
          setReviewAction('approve')
          setReviewReason('')
          setReviewModalOpen(true)
        }
      })

      actions.push(
        {
          key: 'revise',
          label: 'إرجاع للتعديل',
          className: 'ultimate-btn ultimate-btn-edit',
          onClick: () => {
            setReviewAction('revise')
            setReviewReason('')
            setReviewModalOpen(true)
          }
        },
        {
          key: 'reject',
          label: 'رفض',
          className: 'ultimate-btn ultimate-btn-delete',
          onClick: () => {
            setReviewAction('reject')
            setReviewReason('')
            setReviewModalOpen(true)
          }
        }
      )
    }

    // Post: Only if approved AND not posted
    if (canPost && onPost && isApproved && !isPosted) {
      actions.push({
        key: 'post',
        label: 'ترحيل',
        className: 'ultimate-btn ultimate-btn-warning',
        onClick: handlePost
      })
    }

    return actions
  }, [effectiveTransaction, unifiedStatus, canEdit, canDelete, canReview, canPost, canManage, currentUserId, mode, onSubmitForReview, onApprove, onReject, onRequestRevision, onPost])

  // Define tabs
  const tabs = useMemo(() => [
    { id: 'basic', label: 'معلومات أساسية', icon: '📄' },
    { id: 'lines', label: 'القيود', icon: '📊', badge: txLines.length },
    { id: 'approvals', label: 'الموافقات', icon: '✅', badge: approvalHistory.length },
    { id: 'documents', label: 'المستندات', icon: '📎' },
    { id: 'audit', label: 'السجلات', icon: '📜', badge: audit.length },
    { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
  ], [txLines.length, approvalHistory.length, audit.length])

  return (
    <>
      <DraggableResizablePanel
        title={`تفاصيل المعاملة - ${effectiveTransaction.description || effectiveTransaction.entry_number}`}
        isOpen={true}
        onClose={onClose}
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
          setPanelPosition({ x: 150, y: 150 })
          setPanelSize({ width: 1000, height: 800 })
          setPanelMax(false)
          setPanelDocked(false)
        }}
      >
        <div className={`unified-transaction-details ${uiSettings.compactMode ? 'compact-mode' : ''} font-${uiSettings.fontSize || 'medium'} table-${uiSettings.tableRowHeight || 'normal'}`}>
          {error && (
            <div className="error-message" style={{
              padding: '12px',
              background: 'var(--error)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {viewMode === 'view' ? (
            <>
              {/* Header with actions */}
              <div className="details-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--background)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ margin: 0, color: 'var(--heading)' }}>
                    {effectiveTransaction.description || effectiveTransaction.entry_number}
                    {isRefreshing && <span style={{ fontSize: '12px', opacity: 0.6, marginRight: '8px' }}>(جاري التحديث...)</span>}
                  </h2>
                  <span className={`status-badge ${unifiedStatus.cls}`} title={unifiedStatus.tip}>
                    {unifiedStatus.label}
                  </span>
                </div>
                <div className="details-actions" style={{ display: 'flex', gap: '8px' }}>
                  {availableActions.map(action => (
                    <button
                      key={action.key}
                      className={action.className}
                      onClick={action.onClick}
                      disabled={isLoading}
                    >
                      <div className="btn-content">
                        <span className="btn-text">{action.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabs Container */}
              <TabsContainer
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                persistKey="transactionDetails"
              >
                {/* Tab 1: Basic Info */}
                {activeTab === 'basic' && (
                  <div className="tab-content">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', padding: '0 16px' }}>
                      <button
                        className="ultimate-btn ultimate-btn-edit"
                        onClick={() => setBasicInfoConfigOpen(true)}
                        title="تخصيص حقول المعلومات الأساسية"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <div className="btn-content"><span className="btn-text">⚙️ تخصيص الحقول</span></div>
                      </button>
                    </div>
                    <ExpandableSection
                      title="معلومات المعاملة"
                      icon="📄"
                      defaultExpanded={true}
                      persistKey="tx-basic-info"
                    >
                      <InfoGrid columns={layoutSettings.infoGridColumns || 2}>
                        {getVisibleFields(basicInfoFields).map(field => (
                          <InfoField
                            key={field.key}
                            label={field.label}
                            value={getFieldValue(field.key)}
                            fullWidth={field.key === 'description' || field.key === 'notes'}
                          />
                        ))}
                      </InfoGrid>
                    </ExpandableSection>
                  </div>
                )}

                {/* Tab 2: Line Items */}
                {activeTab === 'lines' && (
                  <div className="tab-content">
                    <ExpandableSection
                      title={`قيود المعاملة (${txLines.length})`}
                      icon="📊"
                      badge={txLines.length}
                      defaultExpanded={true}
                      persistKey="tx-lines-cards"
                    >
                      {txLines.length > 0 ? (
                        <div className="lines-cards-container">
                          {txLines.map((line: any, idx: number) => (
                            <TransactionLineCard
                              key={line.id || idx}
                              line={line}
                              lineIndex={idx}
                              accounts={accounts}
                              projects={projects}
                              costCenters={costCenters}
                              workItems={workItems}
                              classifications={classifications as unknown as Array<{ id: string; code: string | number; name: string }>}
                              categories={categories}
                              analysisItemsMap={analysisItemsMap}
                              orgId={transaction.org_id || ''}
                              projectId={transaction.project_id || undefined}
                            />
                          ))}

                          {/* Totals Summary */}
                          <div className="lines-totals-summary">
                            <div className="totals-row">
                              <span className="totals-label">إجمالي المدين:</span>
                              <span className="totals-value debit">{totalDebits.toLocaleString('ar-EG')}</span>
                            </div>
                            <div className="totals-row">
                              <span className="totals-label">إجمالي الدائن:</span>
                              <span className="totals-value credit">{totalCredits.toLocaleString('ar-EG')}</span>
                            </div>
                            <div className="totals-row balance">
                              {isBalanced ? (
                                <span className="balance-status balanced">✅ متوازن</span>
                              ) : (
                                <span className="balance-status unbalanced">
                                  ❌ غير متوازن (الفرق: {Math.abs(totalDebits - totalCredits).toLocaleString('ar-EG')})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted_text)' }}>
                          لا توجد قيود تفصيلية
                        </div>
                      )}
                    </ExpandableSection>
                  </div>
                )}

                {/* Tab 3: Approvals */}
                {activeTab === 'approvals' && (
                  <div className="tab-content">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', padding: '0 16px' }}>
                      <button
                        className="ultimate-btn ultimate-btn-edit"
                        onClick={() => setApprovalsConfigOpen(true)}
                        title="تخصيص حقول الموافقات"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <div className="btn-content"><span className="btn-text">⚙️ تخصيص الحقول</span></div>
                      </button>
                    </div>
                    <ExpandableSection
                      title="حالة الموافقة الحالية"
                      icon="✅"
                      defaultExpanded={true}
                      persistKey="tx-approval-status"
                    >
                      <InfoGrid columns={layoutSettings.infoGridColumns || 2}>
                        <InfoField
                          label="الحالة"
                          value={
                            <span className={`status-badge ${unifiedStatus.cls}`}>
                              {unifiedStatus.label}
                            </span>
                          }
                        />
                        {transaction.is_posted && (
                          <>
                            <InfoField
                              label="مرحلة بواسطة"
                              value={userNames[transaction.posted_by || ''] || '—'}
                            />
                            <InfoField
                              label="تاريخ الترحيل"
                              value={transaction.posted_at ? formatDateTime(transaction.posted_at) : '—'}
                            />
                          </>
                        )}
                      </InfoGrid>
                    </ExpandableSection>

                    {approvalHistory.length > 0 && (
                      <ExpandableSection
                        title={`سجل الموافقات (${approvalHistory.length} إجراءات)`}
                        icon="📋"
                        badge={approvalHistory.length}
                        defaultExpanded={true}
                        persistKey="tx-approval-history"
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {approvalHistory.map((row, idx) => (
                            <div key={row.id} style={{
                              padding: '12px',
                              background: 'var(--field_bg)',
                              borderRadius: 'var(--radius-md)',
                              borderLeft: '4px solid var(--accent)'
                            }}>
                              <InfoGrid columns={layoutSettings.infoGridColumns || 2}>
                                {getVisibleFields(approvalsFields).map(field => (
                                  <InfoField
                                    key={field.key}
                                    label={field.label}
                                    value={getApprovalValue(row, field.key, idx)}
                                  />
                                ))}
                              </InfoGrid>
                            </div>
                          ))}
                        </div>
                      </ExpandableSection>
                    )}
                  </div>
                )}

                {/* Tab 4: Documents */}
                {activeTab === 'documents' && (
                  <div className="tab-content">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', padding: '0 16px' }}>
                      <button
                        className="ultimate-btn ultimate-btn-edit"
                        onClick={() => setDocumentsConfigOpen(true)}
                        title="تخصيص حقول المستندات"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <div className="btn-content"><span className="btn-text">⚙️ تخصيص الحقول</span></div>
                      </button>
                    </div>
                    <ExpandableSection
                      title="المستندات المرفقة"
                      icon="📎"
                      defaultExpanded={true}
                      persistKey="tx-documents"
                    >
                      <AttachDocumentsPanel
                        orgId={transaction.org_id || ''}
                        transactionId={transaction.id}
                        projectId={transaction.project_id || undefined}
                      />
                    </ExpandableSection>
                  </div>
                )}

                {/* Tab 5: Audit Trail */}
                {activeTab === 'audit' && (
                  <div className="tab-content">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', padding: '0 16px' }}>
                      <button
                        className="ultimate-btn ultimate-btn-edit"
                        onClick={() => setAuditConfigOpen(true)}
                        title="تخصيص حقول السجلات"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <div className="btn-content"><span className="btn-text">⚙️ تخصيص الحقول</span></div>
                      </button>
                    </div>
                    <ExpandableSection
                      title={`سجل الإجراءات (${audit.length} إجراءات)`}
                      icon="📜"
                      badge={audit.length}
                      defaultExpanded={true}
                      persistKey="tx-audit"
                    >
                      {audit.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {audit.map((row) => (
                            <div key={row.id} style={{
                              padding: '12px',
                              background: 'var(--field_bg)',
                              borderRadius: 'var(--radius-md)',
                              borderLeft: '4px solid var(--border)'
                            }}>
                              <InfoGrid columns={layoutSettings.infoGridColumns || 2}>
                                {getVisibleFields(auditFields).map(field => (
                                  <InfoField
                                    key={field.key}
                                    label={field.label}
                                    value={getAuditValue(row, field.key)}
                                  />
                                ))}
                              </InfoGrid>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted_text)' }}>
                          لا توجد إجراءات مسجلة
                        </div>
                      )}
                    </ExpandableSection>
                  </div>
                )}

                {/* Tab 6: Settings */}
                {activeTab === 'settings' && (
                  <div className="tab-content">
                    <TransactionSettingsPanel
                      onSettingsChange={(settings) => {
                        // Settings are automatically persisted to localStorage
                        console.log('Settings updated:', settings)
                      }}
                      onSave={async () => {
                        // Optional: Save settings to server if needed
                        showToast('تم حفظ الإعدادات بنجاح', { severity: 'success' })
                      }}
                      onReset={() => {
                        showToast('تم إعادة تعيين الإعدادات', { severity: 'info' })
                      }}
                    />
                  </div>
                )}
              </TabsContainer>
            </>
          ) : (
            // Edit mode
            <div className="details-edit-mode">
              <div style={{ marginBottom: '16px' }}>
                <MultiLineEditor
                  transactionId={transaction.id}
                  accounts={accounts}
                  orgId={transaction.org_id || ''}
                  disabled={isLoading}
                  onSaved={() => {
                    setViewMode('view')
                    showToast('تم حفظ التعديلات بنجاح', { severity: 'success' })
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </DraggableResizablePanel>

      {/* Delete Confirm Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay" onClick={() => !isLoading && setDeleteModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">تأكيد حذف المعاملة</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => !isLoading && setDeleteModalOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 12 }}>
                سيتم حذف المعاملة رقم <strong>{transaction.entry_number}</strong> وجميع القيود التفصيلية المرتبطة بها نهائياً.
              </div>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button className="ultimate-btn ultimate-btn-success" onClick={handleDeleteConfirm} disabled={isLoading}>
                  <div className="btn-content"><span className="btn-text">تأكيد الحذف</span></div>
                </button>
                <button className="ultimate-btn ultimate-btn-warning" onClick={() => !isLoading && setDeleteModalOpen(false)} disabled={isLoading}>
                  <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="modal-overlay" onClick={() => !isLoading && setReviewModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {reviewAction === 'approve' ? 'اعتماد المعاملة' :
                  reviewAction === 'revise' ? 'إرجاع للتعديل' : 'رفض المعاملة'}
              </h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => !isLoading && setReviewModalOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <div className="modal-body">
              <label className="modal-label">سبب الإجراء</label>
              <textarea
                className="textarea-field"
                placeholder={reviewAction === 'approve' ? 'ملاحظات (اختياري)' : 'السبب (إلزامي)'}
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--field_bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div className="modal-actions">
                <button
                  className="ultimate-btn ultimate-btn-success"
                  onClick={handleReviewSubmit}
                  disabled={isLoading}
                >
                  <div className="btn-content"><span className="btn-text">تأكيد</span></div>
                </button>
                <button
                  className="ultimate-btn ultimate-btn-warning"
                  onClick={() => !isLoading && setReviewModalOpen(false)}
                  disabled={isLoading}
                >
                  <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {submitModalOpen && (
        <div className="modal-overlay" onClick={() => !isLoading && setSubmitModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">إرسال للمراجعة</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => !isLoading && setSubmitModalOpen(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <div className="modal-body">
              <label className="modal-label">ملاحظات الإرسال (اختياري)</label>
              <textarea
                className="textarea-field"
                placeholder="أدخل سبب/ملاحظات الإرسال"
                value={submitNote}
                onChange={e => setSubmitNote(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--field_bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <div className="modal-actions">
                <button
                  className="ultimate-btn ultimate-btn-success"
                  onClick={handleSubmitForReview}
                  disabled={isLoading}
                >
                  <div className="btn-content"><span className="btn-text">تأكيد الإرسال</span></div>
                </button>
                <button
                  className="ultimate-btn ultimate-btn-warning"
                  onClick={() => !isLoading && setSubmitModalOpen(false)}
                  disabled={isLoading}
                >
                  <div className="btn-content"><span className="btn-text">إلغاء</span></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field Configuration Modals */}
      <ColumnConfiguration
        columns={basicInfoFields}
        onConfigChange={handleBasicInfoFieldsChange}
        isOpen={basicInfoConfigOpen}
        onClose={() => setBasicInfoConfigOpen(false)}
        onReset={() => {
          const defaults = getDefaultFieldConfig('basicInfo')
          handleBasicInfoFieldsChange(defaults)
        }}
        sampleData={[]} // No sample data needed for field configuration
      />

      <ColumnConfiguration
        columns={lineItemsFields}
        onConfigChange={handleLineItemsFieldsChange}
        isOpen={lineItemsConfigOpen}
        onClose={() => setLineItemsConfigOpen(false)}
        onReset={() => {
          const defaults = getDefaultFieldConfig('lineItems')
          handleLineItemsFieldsChange(defaults)
        }}
        sampleData={[]} // No sample data needed for field configuration
      />

      <ColumnConfiguration
        columns={approvalsFields}
        onConfigChange={handleApprovalsFieldsChange}
        isOpen={approvalsConfigOpen}
        onClose={() => setApprovalsConfigOpen(false)}
        onReset={() => {
          const defaults = getDefaultFieldConfig('approvals')
          handleApprovalsFieldsChange(defaults)
        }}
        sampleData={[]} // No sample data needed for field configuration
      />

      <ColumnConfiguration
        columns={documentsFields}
        onConfigChange={handleDocumentsFieldsChange}
        isOpen={documentsConfigOpen}
        onClose={() => setDocumentsConfigOpen(false)}
        onReset={() => {
          const defaults = getDefaultFieldConfig('documents')
          handleDocumentsFieldsChange(defaults)
        }}
        sampleData={[]} // No sample data needed for field configuration
      />

      <ColumnConfiguration
        columns={auditFields}
        onConfigChange={handleAuditFieldsChange}
        isOpen={auditConfigOpen}
        onClose={() => setAuditConfigOpen(false)}
        onReset={() => {
          const defaults = getDefaultFieldConfig('audit')
          handleAuditFieldsChange(defaults)
        }}
        sampleData={[]} // No sample data needed for field configuration
      />


    </>
  )
}

export default UnifiedTransactionDetailsPanel
