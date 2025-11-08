import React, { useEffect, useMemo, useState } from 'react'
import styles from './TransactionLineItems.module.css'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useToast } from '../../contexts/ToastContext'
import { getOrganizations, type Organization } from '../../services/organization'
import { transactionLineItemsCatalogService, type DbTxLineItem } from '../../services/transaction-line-items-enhanced'

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

async function getInitialOrgId(): Promise<string> {
  try {
    const { getActiveOrgId } = await import('../../utils/org')
    return getActiveOrgId?.() || ''
  } catch {
    return ''
  }
}

type TransactionLineItemRow = {
  id: string
  item_code: string | null
  item_name: string | null
  item_name_ar: string | null
  parent_id?: string | null
  unit_price: number
  unit_of_measure: string | null
  is_active: boolean
  level: number
  child_count: number
  has_usage: boolean
  usage_count: number
}

const TransactionLineItemsPage: React.FC = () => {
  const { showToast } = useToast()
  const hasPermission = useHasPermission()
  const canView = hasPermission('transaction_line_items.view')
  const canCreate = hasPermission('transaction_line_items.create')
  const canUpdate = hasPermission('transaction_line_items.update')
  const canDelete = hasPermission('transaction_line_items.delete')

  const [tab, setTab] = useState(0)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [orgId, setOrgId] = useState<string>('')

  const [list, setList] = useState<TransactionLineItemRow[]>([])

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    rootItems: 0,
    maxDepth: 0,
    usageCount: 0
  })

  // Form dialog
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    item_code: string
    item_name: string
    item_name_ar: string
    description: string
    parent_id: string | ''
    quantity: number
    unit_price: number
    unit_of_measure: string
    is_active: boolean
    position: number
  }>({
    item_code: '',
    item_name: '',
    item_name_ar: '',
    description: '',
    parent_id: '',
    quantity: 1,
    unit_price: 0,
    unit_of_measure: 'piece',
    is_active: true,
    position: 0
  })

  useEffect(() => {
    if (!canView) return
    ;(async () => {
      setLoading(true)
      try {
        const [orgList, initialOrgId] = await Promise.all([
          getOrganizations().catch(() => []),
          getInitialOrgId()
        ])
        setOrgs(orgList)
        const chosen = orgId || initialOrgId || orgList[0]?.id || ''
        if (chosen !== orgId) setOrgId(chosen)
        if (chosen) {
          await reload(chosen)
        }
      } catch (e: unknown) {
        showToast((e as Error).message || 'Failed to load data', { severity: 'error' })
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
      const catalogItems: DbTxLineItem[] = await transactionLineItemsCatalogService.getCatalogItems(chosen, true)

      const itemsWithMeta: TransactionLineItemRow[] = catalogItems.map(item => ({
        id: item.id,
        item_code: item.item_code || null,
        item_name: item.item_name || null,
        item_name_ar: item.item_name_ar || null,
        parent_id: item.parent_id || null,
        unit_price: item.unit_price ?? 0,
        unit_of_measure: item.unit_of_measure ?? null,
        is_active: item.is_active !== false,
        level: calculateLevelFromCode(item.item_code || ''),
        child_count: 0,
        has_usage: false,
        usage_count: 0,
      }))

      // Basic stats computed client-side
      const rootItems = itemsWithMeta.filter(r => !r.parent_id).length
      const maxDepth = Math.max(0, ...itemsWithMeta.map(r => r.level || 1))
      setList(itemsWithMeta)
      setStats({ totalItems: itemsWithMeta.length, rootItems, maxDepth, usageCount: 0 })
      console.log('✅ Loaded', itemsWithMeta.length, 'catalog items')
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to reload', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Calculate level from item code (1000=1, 1100=2, etc.)
  const calculateLevelFromCode = (code: string): number => {
    if (!code || !/^\d+$/.test(code)) return 1
    const codeNum = parseInt(code, 10)
    if (codeNum >= 1000 && codeNum < 10000) {
      if (codeNum % 1000 === 0) return 1      // 1000, 2000, 3000
      if (codeNum % 100 === 0) return 2       // 1100, 1200, 1300  
      if (codeNum % 10 === 0) return 3        // 1110, 1120, 1130
      return 4                                // 1111, 1112, 1113
    }
    return 1
  }

  const filteredList = useMemo(() => {
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(r =>
      (r.item_code && r.item_code.toLowerCase().includes(q)) ||
      (r.item_name && r.item_name.toLowerCase().includes(q)) ||
      (r.item_name_ar && r.item_name_ar.toLowerCase().includes(q))
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
      { key: 'item_code', header: 'Code / الكود', type: 'text' },
      { key: 'item_name', header: 'Name / الاسم', type: 'text' },
      { key: 'item_name_ar', header: 'Arabic Name / الاسم بالعربية', type: 'text' },
      { key: 'level', header: 'Level / المستوى', type: 'number' },
      { key: 'quantity', header: 'Quantity / الكمية', type: 'number' },
      { key: 'unit_price', header: 'Unit Price / سعر الوحدة', type: 'number' },
      { key: 'unit_of_measure', header: 'Unit / الوحدة', type: 'text' },
      { key: 'is_active', header: 'Active / نشط', type: 'boolean' },
      { key: 'usage_count', header: 'Usage / الاستخدام', type: 'number' },
    ])
    const rows = filteredList.map(r => ({
      item_code: r.item_code || '',
      item_name: r.item_name || '',
      item_name_ar: r.item_name_ar || '',
      level: r.level,
      quantity: 1,
      unit_price: r.unit_price,
      unit_of_measure: r.unit_of_measure || '',
      is_active: r.is_active !== false,
      usage_count: r.usage_count,
    }))
    return prepareTableData(columns, rows)
  }, [filteredList])

  // Get next code from service
  const getNextCode = async (parentId?: string | null) => {
    if (!orgId) return '1000'
    try {
      return await transactionLineItemsCatalogService.getNextCatalogItemCode(orgId, parentId ?? undefined)
    } catch (e: unknown) {
      const error = e as Error
      showToast(
        error?.message ? `تعذر جلب الكود التالي: ${error.message}` : 'تعذر جلب الكود التالي',
        { severity: 'warning' }
      )
      return '1000'
    }
  }

  const openCreate = async () => {
    setEditingId(null)
    const code = await getNextCode(null)
    setForm({
      item_code: code,
      item_name: '',
      item_name_ar: '',
      description: '',
      parent_id: '',
      quantity: 1,
      unit_price: 0,
      unit_of_measure: 'piece',
      is_active: true,
      position: 0
    })
    setOpen(true)
  }

  const openEdit = (row: TransactionLineItemRow) => {
    setEditingId(row.id)
    setForm({
      item_code: row.item_code || '',
      item_name: row.item_name || '',
      item_name_ar: row.item_name_ar || '',
      description: '',
      parent_id: row.parent_id || '',
      quantity: 1,
      unit_price: row.unit_price,
      unit_of_measure: row.unit_of_measure || 'piece',
      is_active: row.is_active !== false,
      position: 0
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!orgId) { showToast('Select organization', { severity: 'warning' }); return }
    try {
      if (editingId) {
        await transactionLineItemsCatalogService.updateCatalogItem(editingId, orgId, {
          item_code: form.item_code,
          item_name: form.item_name,
          item_name_ar: form.item_name_ar || undefined,
          parent_id: form.parent_id ? form.parent_id : undefined,
          unit_of_measure: form.unit_of_measure || undefined,
          unit_price: form.unit_price,
          quantity: form.quantity,
          is_active: form.is_active,
          position: form.position,
        })
        showToast('تم التحديث بنجاح', { severity: 'success' })
      } else {
        await transactionLineItemsCatalogService.createCatalogItem(orgId, {
          item_code: form.item_code,
          item_name: form.item_name,
          item_name_ar: form.item_name_ar || undefined,
          parent_id: form.parent_id || undefined,
          unit_of_measure: form.unit_of_measure,
          unit_price: form.unit_price,
          quantity: form.quantity,
          position: form.position,
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
      item_code: code,
      item_name: '',
      item_name_ar: '',
      description: '',
      parent_id: parentId,
      quantity: 1,
      unit_price: 0,
      unit_of_measure: parent.unit_of_measure || 'piece',
      is_active: true,
      position: 0
    })
    setOpen(true)
  }

  const handleToggleActive = async (row: TransactionLineItemRow) => {
    try {
      await transactionLineItemsCatalogService.updateCatalogItem(row.id, orgId, {
        is_active: !row.is_active,
      })
      showToast(row.is_active ? 'تم التعطيل' : 'تم التفعيل', { severity: 'success' })
      await reload(orgId)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Toggle failed', { severity: 'error' })
    }
  }

  const handleDelete = async (row: TransactionLineItemRow) => {
    if (!orgId) return
    if (!confirm(`حذف بند التكلفة ${row.item_code}؟`)) return
    try {
      await transactionLineItemsCatalogService.deleteCatalogItem(row.id, orgId)
      showToast('تم الحذف بنجاح', { severity: 'success' })
      await reload(orgId)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Delete failed', { severity: 'error' })
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
        <Typography className={styles.title}>Transaction Line Items Catalog / بنود التكلفة التفصيلية</Typography>
        <div className={styles.toolbar}>
          <FormControl size="small">
            <InputLabel>Organization</InputLabel>
            <Select
              label="Organization"
              value={orgId}
              onChange={(e) => {
                const v = String(e.target.value)
                setOrgId(v)
                ;(async () => {
                  try {
                    const { setActiveOrgId } = await import('../../utils/org')
                    setActiveOrgId?.(v)
                  } catch {}
                  await reload(v)
                })()
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
            config={{ title: 'Transaction Line Items Catalog', rtlLayout: true }} 
            size="small" 
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.content}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Items</div>
            <div className={styles.statValue}>{stats.totalItems}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Root Items</div>
            <div className={styles.statValue}>{stats.rootItems}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Max Depth</div>
            <div className={styles.statValue}>{stats.maxDepth}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Usage Count</div>
            <div className={styles.statValue}>{stats.usageCount}</div>
          </div>
        </div>

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
                      code: r.item_code || '',
                      name_ar: r.item_name_ar || r.item_name || '',
                      name_en: r.item_name || '',
                      level: r.level,
                      parent_id: r.parent_id,
                      is_active: r.is_active !== false,
                      account_type: 'catalog',
                      project_name: '',
                      child_count: r.child_count,
                      has_transactions: r.has_usage,
                    }))}
                    extraColumns={[
                      { 
                        key: 'quantity', 
                        header: 'Quantity', 
                        render: (n) => {
                          const item = list.find(i => i.id === n.id)
return <span>{1}</span>
                        }
                      },
                      { 
                        key: 'unit_price', 
                        header: 'Unit Price', 
                        render: (n) => {
                          const item = list.find(i => i.id === n.id)
                          return <span>{item?.unit_price || 0}</span>
                        }
                      },
                      { 
                        key: 'unit_of_measure', 
                        header: 'Unit', 
                        render: (n) => {
                          const item = list.find(i => i.id === n.id)
                          return <span>{item?.unit_of_measure || 'piece'}</span>
                        }
                      },
                      { 
                        key: 'is_active', 
                        header: 'Active', 
                        render: (n) => (
                          <input type="checkbox" checked={!!n.is_active} readOnly aria-label="is_active" />
                        )
                      },
                      { 
                        key: 'usage', 
                        header: 'Usage', 
                        render: (n) => {
                          const item = list.find(i => i.id === n.id)
                          return <span>{item?.usage_count || 0}</span>
                        }
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
                          <TableCell>Quantity</TableCell>
                          <TableCell>Unit Price</TableCell>
                          <TableCell>Unit</TableCell>
                          <TableCell>Active</TableCell>
                          <TableCell>Usage</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedList.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <span className={styles.codeDisplay}>{r.item_code}</span>
                            </TableCell>
                            <TableCell>{r.item_name}</TableCell>
                            <TableCell>{r.item_name_ar || ''}</TableCell>
                            <TableCell>{r.level}</TableCell>
<TableCell>{1}</TableCell>
                            <TableCell>{r.unit_price}</TableCell>
                            <TableCell>{r.unit_of_measure}</TableCell>
                            <TableCell><Checkbox checked={r.is_active !== false} disabled /></TableCell>
                            <TableCell>{r.usage_count}</TableCell>
                            <TableCell align="right">
                              {canUpdate && r.level < 4 && (
                                <Button size="small" onClick={() => handleAddChild(r.id)}>Add Sub</Button>
                              )}
                              {canUpdate && (
                                <Button size="small" onClick={() => handleToggleActive(r)}>
                                  {r.is_active !== false ? 'Disable' : 'Enable'}
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
        <DialogTitle>{editingId ? 'Edit Line Item / تعديل بند التكلفة' : 'New Line Item / بند تكلفة جديد'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth 
            margin="dense" 
            label="Code / الكود" 
            value={form.item_code}
            onChange={(e) => setForm({ ...form, item_code: e.target.value })}
          />
          <TextField
            fullWidth 
            margin="dense" 
            label="Name / الاسم" 
            value={form.item_name}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
          />
          <TextField
            fullWidth 
            margin="dense" 
            label="Arabic Name / الاسم بالعربية" 
            value={form.item_name_ar}
            onChange={(e) => setForm({ ...form, item_name_ar: e.target.value })}
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
                <MenuItem key={r.id} value={r.id}>{r.item_code} - {r.item_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth 
            margin="dense" 
            type="number" 
            label="Quantity / الكمية" 
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
          />
          <TextField
            fullWidth 
            margin="dense" 
            type="number" 
            label="Unit Price / سعر الوحدة" 
            value={form.unit_price}
            onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })}
          />
          <TextField
            fullWidth 
            margin="dense" 
            label="Unit of Measure / الوحدة" 
            value={form.unit_of_measure}
            onChange={(e) => setForm({ ...form, unit_of_measure: e.target.value })}
          />
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

export default TransactionLineItemsPage