import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './CostCenters.module.css'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useToast } from '../../contexts/ToastContext'
import { useScope } from '../../contexts/ScopeContext'
import {
  getCostCentersList,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  fetchNextCostCenterCode,
  type CostCenterRow,
} from '../../services/cost-centers'
import ExportButtons from '../../components/Common/ExportButtons'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import TreeView from '../../components/TreeView/TreeView'
import UnifiedCRUDForm, { type FormConfig } from '../../components/Common/UnifiedCRUDForm'
import DraggablePanelContainer from '../../components/Common/DraggablePanelContainer'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import {
  Button,
  Card,
  CardContent,
  Tab,
  Tabs,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
} from '@mui/material'

const CostCentersPage: React.FC = () => {
  const { showToast } = useToast()
  const { currentOrg } = useScope()
  const hasPermission = useHasPermission()
  const canCreate = hasPermission('cost_centers.create')
  const canUpdate = hasPermission('cost_centers.update')
  const canDelete = hasPermission('cost_centers.delete')

  const orgId = currentOrg?.id || ''
  const [tab, setTab] = useState(0)
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

  const reload = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const costCenterList = await getCostCentersList(orgId, true)
      setList(costCenterList)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to reload', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [orgId, showToast])

  useEffect(() => {
    if (!orgId) return
    void reload()
  }, [orgId, reload])

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
      project_code: '',
      child_count: r.child_count ?? 0,
      has_transactions: !!r.has_transactions,
    }))
    return prepareTableData(columns, rows)
  }, [filteredList])

  // Fetch next code from server to ensure concurrency safety, with UI fallback
  const getNextCode = async (parentId?: string | null) => {
    if (!orgId) return '1'
    try {
      return await fetchNextCostCenterCode(orgId, parentId ?? null)
    } catch (e: unknown) {
      // Fallback to '1' and inform the user without breaking the flow
      const error = e as Error
      showToast(
        error?.message ? `تعذر جلب الكود التالي من الخادم، سيتم استخدام 1 مؤقتاً: ${error.message}` : 'تعذر جلب الكود التالي من الخادم، سيتم استخدام 1 مؤقتاً',
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
      is_active: row.is_active,
      position: row.position
    })
    setOpen(true)
  }

  const handleSave = async (payloadOverride?: {
    code: string
    name: string
    name_ar: string
    description: string
    parent_id: string | ''
    is_active: boolean
    position: number
  }) => {
    if (!orgId) { showToast('Select organization', { severity: 'warning' }); return }
    const payload = payloadOverride ?? form
    try {
      if (editingId) {
        await updateCostCenter({
          id: editingId,
          code: payload.code,
          name: payload.name,
          name_ar: payload.name_ar || null,
          description: payload.description || null,
          parent_id: payload.parent_id || null,
          project_id: null,
          is_active: payload.is_active,
          position: payload.position,
          org_id: orgId,
        })
        showToast('تم التحديث بنجاح', { severity: 'success' })
      } else {
        await createCostCenter({
          org_id: orgId,
          code: payload.code,
          name: payload.name,
          name_ar: payload.name_ar || null,
          description: payload.description || null,
          parent_id: payload.parent_id || null,
          project_id: null,
          is_active: payload.is_active,
          position: payload.position,
        })
        showToast('تم الإنشاء بنجاح', { severity: 'success' })
      }
      setOpen(false)
      await reload(orgId)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Save failed', { severity: 'error' })
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
    } catch (e: unknown) {
      showToast((e as Error).message || 'Toggle failed', { severity: 'error' })
    }
  }

  const handleDelete = async (row: CostCenterRow) => {
    if (!orgId) return
    if (!confirm(`حذف مركز التكلفة ${row.code}؟`)) return
    try {
      await deleteCostCenter(row.id, orgId)
      showToast('تم الحذف بنجاح', { severity: 'success' })
      await reload(orgId)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Delete failed', { severity: 'error' })
    }
  }

  // Show message if no organization is selected
  if (!currentOrg) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Typography className={styles.title}>Cost Centers / مراكز التكلفة</Typography>
        </div>
        
        <div className={styles.content}>
          <Card className={styles.card}>
            <CardContent className={styles.cardBody}>
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '1rem', color: '#999' }}>🏢</div>
                <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>يرجى اختيار مؤسسة أولاً</h3>
                <p style={{ color: '#999' }}>اختر مؤسسة من شريط الأدوات العلوي لعرض مراكز التكلفة التابعة لها</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography className={styles.title}>Cost Centers / مراكز التكلفة</Typography>
        <div className={styles.toolbar}>
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
          <TextField 
            size="small" 
            label="Search / بحث" 
            value={search} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} 
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
                      project_name: '',
                      child_count: r.child_count ?? 0,
                      has_transactions: !!r.has_transactions,
                    }))}
                    extraColumns={[
                      { 
                        key: 'is_active', 
                        header: 'Active', 
                        render: (n) => (
                          <input type="checkbox" checked={!!n.is_active} readOnly aria-label="is_active" />
                        )
                      },
                      { 
                        key: 'children', 
                        header: 'Children', 
                        render: (n) => (
                          <span>{Number.isFinite(n.child_count) ? n.child_count : ''}</span>
                        )
                      },
                      { 
                        key: 'has_tx', 
                        header: 'Has Tx', 
                        render: (n) => (
                          <input type="checkbox" checked={!!n.has_transactions} readOnly aria-label="has_transactions" />
                        )
                      },
                    ]}
                    onEdit={(node) => {
                      const row = list.find(r => r.id === node.id)
                      if (row) openEdit(row)
                    }}
                    onAdd={(parentNode) => handleAddChild(parentNode.id)}
                    onToggleStatus={(node) => {
                      const row = list.find(r => r.id === node.id)
                      if (row) handleToggleActive(row)
                    }}
                    onDelete={(node) => {
                      const row = list.find(r => r.id === node.id)
                      if (row) handleDelete(row)
                    }}
                    canHaveChildren={(node) => node.level < 4}
                    getChildrenCount={(node) => list.filter(r => r.parent_id === node.id).length}
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
                            <TableCell></TableCell>
                            <TableCell><Checkbox checked={r.is_active} disabled /></TableCell>
                            <TableCell>{r.child_count ?? 0}</TableCell>
                            <TableCell><Checkbox checked={!!r.has_transactions} disabled /></TableCell>
                            <TableCell align="right">
                              {canUpdate && r.level < 4 && <Button size="small" onClick={() => handleAddChild(r.id)}>Add Sub</Button>}
                              {canUpdate && <Button size="small" onClick={() => handleToggleActive(r)}>{r.is_active ? 'Disable' : 'Enable'}</Button>}
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

      <DraggablePanelContainer
        storageKey="panel:cost-centers:crud"
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Edit Cost Center / تعديل مركز التكلفة' : 'New Cost Center / مركز تكلفة جديد'}
        subtitle={orgId ? `Org: ${orgId}` : undefined}
        defaults={{
          position: () => ({ x: 120, y: 90 }),
          size: () => ({ width: 980, height: 720 }),
          dockPosition: 'right',
        }}
      >
        <UnifiedCRUDForm
          config={{
            title: 'Cost Centers / مراكز التكلفة',
            formId: 'cost-centers',
            layout: { columns: 2, responsive: true },
            fields: [
              { id: 'code', type: 'text', label: 'Code / الكود', required: true },
              { id: 'name', type: 'text', label: 'Name / الاسم', required: true },
              { id: 'name_ar', type: 'text', label: 'Arabic Name / الاسم بالعربية', required: false },
              { id: 'description', type: 'textarea', label: 'Description / الوصف', rows: 2, required: false, colSpan: 2 },
              {
                id: 'parent_id',
                type: 'searchable-select',
                label: 'Parent (optional) / الأصل',
                optionsProvider: async () => [
                  { value: '', label: '—', searchText: '' },
                  ...list
                    .filter(r => r.level <= 3)
                    .filter(r => !editingId || r.id !== editingId)
                    .map(r => ({
                      value: r.id,
                      label: `${r.code} - ${r.name_ar || r.name}`,
                      searchText: `${r.code} ${r.name_ar || r.name}`,
                    })),
                ],
                clearable: true,
              },
              { id: 'position', type: 'number', label: 'Position / الترتيب', required: false, defaultValue: 0 },
              { id: 'is_active', type: 'checkbox', label: 'Active / نشط', defaultValue: true },
            ],
          } as FormConfig}
          initialData={{
            code: form.code,
            name: form.name,
            name_ar: form.name_ar,
            description: form.description,
            parent_id: form.parent_id,
            is_active: form.is_active,
            position: form.position,
          }}
          onSubmit={async (data) => {
            const payload = {
              code: String(data.code ?? '').trim(),
              name: String(data.name ?? '').trim(),
              name_ar: String(data.name_ar ?? ''),
              description: String(data.description ?? ''),
              parent_id: data.parent_id ? String(data.parent_id) : '',
              is_active: data.is_active === undefined ? true : !!data.is_active,
              position: Number.isFinite(Number(data.position)) ? Number(data.position) : 0,
            }
            setForm(payload)
            await handleSave(payload)
          }}
          onCancel={() => setOpen(false)}
        />
      </DraggablePanelContainer>
    </div>
  )
}

export default CostCentersPage
