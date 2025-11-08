import React, { useState, useMemo, useEffect, useCallback } from 'react'
import DraggablePanelContainer from '../Common/DraggablePanelContainer'
import type { Account, Project } from '../../services/transactions'
import type { Organization } from '../../types'
import type { TransactionClassification } from '../../services/transaction-classification'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import type { WorkItemRow } from '../../types/work-items'
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
  StepButton
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
  ExpandLess
} from '@mui/icons-material'
import './TransactionWizard.css'

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
}

type StepType = 'basic' | 'lines' | 'review'

const steps: Array<{ id: StepType; label: string; icon: string }> = [
  { id: 'basic', label: 'المعلومات الأساسية', icon: '📝' },
  { id: 'lines', label: 'بنود المعاملة', icon: '📊' },
  { id: 'review', label: 'المراجعة والحفظ', icon: '✓' }
]

interface TxLine {
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
  costCenters = []
}) => {
  const [currentStep, setCurrentStep] = useState<StepType>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Header data (transactions table)
  const [headerData, setHeaderData] = useState<Record<string, any>>(() => {
    const today = new Date().toISOString().split('T')[0]
    const defaultOrgId = localStorage.getItem('default_org_id') || (organizations[0]?.id || '')
    const defaultProjectId = localStorage.getItem('default_project_id') || ''
    return {
      entry_date: today,
      description: '',
      description_ar: '',
      org_id: defaultOrgId,
      project_id: defaultProjectId,
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
    // Esc: Close
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
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
    return projects.filter(p => p.org_id === headerData.org_id)
  }, [projects, headerData.org_id])

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

  const handleSubmit = async () => {
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
        }
      }
      
      // Call onSubmit which should save to Supabase
      await onSubmit(finalData)
      
      // Show success message
      setErrors({ success: '✅ تم حفظ المعاملة بنجاح!' })
      
      // Wait 2 seconds to show success message, then close
      setTimeout(() => {
        // Reset form and close
        setTransactionAttachments([])
        setLineAttachments({})
        setCompletedSteps(new Set())
        setHeaderData({
          entry_date: new Date().toISOString().split('T')[0],
          description: '',
          description_ar: '',
          org_id: localStorage.getItem('default_org_id') || (organizations[0]?.id || ''),
          project_id: localStorage.getItem('default_project_id') || '',
          // reset defaults
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

  if (!open) return null

  return (
    <DraggablePanelContainer
      storageKey="txWizard"
      isOpen={open}
      onClose={onClose}
      title="معاملة جديدة - خطوة بخطوة"
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
                      <select
                        value={headerData.org_id}
                        onChange={(e) => setHeaderData(prev => ({ ...prev, org_id: e.target.value, project_id: '' }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: `2px solid ${errors.org_id ? '#ef4444' : '#475569'}`,
                          fontSize: '14px',
                          backgroundColor: '#334155',
                          color: '#f1f5f9',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="" disabled>اختر المؤسسة...</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.code} - {org.name}</option>
                        ))}
                      </select>
                      {errors.org_id && (
                        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.org_id}</div>
                      )}
                      {!errors.org_id && (
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
                      <select
                        value={headerData.project_id}
                        onChange={(e) => setHeaderData(prev => ({ ...prev, project_id: e.target.value }))}
                        disabled={!headerData.org_id}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '2px solid #475569',
                          fontSize: '14px',
                          backgroundColor: !headerData.org_id ? '#1e293b' : '#334155',
                          color: '#f1f5f9',
                          fontFamily: 'inherit',
                          cursor: !headerData.org_id ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <option value="">بدون مشروع</option>
                        {filteredProjects.map(proj => (
                          <option key={proj.id} value={proj.id}>{proj.code} - {proj.name}</option>
                        ))}
                      </select>
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

              {/* Add Line Button */}
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
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
                              <select
                                value={line.account_id}
                                onChange={(e) => updateLine(idx, { account_id: e.target.value })}
                                style={{ 
                                  width: '100%', 
                                  padding: '8px', 
                                  borderRadius: '4px', 
                                  border: `2px solid ${errors[`line_${idx}_account`] ? '#ef4444' : '#475569'}`,
                                  fontSize: '13px',
                                  backgroundColor: '#334155',
                                  color: '#f1f5f9'
                                }}
                              >
                                <option value="">اختر الحساب...</option>
                                {postableAccounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                ))}
                              </select>
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
                              <td colSpan={6} style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                              {/* Project */}
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>المشروع</label>
                                <select
                                  value={line.project_id || ''}
                                  onChange={(e) => updateLine(idx, { project_id: e.target.value || undefined })}
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', fontSize: '13px', backgroundColor: '#334155', color: '#f1f5f9' }}
                                  disabled={!headerData.org_id}
                                >
                                  <option value="">بدون مشروع</option>
                                  {filteredProjects.map(proj => (
                                    <option key={proj.id} value={proj.id}>{proj.code} - {proj.name}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Cost Center */}
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>مركز التكلفة</label>
                                <select
                                  value={line.cost_center_id || ''}
                                  onChange={(e) => updateLine(idx, { cost_center_id: e.target.value || undefined })}
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', fontSize: '13px', backgroundColor: '#334155', color: '#f1f5f9' }}
                                >
                                  <option value="">بدون مركز تكلفة</option>
                                  {costCenters.map(cc => (
                                    <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Classification */}
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>تصنيف المعاملة</label>
                                <select
                                  value={line.classification_id || ''}
                                  onChange={(e) => updateLine(idx, { classification_id: e.target.value || undefined })}
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', fontSize: '13px', backgroundColor: '#334155', color: '#f1f5f9' }}
                                >
                                  <option value="">بدون تصنيف</option>
                                  {classifications.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.code} - {cls.name}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Work Item */}
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>عنصر العمل</label>
                                <select
                                  value={line.work_item_id || ''}
                                  onChange={(e) => updateLine(idx, { work_item_id: e.target.value || undefined })}
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', fontSize: '13px', backgroundColor: '#334155', color: '#f1f5f9' }}
                                >
                                  <option value="">بدون عنصر</option>
                                  {workItems.map(wi => (
                                    <option key={wi.id} value={wi.id}>{wi.code} - {wi.name}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Sub Tree */}
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>الشجرة الفرعية</label>
                                <select
                                  value={line.sub_tree_id || ''}
                                  onChange={(e) => updateLine(idx, { sub_tree_id: e.target.value || undefined })}
                                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', fontSize: '13px', backgroundColor: '#334155', color: '#f1f5f9' }}
                                >
                                  <option value="">بدون شجرة فرعية</option>
                                  {categories.filter(c => c.org_id === (line.org_id || headerData.org_id)).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.code} - {cat.description}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            {(errors[`line_${idx}_amount`] || errors[`line_${idx}_xor`]) && (
                              <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px' }}>
                                {errors[`line_${idx}_amount`] || errors[`line_${idx}_xor`]}
                              </div>
                            )}
                            
                            {/* Per-line attachments - Using AttachDocumentsPanel style */}
                            <div style={{ marginTop: '16px', background: '#0f172a', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f1f5f9', fontSize: '15px' }}>
                                المستندات المرفقة
                              </Typography>
                              <Box sx={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                <Button
                                  variant="outlined"
                                  component="label"
                                  size="small"
                                  sx={{
                                    borderColor: '#3b82f6',
                                    color: '#3b82f6',
                                    fontSize: '12px',
                                    padding: '6px 12px',
                                    '&:hover': {
                                      borderColor: '#60a5fa',
                                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                                    }
                                  }}
                                >
                                  Select
                                  <input
                                    type="file"
                                    hidden
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        setLineAttachments(prev => ({
                                          ...prev,
                                          [idx]: [...(prev[idx] || []), ...Array.from(e.target.files!)]
                                        }))
                                      }
                                    }}
                                  />
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  disabled
                                  sx={{
                                    borderColor: '#475569',
                                    color: '#94a3b8',
                                    fontSize: '12px',
                                    padding: '6px 12px'
                                  }}
                                >
                                  Generate from Template
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  disabled
                                  sx={{
                                    borderColor: '#475569',
                                    color: '#94a3b8',
                                    fontSize: '12px',
                                    padding: '6px 12px'
                                  }}
                                >
                                  Link existing
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  disabled
                                  sx={{
                                    borderColor: '#475569',
                                    color: '#94a3b8',
                                    fontSize: '12px',
                                    padding: '6px 12px'
                                  }}
                                >
                                  Refresh
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  component="label"
                                  sx={{
                                    backgroundColor: '#3b82f6',
                                    color: '#fff',
                                    fontSize: '12px',
                                    padding: '6px 12px',
                                    '&:hover': {
                                      backgroundColor: '#2563eb'
                                    }
                                  }}
                                >
                                  Upload & Link
                                  <input
                                    type="file"
                                    hidden
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                                    onChange={(e) => {
                                      if (e.target.files) {
                                        setLineAttachments(prev => ({
                                          ...prev,
                                          [idx]: [...(prev[idx] || []), ...Array.from(e.target.files!)]
                                        }))
                                      }
                                    }}
                                  />
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  disabled
                                  sx={{
                                    borderColor: '#475569',
                                    color: '#94a3b8',
                                    fontSize: '12px',
                                    padding: '6px 12px'
                                  }}
                                >
                                  Documents
                                </Button>
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                {lineAttachments[idx]?.map((file, fIdx) => (
                                  <Paper key={fIdx} sx={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <AttachFile sx={{ color: '#3b82f6', fontSize: 20 }} />
                                      <Box>
                                        <Typography variant="body2" sx={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 500 }}>{file.name}</Typography>
                                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                          {(file.size / 1024).toFixed(2)} KB
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setLineAttachments(prev => ({
                                          ...prev,
                                          [idx]: prev[idx].filter((_, i) => i !== fIdx)
                                        }))
                                      }}
                                      sx={{ color: '#ef4444' }}
                                    >
                                      <DeleteOutline fontSize="small" />
                                    </IconButton>
                                  </Paper>
                                ))}
                                {(!lineAttachments[idx] || lineAttachments[idx].length === 0) && (
                                  <Box sx={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                    <AttachFile sx={{ fontSize: 40, opacity: 0.3, marginBottom: '8px' }} />
                                    <Typography variant="body2">لم يتم إرفاق مستندات</Typography>
                                  </Box>
                                )}
                              </Box>
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

              {/* Totals Summary */}
              <div style={{ 
                background: totals.isBalanced ? 'var(--success-bg)' : 'var(--danger-bg)', 
                padding: '16px', 
                borderRadius: '6px',
                border: `2px solid ${totals.isBalanced ? 'var(--success)' : 'var(--danger)'}`
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '14px' }}>
                  <div>
                    <strong>إجمالي المدين:</strong>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
                      {totals.totalDebits.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </div>
                  </div>
                  <div>
                    <strong>إجمالي الدائن:</strong>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
                      {totals.totalCredits.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </div>
                  </div>
                  <div>
                    <strong>الفرق:</strong>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
                      {totals.diff.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </div>
                  </div>
                  <div>
                    <strong>الحالة:</strong>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
                      {totals.isBalanced ? '✅ متوازن' : '❌ غير متوازن'}
                    </div>
                  </div>
                </div>
              </div>

              {errors.balance && (
                <div style={{ color: 'var(--danger)', padding: '12px', background: 'var(--danger-bg)', borderRadius: '6px', marginTop: '12px' }}>
                  {errors.balance}
                </div>
              )}
              {errors.lines && (
                <div style={{ color: 'var(--danger)', padding: '12px', background: 'var(--danger-bg)', borderRadius: '6px', marginTop: '12px' }}>
                  {errors.lines}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Attachments */}
          {currentStep === 'attachments' && (
            <div className="step-attachments" style={{ padding: '20px' }}>
              <Typography variant="h5" sx={{ marginBottom: '20px', color: 'var(--primary)' }}>
                📎 مرفقات ووثائق المعاملة
              </Typography>

              <Alert severity="info" sx={{ marginBottom: '20px' }}>
                قم بإرفاق المستندات الداعمة للمعاملة (فواتير، إيصالات، عقود، إلخ). هذه الخطوة اختيارية.
              </Alert>

              <Paper elevation={2} sx={{ padding: '20px', marginBottom: '20px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <Typography variant="h6">
                    📄 مرفقات على مستوى المعاملة
                  </Typography>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<AttachFile />}
                    size="small"
                  >
                    إضافة ملفات
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        if (e.target.files) {
                          setTransactionAttachments(prev => [...prev, ...Array.from(e.target.files!)])
                        }
                      }}
                    />
                  </Button>
                </Box>

                {transactionAttachments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', padding: '40px', color: 'text.secondary' }}>
                    <AttachFile sx={{ fontSize: 60, opacity: 0.3, marginBottom: '10px' }} />
                    <Typography>لم يتم إرفاق أي ملفات بعد</Typography>
                    <Typography variant="caption">اضغط "إضافة ملفات" لإرفاق الوثائق</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {transactionAttachments.map((file, idx) => (
                      <Paper key={idx} elevation={1} sx={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AttachFile sx={{ color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body2">{file.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(file.size / 1024).toFixed(2)} KB
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setTransactionAttachments(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Paper>

              <Paper elevation={2} sx={{ padding: '20px' }}>
                <Typography variant="h6" sx={{ marginBottom: '16px' }}>
                  📂 مرفقات على مستوى القيود
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '16px' }}>
                  يمكنك أيضاً ربط ملفات محددة بقيود معينة. ارجع للخطوة السابقة (القيود التفصيلية) لإضافة مرفقات لكل قيد.
                </Typography>
                {Object.entries(lineAttachments).map(([lineIdx, files]) => (
                  files.length > 0 && (
                    <Box key={lineIdx} sx={{ marginBottom: '12px' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginBottom: '6px' }}>
                        السطر {Number(lineIdx) + 1}: {files.length} ملف(ات)
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {files.map((file, fIdx) => (
                          <Chip
                            key={fIdx}
                            label={file.name}
                            size="small"
                            onDelete={() => {
                              setLineAttachments(prev => ({
                                ...prev,
                                [lineIdx]: prev[Number(lineIdx)].filter((_, i) => i !== fIdx)
                              }))
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )
                ))}
                {Object.values(lineAttachments).every(files => files.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', padding: '20px' }}>
                    لم يتم إرفاق ملفات بقيود محددة
                  </Typography>
                )}
              </Paper>
            </div>
          )}

          {/* STEP 4: Review */}
          {currentStep === 'review' && (
            <div className="step-review" style={{ padding: '20px' }}>
              {/* Success/Error Messages */}
              {errors.success && (
                <Alert severity="success" sx={{ marginBottom: '20px' }}>
                  {errors.success}
                </Alert>
              )}
              {errors.submit && (
                <Alert severity="error" sx={{ marginBottom: '20px' }}>
                  {errors.submit}
                </Alert>
              )}
              
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>مراجعة المعاملة قبل الحفظ</h3>

              {/* Header Info */}
              <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid var(--border)' }}>
                <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--secondary)' }}>المعلومات الأساسية</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
                  <div><strong>تاريخ القيد:</strong> {new Date(headerData.entry_date).toLocaleDateString('ar-EG')}</div>
                  <div><strong>المؤسسة:</strong> {organizations.find(o => o.id === headerData.org_id)?.name || '—'}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>وصف المعاملة:</strong> {headerData.description}</div>
                  {headerData.classification_id && (
                    <div><strong>تصنيف المعاملة:</strong> {classifications.find(c => c.id === headerData.classification_id)?.name}</div>
                  )}
                  {headerData.description_ar && <div style={{ gridColumn: '1 / -1' }}><strong>الوصف بالعربي:</strong> {headerData.description_ar}</div>}
                  {headerData.project_id && <div><strong>المشروع:</strong> {projects.find(p => p.id === headerData.project_id)?.name || '—'}</div>}
                  {headerData.reference_number && <div><strong>الرقم المرجعي:</strong> {headerData.reference_number}</div>}
                  {headerData.notes && <div style={{ gridColumn: '1 / -1' }}><strong>ملاحظات:</strong> {headerData.notes}</div>}
                </div>
              </div>

              {/* Lines Summary */}
              <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid var(--border)' }}>
                <h4 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--secondary)' }}>القيود التفصيلية ({lines.length} سطر)</h4>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '8px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>الحساب</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>مدين</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>دائن</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>الوصف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const account = accounts.find(a => a.id === line.account_id)
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px' }}>{account ? `${account.code} - ${account.name}` : '—'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: line.debit_amount > 0 ? 'bold' : 'normal' }}>
                            {line.debit_amount > 0 ? line.debit_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: line.credit_amount > 0 ? 'bold' : 'normal' }}>
                            {line.credit_amount > 0 ? line.credit_amount.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td style={{ padding: '8px' }}>{line.description || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold' }}>
                      <td colSpan={2} style={{ padding: '8px', textAlign: 'left' }}>الإجمالي:</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--success)' }}>
                        {totals.totalDebits.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--danger)' }}>
                        {totals.totalCredits.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ر.س
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Attachments Summary */}
              {(transactionAttachments.length > 0 || Object.values(lineAttachments).some(files => files.length > 0)) && (
                <Paper elevation={2} sx={{ padding: '16px', marginBottom: '20px' }}>
                  <Typography variant="h6" sx={{ marginBottom: '12px', color: 'var(--secondary)' }}>
                    📎 المرفقات
                  </Typography>
                  {transactionAttachments.length > 0 && (
                    <Box sx={{ marginBottom: '12px' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginBottom: '6px' }}>
                        مرفقات على مستوى المعاملة: {transactionAttachments.length} ملف(ات)
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {transactionAttachments.map((file, idx) => (
                          <Chip key={idx} label={file.name} size="small" icon={<AttachFile />} />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {Object.entries(lineAttachments).map(([lineIdx, files]) => (
                    files.length > 0 && (
                      <Box key={lineIdx} sx={{ marginBottom: '8px' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', marginBottom: '6px' }}>
                          السطر {Number(lineIdx) + 1}: {files.length} ملف(ات)
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {files.map((file, fIdx) => (
                            <Chip key={fIdx} label={file.name} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )
                  ))}
                </Paper>
              )}

              {/* Balance Status */}
              <div style={{ 
                background: totals.isBalanced ? 'var(--success-bg)' : 'var(--danger-bg)', 
                padding: '16px', 
                borderRadius: '6px',
                border: `2px solid ${totals.isBalanced ? 'var(--success)' : 'var(--danger)'}`
              }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
                  {totals.isBalanced ? (
                    <>✅ القيود متوازنة - جاهزة للحفظ</>
                  ) : (
                    <>❌ القيود غير متوازنة - الفرق: {totals.diff.toFixed(2)} ر.س</>
                  )}
                </div>
              </div>

              {errors.submit && (
                <div style={{ color: 'var(--danger)', padding: '12px', background: 'var(--danger-bg)', borderRadius: '6px', marginTop: '12px' }}>
                  {errors.submit}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation with Material-UI */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '2px solid var(--border)', gap: '16px' }}>
          <Button
            variant="outlined"
            startIcon={<NavigateBefore />}
            onClick={handlePrev}
            disabled={currentStepIndex === 0 || isSubmitting}
            size="large"
          >
            السابق
          </Button>

          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              الخطوة {currentStepIndex + 1} من {steps.length}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', marginTop: '4px' }}>
              {currentStep === 'review' ? 'Ctrl+Enter للحفظ' : 'Ctrl+Enter للمتابعة'} • Ctrl+B للرجوع • Esc للإغلاق
            </Typography>
          </Box>

          {currentStep === 'review' ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<Save />}
              onClick={handleSubmit}
              disabled={isSubmitting || !totals.isBalanced}
              size="large"
              sx={{ minWidth: '140px' }}
            >
              {isSubmitting ? 'جارِ الحفظ...' : 'حفظ المعاملة'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              endIcon={<NavigateNext />}
              onClick={handleNext}
              disabled={isSubmitting}
              size="large"
            >
              التالي
            </Button>
          )}
        </Box>
      </div>
    </DraggablePanelContainer>
  )
}

export default TransactionWizard
