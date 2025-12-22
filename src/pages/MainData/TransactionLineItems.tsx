import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './TransactionLineItems.module.css'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useToast } from '../../contexts/ToastContext'
import { getOrganizations, type Organization } from '../../services/organization'
import { lineItemsCatalogService, type CatalogItem } from '../../services/line-items-catalog'
import { useScopeOptional } from '../../contexts/ScopeContext'

import ExportButtons from '../../components/Common/ExportButtons'
import TreeView from '../../components/TreeView/TreeView'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import UnifiedCRUDForm, { type FormConfig } from '../../components/Common/UnifiedCRUDForm'
import DraggablePanelContainer from '../../components/Common/DraggablePanelContainer'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import {
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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

const TransactionLineItemsPage: React.FC = () => {
  const { showToast } = useToast()
  const hasPermission = useHasPermission()
  const scope = useScopeOptional()
  const initialOrgId = scope?.currentOrg?.id || ''
  const canCreate = hasPermission('transaction_line_items.create')
  const canUpdate = hasPermission('transaction_line_items.update')
  const canDelete = hasPermission('transaction_line_items.delete')

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

  const reload = useCallback(async (chosen: string) => {
    if (!chosen) return
    setLoading(true)
    try {
      const catalogItems: CatalogItem[] = await lineItemsCatalogService.list(chosen, true)

      const itemsWithMeta: TransactionLineItemRow[] = catalogItems.map(item => ({
        id: item.id,
        item_code: item.code || null,
        item_name: item.name || null,
        item_name_ar: item.name_ar || null,
        parent_id: item.parent_id || null,
        unit_price: Number(item.standard_cost ?? 0),
        unit_of_measure: item.base_unit_of_measure ?? null,
        is_active: item.is_active,
        level: item.level ?? calculateLevelFromCode(item.code || ''),
        child_count: 0,
        has_usage: false,
        usage_count: 0,
      }))

      // Basic stats computed client-side
      const rootItems = itemsWithMeta.filter(r => !r.parent_id).length
      const maxDepth = Math.max(0, ...itemsWithMeta.map(r => r.level || 1))
      setList(itemsWithMeta)
      setStats({ totalItems: itemsWithMeta.length, rootItems, maxDepth, usageCount: 0 })
      if (import.meta.env.DEV) console.log('✅ Loaded', itemsWithMeta.length, 'catalog items from line_items')
    } catch (e: unknown) {
      showToast((e as Error).message || 'Failed to reload', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const orgList = await getOrganizations().catch(() => [])
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
  }, [initialOrgId, orgId, reload, showToast])

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

  // Get next code from unified line_items catalog service
  const getNextCode = async (parentId?: string | null) => {
    if (!orgId) return '1000'
    try {
      return await lineItemsCatalogService.getNextCode(orgId, parentId ?? null)
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

  const handleSave = async (payloadOverride?: {
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
  }) => {
    if (!orgId) { showToast('Select organization', { severity: 'warning' }); return }
    const payload = payloadOverride ?? form
    try {
      if (editingId) {
        await lineItemsCatalogService.update(editingId, orgId, {
          code: payload.item_code,
          name: payload.item_name,
          name_ar: payload.item_name_ar || undefined,
          parent_id: payload.parent_id || null,
          base_unit_of_measure: payload.unit_of_measure || undefined,
          standard_cost: payload.unit_price,
          is_active: payload.is_active,
        })
        showToast('تم التحديث بنجاح', { severity: 'success' })
      } else {
        await lineItemsCatalogService.create(orgId, {
          code: payload.item_code,
          name: payload.item_name,
          name_ar: payload.item_name_ar || undefined,
          parent_id: payload.parent_id || null,
          base_unit_of_measure: payload.unit_of_measure,
          standard_cost: payload.unit_price,
          is_active: payload.is_active,
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
      await lineItemsCatalogService.update(row.id, orgId, {
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
      await lineItemsCatalogService.remove(row.id, orgId)
      showToast('تم الحذف بنجاح', { severity: 'success' })
      await reload(orgId)
    } catch (e: unknown) {
      showToast((e as Error).message || 'Delete failed', { severity: 'error' })
    }
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
              onChange={async (e) => {
                const v = String(e.target.value)
                setOrgId(v)
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} 
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
                        render: () => <span>1</span>
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

      <DraggablePanelContainer
        storageKey="panel:transaction-line-items:crud"
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Edit Line Item / تعديل بند التكلفة' : 'New Line Item / بند تكلفة جديد'}
        subtitle={orgId ? `Org: ${orgId}` : undefined}
        defaults={{
          position: () => ({ x: 140, y: 90 }),
          size: () => ({ width: 1100, height: 760 }),
          dockPosition: 'right',
        }}
      >
        <UnifiedCRUDForm
          config={{
            title: 'Transaction Line Items Catalog / بنود التكلفة التفصيلية',
            formId: 'transaction-line-items',
            layout: { columns: 2, responsive: true },
            fields: [
              { id: 'item_code', type: 'text', label: 'Code / الكود', required: true },
              { id: 'item_name', type: 'text', label: 'Name / الاسم', required: true },
              { id: 'item_name_ar', type: 'text', label: 'Arabic Name / الاسم بالعربية', required: false },
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
                      label: `${r.item_code || ''} - ${r.item_name_ar || r.item_name || ''}`,
                      searchText: `${r.item_code || ''} ${(r.item_name_ar || r.item_name || '')}`,
                    })),
                ],
                clearable: true,
              },
              { id: 'quantity', type: 'number', label: 'Quantity / الكمية', required: false, defaultValue: 1 },
              { id: 'unit_price', type: 'number', label: 'Unit Price / سعر الوحدة', required: false, defaultValue: 0 },
              { id: 'unit_of_measure', type: 'text', label: 'Unit of Measure / الوحدة', required: false },
              { id: 'position', type: 'number', label: 'Position / الترتيب', required: false, defaultValue: 0 },
              { id: 'is_active', type: 'checkbox', label: 'Active / نشط', defaultValue: true },
            ],
          } as FormConfig}
          initialData={{
            item_code: form.item_code,
            item_name: form.item_name,
            item_name_ar: form.item_name_ar,
            description: form.description,
            parent_id: form.parent_id,
            quantity: form.quantity,
            unit_price: form.unit_price,
            unit_of_measure: form.unit_of_measure,
            is_active: form.is_active,
            position: form.position,
          }}
          onSubmit={async (data) => {
            const payload = {
              item_code: String(data.item_code ?? '').trim(),
              item_name: String(data.item_name ?? '').trim(),
              item_name_ar: String(data.item_name_ar ?? ''),
              description: String(data.description ?? ''),
              parent_id: data.parent_id ? String(data.parent_id) : '',
              quantity: Number.isFinite(Number(data.quantity)) ? Number(data.quantity) : 1,
              unit_price: Number.isFinite(Number(data.unit_price)) ? Number(data.unit_price) : 0,
              unit_of_measure: String(data.unit_of_measure ?? ''),
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

export default TransactionLineItemsPage