import React, { useState, useEffect, useMemo, useRef } from 'react'
import DraggableResizablePanel from '../Common/DraggableResizablePanel'
import UnifiedCRUDForm, { type UnifiedCRUDFormHandle } from '../Common/UnifiedCRUDForm'
import { createTransactionFormConfig } from './TransactionFormConfig'
import TransactionDetailsLayoutControls, { DEFAULT_DETAIL_SECTIONS, type TransactionDetailsConfig } from './TransactionDetailsLayoutControls'
import type { TransactionRecord, TransactionAudit, Account, Project } from '../../services/transactions'
import type { ApprovalHistoryRow } from '../../services/approvals'
import type { Organization } from '../../types'
import type { TransactionClassification } from '../../services/transaction-classification'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import type { WorkItemRow } from '../../types/work-items'
import './UnifiedTransactionDetailsPanel.css'

export interface UnifiedTransactionDetailsPanelProps {
  transaction: TransactionRecord
  audit: TransactionAudit[]
  approvalHistory: ApprovalHistoryRow[]
  userNames: Record<string, string>
  categoryLabel?: string
  
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
  categoryLabel,
  accounts,
  projects,
  organizations,
  classifications,
  categories,
  workItems,
  costCenters,
  analysisItemsMap,
  onClose,
  onUpdate,
  onDelete,
  onSubmitForReview,
  onApprove,
  onReject,
  onRequestRevision,
  onPost,
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
  const [error, setError] = useState<string | null>(null)
  
  // Panel state
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>({ x: 150, y: 150 })
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({ width: 900, height: 800 })
  const [panelMax, setPanelMax] = useState<boolean>(false)
  const [panelDocked, setPanelDocked] = useState<boolean>(false)
  const [panelDockPos, setPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>('right')
  
  // Action modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'revise' | null>(null)
  const [reviewReason, setReviewReason] = useState('')
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  
  // Config modal state
  const [configModalOpen, setConfigModalOpen] = useState(false)
  
  // Comprehensive transaction details configuration
  const [detailsConfig, setDetailsConfig] = useState<TransactionDetailsConfig>(() => {
    try {
      const saved = localStorage.getItem('transactionDetailsLayoutConfig');
      const parsed = saved ? JSON.parse(saved) : null;
      
      return {
        visibleSections: new Set(parsed?.visibleSections || DEFAULT_DETAIL_SECTIONS.map(s => s.id)),
        sectionOrder: parsed?.sectionOrder || DEFAULT_DETAIL_SECTIONS.map(s => s.id),
        fullWidthSections: new Set(parsed?.fullWidthSections || []),
        columnsPerSection: parsed?.columnsPerSection || 2
      };
    } catch {
      return {
        visibleSections: new Set(DEFAULT_DETAIL_SECTIONS.map(s => s.id)),
        sectionOrder: DEFAULT_DETAIL_SECTIONS.map(s => s.id),
        fullWidthSections: new Set([]),
        columnsPerSection: 2
      };
    }
  })
  
  const formRef = useRef<UnifiedCRUDFormHandle>(null)
  
  // Configuration change handlers
  const handleSectionOrderChange = (newOrder: string[]) => {
    setDetailsConfig(prev => ({ ...prev, sectionOrder: newOrder }))
  }

  const handleColumnCountChange = (count: 1 | 2 | 3) => {
    setDetailsConfig(prev => ({ ...prev, columnsPerSection: count }))
  }

  const handleFullWidthToggle = (sectionId: string) => {
    setDetailsConfig(prev => {
      const newFullWidthSections = new Set(prev.fullWidthSections)
      if (newFullWidthSections.has(sectionId)) {
        newFullWidthSections.delete(sectionId)
      } else {
        newFullWidthSections.add(sectionId)
      }
      return { ...prev, fullWidthSections: newFullWidthSections }
    })
  }

  const handleVisibilityToggle = (sectionId: string) => {
    setDetailsConfig(prev => {
      const newVisibleSections = new Set(prev.visibleSections)
      if (newVisibleSections.has(sectionId)) {
        newVisibleSections.delete(sectionId)
      } else {
        newVisibleSections.add(sectionId)
      }
      return { ...prev, visibleSections: newVisibleSections }
    })
  }
  
  const handleSaveLayout = () => {
    // Configuration is already auto-saved via useEffect, just close modal
    setConfigModalOpen(false)
    // Note: Would need toast context to show success message
  }
  
  const handleResetLayout = () => {
    const defaultConfig: TransactionDetailsConfig = {
      visibleSections: new Set(DEFAULT_DETAIL_SECTIONS.map(s => s.id)),
      sectionOrder: DEFAULT_DETAIL_SECTIONS.map(s => s.id),
      fullWidthSections: new Set([]),
      columnsPerSection: 2
    }
    setDetailsConfig(defaultConfig)
  }
  
  const handleRememberLayout = () => {
    // This creates a persistent layout preference that survives browser sessions
    try {
      const layoutPreference = {
        ...detailsConfig,
        visibleSections: Array.from(detailsConfig.visibleSections),
        fullWidthSections: Array.from(detailsConfig.fullWidthSections),
        rememberTimestamp: Date.now(),
        rememberAsPreferred: true // Flag to indicate this is a user's preferred layout
      };
      localStorage.setItem('transactionDetailsPreferredLayout', JSON.stringify(layoutPreference));
      localStorage.setItem('transactionDetailsLayoutConfig', JSON.stringify(layoutPreference));
      
      // Could show success toast here if toast context is available
      // toast.success('تم حفظ التخطيط المفضل بنجاح');
    } catch (error) {
      console.error('Failed to remember layout:', error);
    }
  }
  
  // Helper function to check if a section should be visible
  const isSectionVisible = (sectionId: string): boolean => {
    return detailsConfig.visibleSections.has(sectionId)
  }
  
  // Legacy compatibility helpers (map new config to old column config properties)
  const columnConfig = useMemo(() => ({
    showSystemInfo: isSectionVisible('system_info') || isSectionVisible('posting_info'),
    showAuditTrail: isSectionVisible('audit_trail'),
    showApprovalHistory: isSectionVisible('approval_history'),
    showSubmitNotes: isSectionVisible('submit_notes'),
    compactMode: false, // Not used in new config
    fieldLayout: 'grid' as const, // Default
    showFieldLabels: true,
    groupFields: true
  }), [detailsConfig])
  
  // Persist details configuration
  useEffect(() => {
    try {
      const configToSave = {
        ...detailsConfig,
        visibleSections: Array.from(detailsConfig.visibleSections), // Convert Set to Array for JSON
        fullWidthSections: Array.from(detailsConfig.fullWidthSections) // Convert Set to Array for JSON
      };
      localStorage.setItem('transactionDetailsLayoutConfig', JSON.stringify(configToSave));
    } catch {}
  }, [detailsConfig])

  // Get account label helper
  const getAccountLabel = (accountId?: string | null) => {
    if (!accountId) return '—'
    const account = accounts.find(a => a.id === accountId)
    return account ? `${account.code} - ${account.name}` : accountId
  }

  // Get work item label helper
  const getWorkItemLabel = (workItemId?: string | null) => {
    if (!workItemId) return '—'
    const workItem = workItems.find(w => w.id === workItemId)
    return workItem ? `${workItem.code} - ${workItem.name}` : workItemId
  }

  // Get analysis work item label helper
  const getAnalysisWorkItemLabel = (analysisWorkItemId?: string | null) => {
    if (!analysisWorkItemId) return '—'
    const item = analysisItemsMap[analysisWorkItemId]
    return item ? `${item.code} - ${item.name}` : analysisWorkItemId
  }

  // Get cost center label helper
  const getCostCenterLabel = (costCenterId?: string | null) => {
    if (!costCenterId) return '—'
    const costCenter = costCenters.find(cc => cc.id === costCenterId)
    return costCenter ? `${costCenter.code} - ${costCenter.name}` : costCenterId
  }

  // Extract latest submit note from audit details
  const auditSubmitNote = useMemo(() => {
    for (const row of audit) {
      try {
        const d: any = row.details
        if (d && typeof d === 'object' && d.note) {
          return String(d.note)
        }
      } catch {}
    }
    return ''
  }, [audit])

  // Unified approval status (includes posted)
  const unifiedStatus = useMemo(() => {
    const st = transaction.is_posted ? 'posted' : String((transaction as any).approval_status || 'draft')
    const map: Record<string, { label: string; cls: string; tip: string }> = {
      draft: { label: 'مسودة', cls: 'status-draft', tip: 'لم يتم إرسالها للمراجعة بعد' },
      submitted: { label: 'مُرسلة', cls: 'status-submitted', tip: 'بإنتظار المراجعة' },
      revision_requested: { label: 'طلب تعديل', cls: 'status-revision', tip: 'أُعيدت للتعديل — أعد الإرسال بعد التصحيح' },
      approved: { label: 'معتمدة', cls: 'status-approved', tip: 'تم الاعتماد' },
      rejected: { label: 'مرفوضة', cls: 'status-rejected', tip: 'تم الرفض' },
      cancelled: { label: 'ملغاة', cls: 'status-cancelled', tip: 'ألغى المُرسل الإرسال' },
      posted: { label: 'مرحلة', cls: 'status-posted', tip: 'تم الترحيل (مُثبت في الدفاتر)' },
    }
    return map[st] || map['draft']
  }, [transaction])

  // Form configuration
  const transactionFormConfig = useMemo(() => {
    return createTransactionFormConfig(
      true, // isEdit
      accounts,
      projects,
      organizations,
      classifications,
      transaction,
      categories,
      workItems,
      costCenters
    )
  }, [accounts, projects, organizations, classifications, transaction, categories, workItems, costCenters])

  // Initial form data for editing
  const initialFormData = useMemo(() => ({
    entry_number: transaction.entry_number,
    entry_date: transaction.entry_date,
    description: transaction.description,
    debit_account_id: transaction.debit_account_id,
    credit_account_id: transaction.credit_account_id,
    amount: transaction.amount,
    reference_number: transaction.reference_number || '',
    notes: transaction.notes || '',
    classification_id: transaction.classification_id || '',
    expenses_category_id: (transaction as any).expenses_category_id || '',
    work_item_id: (transaction as any).work_item_id || '',
    analysis_work_item_id: (transaction as any).analysis_work_item_id || '',
    cost_center_id: transaction.cost_center_id || '',
    organization_id: transaction.org_id || '',
    project_id: transaction.project_id || ''
  }), [transaction])

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    if (!onUpdate) return
    
    setIsLoading(true)
    setError(null)
    try {
      const updateData = {
        entry_date: data.entry_date,
        description: data.description,
        reference_number: data.reference_number || null,
        debit_account_id: data.debit_account_id,
        credit_account_id: data.credit_account_id,
        amount: parseFloat(data.amount),
        notes: data.notes || null,
        classification_id: data.classification_id || null,
        expenses_category_id: data.expenses_category_id || null,
        work_item_id: data.work_item_id || null,
        analysis_work_item_id: data.analysis_work_item_id || null,
        cost_center_id: data.cost_center_id || null,
        org_id: data.organization_id || null,
        project_id: data.project_id || null,
      }
      
      const updatedTransaction = { ...transaction, ...updateData }
      await onUpdate(updatedTransaction)
      setViewMode('view')
    } catch (err: any) {
      setError(err.message || 'فشل في تحديث المعاملة')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormCancel = () => {
    setViewMode('view')
    setError(null)
  }

  // Handle review actions
  const handleReviewSubmit = async () => {
    if (!reviewAction) return
    
    setIsLoading(true)
    try {
      if (reviewAction === 'approve' && onApprove) {
        await onApprove(transaction.id, reviewReason || undefined)
      } else if (reviewAction === 'reject' && onReject) {
        if (!reviewReason.trim()) throw new Error('يرجى إدخال سبب الرفض')
        await onReject(transaction.id, reviewReason)
      } else if (reviewAction === 'revise' && onRequestRevision) {
        if (!reviewReason.trim()) throw new Error('يرجى إدخال سبب الإرجاع للتعديل')
        await onRequestRevision(transaction.id, reviewReason)
      }
      setReviewModalOpen(false)
      setReviewAction(null)
      setReviewReason('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle submit for review
  const handleSubmitForReview = async () => {
    if (!onSubmitForReview) return
    
    setIsLoading(true)
    try {
      await onSubmitForReview(transaction.id, submitNote)
      setSubmitModalOpen(false)
      setSubmitNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!onDelete) return
    
    const confirmed = window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')
    if (!confirmed) return
    
    setIsLoading(true)
    try {
      await onDelete(transaction.id)
      onClose() // Close panel after successful delete
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle post transaction
  const handlePost = async () => {
    if (!onPost) return
    
    setIsLoading(true)
    try {
      await onPost(transaction.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Determine which actions are available
  const availableActions = useMemo(() => {
    const actions = []
    const isPosted = transaction.is_posted
    const approvalStatus = (transaction as any).approval_status || 'draft'
    const isOwner = transaction.created_by === currentUserId
    
    // Edit action
    if (!isPosted && canEdit && (mode === 'my' ? isOwner : canManage)) {
      actions.push({
        key: 'edit',
        label: 'تعديل',
        className: 'ultimate-btn ultimate-btn-edit',
        onClick: () => setViewMode('edit')
      })
    }
    
    // Delete action
    if (!isPosted && canDelete && (mode === 'my' ? isOwner : canManage)) {
      actions.push({
        key: 'delete',
        label: 'حذف',
        className: 'ultimate-btn ultimate-btn-delete',
        onClick: handleDelete
      })
    }
    
    // Submit for review
    if (!isPosted && onSubmitForReview && !['submitted', 'approved', 'rejected'].includes(approvalStatus)) {
      if ((mode === 'my' && isOwner) || canManage) {
        actions.push({
          key: 'submit',
          label: 'إرسال للمراجعة',
          className: 'ultimate-btn ultimate-btn-success',
          onClick: () => setSubmitModalOpen(true)
        })
      }
    }
    
    // Review actions (for pending mode)
    if (mode === 'pending' && !isPosted && canReview && onApprove && onReject && onRequestRevision) {
      if (approvalStatus !== 'approved') {
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
      }
      
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
    
    // Post action
    if (canPost && onPost && approvalStatus === 'approved' && !isPosted) {
      actions.push({
        key: 'post',
        label: 'ترحيل',
        className: 'ultimate-btn ultimate-btn-warning',
        onClick: handlePost
      })
    }
    
    return actions
  }, [transaction, canEdit, canDelete, canReview, canPost, canManage, currentUserId, mode, onSubmitForReview, onApprove, onReject, onRequestRevision, onPost])

  return (
    <>
      <DraggableResizablePanel
        title={`تفاصيل المعاملة - ${transaction.entry_number}`}
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
          setPanelSize({ width: 900, height: 800 })
          setPanelMax(false)
          setPanelDocked(false)
        }}
      >
        <div className="unified-transaction-details">
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          {viewMode === 'view' ? (
            <>
              {/* Header with actions */}
              <div className="details-header">
                <div className="details-actions">
                  {/* Configuration Layout Controls */}
                  <TransactionDetailsLayoutControls
                    sections={DEFAULT_DETAIL_SECTIONS}
                    sectionOrder={detailsConfig.sectionOrder}
                    columnCount={detailsConfig.columnsPerSection}
                    onColumnCountChange={handleColumnCountChange}
                    onSectionOrderChange={handleSectionOrderChange}
                    fullWidthSections={detailsConfig.fullWidthSections}
                    onFullWidthToggle={handleFullWidthToggle}
                    visibleSections={detailsConfig.visibleSections}
                    onVisibilityToggle={handleVisibilityToggle}
                    onResetLayout={handleResetLayout}
                    onSaveLayout={handleSaveLayout}
                    onRememberLayout={handleRememberLayout}
                    isOpen={configModalOpen}
                    onToggle={() => setConfigModalOpen(!configModalOpen)}
                    showToggleButton={false} // Hide default button, we'll add our own
                  />
                  
                  {/* Config button */}
                  <button
                    className="ultimate-btn ultimate-btn-secondary"
                    onClick={() => setConfigModalOpen(!configModalOpen)}
                    disabled={isLoading}
                    title="إعدادات عرض التفاصيل"
                    style={{
                      background: configModalOpen ? 'var(--accent-primary)' : 'var(--surface)',
                      color: configModalOpen ? 'var(--button-text)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div className="btn-content">
                      <span className="btn-text">⚙️ الإعدادات</span>
                    </div>
                  </button>
                  
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

              {/* Main Details Grid Container - all sections rendered dynamically */}
              <div 
                className="details-grid-container" 
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${detailsConfig.columnsPerSection}, 1fr)`,
                  gap: 'var(--spacing-lg)',
                  padding: 'var(--spacing-lg)'
                }}
              >
                {(() => {
                  // Create comprehensive section data mapping
                  const allSectionsData = {
                    basic_info: {
                      title: 'المعلومات الأساسية',
                      fields: [
                        { id: 'entry_number', label: 'رقم القيد', value: transaction.entry_number },
                        { id: 'entry_date', label: 'التاريخ', value: new Date(transaction.entry_date).toLocaleDateString('ar-EG') },
                        { id: 'description', label: 'البيان', value: transaction.description },
                      ]
                    },
                    amount_info: {
                      title: 'المبلغ والمرجع',
                      fields: [
                        { id: 'amount', label: 'المبلغ', value: `${transaction.amount.toLocaleString('ar-EG')} ج.م`, className: 'amount-value' },
                        { id: 'reference_number', label: 'المرجع', value: transaction.reference_number || '—' },
                      ]
                    },
                    accounts_info: {
                      title: 'الحسابات',
                      fields: [
                        { id: 'debit_account', label: 'الحساب المدين', value: getAccountLabel(transaction.debit_account_id) },
                        { id: 'credit_account', label: 'الحساب الدائن', value: getAccountLabel(transaction.credit_account_id) },
                      ]
                    },
                    approval_status: {
                      title: 'حالة الاعتماد',
                      fields: [
                        { 
                          id: 'approval_status', 
                          label: 'حالة الاعتماد', 
                          value: (
                            <span className={`status-badge ${unifiedStatus.cls}`} title={unifiedStatus.tip}>
                              {unifiedStatus.label}
                            </span>
                          )
                        },
                      ]
                    },
                    classification_info: {
                      title: 'التصنيف والفئة',
                      fields: [
                        { id: 'classification', label: 'التصنيف', value: (transaction as any).transaction_classification?.name || '—' },
                        { id: 'category', label: 'فئة المصروف', value: categoryLabel || '—' },
                      ]
                    },
                    work_items: {
                      title: 'عناصر العمل',
                      fields: [
                        { id: 'work_item', label: 'عنصر العمل', value: getWorkItemLabel((transaction as any).work_item_id) },
                        { id: 'analysis_work_item', label: 'بند التحليل', value: getAnalysisWorkItemLabel((transaction as any).analysis_work_item_id) },
                      ]
                    },
                    org_project: {
                      title: 'المؤسسة والمشروع',
                      fields: [
                        { id: 'organization', label: 'المؤسسة', value: organizations.find(o => o.id === transaction.org_id)?.name || '—' },
                        { id: 'project', label: 'المشروع', value: projects.find(p => p.id === transaction.project_id)?.name || '—' },
                        { id: 'cost_center', label: 'مركز التكلفة', value: getCostCenterLabel(transaction.cost_center_id) },
                      ]
                    },
                    notes_field: {
                      title: 'الملاحظات',
                      fields: transaction.notes ? [
                        { id: 'notes', label: 'الملاحظات', value: transaction.notes, className: 'notes-value' },
                      ] : []
                    },
                    system_info: {
                      title: 'معلومات النظام',
                      fields: [
                        { id: 'created_by', label: 'أنشئت بواسطة', value: transaction.created_by ? (userNames[transaction.created_by] || transaction.created_by) : '—' },
                        { id: 'created_at', label: 'تاريخ الإنشاء', value: new Date(transaction.created_at).toLocaleString('ar-EG') },
                      ]
                    },
                    posting_info: {
                      title: 'معلومات الترحيل',
                      fields: transaction.posted_by ? [
                        { id: 'posted_by', label: 'مرحلة بواسطة', value: userNames[transaction.posted_by] || transaction.posted_by },
                        { id: 'posted_at', label: 'تاريخ الترحيل', value: transaction.posted_at ? new Date(transaction.posted_at).toLocaleString('ar-EG') : '—' },
                      ] : []
                    },
                    submit_notes: {
                      title: 'ملاحظات الإرسال',
                      fields: auditSubmitNote ? [
                        { id: 'submit_note', label: 'ملاحظات الإرسال', value: auditSubmitNote, className: 'submit-note-display' },
                      ] : []
                    },
                    audit_trail: {
                      title: 'سجل الإجراءات',
                      fields: audit.length > 0 ? [
                        { 
                          id: 'audit_list', 
                          label: '', 
                          value: (
                            <div className="audit-list">
                              {audit.map(row => (
                                <div key={row.id} className="audit-item">
                                  <div className="audit-header">
                                    <span className="audit-action">{row.action}</span>
                                    <span className="audit-date">{new Date(row.created_at).toLocaleString('ar-EG')}</span>
                                  </div>
                                  <div className="audit-user">
                                    {row.actor_id ? (userNames[row.actor_id] || row.actor_id.substring(0, 8)) : '—'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) 
                        },
                      ] : []
                    },
                    approval_history: {
                      title: 'سجل الموافقات',
                      fields: (approvalHistory && approvalHistory.length > 0) ? [
                        { 
                          id: 'approval_list', 
                          label: '', 
                          value: (
                            <div className="approval-list">
                              {approvalHistory.map((r) => (
                                <div key={r.id} className="approval-item">
                                  <div className="approval-header">
                                    <span className="approval-step">الخطوة #{r.step_order}</span>
                                    <span className="approval-action">
                                      {r.action === 'approve' ? 'اعتماد' : 
                                       r.action === 'request_changes' ? 'إرجاع للتعديل' : 
                                       r.action === 'reject' ? 'رفض' : 'ملاحظة'}
                                    </span>
                                    <span className="approval-date">{new Date(r.created_at).toLocaleString('ar-EG')}</span>
                                  </div>
                                  <div className="approval-user">
                                    {userNames[r.actor_user_id] || r.actor_user_id.substring(0, 8)}
                                  </div>
                                  {r.reason && (
                                    <div className="approval-reason">
                                      السبب: {r.reason}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) 
                        },
                      ] : []
                    }
                  };

                  // Filter and order ALL sections based on configuration
                  return detailsConfig.sectionOrder
                    .filter(sectionId => 
                      isSectionVisible(sectionId) && 
                      allSectionsData[sectionId] && 
                      allSectionsData[sectionId].fields.length > 0
                    )
                    .map(sectionId => {
                      const section = allSectionsData[sectionId];
                      const isFullWidth = detailsConfig.fullWidthSections.has(sectionId);
                      
                      return (
                        <div 
                          key={sectionId} 
                          className={`details-section ${isFullWidth ? 'section-full-width' : ''}`}
                          style={{
                            gridColumn: isFullWidth ? '1 / -1' : 'auto'
                          }}
                        >
                          <h3 className="section-title">{section.title}</h3>
                          <div 
                            className="info-grid" 
                            style={{
                              gridTemplateColumns: isFullWidth 
                                ? `repeat(${detailsConfig.columnsPerSection}, 1fr)` 
                                : 'repeat(auto-fit, minmax(200px, 1fr))'
                            }}
                          >
                            {section.fields.map(field => (
                              <div key={field.id} className={`info-item ${field.label === '' ? 'info-item--full' : ''}`}>
                                {field.label && <label className="info-label">{field.label}</label>}
                                <div className={`info-value ${field.className || ''}`}>
                                  {field.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </>
          ) : (
            // Edit mode
            <div className="details-edit-mode">
              <UnifiedCRUDForm
                ref={formRef}
                config={transactionFormConfig}
                initialData={initialFormData}
                resetOnInitialDataChange={false}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </DraggableResizablePanel>

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
      
    </>
  )
}

export default UnifiedTransactionDetailsPanel