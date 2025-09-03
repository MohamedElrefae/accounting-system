import React, { useEffect, useMemo, useRef, useState } from 'react'
import './StandardFinancialStatements.css'
import styles from './TrialBalanceAllLevels.module.css'
import { supabase } from '../../utils/supabase'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { tableColWidths, type ExplorerMode } from '../../components/Reports/AccountColumns'
import ReportTreeView from '../../components/TreeView/ReportTreeView'
import { fetchProjects, fetchOrganizations, type LookupOption, fetchAccountsMinimal } from '../../services/lookups'
import { getCompanyConfig } from '../../services/company-config'
import SearchableSelect, { type SearchableSelectOption } from '../../components/Common/SearchableSelect'
import { getAllTransactionClassifications, type TransactionClassification } from '../../services/transaction-classification'
import { getExpensesCategoriesList } from '../../services/expenses-categories'
import { listWorkItemsAll } from '../../services/work-items'
import { getCostCentersForSelector } from '../../services/cost-centers'
import TableView from '@mui/icons-material/TableView'
import Print from '@mui/icons-material/Print'
import Refresh from '@mui/icons-material/Refresh'
import UnfoldMore from '@mui/icons-material/UnfoldMore'
import UnfoldLess from '@mui/icons-material/UnfoldLess'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

// Account Explorer (Financial Reports)
// Read-only page that reuses chart-of-accounts hierarchy and displays balances in tree and table views.
// Shows final debit, final credit, and net. Supports posted-only vs all transactions and project filter.

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function startOfYearISO() {
  const d = new Date()
  return `${d.getFullYear()}-01-01`
}

interface Amounts {
  opening_debit: number
  opening_credit: number
  period_debits: number
  period_credits: number
  closing_debit: number
  closing_credit: number
}

interface Node {
  id: string
  code: string
  name: string
  name_ar: string | null
  level: number
  parent_id: string | null
  status: string
  category: string | null
  children: Node[]
  amounts: Amounts
  rollup: Amounts
}

const defaultAmounts = (): Amounts => ({
  opening_debit: 0,
  opening_credit: 0,
  period_debits: 0,
  period_credits: 0,
  closing_debit: 0,
  closing_credit: 0,
})

const sumAmounts = (a: Amounts, b: Amounts): Amounts => ({
  opening_debit: a.opening_debit + b.opening_debit,
  opening_credit: a.opening_credit + b.opening_credit,
  period_debits: a.period_debits + b.period_debits,
  period_credits: a.period_credits + b.period_credits,
  closing_debit: a.closing_debit + b.closing_debit,
  closing_credit: a.closing_credit + b.closing_credit,
})

const AccountExplorerReport: React.FC = () => {
  // View toggles
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree')
  const [mode, setMode] = useState<ExplorerMode>('asof')

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(startOfYearISO())
  const [dateTo, setDateTo] = useState<string>(todayISO())
  const [postedOnly, setPostedOnly] = useState<boolean>(false)
  const [includeZeros, setIncludeZeros] = useState<boolean>(false)
  const [uiLang, setUiLang] = useState<'ar' | 'en'>('ar')
  const [showOpeningInRange, setShowOpeningInRange] = useState<boolean>(true)
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true)
  const [currencySymbol, setCurrencySymbol] = useState<string>('none')

  // Orgs and projects
  const [orgOptions, setOrgOptions] = useState<LookupOption[]>([])
  const [projectOptions, setProjectOptions] = useState<LookupOption[]>([])
  const [orgId, setOrgId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const orgIdRef = useRef<string | null>(null)

  // Data
  const [nodes, setNodes] = useState<Node[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // Fullscreen
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {}
  }

  // Advanced filters
  const [classifications, setClassifications] = useState<TransactionClassification[]>([])
  const [expensesCategories, setExpensesCategories] = useState<any[]>([])
  const [workItems, setWorkItems] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [accountsOptions, setAccountsOptions] = useState<SearchableSelectOption[]>([])

  const [classificationId, setClassificationId] = useState<string>('')
  const [expensesCategoryId, setExpensesCategoryId] = useState<string>('')
  const [workItemId, setWorkItemId] = useState<string>('')
  const [costCenterId, setCostCenterId] = useState<string>('')
  const [debitAccountId, setDebitAccountId] = useState<string>('')
  const [creditAccountId, setCreditAccountId] = useState<string>('')
  const [amountMin, setAmountMin] = useState<string>('')
  const [amountMax, setAmountMax] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Load orgs, projects, default org, company currency
  useEffect(() => {
    (async () => {
      try { const orgs = await fetchOrganizations(); setOrgOptions(orgs || []) } catch {}
      try { const projs = await fetchProjects(); setProjectOptions(projs || []) } catch {}
      try { const { getActiveOrgId } = require('../../utils/org'); const stored = getActiveOrgId?.(); if (stored) setOrgId(stored) } catch {}
      try { const cfg = await getCompanyConfig(); setCurrencySymbol(cfg.currency_symbol || cfg.currency_code || 'EGP') } catch {}
    })()
  }, [])
  useEffect(() => { orgIdRef.current = orgId || null }, [orgId])

  // Load lookups on org change
  useEffect(() => {
    (async () => {
      try {
        if (orgId) {
          const [classes, cats, wItems, ccs, accs] = await Promise.all([
            getAllTransactionClassifications().catch(() => []),
            getExpensesCategoriesList(orgId).catch(() => []),
            listWorkItemsAll(orgId).catch(() => []),
            getCostCentersForSelector(orgId).catch(() => []),
            fetchAccountsMinimal().catch(() => []),
          ])
          setClassifications(classes || [])
          setExpensesCategories(cats || [])
          setWorkItems(wItems || [])
          setCostCenters((ccs || []).map((c: any) => ({ id: c.id, code: c.code, name: c.name })))
          const accOpts: SearchableSelectOption[] = (accs || []).map((a: any) => ({ value: a.id, label: `${a.code} - ${a.name}`, searchText: `${a.code} ${a.name}` }))
          setAccountsOptions([{ value: '', label: uiLang === 'ar' ? 'كل الحسابات' : 'All Accounts', searchText: '' }, ...accOpts])
        }
      } catch { /* noop */ }
    })()
  }, [orgId, uiLang])

  // Load data
  async function loadData() {
    setLoading(true)
    setError('')
    try {
      // 1) Fetch accounts for selected org
      let accQ = supabase
        .from('accounts')
        .select('id, code, name, name_ar, level, parent_id, status, category, org_id')
        .order('code', { ascending: true })
      if (orgIdRef.current) accQ = accQ.eq('org_id', orgIdRef.current)
      const accRes = await accQ
      if (accRes.error) throw accRes.error
      const accounts = (accRes.data || []) as any[]

      // 2) Fetch GL summary for current filters
      const { data: summaryData, error: sumErr } = await supabase.rpc('get_gl_account_summary', {
        p_date_from: mode === 'range' ? (dateFrom || null) : null,
        p_date_to: dateTo || null,
        p_org_id: orgIdRef.current || null,
        p_project_id: projectId || null,
        p_posted_only: postedOnly,
        p_limit: null,
        p_offset: null,
        p_classification_id: classificationId || null,
        p_cost_center_id: costCenterId || null,
        p_work_item_id: workItemId || null,
        p_expenses_category_id: expensesCategoryId || null,
        p_debit_account_id: debitAccountId || null,
        p_credit_account_id: creditAccountId || null,
        p_amount_min: amountMin ? Number(amountMin) : null,
        p_amount_max: amountMax ? Number(amountMax) : null,
      })
      if (sumErr) throw sumErr
      const summaryRows = (summaryData || []) as any[]
      const amountsById = new Map<string, Amounts>()
      for (const r of summaryRows) {
        amountsById.set(r.account_id, {
          opening_debit: Number(r.opening_debit || 0),
          opening_credit: Number(r.opening_credit || 0),
          period_debits: Number(r.period_debits || 0),
          period_credits: Number(r.period_credits || 0),
          closing_debit: Number(r.closing_debit || 0),
          closing_credit: Number(r.closing_credit || 0),
        })
      }

      // 3) Build nodes
      const nodeMap = new Map<string, Node>()
      for (const a of accounts) {
        const amt = amountsById.get(a.id) || defaultAmounts()
        nodeMap.set(a.id, {
          id: a.id,
          code: a.code,
          name: a.name,
          name_ar: a.name_ar || null,
          level: Number(a.level || 1),
          parent_id: a.parent_id,
          status: a.status || 'active',
          category: a.category || null,
          children: [],
          amounts: amt,
          rollup: defaultAmounts(),
        })
      }
      // 4) Link children and gather roots
      const roots: Node[] = []
      for (const n of nodeMap.values()) {
        if (n.parent_id && nodeMap.has(n.parent_id)) nodeMap.get(n.parent_id)!.children.push(n)
        else roots.push(n)
      }
      // 5) Rollup values
      const dfs = (n: Node): Amounts => {
        let acc = { ...n.amounts }
        for (const c of n.children) acc = sumAmounts(acc, dfs(c))
        n.rollup = acc
        return acc
      }
      for (const r of roots) dfs(r)

      // expand level 1 by default
      const l1 = new Set<string>()
      for (const r of roots) l1.add(r.id)
      setExpanded(l1)

      setNodes(roots)
    } catch (e: any) {
      setError(e?.message || 'فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  // Auto-load data when page opens or when filters change
  useEffect(() => { 
    loadData()
  }, [orgId, projectId, postedOnly, mode, dateFrom, dateTo, classificationId, expensesCategoryId, workItemId, costCenterId, debitAccountId, creditAccountId, amountMin, amountMax])
  
  // Initial data load once on mount (in case orgId is not set yet)
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Helpers
  const isZero = (n: Node) => {
    if (mode === 'range') return Number(n.rollup.period_debits || 0) === 0 && Number(n.rollup.period_credits || 0) === 0
    return Number(n.rollup.closing_debit || 0) === 0 && Number(n.rollup.closing_credit || 0) === 0
  }

  // Open General Ledger drilldown with current filters
  const openGL = (accountId: string) => {
    const params = new URLSearchParams()
    params.set('accountId', accountId)
    if (orgId) params.set('orgId', orgId)
    if (projectId) params.set('projectId', projectId)
    params.set('postedOnly', String(!!postedOnly))
    params.set('includeOpening', mode === 'range' ? String(true) : String(false))
    if (mode === 'range') {
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
    } else {
      if (dateTo) params.set('dateTo', dateTo)
    }
    // Advanced filters
    if (classificationId) params.set('classificationId', classificationId)
    if (costCenterId) params.set('costCenterId', costCenterId)
    if (workItemId) params.set('workItemId', workItemId)
    if (expensesCategoryId) params.set('expensesCategoryId', expensesCategoryId)
    if (debitAccountId) params.set('debitAccountId', debitAccountId)
    if (creditAccountId) params.set('creditAccountId', creditAccountId)
    if (amountMin) params.set('amountMin', amountMin)
    if (amountMax) params.set('amountMax', amountMax)
    const url = `/reports/general-ledger?${params.toString()}`
    try { window.open(url, '_blank', 'noopener') } catch {}
  }

  const flattenNodes = (roots: Node[]): Node[] => {
    const out: Node[] = []
    const walk = (n: Node) => { out.push(n); n.children.forEach(walk) }
    roots.forEach(walk)
    return out
  }

  const isBranchTotalName = (n: Node) => {
    const nm = (n.name_ar || n.name || '').toLowerCase()
    return nm.includes('مجموع') || nm.includes('total')
  }

  const visibleFlat = useMemo(() => {
    const flat = flattenNodes(nodes)
    const filteredZeros = includeZeros ? flat : flat.filter(n => !isZero(n))
    // Hide branch totals to avoid duplicate rollups
    const noBranchTotals = filteredZeros.filter(n => !isBranchTotalName(n))
    const term = (searchTerm || '').trim().toLowerCase()
    if (!term) return noBranchTotals
    return noBranchTotals.filter(n =>
      (n.code || '').toLowerCase().includes(term) ||
      (n.name_ar || n.name || '').toLowerCase().includes(term)
    )
  }, [nodes, includeZeros, mode, searchTerm])

  // Expand helpers
  const expandAll = () => setExpanded(prev => { const s = new Set(prev); visibleFlat.forEach(n => s.add(n.id)); return s })
  const collapseAll = () => setExpanded(new Set())
  const expandToLevel = (L: number) => setExpanded(prev => { const s = new Set(prev); visibleFlat.forEach(n => { if (n.level <= L) s.add(n.id); else s.delete(n.id) }); return s })

  // Export helpers (simple CSV for now)
  function exportCSV() {
    let cols: string[] = [uiLang === 'ar' ? 'الكود' : 'Code', uiLang === 'ar' ? 'اسم الحساب' : 'Account', uiLang === 'ar' ? 'نوع الحساب' : 'Type', uiLang === 'ar' ? 'المستوى' : 'Level']
    if (mode === 'range') {
      if (showOpeningInRange) cols.push(uiLang === 'ar' ? 'افتتاحي مدين' : 'Opening Debit', uiLang === 'ar' ? 'افتتاحي دائن' : 'Opening Credit')
      cols.push(
        uiLang === 'ar' ? 'مدين الفترة' : 'Period Debits',
        uiLang === 'ar' ? 'دائن الفترة' : 'Period Credits',
        uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit',
        uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit',
        uiLang === 'ar' ? 'صافي الفترة' : 'Period Net',
        uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net',
      )
    } else {
      cols.push(uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit', uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit', uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net')
    }

    const rows = visibleFlat.map(n => {
      const row: (string|number)[] = [n.code, (n.name_ar || n.name), (n.category || ''), String(n.level)]
      const openingDebit = Number(n.rollup.opening_debit || 0)
      const openingCredit = Number(n.rollup.opening_credit || 0)
      const periodDebits = Number(n.rollup.period_debits || 0)
      const periodCredits = Number(n.rollup.period_credits || 0)
      const closingDebit = Number(n.rollup.closing_debit || 0)
      const closingCredit = Number(n.rollup.closing_credit || 0)
      const periodNet = periodDebits - periodCredits
      const finalNet = closingDebit - closingCredit
      if (mode === 'range') {
        if (showOpeningInRange) { row.push(openingDebit, openingCredit) }
        row.push(periodDebits, periodCredits, closingDebit, closingCredit, periodNet, finalNet)
      } else {
        row.push(closingDebit, closingCredit, finalNet)
      }
      return row
    })

    const csv = [cols.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'account-explorer.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  return (
    <div ref={rootRef} className={styles.container} dir={uiLang === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`${styles.professionalFilterBar} ${styles.noPrint}`}>
        {/* Left: org + project + dates */}
        <div className={styles.filterSection}>
          <select className={styles.filterSelect} value={orgId} onChange={e => { setOrgId(e.target.value); try { const { setActiveOrgId } = require('../../utils/org'); setActiveOrgId?.(e.target.value) } catch {} }} aria-label={uiLang === 'ar' ? 'المؤسسة' : 'Organization'}>
            <option value="">{uiLang === 'ar' ? 'اختر المؤسسة' : 'Select organization'}</option>
            {orgOptions.map(o => (
              <option key={o.id} value={o.id}>{o.code ? `${o.code} — ` : ''}{o.name_ar || o.name}</option>
            ))}
          </select>
          <select className={styles.filterSelect} value={projectId} onChange={e => setProjectId(e.target.value)} aria-label={uiLang === 'ar' ? 'المشروع' : 'Project'}>
            <option value="">{uiLang === 'ar' ? 'كل المشاريع' : 'All Projects'}</option>
            {projectOptions.map(p => (
              <option key={p.id} value={p.id}>{p.code} — {p.name_ar || p.name}</option>
            ))}
          </select>
          {mode === 'range' && (
            <>
              <input className={styles.filterInput} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label={uiLang === 'ar' ? 'من' : 'From'} />
              <input className={styles.filterInput} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label={uiLang === 'ar' ? 'إلى' : 'To'} />
            </>
          )}
          {mode === 'asof' && (
            <input className={styles.filterInput} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label={uiLang === 'ar' ? 'حتى' : 'As of'} />
          )}
        </div>

        {/* Center: language + view toggles + expand/collapse */}
        <div className={styles.centerSection}>
          <div className={styles.languageToggle} role="group" aria-label={uiLang === 'ar' ? 'اللغة' : 'Language'}>
            <button type="button" className={`${styles.languageOption} ${uiLang === 'ar' ? 'active' : ''}`} onClick={() => setUiLang('ar')}>ع</button>
            <button type="button" className={`${styles.languageOption} ${uiLang === 'en' ? 'active' : ''}`} onClick={() => setUiLang('en')}>En</button>
          </div>

          <div className={styles.groupControls}>
            <button type="button" className={styles.groupControlButton} onClick={() => expandToLevel(1)} title={uiLang === 'ar' ? 'توسيع مستوى 1' : 'Expand L1'}>L1</button>
            <button type="button" className={styles.groupControlButton} onClick={() => expandToLevel(2)} title={uiLang === 'ar' ? 'توسيع مستوى 2' : 'Expand L2'}>L2</button>
            <button type="button" className={styles.groupControlButton} onClick={() => expandToLevel(3)} title={uiLang === 'ar' ? 'توسيع مستوى 3' : 'Expand L3'}>L3</button>
            <button type="button" className={styles.groupControlButton} onClick={() => expandToLevel(4)} title={uiLang === 'ar' ? 'توسيع مستوى 4' : 'Expand L4'}>L4</button>
            <button type="button" className={styles.groupControlButton} onClick={expandAll} title={uiLang === 'ar' ? 'توسيع الكل' : 'Expand All'}><UnfoldMore fontSize="small" /></button>
            <button type="button" className={styles.groupControlButton} onClick={collapseAll} title={uiLang === 'ar' ? 'طي الكل' : 'Collapse All'}><UnfoldLess fontSize="small" /></button>
          </div>

          <div className={styles.featureToggles}>
            <button type="button" className={`${styles.featureToggle} ${postedOnly ? 'active' : ''}`} onClick={() => setPostedOnly(v => !v)} title={uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted only'}>
              <Visibility fontSize="small" /><span className={styles.toggleText}>{uiLang === 'ar' ? 'المعتمد فقط' : 'Posted Only'}</span>
            </button>
            <button type="button" className={`${styles.featureToggle} ${includeZeros ? 'active' : ''}`} onClick={() => setIncludeZeros(v => !v)} title={uiLang === 'ar' ? 'إظهار الأرصدة الصفرية' : 'Show zero balances'}>
              {includeZeros ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}<span className={styles.toggleText}>{uiLang === 'ar' ? 'عرض الأصفار' : 'Show Zeros'}</span>
            </button>
            <button type="button" className={styles.featureToggle} onClick={() => setMode(m => m === 'range' ? 'asof' : 'range')} title={uiLang === 'ar' ? 'تبديل عرض الأعمدة' : 'Toggle columns'}>
              <span className={styles.toggleText}>{mode === 'range' ? (uiLang === 'ar' ? 'عرض ختامي' : 'Show Closing') : (uiLang === 'ar' ? 'عرض حركة الفترة' : 'Show Period')}</span>
            </button>
            {mode === 'range' && (
              <button type="button" className={`${styles.featureToggle} ${showOpeningInRange ? 'active' : ''}`} onClick={() => setShowOpeningInRange(v => !v)} title={uiLang === 'ar' ? 'إظهار الافتتاحي' : 'Show Opening'}>
                <span className={styles.toggleText}>{uiLang === 'ar' ? 'إظهار الافتتاحي' : 'Show Opening'}</span>
              </button>
            )}
            <button type="button" className={`${styles.featureToggle} ${numbersOnly ? 'active' : ''}`} onClick={() => setNumbersOnly(v => !v)} title={uiLang === 'ar' ? 'أرقام فقط' : 'Numbers only'}>
              {numbersOnly ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}<span className={styles.toggleText}>{uiLang === 'ar' ? 'أرقام فقط' : 'Numbers Only'}</span>
            </button>
            <div className={styles.viewSwitch}>
              <button type="button" className={`${styles.languageOption} ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')}>{uiLang === 'ar' ? 'شجرة' : 'Tree'}</button>
              <button type="button" className={`${styles.languageOption} ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>{uiLang === 'ar' ? 'جدول' : 'Table'}</button>
            </div>
          </div>
        </div>

        {/* Right: export/print/refresh */}
        <div className={styles.actionSection}>
          <div className={styles.exportGroup}>
            <button type="button" className={styles.exportButton} onClick={exportCSV} title={uiLang === 'ar' ? 'تصدير CSV' : 'Export CSV'}><TableView fontSize="small" /> CSV</button>
            <button type="button" className={styles.exportButton} onClick={printReport} title={uiLang === 'ar' ? 'طباعة' : 'Print'}><Print fontSize="small" /> {uiLang === 'ar' ? 'طباعة' : 'Print'}</button>
          </div>
          <button type="button" className={styles.actionButton} onClick={toggleFullscreen} title={uiLang === 'ar' ? (isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة') : (isFullscreen ? 'Exit Full Screen' : 'Full Screen')}>
            {isFullscreen ? (uiLang === 'ar' ? 'الخروج من ملء الشاشة' : 'Exit Full Screen') : (uiLang === 'ar' ? 'ملء الشاشة' : 'Full Screen')}
          </button>
          <button type="button" className={`${styles.actionButton} ${styles.primary}`} onClick={loadData} disabled={loading} title={uiLang === 'ar' ? 'تحديث' : 'Refresh'}>
            <Refresh fontSize="small" /> {loading ? (uiLang === 'ar' ? 'جاري التحميل...' : 'Loading...') : (uiLang === 'ar' ? 'تحديث' : 'Refresh')}
          </button>
        </div>
      </div>

      {/* Advanced Filters Row */}
      <div className={`${styles.professionalFilterBar} ${styles.noPrint}`} style={{ gap: 8, marginTop: 8 }}>
        <div className={styles.filterSection}>
          <input
            className={styles.filterInput}
            placeholder={uiLang === 'ar' ? 'بحث (كود/اسم)' : 'Search (code/name)'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div style={{ minWidth: 260 }}>
            <SearchableSelect
              id="ae.filter.debit"
              value={debitAccountId}
              options={accountsOptions}
              onChange={setDebitAccountId}
              placeholder={uiLang === 'ar' ? 'جميع الحسابات المدينة' : 'All debit accounts'}
              clearable
            />
          </div>
          <div style={{ minWidth: 260 }}>
            <SearchableSelect
              id="ae.filter.credit"
              value={creditAccountId}
              options={accountsOptions}
              onChange={setCreditAccountId}
              placeholder={uiLang === 'ar' ? 'جميع الحسابات الدائنة' : 'All credit accounts'}
              clearable
            />
          </div>
          <select className={styles.filterSelect} value={classificationId} onChange={e => setClassificationId(e.target.value)}>
            <option value="">{uiLang === 'ar' ? 'جميع التصنيفات' : 'All classifications'}</option>
            {classifications.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select className={styles.filterSelect} value={expensesCategoryId} onChange={e => setExpensesCategoryId(e.target.value)}>
            <option value="">{uiLang === 'ar' ? 'جميع فئات المصروف' : 'All expenses categories'}</option>
            {expensesCategories.map((c: any) => (<option key={c.id} value={c.id}>{`${c.code ?? ''} ${c.description ?? c.name ?? ''}`.trim()}</option>))}
          </select>
          <select className={styles.filterSelect} value={workItemId} onChange={e => setWorkItemId(e.target.value)}>
            <option value="">{uiLang === 'ar' ? 'جميع عناصر العمل' : 'All work items'}</option>
            {workItems.map((w: any) => (<option key={w.id} value={w.id}>{`${w.code ?? ''} ${w.name ?? ''}`.trim()}</option>))}
          </select>
          <select className={styles.filterSelect} value={costCenterId} onChange={e => setCostCenterId(e.target.value)}>
            <option value="">{uiLang === 'ar' ? 'جميع مراكز التكلفة' : 'All cost centers'}</option>
            {costCenters.map((cc) => (<option key={cc.id} value={cc.id}>{`${cc.code} - ${cc.name}`}</option>))}
          </select>
          <input className={styles.filterInput} type="number" placeholder={uiLang === 'ar' ? 'من مبلغ' : 'Min amount'} value={amountMin} onChange={e => setAmountMin(e.target.value)} />
          <input className={styles.filterInput} type="number" placeholder={uiLang === 'ar' ? 'إلى مبلغ' : 'Max amount'} value={amountMax} onChange={e => setAmountMax(e.target.value)} />
          <button className={styles.actionButton} onClick={loadData} disabled={loading}>{uiLang === 'ar' ? 'تطبيق' : 'Apply'}</button>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {viewMode === 'tree' ? (
        <div className={`standard-financial-statements ${styles.accountExplorerFullScreen}`}>
          <ReportTreeView
            data={flattenNodes(nodes).map(n => ({
              id: n.id,
              code: n.code,
              name_ar: n.name_ar || n.name,
              name_en: n.name,
              level: n.level,
              parent_id: n.parent_id,
              is_active: n.status === 'active',
              account_type: n.category || undefined,
              opening_debit: n.rollup.opening_debit,
              opening_credit: n.rollup.opening_credit,
              period_debits: n.rollup.period_debits,
              period_credits: n.rollup.period_credits,
              closing_debit: n.rollup.closing_debit,
              closing_credit: n.rollup.closing_credit,
              transaction_count: undefined,
            }))}
            selectedId={undefined}
            onSelect={undefined}
            onToggleExpand={async () => {}}
            canHaveChildren={(node) => nodes.some(n => n.parent_id === (node as any).id)}
            getChildrenCount={(node) => nodes.filter(n => n.parent_id === (node as any).id).length}
            mode={mode}
            showTxnCount={false}
            showOpeningColsInRange={mode === 'range' ? showOpeningInRange : false}
            numbersOnly={numbersOnly}
            currencySymbol={numbersOnly ? 'none' : currencySymbol}
            expandedIds={expanded}
            onExpandedChange={setExpanded}
            showSubtotals={false}
            onOpenGL={(node) => {
              openGL(node.id)
            }}
          />
        </div>
      ) : (
        <div className={`standard-financial-statements ${styles.accountExplorerFullScreen}`} style={{ padding: '0.5rem', width: '100%' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className={styles.accountsTable}>
              <colgroup>
                {tableColWidths(mode, { periodOnly: (mode === 'range' && !showOpeningInRange) }).map((w, idx) => (
                  <col key={idx} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>{uiLang === 'ar' ? 'الكود' : 'Code'}</th>
                  <th>{uiLang === 'ar' ? 'اسم الحساب' : 'Account'}</th>
                  <th>{uiLang === 'ar' ? 'نوع الحساب' : 'Type'}</th>
                  <th>{uiLang === 'ar' ? 'المستوى' : 'Level'}</th>
                  {mode === 'range' ? (
                    <>
                      {showOpeningInRange && (<>
                        <th>{uiLang === 'ar' ? 'افتتاحي مدين' : 'Opening Debit'}</th>
                        <th>{uiLang === 'ar' ? 'افتتاحي دائن' : 'Opening Credit'}</th>
                      </>)}
                      <th>{uiLang === 'ar' ? 'مدين الفترة' : 'Period Debits'}</th>
                      <th>{uiLang === 'ar' ? 'دائن الفترة' : 'Period Credits'}</th>
                      <th>{uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit'}</th>
                      <th>{uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit'}</th>
                      <th>{uiLang === 'ar' ? 'صافي الفترة' : 'Period Net'}</th>
                      <th>{uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net'}</th>
                    </>
                  ) : (
                    <>
                      <th>{uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit'}</th>
                      <th>{uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit'}</th>
                      <th>{uiLang === 'ar' ? 'الصافي الختامي' : 'Final Net'}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleFlat.map((n) => {
                  const periodNet = Number(n.rollup.period_debits || 0) - Number(n.rollup.period_credits || 0)
                  const finalNet = Number(n.rollup.closing_debit || 0) - Number(n.rollup.closing_credit || 0)
                  const hasChildren = (n.children && n.children.length > 0)
                  const rowClass = [
                    styles.clickableRow,
                    hasChildren ? styles.aeParentRow : '',
                    hasChildren && n.level === 1 ? styles.aeLevel1Row : '',
                    hasChildren && n.level === 2 ? styles.aeLevel2Row : '',
                    hasChildren && n.level === 3 ? styles.aeLevel3Row : '',
                    hasChildren && n.level >= 4 ? styles.aeLevel4Row : '',
                  ].filter(Boolean).join(' ')
                  return (
                    <tr
                      key={n.id}
                      className={rowClass}
                      title={uiLang === 'ar' ? 'فتح دفتر الأستاذ' : 'Open General Ledger'}
                      tabIndex={0}
                      role="button"
                      onClick={() => openGL(n.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGL(n.id) } }}
                    >
                      <td className={`${styles.tableCodeCell} contrast-table-code-${document.documentElement.getAttribute('data-theme') || 'light'}`}>{n.code}</td>
                      <td style={{ paddingInlineStart: `${(n.level - 1) * 16}px` }}>{n.name_ar || n.name}</td>
                      <td className={styles.tableCenter}>{n.category || '—'}</td>
                      <td className={styles.tableCenter}>{n.level}</td>
                      {mode === 'range' ? (
                        <>
                          {showOpeningInRange && (<>
                            <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.opening_debit, numbersOnly ? 'none' : currencySymbol)}</td>
                            <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.opening_credit, numbersOnly ? 'none' : currencySymbol)}</td>
                          </>)}
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.period_debits, numbersOnly ? 'none' : currencySymbol)}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.period_credits, numbersOnly ? 'none' : currencySymbol)}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.closing_debit, numbersOnly ? 'none' : currencySymbol)}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.closing_credit, numbersOnly ? 'none' : currencySymbol)}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(periodNet, numbersOnly ? 'none' : currencySymbol)}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(finalNet, numbersOnly ? 'none' : currencySymbol)}</td>
                        </>
                      ) : (
                        <>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.closing_debit, numbersOnly ? 'none' : currencySymbol)}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(n.rollup.closing_credit, numbersOnly ? 'none' : currencySymbol)}</td>
                          <td className={styles.tableRight}>{formatArabicCurrency(finalNet, numbersOnly ? 'none' : currencySymbol)}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountExplorerReport

