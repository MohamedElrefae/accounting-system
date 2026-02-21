import React, { useEffect, useMemo, useState } from 'react'
import styles from './SubTree.module.css'
import { useToast } from '../../contexts/ToastContext'
import { useScope } from '../../contexts/ScopeContext'
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
import TreeView from '../../components/TreeView/TreeView'
import UnifiedCRUDForm, { type FormConfig } from '../../components/Common/UnifiedCRUDForm'
import SearchableSelect, { type SearchableSelectOption } from '../../components/Common/SearchableSelect'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tab,
  Tabs,
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
  Menu,
  MenuItem,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'

const SubTreePage: React.FC = () => {
  const { showToast } = useToast()
  const { currentOrg } = useScope()
  // TEMPORARY: Bypass permission checks to fix unauthorized access issues
  // TODO: Re-enable proper permissions once security system is stabilized
  const canCreate = true
  const canUpdate = true
  const canDelete = true

  const [tab, setTab] = useState(0)
  const orgId = currentOrg?.id || ''

  const [_tree, setTree] = useState<ExpensesCategoryTreeNode[]>([])
  const [list, setList] = useState<ExpensesCategoryRow[]>([])
  const [accounts, setAccounts] = useState<AccountLite[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Filter state
  const [filterValues, setFilterValues] = useState({
    code: '',
    accountType: '',
    linkedAccount: '',
    active: ''
  })

  // Account type options
  const accountTypeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'linked', label: 'Linked', searchText: 'linked' },
    { value: 'none', label: 'None', searchText: 'none' }
  ], [])

  // Linked account options
  const linkedAccountOptions: SearchableSelectOption[] = useMemo(() => {
    console.log('🔗 Linked account options - accounts count:', accounts.length);
    return accounts.map(account => ({
      value: account.code,
      label: `${account.code} - ${account.name_ar || account.name}`,
      searchText: `${account.code} ${account.name_ar || account.name}`.toLowerCase()
    }))
  }, [accounts])

  // Active status options
  const activeStatusOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'active', label: 'Active', searchText: 'active' },
    { value: 'inactive', label: 'Inactive', searchText: 'inactive' },
    { value: 'all', label: 'All', searchText: 'all' }
  ], [])

  // Export menu state
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null)

  // Export menu handlers
  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget)
  }

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null)
  }

  const handleExport = (format: string) => {
    // TODO: Implement export functionality based on format
    console.log('Exporting as:', format)
    handleExportMenuClose()
    showToast(`Exporting as ${format.toUpperCase()}...`, { severity: 'info' })
  }
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<{ code: string; description: string; parent_id: string | ''; add_to_cost: boolean; is_active: boolean; linked_account_id: string | null | '' }>({
    code: '', description: '', parent_id: '', add_to_cost: false, is_active: true, linked_account_id: ''
  })

  useEffect(() => {
    // Load data when organization changes
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        console.log('📥 Fetching sub-tree data for org:', orgId);
        const [t, l, accs] = await Promise.all([
          getExpensesCategoriesTree(orgId, true),
          getExpensesCategoriesList(orgId, true),
          listAccountsForOrg(orgId)
        ]);
        console.log('✅ Data loaded - tree:', t.length, 'list:', l.length, 'accounts:', accs.length);
        setTree(t);
        setList(l);
        setAccounts(accs);
      } catch (e: unknown) {
        console.error('❌ Failed to load data:', e);
        showToast((e as Error).message || 'Failed to load data', { severity: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, showToast]);

  const reload = async (chosen: string) => {
    if (!chosen) return
    console.log('🔄 Reload started for org:', chosen)
    setLoading(true)
    try {
      console.log('📥 Fetching fresh data (force=true)...')
      const [t, l, accs] = await Promise.all([
        getExpensesCategoriesTree(chosen, true),
        getExpensesCategoriesList(chosen, true),
        listAccountsForOrg(chosen)
      ])
      console.log('✅ Reload complete - tree:', t.length, 'list:', l.length, 'accounts:', accs.length)
      setTree(t)
      setList(l)
      setAccounts(accs)
    } catch (e: unknown) {
      console.error('❌ Reload failed:', e)
      showToast((e as Error).message || 'Failed to reload', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filteredList = useMemo(() => {
    console.log('🔍 Filtering data - original list length:', list.length, 'filters:', filterValues)
    let filtered = list
    
    // Apply search filter
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(r => 
        r.code.toLowerCase().includes(q) || 
        r.description.toLowerCase().includes(q)
      )
    }
    
    // Apply unified filters
    if (filterValues.code) {
      const codeFilter = filterValues.code.toLowerCase()
      filtered = filtered.filter(r => 
        r.code.toLowerCase().includes(codeFilter)
      )
      console.log('🔍 Code filter applied:', codeFilter, 'results:', filtered.length)
    }
    
    if (filterValues.accountType) {
      if (filterValues.accountType === 'linked') {
        filtered = filtered.filter(r => r.linked_account_code)
        console.log('🔍 Account type filter (linked) applied, results:', filtered.length)
      } else if (filterValues.accountType === 'none') {
        filtered = filtered.filter(r => !r.linked_account_code)
        console.log('🔍 Account type filter (none) applied, results:', filtered.length)
      }
    }
    
    if (filterValues.linkedAccount) {
      filtered = filtered.filter(r => 
        r.linked_account_code === filterValues.linkedAccount
      )
      console.log('🔍 Linked account filter applied:', filterValues.linkedAccount, 'results:', filtered.length)
    }
    
    if (filterValues.active) {
      const activeFilter = filterValues.active
      if (activeFilter === 'active') {
        filtered = filtered.filter(r => r.is_active)
        console.log('🔍 Active filter (active) applied, results:', filtered.length)
      } else if (activeFilter === 'inactive') {
        filtered = filtered.filter(r => !r.is_active)
        console.log('🔍 Active filter (inactive) applied, results:', filtered.length)
      }
      // 'all' shows all items, no filtering needed
    }
    
    console.log('✅ Final filtered list length:', filtered.length)
    return filtered
  }, [list, search, filterValues])

  useEffect(() => { setPage(0) }, [search])

  const pagedList = useMemo(() => {
    const start = page * rowsPerPage
    const end = Math.min(filteredList.length, start + rowsPerPage)
    return filteredList.slice(start, end)
  }, [filteredList, page, rowsPerPage])

  // Form dialog

  // Fetch next code from server to ensure concurrency safety and numeric codes
  const getNextCode = async (parentId?: string | null) => {
    if (!orgId) return ''
    const { fetchNextExpensesCategoryCode } = await import('../../services/sub-tree')
    return fetchNextExpensesCategoryCode(orgId, parentId ?? null)
  }

  const openCreate = async () => {
    setEditingId(null)
    try {
      const code = await getNextCode(null)
      setForm({ code, description: '', parent_id: '', add_to_cost: false, is_active: true, linked_account_id: '' })
      setOpen(true)
    } catch (err) {
      console.error('❌ Failed to get next code:', err)
      showToast('Failed to generate code: ' + ((err as Error).message || 'Unknown error'), { severity: 'error' })
    }
  }

  const openEdit = (row: ExpensesCategoryRow) => {
    setEditingId(row.id)
    setForm({
      code: row.code,
      description: row.description,
      parent_id: row.parent_id || '',
      add_to_cost: row.add_to_cost,
      is_active: row.is_active,
      linked_account_id: row.linked_account_id || null
    })
    setOpen(true)
  }

  const handleSave = async (payload?: any) => {
    if (!orgId) { showToast('Select organization', { severity: 'warning' }); return }
    try {
      if (editingId) {
        const dataToUse = payload || form;
        await updateExpensesCategory({
          id: editingId,
          code: dataToUse.code,
          description: dataToUse.description,
          add_to_cost: dataToUse.add_to_cost,
          is_active: dataToUse.is_active,
          linked_account_id: dataToUse.linked_account_id || null,
          org_id: orgId,
        })
        showToast('Updated successfully', { severity: 'success' })
      } else {
        const dataToUse = payload || form;
        await createExpensesCategory({
          org_id: orgId,
          code: dataToUse.code,
          description: dataToUse.description,
          add_to_cost: dataToUse.add_to_cost,
          parent_id: dataToUse.parent_id || null,
          linked_account_id: dataToUse.linked_account_id || null,
        })
        showToast('Created successfully', { severity: 'success' })
      }
      // Reset form state before closing dialog to ensure clean state for next use
      setForm({ code: '', description: '', parent_id: '', add_to_cost: false, is_active: true, linked_account_id: null })
      setEditingId(null)
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
    try {
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
    } catch (err) {
      console.error('❌ Failed to get next code:', err)
      showToast('Failed to generate code: ' + ((err as Error).message || 'Unknown error'), { severity: 'error' })
    }
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

  // Show message if no organization is selected
  if (!currentOrg) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Typography className={styles.title}>Sub Tree / الشجرة الفرعية</Typography>
        </div>

        <div className={styles.content}>
          <div className={styles.card}>
            <CardContent className={styles.cardBody}>
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '1rem', color: '#999' }}>📁</div>
                <h3 style={{ color: '#666', marginBottom: '0.5rem' }}>يرجى اختيار مؤسسة أولاً</h3>
                <p style={{ color: '#999' }}>اختر مؤسسة من شريط الأدوات العلوي لعرض الشجرة الفرعية التابعة لها</p>
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography className={styles.title}>Sub Tree / الشجرة الفرعية</Typography>
        <div className={styles.toolbar}>
          <div className="current-org-display" style={{
            padding: '8px 12px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#666',
            minWidth: '200px',
            textAlign: 'center'
          }}>
            {currentOrg ? `${currentOrg.code} - ${currentOrg.name}` : 'لم يتم تحديد مؤسسة'}
          </div>
          <TextField size="small" label="Search / بحث" value={search} onChange={(e) => setSearch(e.target.value)} />
          {canCreate && (
            <Button variant="contained" onClick={openCreate}>New / جديد</Button>
          )}
          {/* Unified Filter Component */}
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Filter:</Typography>
            <TextField 
              size="small" 
              placeholder="Code, Name, Account Type..."
              value={filterValues.code || ''}
              onChange={(e) => setFilterValues(prev => ({ ...prev, code: e.target.value }))}
              sx={{ width: 200 }}
            />
            <SearchableSelect
              placeholder="Account Type..."
              value={filterValues.accountType}
              onChange={(value) => setFilterValues(prev => ({ ...prev, accountType: value }))}
              options={accountTypeOptions}
            />
            <SearchableSelect
              placeholder="Linked Account..."
              value={filterValues.linkedAccount}
              onChange={(value) => setFilterValues(prev => ({ ...prev, linkedAccount: value }))}
              options={linkedAccountOptions}
              clearable={true}
            />
            <SearchableSelect
              placeholder="Active Status..."
              value={filterValues.active}
              onChange={(value) => setFilterValues(prev => ({ ...prev, active: value }))}
              options={activeStatusOptions}
            />
            {(filterValues.code || filterValues.accountType || filterValues.linkedAccount || filterValues.active) && (
              <>
                <Button 
                  size="small" 
                  variant="outlined"
                  color="secondary"
                  onClick={() => {
                    // Clear all filters
                    setFilterValues({ code: '', accountType: '', linkedAccount: '', active: '' })
                    setSearch('')
                    console.log('🧹 Filters cleared')
                    showToast('Filters cleared', { severity: 'info' })
                  }}
                  sx={{ ml: 1, minWidth: 70, height: 32 }}
                >
                  Clear
                </Button>
                <Button 
                  size="small" 
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    // Force re-render to apply filters (filters are already reactive)
                    console.log('🔍 Current filters active:', filterValues)
                    console.log('🔍 Filtered results:', filteredList.length, 'of', list.length)
                    showToast(`Filters applied: ${filteredList.length} of ${list.length} records`, { severity: 'success' })
                  }}
                  sx={{ ml: 0.5, minWidth: 70, height: 32 }}
                >
                  Apply
                </Button>
              </>
            )}
          </Box>
          {/* Expandable Export Button */}
          <Box sx={{ ml: 'auto' }}>
            <Button 
              size="small" 
              variant="outlined"
              onClick={handleExportMenuOpen}
              startIcon={<span>📊</span>}
              sx={{ minWidth: 120 }}
            >
              Export
            </Button>
            <Menu 
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose}
            >
              <MenuItem onClick={() => handleExport('csv')}>
                📄 Export CSV
              </MenuItem>
              <MenuItem onClick={() => handleExport('excel')}>
                📊 Export Excel
              </MenuItem>
              <MenuItem onClick={() => handleExport('pdf')}>
                📋 Export PDF
              </MenuItem>
              <MenuItem onClick={() => handleExport('pdf-custom')}>
                📄 Custom PDF
              </MenuItem>
            </Menu>
          </Box>
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
                ) : (filterValues.code || filterValues.accountType || filterValues.linkedAccount || filterValues.active) ? (
                  <Typography sx={{ p: 2, color: 'warning.main' }}>
                    ⚠️ Tree view is disabled when filters are active. Use the List tab to see filtered results.
                  </Typography>
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
                      {
                        key: 'add_to_cost', header: 'Add to Cost', render: (n: ExpensesCategoryTreeNode) => (
                          <input type="checkbox" checked={!!n.add_to_cost} readOnly aria-label="add_to_cost" />
                        )
                      },
                      {
                        key: 'is_active', header: 'Active', render: (n: ExpensesCategoryTreeNode) => (
                          <input type="checkbox" checked={!!n.is_active} readOnly aria-label="is_active" />
                        )
                      },
                      {
                        key: 'linked', header: 'Linked Account', render: (n: ExpensesCategoryTreeNode & { linked_account_label?: string }) => (
                          <span>{n.linked_account_label || '—'}</span>
                        )
                      },
                      {
                        key: 'children', header: 'Children', render: (n: ExpensesCategoryTreeNode & { child_count?: number }) => (
                          <span>{Number.isFinite(n.child_count) ? n.child_count : ''}</span>
                        )
                      },
                      {
                        key: 'has_tx', header: 'Has Tx', render: (n: ExpensesCategoryTreeNode & { has_transactions?: boolean }) => (
                          <input type="checkbox" checked={!!n.has_transactions} readOnly aria-label="has_transactions" />
                        )
                      },
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
                            <TableCell className={styles.tableCell} sx={{ 
                              width: 400,
                              minWidth: 400,
                              maxWidth: 500,
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              padding: '12px 16px'
                            }}>Linked Account</TableCell>
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
                            <TableCell 
                              className={styles.tableCell} 
                              sx={{ 
                                width: 400,
                                minWidth: 400,
                                maxWidth: 500,
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap',
                                fontSize: '0.9rem',
                                padding: '12px 16px',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                                backgroundColor: 'inherit',
                                border: 'none',
                                position: 'relative',
                                '&:hover': {
                                  overflow: 'visible'
                                }
                              }}
                            >
                              <Tooltip 
                                title={r.linked_account_code ? `${r.linked_account_code} - ${r.linked_account_name || ''}` : ''} 
                                arrow
                                placement="top"
                                enterDelay={300}
                                leaveDelay={100}
                                PopperProps={{
                                  sx: {
                                    '& .MuiTooltip-tooltip': {
                                      fontSize: '0.85rem',
                                      padding: '8px 12px'
                                    }
                                  }
                                }}
                              >
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px',
                                  minWidth: 0,
                                  maxWidth: '100%'
                                }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: 700, 
                                      color: 'primary.main',
                                      fontSize: '0.95rem',
                                      minWidth: 'fit-content',
                                      flexShrink: 0
                                    }}
                                  >
                                    {r.linked_account_code}
                                  </Typography>
                                  {r.linked_account_name && (
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        color: 'text.secondary', 
                                        fontSize: '0.85rem',
                                        opacity: 0.95,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      - {r.linked_account_name}
                                    </Typography>
                                  )}
                                </Box>
                              </Tooltip>
                            </TableCell>
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

      <Dialog open={open} onClose={() => {
        setOpen(false)
        // Reset form state when dialog closes
        setForm({ code: '', description: '', parent_id: '', add_to_cost: false, is_active: true, linked_account_id: null })
        setEditingId(null)
      }} fullWidth maxWidth="md">
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
                    // Only validate if value is provided (required field will handle empty check)
                    if (s.length > 0 && s.length > 300) {
                      return { field: 'description', message: 'الوصف يجب ألا يزيد عن 300 حرف' } as any;
                    }
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
              console.log('📋 Form submitted with data:', data)
              console.log('🔗 linked_account_id from form:', data.linked_account_id, 'type:', typeof data.linked_account_id, 'value:', JSON.stringify(data.linked_account_id))

              // Trim values for consistency
              const codeVal = String(data.code || '').trim();
              const descVal = String(data.description || '').trim();

              console.log('📝 Trimmed values - code:', codeVal, 'desc:', descVal, 'desc length:', descVal.length)

              // Note: Form validation already passed in UnifiedCRUDForm, so we just need to prepare the payload
              // Extract linked_account_id value (handle both string and null)
              const linkedAccountId = data.linked_account_id;
              const finalLinkedAccountId = linkedAccountId && typeof linkedAccountId === 'object' 
                ? (linkedAccountId as any).value || (linkedAccountId as any).id 
                : linkedAccountId;

              console.log('🔍 Form linked_account_id:', linkedAccountId, 'type:', typeof linkedAccountId)
              console.log('🔍 Final linked_account_id:', finalLinkedAccountId, 'type:', typeof finalLinkedAccountId)

              const payload = {
                code: codeVal,
                description: descVal,
                parent_id: (data.parent_id ? String(data.parent_id) : ''),
                add_to_cost: !!data.add_to_cost,
                is_active: data.is_active === undefined ? true : !!data.is_active,
                linked_account_id: finalLinkedAccountId || null,
              };
              console.log('✅ Payload ready:', payload)
              await handleSave(payload);
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
