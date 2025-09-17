import React, { useEffect, useMemo, useState } from 'react'
import styles from './ExportDatabase.module.css'
import { useUniversalExport } from '../../hooks/useUniversalExport'
import type { UniversalTableData } from '../../utils/UniversalExportManager'
import ExportButtons from '../../components/Common/ExportButtons'
import SearchableSelect from '../../components/Common/SearchableSelect'
import { getOrganizations, type Organization } from '../../services/organization'
import { getActiveProjects, type Project } from '../../services/projects'
import { getAllTransactionClassifications, type TransactionClassification } from '../../services/transaction-classification'
import { getExpensesCategoriesList } from '../../services/sub-tree'
import type { ExpensesCategoryRow } from '../../types/sub-tree'
import { getCostCentersForSelector } from '../../services/cost-centers'
import { getAccounts, type Account } from '../../services/transactions'
import { listWorkItemsAll } from '../../services/work-items'
import { listExportableTables, fetchGenericTableAll, fetchTransactionsAll, buildColumnsForTransactions, buildColumnsFromRowsGeneric, toUniversalTableData, type ExportLanguage } from '../../services/export-database'
import { createStandardColumns } from '../../hooks/useUniversalExport'

const BATCH_SIZE = 1000

type FormatOption = 'excel' | 'csv' | 'pdf' | 'html' | 'json' | 'all'

type ModeOption = 'whole' | 'filtered'

