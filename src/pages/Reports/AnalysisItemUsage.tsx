import { fetchAnalysisItemUsage, type AnalysisUsageRow, fetchTopAnalysisItems, type TopAnalysisMetric } from '../../services/reports/analysis-item-usage'
import ExportButtons from '../../components/Common/ExportButtons'
import PresetBar from '../../components/Common/PresetBar'
import { useReportPresets } from '../../hooks/useReportPresets'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import { Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, TextField, Checkbox, Table, TableHead, TableRow, TableCell, TableBody, Typography } from '@mui/material'
import '../../components/Common/UltimateButtons.css'

const AnalysisItemUsagePage: React.FC = () => {
  const { currentOrg, currentProject, availableOrgs, availableProjects } = useScope()
  const { language: uiLang } = useAppStore()
  const isAr = uiLang === 'ar'

  const [rows, setRows] = useState<AnalysisUsageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)
  const [onlyWithTx, setOnlyWithTx] = useState(false)
  const [search, setSearch] = useState('')
  const [topMetric, setTopMetric] = useState<'net' | 'debit' | 'credit' | 'count'>('net')
  const [topLimit, setTopLimit] = useState<number>(10)

  // No local orgs/projects needed, using useScope()

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchAnalysisItemUsage({
        orgId: currentOrg?.id || null,
        projectId: currentProject?.id || null,
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

  useEffect(() => {
    if (currentOrg?.id) load()
  }, [currentOrg?.id, currentProject?.id, onlyWithTx, dateFrom, dateTo])

  // Presets
  const reportKey = 'analysis-item-usage'
  const { presets, selectedPresetId, newPresetName, setNewPresetName, loadPresetsAndApplyLast, selectPresetAndApply, saveCurrentPreset, deleteSelectedPreset } = useReportPresets(reportKey)

  useEffect(() => {
    loadPresetsAndApplyLast((p) => {
      type UsagePresetFilters = {
        dateFrom?: string
        dateTo?: string
        onlyWithTx?: boolean
        search?: string
        topMetric?: 'net' | 'debit' | 'credit' | 'count'
        topLimit?: number
      }
      const f = (p as { filters?: UsagePresetFilters }).filters || {}
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
      { key: 'code', header: isAr ? 'الكود' : 'Code', type: 'text' },
      { key: 'name', header: isAr ? 'الاسم' : 'Name', type: 'text' },
      { key: 'name_ar', header: isAr ? 'الاسم العربي' : 'Arabic Name', type: 'text' },
      { key: 'tx_count', header: isAr ? 'عدد المعاملات' : 'Tx Count', type: 'number' },
      { key: 'total_debit_amount', header: isAr ? 'إجمالي المدين' : 'Total Debit', type: 'currency' },
      { key: 'total_credit_amount', header: isAr ? 'إجمالي الدائن' : 'Total Credit', type: 'currency' },
      { key: 'net_amount', header: isAr ? 'الرصيد' : 'Net', type: 'currency' },
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
      orgId: currentOrg?.id || null,
      projectId: currentProject?.id || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      orderBy: topMetric as TopAnalysisMetric,
      desc: true,
      limit: topLimit,
    })
    const cols = createStandardColumns([
      { key: 'code', header: isAr ? 'الكود' : 'Code', type: 'text' },
      { key: 'name', header: isAr ? 'الاسم' : 'Name', type: 'text' },
      { key: 'name_ar', header: isAr ? 'الاسم العربي' : 'Arabic Name', type: 'text' },
      { key: 'metric', header: isAr ? 'المقياس' : 'Metric', type: 'text' },
      { key: 'value', header: isAr ? 'القيمة' : 'Value', type: 'number' },
    ])
    const rows = items.map(r => ({
      code: r.code,
      name: r.name,
      name_ar: r.name_ar || '',
      metric: topMetric,
      value: topMetric === 'net' ? Number(r.net_amount || 0) : topMetric === 'debit' ? Number(r.total_debit_amount || 0) : topMetric === 'credit' ? Number(r.total_credit_amount || 0) : Number(r.tx_count || 0),
    }))
    const data = prepareTableData(cols, rows)
    const title = (() => {
      const metricLabels: Record<string, string> = isAr ? {
        net: 'الأعلى بالرصيد',
        debit: 'الأعلى بالمدين',
        credit: 'الأعلى بالدائن',
        count: 'الأعلى بعدد المعاملات'
      } : {
        net: 'Top by Net',
        debit: 'Top by Total Debit',
        credit: 'Top by Total Credit',
        count: 'Top by Tx Count'
      }
      const orgLabel = currentOrg?.id ? (() => {
        const o = availableOrgs.find(x => x.id === currentOrg?.id)
        return o ? `${o.code ? o.code + ' - ' : ''}${o.name}` : (isAr ? 'المؤسسة: المختارة' : 'Org: Selected')
      })() : (isAr ? 'المؤسسة: الكل' : 'Org: All')
      const projLabel = currentProject?.id ? (() => {
        const p = availableProjects.find(x => x.id === currentProject?.id)
        return p ? `${p.code ? p.code + ' - ' : ''}${p.name}` : (isAr ? 'المشروع: المختار' : 'Project: Selected')
      })() : (isAr ? 'المشروع: الكل' : 'Project: All')
      const rangeLabel = (dateFrom || dateTo) ? (isAr ? `الفترة: ${dateFrom || '—'} ← ${dateTo || '—'}` : `Range: ${dateFrom || '—'} ← ${dateTo || '—'}`) : (isAr ? 'الفترة: الكل' : 'Range: All')
      return isAr ? `استخدام بنود التحليل — أعلى ${topLimit} — ${metricLabels[topMetric]} — ${orgLabel} — ${projLabel} — ${rangeLabel}` : `Analysis Item Usage — Top ${topLimit} — ${metricLabels[topMetric]} — ${orgLabel} — ${projLabel} — ${rangeLabel}`
    })()
    const { exportToExcel, exportToCSV } = await import('../../utils/UniversalExportManager')
    if (format === 'excel') await exportToExcel(data, { title, rtlLayout: isAr, useArabicNumerals: isAr })
    else await exportToCSV(data, { title, rtlLayout: isAr, useArabicNumerals: isAr })
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
          <TextField size="small" type="number" value={topLimit} onChange={e => setTopLimit(Math.max(1, parseInt(e.target.value || '10', 10) || 10))} label="N" inputProps={{ min: 1, style: { width: 70 } }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="ultimate-btn ultimate-btn-edit" onClick={() => handleServerTopExport('excel')} title="Export Top-N (Server) Excel">
              <div className="btn-content"><span className="btn-text">Top-N (Server) Excel</span></div>
            </button>
            <button className="ultimate-btn ultimate-btn-edit" onClick={() => handleServerTopExport('csv')} title="Export Top-N (Server) CSV">
              <div className="btn-content"><span className="btn-text">Top-N (Server) CSV</span></div>
            </button>
          </div>
        </div>
        <ExportButtons
          data={exportData}
          config={{
            title: (() => {
              const orgLabel = currentOrg?.id ? (() => {
                const o = availableOrgs.find(x => x.id === currentOrg.id)
                return o ? `${o.code ? o.code + ' - ' : ''}${o.name}` : (isAr ? 'المؤسسة: المختارة' : 'Org: Selected')
              })() : (isAr ? 'المؤسسة: الكل' : 'Org: All')
              const projLabel = currentProject?.id ? (() => {
                const p = availableProjects.find(x => x.id === currentProject.id)
                return p ? `${p.code ? p.code + ' - ' : ''}${p.name}` : (isAr ? 'المشروع: المختار' : 'Project: Selected')
              })() : (isAr ? 'المشروع: الكل' : 'Project: All')
              const rangeLabel = (dateFrom || dateTo) ? (isAr ? `الفترة: ${dateFrom || '—'} ← ${dateTo || '—'}` : `Range: ${dateFrom || '—'} ← ${dateTo || '—'}`) : (isAr ? 'الفترة: الكل' : 'Range: All')
              return isAr ? `استخدام بنود التحليل — ${orgLabel} — ${projLabel} — ${rangeLabel}` : `Analysis Item Usage — ${orgLabel} — ${projLabel} — ${rangeLabel}`
            })(),
            rtlLayout: isAr,
            useArabicNumerals: isAr,
          }}
          size="small"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="caption" color="textSecondary">Organization / المؤسسة</Typography>
          <Typography variant="body2">{currentOrg?.name || '—'}</Typography>
        </div>
        {currentProject?.id && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="textSecondary">Project / المشروع</Typography>
            <Typography variant="body2">{currentProject.name}</Typography>
          </div>
        )}
        <TextField size="small" type="date" label="From" value={dateFrom || ''} onChange={e => setDateFrom(e.target.value)} />
        <TextField size="small" type="date" label="To" value={dateTo || ''} onChange={e => setDateTo(e.target.value)} />
        <TextField size="small" label="Search / بحث" value={search || ''} onChange={e => setSearch(e.target.value)} />
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
                    <TableCell>{isAr ? 'الكود' : 'Code'}</TableCell>
                    <TableCell>{isAr ? 'الاسم' : 'Name'}</TableCell>
                    <TableCell>{isAr ? 'الاسم العربي' : 'Arabic Name'}</TableCell>
                    <TableCell align="right">{isAr ? 'عدد المعاملات' : 'Tx Count'}</TableCell>
                    <TableCell align="right">{isAr ? 'إجمالي المدين' : 'Total Debit'}</TableCell>
                    <TableCell align="right">{isAr ? 'إجمالي الدائن' : 'Total Credit'}</TableCell>
                    <TableCell align="right">{isAr ? 'الرصيد' : 'Net'}</TableCell>
                    <TableCell align="center">GL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(r => {
                    const params = new URLSearchParams()
                    if (currentOrg?.id) params.set('orgId', currentOrg.id)
                    if (currentProject?.id) params.set('projectId', currentProject.id)
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
                        <TableCell align="right">{formatArabicCurrency(Number(r.tx_count || 0), 'none', { useArabicNumerals: isAr })}</TableCell>
                        <TableCell align="right">{formatArabicCurrency(Number(r.total_debit_amount || 0), 'none', { useArabicNumerals: isAr })}</TableCell>
                        <TableCell align="right">{formatArabicCurrency(Number(r.total_credit_amount || 0), 'none', { useArabicNumerals: isAr })}</TableCell>
                        <TableCell align="right">{formatArabicCurrency(Number(r.net_amount || 0), 'none', { useArabicNumerals: isAr })}</TableCell>
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
