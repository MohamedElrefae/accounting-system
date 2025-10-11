import React from 'react'
import { Box, Typography, Tabs, Tab, Button, Stack, Tooltip, CircularProgress, Table, TableBody, TableHead, TableRow, TableCell, TablePagination, useTheme, Checkbox, FormGroup, FormControlLabel, Drawer, TextField, Snackbar, Alert as MuiAlert, Alert } from '@mui/material'
import * as XLSX from 'xlsx'
import ErrorIcon from '@mui/icons-material/Error'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { OpeningBalanceImportService } from '@/services/OpeningBalanceImportService'
import UnifiedCRUDForm, { type FormConfig } from '@/components/Common/UnifiedCRUDForm'
import { supabase } from '@/utils/supabase'
import DraggableResizableDialog from '@/components/Common/DraggableResizableDialog'

interface Props {
  open: boolean
  onClose: () => void
  importId: string
  orgId: string
  fiscalYearId: string
  uploadHeaders?: string[]
}

function useImportStatus(importId: string, open: boolean) {
  const [status, setStatus] = React.useState<any>(null)
  React.useEffect(() => {
    if (!open || !importId) return
    let cancelled = false
    let timer: any
    const sub = OpeningBalanceImportService.subscribeToImport({ importId, onTick: (rec) => {
      if (!cancelled) setStatus(rec)
    } })
    const poll = async () => {
      try {
        const s = await OpeningBalanceImportService.getImportStatus(importId)
        if (!cancelled) setStatus(s)
      } catch {}
      timer = setTimeout(poll, 2000)
    }
    poll()
    return () => { cancelled = true; clearTimeout(timer); sub?.unsubscribe?.() }
  }, [importId, open])
  return status
}

