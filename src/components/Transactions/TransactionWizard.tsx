import React, { useState, useMemo, useEffect, useCallback } from 'react'
import DraggablePanelContainer from '../Common/DraggablePanelContainer'
import type { Account, Project } from '../../services/transactions'
import type { Organization } from '../../types'
import type { TransactionClassification } from '../../services/transaction-classification'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import type { WorkItemRow } from '../../types/work-items'
// Data now comes from TransactionsDataContext via props - no independent fetching
import { useScope } from '../../contexts/ScopeContext'
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  IconButton,
  Box,
  Typography,
  Paper,
  Chip,
  Alert,
  StepButton,
  Dialog
} from '@mui/material'
import Grid from '@mui/material/Unstable_Grid2'
import {
  NavigateNext,
  NavigateBefore,
  Save,
  AttachFile,
  DeleteOutline,
  CheckCircle,
  Edit,
  ExpandLess,
  Settings,
  Send
} from '@mui/icons-material'
import './TransactionWizard.css'
import AttachDocumentsPanel from '../documents/AttachDocumentsPanel'
import SearchableSelect from '../Common/SearchableSelect'
import TransactionApprovalStatus from '../Approvals/TransactionApprovalStatus'

interface TransactionWizardProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  accounts: Account[]
  projects: Project[]
  organizations: Organization[]
  classifications?: TransactionClassification[]
  categories?: ExpensesCategoryRow[]
  workItems?: WorkItemRow[]
  costCenters?: Array<{ id: string; code: string; name: string; name_ar?: string | null; project_id?: string | null; level: number }>
  analysisItemsMap?: Record<string, { id?: string; code: string; name: string }>

  // NEW: Edit mode support
  mode?: 'create' | 'edit'
  transactionId?: string
  initialData?: {
    header: Record<string, any>
    lines: TxLine[]
  }

  // NEW: Approval context
  approvalStatus?: string
  canEdit?: boolean

  // NEW: Callbacks
  onEditComplete?: () => void
}

type StepType = 'basic' | 'lines' | 'review'

const steps: Array<{ id: StepType; label: string; icon: string }> = [
  { id: 'basic', label: 'البيانات الأساسية', icon: '📝' },
  { id: 'lines', label: 'بنود المعاملة', icon: '📋' },
  { id: 'review', label: 'المراجعة والحفظ', icon: '✅' }
]

interface ColumnConfig {
  visible: boolean
  width: number
  label: string
  labelEn: string
}

const DEFAULT_COLUMN_CONFIG: Record<string, ColumnConfig> = {
  org_id: { visible: true, width: 180, label: 'المؤسسة', labelEn: 'Organization' },
  project_id: { visible: true, width: 180, label: 'المشروع', labelEn: 'Project' },
  cost_center_id: { visible: true, width: 180, label: 'مركز التكلفة', labelEn: 'Cost Center' },
  work_item_id: { visible: true, width: 180, label: 'عنصر العمل', labelEn: 'Work Item' },
  analysis_work_item_id: { visible: true, width: 180, label: 'بند التحليل', labelEn: 'Analysis Work Item' },
  classification_id: { visible: true, width: 180, label: 'التصنيف', labelEn: 'Classification' },
  sub_tree_id: { visible: true, width: 180, label: 'الشجرة الفرعية', labelEn: 'Sub-tree' }
}


interface TxLine {
  id?: string // Added after save
  line_no: number
  account_id: string
  debit_amount: number
  credit_amount: number
  description: string
  org_id?: string
  project_id?: string
  cost_center_id?: string
  work_item_id?: string
  analysis_work_item_id?: string
  classification_id?: string
  sub_tree_id?: string
}

