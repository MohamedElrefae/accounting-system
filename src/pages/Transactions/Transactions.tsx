import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAccounts, getTransactions, createTransaction, deleteTransaction, postTransaction, updateTransaction, getTransactionAudit, generateEntryNumber, getCurrentUserId, type Account, type TransactionRecord, type TransactionAudit } from '../../services/transactions'
import { useHasPermission } from '../../hooks/useHasPermission'
import './Transactions.css'
import { useToast } from '../../contexts/ToastContext'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import TransactionView from './TransactionView'
import ClientErrorLogs from '../admin/ClientErrorLogs'
import { Autocomplete, TextField } from '@mui/material'
import PermissionBadge from '../../components/Common/PermissionBadge'
import { WithPermission } from '../../components/Common/withPermission'
import { logClientError } from '../../services/telemetry'

interface FilterState {
  dateFrom: string
  dateTo: string
  isPosted: string
  amountFrom: string
  amountTo: string
}

const TransactionsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [postingId, setPostingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Simple single-row form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsFor, setDetailsFor] = useState<TransactionRecord | null>(null)
  const [audit, setAudit] = useState<TransactionAudit[]>([])
  const [entryNumber, setEntryNumber] = useState('')
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [debitAccountId, setDebitAccountId] = useState('')
  const [creditAccountId, setCreditAccountId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [notes, setNotes] = useState('')

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    isPosted: '',
    amountFrom: '',
    amountTo: '',
  })
  const [debitFilterId, setDebitFilterId] = useState<string>('')
  const [creditFilterId, setCreditFilterId] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userNames, setUserNames] = useState<Record<string, string>>({})

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

  // Server-side load
  const [totalCount, setTotalCount] = useState(0)
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [accs, uid] = await Promise.all([
          getAccounts(),
          getCurrentUserId(),
        ])
        setAccounts(accs)
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
    setEntryNumber(generateEntryNumber((total || 0) + 1))
  }

  // With server-side, filtered equals transactions
  const filtered = transactions

  // Pagination handled server-side; local page shows fetched rows
  const paged = transactions

  // Export data
  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'entry_number', header: 'رقم القيد', type: 'text' },
      { key: 'entry_date', header: 'التاريخ', type: 'date' },
      { key: 'description', header: 'البيان', type: 'text' },
      { key: 'debit_account', header: 'الحساب المدين', type: 'text' },
      { key: 'credit_account', header: 'الحساب الدائن', type: 'text' },
      { key: 'amount', header: 'المبلغ', type: 'currency' },
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
      reference_number: t.reference_number || '',
      notes: t.notes || '',
      created_by: t.created_by ? (userNames[t.created_by] || t.created_by) : '',
      posted_by: t.posted_by ? (userNames[t.posted_by] || t.posted_by) : '',
      posted_at: t.posted_at || null,
      status: t.is_posted ? 'مرحلة' : 'غير مرحلة',
    }))
    return prepareTableData(columns, rows)
  }, [transactions, userNames, accounts])

  const resetForm = () => {
    setEntryNumber(generateEntryNumber((transactions?.length || 0) + 1))
    setEntryDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setReferenceNumber('')
    setDebitAccountId('')
    setCreditAccountId('')
    setAmount(0)
    setNotes('')
    setFormErrors({})
  }

  const save = async () => {
    setFormErrors({})
    try {
      setIsSaving(true)
      // optimistic prepend a temp record for better UX
      const tempId = `temp-${Date.now()}`
      const temp: TransactionRecord = {
        id: tempId,
        entry_number: entryNumber,
        entry_date: entryDate,
        description,
        reference_number: referenceNumber || null,
        debit_account_id: debitAccountId,
        credit_account_id: creditAccountId,
        amount,
        notes: notes || null,
        is_posted: false,
        posted_at: null,
        posted_by: null,
        created_by: currentUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setTransactions(prev => [temp, ...prev])

      const rec = await createTransaction({
        entry_number: entryNumber,
        entry_date: entryDate,
        description,
        reference_number: referenceNumber || undefined,
        debit_account_id: debitAccountId,
        credit_account_id: creditAccountId,
        amount,
        notes: notes || undefined,
      })
      // replace temp with real
      setTransactions(prev => prev.map(t => t.id === tempId ? rec : t))
      resetForm()
      setFormOpen(false)
    } catch (e: any) {
      // rollback removal of temp
      setTransactions(prev => prev.filter(t => !t.id.startsWith('temp-')))
      const msg = e?.message || 'خطأ في حفظ المعاملة'
      setFormErrors({ general: msg })
      showToast(`فشل إنشاء المعاملة (رقم القيد ${entryNumber}). تم التراجع عن العملية. السبب: ${msg}`.trim(), { severity: 'error' })
      logClientError({
        context: 'transactions.create',
        message: msg,
        extra: { entry_number: entryNumber, entry_date: entryDate, debit_account_id: debitAccountId, credit_account_id: creditAccountId, amount }
      })
    } finally {
      setIsSaving(false)
    }
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

  useEffect(() => { reload().catch(() => {}) }, [searchTerm, filters.dateFrom, filters.dateTo, filters.amountFrom, filters.amountTo, debitFilterId, creditFilterId, page, pageSize, mode])

  if (loading) return <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
  if (error) return <div className="error-container">خطأ: {error}</div>

  return (
    <div className="transactions-container" dir="rtl">
      <div className="transactions-header">
        <h1 className="transactions-title">المعاملات</h1>
        <div className="transactions-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {mode === 'my' && (
            <WithPermission perm="transactions.create">
              <button className="ultimate-btn ultimate-btn-add" onClick={() => { resetForm(); setFormOpen(true) }}>
                <div className="btn-content"><span className="btn-text">+ معاملة جديدة</span></div>
              </button>
            </WithPermission>
          )}
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
        </div>
      </div>

      {/* Diagnostics toggle */}
      <div style={{ padding: '0 1.5rem 0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="ultimate-btn ultimate-btn-warning" onClick={() => setShowDiag(v => !v)}>
          <div className="btn-content"><span className="btn-text">{showDiag ? 'إخفاء الصلاحيات' : 'عرض الصلاحيات'}</span></div>
        </button>
      </div>
      {showDiag && (
        <div style={{ padding: '0 1.5rem 1rem' }}>
          <div style={{ border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 8, padding: '0.75rem', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['transactions.create','transactions.update','transactions.delete','transactions.post','transactions.manage'].map(key => (
              <PermissionBadge key={key} allowed={hasPerm(key)} label={key} />
            ))}
          </div>
        </div>
      )}

      {/* Quick filters */}
      <div className="controls-container">
        <input className="search-input" placeholder="بحث..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1) }} />
        <input className="filter-input" type="date" value={filters.dateFrom} onChange={e => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1) }} />
        <input className="filter-input" type="date" value={filters.dateTo} onChange={e => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1) }} />
        <select className="filter-select" value={filters.isPosted} onChange={e => { setFilters({ ...filters, isPosted: e.target.value }); setPage(1) }}>
          <option value="">الحالة</option>
          <option value="posted">مرحلة</option>
          <option value="unposted">غير مرحلة</option>
        </select>
        <Autocomplete
          options={accounts.filter(a => a.is_postable)}
          getOptionLabel={(a) => `${a.code} - ${a.name}`}
          value={accounts.find(a => a.id === debitFilterId) || null}
          onChange={(e, val) => { setDebitFilterId(val?.id || ''); setPage(1) }}
          renderInput={(params) => <TextField {...params} label="تصفية: الحساب المدين" />}
          sx={{ minWidth: 260 }}
        />
        <Autocomplete
          options={accounts.filter(a => a.is_postable)}
          getOptionLabel={(a) => `${a.code} - ${a.name}`}
          value={accounts.find(a => a.id === creditFilterId) || null}
          onChange={(e, val) => { setCreditFilterId(val?.id || ''); setPage(1) }}
          renderInput={(params) => <TextField {...params} label="تصفية: الحساب الدائن" />}
          sx={{ minWidth: 260 }}
        />
        <input className="filter-input" type="number" placeholder="من مبلغ" value={filters.amountFrom} onChange={e => { setFilters({ ...filters, amountFrom: e.target.value }); setPage(1) }} />
        <input className="filter-input" type="number" placeholder="إلى مبلغ" value={filters.amountTo} onChange={e => { setFilters({ ...filters, amountTo: e.target.value }); setPage(1) }} />
        <button className="ultimate-btn" onClick={() => {
          setSearchTerm('')
          setFilters({ dateFrom: '', dateTo: '', isPosted: '', amountFrom: '', amountTo: '' })
          setDebitFilterId('')
          setCreditFilterId('')
          setPage(1)
        }}>
          <div className="btn-content"><span className="btn-text">مسح الفلاتر</span></div>
        </button>
      </div>

      {/* Table */}
      <div className="transactions-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px' }}>
          <div>عدد السجلات: {totalCount}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
        <table className="transactions-table">
          <thead>
            <tr>
              <th>رقم القيد</th>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>المرجع</th>
              <th>المبلغ</th>
              <th>أنشئت بواسطة</th>
              <th>مرحلة بواسطة</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(t => (
              <tr key={t.id}>
                <td>{t.entry_number}</td>
                <td>{new Date(t.entry_date).toLocaleDateString('ar-EG')}</td>
                <td>{t.description}</td>
                <td>{t.reference_number || '—'}</td>
                <td className="amount-cell">{t.amount.toLocaleString('ar-EG')}</td>
                <td>{t.created_by ? (userNames[t.created_by] || t.created_by.substring(0, 8)) : '—'}</td>
                <td>{t.posted_by ? (userNames[t.posted_by] || t.posted_by.substring(0, 8)) : '—'}</td>
                <td>{t.is_posted ? 'مرحلة' : 'غير مرحلة'}</td>
                <td>
                  <div className="tree-node-actions">
                    {/* View details (audit) */}
                    <button className="ultimate-btn ultimate-btn-edit" onClick={async () => {
                      setDetailsFor(t)
                      try {
                        const rows = await getTransactionAudit(t.id)
                        setAudit(rows)
                      } catch {}
                      setDetailsOpen(true)
                    }}><div className="btn-content"><span className="btn-text">تفاصيل</span></div></button>
                    {/* Approve/Post in pending mode if permitted */}
                    {mode === 'pending' && !t.is_posted && (
                      <WithPermission perm="transactions.post">
                      <button className="ultimate-btn ultimate-btn-success" onClick={() => handlePost(t.id)} disabled={postingId === t.id}>
                        <div className="btn-content"><span className="btn-text">{postingId === t.id ? 'جارٍ الترحيل...' : 'ترحيل'}</span></div>
                      </button>
                      </WithPermission>
                    )}
                    {/* Edit (my) */}
                    {mode === 'my' && !t.is_posted && hasPerm('transactions.update') && t.created_by === currentUserId && (
                      <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                        setEditingTx(t)
                        setFormOpen(true)
                        setEntryNumber(t.entry_number)
                        setEntryDate(t.entry_date)
                        setDescription(t.description)
                        setReferenceNumber(t.reference_number || '')
                        setDebitAccountId(t.debit_account_id)
                        setCreditAccountId(t.credit_account_id)
                        setAmount(t.amount)
                        setNotes(t.notes || '')
                      }}><div className="btn-content"><span className="btn-text">تعديل</span></div></button>
                    )}
                    {/* Edit (all) via manage */}
                    {mode === 'all' && !t.is_posted && hasPerm('transactions.manage') && (
                      <button className="ultimate-btn ultimate-btn-edit" onClick={() => {
                        setEditingTx(t)
                        setFormOpen(true)
                        setEntryNumber(t.entry_number)
                        setEntryDate(t.entry_date)
                        setDescription(t.description)
                        setReferenceNumber(t.reference_number || '')
                        setDebitAccountId(t.debit_account_id)
                        setCreditAccountId(t.credit_account_id)
                        setAmount(t.amount)
                        setNotes(t.notes || '')
                      }}><div className="btn-content"><span className="btn-text">تعديل</span></div></button>
                    )}
                    {/* Delete only in my mode, unposted, with permission */}
                    {mode === 'my' && !t.is_posted && hasPerm('transactions.delete') && t.created_by === currentUserId && (
                      <button className="ultimate-btn ultimate-btn-delete" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}><div className="btn-content"><span className="btn-text">{deletingId === t.id ? 'جارٍ الحذف...' : 'حذف'}</span></div></button>
                    )}
                    {/* Manage delete in all view if privileged (still only unposted) */}
                    {mode === 'all' && !t.is_posted && hasPerm('transactions.manage') && (
                      <button className="ultimate-btn ultimate-btn-delete" onClick={() => handleDelete(t.id)}><div className="btn-content"><span className="btn-text">حذف</span></div></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Single-row modal */}
      {formOpen && (
        <div className="transaction-modal" onClick={() => setFormOpen(false)}>
          <div className="transaction-modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editingTx ? 'تعديل المعاملة' : 'معاملة جديدة'}</h3>
            {formErrors.general && <div className="error-message">{formErrors.general}</div>}
            <input className="input-field" placeholder="رقم القيد" value={entryNumber} readOnly />
            <input className="input-field" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            <textarea className="textarea-field" placeholder="وصف المعاملة" value={description} onChange={e => setDescription(e.target.value)} />

            <Autocomplete
              options={accounts.filter(a => a.is_postable)}
              getOptionLabel={(a) => `${a.code} - ${a.name}`}
              value={accounts.find(a => a.id === debitAccountId) || null}
              onChange={(e, val) => setDebitAccountId(val?.id || '')}
              renderInput={(params) => <TextField {...params} label="الحساب المدين" />}
            />

            <Autocomplete
              options={accounts.filter(a => a.is_postable)}
              getOptionLabel={(a) => `${a.code} - ${a.name}`}
              value={accounts.find(a => a.id === creditAccountId) || null}
              onChange={(e, val) => setCreditAccountId(val?.id || '')}
              renderInput={(params) => <TextField {...params} label="الحساب الدائن" />}
            />

            <input className="input-field" type="number" placeholder="المبلغ" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} />
            <input className="input-field" placeholder="رقم المرجع" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
            <textarea className="textarea-field notes" placeholder="ملاحظات" value={notes} onChange={e => setNotes(e.target.value)} />

            <div className="button-container">
              {editingTx ? (
                <button className="ultimate-btn ultimate-btn-add" onClick={async () => {
                  try {
                    setIsSaving(true)
                    const updated = await updateTransaction(editingTx.id, {
                      entry_date: entryDate,
                      description,
                      reference_number: referenceNumber || null,
                      debit_account_id: debitAccountId,
                      credit_account_id: creditAccountId,
                      amount,
                      notes: notes || null,
                    })
                    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t))
                    setEditingTx(null)
                    setFormOpen(false)
                    showToast('تم تحديث المعاملة', { severity: 'success' })
                  } catch (e: any) {
                    const msg = e?.message || 'فشل تحديث المعاملة'
                    showToast(`فشل تحديث المعاملة (رقم القيد ${editingTx.entry_number}). السبب: ${msg}`.trim(), { severity: 'error' })
                    logClientError({ context: 'transactions.update', message: msg, extra: { id: editingTx.id } })
                  } finally {
                    setIsSaving(false)
                  }
                }} disabled={isSaving}>
                  <div className="btn-content"><span className="btn-text">تحديث</span></div>
                </button>
              ) : (
                <button className="ultimate-btn ultimate-btn-add" onClick={save} disabled={isSaving}>
                  <div className="btn-content"><span className="btn-text">حفظ</span></div>
                </button>
              )}
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => { setEditingTx(null); setFormOpen(false) }} disabled={isSaving}>
                <div className="btn-content"><span className="btn-text">إلغاء</span></div>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Details Drawer */}
      {detailsOpen && detailsFor && (
        <TransactionView transaction={detailsFor} audit={audit} userNames={userNames} onClose={() => setDetailsOpen(false)} />
      )}

      {/* Admin: Client Error Logs Viewer */}
      {showLogs && (
        <div className="transaction-modal" onClick={() => setShowLogs(false)}>
          <div className="transaction-modal-content" style={{ width: 'min(1200px, 95vw)', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>سجل أخطاء العميل</h3>
              <button className="ultimate-btn ultimate-btn-delete" onClick={() => setShowLogs(false)}>
                <div className="btn-content"><span className="btn-text">إغلاق</span></div>
              </button>
            </div>
            <ClientErrorLogs />
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionsPage

