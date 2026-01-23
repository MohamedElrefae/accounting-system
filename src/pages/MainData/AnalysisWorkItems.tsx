import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './AnalysisWorkItems.module.css'
import './AccountsTree.css'
import { useToast } from '../../contexts/ToastContext'
import { useHasPermission } from '../../hooks/useHasPermission'
import {
  listAnalysisWorkItems,
  suggestAnalysisWorkItemCode,
  createAnalysisWorkItem,
  updateAnalysisWorkItem,
  deleteAnalysisWorkItem,
  toggleAnalysisWorkItemActive,
} from '../../services/analysis-work-items'
import type { AnalysisWorkItemFull, AnalysisWorkItemRow } from '../../types/analysis-work-items'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Typography,
} from '@mui/material'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import { useScope } from '../../contexts/ScopeContext'

const AnalysisWorkItemsPage: React.FC = () => {
  const { showToast } = useToast()
  const { currentOrg, currentProject } = useScope()
  const hasPermission = useHasPermission()
  const canCreate = hasPermission('work_items.create')
  const canUpdate = hasPermission('work_items.update')
  const canDelete = hasPermission('work_items.delete')

  const orgId = currentOrg?.id || ''
  const projectId = currentProject?.id || ''

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AnalysisWorkItemFull[]>([])

  // Dialog
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ code: string; name: string; name_ar: string; description: string; is_active: boolean }>({
    code: '', name: '', name_ar: '', description: '', is_active: true,
  })

  useEffect(() => {
    // Load projects for the current organization
    if (!orgId) {
      setLoading(false);
      return;
    }
    
    setLoading(false);
  }, [orgId])

  const reload = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      // Do not pass projectId; listing is org-level. Project selection should only affect totals (not implemented here).
      const list = await listAnalysisWorkItems({ orgId, search: (search || '').trim() || undefined, onlyWithTx: false, includeInactive: true })
      setRows(list)
    } catch (e: any) {
      showToast(e?.message || 'Failed to load', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [orgId, search, showToast])

  useEffect(() => { reload() }, [orgId, projectId, reload])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r => (r.code || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q) || (r.name_ar || '').toLowerCase().includes(q))
  }, [rows, search])

  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'code', header: 'Code / الكود', type: 'text' },
      { key: 'name', header: 'Name / الاسم', type: 'text' },
      { key: 'name_ar', header: 'Arabic Name / الاسم العربي', type: 'text' },
      { key: 'is_active', header: 'Active / نشط', type: 'boolean' },
      { key: 'has_transactions', header: 'Has Tx / به معاملات', type: 'boolean' },
      { key: 'total_debit_amount', header: 'Total Debit', type: 'currency' },
      { key: 'total_credit_amount', header: 'Total Credit', type: 'currency' },
      { key: 'net_amount', header: 'Net', type: 'currency' },
    ])
    const dataRows = filtered.map(r => ({
      code: r.code,
      name: r.name,
      name_ar: r.name_ar || '',
      is_active: !!r.is_active,
      has_transactions: !!r.has_transactions,
      total_debit_amount: Number(r.total_debit_amount || 0),
      total_credit_amount: Number(r.total_credit_amount || 0),
      net_amount: Number(r.net_amount || 0),
    }))
    return prepareTableData(columns, dataRows)
  }, [filtered])

  const openCreate = async () => {
    setEditingId(null)
    const suggested = orgId ? await suggestAnalysisWorkItemCode(orgId, '') : ''
    setForm({ code: suggested || '', name: '', name_ar: '', description: '', is_active: true })
    setOpen(true)
  }

  const openEdit = (row: AnalysisWorkItemRow) => {
    setEditingId(row.id)
    setForm({ code: row.code, name: row.name, name_ar: row.name_ar || '', description: row.description || '', is_active: row.is_active })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!orgId) { showToast('Select organization', { severity: 'warning' }); return }
    try {
      if (editingId) {
        await updateAnalysisWorkItem(editingId, { code: form.code, name: form.name, name_ar: form.name_ar || null, description: form.description || null, is_active: form.is_active })
        showToast('Updated successfully', { severity: 'success' })
      } else {
        await createAnalysisWorkItem({ org_id: orgId, code: form.code, name: form.name, name_ar: form.name_ar || null, description: form.description || null, is_active: form.is_active })
        showToast('Created successfully', { severity: 'success' })
      }
      setOpen(false)
      await reload()
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Save failed', { severity: 'error' })
    }
  }

  const handleToggleActive = async (row: AnalysisWorkItemRow) => {
    try {
      await toggleAnalysisWorkItemActive(row.id, !row.is_active)
      showToast(row.is_active ? 'Deactivated' : 'Activated', { severity: 'success' })
      await reload()
    } catch (e: unknown) { showToast((e as Error)?.message || 'Toggle failed', { severity: 'error' }) }
  }

  const handleDelete = async (row: AnalysisWorkItemFull) => {
    if (row.has_transactions) { showToast('Cannot delete: has transactions', { severity: 'warning' }); return }
    if (!confirm(`Delete ${row.code}?`)) return
    try {
      await deleteAnalysisWorkItem(row.id)
      showToast('Deleted', { severity: 'success' })
      await reload()
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Delete failed', { severity: 'error' })
    }
  }

  // Show message if no organization is selected
  if (!currentOrg) {
    return (
      <div className="accounts-page" dir="rtl">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">بنود الاعمال التحليلية</h1>
          </div>
        </div>
        
        <div className="content-area">
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '1rem', color: '#999' }}>📊</div>
                <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>يرجى اختيار مؤسسة أولاً</h3>
                <p style={{ color: '#999' }}>اختر مؤسسة من شريط الأدوات العلوي لعرض بنود الاعمال التحليلية التابعة لها</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="accounts-page" dir="rtl">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">بنود الاعمال التحليلية</h1>
        </div>
        <div className="page-actions">
          {canCreate && (
            <button className="ultimate-btn ultimate-btn-add" onClick={openCreate} title="إضافة بند جديد">
              <div className="btn-content"><span className="btn-text">+ بند جديد</span></div>
            </button>
          )}
          <ExportButtons data={exportData} config={{ title: 'Analysis Work Items', rtlLayout: true }} size="small" />
        </div>
      </div>

      <div className="controls-container">
        <div className="search-and-filters">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="ابحث بالكود أو الاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <span className="icon">🔍</span>
          </div>

          <div className="current-org-display" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666',
            minWidth: '200px',
            textAlign: 'center',
            marginLeft: '8px'
          }}>
            {currentOrg ? `${currentOrg.code} - ${currentOrg.name}` : 'لم يتم تحديد مؤسسة'}
          </div>

          <div className="current-project-display" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666',
            minWidth: '200px',
            textAlign: 'center',
            marginLeft: '8px'
          }}>
            {currentProject ? `${currentProject.code} - ${currentProject.name}` : 'كل المشروعات'}
          </div>
        </div>
        <div className="view-mode-toggle">
          <button className="view-mode-btn active">عرض جدول</button>
        </div>
      </div>

      <div className="content-area">
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <div className={styles.tableContainer}>
              {loading ? (
                <Typography>جاري التحميل...</Typography>
              ) : (
                <Table className={styles.dataTable} size="small" stickyHeader sx={{ '& .MuiTableCell-root': { py: 1.25 } }}>
                  <colgroup>
                    <col style={{ width: '140px' }} />
                    <col />
                    <col />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '120px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '280px' }} />
                  </colgroup>
                  <TableHead sx={{ '& th': { background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))', color: 'var(--on-accent)', fontWeight: 600 } }}>
                    <TableRow>
                      <TableCell>الكود</TableCell>
                      <TableCell>الاسم</TableCell>
                      <TableCell>الاسم العربي</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>به معاملات</TableCell>
                      <TableCell align="right">إجمالي مدين</TableCell>
                      <TableCell align="right">إجمالي دائن</TableCell>
                      <TableCell align="right">الصافي</TableCell>
                      <TableCell className={styles.actionsCell} align="right" sx={{ minWidth: 280 }}>الإجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody sx={{ '& tr:hover': { backgroundColor: 'var(--hover-bg)' } }}>
                    {filtered.map((r) => (
                      <TableRow hover key={r.id}>
                        <TableCell className={`table-code-cell ${styles.codeCol}`}>{r.code}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.name_ar || ''}</TableCell>
                        <TableCell>
                          <span className={`status-badge ${r.is_active ? 'status-active' : 'status-inactive'}`}>
                            {r.is_active ? 'نشط' : 'غير نشط'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`status-badge ${r.has_transactions ? 'status-active' : 'status-inactive'}`}>
                            {r.has_transactions ? 'نعم' : 'لا'}
                          </span>
                        </TableCell>
                        <TableCell align="right">{Number(r.total_debit_amount || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(r.total_credit_amount || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(r.net_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className={styles.actionsCell} align="right" sx={{ minWidth: 280 }}>
                          <div className={styles.rowActions}>
                            {canUpdate && (
                              <button className="ultimate-btn ultimate-btn-edit" onClick={() => openEdit(r)} title="تعديل">
                                <div className="btn-content"><span className="btn-text">تعديل</span></div>
                              </button>
                            )}
                            {canUpdate && (
                              <button className={`ultimate-btn ${r.is_active ? 'ultimate-btn-warning' : 'ultimate-btn-success'}`} onClick={() => handleToggleActive(r)} title={r.is_active ? 'تعطيل' : 'تفعيل'}>
                                <div className="btn-content"><span className="btn-text">{r.is_active ? 'تعطيل' : 'تفعيل'}</span></div>
                              </button>
                            )}
                            {canDelete && (
                              <button className="ultimate-btn ultimate-btn-delete" disabled={!!r.has_transactions} onClick={() => handleDelete(r)} title="حذف">
                                <div className="btn-content"><span className="btn-text">حذف</span></div>
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'تعديل' : 'إضافة بند جديد'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField fullWidth margin="dense" label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField fullWidth margin="dense" label="الاسم العربي" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <TextField fullWidth margin="dense" multiline minRows={2} label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className={styles.footerActions}>
            <Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> نشط
          </div>
        </DialogContent>
        <DialogActions>
          <button className="ultimate-btn ultimate-btn-delete" onClick={() => setOpen(false)}>إغلاق</button>
          {(editingId ? canUpdate : canCreate) && (
            <button className="ultimate-btn ultimate-btn-add" onClick={handleSave}>حفظ</button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default AnalysisWorkItemsPage