const ExportDatabasePage: React.FC = () => {
  // Tables and selection
  const [tables, setTables] = useState<{ name: string }[]>([])
  const [selectedTables, setSelectedTables] = useState<string[]>([])

  // Export config
  const [format, setFormat] = useState<FormatOption>('excel')
  const [language, setLanguage] = useState<ExportLanguage>('ar')
  const [mode, setMode] = useState<ModeOption>('whole')

  // Filters (Transactions)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [classifications, setClassifications] = useState<TransactionClassification[]>([])
  const [categories, setCategories] = useState<ExpensesCategoryRow[]>([])
  const [costCenters, setCostCenters] = useState<{ id: string; code: string; name: string }[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [workItems, setWorkItems] = useState<{ id: string; code: string; name: string }[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isPosted, setIsPosted] = useState('') // '', 'posted', 'unposted'
  const [orgId, setOrgId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [debitAccountId, setDebitAccountId] = useState('')
  const [creditAccountId, setCreditAccountId] = useState('')
  const [classificationId, setClassificationId] = useState('')
  const [expensesCategoryId, setExpensesCategoryId] = useState('')
  const [workItemId, setWorkItemId] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [amountFrom, setAmountFrom] = useState('')
  const [amountTo, setAmountTo] = useState('')

  const exportMethods = useUniversalExport()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        setError('')
        const list = await listExportableTables()
        setTables(list.map(t => ({ name: t.table_name })))
      } catch (e: any) {
        setError(e?.message || 'Failed to load table list')
      }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const [o, p, c] = await Promise.all([
          getOrganizations().catch(() => []),
          getActiveProjects().catch(() => []),
          getAllTransactionClassifications().catch(() => []),
        ])
        setOrgs(o)
        setProjects(p)
        setClassifications(c)
      } catch {}
    })()
  }, [])

  // Dependent lookups
  useEffect(() => {
    (async () => {
      try {
        if (orgId) {
          const [cats, ccs, wis] = await Promise.all([
            getExpensesCategoriesList(orgId).catch(() => []),
            getCostCentersForSelector(orgId).catch(() => []),
            listWorkItemsAll(orgId).catch(() => []),
          ])
          setCategories(cats)
          setCostCenters(ccs)
          setWorkItems((wis || []).map((w: any) => ({ id: w.id, code: w.code, name: w.name })))
        } else {
          setCategories([])
          setCostCenters([])
          setWorkItems([])
        }
      } catch {}
    })()
  }, [orgId])

  useEffect(() => {
    (async () => {
      try {
        const list = await getAccounts()
        setAccounts(list)
      } catch {}
    })()
  }, [])

  const accountOptions = useMemo(() => {
    return accounts
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a => ({ value: a.id, label: `${a.code} - ${a.name}`, searchText: `${a.code} ${a.name}`.toLowerCase() }))
  }, [accounts])

  const toggleTable = (name: string) => {
    setSelectedTables(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  const clearFilters = () => {
    setSearchTerm('')
    setDateFrom('')
    setDateTo('')
    setIsPosted('')
    setOrgId('')
    setProjectId('')
    setDebitAccountId('')
    setCreditAccountId('')
    setClassificationId('')
    setExpensesCategoryId('')
    setWorkItemId('')
    setCostCenterId('')
    setAmountFrom('')
    setAmountTo('')
  }

  async function exportSelected() {
    if (selectedTables.length === 0) return
    setBusy(true)
    setError('')
    try {
      for (const table of selectedTables) {
        let data: UniversalTableData | null = null
        let title = ''
        if (table === 'transactions' && mode === 'filtered') {
          // Fetch filtered transactions through RPC in batches
          const rows = await fetchTransactionsAll({
            search: searchTerm || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            amountFrom: amountFrom ? Number(amountFrom) : undefined,
            amountTo: amountTo ? Number(amountTo) : undefined,
            debitAccountId: debitAccountId || undefined,
            creditAccountId: creditAccountId || undefined,
            projectId: projectId || undefined,
            orgId: orgId || undefined,
            classificationId: classificationId || undefined,
            subTreeId: expensesCategoryId || undefined,
            workItemId: workItemId || undefined,
            costCenterId: costCenterId || undefined,
            status: (isPosted === 'posted' || isPosted === 'unposted') ? (isPosted as 'posted'|'unposted') : 'all',
          }, BATCH_SIZE)
          const columns = buildColumnsForTransactions(language)
          data = toUniversalTableData(createStandardColumns(columns as any), rows)
          title = language === 'ar' ? 'تقرير المعاملات (مفلتر)' : 'Transactions (Filtered)'
        } else {
          // Whole table export: fetch all rows generically
          const rows = await fetchGenericTableAll(table, BATCH_SIZE)
          const cols = buildColumnsFromRowsGeneric(rows)
          data = toUniversalTableData(createStandardColumns(cols as any), rows)
          title = language === 'ar' ? `جدول ${table}` : `Table ${table}`
        }

        const config = {
          title,
          rtlLayout: language === 'ar',
          useArabicNumerals: language === 'ar',
          orientation: 'landscape' as const,
        }

        if (format === 'all') {
          await exportMethods.exportAll(data, config)
        } else if (format === 'excel') {
          await exportMethods.exportToExcel(data, config)
        } else if (format === 'csv') {
          await exportMethods.exportToCSV(data, config)
        } else if (format === 'pdf') {
          await exportMethods.exportToPDF(data, config)
        } else if (format === 'html') {
          await exportMethods.exportToHTML(data, config)
        } else if (format === 'json') {
          await exportMethods.exportToJSON(data, config)
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  // Optional: a preview dataset for ExportButtons (single-table quick export)
  const previewData: UniversalTableData | null = null

  return (
    <div className={styles.container} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={styles.header}>
        <div className={styles.title}>{language === 'ar' ? 'تصدير قاعدة البيانات' : 'Export Database'}</div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.controls}>
        <div className={styles.group}>
          <label className={styles.label}>{language === 'ar' ? 'اللغة' : 'Language'}</label>
          <select className={styles.select} value={language} onChange={e => setLanguage(e.target.value as ExportLanguage)}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>{language === 'ar' ? 'التنسيق' : 'Format'}</label>
          <select className={styles.select} value={format} onChange={e => setFormat(e.target.value as FormatOption)}>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="html">HTML</option>
            <option value="json">JSON</option>
            <option value="all">{language === 'ar' ? 'كل الصيغ' : 'All formats'}</option>
          </select>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>{language === 'ar' ? 'الوضع' : 'Mode'}</label>
          <select className={styles.select} value={mode} onChange={e => setMode(e.target.value as ModeOption)}>
            <option value="whole">{language === 'ar' ? 'الجدول بالكامل' : 'Whole table'}</option>
            <option value="filtered">{language === 'ar' ? 'مفلتر (للمعاملات فقط)' : 'Filtered (transactions only)'}</option>
          </select>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <div className={styles.sectionTitle}>{language === 'ar' ? 'الجداول' : 'Tables'}</div>
          <div className={styles.tableList}>
            {tables.map(t => (
              <label key={t.name} className={styles.tableItem}>
                <input
                  type="checkbox"
                  checked={selectedTables.includes(t.name)}
                  onChange={() => toggleTable(t.name)}
                />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
          <div className={styles.actions}>
            <button className={`ultimate-btn ultimate-btn-edit ${styles.actionBtn}`} onClick={exportSelected} disabled={busy || selectedTables.length === 0}>
              <div className="btn-content"><span className="btn-text">{busy ? (language === 'ar' ? 'جاري التصدير...' : 'Exporting...') : (language === 'ar' ? 'تصدير المحدد' : 'Export selected')}</span></div>
            </button>
            <button className={`ultimate-btn ultimate-btn-warning ${styles.actionBtn}`} onClick={() => setSelectedTables([])} disabled={busy || selectedTables.length === 0}>
              <div className="btn-content"><span className="btn-text">{language === 'ar' ? 'مسح الاختيار' : 'Clear selection'}</span></div>
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {mode === 'filtered' && selectedTables.includes('transactions') && (
            <div className={styles.filtersPanel}>
              <div className={styles.sectionTitle}>{language === 'ar' ? 'فلاتر المعاملات' : 'Transaction Filters'}</div>
              <div className={styles.filtersRow}>
                <input className={styles.input} placeholder={language === 'ar' ? 'بحث...' : 'Search...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <input className={styles.input} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <input className={styles.input} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                <select className={styles.select} value={isPosted} onChange={e => setIsPosted(e.target.value)}>
                  <option value="">{language === 'ar' ? 'الحالة' : 'Status'}</option>
                  <option value="posted">{language === 'ar' ? 'مرحلة' : 'Posted'}</option>
                  <option value="unposted">{language === 'ar' ? 'غير مرحلة' : 'Unposted'}</option>
                </select>
                <select className={styles.select} value={orgId} onChange={e => setOrgId(e.target.value)}>
                  <option value="">{language === 'ar' ? 'كل المؤسسات' : 'All orgs'}</option>
                  {orgs.map(o => (<option key={o.id} value={o.id}>{o.code} - {o.name}</option>))}
                </select>
                <select className={styles.select} value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">{language === 'ar' ? 'كل المشاريع' : 'All projects'}</option>
                  {projects.map(p => (<option key={p.id} value={p.id}>{p.code} - {p.name}</option>))}
                </select>
              </div>

              <div className={styles.filtersRow}>
                <div className={styles.selectWide}>
                  <SearchableSelect id="export.filter.debit" value={debitAccountId} options={[{ value: '', label: language === 'ar' ? 'جميع الحسابات المدينة' : 'All debit accounts', searchText: '' }, ...accountOptions]} onChange={setDebitAccountId} placeholder={language === 'ar' ? 'جميع الحسابات المدينة' : 'All debit accounts'} clearable />
                </div>
                <div className={styles.selectWide}>
                  <SearchableSelect id="export.filter.credit" value={creditAccountId} options={[{ value: '', label: language === 'ar' ? 'جميع الحسابات الدائنة' : 'All credit accounts', searchText: '' }, ...accountOptions]} onChange={setCreditAccountId} placeholder={language === 'ar' ? 'جميع الحسابات الدائنة' : 'All credit accounts'} clearable />
                </div>
                <select className={styles.select} value={classificationId} onChange={e => setClassificationId(e.target.value)}>
                  <option value="">{language === 'ar' ? 'جميع التصنيفات' : 'All classifications'}</option>
                  {classifications.map(c => (<option key={c.id} value={c.id}>{c.code} - {c.name}</option>))}
                </select>
                <select className={styles.select} value={expensesCategoryId} onChange={e => setExpensesCategoryId(e.target.value)}>
                  <option value="">{language === 'ar' ? 'جميع فئات المصروف' : 'All expense categories'}</option>
                  {categories.slice().sort((a,b) => `${a.code} - ${a.description}`.localeCompare(`${b.code} - ${b.description}`)).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.code} - {cat.description}</option>
                  ))}
                </select>
                <select className={styles.select} value={workItemId} onChange={e => setWorkItemId(e.target.value)}>
                  <option value="">{language === 'ar' ? 'جميع عناصر العمل' : 'All work items'}</option>
                  {workItems
                    .slice()
                    .sort((a, b) => `${a.code} - ${a.name}`.localeCompare(`${b.code} - ${b.name}`))
                    .map(w => (<option key={w.id} value={w.id}>{w.code} - {w.name}</option>))}
                </select>
                <select className={styles.select} value={costCenterId} onChange={e => setCostCenterId(e.target.value)}>
                  <option value="">{language === 'ar' ? 'جميع مراكز التكلفة' : 'All cost centers'}</option>
                  {costCenters.map(cc => (<option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>))}
                </select>
              </div>

              <div className={styles.filtersRow}>
                <input className={styles.input} type="number" placeholder={language === 'ar' ? 'من مبلغ' : 'Min amount'} value={amountFrom} onChange={e => setAmountFrom(e.target.value)} />
                <input className={styles.input} type="number" placeholder={language === 'ar' ? 'إلى مبلغ' : 'Max amount'} value={amountTo} onChange={e => setAmountTo(e.target.value)} />
                <button className={`ultimate-btn ultimate-btn-warning ${styles.smallBtn}`} onClick={clearFilters}>
                  <div className="btn-content"><span className="btn-text">{language === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}</span></div>
                </button>
              </div>
            </div>
          )}

          {/* Optional quick export for preview dataset: keep the control visible for consistency */}
          {previewData && (
            <div className={styles.previewExport}>
              <ExportButtons data={previewData} config={{ title: language === 'ar' ? 'تصدير' : 'Export', rtlLayout: language === 'ar', useArabicNumerals: language === 'ar' }} layout="dropdown" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExportDatabasePage

