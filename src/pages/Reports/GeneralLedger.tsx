import React, { useEffect, useMemo, useState } from 'react'
import styles from './GeneralLedger.module.css'
import { fetchGeneralLedgerReport, type GLFilters, type GLRow } from '../../services/reports/general-ledger'
import ExportButtons from '../../components/Common/ExportButtons'
import { fetchGLAccountSummary, type GLAccountSummaryRow } from '../../services/reports/gl-account-summary'
import { fetchOrganizations, fetchProjects, fetchAccountsMinimal, type LookupOption } from '../../services/lookups'
import type { UniversalTableData } from '../../utils/UniversalExportManager'

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
  const [orgOptions, setOrgOptions] = useState<LookupOption[]>([])
  const [projectOptions, setProjectOptions] = useState<LookupOption[]>([])
  const [accountOptions, setAccountOptions] = useState<LookupOption[]>([])

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
  const exportData: UniversalTableData = useMemo(() => {
    return {
      columns: [
        { key: 'entry_number', header: 'رقم القيد', type: 'text', align: 'right' },
        { key: 'entry_date', header: 'التاريخ', type: 'date', align: 'right' },
        { key: 'account_code', header: 'رمز الحساب', type: 'text', align: 'right' },
        { key: 'account_name_ar', header: 'اسم الحساب', type: 'text', align: 'right' },
        { key: 'description', header: 'الوصف', type: 'text', align: 'right' },
        { key: 'debit', header: 'مدين', type: 'currency', align: 'right' },
        { key: 'credit', header: 'دائن', type: 'currency', align: 'right' },
        { key: 'running_debit', header: 'رصيد جاري مدين', type: 'currency', align: 'right' },
        { key: 'running_credit', header: 'رصيد جاري دائن', type: 'currency', align: 'right' },
      ],
      rows: data.map(r => ({
        entry_number: r.entry_number ?? '',
        entry_date: r.entry_date,
        account_code: r.account_code,
        account_name_ar: r.account_name_ar ?? r.account_name_en ?? '',
        description: r.description ?? '',
        debit: Number(r.debit || 0),
        credit: Number(r.credit || 0),
        running_debit: Number(r.running_debit || 0),
        running_credit: Number(r.running_credit || 0),
      })),
      metadata: {
        generatedAt: new Date(),
        filters
      }
    }
  }, [data, filters])

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>دفتر الأستاذ العام</h2>
        <div className={styles.actions}>
          <ExportButtons
            data={exportData}
            config={{
              title: 'تقرير دفتر الأستاذ العام',
              orientation: 'landscape',
              useArabicNumerals: true,
              rtlLayout: true,
            }}
            size="small"
            layout="horizontal"
          />
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
        </div>
      </div>

      {view === 'overview' && (
        <>
          <div className={styles.summary}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>عدد الحسابات</div>
              <div className={styles.cardValue}>{totalRows.toLocaleString('ar-EG')}</div>
            </div>
          </div>
          <div className={styles.tableWrap}>
            {loadingSummary ? (
              <div className={styles.footer}>جاري تحميل الملخص...</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>رمز الحساب</th>
                    <th>اسم الحساب</th>
                    <th>رصيد افتتاحي مدين</th>
                    <th>رصيد افتتاحي دائن</th>
                    <th>إجمالي مدين الفترة</th>
                    <th>إجمالي دائن الفترة</th>
                    <th>رصيد ختامي مدين</th>
                    <th>رصيد ختامي دائن</th>
                    <th>عدد القيود</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map(row => (
                    <tr key={row.account_id} onClick={() => { setAccountId(row.account_id); setView('details'); setCurrentPage(1); }}>
                      <td>{row.account_code}</td>
                      <td>{row.account_name_ar || row.account_name_en || ''}</td>
                      <td>{Number(row.opening_debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                      <td>{Number(row.opening_credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                      <td>{Number(row.period_debits || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                      <td>{Number(row.period_credits || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                      <td>{Number(row.closing_debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                      <td>{Number(row.closing_credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                      <td>{row.transaction_count}</td>
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
                <th>رقم القيد</th>
                <th>التاريخ</th>
                <th>رمز الحساب</th>
                <th>اسم الحساب</th>
                <th>الوصف</th>
                <th>مدين</th>
                <th>دائن</th>
                <th>رصيد جاري مدين</th>
                <th>رصيد جاري دائن</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={`${r.transaction_id}-${r.account_id}-${r.entry_date}`}>
                  <td>{r.entry_number}</td>
                  <td>{r.entry_date}</td>
                  <td>{r.account_code}</td>
                  <td>{r.account_name_ar ?? r.account_name_en ?? ''}</td>
                  <td>{r.description ?? ''}</td>
                  <td>{Number(r.debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                  <td>{Number(r.credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                  <td>{Number(r.running_debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                  <td>{Number(r.running_credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
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
