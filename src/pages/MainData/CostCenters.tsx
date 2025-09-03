import React, { useEffect, useMemo, useState } from 'react'
import styles from './CostCenters.module.css'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useToast } from '../../contexts/ToastContext'
import { getOrganizations, type Organization } from '../../services/organization'
import { getProjects, type Project } from '../../services/projects'
import {
  getCostCentersList,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  fetchNextCostCenterCode,
  type CostCenterRow,
} from '../../services/cost-centers'
import ExportButtons from '../../components/Common/ExportButtons'
import TreeView from '../../components/TreeView/TreeView'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import {
  Button,
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
  Tab,
  Tabs,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  TablePagination,
} from '@mui/material'

function getInitialOrgId(): string {
  try { const { getActiveOrgId } = require('../../utils/org'); return getActiveOrgId?.() || '' } catch { return '' }
}

const CostCentersPage: React.FC = () => {
  const { showToast } = useToast()
  const hasPermission = useHasPermission()
  const canView = hasPermission('cost_centers.read')
  const canCreate = hasPermission('cost_centers.create')
  const canUpdate = hasPermission('cost_centers.update')
  const canDelete = hasPermission('cost_centers.delete')

  const [tab, setTab] = useState(0)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [orgId, setOrgId] = useState<string>(getInitialOrgId())

  const [list, setList] = useState<CostCenterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Form dialog
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ 
    code: string
    name: string
    name_ar: string
    description: string
    parent_id: string | ''
    project_id: string | ''
    is_active: boolean
    position: number
  }>({
    code: '', 
    name: '', 
    name_ar: '', 
    description: '', 
    parent_id: '', 
    project_id: '', 
    is_active: true, 
    position: 0
  })

  useEffect(() => {
    if (!canView) return
    (async () => {
      setLoading(true)
      try {
        const [orgList, projList] = await Promise.all([
          getOrganizations().catch(() => []),
          getProjects().catch(() => ({ rows: [], total: 0 }))
        ])
        setOrgs(orgList)
        // getProjects returns a paged result; ensure we set an array
        setProjects((projList as any).rows ?? [])
        const chosen = orgId || orgList[0]?.id || ''
        if (chosen !== orgId) setOrgId(chosen)
        if (chosen) {
          const costCenterList = await getCostCentersList(chosen, true)
          setList(costCenterList)
        }
      } catch (e: any) {
        showToast(e.message || 'Failed to load data', { severity: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView])

  const reload = async (chosen: string) => {
    if (!chosen) return
    setLoading(true)
    try {
      const costCenterList = await getCostCentersList(chosen, true)
      setList(costCenterList)
    } catch (e: any) {
      showToast(e.message || 'Failed to reload', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filteredList = useMemo(() => {
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(r => 
      r.code.toLowerCase().includes(q) || 
      r.name.toLowerCase().includes(q) ||
      (r.name_ar && r.name_ar.toLowerCase().includes(q))
    )
  }, [list, search])

  useEffect(() => { setPage(0) }, [search])

  const pagedList = useMemo(() => {
    const start = page * rowsPerPage
    const end = Math.min(filteredList.length, start + rowsPerPage)
    return filteredList.slice(start, end)
  }, [filteredList, page, rowsPerPage])

  const exportData = useMemo(() => {
    const columns = createStandardColumns([
      { key: 'code', header: 'Code / الكود', type: 'text' },
      { key: 'name', header: 'Name / الاسم', type: 'text' },
      { key: 'name_ar', header: 'Arabic Name / الاسم بالعربية', type: 'text' },
      { key: 'level', header: 'Level / المستوى', type: 'number' },
      { key: 'is_active', header: 'Active / نشط', type: 'boolean' },
      { key: 'project_code', header: 'Project / المشروع', type: 'text' },
      { key: 'child_count', header: 'Children / الفروع', type: 'number' },
      { key: 'has_transactions', header: 'Has Tx / به معاملات', type: 'boolean' },
    ])
    const rows = filteredList.map(r => ({
      code: r.code,
      name: r.name,
      name_ar: r.name_ar || '',
      level: r.level,
      is_active: r.is_active,
      project_code: projects.find(p => p.id === r.project_id)?.code || '',
      child_count: r.child_count ?? 0,
      has_transactions: !!r.has_transactions,
    }))
    return prepareTableData(columns, rows)
  }, [filteredList, projects])

  // Fetch next code from server to ensure concurrency safety, with UI fallback
  const getNextCode = async (parentId?: string | null) => {
    if (!orgId) return '1'
    try {
      return await fetchNextCostCenterCode(orgId, parentId ?? null)
    } catch (e: any) {
      // Fallback to '1' and inform the user without breaking the flow
      showToast(
        (e && e.message) ? `تعذر جلب الكود التالي من الخادم، سيتم استخدام 1 مؤقتاً: ${e.message}` : 'تعذر جلب الكود التالي من الخادم، سيتم استخدام 1 مؤقتاً',
        { severity: 'warning' }
      )
      return '1'
    }
  }

  const openCreate = async () => {
    setEditingId(null)
    const code = await getNextCode(null)
    setForm({ 
      code, 
      name: '', 
      name_ar: '', 
      description: '', 
      parent_id: '', 
      project_id: '', 
      is_active: true, 
      position: 0 
    })
    setOpen(true)
  }

  const openEdit = (row: CostCenterRow) => {
    setEditingId(row.id)
    setForm({
      code: row.code,
      name: row.name,
      name_ar: row.name_ar || '',
      description: row.description || '',
      parent_id: row.parent_id || '',
      project_id: row.project_id || '',
      is_active: row.is_active,
      position: row.position
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!orgId) { showToast('Select organization', { severity: 'warning' }); return }
    try {
      if (editingId) {
        await updateCostCenter({
          id: editingId,
          code: form.code,
          name: form.name,
          name_ar: form.name_ar || null,
          description: form.description || null,
          parent_id: form.parent_id || null,
          project_id: form.project_id || null,
          is_active: form.is_active,
          position: form.position,
          org_id: orgId,
        })
        showToast('تم التحديث بنجاح', { severity: 'success' })
      } else {
        await createCostCenter({
          org_id: orgId,
          code: form.code,
          name: form.name,
          name_ar: form.name_ar || null,
          description: form.description || null,
          parent_id: form.parent_id || null,
          project_id: form.project_id || null,
          is_active: form.is_active,
          position: form.position,
        })
        showToast('تم الإنشاء بنجاح', { severity: 'success' })
      }
      setOpen(false)
      await reload(orgId)
    } catch (e: any) {
      showToast(e.message || 'Save failed', { severity: 'error' })
    }
  }

  const handleAddChild = async (parentId: string) => {
    const parent = list.find(r => r.id === parentId)
    if (!parent) return
    setEditingId(null)
    const code = await getNextCode(parentId)
    setForm({
      code,
      name: '',
      name_ar: '',
      description: '',
      parent_id: parentId,
      project_id: parent.project_id || '',
      is_active: true,
      position: 0
    })
    setOpen(true)
  }

  const handleToggleActive = async (row: CostCenterRow) => {
    try {
      await updateCostCenter({ id: row.id, is_active: !row.is_active, org_id: orgId })
      showToast(row.is_active ? 'تم التعطيل' : 'تم التفعيل', { severity: 'success' })
      await reload(orgId)
    } catch (e: any) {
      showToast(e.message || 'Toggle failed', { severity: 'error' })
    }
  }

  const handleDelete = async (row: CostCenterRow) => {
    if (!orgId) return
    if (!confirm(`حذف مركز التكلفة ${row.code}؟`)) return
    try {
      await deleteCostCenter(row.id, orgId)
      showToast('تم الحذف بنجاح', { severity: 'success' })
      await reload(orgId)
    } catch (e: any) {
      showToast(e.message || 'Delete failed', { severity: 'error' })
    }
  }

  if (!canView) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Typography variant="h6">Access denied</Typography>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography className={styles.title}>Cost Centers / مراكز التكلفة</Typography>
        <div className={styles.toolbar}>
          <FormControl size="small">
            <InputLabel>Organization</InputLabel>
            <Select
              label="Organization"
              value={orgId}
              onChange={async (e) => {
                const v = String(e.target.value)
                setOrgId(v)
                try { const { setActiveOrgId } = require('../../utils/org'); setActiveOrgId?.(v) } catch {}
                await reload(v)
              }}
            >
              {orgs.map(o => (
                <MenuItem key={o.id} value={o.id}>{o.code} - {o.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField 
            size="small" 
            label="Search / بحث" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          {canCreate && (
            <Button variant="contained" onClick={openCreate}>New / جديد</Button>
          )}
          <ExportButtons 
            data={exportData} 
            config={{ title: 'Cost Centers', rtlLayout: true }} 
            size="small" 
          />
        </div>
      </div>

      <div className={styles.content}>
        <Card className={styles.card}>
          <CardContent className={styles.cardBody}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Tree" />
              <Tab label="List" />
            </Tabs>
            {tab === 0 && (
              <div className={styles.tableContainer}>
                {loading ? (
                  <Typography>Loading...</Typography>
                ) : (
                  <TreeView
                    data={list.map(r => ({
                      id: r.id,
                      code: r.code,
                      name_ar: r.name_ar || r.name,
                      name_en: r.name,
                      level: r.level,
                      parent_id: r.parent_id,
                      is_active: r.is_active,
                      account_type: r.project_id ? 'project' : 'global',
                      project_name: projects.find(p => p.id === r.project_id)?.name || '',
                      child_count: r.child_count ?? 0,
                      has_transactions: !!r.has_transactions,
                    })) as any}
                    extraColumns={[
                      { 
                        key: 'project', 
                        header: 'Project', 
                        render: (n: any) => (
                          <span>{n.project_name || 'Global'}</span>
                        )
                      },
                      { 
                        key: 'is_active', 
                        header: 'Active', 
                        render: (n: any) => (
                          <input type="checkbox" checked={!!n.is_active} readOnly aria-label="is_active" />
                        )
                      },
                      { 
                        key: 'children', 
                        header: 'Children', 
                        render: (n: any) => (
                          <span>{Number.isFinite(n.child_count) ? n.child_count : ''}</span>
                        )
                      },
                      { 
                        key: 'has_tx', 
                        header: 'Has Tx', 
                        render: (n: any) => (
                          <input type="checkbox" checked={!!n.has_transactions} readOnly aria-label="has_transactions" />
                        )
                      },
                    ]}
                    onEdit={(node: any) => {
                      const row = list.find(r => r.id === node.id)
                      if (row) openEdit(row)
                    }}
                    onAdd={(parentNode: any) => handleAddChild(parentNode.id)}
                    onToggleStatus={(node: any) => {
                      const row = list.find(r => r.id === node.id)
                      if (row) handleToggleActive(row)
                    }}
                    onDelete={(node: any) => {
                      const row = list.find(r => r.id === node.id)
                      if (row) handleDelete(row)
                    }}
                    canHaveChildren={(node: any) => node.level < 4}
                    getChildrenCount={(node: any) => list.filter(r => r.parent_id === node.id).length}
                    maxLevel={4}
                  />
                )}
              </div>
            )}
            {tab === 1 && (
              <div className={styles.tableContainer}>
                {loading ? (
                  <Typography>Loading...</Typography>
                ) : (
                  <>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Arabic Name</TableCell>
                          <TableCell>Level</TableCell>
                          <TableCell>Project</TableCell>
                          <TableCell>Active</TableCell>
                          <TableCell>Children</TableCell>
                          <TableCell>Has Tx</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedList.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{r.code}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell>{r.name_ar || ''}</TableCell>
                            <TableCell>{r.level}</TableCell>
                            <TableCell>
                              {projects.find(p => p.id === r.project_id)?.name || 'Global'}
                            </TableCell>
                            <TableCell><Checkbox checked={r.is_active} disabled /></TableCell>
                            <TableCell>{r.child_count ?? 0}</TableCell>
                            <TableCell><Checkbox checked={!!r.has_transactions} disabled /></TableCell>
                            <TableCell align="right">
                              {canUpdate && r.level < 4 && (
                                <Button size="small" onClick={() => handleAddChild(r.id)}>Add Sub</Button>
                              )}
                              {canUpdate && (
                                <Button size="small" onClick={() => handleToggleActive(r)}>
                                  {r.is_active ? 'Disable' : 'Enable'}
                                </Button>
                              )}
                              {canUpdate && <Button size="small" onClick={() => openEdit(r)}>Edit</Button>}
                              {canDelete && <Button size="small" color="error" onClick={() => handleDelete(r)}>Delete</Button>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <TablePagination
                      component="div"
                      count={filteredList.length}
                      page={page}
                      onPageChange={(_, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit Cost Center / تعديل مركز التكلفة' : 'New Cost Center / مركز تكلفة جديد'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth 
            margin="dense" 
            label="Code / الكود" 
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <TextField
            fullWidth 
            margin="dense" 
            label="Name / الاسم" 
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            fullWidth 
            margin="dense" 
            label="Arabic Name / الاسم بالعربية" 
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
          />
          <TextField
            fullWidth 
            margin="dense" 
            multiline 
            minRows={2} 
            label="Description / الوصف" 
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Parent (optional)</InputLabel>
            <Select
              label="Parent (optional)"
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: String(e.target.value) })}
            >
              <MenuItem value="">None</MenuItem>
              {list.filter(r => r.level <= 3).map(r => (
                <MenuItem key={r.id} value={r.id}>{r.code} - {r.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Project (optional)</InputLabel>
            <Select
              label="Project (optional)"
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: String(e.target.value) })}
            >
              <MenuItem value="">Global (All Projects)</MenuItem>
              {projects.filter(p => p.org_id === orgId).map(p => (
                <MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth 
            margin="dense" 
            type="number" 
            label="Position / الترتيب" 
            value={form.position}
            onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
          />
          <div className={styles.footerActions}>
            <FormControl>
              <InputLabel shrink>Active</InputLabel>
            </FormControl>
            <div>
              <Checkbox 
                checked={form.is_active} 
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })} 
              /> Active / نشط
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          {(editingId ? canUpdate : canCreate) && <Button variant="contained" onClick={handleSave}>Save</Button>}
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default CostCentersPage
