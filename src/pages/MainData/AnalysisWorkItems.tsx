import React, { useEffect, useMemo, useState } from 'react'
import styles from './AnalysisWorkItems.module.css'
import { useToast } from '../../contexts/ToastContext'
import { getOrganizations, type Organization } from '../../services/organization'
import { getActiveProjects, type Project } from '../../services/projects'
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
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Checkbox,
  Typography,
} from '@mui/material'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'

async function getInitialOrgId(): Promise<string> { 
  try { 
    const { getActiveOrgId } = await import('../../utils/org'); 
    return getActiveOrgId?.() || ''; 
  } catch { 
    return ''; 
  } 
}

async function getInitialProjectId(): Promise<string> { 
  try { 
    const { getActiveProjectId } = await import('../../utils/org'); 
    return getActiveProjectId?.() || ''; 
  } catch { 
    return ''; 
  } 
}

const AnalysisWorkItemsPage: React.FC = () => {
  const { showToast } = useToast()
  const hasPermission = useHasPermission()
  const canView = hasPermission('work_items.view') // reuse same permission group
  const canCreate = hasPermission('work_items.create')
  const canUpdate = hasPermission('work_items.update')
  const canDelete = hasPermission('work_items.delete')

  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [orgId, setOrgId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')

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
    if (!canView) return
    ;(async () => {
      setLoading(true)
      try {
        const [orgList, initialOrgId, initialProjectId] = await Promise.all([
          getOrganizations().catch(() => []),
          getInitialOrgId(),
          getInitialProjectId()
        ]);
        setOrgs(orgList)
        const chosenOrg = orgId || initialOrgId || orgList[0]?.id || ''
        if (chosenOrg !== orgId) setOrgId(chosenOrg)
        const projs = await getActiveProjects().catch(() => [])
        setProjects(projs)
        const chosenProject = projectId || initialProjectId || (projs.length > 0 ? projs[0].id : '')
        if (chosenProject !== projectId) setProjectId(chosenProject)
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView])

  const reload = async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const list = await listAnalysisWorkItems({ orgId, projectId: projectId || null, search: (search || '').trim() || null, onlyWithTx: false, includeInactive: true })
      setRows(list)
    } catch (e: any) {
      showToast(e?.message || 'Failed to load', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [orgId, projectId])

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
    } catch (e: any) {
      showToast(e?.message || 'Save failed', { severity: 'error' })
    }
  }

  const handleToggleActive = async (row: AnalysisWorkItemRow) => {
    try {
      await toggleAnalysisWorkItemActive(row.id, !row.is_active)
      showToast(row.is_active ? 'Deactivated' : 'Activated', { severity: 'success' })
      await reload()
    } catch (e: any) { showToast(e?.message || 'Toggle failed', { severity: 'error' }) }
  }

  const handleDelete = async (row: AnalysisWorkItemFull) => {
    if (row.has_transactions) { showToast('Cannot delete: has transactions', { severity: 'warning' }); return }
    if (!confirm(`Delete ${row.code}?`)) return
    try {
      await deleteAnalysisWorkItem(row.id)
      showToast('Deleted', { severity: 'success' })
      await reload()
    } catch (e: any) {
      showToast(e?.message || 'Delete failed', { severity: 'error' })
    }
  }

  if (!canView) {
    return (
      <div className={styles.container}>
        <div className={styles.header}><Typography variant="h6">Access denied</Typography></div>
      </div>
    )
  }

  return (
    <div className={styles.container} dir="rtl">
      <div className={styles.header}>
        <Typography className={styles.title}>Analysis Work Items / بنود الاعمال التحليلية</Typography>
        <div className={styles.toolbar}>
          <FormControl size="small">
            <InputLabel>Organization</InputLabel>
            <Select label="Organization" value={orgId} onChange={async (e) => { 
              const v = String(e.target.value); 
              setOrgId(v); 
              try { 
                const { setActiveOrgId } = await import('../../utils/org'); 
                setActiveOrgId?.(v); 
              } catch { /* ignore org utils errors */ }
              await reload();
            }}>
              {orgs.map(o => (<MenuItem key={o.id} value={o.id}>{o.code} - {o.name}</MenuItem>))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>Project (filter)</InputLabel>
            <Select label="Project (filter)" value={projectId} onChange={async (e) => { const v = String(e.target.value); setProjectId(v); try { const { setActiveProjectId } = require('../../utils/org'); setActiveProjectId?.(v) } catch {}; await reload() }}>
              <MenuItem value="">All Projects</MenuItem>
              {projects.map(p => (<MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>))}
            </Select>
          </FormControl>
          <TextField size="small" label="Search / بحث" value={search} onChange={(e) => setSearch(e.target.value)} />
          {canCreate && (<button className={styles.button} onClick={openCreate}>New / جديد</button>)}
          <ExportButtons data={exportData} config={{ title: 'Analysis Work Items', rtlLayout: true }} size="small" />
        </div>
      </div>

      <div className={styles.content}>
        <Card className={styles.card}>
          <CardContent className={styles.cardBody}>
            <div className={styles.tableContainer}>
              {loading ? (
                <Typography>Loading...</Typography>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Arabic Name</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell>Has Tx</TableCell>
                      <TableCell align="right">Total Debit</TableCell>
                      <TableCell align="right">Total Credit</TableCell>
                      <TableCell align="right">Net</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.code}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.name_ar || ''}</TableCell>
                        <TableCell><Checkbox checked={!!r.is_active} disabled /></TableCell>
                        <TableCell><Checkbox checked={!!r.has_transactions} disabled /></TableCell>
                        <TableCell align="right">{Number(r.total_debit_amount || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(r.total_credit_amount || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(r.net_amount || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <div className={styles.rowActions}>
                            {canUpdate && (<button className={styles.button} onClick={() => openEdit(r)}>Edit</button>)}
                            {canUpdate && (<button className={styles.button} onClick={() => handleToggleActive(r)}>{r.is_active ? 'Disable' : 'Enable'}</button>)}
                            {canDelete && (<button className={styles.button} disabled={!!r.has_transactions} onClick={() => handleDelete(r)}>Delete</button>)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit / تعديل' : 'New / جديد'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" label="Code / الكود" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <TextField fullWidth margin="dense" label="Name / الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField fullWidth margin="dense" label="Arabic Name / الاسم العربي" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <TextField fullWidth margin="dense" multiline minRows={2} label="Description / الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className={styles.footerActions}>
            <Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </div>
        </DialogContent>
        <DialogActions>
          <button className={styles.button} onClick={() => setOpen(false)}>Close</button>
          {(editingId ? canUpdate : canCreate) && <button className={styles.button} onClick={handleSave}>Save</button>}
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default AnalysisWorkItemsPage