const TransactionWizard: React.FC<TransactionWizardProps> = ({
  open,
  onClose,
  onSubmit,
  accounts,
  projects,
  organizations,
  classifications = [],
  categories = [],
  workItems = [],
  costCenters = [],
  analysisItemsMap = {},

  // NEW: Edit mode props
  mode = 'create',
  transactionId,
  initialData,
  approvalStatus,
  canEdit = true,
  onEditComplete
}) => {
  const [currentStep, setCurrentStep] = useState<StepType>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draftTransactionId, setDraftTransactionId] = useState<string | null>(null)
  const [draftLineIds, setDraftLineIds] = useState<Record<number, string>>({})

  // Header data (transactions table)
  // Get scoped context for org/project synchronization
  const { getOrgId, getProjectId } = useScope()

  const [headerData, setHeaderData] = useState<Record<string, any>>(() => {
    const today = new Date().toISOString().split('T')[0]
    const currentOrgId = getOrgId()
    const currentProjectId = getProjectId()
    return {
      entry_date: today,
      description: '',
      description_ar: '',
      org_id: currentOrgId || (organizations[0]?.id || ''),
      project_id: currentProjectId || '',
      // Defaults to propagate to lines (match old wizard header fields)
      default_cost_center_id: '',
      default_work_item_id: '',
      default_sub_tree_id: '',
      classification_id: '',
      reference_number: '',
      notes: '',
      notes_ar: ''
    }
  })

  // ========== DATA FROM CONTEXT (via props) ==========
  // All dropdown data now comes from TransactionsDataContext through parent props
  // No independent fetching - single source of truth
  const effectiveCategories = categories
  const effectiveCostCenters = costCenters
  const effectiveWorkItems = workItems
  const effectiveClassifications = classifications
  const effectiveAnalysisItems = analysisItemsMap

  // Log when wizard opens with context data
  useEffect(() => {
    if (open) {
      console.log('📦 TransactionWizard opened with context data:', {
        categories: effectiveCategories.length,
        costCenters: effectiveCostCenters.length,
        workItems: effectiveWorkItems.length,
        classifications: effectiveClassifications.length,
        analysisItems: Object.keys(effectiveAnalysisItems).length,
        accounts: accounts.length,
        organizations: organizations.length,
        projects: projects.length
      })
    }
  }, [open, effectiveCategories.length, effectiveCostCenters.length, effectiveWorkItems.length, effectiveClassifications.length, effectiveAnalysisItems, accounts.length, organizations.length, projects.length])

  // Sync with scope context changes
  useEffect(() => {
    if (open) {
      const currentScopeOrgId = getOrgId()
      const currentScopeProjectId = getProjectId()
      
      // Update header data if scope changes and wizard is on basic step
      if (currentStep === 'basic') {
        setHeaderData(prev => ({
          ...prev,
          org_id: currentScopeOrgId || prev.org_id,
          project_id: currentScopeProjectId || prev.project_id
        }))
      }
    }
  }, [open, getOrgId, getProjectId, currentStep])

  // Lines data (transaction_lines table)
  const [lines, setLines] = useState<TxLine[]>([
    { line_no: 1, account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
    { line_no: 2, account_id: '', debit_amount: 0, credit_amount: 0, description: '' }
  ])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [infoCollapsed, setInfoCollapsed] = useState<boolean>(true)
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set())
  // Staged attachments per line (before save)
  const [lineAttachments, setLineAttachments] = useState<Record<number, File[]>>({})
  // Transaction-level attachments for Step 4
  const [transactionAttachments, setTransactionAttachments] = useState<File[]>([])
  // Step completion tracking
  const [completedSteps, setCompletedSteps] = useState<Set<StepType>>(new Set())

  // Column Configuration State
  const [columnConfig, setColumnConfig] = useState<Record<string, ColumnConfig>>(DEFAULT_COLUMN_CONFIG)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [tempColumnConfig, setTempColumnConfig] = useState<Record<string, ColumnConfig>>(DEFAULT_COLUMN_CONFIG)

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('transaction_wizard_column_config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        setColumnConfig(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Failed to parse column config', e)
      }
    }
  }, [])

  // NEW: Load initial data in edit mode
  const initialDataLoadedRef = React.useRef(false)

  useEffect(() => {
    // Reset the flag when wizard closes
    if (!open) {
      initialDataLoadedRef.current = false
      return
    }

    // Only load once per open session
    if (mode === 'edit' && initialData && !initialDataLoadedRef.current) {
      console.log('📝 Loading transaction data for edit mode:', transactionId)

      // Load header data
      if (initialData.header) {
        setHeaderData(initialData.header)
      }

      // Load lines data
      if (initialData.lines && initialData.lines.length > 0) {
        setLines(initialData.lines)
      }

      // Set transaction ID for edit mode
      if (transactionId) {
        setDraftTransactionId(transactionId)
      }

      initialDataLoadedRef.current = true
      console.log('✅ Transaction data loaded successfully')
    }
  }, [mode, open, transactionId, initialData])

  const saveColumnConfig = (config: Record<string, ColumnConfig>) => {
    localStorage.setItem('transaction_wizard_column_config', JSON.stringify(config))
    setColumnConfig(config)
  }

  const resetColumnConfig = () => {
    setTempColumnConfig(DEFAULT_COLUMN_CONFIG)
  }

  const handleConfigApply = () => {
    saveColumnConfig(tempColumnConfig)
    setConfigModalOpen(false)
  }

  const handleConfigCancel = () => {
    setTempColumnConfig(columnConfig)
    setConfigModalOpen(false)
  }

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Enter: Next/Submit
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      if (currentStep === 'review') {
        handleSubmit()
      } else {
        handleNext()
      }
    }
    // Ctrl+B: Previous
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault()
      if (currentStepIndex > 0) {
        handlePrev()
      }
    }
    // Esc: Close (with cleanup)
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCloseWithCleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, currentStepIndex])

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  // Calculate totals
  const totals = useMemo(() => {
    const totalDebits = lines.reduce((sum, line) => sum + (Number(line.debit_amount) || 0), 0)
    const totalCredits = lines.reduce((sum, line) => sum + (Number(line.credit_amount) || 0), 0)
    const diff = totalDebits - totalCredits
    const isBalanced = Math.abs(diff) < 0.01
    return { totalDebits, totalCredits, diff, isBalanced, linesCount: lines.length }
  }, [lines])

  // Filter accounts - only postable
  const postableAccounts = useMemo(() =>
    accounts.filter(a => a.is_postable).sort((x, y) => x.code.localeCompare(y.code)),
    [accounts]
  )

  // Filter projects by org
  const filteredProjects = useMemo(() => {
    if (!headerData.org_id) return projects
    const scoped = projects.filter(p => p.org_id === headerData.org_id || !p.org_id)
    return scoped.length > 0 ? scoped : projects
  }, [projects, headerData.org_id])

  // Prepare options for SearchableSelect
  const organizationOptions = useMemo(() =>
    organizations.map(org => ({ value: org.id, label: `${org.code} - ${org.name}` })),
    [organizations]
  )

  const projectOptions = useMemo(() =>
    filteredProjects.map(proj => ({ value: proj.id, label: `${proj.code} - ${proj.name}` })),
    [filteredProjects]
  )

  const costCenterOptions = useMemo(() =>
    effectiveCostCenters.map(cc => ({ value: cc.id, label: `${cc.code} - ${cc.name}` })),
    [effectiveCostCenters]
  )

  const workItemOptions = useMemo(() =>
    effectiveWorkItems.map(wi => ({ value: wi.id, label: `${wi.code} - ${wi.name}` })),
    [effectiveWorkItems]
  )

  const classificationOptions = useMemo(() =>
    effectiveClassifications.map(cls => ({ value: cls.id, label: `${cls.code} - ${cls.name}` })),
    [effectiveClassifications]
  )

  const analysisItemOptions = useMemo(() =>
    Object.entries(effectiveAnalysisItems).map(([id, item]) => ({
      value: id,
      label: `${item.code} - ${item.name}`
    })),
    [effectiveAnalysisItems]
  )

  const accountOptions = useMemo(() =>
    postableAccounts.map(acc => ({ value: acc.id, label: `${acc.code} - ${acc.name_ar || acc.name}` })),
    [postableAccounts]
  )

  const handleNext = () => {
    setErrors({})

    if (currentStep === 'basic') {
      // Validate basic fields
      const newErrors: Record<string, string> = {}
      if (!headerData.entry_date) newErrors.entry_date = 'تاريخ القيد مطلوب'
      if (!headerData.description || headerData.description.trim().length < 3) {
        newErrors.description = 'وصف المعاملة مطلوب (3 أحرف على الأقل)'
      }
      if (!headerData.org_id) newErrors.org_id = 'المؤسسة مطلوبة'

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      // Mark step as completed
      setCompletedSteps(prev => new Set(prev).add('basic'))

      // Propagate header defaults to lines
      setLines(prev => prev.map(line => ({
        ...line,
        org_id: line.org_id || headerData.org_id,
        project_id: line.project_id || headerData.project_id,
        classification_id: line.classification_id || (headerData.classification_id || undefined),
        cost_center_id: line.cost_center_id || (headerData.default_cost_center_id || undefined),
        work_item_id: line.work_item_id || (headerData.default_work_item_id || undefined),
        sub_tree_id: line.sub_tree_id || (headerData.default_sub_tree_id || undefined)
      })))

      // NOTE: Draft transactions are NOT created during navigation anymore.
      // Files are staged in state (lineAttachments, transactionAttachments) and uploaded after save.
      // This prevents orphan records if user cancels the wizard.
      // For edit mode, line.id is already set from the loaded transaction.

      setCurrentStep('lines')
    } else if (currentStep === 'lines') {
      // Validate lines
      const newErrors: Record<string, string> = {}
      if (lines.length < 1) {
        newErrors.lines = 'يجب إضافة سطر واحد على الأقل'
      }

      // Check each line
      lines.forEach((line, idx) => {
        if (!line.account_id) {
          newErrors[`line_${idx}_account`] = `السطر ${idx + 1}: الحساب مطلوب`
        }
        const hasDebit = (Number(line.debit_amount) || 0) > 0
        const hasCredit = (Number(line.credit_amount) || 0) > 0
        if (!hasDebit && !hasCredit) {
          newErrors[`line_${idx}_amount`] = `السطر ${idx + 1}: يجب إدخال مبلغ مدين أو دائن`
        }
        if (hasDebit && hasCredit) {
          newErrors[`line_${idx}_xor`] = `السطر ${idx + 1}: لا يمكن إدخال مدين ودائن معاً في نفس السطر`
        }
      })

      if (!totals.isBalanced) {
        newErrors.balance = 'القيود غير متوازنة - إجمالي المدين يجب أن يساوي إجمالي الدائن'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      // Mark step as completed
      setCompletedSteps(prev => new Set(prev).add('lines'))

      setCurrentStep('review')
    }
  }

  const handlePrev = () => {
    setErrors({})
    const prevStep = steps[currentStepIndex - 1]
    if (prevStep) {
      setCurrentStep(prevStep.id)
    }
  }

  // Create draft transaction for document management (lazy - only when user attaches documents)
  const createDraftTransaction = async () => {
    if (draftTransactionId) return draftTransactionId // Already created

    try {
      const { supabase } = await import('../../utils/supabase')
      const authService = await import('../../services/authService')
      const userId = await authService.AuthService.getCurrentUserId()

      // Create TEMPORARY wizard draft transaction (marked for cleanup)
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          entry_date: headerData.entry_date,
          description: headerData.description || 'مسودة - جاري الإنشاء',
          description_ar: headerData.description_ar,
          org_id: headerData.org_id,
          project_id: headerData.project_id || null,
          reference_number: headerData.reference_number || null,
          notes: headerData.notes || null,
          notes_ar: headerData.notes_ar || null,
          created_by: userId,
          // Mark as wizard draft - will be filtered from normal queries
          is_wizard_draft: true,
          wizard_draft_created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (txError) throw txError

      setDraftTransactionId(transaction.id)
      console.log('Draft transaction created:', transaction.id)
      return transaction.id
    } catch (error) {
      console.error('Failed to create draft transaction:', error)
      return null
    }
  }

  // Create draft line for document management (lazy - only when user wants to attach documents)
  const createDraftLine = async (lineIndex: number) => {
    if (draftLineIds[lineIndex]) return draftLineIds[lineIndex] // Already created

    const line = lines[lineIndex]
    if (!line.account_id) return null // Can't create without account

    // Check constraint: at least one side must be positive
    const debit = Number(line.debit_amount) || 0
    const credit = Number(line.credit_amount) || 0
    if (debit <= 0 && credit <= 0) return null // Can't create without amount

    try {
      const { supabase } = await import('../../utils/supabase')

      // Ensure transaction exists
      const txId = draftTransactionId || await createDraftTransaction()
      if (!txId) return null

      // Create draft line
      const { data: savedLine, error: lineError } = await supabase
        .from('transaction_lines')
        .insert({
          transaction_id: txId,
          line_no: line.line_no,
          account_id: line.account_id,
          debit_amount: Number(line.debit_amount) || 0,
          credit_amount: Number(line.credit_amount) || 0,
          description: line.description || null,
          org_id: line.org_id || headerData.org_id,
          project_id: line.project_id || headerData.project_id || null,
          cost_center_id: line.cost_center_id || null,
          work_item_id: line.work_item_id || null,
          analysis_work_item_id: line.analysis_work_item_id || null,
          classification_id: line.classification_id || null,
          sub_tree_id: line.sub_tree_id || null
        })
        .select()
        .single()

      if (lineError) throw lineError

      // Store line ID
      setDraftLineIds(prev => ({ ...prev, [lineIndex]: savedLine.id }))
      console.log(`Draft line ${lineIndex} created:`, savedLine.id)
      return savedLine.id
    } catch (error) {
      console.error(`Failed to create draft line ${lineIndex}:`, error)
      return null
    }
  }

  // Cleanup wizard draft when closing without saving (prevents orphan records)
  const cleanupWizardDraft = async () => {
    if (!draftTransactionId) return

    // Only cleanup if this is a wizard-created draft (not edit mode)
    if (mode === 'edit') return

    try {
      const { supabase } = await import('../../utils/supabase')

      // Delete the wizard draft transaction (cascade will delete lines)
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', draftTransactionId)
        .eq('is_wizard_draft', true) // Safety: only delete if it's a wizard draft

      if (error) {
        console.error('Failed to cleanup wizard draft:', error)
      } else {
        console.log('🧹 Wizard draft cleaned up:', draftTransactionId)
      }
    } catch (error) {
      console.error('Failed to cleanup wizard draft:', error)
    }
  }

  // Convert wizard draft to real transaction (remove draft flag)
  const finalizeWizardDraft = async () => {
    if (!draftTransactionId) return

    try {
      const { supabase } = await import('../../utils/supabase')

      // Remove wizard draft flag - transaction becomes permanent
      const { error } = await supabase
        .from('transactions')
        .update({
          is_wizard_draft: false,
          wizard_draft_created_at: null
        })
        .eq('id', draftTransactionId)

      if (error) {
        console.error('Failed to finalize wizard draft:', error)
      } else {
        console.log('✅ Wizard draft finalized:', draftTransactionId)
      }
    } catch (error) {
      console.error('Failed to finalize wizard draft:', error)
    }
  }

  // Handle close with cleanup of wizard drafts
  const handleCloseWithCleanup = async () => {
    // Cleanup any wizard draft before closing
    await cleanupWizardDraft()

    // Reset state
    setDraftTransactionId(null)
    setDraftLineIds({})

    // Call the original onClose
    onClose()
  }

  // ========== BUSINESS RULE VALIDATION ==========
  const validateBusinessRules = (): { isValid: boolean; errors: Record<string, string> } => {
    const validationErrors: Record<string, string> = {}

    // 1. Validate header fields
    if (!headerData.entry_date) {
      validationErrors.entry_date = 'تاريخ القيد مطلوب'
    } else {
      const entryDate = new Date(headerData.entry_date)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (entryDate > today) {
        validationErrors.entry_date = 'لا يمكن إدخال تاريخ مستقبلي'
      }
      // Check if date is too old (more than 1 year)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      if (entryDate < oneYearAgo) {
        validationErrors.entry_date = 'تحذير: التاريخ قديم جداً (أكثر من سنة)'
      }
    }

    if (!headerData.description || headerData.description.trim().length < 3) {
      validationErrors.description = 'وصف المعاملة مطلوب (3 أحرف على الأقل)'
    }

    if (!headerData.org_id) {
      validationErrors.org_id = 'المؤسسة مطلوبة'
    }

    // 2. Validate lines exist
    if (lines.length < 2) {
      validationErrors.lines = 'يجب إضافة سطرين على الأقل (مدين ودائن)'
    }

    // 3. Validate each line
    let hasDebitLine = false
    let hasCreditLine = false

    lines.forEach((line, idx) => {
      if (!line.account_id) {
        validationErrors[`line_${idx}_account`] = `السطر ${idx + 1}: الحساب مطلوب`
      }

      const debit = Number(line.debit_amount) || 0
      const credit = Number(line.credit_amount) || 0

      if (debit <= 0 && credit <= 0) {
        validationErrors[`line_${idx}_amount`] = `السطر ${idx + 1}: يجب إدخال مبلغ مدين أو دائن`
      }

      if (debit > 0 && credit > 0) {
        validationErrors[`line_${idx}_xor`] = `السطر ${idx + 1}: لا يمكن إدخال مدين ودائن معاً في نفس السطر`
      }

      if (debit > 0) hasDebitLine = true
      if (credit > 0) hasCreditLine = true
    })

    // 4. Must have at least one debit and one credit line
    if (!hasDebitLine) {
      validationErrors.no_debit = 'يجب وجود سطر مدين واحد على الأقل'
    }
    if (!hasCreditLine) {
      validationErrors.no_credit = 'يجب وجود سطر دائن واحد على الأقل'
    }

    // 5. Validate balance
    if (!totals.isBalanced) {
      validationErrors.balance = `القيود غير متوازنة - الفرق: ${Math.abs(totals.diff).toLocaleString('ar-SA')} ريال`
    }

    return {
      isValid: Object.keys(validationErrors).length === 0,
      errors: validationErrors
    }
  }

  // NEW: Save as Draft (without approval)
  const handleSaveDraft = async () => {
    // Validate business rules first
    const validation = validateBusinessRules()
    if (!validation.isValid) {
      setErrors(validation.errors)
      // Scroll to top to show errors
      const content = document.querySelector('.tx-wizard-content')
      if (content) content.scrollTop = 0
      return
    }

    setIsSubmitting(true)
    setErrors({})
    try {
      const finalData = {
        entry_date: headerData.entry_date,
        description: headerData.description,
        description_ar: headerData.description_ar || null,
        org_id: headerData.org_id,
        project_id: headerData.project_id || null,
        classification_id: headerData.classification_id || null,
        reference_number: headerData.reference_number || null,
        notes: headerData.notes || null,
        notes_ar: headerData.notes_ar || null,
        lines: lines.map(line => ({
          line_no: line.line_no,
          account_id: line.account_id,
          debit_amount: Number(line.debit_amount) || 0,
          credit_amount: Number(line.credit_amount) || 0,
          description: line.description || null,
          org_id: line.org_id || headerData.org_id,
          project_id: line.project_id || headerData.project_id || null,
          cost_center_id: line.cost_center_id || null,
          work_item_id: line.work_item_id || null,
          analysis_work_item_id: line.analysis_work_item_id || null,
          classification_id: line.classification_id || null,
          sub_tree_id: line.sub_tree_id || null
        })),
        attachments: {
          transaction: transactionAttachments,
          lines: Object.fromEntries(Object.entries(lineAttachments).map(([idx, files]) => [Number(idx), files]))
        },
        // Save as draft - do NOT submit for approval
        submitForApproval: false
      }

      await onSubmit(finalData)
      // Finalize wizard draft (remove draft flag) if one was created
      await finalizeWizardDraft()

      setErrors({ success: '✅ تم حفظ المعاملة كمسودة بنجاح!' })

      setTimeout(() => {
        setTransactionAttachments([])
        setLineAttachments({})
        setCompletedSteps(new Set())
        setDraftTransactionId(null)
        setDraftLineIds({})
        setHeaderData({
          entry_date: new Date().toISOString().split('T')[0],
          description: '',
          description_ar: '',
          org_id: getOrgId() || (organizations[0]?.id || ''),
          project_id: getProjectId() || '',
          default_cost_center_id: '',
          default_work_item_id: '',
          default_sub_tree_id: '',
          classification_id: '',
          reference_number: '',
          notes: '',
          notes_ar: ''
        })
        setLines([])
        onEditComplete?.()
        onClose()
      }, 1500)
    } catch (error: any) {
      setErrors({ submit: error?.message || 'فشل حفظ المعاملة' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    // Validate business rules first
    const validation = validateBusinessRules()
    if (!validation.isValid) {
      setErrors(validation.errors)
      // Scroll to top to show errors
      const content = document.querySelector('.tx-wizard-content')
      if (content) content.scrollTop = 0
      return
    }

    setIsSubmitting(true)
    setErrors({})
    try {
      // Prepare final data with header and lines
      const finalData = {
        // Header fields (transactions table)
        entry_date: headerData.entry_date,
        description: headerData.description,
        description_ar: headerData.description_ar || null,
        org_id: headerData.org_id,
        project_id: headerData.project_id || null,
        classification_id: headerData.classification_id || null,
        reference_number: headerData.reference_number || null,
        notes: headerData.notes || null,
        notes_ar: headerData.notes_ar || null,
        // Lines (transaction_lines table)
        lines: lines.map(line => ({
          line_no: line.line_no,
          account_id: line.account_id,
          debit_amount: Number(line.debit_amount) || 0,
          credit_amount: Number(line.credit_amount) || 0,
          description: line.description || null,
          org_id: line.org_id || headerData.org_id,
          project_id: line.project_id || headerData.project_id || null,
          cost_center_id: line.cost_center_id || null,
          work_item_id: line.work_item_id || null,
          analysis_work_item_id: line.analysis_work_item_id || null,
          classification_id: line.classification_id || null,
          sub_tree_id: line.sub_tree_id || null
        })),
        // Staged attachments to be uploaded and linked after creation
        attachments: {
          transaction: transactionAttachments,
          lines: Object.fromEntries(Object.entries(lineAttachments).map(([idx, files]) => [Number(idx), files]))
        },
        // Submit for approval automatically
        submitForApproval: true
      }

      // Call onSubmit which should save to Supabase
      await onSubmit(finalData)

      // Finalize wizard draft (remove draft flag) if one was created
      await finalizeWizardDraft()

      // Show success message
      setErrors({ success: '✅ تم حفظ المعاملة وإرسالها للاعتماد بنجاح!' })

      // Wait 2 seconds to show success message, then close
      setTimeout(() => {
        // Reset form and close
        setTransactionAttachments([])
        setLineAttachments({})
        setCompletedSteps(new Set())
        setDraftTransactionId(null)
        setDraftLineIds({})
        setHeaderData({
          entry_date: new Date().toISOString().split('T')[0],
          description: '',
          description_ar: '',
          org_id: getOrgId() || (organizations[0]?.id || ''),
          project_id: getProjectId() || '',
          default_cost_center_id: '',
          default_work_item_id: '',
          default_sub_tree_id: '',
          classification_id: '',
          reference_number: '',
          notes: '',
          notes_ar: ''
        })
        setLines([
          { line_no: 1, account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
          { line_no: 2, account_id: '', debit_amount: 0, credit_amount: 0, description: '' }
        ])
        setCurrentStep('basic')
        setErrors({})
        onEditComplete?.()
        onClose()
      }, 2000)
    } catch (err: any) {
      setErrors({ submit: err.message || 'فشل حفظ المعاملة' })
      // Scroll to top to show error
      const content = document.querySelector('.tx-wizard-content')
      if (content) content.scrollTop = 0
    } finally {
      setIsSubmitting(false)
    }
  }

  const addLine = () => {
    const newLineNo = lines.length + 1
    setLines(prev => [...prev, {
      line_no: newLineNo,
      account_id: '',
      debit_amount: 0,
      credit_amount: 0,
      description: '',
      org_id: headerData.org_id,
      project_id: headerData.project_id,
      cost_center_id: headerData.default_cost_center_id || undefined,
      work_item_id: headerData.default_work_item_id || undefined,
      sub_tree_id: headerData.default_sub_tree_id || undefined,
      classification_id: headerData.classification_id || undefined
    }])
  }

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return
    setLines(prev => prev.filter((_, i) => i !== idx).map((line, i) => ({ ...line, line_no: i + 1 })))
  }

  const updateLine = (idx: number, updates: Partial<TxLine>) => {
    setLines(prev => prev.map((line, i) => i === idx ? { ...line, ...updates } : line))
  }

  const renderDynamicCell = (key: string, line: TxLine, idx: number) => {
    switch (key) {
      case 'org_id':
        return (
          <SearchableSelect
            options={organizationOptions}
            value={line.org_id || headerData.org_id || ''}
            onChange={(val) => updateLine(idx, { org_id: val })}
            placeholder="اختر المؤسسة"
          />
        )
      case 'project_id':
        return (
          <SearchableSelect
            options={projectOptions}
            value={line.project_id || ''}
            onChange={(val) => updateLine(idx, { project_id: val || undefined })}
            placeholder="بدون مشروع"
            disabled={!headerData.org_id}
          />
        )
      case 'cost_center_id':
        return (
          <SearchableSelect
            options={costCenterOptions}
            value={line.cost_center_id || ''}
            onChange={(val) => updateLine(idx, { cost_center_id: val || undefined })}
            placeholder="بدون مركز تكلفة"
          />
        )
      case 'work_item_id':
        return (
          <SearchableSelect
            options={workItemOptions}
            value={line.work_item_id || ''}
            onChange={(val) => updateLine(idx, { work_item_id: val || undefined })}
            placeholder="بدون عنصر عمل"
          />
        )
      case 'analysis_work_item_id':
        return (
          <SearchableSelect
            options={analysisItemOptions}
            value={line.analysis_work_item_id || ''}
            onChange={(val) => updateLine(idx, { analysis_work_item_id: val || undefined })}
            placeholder="بدون بند تحليل"
          />
        )
      case 'classification_id':
        return (
          <SearchableSelect
            options={classificationOptions}
            value={line.classification_id || ''}
            onChange={(val) => updateLine(idx, { classification_id: val || undefined })}
            placeholder="بدون تصنيف"
          />
        )
      case 'sub_tree_id': {
        const subTreeOptions = effectiveCategories
          .filter(c => c.org_id === (line.org_id || headerData.org_id))
          .filter(c => {
            // Strictly filter by account if an account is selected on this line
            // User requested to hide generic categories if an account is selected to prevent confusion.
            if (!line.account_id) return true;
            return c.linked_account_id === line.account_id;
          })
          .map(c => ({ value: c.id, label: `${c.code} - ${c.description}` }))

        return (
          <SearchableSelect
            options={subTreeOptions}
            value={line.sub_tree_id || ''}
            onChange={(val) => updateLine(idx, { sub_tree_id: val || undefined })}
            placeholder={subTreeOptions.length === 0 && line.account_id ? "لا توجد فئات مرتبطة بهذا الحساب" : "بدون شجرة فرعية"}
            disabled={line.account_id && subTreeOptions.length === 0}
          />
        )
      }
      default:
        return null
    }
  }

  if (!open) return null

  return (
    <>
      <DraggablePanelContainer
        storageKey="txWizard"
        isOpen={open}
        onClose={handleCloseWithCleanup}
        title={mode === 'edit' ? `تعديل المعاملة${transactionId ? ` - ${transactionId.substring(0, 8)}` : ''}` : "معاملة جديدة - خطوة بخطوة"}
        subtitle={`الخطوة ${currentStepIndex + 1} من ${steps.length}: ${steps[currentStepIndex].label}`}
        defaults={{
          position: () => ({ x: 60, y: 40 }),
          size: () => ({ width: 1000, height: 700 }),
          dockPosition: 'right',
        }}
      >
        <div className="tx-wizard" dir="rtl">
          {/* Material-UI Stepper */}
          <Box sx={{ width: '100%', padding: '20px 20px 0 20px', background: '#0f172a' }}>
            {/* NEW: Show approval status in edit mode */}
            {mode === 'edit' && approvalStatus && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                <Chip
                  label={
                    approvalStatus === 'draft' ? '📝 مسودة' :
                      approvalStatus === 'submitted' ? '📤 مُرسلة' :
                        approvalStatus === 'approved' ? '✅ معتمدة' :
                          approvalStatus === 'revision_requested' ? '🔄 طلب تعديل' :
                            approvalStatus === 'rejected' ? '❌ مرفوضة' :
                              approvalStatus
                  }
                  color={
                    approvalStatus === 'approved' ? 'success' :
                      approvalStatus === 'rejected' ? 'error' :
                        approvalStatus === 'revision_requested' ? 'warning' :
                          'default'
                  }
                  sx={{ fontSize: '14px', fontWeight: 600 }}
                />
                {!canEdit && (
                  <Chip
                    label="🔒 للقراءة فقط"
                    color="error"
                    size="small"
                  />
                )}
              </Box>
            )}

            <Stepper activeStep={currentStepIndex} alternativeLabel sx={{ background: 'transparent' }}>
              {steps.map((step, idx) => (
                <Step key={step.id} completed={completedSteps.has(step.id)}>
                  <StepButton onClick={() => {
                    // Allow navigation to completed steps or current step
                    if (completedSteps.has(step.id) || idx === currentStepIndex) {
                      setCurrentStep(step.id)
                    }
                  }}>
                    <StepLabel
                      icon={<span style={{ fontSize: '20px' }}>{step.icon}</span>}
                      optional={
                        completedSteps.has(step.id) ? (
                          <Typography variant="caption" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CheckCircle sx={{ fontSize: 14 }} /> مكتمل
                          </Typography>
                        ) : null
                      }
                    >
                      {step.label}
                    </StepLabel>
                  </StepButton>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Step Content */}
          <div className="tx-wizard-content">
            {/* STEP 1: Basic Information */}
            {currentStep === 'basic' && (
              <div className="step-basic" style={{ padding: '20px', background: '#0f172a', pointerEvents: 'auto' }}>
                <h3 style={{ marginBottom: '20px', color: '#3b82f6', fontSize: '24px', fontWeight: 600 }}>المعلومات الأساسية للمعاملة</h3>

                <Box sx={{
                  maxWidth: '1000px',
                  margin: '0 auto',
                  background: '#1e293b',
                  borderRadius: '12px',
                  padding: '32px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                  pointerEvents: 'auto',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <Grid container spacing={3} sx={{ pointerEvents: 'auto' }}>
                    {/* Entry Date */}
                    <Grid xs={12} md={6}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                          تاريخ القيد <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={headerData.entry_date}
                          onChange={(e) => setHeaderData(prev => ({ ...prev, entry_date: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${errors.entry_date ? '#ef4444' : '#475569'}`,
                            fontSize: '14px',
                            backgroundColor: '#334155',
                            color: '#f1f5f9',
                            fontFamily: 'inherit'
                          }}
                        />
                        {errors.entry_date && (
                          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.entry_date}</div>
                        )}
                        {!errors.entry_date && (
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>حدد تاريخ إجراء المعاملة</div>
                        )}
                      </div>
                    </Grid>

                    {/* Organization */}
                    <Grid xs={12} md={6}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                          المؤسسة <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <SearchableSelect
                          id="wizard.basic.org"
                          value={headerData.org_id}
                          options={organizationOptions}
                          onChange={(val) => setHeaderData(prev => ({ ...prev, org_id: val, project_id: '' }))}
                          placeholder="اختر المؤسسة..."
                          required
                          error={!!errors.org_id}
                          clearable={false}
                        />
                        {errors.org_id ? (
                          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.org_id}</div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>اختر المؤسسة المسؤولة عن هذه المعاملة</div>
                        )}
                      </div>
                    </Grid>

                    {/* Description */}
                    <Grid xs={12} md={6}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                          وصف المعاملة <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={headerData.description}
                          onChange={(e) => setHeaderData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="مثال: شراء أثاث مكتبي ولوازم"
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${errors.description ? '#ef4444' : '#475569'}`,
                            fontSize: '14px',
                            backgroundColor: '#334155',
                            color: '#f1f5f9',
                            fontFamily: 'inherit'
                          }}
                        />
                        {errors.description && (
                          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.description}</div>
                        )}
                        {!errors.description && (
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>أدخل وصفاً واضحاً وموجزاً للمعاملة (3 أحرف على الأقل)</div>
                        )}
                      </div>
                    </Grid>

                    {/* Project */}
                    <Grid xs={12} md={6}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                          المشروع
                        </label>
                        <SearchableSelect
                          id="wizard.basic.project"
                          value={headerData.project_id || ''}
                          options={[{ value: '', label: 'بدون مشروع' }, ...projectOptions]}
                          onChange={(val) => setHeaderData(prev => ({ ...prev, project_id: val }))}
                          placeholder="بدون مشروع"
                          clearable
                          disabled={!headerData.org_id}
                        />
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                          {!headerData.org_id ? '⚠️ اختر المؤسسة أولاً' : 'اختياري - حدد المشروع المرتبط'}
                        </div>
                      </div>
                    </Grid>

                    {/* Notes */}
                    <Grid xs={12}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
                          ملاحظات
                        </label>
                        <textarea
                          rows={3}
                          value={headerData.notes}
                          onChange={(e) => setHeaderData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="ملاحظات داخلية (اختياري)..."
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '2px solid #475569',
                            fontSize: '14px',
                            backgroundColor: '#334155',
                            color: '#f1f5f9',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>ملاحظات داخلية اختيارية</div>
                      </div>
                    </Grid>
                  </Grid>
                </Box>
              </div>
            )}

            {/* STEP 2: Transaction Lines */}
            {currentStep === 'lines' && (
              <div className="step-lines" style={{ padding: '20px', background: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: '#3b82f6', fontSize: '24px', fontWeight: 600 }}>بنود المعاملة</h3>
                </div>

                <div style={{ background: 'var(--info-bg)', borderRadius: '6px', marginBottom: '16px', border: '1px solid var(--info)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer' }} onClick={() => setInfoCollapsed(!infoCollapsed)}>
                    <strong>💡 بيانات من الخطوة السابقة</strong>
                    <button className="ultimate-btn ultimate-btn-edit" style={{ padding: '2px 8px', fontSize: '12px' }}>
                      {infoCollapsed ? 'إظهار' : 'إخفاء'}
                    </button>
                  </div>
                  {!infoCollapsed && (
                    <div style={{ padding: '0 12px 12px 12px', fontSize: '13px' }}>
                      <div>📅 التاريخ: {new Date(headerData.entry_date).toLocaleDateString('ar-EG')}</div>
                      <div>📝 الوصف: {headerData.description}</div>
                      <div>🏢 المؤسسة: {organizations.find(o => o.id === headerData.org_id)?.name || '—'}</div>
                      {headerData.project_id && <div>📁 المشروع: {projects.find(p => p.id === headerData.project_id)?.name || '—'}</div>}
                    </div>
                  )}
                </div>

                {/* Add Line Button & Settings */}
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <IconButton
                    onClick={() => setConfigModalOpen(true)}
                    sx={{
                      color: '#94a3b8',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      '&:hover': {
                        backgroundColor: 'rgba(148, 163, 184, 0.1)',
                        color: '#f1f5f9',
                        borderColor: '#64748b'
                      }
                    }}
                    title="تخصيص الأعمدة"
                  >
                    <Settings fontSize="small" />
                  </IconButton>
                  <button
                    onClick={addLine}
                    className="ultimate-btn ultimate-btn-success"
                    style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600 }}
                  >
                    <div className="btn-content"><span className="btn-text">+ إضافة بند</span></div>
                  </button>
                </div>

                {/* Lines Table */}
                <div style={{ overflowX: 'auto', marginBottom: '16px', background: '#1e293b', borderRadius: '12px', padding: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#334155', borderBottom: '2px solid #475569' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'center', width: '40px', color: '#f1f5f9', fontWeight: 600 }}>#</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', minWidth: '250px', color: '#f1f5f9', fontWeight: 600 }}>الحساب *</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', width: '110px', color: '#f1f5f9', fontWeight: 600 }}>مدين</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', width: '110px', color: '#f1f5f9', fontWeight: 600 }}>دائن</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', minWidth: '300px', color: '#f1f5f9', fontWeight: 600 }}>البيان</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', width: '100px', color: '#f1f5f9', fontWeight: 600 }}>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => {
                        const isExpanded = expandedLines.has(idx)
                        return (
                          <React.Fragment key={idx}>
                            <tr style={{ borderBottom: '1px solid #475569', background: isExpanded ? '#334155' : 'transparent' }}>
                              <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#f1f5f9' }}>{idx + 1}</td>
                              <td style={{ padding: '10px 8px' }}>
                                <SearchableSelect
                                  options={accountOptions}
                                  value={line.account_id}
                                  onChange={(val) => {
                                    const updates: Partial<TxLine> = { account_id: val }
                                    // Automatically clear sub_tree_id if it's not linked to the new account
                                    if (val && line.sub_tree_id) {
                                      const category = effectiveCategories.find(c => c.id === line.sub_tree_id)
                                      if (category && category.linked_account_id && category.linked_account_id !== val) {
                                        updates.sub_tree_id = undefined
                                      }
                                    }
                                    updateLine(idx, updates)
                                  }}
                                  placeholder="اختر الحساب..."
                                  error={!!errors[`line_${idx}_account`]}
                                />
                                {errors[`line_${idx}_account`] && (
                                  <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                                    {errors[`line_${idx}_account`]}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={line.debit_amount || ''}
                                  onChange={(e) => updateLine(idx, {
                                    debit_amount: Number(e.target.value) || 0,
                                    credit_amount: 0
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '2px solid #475569',
                                    textAlign: 'right',
                                    fontSize: '13px',
                                    fontWeight: line.debit_amount > 0 ? 600 : 'normal',
                                    backgroundColor: '#334155',
                                    color: '#f1f5f9'
                                  }}
                                  placeholder="0.00"
                                />
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={line.credit_amount || ''}
                                  onChange={(e) => updateLine(idx, {
                                    credit_amount: Number(e.target.value) || 0,
                                    debit_amount: 0
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '2px solid #475569',
                                    textAlign: 'right',
                                    fontSize: '13px',
                                    fontWeight: line.credit_amount > 0 ? 600 : 'normal',
                                    backgroundColor: '#334155',
                                    color: '#f1f5f9'
                                  }}
                                  placeholder="0.00"
                                />
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                <textarea
                                  value={line.description || ''}
                                  onChange={(e) => updateLine(idx, { description: e.target.value })}
                                  placeholder="أدخل البيان..."
                                  rows={2}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '2px solid #475569',
                                    fontSize: '13px',
                                    backgroundColor: '#334155',
                                    color: '#f1f5f9',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                  }}
                                />
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedLines)
                                    if (isExpanded) {
                                      newExpanded.delete(idx)
                                    } else {
                                      newExpanded.add(idx)
                                    }
                                    setExpandedLines(newExpanded)
                                  }}
                                  sx={{ marginLeft: '4px' }}
                                >
                                  {isExpanded ? <ExpandLess /> : <Edit />}
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => removeLine(idx)}
                                  disabled={lines.length <= 1}
                                  color="error"
                                >
                                  <DeleteOutline />
                                </IconButton>
                              </td>
                            </tr>
                            {/* Expanded row with additional fields */}
                            {isExpanded && (
                              <tr style={{ background: '#1e293b' }}>
                                <td colSpan={5} style={{ padding: '16px' }}>
                                  <Grid container spacing={2}>
                                    {columnConfig.org_id?.visible && (
                                      <Grid xs={12} md={3}>
                                        <div className="form-group">
                                          <label>المؤسسة</label>
                                          {renderDynamicCell('org_id', line, idx)}
                                        </div>
                                      </Grid>
                                    )}
                                    {columnConfig.project_id?.visible && (
                                      <Grid xs={12} md={3}>
                                        <div className="form-group">
                                          <label>المشروع</label>
                                          {renderDynamicCell('project_id', line, idx)}
                                        </div>
                                      </Grid>
                                    )}
                                    {columnConfig.cost_center_id?.visible && (
                                      <Grid xs={12} md={3}>
                                        <div className="form-group">
                                          <label>مركز التكلفة</label>
                                          {renderDynamicCell('cost_center_id', line, idx)}
                                        </div>
                                      </Grid>
                                    )}
                                    {columnConfig.classification_id?.visible && (
                                      <Grid xs={12} md={3}>
                                        <div className="form-group">
                                          <label>التصنيف</label>
                                          {renderDynamicCell('classification_id', line, idx)}
                                        </div>
                                      </Grid>
                                    )}
                                    {columnConfig.work_item_id?.visible && (
                                      <Grid xs={12} md={3}>
                                        <div className="form-group">
                                          <label>عنصر العمل</label>
                                          {renderDynamicCell('work_item_id', line, idx)}
                                        </div>
                                      </Grid>
                                    )}
                                    {columnConfig.analysis_work_item_id?.visible && (
                                      <Grid xs={12} md={3}>
                                        <div className="form-group">
                                          <label>بند التحليل</label>
                                          {renderDynamicCell('analysis_work_item_id', line, idx)}
                                        </div>
                                      </Grid>
                                    )}
                                    {columnConfig.sub_tree_id?.visible && (
                                      <Grid xs={12} md={3}>
                                        <div className="form-group">
                                          <label>الشجرة الفرعية</label>
                                          {renderDynamicCell('sub_tree_id', line, idx)}
                                        </div>
                                      </Grid>
                                    )}
                                  </Grid>

                                  {(errors[`line_${idx}_amount`] || errors[`line_${idx}_xor`]) && (
                                    <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px' }}>
                                      {errors[`line_${idx}_amount`] || errors[`line_${idx}_xor`]}
                                    </div>
                                  )}

                                  {/* Per-line attachments - Full document management */}
                                  <div style={{ marginTop: '16px', background: '#0f172a', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                                    {(line.id || draftLineIds[idx]) ? (
                                      // Full AttachDocumentsPanel with all features (edit mode or after enabling)
                                      <AttachDocumentsPanel
                                        orgId={headerData.org_id || ''}
                                        transactionLineId={line.id || draftLineIds[idx]}
                                        projectId={headerData.project_id || undefined}
                                      />
                                    ) : line.account_id && ((Number(line.debit_amount) || 0) > 0 || (Number(line.credit_amount) || 0) > 0) ? (
                                      // Line is ready - show options to attach documents
                                      <>
                                        <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f1f5f9', fontSize: '15px' }}>
                                          <AttachFile sx={{ fontSize: 18 }} />
                                          مرفقات السطر {idx + 1}
                                        </Typography>

                                        {/* Show staged files */}
                                        {lineAttachments[idx] && lineAttachments[idx].length > 0 && (
                                          <Box sx={{ marginBottom: '12px' }}>
                                            {lineAttachments[idx].map((file, fileIdx) => (
                                              <Box key={fileIdx} sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                background: '#1e293b',
                                                borderRadius: '6px',
                                                marginBottom: '6px'
                                              }}>
                                                <Typography variant="body2" sx={{ color: '#f1f5f9', fontSize: '13px' }}>
                                                  📄 {file.name}
                                                </Typography>
                                                <Button
                                                  size="small"
                                                  onClick={() => {
                                                    setLineAttachments(prev => ({
                                                      ...prev,
                                                      [idx]: prev[idx].filter((_, i) => i !== fileIdx)
                                                    }))
                                                  }}
                                                  sx={{ minWidth: 'auto', color: '#ef4444', padding: '2px 8px' }}
                                                >
                                                  ✕
                                                </Button>
                                              </Box>
                                            ))}
                                          </Box>
                                        )}

                                        {/* Two options: Quick upload OR Full document management */}
                                        <Box sx={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                          {/* Option 1: Quick file upload (staged) */}
                                          <input
                                            type="file"
                                            id={`line-file-${idx}`}
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                              const files = Array.from(e.target.files || [])
                                              if (files.length > 0) {
                                                setLineAttachments(prev => ({
                                                  ...prev,
                                                  [idx]: [...(prev[idx] || []), ...files]
                                                }))
                                              }
                                              e.target.value = '' // Reset for re-selection
                                            }}
                                          />
                                          <label htmlFor={`line-file-${idx}`}>
                                            <Button
                                              variant="outlined"
                                              component="span"
                                              size="small"
                                              startIcon={<AttachFile />}
                                              sx={{
                                                color: '#94a3b8',
                                                borderColor: '#475569',
                                                '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' }
                                              }}
                                            >
                                              رفع ملف جديد
                                            </Button>
                                          </label>

                                          {/* Option 2: Enable full document management (link existing, templates, etc.) */}
                                          <Button
                                            variant="contained"
                                            size="small"
                                            onClick={async () => {
                                              await createDraftLine(idx)
                                            }}
                                            sx={{
                                              backgroundColor: '#3b82f6',
                                              '&:hover': { backgroundColor: '#2563eb' }
                                            }}
                                          >
                                            🔗 ربط مستند موجود
                                          </Button>
                                        </Box>

                                        <Typography variant="caption" sx={{ display: 'block', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>
                                          رفع ملف جديد: سيتم الرفع عند الحفظ | ربط مستند موجود: يفتح إدارة المستندات الكاملة
                                        </Typography>
                                      </>
                                    ) : (
                                      // Line not ready yet - show requirements
                                      <>
                                        <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f1f5f9', fontSize: '15px' }}>
                                          المستندات المرفقة
                                        </Typography>
                                        <Box sx={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                          <AttachFile sx={{ fontSize: 40, opacity: 0.3, marginBottom: '8px' }} />
                                          <Typography variant="body2" sx={{ marginBottom: '8px' }}>
                                            لتفعيل إدارة المستندات:
                                          </Typography>
                                          <Typography variant="caption" sx={{ display: 'block' }}>
                                            1️⃣ اختر الحساب
                                          </Typography>
                                          <Typography variant="caption" sx={{ display: 'block' }}>
                                            2️⃣ أدخل المبلغ (مدين أو دائن)
                                          </Typography>
                                        </Box>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals Display */}
                <div style={{
                  background: totals.totalDebits !== totals.totalCredits ? '#7f1d1d' : '#065f46',
                  padding: '16px',
                  borderRadius: '8px',
                  border: `2px solid ${totals.totalDebits !== totals.totalCredits ? '#dc2626' : '#10b981'}`
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#f1f5f9', marginBottom: '4px' }}>إجمالي المدين</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1f5f9' }}>
                        {totals.totalDebits.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#f1f5f9', marginBottom: '4px' }}>إجمالي الدائن</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1f5f9' }}>
                        {totals.totalCredits.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#f1f5f9', marginBottom: '4px' }}>الفرق</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: totals.totalDebits !== totals.totalCredits ? '#fca5a5' : '#6ee7b7' }}>
                        {totals.diff.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Errors */}
                {(errors.lines || errors.balance) && (
                  <div style={{ marginTop: '16px' }}>
                    {errors.lines && (
                      <Alert severity="error" sx={{ marginBottom: '8px' }}>
                        {errors.lines}
                      </Alert>
                    )}
                    {errors.balance && (
                      <Alert severity="error">
                        {errors.balance}
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Review */}
            {currentStep === 'review' && (
              <div className="step-review" style={{ padding: '20px' }}>
                <Typography variant="h5" sx={{ marginBottom: '20px', color: 'var(--primary)' }}>
                  ✓ مراجعة المعاملة
                </Typography>

                <Alert severity="info" sx={{ marginBottom: '20px' }}>
                  راجع جميع البيانات قبل الحفظ النهائي. يمكنك العودة لأي خطوة سابقة لتعديل البيانات.
                </Alert>

                {/* Success/Error Messages */}
                {errors.success && (
                  <Alert severity="success" sx={{ marginBottom: '20px' }}>
                    {errors.success}
                  </Alert>
                )}
                {Object.keys(errors).length > 0 && !errors.success && (
                  <Alert severity="error" sx={{ marginBottom: '20px' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      يوجد أخطاء في البيانات:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {Object.entries(errors).map(([key, msg]) => (
                        <li key={key}>{msg}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {/* Header Data Review */}
                <Paper elevation={2} sx={{ padding: '20px', marginBottom: '20px' }}>
                  <Typography variant="h6" sx={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📝 بيانات المعاملة الأساسية
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid xs={6}>
                      <Typography variant="body2" color="text.secondary">تاريخ القيد:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{headerData.entry_date}</Typography>
                    </Grid>
                    <Grid xs={6}>
                      <Typography variant="body2" color="text.secondary">المؤسسة:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {organizations.find(o => o.id === headerData.org_id)?.name || '—'}
                      </Typography>
                    </Grid>
                    <Grid xs={12}>
                      <Typography variant="body2" color="text.secondary">وصف المعاملة:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{headerData.description}</Typography>
                    </Grid>
                    {headerData.project_id && (
                      <Grid xs={6}>
                        <Typography variant="body2" color="text.secondary">المشروع:</Typography>
                        <Typography variant="body1">{projects.find(p => p.id === headerData.project_id)?.name || '—'}</Typography>
                      </Grid>
                    )}
                    {headerData.reference_number && (
                      <Grid xs={6}>
                        <Typography variant="body2" color="text.secondary">الرقم المرجعي:</Typography>
                        <Typography variant="body1">{headerData.reference_number}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>

                {/* Lines Review */}
                <Paper elevation={2} sx={{ padding: '20px', marginBottom: '20px' }}>
                  <Typography variant="h6" sx={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 قيود المعاملة ({lines.length} سطر)
                  </Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--divider)' }}>
                          <th style={{ padding: '12px', textAlign: 'center' }}>#</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>الحساب</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>مدين</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>دائن</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>البيان</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, idx) => {
                          const account = accounts.find(a => a.id === line.account_id)
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--divider)' }}>
                              <td style={{ padding: '12px', textAlign: 'center' }}>{line.line_no}</td>
                              <td style={{ padding: '12px' }}>
                                {account ? `${account.code} - ${account.name}` : '—'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: line.debit_amount > 0 ? 'var(--success)' : 'inherit' }}>
                                {line.debit_amount > 0 ? Number(line.debit_amount).toLocaleString('ar-EG') : '—'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: line.credit_amount > 0 ? 'var(--error)' : 'inherit' }}>
                                {line.credit_amount > 0 ? Number(line.credit_amount).toLocaleString('ar-EG') : '—'}
                              </td>
                              <td style={{ padding: '12px' }}>{line.description || '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--divider)', fontWeight: 'bold' }}>
                          <td colSpan={2} style={{ padding: '12px', textAlign: 'right' }}>الإجمالي:</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--success)' }}>
                            {totals.totalDebits.toLocaleString('ar-EG')}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: 'var(--error)' }}>
                            {totals.totalCredits.toLocaleString('ar-EG')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            {totals.isBalanced ? (
                              <Chip label="✓ متوازن" color="success" size="small" />
                            ) : (
                              <Chip label="✗ غير متوازن" color="error" size="small" />
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </Box>
                </Paper>

                {/* Attachments Summary */}
                {(Object.values(lineAttachments).some(files => files.length > 0) || transactionAttachments.length > 0) && (
                  <Paper elevation={2} sx={{ padding: '20px', marginBottom: '20px' }}>
                    <Typography variant="h6" sx={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📎 المرفقات
                    </Typography>
                    {transactionAttachments.length > 0 && (
                      <Box sx={{ marginBottom: '12px' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', marginBottom: '6px' }}>
                          مرفقات المعاملة: {transactionAttachments.length} ملف(ات)
                        </Typography>
                      </Box>
                    )}
                    {Object.entries(lineAttachments).map(([lineIdx, files]) => (
                      files.length > 0 && (
                        <Box key={lineIdx} sx={{ marginBottom: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            السطر {Number(lineIdx) + 1}: {files.length} ملف(ات)
                          </Typography>
                        </Box>
                      )
                    ))}
                  </Paper>
                )}

                {/* Approval Status Preview */}
                {draftTransactionId && (
                  <Box sx={{ marginBottom: '20px' }}>
                    <Alert severity="info" sx={{ marginBottom: '16px' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: '8px' }}>
                        📋 حالة الاعتماد
                      </Typography>
                      <Typography variant="body2">
                        سيتم إرسال هذه المعاملة للاعتماد تلقائياً. سيحتاج كل سطر إلى موافقة منفصلة من المعتمدين المخولين.
                      </Typography>
                    </Alert>
                    <TransactionApprovalStatus transactionId={draftTransactionId} />
                  </Box>
                )}

                {!draftTransactionId && (
                  <Alert severity="success" sx={{ marginBottom: '20px' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: '8px' }}>
                      ✅ جاهز للإرسال
                    </Typography>
                    <Typography variant="body2">
                      عند الضغط على "إرسال للاعتماد"، سيتم حفظ المعاملة وإرسالها تلقائياً لنظام الاعتماد المتدرج.
                    </Typography>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderTop: '1px solid var(--divider)' }}>
            <Button
              variant="outlined"
              startIcon={<NavigateBefore />}
              onClick={handlePrev}
              disabled={currentStepIndex === 0 || isSubmitting}
            >
              السابق
            </Button>

            <Box sx={{ display: 'flex', gap: '12px' }}>
              {currentStep === 'review' ? (
                <>
                  {/* NEW: Save as Draft Button */}
                  <Button
                    variant="outlined"
                    startIcon={<Save />}
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || !totals.isBalanced}
                    size="large"
                    sx={{
                      borderColor: '#94a3b8',
                      color: '#94a3b8',
                      fontWeight: 600,
                      fontSize: '16px',
                      padding: '12px 32px',
                      '&:hover': {
                        borderColor: '#cbd5e1',
                        background: 'rgba(148, 163, 184, 0.1)'
                      },
                      '&:disabled': {
                        borderColor: '#475569',
                        color: '#64748b'
                      }
                    }}
                  >
                    {isSubmitting ? '⏳ جاري الحفظ...' : '💾 حفظ كمسودة'}
                  </Button>

                  {/* Send for Approval Button */}
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Send />}
                    onClick={handleSubmit}
                    disabled={isSubmitting || !totals.isBalanced}
                    size="large"
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      fontWeight: 600,
                      fontSize: '16px',
                      padding: '12px 32px',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      }
                    }}
                  >
                    {isSubmitting ? '⏳ جاري الإرسال...' : '📤 إرسال للاعتماد'}
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  endIcon={<NavigateNext />}
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  التالي
                </Button>
              )}
            </Box>
          </Box>
        </div>
      </DraggablePanelContainer>

      {/* Column Configuration Modal */}
      <Dialog
        open={configModalOpen}
        onClose={handleConfigCancel}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 99999 }}
        PaperProps={{
          sx: {
            backgroundColor: '#1e293b',
            color: '#f1f5f9',
            direction: 'rtl'
          }
        }}
      >
        <Box sx={{ padding: '24px' }}>
          <Typography variant="h6" sx={{ marginBottom: '20px', color: '#3b82f6', fontWeight: 600 }}>
            ⚙️ تخصيص الأعمدة
          </Typography>

          <Box sx={{ marginBottom: '24px' }}>
            {Object.entries(tempColumnConfig).map(([key, config]) => (
              <Box key={key} sx={{ marginBottom: '20px', padding: '16px', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={config.visible}
                      onChange={(e) => {
                        setTempColumnConfig(prev => ({
                          ...prev,
                          [key]: { ...prev[key], visible: e.target.checked }
                        }))
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {config.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    {config.labelEn}
                  </Typography>
                </Box>

                {config.visible && (
                  <Box sx={{ paddingRight: '30px' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', marginBottom: '8px', display: 'block' }}>
                      العرض: {config.width}px
                    </Typography>
                    <input
                      type="range"
                      min="100"
                      max="400"
                      value={config.width}
                      onChange={(e) => {
                        setTempColumnConfig(prev => ({
                          ...prev,
                          [key]: { ...prev[key], width: Number(e.target.value) }
                        }))
                      }}
                      style={{
                        width: '100%',
                        cursor: 'pointer',
                        accentColor: '#3b82f6'
                      }}
                    />
                  </Box>
                )}
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={resetColumnConfig}
              sx={{
                color: '#94a3b8',
                borderColor: '#475569',
                '&:hover': {
                  borderColor: '#64748b',
                  backgroundColor: 'rgba(148, 163, 184, 0.1)'
                }
              }}
            >
              استعادة الافتراضي
            </Button>
            <Button
              variant="outlined"
              onClick={handleConfigCancel}
              sx={{
                color: '#94a3b8',
                borderColor: '#475569',
                '&:hover': {
                  borderColor: '#64748b',
                  backgroundColor: 'rgba(148, 163, 184, 0.1)'
                }
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="contained"
              onClick={handleConfigApply}
              sx={{
                backgroundColor: '#3b82f6',
                '&:hover': {
                  backgroundColor: '#2563eb'
                }
              }}
            >
              تطبيق
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  )
}

export default TransactionWizard
