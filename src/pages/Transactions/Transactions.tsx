import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAccounts, getTransactions, createTransaction, deleteTransaction, postTransaction, updateTransaction, getTransactionAudit, getCurrentUserId, getProjects, type Account, type TransactionRecord, type TransactionAudit, type Project } from '../../services/transactions'
import { getOrganizations } from '../../services/organization'
import type { Organization } from '../../types'
import { useHasPermission } from '../../hooks/useHasPermission'
import './Transactions.css'
import { useToast } from '../../contexts/ToastContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import TransactionView from './TransactionView'
import ClientErrorLogs from '../admin/ClientErrorLogs'
import PermissionBadge from '../../components/Common/PermissionBadge'
import { WithPermission } from '../../components/Common/withPermission'
import { logClientError } from '../../services/telemetry'
import UnifiedCRUDForm, { type UnifiedCRUDFormHandle } from '../../components/Common/UnifiedCRUDForm'
import DraggableResizablePanel from '../../components/Common/DraggableResizablePanel'
import { createTransactionFormConfig } from '../../components/Transactions/TransactionFormConfig'
import { TextField } from '@mui/material'
import { Autocomplete } from '@mui/material'
import ResizableTable from '../../components/Common/ResizableTable'
import ColumnConfiguration from '../../components/Common/ColumnConfiguration'
import type { ColumnConfig } from '../../components/Common/ColumnConfiguration'
import useColumnPreferences from '../../hooks/useColumnPreferences'


interface FilterState {
  dateFrom: string
  dateTo: string
  isPosted: string
  amountFrom: string
  amountTo: string
}

const TransactionsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [_formErrors, _setFormErrors] = useState<Record<string, string>>({})
  const [postingId, setPostingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Unified form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsFor, setDetailsFor] = useState<TransactionRecord | null>(null)
  const [audit, setAudit] = useState<TransactionAudit[]>([])
  
  // Unified form panel state
  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 })
  const [panelSize, setPanelSize] = useState<{ width: number; height: number }>({ width: 800, height: 700 })
  const [panelMax, setPanelMax] = useState<boolean>(false)
  const [panelDocked, setPanelDocked] = useState<boolean>(false)
  const [panelDockPos, setPanelDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>('right')
  
  const formRef = React.useRef<UnifiedCRUDFormHandle>(null)

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    isPosted: '',
    amountFrom: '',
    amountTo: '',
  })
  const [debitFilterId, setDebitFilterId] = useState<string>('')
  const [creditFilterId, setCreditFilterId] = useState<string>('')
  const [orgFilterId, setOrgFilterId] = useState<string>('')
  const [projectFilterId, setProjectFilterId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  
  // Column configuration state
  const [columnConfigOpen, setColumnConfigOpen] = useState(false)

  const location = useLocation()
  const hasPerm = useHasPermission()
  const { showToast } = useToast()
  const [showDiag, setShowDiag] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  // determine mode: my | pending | all
  const mode: 'my' | 'pending' | 'all' = location.pathname.includes('/transactions/my')
    ? 'my'
    : location.pathname.includes('/transactions/pending')
    ? 'pending'
    : 'all'

  // Default column configuration for transactions table
  const defaultColumns: ColumnConfig[] = useMemo(() => [
    { key: 'entry_number', label: 'رقم القيد', visible: true, width: 120, minWidth: 100, maxWidth: 200, type: 'text', resizable: true },
    { key: 'entry_date', label: 'التاريخ', visible: true, width: 130, minWidth: 120, maxWidth: 180, type: 'date', resizable: true },
    { key: 'description', label: 'البيان', visible: true, width: 250, minWidth: 200, maxWidth: 400, type: 'text', resizable: true },
    { key: 'debit_account_label', label: 'الحساب المدين', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'credit_account_label', label: 'الحساب الدائن', visible: true, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'amount', label: 'المبلغ', visible: true, width: 140, minWidth: 120, maxWidth: 200, type: 'currency', resizable: true },
    { key: 'organization_name', label: 'المؤسسة', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'project_name', label: 'المشروع', visible: true, width: 180, minWidth: 150, maxWidth: 250, type: 'text', resizable: true },
    { key: 'reference_number', label: 'المرجع', visible: false, width: 120, minWidth: 100, maxWidth: 180, type: 'text', resizable: true },
    { key: 'notes', label: 'الملاحظات', visible: false, width: 200, minWidth: 150, maxWidth: 300, type: 'text', resizable: true },
    { key: 'created_by_name', label: 'أنشئت بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'posted_by_name', label: 'مرحلة بواسطة', visible: false, width: 140, minWidth: 120, maxWidth: 200, type: 'text', resizable: true },
    { key: 'status', label: 'الحالة', visible: true, width: 100, minWidth: 80, maxWidth: 150, type: 'text', resizable: true },
    { key: 'actions', label: 'الإجراءات', visible: true, width: 200, minWidth: 180, maxWidth: 250, type: 'actions', resizable: false }
  ], [])

  // Column preferences hook
  const {
    columns,
    handleColumnResize,
    handleColumnConfigChange,
    resetToDefaults
  } = useColumnPreferences({
    storageKey: 'transactions_table_columns',
    defaultColumns,
    userId: currentUserId || undefined
  })

  // Server-side load
  const [totalCount, setTotalCount] = useState(0)
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [accs, projectsList, orgsList, uid] = await Promise.all([
          getAccounts(),
          getProjects().catch(() => []), // Don't fail if projects service isn't available
          getOrganizations().catch(() => []), // Don't fail if organizations service isn't available
          getCurrentUserId(),
        ])
        setAccounts(accs)
        setProjects(projectsList)
        setOrganizations(orgsList)
        setCurrentUserId(uid)
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
    getAccounts().then(setAccounts).catch(() => {})
  }, [formOpen])

  async function reload() {
    const { rows, total } = await getTransactions({
      filters: {
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
      },
      page,
      pageSize,
    })
    setTransactions(rows)
    setTotalCount(total)
    // resolve creator/poster names
    const ids: string[] = []
    rows.forEach(t => { if (t.created_by) ids.push(t.created_by); if (t.posted_by) ids.push(t.posted_by!) })
    try {
      const { getUserDisplayMap } = await import('../../services/transactions')
      const map = await getUserDisplayMap(ids)
      setUserNames(map)
    } catch {}
  }

  // With server-side, filtered equals transactions
  const filtered = transactions

  // Pagination handled server-side; local page shows fetched rows
  const paged = transactions

  // Prepare table data for ResizableTable
  const tableData = useMemo(() => {
    const accLabel = (id?: string | null) => {
      if (!id) return ''
      const a = accounts.find(x => x.id === id)
      return a ? `${a.code} - ${a.name}` : id
    }

    return paged.map((t) => ({
      entry_number: t.entry_number,
      entry_date: t.entry_date, // Keep raw date for DateFormatter
      description: t.description,
      debit_account_label: accLabel(t.debit_account_id),
      credit_account_label: accLabel(t.credit_account_id),
      amount: t.amount,
      organization_name: organizations.find(o => o.id === (t.org_id || ''))?.name || '—',
      project_name: projects.find(p => p.id === (t.project_id || ''))?.name || '—',
      reference_number: t.reference_number || '—',
      notes: t.notes || '—',
      created_by_name: t.created_by ? (userNames[t.created_by] || t.created_by.substring(0, 8)) : '—',
      posted_by_name: t.posted_by ? (userNames[t.posted_by] || t.posted_by.substring(0, 8)) : '—',
      status: t.is_posted ? 'مرحلة' : 'غير مرحلة',
      actions: null, // Will be handled by renderCell
      original: t // Keep reference to original transaction for actions
    }))
  }, [paged, accounts, userNames])

  // Export data
  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'entry_number', header: 'رقم القيد', type: 'text' },
      { key: 'entry_date', header: 'التاريخ', type: 'date' },
      { key: 'description', header: 'البيان', type: 'text' },
      { key: 'debit_account', header: 'الحساب المدين', type: 'text' },
      { key: 'credit_account', header: 'الحساب الدائن', type: 'text' },
      { key: 'amount', header: 'المبلغ', type: 'currency' },
      { key: 'organization_name', header: 'المؤسسة', type: 'text' },
      { key: 'project_name', header: 'المشروع', type: 'text' },
      { key: 'reference_number', header: 'المرجع', type: 'text' },
      { key: 'notes', header: 'الملاحظات', type: 'text' },
      { key: 'created_by', header: 'أنشئت بواسطة', type: 'text' },
      { key: 'posted_by', header: 'مرحلة بواسطة', type: 'text' },
      { key: 'posted_at', header: 'تاريخ الترحيل', type: 'date' },
      { key: 'status', header: 'الحالة', type: 'text' },
    ])
    const accLabel = (id?: string | null) => {
      if (!id) return ''
      const a = accounts.find(x => x.id === id)
      return a ? `${a.code} - ${a.name}` : id
    }
    const rows = filtered.map((t) => ({
      entry_number: t.entry_number,
      entry_date: t.entry_date,
      description: t.description,
      debit_account: accLabel(t.debit_account_id),
      credit_account: accLabel(t.credit_account_id),
      amount: t.amount,
      organization_name: organizations.find(o => o.id === (t.org_id || ''))?.name || '',
      project_name: projects.find(p => p.id === (t.project_id || ''))?.name || '',
      reference_number: t.reference_number || '',
      notes: t.notes || '',
      created_by: t.created_by ? (userNames[t.created_by] || t.created_by) : '',
      posted_by: t.posted_by ? (userNames[t.posted_by] || t.posted_by) : '',
      posted_at: t.posted_at || null,
      status: t.is_posted ? 'مرحلة' : 'غير مرحلة',
    }))
    return prepareTableData(columns, rows)
  }, [transactions, userNames, accounts])

  // Create unified form configuration
  const transactionFormConfig = useMemo(() => {
    return createTransactionFormConfig(
      editingTx !== null,
      accounts,
      projects,
      organizations,
      editingTx || undefined
    )
  }, [editingTx, accounts, projects, organizations])
  
  // Get initial data for the form
  const getInitialFormData = useMemo(() => {
    if (editingTx) {
      return {
        entry_number: editingTx.entry_number,
        entry_date: editingTx.entry_date,
        description: editingTx.description,
        debit_account_id: editingTx.debit_account_id,
        credit_account_id: editingTx.credit_account_id,
        amount: editingTx.amount,
        reference_number: editingTx.reference_number || '',
        notes: editingTx.notes || '',
        organization_id: editingTx.org_id || '',
        project_id: editingTx.project_id || ''
      }
    } else {
      // Get default organization (MAIN) and project (GENERAL)
      const defaultOrg = organizations.find(org => org.code === 'MAIN');
      const defaultProject = projects.find(project => project.code === 'GENERAL');
      
      return {
        entry_number: 'سيتم توليده تلقائياً',
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        debit_account_id: '',
        credit_account_id: '',
        amount: 0,
        reference_number: '',
        notes: '',
        organization_id: defaultOrg?.id || '',
        project_id: defaultProject?.id || ''
      }
    }
  }, [editingTx, organizations, projects])

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

      if (editingTx) {
        // Update existing transaction
        const updated = await updateTransaction(editingTx.id, {
          entry_date: data.entry_date,
          description: data.description,
          reference_number: data.reference_number || null,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          notes: data.notes || null,
          org_id: data.organization_id || null,
          project_id: data.project_id || null,
        })
        // Ensure display fields (organization_name/project_name) are updated locally
        const updatedEnriched = enrichTx(updated)
        setTransactions(prev => prev.map(t => t.id === updated.id ? updatedEnriched : t))
        showToast('تم تحديث المعاملة', { severity: 'success' })
        // Ensure server truth is reflected (joins, computed fields)
        await reload()
      } else {
        // Create new transaction with optimistic update
        const tempId = `temp-${Date.now()}`
        const temp: TransactionRecord = {
          id: tempId,
          entry_number: data.entry_number,
          entry_date: data.entry_date,
          description: data.description,
          reference_number: data.reference_number || null,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          notes: data.notes || null,
          org_id: data.organization_id || null,
          project_id: data.project_id || null,
          is_posted: false,
          posted_at: null,
          posted_by: null,
          created_by: currentUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        // Enrich optimistic row for immediate display
        const tempEnriched = enrichTx(temp)
        setTransactions(prev => [tempEnriched as any, ...prev])

        const rec = await createTransaction({
          entry_number: data.entry_number,
          entry_date: data.entry_date,
          description: data.description,
          reference_number: data.reference_number || undefined,
          debit_account_id: data.debit_account_id,
          credit_account_id: data.credit_account_id,
          amount: parseFloat(data.amount),
          notes: data.notes || undefined,
          org_id: data.organization_id || undefined,
          project_id: data.project_id || undefined,
        })
        // Replace temp with real and enrich for display
        const recEnriched = enrichTx(rec)
        setTransactions(prev => prev.map(t => t.id === tempId ? (recEnriched as any) : t))
        showToast('تم إنشاء المعاملة', { severity: 'success' })
        // Refresh to load full server-side record
        await reload()
      }

      setEditingTx(null)
      setFormOpen(false)
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
        extra: editingTx ? { id: editingTx.id } : data
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleFormCancel = () => {
    setEditingTx(null)
    setFormOpen(false)
    _setFormErrors({})
  }

  const openNewTransactionForm = () => {
    setEditingTx(null)
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

  const handlePost = async (id: string) => {
    const ok = window.confirm('تأكيد الترحيل؟ لا يمكن التراجع عن هذا الإجراء.')
    if (!ok) return
    setPostingId(id)
    // optimistic mark posted
    const prev = transactions
    const rec = transactions.find(t => t.id === id)
    const optimistic = transactions.map(t => t.id === id ? { ...t, is_posted: true, posted_at: new Date().toISOString() } as TransactionRecord : t)
    setTransactions(optimistic)
    try {
      await postTransaction(id)
      showToast('تم ترحيل المعاملة', { severity: 'success' })
    } catch (e: any) {
      // rollback
      setTransactions(prev)
      const detail = rec ? ` (رقم القيد ${rec.entry_number})` : ''
      const msg = e?.message || ''
      showToast(`فشل ترحيل المعاملة${detail}. تم التراجع عن العملية. السبب: ${msg}`.trim(), { severity: 'error' })
      logClientError({ context: 'transactions.post', message: msg, extra: { id } })
    } finally {
      setPostingId(null)
    }
  }

  useEffect(() => { reload().catch(() => {}) }, [searchTerm, filters.dateFrom, filters.dateTo, filters.amountFrom, filters.amountTo, debitFilterId, creditFilterId, orgFilterId, projectFilterId, page, pageSize, mode])

  if (loading) return <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
  if (error) return <div className="error-container">خطأ: {error}</div>

  return (
    <div className="transactions-container" dir="rtl">
      <div className="transactions-header">
        <h1 className="transactions-title">المعاملات</h1>
        <div className="transactions-actions">
          {mode === 'my' && (
            <WithPermission perm="transactions.create">
              <button className="ultimate-btn ultimate-btn-add" onClick={openNewTransactionForm}>
                <div className="btn-content"><span className="btn-text">+ معاملة جديدة</span></div>
              </button>
            </WithPermission>
          )}
          <button className="ultimate-btn ultimate-btn-edit" onClick={() => setColumnConfigOpen(true)}>
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
            {['transactions.create','transactions.update','transactions.delete','transactions.post','transactions.manage'].map(key => (
              <PermissionBadge key={key} allowed={hasPerm(key)} label={key} />
            ))}
          </div>
        </div>
      )}

      {/* Compact unified filters row - inspired by General Ledger */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 0',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border)',
        fontSize: '12px',
        backgroundColor: 'var(--surface)'
      }}>
        {/* Search */}
        <input
          placeholder="بحث..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
          style={{
            width: '120px',
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)'
          }}
        />
        
        {/* Date range */}
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1) }}
          style={{
            width: '130px',
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)'
          }}
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1) }}
          style={{
            width: '130px',
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)'
          }}
        />
        
        {/* Status filter */}
        <select
          value={filters.isPosted}
          onChange={e => { setFilters({ ...filters, isPosted: e.target.value }); setPage(1) }}
          style={{
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)',
            minWidth: '90px'
          }}
        >
          <option value="">الحالة</option>
          <option value="posted">مرحلة</option>
          <option value="unposted">غير مرحلة</option>
        </select>
        
        {/* Organization filter */}
        <select
          value={orgFilterId}
          onChange={e => { setOrgFilterId(e.target.value); setPage(1) }}
          style={{
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)',
            maxWidth: '180px'
          }}
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
          style={{
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)',
            maxWidth: '180px'
          }}
        >
          <option value="">جميع المشاريع</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {`${p.code} - ${p.name}`.substring(0, 40)}
            </option>
          ))}
        </select>
        
        {/* Debit account filter */}
        <select
          value={debitFilterId}
          onChange={e => { setDebitFilterId(e.target.value); setPage(1) }}
          style={{
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)',
            maxWidth: '200px'
          }}
        >
          <option value="">جميع الحسابات المدينة</option>
          {accounts.filter(a => a.is_postable).map(a => (
            <option key={a.id} value={a.id}>
              {`${a.code} - ${a.name}`.substring(0, 45)}
            </option>
          ))}
        </select>
        
        {/* Credit account filter */}
        <select
          value={creditFilterId}
          onChange={e => { setCreditFilterId(e.target.value); setPage(1) }}
          style={{
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)',
            maxWidth: '200px'
          }}
        >
          <option value="">جميع الحسابات الدائنة</option>
          {accounts.filter(a => a.is_postable).map(a => (
            <option key={a.id} value={a.id}>
              {`${a.code} - ${a.name}`.substring(0, 45)}
            </option>
          ))}
        </select>
        
        {/* Amount range filters */}
        <input
          type="number"
          placeholder="من مبلغ"
          value={filters.amountFrom}
          onChange={e => { setFilters({ ...filters, amountFrom: e.target.value }); setPage(1) }}
          style={{
            width: '90px',
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)'
          }}
        />
        <input
          type="number"
          placeholder="إلى مبلغ"
          value={filters.amountTo}
          onChange={e => { setFilters({ ...filters, amountTo: e.target.value }); setPage(1) }}
          style={{
            width: '90px',
            fontSize: '12px',
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--field_bg)',
            color: 'var(--text)'
          }}
        />
        
        {/* Clear filters button */}
        <button
          onClick={() => {
            setSearchTerm('')
            setFilters({ dateFrom: '', dateTo: '', isPosted: '', amountFrom: '', amountTo: '' })
            setDebitFilterId('')
            setCreditFilterId('')
            setOrgFilterId('')
            setProjectFilterId('')
            setPage(1)
          }}
          style={{
            fontSize: '20px',
            padding: '6px 12px',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            backgroundColor: 'var(--warning)',
            color: '#000000',
            cursor: 'pointer',
            minWidth: '40px',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
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
            <button className="ultimate-btn" onClick={() => reload().catch(() => {})}>
              <div className="btn-content"><span className="btn-text">تحديث</span></div>
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
        <ResizableTable
          columns={columns}
          data={tableData}
          onColumnResize={handleColumnResize}
          className="transactions-resizable-table"
          isLoading={loading}
          emptyMessage="لا توجد معاملات"
          renderCell={(_value, column, row, _rowIndex) => {
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
                    setDetailsOpen(true)
                  }}><div className="btn-content"><span className="btn-text">تفاصيل</span></div></button>
                  {/* Approve/Post in pending mode if permitted */}
                  {mode === 'pending' && !row.original.is_posted && (
                    <WithPermission perm="transactions.post">
                    <button className="ultimate-btn ultimate-btn-success" onClick={() => handlePost(row.original.id)} disabled={postingId === row.original.id}>
                      <div className="btn-content"><span className="btn-text">{postingId === row.original.id ? 'جارٍ الترحيل...' : 'ترحيل'}</span></div>
                    </button>
                    </WithPermission>
                  )}
                  {/* Edit (my) */}
                  {mode === 'my' && !row.original.is_posted && hasPerm('transactions.update') && row.original.created_by === currentUserId && (
                    <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                      setEditingTx(row.original)
                      setFormOpen(true)
                    }}><div className="btn-content"><span className="btn-text">تعديل</span></div></button>
                  )}
                  {/* Edit (all) via manage */}
                  {mode === 'all' && !row.original.is_posted && hasPerm('transactions.manage') && (
                    <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                      setEditingTx(row.original)
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
        title={editingTx ? 'تعديل المعاملة' : 'معاملة جديدة'}
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
          <div className="panel-actions">
            <button
              className="ultimate-btn"
              title="تحديث قائمة الحسابات"
              onClick={() => getAccounts().then(setAccounts).catch(() => {})}
            >
              <div className="btn-content"><span className="btn-text">تحديث الحسابات</span></div>
            </button>
          </div>
          <UnifiedCRUDForm
            ref={formRef}
            config={transactionFormConfig}
            initialData={getInitialFormData}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isLoading={isSaving}
          />
      </DraggableResizablePanel>
      
      {/* Details Drawer */}
      {detailsOpen && detailsFor && (
        <TransactionView transaction={detailsFor} audit={audit} userNames={userNames} onClose={() => setDetailsOpen(false)} />
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

      {/* Column Configuration Modal */}
      <ColumnConfiguration
        columns={columns}
        onConfigChange={handleColumnConfigChange}
        isOpen={columnConfigOpen}
        onClose={() => setColumnConfigOpen(false)}
        onReset={resetToDefaults}
      />
    </div>
  )
}

export default TransactionsPage



