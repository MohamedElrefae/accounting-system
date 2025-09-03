import React, { useEffect, useMemo, useState } from 'react'
import styles from './ExpensesCategories.module.css'
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
} from '../../services/expenses-categories'
import type { ExpensesCategoryTreeNode, ExpensesCategoryRow } from '../../types/expenses-categories'
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

const ExpensesCategoriesPage: React.FC = () => {
  const { showToast } = useToast()
  const hasPermission = useHasPermission()
  const canView = hasPermission('expenses_categories.view')
  const canCreate = hasPermission('expenses_categories.create')
  const canUpdate = hasPermission('expenses_categories.update')
  const canDelete = hasPermission('expenses_categories.delete')

  const [tab, setTab] = useState(0)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [orgId, setOrgId] = useState<string>(getInitialOrgId())

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
    if (!canView) return
    (async () => {
      setLoading(true)
      try {
        const orgList = await getOrganizations().catch(() => [])
        setOrgs(orgList)
        const chosen = orgId || orgList[0]?.id || ''
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
      const [t, l, accs] = await Promise.all([
        getExpensesCategoriesTree(chosen, true),
        getExpensesCategoriesList(chosen, true),
        listAccountsForOrg(chosen)
      ])
      setTree(t)
      setList(l)
      setAccounts(accs)
    } catch (e: any) {
      showToast(e.message || 'Failed to reload', { severity: 'error' })
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
    const { fetchNextExpensesCategoryCode } = await import('../../services/expenses-categories')
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
    } catch (e: any) {
      showToast(e.message || 'Toggle failed', { severity: 'error' })
    }
  }

  const handleDelete = async (row: ExpensesCategoryRow) => {
    if (!orgId) return
    if (!confirm(`Delete category ${row.code}?`)) return
    try {
      await deleteExpensesCategory(row.id, orgId)
      showToast('Deleted successfully', { severity: 'success' })
      await reload(orgId)
    } catch (e: any) {
      showToast(e.message || 'Delete failed', { severity: 'error' })
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
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography className={styles.title}>Expenses Categories / فئات المصروفات</Typography>
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
          <TextField size="small" label="Search / بحث" value={search} onChange={(e) => setSearch(e.target.value)} />
          {canCreate && (
            <Button variant="contained" onClick={openCreate}>New / جديد</Button>
          )}
          <ExportButtons data={exportData} config={{ title: 'Expenses Categories', rtlLayout: true }} size="small" />
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
                    })) as any}
                    extraColumns={[
                      { key: 'add_to_cost', header: 'Add to Cost', render: (n: any) => (
                        <input type="checkbox" checked={!!n.add_to_cost} readOnly aria-label="add_to_cost" />
                      )},
                      { key: 'is_active', header: 'Active', render: (n: any) => (
                        <input type="checkbox" checked={!!n.is_active} readOnly aria-label="is_active" />
                      )},
                      { key: 'linked', header: 'Linked Account', render: (n: any) => (
                        <span>{n.linked_account_label || '—'}</span>
                      )},
                      { key: 'children', header: 'Children', render: (n: any) => (
                        <span>{Number.isFinite(n.child_count) ? n.child_count : ''}</span>
                      )},
                      { key: 'has_tx', header: 'Has Tx', render: (n: any) => (
                        <input type="checkbox" checked={!!n.has_transactions} readOnly aria-label="has_transactions" />
                      )},
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
                          <TableCell>Description</TableCell>
                          <TableCell>Level</TableCell>
                          <TableCell>Add to Cost</TableCell>
                          <TableCell>Active</TableCell>
                        <TableCell>Linked Account</TableCell>
                        <TableCell>Children</TableCell>
                        <TableCell>Has Tx</TableCell>
                        <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedList.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{r.code}</TableCell>
                            <TableCell>{r.description}</TableCell>
                            <TableCell>{r.level}</TableCell>
                            <TableCell><Checkbox checked={r.add_to_cost} disabled /></TableCell>
                            <TableCell><Checkbox checked={r.is_active} disabled /></TableCell>
                          <TableCell>{r.linked_account_code ? `${r.linked_account_code}${r.linked_account_name ? ' - ' + r.linked_account_name : ''}` : ''}</TableCell>
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
        <DialogTitle>{editingId ? 'Edit Category / تعديل الفئة' : 'New Category / فئة جديدة'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="dense" label="Code / الكود" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" multiline minRows={2} label="Description / الوصف" value={form.description}
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
                <MenuItem key={r.id} value={r.id}>{r.code} - {r.description}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Linked Account (optional)</InputLabel>
            <Select
              label="Linked Account (optional)"
              value={form.linked_account_id}
              onChange={(e) => setForm({ ...form, linked_account_id: String(e.target.value) })}
            >
              <MenuItem value="">None</MenuItem>
              {accounts.map(a => (
                <MenuItem key={a.id} value={a.id}>{a.code} - {a.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <div className={styles.footerActions}>
            <FormControl>
              <InputLabel shrink>Flags</InputLabel>
            </FormControl>
            <div>
              <Checkbox checked={form.add_to_cost} onChange={(e) => setForm({ ...form, add_to_cost: e.target.checked })} /> Add to cost
              <Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
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

export default ExpensesCategoriesPage