export default function EnhancedOBImportResultsModal(props: Props) {
  const { open, onClose, importId, orgId, fiscalYearId, uploadHeaders } = props
  const theme = useTheme()
  const [tab, setTab] = React.useState(0)
  // Persist last active tab per import id
  React.useEffect(() => {
    if (!importId) return
    try {
      const saved = localStorage.getItem(`obi_results_tab_${importId}`)
      if (saved) setTab(parseInt(saved, 10) || 0)
    } catch {}
  }, [importId])
  React.useEffect(() => {
    if (!importId) return
    try { localStorage.setItem(`obi_results_tab_${importId}`, String(tab)) } catch {}
  }, [tab, importId])

  // Pagination state
  const [page, setPage] = React.useState(0)
  const [rowsPerPage, setRowsPerPage] = React.useState(50)
  const [exportAllLoading, setExportAllLoading] = React.useState(false)
  const [exportAllProgress, setExportAllProgress] = React.useState<{done:number,total:number}>({done:0,total:0})
  const [loadingRows, setLoadingRows] = React.useState(false)
  const [rows, setRows] = React.useState<any[]>([])
  const [total, setTotal] = React.useState(0)
  const [grandTotals, setGrandTotals] = React.useState<{debit:number,credit:number}|null>(null)

  const status = useImportStatus(importId, open)

  // Local snackbars for export results
  const [snack, setSnack] = React.useState<{open:boolean; message:string; severity:'success'|'error'|'info'}>({open:false,message:'',severity:'success'})
  const openSnack = (message: string, severity: 'success'|'error'|'info'='success') => setSnack({open:true,message,severity})

  // Column chooser
  const allColumns = React.useMemo(() => [
    'account_code','account_name_en','account_name_ar','level',
    'opening_balance_debit','opening_balance_credit','project_code','cost_center_code','currency_code','created_at','created_by'
  ], [])
  const [visibleCols, setVisibleCols] = React.useState<Set<string>>(() => new Set(allColumns))

  // Persist settings per importId
  React.useEffect(() => {
    if (!importId) return
    try {
      const keyCols = `obi_results_cols_${importId}`
      const raw = localStorage.getItem(keyCols)
      if (raw) {
        const arr = JSON.parse(raw) as string[]
        setVisibleCols(new Set(arr.filter(c => allColumns.includes(c))))
      }
      const keyPage = `obi_results_pagesize_${importId}`
      const ps = localStorage.getItem(keyPage)
      if (ps) setRowsPerPage(parseInt(ps,10) || 50)
    } catch {}
  }, [importId, allColumns])

  React.useEffect(() => {
    if (!importId) return
    try { localStorage.setItem(`obi_results_cols_${importId}`, JSON.stringify(Array.from(visibleCols))) } catch {}
  }, [visibleCols, importId])

  React.useEffect(() => {
    if (!importId) return
    try { localStorage.setItem(`obi_results_pagesize_${importId}`, String(rowsPerPage)) } catch {}
  }, [rowsPerPage, importId])

  // Edit state
  const canEdit = ['completed','partially_completed'].includes(status?.status)
  const [editRow, setEditRow] = React.useState<any|null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  // Searchable options caches
  const [accountOptions, setAccountOptions] = React.useState<{value:string,label:string}[]>([])
  const [projectOptions, setProjectOptions] = React.useState<{value:string,label:string}[]>([])
  const [costCenterOptions, setCostCenterOptions] = React.useState<{value:string,label:string}[]>([])

  const preloadOptions = React.useCallback(async () => {
    try {
      if (orgId) {
        const [acc, proj, cc] = await Promise.all([
          supabase.from('accounts').select('id, code, name').eq('org_id', orgId).order('code').limit(200),
          supabase.from('projects').select('id, code, name').or(`org_id.eq.${orgId},org_id.is.null`).order('code').limit(200),
          supabase.from('cost_centers').select('id, code, name').eq('org_id', orgId).order('code').limit(200),
        ])
        if (!acc.error) setAccountOptions((acc.data||[]).map((r:any)=>({ value: r.id, label: `${r.code} — ${r.name||''}`.trim() })))
        if (!proj.error) setProjectOptions(((proj.data as any[])||[]).map((r:any)=>({ value: r.id, label: `${r.code}${r.name? ' — '+r.name:''}` })))
        if (!cc.error) setCostCenterOptions(((cc.data as any[])||[]).map((r:any)=>({ value: r.id, label: `${r.code}${r.name? ' — '+r.name:''}` })))
      }
    } catch {}
  }, [orgId])

  React.useEffect(() => { if (editOpen) { preloadOptions() } }, [editOpen, preloadOptions])

  const editConfig: FormConfig = React.useMemo(() => ({
    title: 'Edit Opening Balance Row',
    fields: [
      { id: 'account_id', type: 'searchable-select', label: 'Account', required: true, options: accountOptions },
      { id: 'project_id', type: 'searchable-select', label: 'Project', required: false, options: projectOptions, isClearable: true },
      { id: 'cost_center_id', type: 'searchable-select', label: 'Cost Center', required: false, options: costCenterOptions, isClearable: true },
      { id: 'amount', type: 'number', label: 'Amount', required: true },
      { id: 'currency_code', type: 'text', label: 'Currency', required: false },
    ],
    submitLabel: 'Save',
    cancelLabel: 'Cancel',
  }), [accountOptions, projectOptions, costCenterOptions])

  const [filterAccount, setFilterAccount] = React.useState('')
  const [filterProject, setFilterProject] = React.useState('')
  const [filterCC, setFilterCC] = React.useState('')
  const debouncedFilters = (() => {
    const [val, setVal] = React.useState({ account: '', project: '', cc: '' })
    React.useEffect(() => {
      const t = setTimeout(() => setVal({ account: filterAccount, project: filterProject, cc: filterCC }), 400)
      return () => clearTimeout(t)
    }, [filterAccount, filterProject, filterCC])
    return val
  })()

  const loadPage = React.useCallback(async (pageIndex: number, size: number) => {
    if (!importId || !orgId || !fiscalYearId) return
    setLoadingRows(true)
    try {
      const { rows, totalCount } = await OpeningBalanceImportService.fetchOpeningBalancesByImport({
        orgId,
        fiscalYearId,
        importId,
        page: pageIndex + 1,
        pageSize: size,
        orderBy: 'created_at',
        orderDir: 'desc',
        filters: { accountCode: debouncedFilters.account, projectCode: debouncedFilters.project, costCenterCode: debouncedFilters.cc }
      })
      // Enrich
      const maps = await OpeningBalanceImportService.fetchEnrichmentMaps({
        accountIds: rows.map(r => r.account_id),
        projectIds: rows.map(r => r.project_id ?? null),
        costCenterIds: rows.map(r => r.cost_center_id ?? null)
      })
      const enriched = rows.map((r: any) => {
        const acc = maps.accounts.get(r.account_id)
        const proj = r.project_id ? maps.projects.get(r.project_id) : undefined
        const cc = r.cost_center_id ? maps.costCenters.get(r.cost_center_id) : undefined
        const amount = Number(r.amount ?? 0)
        const debit = amount > 0 ? amount : 0
        const credit = amount < 0 ? Math.abs(amount) : 0
        return {
          ...r,
          account_code: acc?.code ?? '',
          account_name_en: acc?.name ?? '',
          account_name_ar: acc?.name_ar ?? '',
          level: acc?.level ?? null,
          parent_code: undefined, // parent_path computed on server in some envs; keep blank if not available
          parent_path: undefined,
          project_code: proj?.code ?? '',
          cost_center_code: cc?.code ?? '',
          opening_balance_debit: debit,
          opening_balance_credit: credit,
        }
      })
      setRows(enriched)
      setTotal(totalCount)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    } finally {
      setLoadingRows(false)
    }
  }, [importId, orgId, fiscalYearId])

  React.useEffect(() => { if (open) loadPage(0, rowsPerPage) }, [open, loadPage, rowsPerPage, debouncedFilters])

  // Fetch and cache grand totals once per import
  React.useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!open || !importId || !orgId || !fiscalYearId) return
      try {
        const cacheKey = `obi_results_grandtot_${importId}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          try { setGrandTotals(JSON.parse(cached)) } catch {}
        }
        const totals = await OpeningBalanceImportService.fetchImportGrandTotals({ orgId, fiscalYearId, importId })
        if (!cancelled) {
          setGrandTotals(totals)
          try { localStorage.setItem(cacheKey, JSON.stringify(totals)) } catch {}
        }
      } catch {}
    }
    run()
    return () => { cancelled = true }
  }, [open, importId, orgId, fiscalYearId])

  const statusChip = status?.status === 'completed'
    ? { color: 'success', icon: <CheckCircleIcon sx={{ mr: 1 }} />, label: 'Completed' }
    : status?.status === 'failed'
      ? { color: 'error', icon: <ErrorIcon sx={{ mr: 1 }} />, label: 'Failed' }
      : status?.status === 'partially_completed'
        ? { color: 'warning', icon: <ErrorIcon sx={{ mr: 1 }} />, label: 'Partial' }
        : { color: 'info', icon: <CircularProgress size={16} sx={{ mr: 1 }} />, label: 'Processing' }

  return (
    <DraggableResizableDialog
      open={open}
      onClose={onClose}
      storageKey={`obi.results.modal.${importId || 'latest'}`}
      title={
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6">Opening Balance Import Results</Typography>
          <Stack direction="row" alignItems="center" color={(theme.palette as any)[statusChip.color].main}>
            {statusChip.icon}
            <Typography variant="body2" sx={{ ml: 1 }}>{statusChip.label}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Total: {status?.totalRows ?? 0} • Success: {status?.successRows ?? 0} • Failed: {status?.failedRows ?? 0}
            {grandTotals ? ` • Grand: Debit ${grandTotals.debit} / Credit ${grandTotals.credit}` : ''}
          </Typography>
        </Stack>
      }
      initialWidth={1100}
      initialHeight={700}
    >

      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Imported Rows" />
            <Tab label="Failed Rows" />
            <Tab label="Upload Columns" />
          </Tabs>
          {tab === 0 && (
            <Stack direction={{ xs:'column', sm:'row' }} spacing={1} alignItems={{ xs:'stretch', sm:'center' }}>
              <Button size="small" variant="outlined" disabled={exportAllLoading} onClick={() => {
                // Export current page CSV
                const headers = allColumns.filter(c => visibleCols.has(c))
                const csvLines = [headers.join(',')]
                for (const r of rows) {
                  const line = headers.map(h => {
                    const v = r[h] ?? ''
                    const s = String(v)
                    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s
                  }).join(',')
                  csvLines.push(line)
                }
                const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'opening_balances_page.csv'
                a.click()
                URL.revokeObjectURL(url)
              }}>Export CSV</Button>
              <Button size="small" variant="outlined" onClick={() => {
                const headers = allColumns.filter(c => visibleCols.has(c))
                const data = rows.map(r => Object.fromEntries(headers.map(h => [h, r[h]])))
                const payload = { rows: data, totals: grandTotals ?? undefined }
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'opening_balances_page.json'
                a.click()
                URL.revokeObjectURL(url)
              }}>Export JSON</Button>
              <Button size="small" variant="outlined" onClick={() => {
                const next = new Set(visibleCols)
                if (next.has('account_name_en')) { next.delete('account_name_en'); next.delete('account_name_ar') } else { next.add('account_name_en'); next.add('account_name_ar') }
                setVisibleCols(next)
              }}>Toggle Names</Button>
              <Button size="small" onClick={async ()=>{
                try { await navigator.clipboard.writeText(`Grand totals — Debit: ${grandTotals?.debit ?? 0} • Credit: ${grandTotals?.credit ?? 0}`); openSnack('Totals copied','success') } catch { openSnack('Copy failed','error') }
              }}>Copy totals</Button>
              <Button size="small" variant="outlined" onClick={() => {
                try {
                  const headers = allColumns.filter(c => visibleCols.has(c))
                  const aoa:any[] = [headers]
                  for (const r of rows) aoa.push(headers.map(h => r[h] ?? ''))
                  if (grandTotals) {
                    aoa.push([])
                    aoa.push(['Totals_Debit', grandTotals.debit])
                    aoa.push(['Totals_Credit', grandTotals.credit])
                  }
                  const ws = XLSX.utils.aoa_to_sheet(aoa)
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, 'CurrentPage')
                  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
                  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'opening_balances_page.xlsx'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) { console.error(e); openSnack('Export failed','error') }
              }}>Export Page (Excel)</Button>
              <Button size="small" variant="contained" color="primary" disabled={exportAllLoading} onClick={async () => {
                if (!importId || !orgId || !fiscalYearId) return
                setExportAllLoading(true)
                setExportAllProgress({done:0,total:0})
                try {
                  const batchSize = 500
                  // First get total count
                  const head = await OpeningBalanceImportService.fetchOpeningBalancesByImport({ orgId, fiscalYearId, importId, page: 1, pageSize: 1 })
                  const totalCount = head.totalCount
                  setExportAllProgress({done:0,total:totalCount})
                  const headers = allColumns.filter(c => visibleCols.has(c))
                  const csvLines: string[] = [headers.join(',')]
                  const pages = Math.max(1, Math.ceil(totalCount / batchSize))
                  for (let p=1;p<=pages;p++) {
                    const { rows } = await OpeningBalanceImportService.fetchOpeningBalancesByImport({ orgId, fiscalYearId, importId, page: p, pageSize: batchSize })
                    const maps = await OpeningBalanceImportService.fetchEnrichmentMaps({
                      accountIds: rows.map(r => r.account_id),
                      projectIds: rows.map(r => r.project_id ?? null),
                      costCenterIds: rows.map(r => r.cost_center_id ?? null)
                    })
                    for (const r of rows) {
                      const acc = maps.accounts.get(r.account_id)
                      const proj = r.project_id ? maps.projects.get(r.project_id) : undefined
                      const cc = r.cost_center_id ? maps.costCenters.get(r.cost_center_id) : undefined
                      const amount = Number(r.amount ?? 0)
                      const debit = amount > 0 ? amount : 0
                      const credit = amount < 0 ? Math.abs(amount) : 0
                      const enriched:any = {
                        ...r,
                        account_code: acc?.code ?? '',
                        account_name_en: acc?.name ?? '',
                        account_name_ar: acc?.name_ar ?? '',
                        level: acc?.level ?? null,
                        project_code: proj?.code ?? '',
                        cost_center_code: cc?.code ?? '',
                        opening_balance_debit: debit,
                        opening_balance_credit: credit,
                      }
                      const line = headers.map(h => {
                        const v = enriched[h] ?? ''
                        const s = String(v)
                        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s
                      }).join(',')
                      csvLines.push(line)
                    }
                    setExportAllProgress({done: Math.min(p*batchSize, totalCount), total: totalCount})
                  }
                  if (grandTotals) {
                    csvLines.push('')
                    csvLines.push(`Totals_Debit,${grandTotals.debit}`)
                    csvLines.push(`Totals_Credit,${grandTotals.credit}`)
                  }
                  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'opening_balances_all.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) {
                  console.error(e)
                  openSnack('Export failed', 'error')
                } finally {
                  setExportAllLoading(false)
                  openSnack('Export complete', 'success')
                }
              }}>{exportAllLoading ? `Exporting… ${exportAllProgress.done}/${exportAllProgress.total}` : 'Export All (CSV)'}</Button>
              <Button size="small" variant="outlined" disabled={exportAllLoading} onClick={async () => {
                if (!importId || !orgId || !fiscalYearId) return
                setExportAllLoading(true)
                setExportAllProgress({done:0,total:0})
                try {
                  const batchSize = 500
                  const head = await OpeningBalanceImportService.fetchOpeningBalancesByImport({ orgId, fiscalYearId, importId, page: 1, pageSize: 1 })
                  const totalCount = head.totalCount
                  setExportAllProgress({done:0,total:totalCount})
                  const headers = allColumns.filter(c => visibleCols.has(c))
                  const allRows: any[] = []
                  const pages = Math.max(1, Math.ceil(totalCount / batchSize))
                  for (let p=1;p<=pages;p++) {
                    const { rows } = await OpeningBalanceImportService.fetchOpeningBalancesByImport({ orgId, fiscalYearId, importId, page: p, pageSize: batchSize })
                    const maps = await OpeningBalanceImportService.fetchEnrichmentMaps({
                      accountIds: rows.map(r => r.account_id),
                      projectIds: rows.map(r => r.project_id ?? null),
                      costCenterIds: rows.map(r => r.cost_center_id ?? null)
                    })
                    for (const r of rows) {
                      const acc = maps.accounts.get(r.account_id)
                      const proj = r.project_id ? maps.projects.get(r.project_id) : undefined
                      const cc = r.cost_center_id ? maps.costCenters.get(r.cost_center_id) : undefined
                      const amount = Number(r.amount ?? 0)
                      const debit = amount > 0 ? amount : 0
                      const credit = amount < 0 ? Math.abs(amount) : 0
                      const enriched:any = {
                        ...r,
                        account_code: acc?.code ?? '',
                        account_name_en: acc?.name ?? '',
                        account_name_ar: acc?.name_ar ?? '',
                        level: acc?.level ?? null,
                        project_code: proj?.code ?? '',
                        cost_center_code: cc?.code ?? '',
                        opening_balance_debit: debit,
                        opening_balance_credit: credit,
                      }
                      allRows.push(Object.fromEntries(headers.map(h => [h, enriched[h]])))
                    }
                    setExportAllProgress({done: Math.min(p*batchSize, totalCount), total: totalCount})
                  }
                  const payload = { rows: allRows, totals: grandTotals ?? undefined }
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'opening_balances_all.json'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) {
                  console.error(e)
                  openSnack('Export failed', 'error')
                } finally {
                  setExportAllLoading(false)
                  openSnack('Export complete', 'success')
                }
              }}>Export All (JSON)</Button>
              <TextField size="small" label="Account code" value={filterAccount} onChange={(e)=> setFilterAccount(e.target.value)} />
              <TextField size="small" label="Project code" value={filterProject} onChange={(e)=> setFilterProject(e.target.value)} />
              <TextField size="small" label="Cost center code" value={filterCC} onChange={(e)=> setFilterCC(e.target.value)} />
              <Button size="small" onClick={() => { setFilterAccount(''); setFilterProject(''); setFilterCC(''); }}>Clear Filters</Button>
            </Stack>
          )}
        </Stack>

        {/* Grand totals banner */}
        {tab === 0 && grandTotals && (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {(Math.round((grandTotals.debit - grandTotals.credit)*100)/100) !== 0 && (
              <MuiAlert severity="warning" variant="outlined">Out of balance: Debit {grandTotals.debit} vs Credit {grandTotals.credit}</MuiAlert>
            )}
            <Typography variant="body2" color="text.secondary">Grand totals — Debit: {grandTotals.debit} • Credit: {grandTotals.credit}</Typography>
          </Stack>
        )}

        {/* Imported Rows */}
        {tab === 0 && (
          <Box sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {visibleCols.has('account_code') && <TableCell>account_code</TableCell>}
                  {visibleCols.has('account_name_en') && <TableCell>account_name_en</TableCell>}
                  {visibleCols.has('account_name_ar') && <TableCell>account_name_ar</TableCell>}
                  {visibleCols.has('level') && <TableCell>level</TableCell>}
                  {visibleCols.has('opening_balance_debit') && <TableCell>opening_balance_debit</TableCell>}
                  {visibleCols.has('opening_balance_credit') && <TableCell>opening_balance_credit</TableCell>}
                  {visibleCols.has('project_code') && <TableCell>project_code</TableCell>}
                  {visibleCols.has('cost_center_code') && <TableCell>cost_center_code</TableCell>}
                  {visibleCols.has('currency_code') && <TableCell>currency_code</TableCell>}
                  {visibleCols.has('created_at') && <TableCell>created_at</TableCell>}
                  {visibleCols.has('created_by') && <TableCell>created_by</TableCell>}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} hover>
                    {visibleCols.has('account_code') && <TableCell>{r.account_code}</TableCell>}
                    {visibleCols.has('account_name_en') && <TableCell>{r.account_name_en}</TableCell>}
                    {visibleCols.has('account_name_ar') && <TableCell>{r.account_name_ar}</TableCell>}
                    {visibleCols.has('level') && <TableCell>{r.level ?? ''}</TableCell>}
                    {visibleCols.has('opening_balance_debit') && <TableCell align="right">{r.opening_balance_debit ?? ''}</TableCell>}
                    {visibleCols.has('opening_balance_credit') && <TableCell align="right">{r.opening_balance_credit ?? ''}</TableCell>}
                    {visibleCols.has('project_code') && <TableCell>{r.project_code}</TableCell>}
                    {visibleCols.has('cost_center_code') && <TableCell>{r.cost_center_code}</TableCell>}
                    {visibleCols.has('currency_code') && <TableCell>{r.currency_code ?? ''}</TableCell>}
                    {visibleCols.has('created_at') && <TableCell>{r.created_at ?? ''}</TableCell>}
                    {visibleCols.has('created_by') && <TableCell>{r.created_by ?? ''}</TableCell>}
                    <TableCell align="right">
                      <Button size="small" disabled={!canEdit} onClick={() => { setEditRow(r); setEditOpen(true) }}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {loadingRows && (
                  <TableRow><TableCell colSpan={11}><Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography variant="body2">Loading…</Typography></Stack></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <FormGroup row sx={{ mt: 1 }}>
              {allColumns.map((c) => (
                <FormControlLabel key={c} control={<Checkbox checked={visibleCols.has(c)} onChange={(e) => {
                  const next = new Set(visibleCols); if (e.target.checked) next.add(c); else next.delete(c); setVisibleCols(next)
                }} />} label={c} />
              ))}
            </FormGroup>
            {/* Totals footer for current page */}
            <Stack direction={{ xs:'column', sm:'row' }} justifyContent="space-between" alignItems={{ xs:'flex-start', sm:'center' }} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Page totals — Debit: {rows.reduce((s,r)=>s+Number(r.opening_balance_debit||0),0)} • Credit: {rows.reduce((s,r)=>s+Number(r.opening_balance_credit||0),0)}
              </Typography>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, p) => { setPage(p); loadPage(p, rowsPerPage) }}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { const v = parseInt(e.target.value, 10); setRowsPerPage(v); setPage(0); loadPage(0, v) }}
                rowsPerPageOptions={[25,50,100]}
              />
            </Stack>
          </Box>
        )}

        {/* Failed Rows */}
        {tab === 1 && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Button size="small" variant="outlined" onClick={() => {
                try {
                  const rows = (status?.errorReport || []) as any[]
                  if (!rows.length) return
                  const allKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
                  const aoa = [allKeys]
                  for (const r of rows) aoa.push(allKeys.map(k => r[k] ?? ''))
                  const ws = XLSX.utils.aoa_to_sheet(aoa)
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, 'FailedRows')
                  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
                  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'opening_balance_failed_rows.xlsx'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) { console.error(e); openSnack('Failed to export Excel', 'error') }
              }}>Export Excel</Button>
            </Stack>
            {Array.isArray(status?.errorReport) && status.errorReport.length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>row_number</TableCell>
                    <TableCell>message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {status.errorReport.map((e: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{e.row_number ?? ''}</TableCell>
                      <TableCell>{e.message ?? e.error ?? ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">No failed rows.</Typography>
            )}
          </Box>
        )}

        {/* Upload Columns */}
        {tab === 2 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Detected headers from uploaded file:</Typography>
            {uploadHeaders && uploadHeaders.length ? (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {uploadHeaders.map((h, i) => (
                  <Box key={i} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, px: 1, py: 0.5, mr: 1, mb: 1 }}>{h}</Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">No headers captured.</Typography>
            )}
          </Box>
        )}
      </Box>
      {/* Edit Drawer using UnifiedCRUDForm */}
      <Drawer anchor="right" open={editOpen} onClose={() => setEditOpen(false)}>
        <Box sx={{ width: 420, p: 2 }}>
          {editRow && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Account: {editRow.account_code || ''} • Project: {editRow.project_code || ''} • Cost Center: {editRow.cost_center_code || ''}
              </Typography>
              <UnifiedCRUDForm
              config={editConfig}
              initialData={{ account_id: editRow.account_id, project_id: editRow.project_id ?? '', cost_center_id: editRow.cost_center_id ?? '', amount: editRow.amount ?? 0, currency_code: editRow.currency_code ?? '' }}
              onSubmit={async (data) => {
                await OpeningBalanceImportService.updateOpeningBalanceRow(editRow.id, {
                  account_id: String(data.account_id),
                  project_id: (data.project_id ? String(data.project_id) : '') || null,
                  cost_center_id: (data.cost_center_id ? String(data.cost_center_id) : '') || null,
                  amount: Number(data.amount),
                  currency_code: String(data.currency_code || '') || null,
                })
                setEditOpen(false)
                try { (window as any)?.toast?.success?.('Row updated') } catch {}
                // Refresh current page
                await loadPage(page, rowsPerPage)
              }}
              onCancel={() => setEditOpen(false)}
            />
            </>
          )}
        </Box>
      </Drawer>
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s=>({...s,open:false}))} anchorOrigin={{ vertical:'bottom', horizontal:'right' }}>
        <MuiAlert elevation={6} variant="filled" severity={snack.severity} onClose={() => setSnack(s=>({...s,open:false}))}>
          {snack.message}
        </MuiAlert>
      </Snackbar>
    </DraggableResizableDialog>
  )
}
