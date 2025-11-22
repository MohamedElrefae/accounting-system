import React, { useEffect, useMemo, useState } from 'react'
import styles from './SubTree.module.css'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useToast } from '../../contexts/ToastContext'
import { getOrganizations, type Organization } from '../../services/organization'
import {
  getExpensesCategoriesTree,
  getExpensesCategoriesList,
  createExpensesCategory,
  updateExpensesCategory,
  deleteExpensesCategory,
  listAccountsForOrg,
  type AccountLite,
} from '../../services/sub-tree'
import type { ExpensesCategoryTreeNode, ExpensesCategoryRow } from '../../types/sub-tree'
import ExportButtons from '../../components/Common/ExportButtons'
import TreeView from '../../components/TreeView/TreeView'
import UnifiedCRUDForm, { type FormConfig } from '../../components/Common/UnifiedCRUDForm'
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
  Tooltip,
  IconButton,
  Box,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'

async function getInitialOrgId(): Promise<string> {
  try { 
    const { getActiveOrgId } = await import('../../utils/org'); 
    return getActiveOrgId?.() || ''; 
  } catch { 
    return ''; 
  }
}

const SubTreePage: React.FC = () => {
  const { showToast } = useToast()
  const hasPermission = useHasPermission()
  // View-level permission is enforced by the route guard (ProtectedRoute with requiredAction="sub_tree.view")
  const canCreate = hasPermission('sub_tree.create')
  const canUpdate = hasPermission('sub_tree.update')
  const canDelete = hasPermission('sub_tree.delete')

  const [tab, setTab] = useState(0)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [orgId, setOrgId] = useState<string>('')

  const [_tree, setTree] = useState<ExpensesCategoryTreeNode[]>([])
  const [list, setList] = useState<ExpensesCategoryRow[]>([])
  const [accounts, setAccounts] = useState<AccountLite[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Form dialog
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ code: string; description: string; parent_id: string | ''; add_to_cost: boolean; is_active: boolean; linked_account_id: string | ''}>({
    code: '', description: '', parent_id: '', add_to_cost: false, is_active: true, linked_account_id: ''
  })

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [orgList, initialOrgId] = await Promise.all([
          getOrganizations().catch(() => []),
          getInitialOrgId()
        ]);
        setOrgs(orgList)
        const chosen = orgId || initialOrgId || orgList[0]?.id || ''
        if (chosen !== orgId) setOrgId(chosen)
        if (chosen) {
          const [t, l, accs] = await Promise.all([
            getExpensesCategoriesTree(chosen, true),
            getExpensesCategoriesList(chosen, true),
            listAccountsForOrg(chosen)
          ])
          setTree(t)
          setList(l)
          setAccounts(accs)
        }
      } catch (e: unknown) {
        showToast((e as Error).message || 'Failed to load data', { severity: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reload = async (chosen: string) => {
    if (!chosen) return
    setLoading(true)
    try {
      const [t, l, accs] = await Promise.all([
        getExpensesCategoriesTree(chosen, true),
        getExpensesCategoriesList(chosen, true),
        listAccountsForOrg(chosen)
      ])
      setTree(t)
      setList(l)
      setAccounts(accs)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to reload', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filteredList = useMemo(() => {
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(r => r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
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
      { key: 'description', header: 'Description / الوصف', type: 'text' },
      { key: 'level', header: 'Level / المستوى', type: 'number' },
      { key: 'add_to_cost', header: 'Add to Cost / يُضاف للتكلفة', type: 'boolean' },
      { key: 'is_active', header: 'Active / نشط', type: 'boolean' },
      { key: 'linked_account_code', header: 'Linked Account / الحساب المربوط', type: 'text' },
      { key: 'child_count', header: 'Children / الفروع', type: 'number' },
      { key: 'has_transactions', header: 'Has Tx / به معاملات', type: 'boolean' },
    ])
    const rows = filteredList.map(r => ({
      code: r.code,
      description: r.description,
      level: r.level,
      add_to_cost: r.add_to_cost,
      is_active: r.is_active,
      linked_account_code: r.linked_account_code || '',
      child_count: r.child_count ?? 0,
      has_transactions: !!r.has_transactions,
    }))
    return prepareTableData(columns, rows)
  }, [filteredList])

  // Fetch next code from server to ensure concurrency safety and numeric codes
  const getNextCode = async (parentId?: string | null) => {
    if (!orgId) return ''
    const { fetchNextExpensesCategoryCode } = await import('../../services/sub-tree')
    return fetchNextExpensesCategoryCode(orgId, parentId ?? null)
  }

  const openCreate = async () => {
    setEditingId(null)
    const code = await getNextCode(null)
    setForm({ code, description: '', parent_id: '', add_to_cost: false, is_active: true, linked_account_id: '' })
    setOpen(true)
  }

  const openEdit = (row: ExpensesCategoryRow) => {
    setEditingId(row.id)
    setForm({
      code: row.code,
      description: row.description,
      parent_id: row.parent_id || '',
      add_to_cost: row.add_to_cost,
      is_active: row.is_active,
      linked_account_id: row.linked_account_id || ''
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!orgId) { showToast('Select organization', { severity: 'warning' }); return }
    try {
      if (editingId) {
        await updateExpensesCategory({
          id: editingId,
          code: form.code,
          description: form.description,
          add_to_cost: form.add_to_cost,
          is_active: form.is_active,
          linked_account_id: form.linked_account_id || null,
          org_id: orgId,
        })
        showToast('Updated successfully', { severity: 'success' })
      } else {
        await createExpensesCategory({
          org_id: orgId,
          code: form.code,
          description: form.description,
          add_to_cost: form.add_to_cost,
          parent_id: form.parent_id || null,
          linked_account_id: form.linked_account_id || null,
        })
        showToast('Created successfully', { severity: 'success' })
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
      description: '',
      parent_id: parentId,
      add_to_cost: parent.add_to_cost,
      is_active: true,
      linked_account_id: ''
    })
    setOpen(true)
  }

  const handleToggleActive = async (row: ExpensesCategoryRow) => {
    try {
      await updateExpensesCategory({ id: row.id, is_active: !row.is_active, org_id: orgId })
      showToast(row.is_active ? 'Deactivated' : 'Activated', { severity: 'success' })
      await reload(orgId)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Toggle failed', { severity: 'error' })
    }
  }

  const handleDelete = async (row: ExpensesCategoryRow) => {
    if (!orgId) return
    if (!confirm(`Delete category ${row.code}?`)) return
    try {
      await deleteExpensesCategory(row.id, orgId)
      showToast('Deleted successfully', { severity: 'success' })
      await reload(orgId)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Delete failed', { severity: 'error' })
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography className={styles.title}>Sub Tree / الشجرة الفرعية</Typography>
        <div className={styles.toolbar}>
          <FormControl size="small">
            <InputLabel>Organization</InputLabel>
            <Select
              label="Organization"
              value={orgId}
              onChange={async (e) => {
                const v = String(e.target.value)
                setOrgId(v)
                try { 
                  const { setActiveOrgId } = await import('../../utils/org'); 
                  setActiveOrgId?.(v); 
                } catch { /* ignore org utils errors */ }
                await reload(v)
              }}
            >
              {orgs.map(o => (
                <MenuItem key={o.id} value={o.id}>{o.code} - {o.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="Search / بحث" value={search} onChange={(e) => setSearch(e.target.value)} />
          {canCreate && (
            <Button variant="contained" onClick={openCreate}>New / جديد</Button>
          )}
          <ExportButtons data={exportData} config={{ title: 'Sub Tree الشجرة الفرعية', rtlLayout: true }} size="small" />
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
                      name_ar: r.description,
                      name_en: r.description,
                      level: r.level,
                      parent_id: r.parent_id,
                      is_active: r.is_active,
                      account_type: r.linked_account_code ? 'linked' : '',
                      add_to_cost: r.add_to_cost,
                      linked_account_label: r.linked_account_code ? `${r.linked_account_code}${r.linked_account_name ? ' - ' + r.linked_account_name : ''}` : '',
                      child_count: r.child_count ?? 0,
                      has_transactions: !!r.has_transactions,
                    }))}
                    extraColumns={[
                      { key: 'add_to_cost', header: 'Add to Cost', render: (n: ExpensesCategoryTreeNode) => (
                        <input type="checkbox" checked={!!n.add_to_cost} readOnly aria-label="add_to_cost" />
                      )},
                      { key: 'is_active', header: 'Active', render: (n: ExpensesCategoryTreeNode) => (
                        <input type="checkbox" checked={!!n.is_active} readOnly aria-label="is_active" />
                      )},
                      { key: 'linked', header: 'Linked Account', render: (n: ExpensesCategoryTreeNode & { linked_account_label?: string }) => (
                        <span>{n.linked_account_label || '—'}</span>
                      )},
                      { key: 'children', header: 'Children', render: (n: ExpensesCategoryTreeNode & { child_count?: number }) => (
                        <span>{Number.isFinite(n.child_count) ? n.child_count : ''}</span>
                      )},
                      { key: 'has_tx', header: 'Has Tx', render: (n: ExpensesCategoryTreeNode & { has_transactions?: boolean }) => (
                        <input type="checkbox" checked={!!n.has_transactions} readOnly aria-label="has_transactions" />
                      )},
                    ]}
                    onEdit={(node: any) => {
                      const row = list.find(r => r.id === node.id)
                      if (row) openEdit(row)
                    }}
                    onAdd={async (parentNode: any) => handleAddChild(parentNode.id)}
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
                  <div className={styles.tableWrapper}>
                    <div className={styles.tableScrollArea}>
<Table
                        size="small"
                        stickyHeader
                        className={styles.dataTable}
                        sx={{
                          '& .MuiTableCell-root': {
                            color: 'var(--text)',
                            borderColor: 'var(--border)',
                            fontFamily: 'var(--font-family, inherit)',
                            fontSize: 'var(--font-size, 0.95rem)'
                          },
                          '& .MuiTableHead-root': {
                            background: 'var(--topbar_bg)'
                          },
                          '& tbody .MuiTableRow-root:hover': {
                            backgroundColor: 'var(--hover_bg, rgba(0,0,0,0.03))'
                          }
                        }}
                      >
                        <TableHead className={styles.tableHeader}>
                          <TableRow className={styles.tableRow}>
                            <TableCell className={styles.tableCell}>Code</TableCell>
                            <TableCell className={styles.tableCell}>Description</TableCell>
                            <TableCell className={styles.tableCell}>Level</TableCell>
                            <TableCell className={styles.tableCell}>Add to Cost</TableCell>
                            <TableCell className={styles.tableCell}>Active</TableCell>
                            <TableCell className={styles.tableCell}>Linked Account</TableCell>
                            <TableCell className={styles.tableCell}>Children</TableCell>
                            <TableCell className={styles.tableCell}>Has Tx</TableCell>
                            <TableCell align="right" className={styles.tableCell}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pagedList.map(r => (
<TableRow
                              key={r.id}
                              className={styles.tableRow}
                              sx={{
                                '& [data-actions="1"]': { opacity: 0, transition: 'opacity .2s ease' },
                                '&:hover [data-actions="1"]': { opacity: 1 }
                              }}
                            >
                              <TableCell className={styles.tableCell}>{r.code}</TableCell>
                              <TableCell className={styles.tableCell}>{r.description}</TableCell>
                              <TableCell className={styles.tableCell}>{r.level}</TableCell>
                              <TableCell className={styles.tableCell}><Checkbox checked={r.add_to_cost} disabled /></TableCell>
                              <TableCell className={styles.tableCell}><Checkbox checked={r.is_active} disabled /></TableCell>
                              <TableCell className={styles.tableCell}>{r.linked_account_code ? `${r.linked_account_code}${r.linked_account_name ? ' - ' + r.linked_account_name : ''}` : ''}</TableCell>
                              <TableCell className={styles.tableCell}>{r.child_count ?? 0}</TableCell>
                              <TableCell className={styles.tableCell}><Checkbox checked={!!r.has_transactions} disabled /></TableCell>
<TableCell align="right" className={styles.tableCell}>
<Box data-actions="1" className={styles.actionButtons} sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                  {canUpdate && (
                                    <Tooltip title="Edit">
                                      <IconButton size="small" color="primary" onClick={() => openEdit(r)}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {canUpdate && r.level < 4 && (
                                    <Tooltip title="Add Sub">
                                      <IconButton size="small" color="success" onClick={() => handleAddChild(r.id)}>
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {canUpdate && (
                                    <Tooltip title={r.is_active ? 'Deactivate' : 'Activate'}>
                                      <IconButton size="small" color="warning" onClick={() => handleToggleActive(r)}>
                                        {r.is_active ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {canDelete && (
                                    <Tooltip title="Delete">
                                      <IconButton size="small" color="error" onClick={() => handleDelete(r)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <TablePagination
                      component="div"
                      count={filteredList.length}
                      page={page}
                      onPageChange={(_, newPage) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      className={styles.tablePagination}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? 'Edit Node / تعديل العقدة' : 'New Node / عقدة جديدة'}</DialogTitle>
        <DialogContent>
          <UnifiedCRUDForm
            config={{
              title: 'Sub Tree / الشجرة الفرعية',
              formId: 'sub-tree',
              layout: { columns: 2, responsive: true },
              fields: [
                {
                  id: 'linked_account_id',
                  type: 'searchable-select',
                  label: 'Linked Account / الحساب المربوط',
                  required: false,
                  optionsProvider: async () => accounts
                    .filter(a => (a.is_postable ?? false) && (a.allow_transactions ?? false))
                    .map(a => ({
                      value: a.id,
                      label: `${a.code} - ${a.name_ar ?? a.name}`,
                      searchText: `${a.code} ${a.name_ar ?? a.name}`,
                    })),
                  clearable: true,
                  colSpan: 2,
                },
                { id: 'code', type: 'text', label: 'Code / الكود', required: true },
                { 
                  id: 'description', 
                  type: 'textarea', 
                  label: 'Description (AR) / الوصف', 
                  rows: 2, 
                  required: true,
                  // Enforce DB constraint (1..300 chars)
                  validation: (v: unknown) => {
                    const s = String(v ?? '').trim();
                    if (s.length < 1) return { field: 'description', message: 'الوصف مطلوب (على الأقل حرف واحد)' } as any;
                    if (s.length > 300) return { field: 'description', message: 'الوصف يجب ألا يزيد عن 300 حرف' } as any;
                    return null;
                  }
                },
                {
                  id: 'parent_id',
                  type: 'searchable-select',
                  label: 'Parent (optional) / الأصل',
                  optionsProvider: async () => [
                    { value: '', label: '—' },
                    ...list.filter(r => r.level <= 3).map(r => ({ value: r.id, label: `${r.code} - ${r.description}`, searchText: `${r.code} ${r.description}` }))
                  ],
                  clearable: true,
                },
                { id: 'add_to_cost', type: 'checkbox', label: 'Add to Cost / يُضاف للتكلفة', defaultValue: form.add_to_cost },
                { id: 'is_active', type: 'checkbox', label: 'Active / نشط', defaultValue: form.is_active },
              ],
            } as FormConfig}
            initialData={{
              code: form.code,
              description: form.description,
              parent_id: form.parent_id,
              add_to_cost: form.add_to_cost,
              is_active: form.is_active,
              linked_account_id: form.linked_account_id,
            }}
            onSubmit={async (data) => {
              // Client-side enforcement of DB constraints
              const codeVal = String(data.code || '').trim();
              const descVal = String(data.description || '').trim();
              if (descVal.length < 1 || descVal.length > 300) {
                showToast('الوصف مطلوب وبحد أقصى 300 حرف', { severity: 'error' });
                return;
              }
              const payload = {
                code: codeVal,
                description: descVal,
                parent_id: (data.parent_id ? String(data.parent_id) : ''),
                add_to_cost: !!data.add_to_cost,
                is_active: data.is_active === undefined ? true : !!data.is_active,
                linked_account_id: data.linked_account_id ? String(data.linked_account_id) : '',
              };
              setForm(payload);
              await handleSave();
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default SubTreePage
