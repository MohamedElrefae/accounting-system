import React, { useEffect, useMemo, useState } from 'react'
import { fetchAnalysisItemUsage, type AnalysisUsageRow, fetchTopAnalysisItems, type TopAnalysisMetric } from '../../services/reports/analysis-item-usage'
import { getOrganizations, type Organization } from '../../services/organization'
import { getActiveProjects, type Project } from '../../services/projects'
import ExportButtons from '../../components/Common/ExportButtons'
import PresetBar from '../../components/Common/PresetBar'
import { useReportPresets } from '../../hooks/useReportPresets'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import { Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, TextField, Checkbox, Table, TableHead, TableRow, TableCell, TableBody, Typography } from '@mui/material'

const AnalysisItemUsagePage: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [orgId, setOrgId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [onlyWithTx, setOnlyWithTx] = useState<boolean>(false)
  const [rows, setRows] = useState<AnalysisUsageRow[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [topMetric, setTopMetric] = useState<'net' | 'debit' | 'credit' | 'count'>('net')
  const [topLimit, setTopLimit] = useState<number>(10)

  useEffect(() => {
    (async () => {
      try {
        const [o, p] = await Promise.all([
          getOrganizations().catch(() => []),
          getActiveProjects().catch(() => []),
        ])
        setOrgs(o)
        setProjects(p)
        if (!orgId && o.length) setOrgId(o[0].id)
      } catch {}
    })()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchAnalysisItemUsage({
        orgId: orgId || null,
        projectId: projectId || null,
        search: (search || '').trim() || null,
        onlyWithTx,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId, projectId, onlyWithTx, dateFrom, dateTo])

  // Presets
  const reportKey = 'analysis-item-usage'
  const { presets, selectedPresetId, newPresetName, setNewPresetName, loadPresetsAndApplyLast, selectPresetAndApply, saveCurrentPreset, deleteSelectedPreset } = useReportPresets(reportKey)

  useEffect(() => {
    loadPresetsAndApplyLast((p) => {
      type UsagePresetFilters = {
        orgId?: string
        projectId?: string
        dateFrom?: string
        dateTo?: string
        onlyWithTx?: boolean
        search?: string
        topMetric?: 'net' | 'debit' | 'credit' | 'count'
        topLimit?: number
      }
      const f = (p as { filters?: UsagePresetFilters }).filters || {}
      if (f.orgId != null) setOrgId(f.orgId)
      if (f.projectId != null) setProjectId(f.projectId)
      if (f.dateFrom != null) setDateFrom(f.dateFrom)
      if (f.dateTo != null) setDateTo(f.dateTo)
      if (typeof f.onlyWithTx === 'boolean') setOnlyWithTx(f.onlyWithTx)
      if (typeof f.search === 'string') setSearch(f.search)
      if (typeof f.topMetric === 'string') setTopMetric(f.topMetric as any)
      if (typeof f.topLimit === 'number') setTopLimit(f.topLimit)
    }).catch(() => { /* noop */ })
  }, [loadPresetsAndApplyLast])

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
      { key: 'tx_count', header: 'Tx Count', type: 'number' },
      { key: 'total_debit_amount', header: 'Total Debit', type: 'currency' },
      { key: 'total_credit_amount', header: 'Total Credit', type: 'currency' },
      { key: 'net_amount', header: 'Net', type: 'currency' },
    ])
    const dataRows = filtered.map(r => ({
      code: r.code,
      name: r.name,
      name_ar: r.name_ar || '',
      tx_count: Number(r.tx_count || 0),
      total_debit_amount: Number(r.total_debit_amount || 0),
      total_credit_amount: Number(r.total_credit_amount || 0),
      net_amount: Number(r.net_amount || 0),
    }))
    return prepareTableData(columns, dataRows)
  }, [filtered])


  // Server-side Top-N export helper
  const handleServerTopExport = async (format: 'excel' | 'csv') => {
    const items = await fetchTopAnalysisItems({
      orgId: orgId || null,
      projectId: projectId || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      orderBy: topMetric as TopAnalysisMetric,
      desc: true,
      limit: topLimit,
    })
    const cols = createStandardColumns([
      { key: 'code', header: 'Code / الكود', type: 'text' },
      { key: 'name', header: 'Name / الاسم', type: 'text' },
      { key: 'name_ar', header: 'Arabic Name / الاسم العربي', type: 'text' },
      { key: 'metric', header: 'Metric', type: 'text' },
      { key: 'value', header: 'Value', type: 'number' },
    ])
    const rows = items.map(r => ({
      code: r.code,
      name: r.name,
      name_ar: r.name_ar || '',
      metric: topMetric,
      value: topMetric === 'net' ? Number(r.net_amount||0) : topMetric === 'debit' ? Number(r.total_debit_amount||0) : topMetric === 'credit' ? Number(r.total_credit_amount||0) : Number(r.tx_count||0),
    }))
    const data = prepareTableData(cols, rows)
    const title = (() => {
      const metricLabels: Record<string,string> = { net: 'Top by Net', debit: 'Top by Total Debit', credit: 'Top by Total Credit', count: 'Top by Tx Count' }
      const orgLabel = orgId ? (() => {
        const o = orgs.find(x => x.id === orgId)
        return o ? `${o.code ? o.code + ' - ' : ''}${o.name}` : 'Org: Selected'
      })() : 'Org: All'
      const projLabel = projectId ? (() => {
        const p = projects.find(x => x.id === projectId)
        return p ? `${p.code ? p.code + ' - ' : ''}${p.name}` : 'Project: Selected'
      })() : 'Project: All'
      const rangeLabel = (dateFrom || dateTo) ? `Range: ${dateFrom || '—'} → ${dateTo || '—'}` : 'Range: All'
      return `Analysis Item Usage — Top ${topLimit} — ${metricLabels[topMetric]} — ${orgLabel} — ${projLabel} — ${rangeLabel}`
    })()
    if (format === 'excel') await exportToExcel(data, { title, rtlLayout: true, useArabicNumerals: true })
    else await exportToCSV(data, { title, rtlLayout: true, useArabicNumerals: true })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Typography variant="h6">Analysis Item Usage / استخدام بنود التحليل</Typography>
        <div style={{ flex: 1 }} />
        <PresetBar
          presets={presets}
          selectedPresetId={selectedPresetId}
          newPresetName={newPresetName}
          onChangePreset={async (id) => {
            await selectPresetAndApply(String(id), (p) => {
              const f = (p as { filters?: any }).filters || {}
              if (f.orgId != null) setOrgId(f.orgId)
              if (f.projectId != null) setProjectId(f.projectId)
              if (f.dateFrom != null) setDateFrom(f.dateFrom)
              if (f.dateTo != null) setDateTo(f.dateTo)
              if (typeof f.onlyWithTx === 'boolean') setOnlyWithTx(f.onlyWithTx)
              if (typeof f.search === 'string') setSearch(f.search)
              if (typeof f.topMetric === 'string') setTopMetric(f.topMetric)
              if (typeof f.topLimit === 'number') setTopLimit(f.topLimit)
            })
          }}
          onChangeName={(v) => setNewPresetName(v)}
          onSave={async () => {
            if (!newPresetName.trim()) return
            await saveCurrentPreset({
              name: newPresetName.trim(),
              filters: {
                orgId,
                projectId,
                dateFrom,
                dateTo,
                onlyWithTx,
                search,
                topMetric,
                topLimit,
              },
            })
            setNewPresetName('')
          }}
          onDelete={async () => { if (!selectedPresetId) return; await deleteSelectedPreset() }}
          wrapperClassName={''}
          selectClassName={''}
          inputClassName={''}
          buttonClassName={''}
          placeholder='Preset name'
          saveLabel='Save'
          deleteLabel='Delete'
        />
        {/* Top-N controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select size="small" value={topMetric} onChange={e => setTopMetric(e.target.value as any)}>
            <MenuItem value="net">Top by Net</MenuItem>
            <MenuItem value="debit">Top by Total Debit</MenuItem>
            <MenuItem value="credit">Top by Total Credit</MenuItem>
            <MenuItem value="count">Top by Tx Count</MenuItem>
          </Select>
          <TextField size="small" type="number" value={topLimit} onChange={e => setTopLimit(Math.max(1, parseInt(e.target.value||'10', 10) || 10))} label="N" inputProps={{ min: 1, style: { width: 70 } }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button variant="outlined" size="small" onClick={() => handleServerTopExport('excel')} title="Export Top-N (Server) Excel">Top-N (Server) Excel</Button>
            <Button variant="outlined" size="small" onClick={() => handleServerTopExport('csv')} title="Export Top-N (Server) CSV">Top-N (Server) CSV</Button>
          </div>
        </div>
        <ExportButtons
          data={exportData}
          config={{
            title: (() => {
              const orgLabel = orgId ? (() => {
                const o = orgs.find(x => x.id === orgId)
                return o ? `${o.code ? o.code + ' - ' : ''}${o.name}` : 'Org: Selected'
              })() : 'Org: All'
              const projLabel = projectId ? (() => {
                const p = projects.find(x => x.id === projectId)
                return p ? `${p.code ? p.code + ' - ' : ''}${p.name}` : 'Project: Selected'
              })() : 'Project: All'
              const rangeLabel = (dateFrom || dateTo) ? `Range: ${dateFrom || '—'} → ${dateTo || '—'}` : 'Range: All'
              return `Analysis Item Usage — ${orgLabel} — ${projLabel} — ${rangeLabel}`
            })(),
            rtlLayout: true,
            useArabicNumerals: true,
          }}
          size="small"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <FormControl size="small">
          <InputLabel>Organization</InputLabel>
          <Select label="Organization" value={orgId} onChange={(e) => setOrgId(String(e.target.value))}>
            {orgs.map(o => (<MenuItem key={o.id} value={o.id}>{o.code} - {o.name}</MenuItem>))}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Project</InputLabel>
          <Select label="Project" value={projectId} onChange={(e) => setProjectId(String(e.target.value))}>
            <MenuItem value="">All</MenuItem>
            {projects.map(p => (<MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>))}
          </Select>
        </FormControl>
        <TextField size="small" type="date" label="From" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <TextField size="small" type="date" label="To" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <TextField size="small" label="Search / بحث" value={search} onChange={e => setSearch(e.target.value)} />
        <FormControl size="small" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Checkbox checked={onlyWithTx} onChange={e => setOnlyWithTx(e.target.checked)} /> Only with Tx
        </FormControl>
        <Button variant="outlined" onClick={load} disabled={loading}>Apply</Button>
      </div>

      <div style={{ marginTop: 12, flex: 1, overflow: 'auto' }}>
        <Card>
          <CardContent>
            {loading ? (
              <Typography>Loading...</Typography>
            ) : (
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Arabic Name</TableCell>
                    <TableCell align="right">Tx Count</TableCell>
                    <TableCell align="right">Total Debit</TableCell>
                    <TableCell align="right">Total Credit</TableCell>
                    <TableCell align="right">Net</TableCell>
                    <TableCell align="center">GL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(r => {
                    const params = new URLSearchParams()
                    if (orgId) params.set('orgId', orgId)
                    if (projectId) params.set('projectId', projectId)
                    if (dateFrom) params.set('dateFrom', dateFrom)
                    if (dateTo) params.set('dateTo', dateTo)
                    // Let GL include opening and postedOnly defaults; user can change there
                    params.set('postedOnly', String(true))
                    // Deep-link: pass analysisWorkItemId for filtered wrapper
                    params.set('analysisWorkItemId', r.analysis_work_item_id)
                    const glUrl = `/reports/general-ledger?${params.toString()}`
                    return (
                      <TableRow key={r.analysis_work_item_id}>
                        <TableCell>
                          <a href={glUrl} target="_blank" rel="noopener" title="Open in General Ledger">{r.code}</a>
                        </TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.name_ar || ''}</TableCell>
                        <TableCell align="right">{Number(r.tx_count || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(r.total_debit_amount || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(r.total_credit_amount || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{Number(r.net_amount || 0).toLocaleString()}</TableCell>
                        <TableCell align="center">
                          <a href={glUrl} target="_blank" rel="noopener" title="Open in General Ledger" style={{ textDecoration: 'none' }}>
                            🔎 GL
                          </a>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AnalysisItemUsagePage
