import React, { useEffect, useMemo, useState } from 'react'
import styles from './GeneralLedger.module.css'
import { fetchGeneralLedgerReport, type GLFilters, type GLRow } from '../../services/reports/general-ledger'
import ExportButtons from '../../components/Common/ExportButtons'
import PresetBar from '../../components/Common/PresetBar'
import { fetchGLAccountSummary, type GLAccountSummaryRow } from '../../services/reports/gl-account-summary'
import { fetchOrganizations, fetchProjects, fetchAccountsMinimal, type LookupOption } from '../../services/lookups'
import type { UniversalTableData } from '../../utils/UniversalExportManager'
import { useReportPresets } from '../../hooks/useReportPresets'

const todayISO = () => new Date().toISOString().slice(0, 10)

type ViewMode = 'overview' | 'details'

const GeneralLedger: React.FC = () => {
  // Filters
  const [filters, setFilters] = useState<GLFilters>({
    dateFrom: todayISO(),
    dateTo: todayISO(),
    includeOpening: true,
    postedOnly: true,
  })

  const [accountId, setAccountId] = useState<string>('')
  const [orgId, setOrgId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')

  const [data, setData] = useState<GLRow[]>([])
  const [summaryRows, setSummaryRows] = useState<GLAccountSummaryRow[]>([])
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('overview')
  const [pageSize, setPageSize] = useState<number>(25)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalRows, setTotalRows] = useState<number>(0)
  // Compare mode
  const [compareMode, setCompareMode] = useState<boolean>(false)
  const [compareTotals, setCompareTotals] = useState<{ prev: number, curr: number, variance: number, pct: number | null } | null>(null)
  const [showCompareOverview, setShowCompareOverview] = useState<boolean>(true)
  const [orgOptions, setOrgOptions] = useState<LookupOption[]>([])
  const [projectOptions, setProjectOptions] = useState<LookupOption[]>([])
  const [accountOptions, setAccountOptions] = useState<LookupOption[]>([])

  // Presets and columns
  const reportKey = 'general-ledger'
  const { presets, selectedPresetId, setSelectedPresetId, newPresetName, setNewPresetName, loadPresetsAndApplyLast, selectPresetAndApply, saveCurrentPreset, deleteSelectedPreset } = useReportPresets(reportKey)
  const [columnMenuOpen, setColumnMenuOpen] = useState<boolean>(false)
  const detailColumnOptions = [
    { key: 'entry_number', label: 'رقم القيد' },
    { key: 'entry_date', label: 'التاريخ' },
    { key: 'account_code', label: 'رمز الحساب' },
    { key: 'account_name_ar', label: 'اسم الحساب' },
    { key: 'description', label: 'الوصف' },
    { key: 'debit', label: 'مدين' },
    { key: 'credit', label: 'دائن' },
    { key: 'running_debit', label: 'رصيد جاري مدين' },
    { key: 'running_credit', label: 'رصيد جاري دائن' },
  ] as const
  const overviewColumnOptions = [
    { key: 'account_code', label: 'رمز الحساب' },
    { key: 'account_name', label: 'اسم الحساب' },
    { key: 'opening_debit', label: 'رصيد افتتاحي مدين' },
    { key: 'opening_credit', label: 'رصيد افتتاحي دائن' },
    { key: 'period_debits', label: 'إجمالي مدين الفترة' },
    { key: 'period_credits', label: 'إجمالي دائن الفترة' },
    { key: 'closing_debit', label: 'رصيد ختامي مدين' },
    { key: 'closing_credit', label: 'رصيد ختامي دائن' },
    { key: 'transaction_count', label: 'عدد القيود' },
  ] as const
  const [visibleColumns, setVisibleColumns] = useState<string[]>(detailColumnOptions.map(c => c.key))
  const [visibleOverviewColumns, setVisibleOverviewColumns] = useState<string[]>(overviewColumnOptions.map(c => c.key))

  // Initialize from query parameters once on mount
  useEffect(() => {
    try {
      const qp = new URLSearchParams(window.location.search);
      const qAccountId = qp.get('accountId') || '';
      const qOrgId = qp.get('orgId') || '';
      const qProjectId = qp.get('projectId') || '';
      const qPostedOnly = qp.get('postedOnly');
      const qIncludeOpening = qp.get('includeOpening');
      const qDateFrom = qp.get('dateFrom');
      const qDateTo = qp.get('dateTo');

      if (qAccountId) setAccountId(qAccountId);
      if (qOrgId) setOrgId(qOrgId);
      if (qProjectId) setProjectId(qProjectId);

      setFilters(prev => ({
        ...prev,
        postedOnly: qPostedOnly === null ? prev.postedOnly : qPostedOnly === 'true',
        includeOpening: qIncludeOpening === null ? prev.includeOpening : qIncludeOpening !== 'false',
        dateFrom: qDateFrom || prev.dateFrom,
        dateTo: qDateTo || prev.dateTo,
      }));
    } catch {}
  }, []);

  // Load dropdown lookups
  useEffect(() => {
    (async () => {
      const [orgs, projects, accounts] = await Promise.all([
        fetchOrganizations(),
        fetchProjects(),
        fetchAccountsMinimal(),
      ])
      setOrgOptions(orgs)
      setProjectOptions(projects)
      setAccountOptions(accounts)
    })()
  }, [])

  // Load presets and auto-apply last used
  useEffect(() => {
    loadPresetsAndApplyLast((p) => {
      const f: any = p.filters || {}
      setAccountId(f.accountId || '')
      setOrgId(f.orgId || '')
      setProjectId(f.projectId || '')
      setFilters(prev => ({
        ...prev,
        dateFrom: f.dateFrom || prev.dateFrom,
        dateTo: f.dateTo || prev.dateTo,
        includeOpening: typeof f.includeOpening === 'boolean' ? f.includeOpening : prev.includeOpening,
        postedOnly: typeof f.postedOnly === 'boolean' ? f.postedOnly : prev.postedOnly,
      }))
      const cols: any = (p as any).columns
      if (Array.isArray(cols)) {
        setVisibleColumns(cols as string[])
      } else if (cols && typeof cols === 'object') {
        if (Array.isArray(cols.details)) setVisibleColumns(cols.details)
        if (Array.isArray(cols.overview)) setVisibleOverviewColumns(cols.overview)
      }
    }).catch(() => {})
  }, [loadPresetsAndApplyLast])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchGeneralLedgerReport({
          accountId: accountId || null,
          dateFrom: filters.dateFrom || null,
          dateTo: filters.dateTo || null,
          orgId: orgId || null,
          projectId: projectId || null,
          includeOpening: filters.includeOpening,
          postedOnly: filters.postedOnly,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        })
        setData(rows)
        if (rows && rows.length > 0 && typeof rows[0].total_rows === 'number') {
          setTotalRows(rows[0].total_rows as number)
        } else {
          setTotalRows(rows.length)
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load general ledger')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filters.dateFrom, filters.dateTo, filters.includeOpening, filters.postedOnly, accountId, orgId, projectId, pageSize, currentPage])

  // Load account summary when on overview (or always, guarded by view)
  useEffect(() => {
    if (view !== 'overview') return
    const loadSummary = async () => {
      setLoadingSummary(true)
      try {
        const rows = await fetchGLAccountSummary({
          dateFrom: filters.dateFrom || null,
          dateTo: filters.dateTo || null,
          orgId: orgId || null,
          projectId: projectId || null,
          postedOnly: filters.postedOnly,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        })
        setSummaryRows(rows)
        if (rows && rows.length > 0 && typeof rows[0].total_rows === 'number') {
          setTotalRows(rows[0].total_rows as number)
        } else {
          setTotalRows(rows.length)
        }
      } finally {
        setLoadingSummary(false)
      }
    }
    loadSummary()
  }, [view, filters.dateFrom, filters.dateTo, filters.postedOnly, orgId, projectId, pageSize, currentPage])

  // Helper: derive previous period range matching the current window length
  const prevRange = useMemo(() => {
    try {
      const dFrom = filters.dateFrom ? new Date(filters.dateFrom) : null
      const dTo = filters.dateTo ? new Date(filters.dateTo) : null
      if (!dFrom || !dTo) return null
      const ms = dTo.getTime() - dFrom.getTime()
      const prevTo = new Date(dFrom.getTime() - 24*60*60*1000) // day before current from
      const prevFrom = new Date(prevTo.getTime() - ms)
      const toISO = (d: Date) => d.toISOString().slice(0,10)
      return { prevFrom: toISO(prevFrom), prevTo: toISO(prevTo) }
    } catch { return null }
  }, [filters.dateFrom, filters.dateTo])

  // Period compare totals via GL account summary service (fast aggregation)
  useEffect(() => {
    const run = async () => {
      if (!compareMode || !filters.dateFrom || !filters.dateTo || !prevRange) { setCompareTotals(null); return }
      try {
        const [currRows, prevRows] = await Promise.all([
          fetchGLAccountSummary({
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            orgId: orgId || null,
            projectId: projectId || null,
            postedOnly: filters.postedOnly,
            limit: 10000, // large cap for summary
            offset: 0,
          }),
          fetchGLAccountSummary({
            dateFrom: prevRange.prevFrom,
            dateTo: prevRange.prevTo,
            orgId: orgId || null,
            projectId: projectId || null,
            postedOnly: filters.postedOnly,
            limit: 10000,
            offset: 0,
          }),
        ])
        const sumCurr = currRows.reduce((s, r) => s + Number(r.period_debits || 0) - Number(r.period_credits || 0), 0)
        const sumPrev = prevRows.reduce((s, r) => s + Number(r.period_debits || 0) - Number(r.period_credits || 0), 0)
        const variance = sumCurr - sumPrev
        const pct = sumPrev !== 0 ? (variance / Math.abs(sumPrev)) : null
        setCompareTotals({ prev: sumPrev, curr: sumCurr, variance, pct })
      } catch {
        setCompareTotals(null)
      }
    }
    run()
  }, [compareMode, filters.dateFrom, filters.dateTo, filters.postedOnly, orgId, projectId, prevRange])

  // Tooltip text for compare period explanation
  const compareTooltip = useMemo(() => {
    if (!filters.dateFrom || !filters.dateTo || !prevRange) {
      return 'الفترة السابقة تحسب بنفس طول الفترة الحالية وتسبقها مباشرة.'
    }
    return `الفترة السابقة محسوبة من ${prevRange.prevFrom} إلى ${prevRange.prevTo} (بنفس طول الفترة الحالية).`
  }, [filters.dateFrom, filters.dateTo, prevRange])

  // Summary totals (from detailed rows if needed)
  const summary = useMemo(() => {
    const openingDebit = data.reduce((s, r) => s + (r.opening_debit || 0), 0)
    const openingCredit = data.reduce((s, r) => s + (r.opening_credit || 0), 0)
    const periodDebit = data.reduce((s, r) => s + (r.debit || 0), 0)
    const periodCredit = data.reduce((s, r) => s + (r.credit || 0), 0)
    const closingDebit = data.reduce((s, r) => s + (r.closing_debit || 0), 0)
    const closingCredit = data.reduce((s, r) => s + (r.closing_credit || 0), 0)
    return { openingDebit, openingCredit, periodDebit, periodCredit, closingDebit, closingCredit }
  }, [data])

  // Export data
  const exportDataDetails: UniversalTableData = useMemo(() => {
    const columns = detailColumnOptions
      .filter(c => visibleColumns.includes(c.key))
      .map(c => ({
        key: c.key,
        header: c.label,
        type: ['debit','credit','running_debit','running_credit'].includes(c.key) ? 'currency' : (c.key === 'entry_date' ? 'date' : 'text'),
        align: 'right' as const,
      }))
    const rows = data.map(r => ({
      entry_number: r.entry_number ?? '',
      entry_date: r.entry_date,
      account_code: r.account_code,
      account_name_ar: r.account_name_ar ?? r.account_name_en ?? '',
      description: r.description ?? '',
      debit: Number(r.debit || 0),
      credit: Number(r.credit || 0),
      running_debit: Number(r.running_debit || 0),
      running_credit: Number(r.running_credit || 0),
    })).map(row => Object.fromEntries(Object.entries(row).filter(([k]) => visibleColumns.includes(k as string)))) as any[]

    // Build prepend summary rows if compareMode is enabled and totals are available
    const prependRows: any[][] = []
    const pad = (cells: any[]) => {
      const arr = [...cells]
      while (arr.length < columns.length) arr.push('')
      return arr
    }
    if (compareMode && compareTotals) {
      prependRows.push(pad(['الفترة السابقة (صافي)', Number(compareTotals.prev || 0)]))
      prependRows.push(pad(['الفترة الحالية (صافي)', Number(compareTotals.curr || 0)]))
      prependRows.push(pad(['الفرق', Number(compareTotals.variance || 0)]))
      prependRows.push(pad(['% التغير', compareTotals.pct == null ? '' : `${(compareTotals.pct * 100).toFixed(2)}%`]))
      // spacer row
      prependRows.push(pad(['']))
    }

    return { columns, rows, metadata: { generatedAt: new Date(), filters, prependRows: prependRows.length ? prependRows : undefined } }
  }, [data, filters, visibleColumns, compareMode, compareTotals])

  const exportDataOverview: UniversalTableData = useMemo(() => {
    const columns = overviewColumnOptions
      .filter(c => visibleOverviewColumns.includes(c.key))
      .map(c => ({
        key: c.key,
        header: c.label,
        type: ['opening_debit','opening_credit','period_debits','period_credits','closing_debit','closing_credit'].includes(c.key) ? 'currency' : 'text',
        align: 'right' as const,
      }))
    const rows = summaryRows.map(r => ({
      account_code: r.account_code,
      account_name: r.account_name_ar || r.account_name_en || '',
      opening_debit: Number(r.opening_debit || 0),
      opening_credit: Number(r.opening_credit || 0),
      period_debits: Number(r.period_debits || 0),
      period_credits: Number(r.period_credits || 0),
      closing_debit: Number(r.closing_debit || 0),
      closing_credit: Number(r.closing_credit || 0),
      transaction_count: r.transaction_count,
    })).map(row => Object.fromEntries(Object.entries(row).filter(([k]) => visibleOverviewColumns.includes(k as string)))) as any[]

    // Prepend compare summary rows when compare mode is enabled
    const prependRows: any[][] = []
    const pad = (cells: any[]) => {
      const arr = [...cells]
      while (arr.length < columns.length) arr.push('')
      return arr
    }
    if (compareMode && compareTotals) {
      prependRows.push(pad(['الفترة السابقة (صافي)', Number(compareTotals.prev || 0)]))
      prependRows.push(pad(['الفترة الحالية (صافي)', Number(compareTotals.curr || 0)]))
      prependRows.push(pad(['الفرق', Number(compareTotals.variance || 0)]))
      prependRows.push(pad(['% التغير', compareTotals.pct == null ? '' : `${(compareTotals.pct * 100).toFixed(2)}%`]))
      // spacer row
      prependRows.push(pad(['']))
    }

    return { columns, rows, metadata: { generatedAt: new Date(), filters, prependRows: prependRows.length ? prependRows : undefined } }
  }, [summaryRows, filters, visibleOverviewColumns, compareMode, compareTotals])

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <PresetBar
          presets={presets}
          selectedPresetId={selectedPresetId}
          newPresetName={newPresetName}
          onChangePreset={async (id) => {
            await selectPresetAndApply(String(id), (p) => {
              const f: any = p.filters || {}
              setAccountId(f.accountId || '')
              setOrgId(f.orgId || '')
              setProjectId(f.projectId || '')
              setFilters(prev => ({
                ...prev,
                dateFrom: f.dateFrom || prev.dateFrom,
                dateTo: f.dateTo || prev.dateTo,
                includeOpening: typeof f.includeOpening === 'boolean' ? f.includeOpening : prev.includeOpening,
                postedOnly: typeof f.postedOnly === 'boolean' ? f.postedOnly : prev.postedOnly,
              }))
              const cols: any = (p as any).columns
              if (Array.isArray(cols)) setVisibleColumns(cols as string[])
              else if (cols && typeof cols === 'object') {
                if (Array.isArray(cols.details)) setVisibleColumns(cols.details)
                if (Array.isArray(cols.overview)) setVisibleOverviewColumns(cols.overview)
              }
            })
          }}
          onChangeName={(v) => setNewPresetName(v)}
          onSave={async () => {
            if (!newPresetName.trim()) return
            const saved = await saveCurrentPreset({
              name: newPresetName.trim(),
              filters: {
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                includeOpening: filters.includeOpening,
                postedOnly: filters.postedOnly,
                orgId,
                projectId,
                accountId,
              },
              columns: { details: visibleColumns, overview: visibleOverviewColumns },
            })
            if (saved) setNewPresetName('')
          }}
          onDelete={async () => {
            if (!selectedPresetId) return
            await deleteSelectedPreset()
          }}
          wrapperClassName={styles.presetBar}
          selectClassName={styles.presetSelect}
          inputClassName={styles.presetInput}
          buttonClassName={styles.presetButton}
          placeholder='اسم التهيئة'
          saveLabel='حفظ'
          deleteLabel='حذف'
        />
        <h2 className={styles.title}>دفتر الأستاذ العام</h2>
        <div className={styles.actions}>
          <div className={styles.columnPanel}>
            <button className={styles.presetButton} onClick={() => setColumnMenuOpen(v => !v)}>اختيار الأعمدة</button>
            {columnMenuOpen && (
              <div className={styles.columnDropdown}>
                <div className={styles.columnList}>
                  <div className={styles.columnGroupTitle}>ملخص الحسابات</div>
                  {overviewColumnOptions.map(opt => (
                    <label key={`ov-${opt.key}`} className={styles.columnItem}>
                      <input
                        type='checkbox'
                        checked={visibleOverviewColumns.includes(opt.key)}
                        onChange={(e) => {
                          setVisibleOverviewColumns(prev => e.target.checked ? [...prev, opt.key] : prev.filter(k => k !== opt.key))
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                  <div className={styles.columnGroupTitle}>تفاصيل القيود</div>
                  {detailColumnOptions.map(opt => (
                    <label key={opt.key} className={styles.columnItem}>
                      <input
                        type='checkbox'
                        checked={visibleColumns.includes(opt.key)}
                        onChange={(e) => {
                          setVisibleColumns(prev => e.target.checked ? [...prev, opt.key] : prev.filter(k => k !== opt.key))
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {view === 'overview' ? (
            <ExportButtons
              data={exportDataOverview}
              config={{
                title: 'ملخص دفتر الأستاذ العام',
                orientation: 'landscape',
                useArabicNumerals: true,
                rtlLayout: true,
              }}
              size="small"
              layout="horizontal"
            />
          ) : (
            <ExportButtons
              data={exportDataDetails}
              config={{
                title: 'تقرير دفتر الأستاذ العام',
                orientation: 'landscape',
                useArabicNumerals: true,
                rtlLayout: true,
              }}
              size="small"
              layout="horizontal"
            />
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${view === 'overview' ? styles.tabActive : ''}`} onClick={() => setView('overview')}>ملخص الحسابات</button>
        <button className={`${styles.tab} ${view === 'details' ? styles.tabActive : ''}`} onClick={() => setView('details')}>تفاصيل القيود</button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>من تاريخ</label>
          <input
            className={styles.input}
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label}>إلى تاريخ</label>
          <input
            className={styles.input}
            type="date"
            value={filters.dateTo ?? ''}
            onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label}>الحساب (اختياري)</label>
          <select className={styles.select} value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value=''>جميع الحسابات</option>
            {accountOptions.map(o => (
              <option key={o.id} value={o.id}>{o.code ? `${o.code} - ` : ''}{o.name_ar || o.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label}>المؤسسة (اختياري)</label>
          <select className={styles.select} value={orgId} onChange={e => setOrgId(e.target.value)}>
            <option value=''>جميع المؤسسات</option>
            {orgOptions.map(o => (
              <option key={o.id} value={o.id}>{o.code ? `${o.code} - ` : ''}{o.name_ar || o.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.label}>المشروع (اختياري)</label>
          <select className={styles.select} value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value=''>جميع المشاريع</option>
            {projectOptions.map(o => (
              <option key={o.id} value={o.id}>{o.code ? `${o.code} - ` : ''}{o.name_ar || o.name}</option>
            ))}
          </select>
        </div>
          <div className={styles.filterGroup}>
          <label className={styles.label}>خيارات</label>
          <div className={styles.checkboxRow}>
            <input
              id="includeOpening"
              type="checkbox"
              checked={!!filters.includeOpening}
              onChange={e => setFilters(prev => ({ ...prev, includeOpening: e.target.checked }))}
            />
            <label htmlFor="includeOpening">إظهار الرصيد الافتتاحي</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              id="postedOnly"
              type="checkbox"
              checked={!!filters.postedOnly}
              onChange={e => setFilters(prev => ({ ...prev, postedOnly: e.target.checked }))}
            />
            <label htmlFor="postedOnly">قيود معتمدة فقط</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              id="compareMode"
              type="checkbox"
              checked={!!compareMode}
              onChange={e => { setCompareMode(e.target.checked) }}
            />
            <label htmlFor="compareMode" title={compareTooltip}>وضع المقارنة</label>
          </div>
          {compareMode && (
            <div className={styles.checkboxRow} title={compareTooltip}>
              <input
                id="showCompareOverview"
                type="checkbox"
                checked={!!showCompareOverview}
                onChange={e => setShowCompareOverview(e.target.checked)}
              />
              <label htmlFor="showCompareOverview" title={compareTooltip}>إظهار بطاقات المقارنة في الملخص</label>
            </div>
          )}
        </div>
      </div>

      {view === 'overview' && (
        <>
          <div className={styles.summary}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>عدد الحسابات</div>
              <div className={styles.cardValue}>{totalRows.toLocaleString('ar-EG')}</div>
            </div>
            {compareMode && compareTotals && showCompareOverview && (
              <>
                <div className={styles.card}>
                  <div className={styles.cardLabel} title={compareTooltip}>صافي الفترة السابقة</div>
                  <div className={styles.cardValue}>{Number(compareTotals.prev || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardLabel} title={compareTooltip}>صافي الفترة الحالية</div>
                  <div className={styles.cardValue}>{Number(compareTotals.curr || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardLabel} title={compareTooltip}>الفرق</div>
                  <div className={styles.cardValue}>{Number(compareTotals.variance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className={styles.card}>
                  <div className={styles.cardLabel} title={compareTooltip}>% التغير</div>
                  <div className={styles.cardValue}>{compareTotals.pct == null ? '—' : `${(compareTotals.pct * 100).toFixed(2)}%`}</div>
                </div>
              </>
            )}
          </div>
          <div className={styles.tableWrap}>
            {loadingSummary ? (
              <div className={styles.footer}>جاري تحميل الملخص...</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    {overviewColumnOptions.filter(c => visibleOverviewColumns.includes(c.key)).map(c => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map(row => (
                    <tr key={row.account_id} onClick={() => { setAccountId(row.account_id); setView('details'); setCurrentPage(1); }}>
                      {visibleOverviewColumns.includes('account_code') && (<td>{row.account_code}</td>)}
                      {visibleOverviewColumns.includes('account_name') && (<td>{row.account_name_ar || row.account_name_en || ''}</td>)}
                      {visibleOverviewColumns.includes('opening_debit') && (<td>{Number(row.opening_debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                      {visibleOverviewColumns.includes('opening_credit') && (<td>{Number(row.opening_credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                      {visibleOverviewColumns.includes('period_debits') && (<td>{Number(row.period_debits || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                      {visibleOverviewColumns.includes('period_credits') && (<td>{Number(row.period_credits || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                      {visibleOverviewColumns.includes('closing_debit') && (<td>{Number(row.closing_debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                      {visibleOverviewColumns.includes('closing_credit') && (<td>{Number(row.closing_credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                      {visibleOverviewColumns.includes('transaction_count') && (<td>{row.transaction_count}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {view === 'details' && (
        <div className={styles.summary}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>رصيد افتتاحي مدين</div>
            <div className={styles.cardValue}>{summary.openingDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>رصيد افتتاحي دائن</div>
            <div className={styles.cardValue}>{summary.openingCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>إجمالي مدين الفترة</div>
            <div className={styles.cardValue}>{summary.periodDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>إجمالي دائن الفترة</div>
            <div className={styles.cardValue}>{summary.periodCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>رصيد ختامي مدين</div>
            <div className={styles.cardValue}>{summary.closingDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>رصيد ختامي دائن</div>
            <div className={styles.cardValue}>{summary.closingCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      )}

      {view === 'details' && (
        <div className={styles.summary}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>عدد السجلات</div>
            <div className={styles.cardValue}>{totalRows.toLocaleString('ar-EG')}</div>
          </div>
        </div>
      )

      {view === 'details' && compareMode && compareTotals && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>الفترة السابقة (صافي)</th>
                <th>الفترة الحالية (صافي)</th>
                <th>الفرق</th>
                <th>% التغير</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{Number(compareTotals.prev || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                <td>{Number(compareTotals.curr || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                <td>{Number(compareTotals.variance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                <td>{compareTotals.pct == null ? '—' : `${(compareTotals.pct * 100).toFixed(2)}%`}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {view === 'details' && (
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.footer}>جاري تحميل البيانات...</div>
        ) : error ? (
          <div className={styles.footer}>خطأ: {error}</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {detailColumnOptions.filter(c => visibleColumns.includes(c.key)).map(c => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={`${r.transaction_id}-${r.account_id}-${r.entry_date}`}>
                  {visibleColumns.includes('entry_number') && (<td>{r.entry_number}</td>)}
                  {visibleColumns.includes('entry_date') && (<td>{r.entry_date}</td>)}
                  {visibleColumns.includes('account_code') && (<td>{r.account_code}</td>)}
                  {visibleColumns.includes('account_name_ar') && (<td>{r.account_name_ar ?? r.account_name_en ?? ''}</td>)}
                  {visibleColumns.includes('description') && (<td>{r.description ?? ''}</td>)}
                  {visibleColumns.includes('debit') && (<td>{Number(r.debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                  {visibleColumns.includes('credit') && (<td>{Number(r.credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                  {visibleColumns.includes('running_debit') && (<td>{Number(r.running_debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                  {visibleColumns.includes('running_credit') && (<td>{Number(r.running_credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}

      <div className={styles.pagination}>
        <div>
          الصفحة {currentPage} من {totalPages} — إجمالي السجلات: {totalRows.toLocaleString('ar-EG')}
        </div>
        <div className={styles.pageControls}>
          <button className={styles.pageBtn} onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>الأولى</button>
          <button className={styles.pageBtn} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>السابق</button>
          <button className={styles.pageBtn} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>التالي</button>
          <button className={styles.pageBtn} onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>الأخيرة</button>
          <select className={styles.pageSize} value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setCurrentPage(1) }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
        {/* Reserved for pagination / future actions (no inline styles) */}
      </div>
    </div>
  )
}

export default GeneralLedger
