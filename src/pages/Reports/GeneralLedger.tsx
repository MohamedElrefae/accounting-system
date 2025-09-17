import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import styles from './GeneralLedger.module.css'
import { fetchGeneralLedgerReport, type GLFilters, type GLRow } from '../../services/reports/general-ledger'
import ExportButtons from '../../components/Common/ExportButtons'
import PresetBar from '../../components/Common/PresetBar'
import { fetchGLAccountSummary, type GLAccountSummaryRow } from '../../services/reports/gl-account-summary'
import { fetchOrganizations, fetchProjects, fetchAccountsMinimal, type LookupOption } from '../../services/lookups'
import type { UniversalTableData } from '../../utils/UniversalExportManager'
import { exportToExcel, exportToCSV } from '../../utils/UniversalExportManager'
import { createStandardColumns, prepareTableData } from '../../hooks/useUniversalExport'
import { useReportPresets } from '../../hooks/useReportPresets'
import { getCompanyConfig } from '../../services/company-config'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { supabase } from '../../utils/supabase'
import './StandardFinancialStatements.css'

const todayISO = () => new Date().toISOString().slice(0, 10)

type ViewMode = 'overview' | 'details'
type DensityMode = 'normal' | 'dense'

interface AmountFilters {
  minDebit: string
  maxDebit: string
  minCredit: string
  maxCredit: string
  minBalance: string
  maxBalance: string
}

interface SavedFilterSet {
  id: string
  name: string
  amountFilters: AmountFilters
  accountTypeFilter: 'all' | 'postable' | 'summary'
  balanceTypeFilter: 'all' | 'debit' | 'credit' | 'zero'
  dateFrom: string
  dateTo: string
}


// Debounced hook for search
const useDebounced = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

const GeneralLedger: React.FC = () => {
  // Filters
  const [filters, setFilters] = useState<GLFilters>({
    // Start with no dates so the app auto-expands to the full available range
    dateFrom: '',
    dateTo: '',
    includeOpening: true,
    postedOnly: false,
  })

  const [accountId, setAccountId] = useState<string>('')
  const [orgId, setOrgId] = useState<string>('')
  const [projectId, setProjectId] = useState<string>('')
  const [classificationId, setClassificationId] = useState<string>('')
  const [analysisWorkItemId, setAnalysisWorkItemId] = useState<string>('')
  const [expensesCategoryId, setExpensesCategoryId] = useState<string>('')
  const [analysisItemOptions, setAnalysisItemOptions] = useState<{ id: string, code: string, name: string, name_ar?: string | null }[]>([])
  const [expensesCategoryOptions, setExpensesCategoryOptions] = useState<{ id: string, code: string, description: string, name?: string }[]>([])
  
  // Debug logging for analysisItemOptions state changes
  useEffect(() => {
    console.log('📊 analysisItemOptions state changed:', analysisItemOptions.length, 'items:', analysisItemOptions)
  }, [analysisItemOptions])
  
  // Debug logging for expensesCategoryOptions state changes  
  useEffect(() => {
    console.log('💰 expensesCategoryOptions state changed:', expensesCategoryOptions.length, 'items:', expensesCategoryOptions)
  }, [expensesCategoryOptions])

  const [data, setData] = useState<GLRow[]>([])
  const [summaryRows, setSummaryRows] = useState<GLAccountSummaryRow[]>([])
  const [hideZeroAccounts, setHideZeroAccounts] = useState<boolean>(true)
  const [activityOnly, setActivityOnly] = useState<boolean>(false)
  const [onlyPostable, setOnlyPostable] = useState<boolean>(false)
  const [onlyNonPostable, setOnlyNonPostable] = useState<boolean>(false)
  const [includeChildrenInDrilldown, setIncludeChildrenInDrilldown] = useState<boolean>(true)
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('overview')
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalRows, setTotalRows] = useState<number>(0)
  // Persist page size across sessions
  useEffect(() => {
    try {
      const s = localStorage.getItem('gl_pageSize')
      if (s) {
        const n = parseInt(s, 10)
        if (!isNaN(n) && n > 0 && n <= 100000) setPageSize(n)
      }
    } catch { /* noop */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('gl_pageSize', String(pageSize)) } catch { /* noop */ }
  }, [pageSize])
  // Drill-down expanded row must be declared before effects that persist it
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null)
  // Compare mode
  const [compareMode, setCompareMode] = useState<boolean>(false)
  const [compareTotals, setCompareTotals] = useState<{ prev: number, curr: number, variance: number, pct: number | null } | null>(null)
  const [showCompareOverview, setShowCompareOverview] = useState<boolean>(true)
  const [_orgOptions, _setOrgOptions] = useState<LookupOption[]>([])
  const [_projectOptions, _setProjectOptions] = useState<LookupOption[]>([])
  const [accountOptions, setAccountOptions] = useState<LookupOption[]>([])
  const [classificationOptions, setClassificationOptions] = useState<LookupOption[]>([])
  
  // Advanced features
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [densityMode, setDensityMode] = useState<DensityMode>('normal')
  // Numbers-only (hide currency symbol) setting for exports
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true)
  const debouncedSearch = useDebounced(searchTerm, 300)
  const searchInputRef = useRef<HTMLInputElement>(null)
  // Jump to account code (overview)
  const [jumpCode, setJumpCode] = useState<string>('')
  
  // Keyboard shortcuts and accessibility
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false)
  
  // Advanced filtering and analytics
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false)
  const [savedFilterSets, setSavedFilterSets] = useState<SavedFilterSet[]>([])
  const [currentFilterSet, setCurrentFilterSet] = useState<string>('')
  const [newFilterSetName, setNewFilterSetName] = useState<string>('')
  const [amountFilters, setAmountFilters] = useState<AmountFilters>({
    minDebit: '',
    maxDebit: '',
    minCredit: '',
    maxCredit: '',
    minBalance: '',
    maxBalance: ''
  })
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'postable' | 'summary'>('all')
  const [balanceTypeFilter, setBalanceTypeFilter] = useState<'all' | 'debit' | 'credit' | 'zero'>('all')
  const [showAnalytics, setShowAnalytics] = useState<boolean>(false)

  // Company for header
  const [companyName, setCompanyName] = useState<string>('')
  useEffect(() => {
    (async () => {
      try { const cfg = await getCompanyConfig(); setCompanyName(cfg?.company_name || '') } catch {}
    })()
  }, [])

  // Persist preferences
  useEffect(() => {
    try {
      const v = localStorage.getItem('gl_showCompareOverview')
      if (v !== null) setShowCompareOverview(v === 'true')
    } catch {}
    try {
      const hz = localStorage.getItem('gl_hideZeroAccounts')
      if (hz !== null) setHideZeroAccounts(hz === 'true')
    } catch {}
    try {
      const act = localStorage.getItem('gl_activityOnly')
      if (act !== null) setActivityOnly(act === 'true')
    } catch {}
    try {
      const op = localStorage.getItem('gl_onlyPostable')
      if (op !== null) setOnlyPostable(op === 'true')
    } catch {}
    try {
      const onp = localStorage.getItem('gl_onlyNonPostable')
      if (onp !== null) setOnlyNonPostable(onp === 'true')
    } catch {}
    try {
      const exp = localStorage.getItem('gl_expandedAccountId')
      if (exp) setExpandedAccountId(exp)
    } catch {}
    try {
      const inc = localStorage.getItem('gl_includeChildrenDrilldown')
      if (inc !== null) setIncludeChildrenInDrilldown(inc === 'true')
    } catch {}
    try {
      const no = localStorage.getItem('gl_numbersOnly')
      if (no !== null) setNumbersOnly(no === 'true')
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('gl_showCompareOverview', String(showCompareOverview)) } catch {}
  }, [showCompareOverview])
  useEffect(() => {
    try { localStorage.setItem('gl_hideZeroAccounts', String(hideZeroAccounts)) } catch {}
  }, [hideZeroAccounts])
  useEffect(() => {
    try { localStorage.setItem('gl_activityOnly', String(activityOnly)) } catch {}
  }, [activityOnly])
  useEffect(() => {
    try { localStorage.setItem('gl_onlyPostable', String(onlyPostable)) } catch {}
  }, [onlyPostable])
  useEffect(() => {
    try { localStorage.setItem('gl_onlyNonPostable', String(onlyNonPostable)) } catch {}
  }, [onlyNonPostable])
  useEffect(() => {
    // enforce mutual exclusivity: if one becomes true, turn the other off
    if (onlyPostable && onlyNonPostable) {
      setOnlyNonPostable(false)
    }
  }, [onlyPostable, onlyNonPostable])
  useEffect(() => {
    try {
      if (expandedAccountId) localStorage.setItem('gl_expandedAccountId', expandedAccountId)
      else localStorage.removeItem('gl_expandedAccountId')
    } catch {}
  }, [expandedAccountId])
  useEffect(() => {
    try { localStorage.setItem('gl_includeChildrenDrilldown', String(includeChildrenInDrilldown)) } catch {}
  }, [includeChildrenInDrilldown])
  useEffect(() => {
    try { localStorage.setItem('gl_numbersOnly', String(numbersOnly)) } catch {}
  }, [numbersOnly])

  // Auto-set default date range from first to last transaction - DISABLED to show all transactions by default
  // This ensures the report starts with all available data without date restrictions
  useEffect(() => {
    // Commented out to show all transactions by default without date filters
    // (async () => {
    //   try {
    //     const r = await fetchTransactionsDateRange({
    //       orgId: orgId || null,
    //       projectId: projectId || null,
    //       postedOnly: filters.postedOnly ?? false,
    //     })
    //     if (r && r.min_date && r.max_date) {
    //       setFilters(prev => ({ ...prev, dateFrom: r.min_date || prev.dateFrom, dateTo: r.max_date || prev.dateTo }))
    //     }
    //   } catch { /* noop */ }
    // })()
  }, [orgId, projectId, filters.postedOnly])

  // Presets and columns
  const reportKey = 'general-ledger'
  const { presets, selectedPresetId, newPresetName, setNewPresetName, loadPresetsAndApplyLast, selectPresetAndApply, saveCurrentPreset, deleteSelectedPreset } = useReportPresets(reportKey)
  const [columnMenuOpen, setColumnMenuOpen] = useState<boolean>(false)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  // Temporary column states for the modal
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>([])
  const [tempVisibleOverviewColumns, setTempVisibleOverviewColumns] = useState<string[]>([])
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
  
  // Column reordering functions
  const reorderColumns = (columns: string[], startIndex: number, endIndex: number): string[] => {
    const result = [...columns]
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
  }
  
  const handleDragStart = (e: React.DragEvent, columnKey: string, isOverview: boolean) => {
    setDraggedColumn(columnKey)
    e.dataTransfer.setData('text/plain', JSON.stringify({ columnKey, isOverview }))
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  
  const handleDragEnd = () => {
    setDraggedColumn(null)
  }

  // Full export (Overview/Details) using server-side batching
  const [isExportingFull, setIsExportingFull] = useState<boolean>(false)
  const handleFullExport = async (format: 'excel' | 'csv') => {
    if (isExportingFull) return
    setIsExportingFull(true)
    try {
      const limit = 1000
      const commonConfig = {
        title: view === 'overview' ? (() => {
          const chips: string[] = []
          chips.push(includeChildrenInDrilldown ? 'الوضع: مدمج' : 'الوضع: توسيع أول فرعي')
          if (filters.postedOnly) chips.push('فلتر: قيود معتمدة فقط')
          if (hideZeroAccounts) chips.push('فلتر: إخفاء الحسابات ذات القيم 0')
          if (activityOnly) chips.push('فلتر: حركة فقط')
          if (onlyPostable) chips.push('فلتر: قابل للترحيل فقط')
          if (onlyNonPostable) chips.push('فلتر: تجميعي فقط')
          if (analysisWorkItemId) {
            const ai = analysisItemOptions.find(a => a.id === analysisWorkItemId)
            if (ai) chips.push(`بند التحليل: ${ai.code ? ai.code + ' - ' : ''}${ai.name_ar || ai.name}`)
          }
          if (expensesCategoryId) {
            const ec = expensesCategoryOptions.find(e => e.id === expensesCategoryId)
            if (ec) chips.push(`فئة المصروفات: ${ec.code ? ec.code + ' - ' : ''}${ec.description}`)
          }
          return `ملخص دفتر الأستاذ العام — ${chips.join(' — ')}`
        })() : (() => {
          // Build details export title with account and chips
          const acc = accountOptions.find(a => a.id === accountId)
          const base = (() => {
            if (!acc) return 'تقرير دفتر الأستاذ العام'
            const hasChildren = !!(acc.code && accountOptions.some(o => o.id !== acc.id && o.code && o.code.startsWith(acc.code || '')))
            const badge = hasChildren ? 'تجميعي' : 'قابل للترحيل'
            return `تقرير دفتر الأستاذ — ${acc.code ? acc.code + ' - ' : ''}${acc.name_ar || acc.name} (${badge})`
          })()
          const chips: string[] = []
          if (filters.postedOnly) chips.push('فلتر: قيود معتمدة فقط')
          chips.push(includeChildrenInDrilldown ? 'الوضع: مدمج' : 'الوضع: توسيع أول فرعي')
          if (analysisWorkItemId) {
            const ai = analysisItemOptions.find(a => a.id === analysisWorkItemId)
            if (ai) chips.push(`بند التحليل: ${ai.code ? ai.code + ' - ' : ''}${ai.name_ar || ai.name}`)
          }
          if (expensesCategoryId) {
            const ec = expensesCategoryOptions.find(e => e.id === expensesCategoryId)
            if (ec) chips.push(`فئة المصروفات: ${ec.code ? ec.code + ' - ' : ''}${ec.description}`)
          }
          return chips.length ? `${base} — ${chips.join(' — ')}` : base
        })(),
        orientation: 'landscape' as const,
        useArabicNumerals: true,
        rtlLayout: true,
      }

      if (view === 'overview') {
        // Fetch all summary pages
        let offset = 0
        let all: GLAccountSummaryRow[] = []
        while (true) {
          const rows = await fetchGLAccountSummary({
            dateFrom: filters.dateFrom || null,
            dateTo: filters.dateTo || null,
            orgId: orgId || null,
            projectId: projectId || null,
            postedOnly: filters.postedOnly,
            limit,
            offset,
            analysisWorkItemId: analysisWorkItemId || null,
            expensesCategoryId: expensesCategoryId || null,
          })
          all.push(...rows)
          if (rows.length < limit) break
          offset += limit
        }

        // Apply zero-accounts filtering to full export if enabled
        if (hideZeroAccounts) {
          const isZeroRow = (r: GLAccountSummaryRow) => {
            const opening = Number(r.opening_debit || 0) + Number(r.opening_credit || 0)
            const period = Number(r.period_debits || 0) + Number(r.period_credits || 0)
            const closing = Number(r.closing_debit || 0) + Number(r.closing_credit || 0)
            const tx = Number(r.transaction_count || 0)
            return opening === 0 && period === 0 && closing === 0 && tx === 0
          }
          all = all.filter(r => !isZeroRow(r))
        }
        if (activityOnly) {
          all = all.filter(r => (Number(r.period_debits || 0) + Number(r.period_credits || 0)) > 0)
        }

        const cols = overviewColumnOptions
          .filter(c => visibleOverviewColumns.includes(c.key))
          .map(c => ({ key: c.key, header: c.label, type: (['opening_debit','opening_credit','period_debits','period_credits','closing_debit','closing_credit'].includes(c.key) ? 'currency' : 'text') as 'currency' | 'text', currency: (['opening_debit','opening_credit','period_debits','period_credits','closing_debit','closing_credit'].includes(c.key) ? (numbersOnly ? 'none' : 'EGP') : undefined) }))
        const columns = createStandardColumns(cols)
        const rows = all.map(r => ({
          account_code: r.account_code,
          account_name: r.account_name_ar || r.account_name_en || '',
          opening_debit: Number(r.opening_debit || 0),
          opening_credit: Number(r.opening_credit || 0),
          period_debits: Number(r.period_debits || 0),
          period_credits: Number(r.period_credits || 0),
          closing_debit: Number(r.closing_debit || 0),
          closing_credit: Number(r.closing_credit || 0),
          transaction_count: r.transaction_count,
        }))

        const data = prepareTableData(columns, rows)
        // Prepend compare summary if enabled
        const prependRows: (string | number)[][] = []
        if (compareMode && compareTotals) {
          prependRows.push(['الفترة السابقة (صافي)', Number(compareTotals.prev || 0)])
          prependRows.push(['الفترة الحالية (صافي)', Number(compareTotals.curr || 0)])
          prependRows.push(['الفرق', Number(compareTotals.variance || 0)])
          prependRows.push(['% التغير', compareTotals.pct == null ? '' : `${(compareTotals.pct * 100).toFixed(2)}%`])
          prependRows.push([''])
        }
        const finalData: UniversalTableData = { ...data, metadata: { ...(data.metadata || {}), prependRows: prependRows.length ? prependRows : undefined } }
        if (format === 'excel') await exportToExcel(finalData, commonConfig)
        else await exportToCSV(finalData, commonConfig)
        return
      }

      // Details view full export
      let offset = 0
      const all: GLRow[] = []
      while (true) {
        const rows = await fetchGeneralLedgerReport({
          accountId: accountId || null,
          dateFrom: filters.dateFrom || null,
          dateTo: filters.dateTo || null,
          orgId: orgId || null,
          projectId: projectId || null,
          includeOpening: filters.includeOpening,
          postedOnly: filters.postedOnly,
          limit,
          offset,
          analysisWorkItemId: analysisWorkItemId || null,
          expensesCategoryId: expensesCategoryId || null,
        })
        all.push(...rows)
        if (rows.length < limit) break
        offset += limit
      }

      const cols = detailColumnOptions
        .filter(c => visibleColumns.includes(c.key))
        .map(c => ({ key: c.key, header: c.label, type: (['debit','credit','running_debit','running_credit'].includes(c.key) ? 'currency' : (c.key === 'entry_date' ? 'date' : 'text')) as 'currency' | 'date' | 'text', currency: (['debit','credit','running_debit','running_credit'].includes(c.key) ? (numbersOnly ? 'none' : 'EGP') : undefined) }))
      const columns = createStandardColumns(cols)
      const rows = all.map(r => ({
        entry_number: r.entry_number ?? '',
        entry_date: r.entry_date,
        account_code: r.account_code,
        account_name_ar: r.account_name_ar ?? r.account_name_en ?? '',
        description: r.description ?? '',
        debit: Number(r.debit || 0),
        credit: Number(r.credit || 0),
        running_debit: Number(r.running_debit || 0),
        running_credit: Number(r.running_credit || 0),
      }))
      const data = prepareTableData(columns, rows)
      const prependRows: (string | number)[][] = []
      // Enrich metadata with account and mode context for details exports
      if (compareMode && compareTotals) {
        prependRows.push(['الفترة السابقة (صافي)', Number(compareTotals.prev || 0)])
        prependRows.push(['الفترة الحالية (صافي)', Number(compareTotals.curr || 0)])
        prependRows.push(['الفرق', Number(compareTotals.variance || 0)])
        prependRows.push(['% التغير', compareTotals.pct == null ? '' : `${(compareTotals.pct * 100).toFixed(2)}%`])
        prependRows.push([''])
      }
      const finalData: UniversalTableData = { ...data, metadata: { ...(data.metadata || {}), prependRows: prependRows.length ? prependRows : undefined } }
      if (format === 'excel') await exportToExcel(finalData, commonConfig)
      else await exportToCSV(finalData, commonConfig)
    } catch (e) {
      console.error('Full export failed', e)
    } finally {
      setIsExportingFull(false)
    }
  }
  
  // Keyboard shortcuts handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle shortcuts when not typing in inputs
    const activeElement = document.activeElement
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' || 
      activeElement.tagName === 'SELECT' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    )
    
    if (isTyping) return
    
    // Handle shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'k': // Ctrl+K: Focus search (overview mode)
          e.preventDefault()
          if (view === 'overview' && searchInputRef.current) {
            searchInputRef.current.focus()
          }
          break
        case 'e': // Ctrl+E: Toggle view (overview/details)
          e.preventDefault()
          setView(v => v === 'overview' ? 'details' : 'overview')
          break
        case 'd': // Ctrl+D: Toggle density
          e.preventDefault()
          setDensityMode(d => d === 'dense' ? 'normal' : 'dense')
          break
        case 'm': // Ctrl+M: Toggle compare mode
          e.preventDefault()
          setCompareMode(c => !c)
          break
        case 'r': // Ctrl+R: Reset filters
          e.preventDefault()
          // Reset date range filters - clear dates to show all transactions
          setFilters({ dateFrom: '', dateTo: '', includeOpening: true, postedOnly: false })
          
          // Reset basic filters
          setAccountId(''); 
          setOrgId(''); 
          setProjectId('');
          setClassificationId(''); // Reset classification filter
          setExpensesCategoryId(''); // Reset expenses category filter
          
          // Reset UI state filters
          setHideZeroAccounts(true); 
          setActivityOnly(false);
          setOnlyPostable(false); 
          setOnlyNonPostable(false);
          setIncludeChildrenInDrilldown(true);
          
          // Reset search/pagination
          setCurrentPage(1);
          setSearchTerm('');
          setJumpCode(''); // Reset jump code
          
          // Reset advanced filters
          setAmountFilters({
            minDebit: '',
            maxDebit: '',
            minCredit: '',
            maxCredit: '',
            minBalance: '',
            maxBalance: ''
          });
          setAccountTypeFilter('all');
          setBalanceTypeFilter('all');
          
          // Close any open filters or modals
          setShowAdvancedFilters(false);
          setShowAnalytics(false);
          break
        case 'h': // Ctrl+H: Show/hide shortcuts help
          e.preventDefault()
          setShowShortcutsHelp(h => !h)
          break
        case 'f': // Ctrl+F: Show/hide advanced filters
          e.preventDefault()
          setShowAdvancedFilters(f => !f)
          break
        case 'a': // Ctrl+A: Show/hide analytics
          e.preventDefault()
          setShowAnalytics(a => !a)
          break
        case '1': // Ctrl+1: Export Excel
          e.preventDefault()
          handleFullExport('excel')
          break
        case '2': // Ctrl+2: Export CSV
          e.preventDefault()
          handleFullExport('csv')
          break
      }
    } else {
      switch (e.key) {
        case 'Escape': // ESC: Close modals/dropdowns
          e.preventDefault()
          setColumnMenuOpen(false)
          setShowShortcutsHelp(false)
          setShowAdvancedFilters(false)
          setShowAnalytics(false)
          setExpandedAccountId(null)
          break
        case 'F1': // F1: Show help
          e.preventDefault()
          setShowShortcutsHelp(h => !h)
          break
      }
    }
  }, [view, handleFullExport])
  
  // Register keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Helper function for formatting currency in print context
  const formatPrintCurrency = (amount: number, currency?: string) => {
    if (amount === 0) return '—'
    const formatted = Math.abs(amount).toLocaleString('ar-EG', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
    return currency === 'none' ? formatted : `${formatted} ج.م`
  }

  // Professional commercial print function for General Ledger
  function printGeneralLedger() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Prepare report data
    const currentDate = new Date().toLocaleDateString('ar-EG')
    const orgName = orgId ? (_orgOptions.find(o=>o.id===orgId)?.name || 'غير محدد') : 'كل المنظمات'
    const projectName = projectId ? (_projectOptions.find(o=>o.id===projectId)?.name || 'غير محدد') : 'كل المشاريع'
    const accountName = accountId ? (accountOptions.find(a=>a.id===accountId)?.name_ar || accountOptions.find(a=>a.id===accountId)?.name || 'غير محدد') : 'كل الحسابات'
    const analysisItemName = analysisWorkItemId ? (() => {
      const ai = analysisItemOptions.find(a => a.id === analysisWorkItemId)
      return ai ? `${ai.code ? ai.code + ' - ' : ''}${ai.name_ar || ai.name}` : '—'
    })() : 'كل بنود التحليل'
    
    // Build professional commercial report HTML
    const reportHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>دفتر الأستاذ العام</title>
          <style>
            /* Commercial Accounting Report Styles */
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            body { 
              font-family: 'Arial', 'Tahoma', sans-serif;
              direction: rtl;
              background: white;
              color: black;
              font-size: 12px;
              line-height: 1.2;
              padding: 8mm;
              margin: 0;
            }
            
            /* Report Header - Commercial Standard */
            .print-header {
              text-align: center;
              margin-bottom: 15px;
              border: 2px solid black;
              padding: 10px;
            }
            
            .company-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 6px;
              color: black;
              text-transform: uppercase;
            }
            
            .report-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 6px;
              color: black;
              text-decoration: underline;
            }
            
            .report-period {
              font-size: 13px;
              font-weight: bold;
              margin-bottom: 8px;
              color: black;
            }
            
            .report-filters {
              font-size: 10px;
              color: black;
              border-top: 1px solid black;
              padding-top: 6px;
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
            }
            
            .filter-item {
              margin: 1px 8px;
              font-weight: normal;
            }
            
            /* Table Structure */
            .report-content {
              margin-top: 12px;
            }
            
            .gl-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid black;
              background: white;
            }
            
            .table-header {
              background: white;
              border-bottom: 2px solid black;
              font-weight: bold;
              color: black;
            }
            
            .table-header th {
              padding: 8px 6px;
              text-align: center;
              font-size: 12px;
              border-right: 1px solid black;
              font-weight: bold;
            }
            
            .table-header th:last-child {
              border-right: none;
            }
            
            .account-section {
              border-bottom: 2px solid black;
            }
            
            .account-header-row {
              background: white;
              font-weight: bold;
              font-size: 13px;
              border-bottom: 1px solid black;
            }
            
            .account-header-row td {
              padding: 6px;
              color: black;
              font-weight: bold;
              text-align: right;
              border-right: 1px solid black;
            }
            
            .account-header-row td:last-child {
              border-right: none;
            }
            
            .transaction-row {
              border-bottom: 1px solid #ccc;
              background: white;
            }
            
            .transaction-row:hover {
              background: white;
            }
            
            .transaction-row td {
              padding: 4px 6px;
              color: black;
              font-size: 10px;
              border-right: 1px solid #ccc;
            }
            
            .transaction-row td:last-child {
              border-right: none;
            }
            
            .date-cell {
              text-align: center;
              font-family: 'Courier New', monospace;
              width: 100px;
            }
            
            .description-cell {
              text-align: right;
              font-weight: normal;
            }
            
            .ref-cell {
              text-align: center;
              font-family: 'Courier New', monospace;
              width: 80px;
            }
            
            .amount-cell {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              text-align: right;
              width: 120px;
            }
            
            .balance-cell {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              text-align: right;
              width: 130px;
              background: #f8f9fa;
            }
            
            .account-subtotal {
              background: white;
              font-weight: bold;
              font-size: 12px;
              border-top: 1px solid black;
              border-bottom: 2px solid black;
            }
            
            .account-subtotal td {
              padding: 6px;
              color: black;
              font-weight: bold;
              border-right: 1px solid black;
            }
            
            .account-subtotal td:last-child {
              border-right: none;
            }
            
            /* Summary Section */
            .summary-section {
              margin-top: 12px;
              border: 2px solid black;
              background: white;
            }
            
            .summary-header {
              background: white;
              color: black;
              padding: 8px;
              text-align: center;
              font-weight: bold;
              font-size: 13px;
              border-bottom: 2px solid black;
            }
            
            .summary-row {
              display: flex;
              padding: 6px 10px;
              border-bottom: 1px solid #666;
              font-weight: bold;
              font-size: 12px;
            }
            
            .summary-row:last-child {
              border-bottom: none;
              background: white;
              border-top: 2px solid black;
            }
            
            .summary-label {
              flex: 1;
              color: black;
              font-weight: bold;
            }
            
            .summary-value {
              width: 150px;
              text-align: right;
              font-family: 'Courier New', monospace;
              color: black;
              font-weight: bold;
            }
            
            /* Print-specific */
            @media print {
              body { 
                padding: 5mm; 
                margin: 0;
              }
              .account-section { break-inside: avoid; }
              @page { 
                size: A4 landscape; 
                margin: 8mm;
              }
            }
          </style>
        </head>
        <body>
          <!-- Professional Commercial Report Header -->
          <div class="print-header">
            <div class="company-name">${companyName || 'الشركة التجارية'}</div>
            <div class="report-title">دفتر الأستاذ العام</div>
            <div class="report-period">الفترة: ${filters.dateFrom || '—'} إلى ${filters.dateTo || '—'}</div>
            <div class="report-filters">
              <span class="filter-item">الحساب: ${accountName}</span>
              <span class="filter-item">المشروع: ${projectName}</span>
              <span class="filter-item">المنظمة: ${orgName}</span>
              <span class="filter-item">بند التحليل: ${analysisItemName}</span>
              <span class="filter-item">تاريخ الطباعة: ${currentDate}</span>
              <br>
              <span class="filter-item"><strong>المرشحات النشطة:</strong></span>
              ${filters.postedOnly ? '<span class="filter-item active-filter">✓ قيود معتمدة فقط</span>' : '<span class="filter-item inactive-filter">✗ قيود معتمدة فقط</span>'}
              ${filters.includeOpening ? '<span class="filter-item active-filter">✓ يشمل الأرصدة الافتتاحية</span>' : '<span class="filter-item inactive-filter">✗ يشمل الأرصدة الافتتاحية</span>'}
              ${hideZeroAccounts ? '<span class="filter-item active-filter">✓ إخفاء الحسابات صفرية القيمة</span>' : '<span class="filter-item inactive-filter">✗ إخفاء الحسابات صفرية القيمة</span>'}
              ${activityOnly ? '<span class="filter-item active-filter">✓ حسابات ذات حركة فقط</span>' : '<span class="filter-item inactive-filter">✗ حسابات ذات حركة فقط</span>'}
              ${onlyPostable ? '<span class="filter-item active-filter">✓ حسابات قابلة للترحيل فقط</span>' : ''}
              ${onlyNonPostable ? '<span class="filter-item active-filter">✓ حسابات تجميعية فقط</span>' : ''}
              ${compareMode ? '<span class="filter-item active-filter">✓ وضع المقارنة نشط</span>' : ''}
              ${numbersOnly ? '<span class="filter-item active-filter">✓ أرقام فقط (بدون رمز العملة)</span>' : ''}
            </div>
          </div>
          
          <!-- Report Content -->
          <div class="report-content">
            ${generateGLPrintContent()}
          </div>
        </body>
      </html>
    `
    
    printWindow.document.write(reportHTML)
    printWindow.document.close()
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 500)
  }
  
  // Generate print content with proper commercial formatting that matches on-screen display
  function generateGLPrintContent(): string {
    let html = ''
    
    if (view === 'overview') {
      // Use the same filtered data as shown on screen
      const printData = filteredSummaryRows.length > 0 ? paginatedSummaryRows : []
      
      if (printData.length === 0) {
        html = '<div style="text-align: center; padding: 40px; font-size: 16px; color: black;">لا توجد بيانات للعرض بناءً على المرشحات المحددة</div>'
        return html
      }
      
      // Build table header with only visible columns (matching on-screen display)
      html += '<table class="gl-table"><thead class="table-header"><tr>'
      
      const columnWidths: Record<string, string> = {
        account_code: '100px',
        account_name: '300px', 
        opening_debit: '120px',
        opening_credit: '120px',
        period_debits: '120px',
        period_credits: '120px', 
        closing_debit: '120px',
        closing_credit: '120px',
        transaction_count: '80px'
      }
      
      overviewColumnOptions
        .filter(c => visibleOverviewColumns.includes(c.key))
        .forEach(col => {
          html += `<th style="width: ${columnWidths[col.key] || '120px'};">${col.label}</th>`
        })
      
      html += '</tr></thead><tbody>'
      
      // Print rows with only visible columns
      printData.forEach(row => {
        html += '<tr class="transaction-row">'
        
        visibleOverviewColumns.forEach(colKey => {
          let cellContent = '—'
          
          switch(colKey) {
            case 'account_code':
              cellContent = row.account_code || '—'
              break
            case 'account_name':
              cellContent = `${row.account_name_ar || row.account_name_en || ''}${(!summaryRows.some(s => s.account_id !== row.account_id && s.account_code && row.account_code && s.account_code.startsWith(row.account_code)) ? ' (قابل للترحيل)' : ' (تجميعي)')}`
              break
            case 'opening_debit':
              cellContent = (Number(row.opening_debit || 0) !== 0) ? formatPrintCurrency(Number(row.opening_debit || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'opening_credit':
              cellContent = (Number(row.opening_credit || 0) !== 0) ? formatPrintCurrency(Number(row.opening_credit || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'period_debits':
              cellContent = (Number(row.period_debits || 0) !== 0) ? formatPrintCurrency(Number(row.period_debits || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'period_credits':
              cellContent = (Number(row.period_credits || 0) !== 0) ? formatPrintCurrency(Number(row.period_credits || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'closing_debit':
              cellContent = (Number(row.closing_debit || 0) !== 0) ? formatPrintCurrency(Number(row.closing_debit || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'closing_credit':
              cellContent = (Number(row.closing_credit || 0) !== 0) ? formatPrintCurrency(Number(row.closing_credit || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'transaction_count':
              cellContent = String(row.transaction_count || 0)
              break
          }
          
          const cellClass = ['opening_debit','opening_credit','period_debits','period_credits','closing_debit','closing_credit'].includes(colKey) ? 'amount-cell' : 
                           colKey === 'account_code' ? 'ref-cell' : 
                           colKey === 'transaction_count' ? 'ref-cell' : 'description-cell'
          
          html += `<td class="${cellClass}">${cellContent}</td>`
        })
        
        html += '</tr>'
      })
      
      html += '</tbody></table>'
      
    } else {
      // Details view - use actual data with visible columns only
      if (data.length === 0) {
        html = '<div style="text-align: center; padding: 40px; font-size: 16px; color: black;">لا توجد بيانات للعرض</div>'
        return html
      }
      
      // Build table header with only visible columns
      html += '<table class="gl-table"><thead class="table-header"><tr>'
      
      const detailColumnWidths: Record<string, string> = {
        entry_number: '80px',
        entry_date: '100px',
        account_code: '100px',
        account_name_ar: '200px',
        description: '250px',
        debit: '120px',
        credit: '120px',
        running_debit: '120px',
        running_credit: '120px'
      }
      
      detailColumnOptions
        .filter(c => visibleColumns.includes(c.key))
        .forEach(col => {
          html += `<th style="width: ${detailColumnWidths[col.key] || '120px'};">${col.label}</th>`
        })
      
      html += '</tr></thead><tbody>'
      
      // Print rows with only visible columns
      data.forEach(row => {
        html += '<tr class="transaction-row">'
        
        visibleColumns.forEach(colKey => {
          let cellContent = '—'
          
          switch(colKey) {
            case 'entry_number':
              cellContent = row.entry_number || '—'
              break
            case 'entry_date':
              cellContent = row.entry_date || '—'
              break
            case 'account_code':
              cellContent = row.account_code || '—'
              break
            case 'account_name_ar':
              cellContent = row.account_name_ar || row.account_name_en || '—'
              break
            case 'description':
              cellContent = row.description || '—'
              break
            case 'debit':
              cellContent = (Number(row.debit || 0) !== 0) ? formatPrintCurrency(Number(row.debit || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'credit':
              cellContent = (Number(row.credit || 0) !== 0) ? formatPrintCurrency(Number(row.credit || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'running_debit':
              cellContent = (Number(row.running_debit || 0) !== 0) ? formatPrintCurrency(Number(row.running_debit || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
            case 'running_credit':
              cellContent = (Number(row.running_credit || 0) !== 0) ? formatPrintCurrency(Number(row.running_credit || 0), numbersOnly ? 'none' : 'EGP') : '—'
              break
          }
          
          const cellClass = ['debit','credit','running_debit','running_credit'].includes(colKey) ? 'amount-cell' : 
                           ['entry_number','account_code'].includes(colKey) ? 'ref-cell' : 
                           colKey === 'entry_date' ? 'date-cell' : 'description-cell'
          
          html += `<td class="${cellClass}">${cellContent}</td>`
        })
        
        html += '</tr>'
      })
      
      html += '</tbody></table>'
    }
    
    // Enhanced summary section with better totals calculation
    const totalDebits = view === 'overview' 
      ? filteredSummaryRows.reduce((sum, r) => sum + (Number(r.period_debits) || 0), 0)
      : data.reduce((sum, r) => sum + (Number(r.debit) || 0), 0)
    const totalCredits = view === 'overview'
      ? filteredSummaryRows.reduce((sum, r) => sum + (Number(r.period_credits) || 0), 0) 
      : data.reduce((sum, r) => sum + (Number(r.credit) || 0), 0)
    const displayedRows = view === 'overview' ? filteredSummaryRows.length : data.length
    const totalAvailableRows = view === 'overview' ? summaryRows.length : totalRows
    
    html += `
      <div class="summary-section">
        <div class="summary-header">ملخص التقرير</div>
        <div class="summary-row">
          <div class="summary-label">إجمالي المدين</div>
          <div class="summary-value">${formatPrintCurrency(totalDebits, numbersOnly ? 'none' : 'EGP')}</div>
        </div>
        <div class="summary-row">
          <div class="summary-label">إجمالي الدائن</div>
          <div class="summary-value">${formatPrintCurrency(totalCredits, numbersOnly ? 'none' : 'EGP')}</div>
        </div>
        <div class="summary-row">
          <div class="summary-label">${view === 'overview' ? 'عدد الحسابات المعروضة' : 'عدد القيود المعروضة'}</div>
          <div class="summary-value">${displayedRows.toLocaleString('ar-EG')}</div>
        </div>
        ${displayedRows !== totalAvailableRows ? `
        <div class="summary-row">
          <div class="summary-label">${view === 'overview' ? 'إجمالي الحسابات المتاحة' : 'إجمالي القيود المتاحة'}</div>
          <div class="summary-value">${totalAvailableRows.toLocaleString('ar-EG')}</div>
        </div>` : ''}
        <div class="summary-row">
          <div class="summary-label">الفرق</div>
          <div class="summary-value">${Math.abs(totalDebits - totalCredits) < 0.01 ? 'متوازن ✓' : formatPrintCurrency(Math.abs(totalDebits - totalCredits), numbersOnly ? 'none' : 'EGP')}</div>
        </div>
      </div>
    `
    
    return html
  }

  // Export current GL report content to PDF (legacy approach): capture DOM and paginate
  async function exportGLToPDF() {
    const element = document.getElementById('gl-report-content') as HTMLElement | null
    if (!element) return
    try {
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        onclone: (doc) => {
          const el = doc.getElementById('gl-report-content') as HTMLElement | null
          if (el) {
            el.style.direction = 'rtl'
            el.style.textAlign = 'right'
            el.style.fontFamily = 'Arial, sans-serif'
            el.style.fontSize = '14px'
            el.style.lineHeight = '1.5'
            el.style.color = '#000000'
            el.style.setProperty('-webkit-font-smoothing', 'antialiased')
            el.style.setProperty('-moz-osx-font-smoothing', 'grayscale')
            // Show the report header for PDF capture
            const header = el.querySelector('[class*="reportHeader"]') as HTMLElement
            if (header) {
              header.style.display = 'block'
            }
          }
        },
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      if (imgHeight <= pdfHeight - 20) {
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
      } else {
        let yPos = 0
        const pageHeight = pdfHeight - 20
        while (yPos < imgHeight) {
          pdf.addImage(imgData, 'PNG', 10, 10 - yPos, imgWidth, imgHeight)
          yPos += pageHeight
          if (yPos < imgHeight) pdf.addPage()
        }
      }

      const currentDate = new Date().toISOString().split('T')[0]
      const filenameBase = 'دفتر_الأستاذ_العام'
      pdf.save(`${filenameBase}_${currentDate}.pdf`)
    } catch (err) {
      console.error('GL PDF export failed', err)
      alert('فشل في تصدير PDF')
    }
  }

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
      const qAnalysisItemId = qp.get('analysisWorkItemId') || '';

      if (qAccountId) setAccountId(qAccountId);
      if (qOrgId) setOrgId(qOrgId);
      if (qProjectId) setProjectId(qProjectId);
      if (qAnalysisItemId) setAnalysisWorkItemId(qAnalysisItemId);

      setFilters(prev => ({
        ...prev,
        postedOnly: qPostedOnly === null ? prev.postedOnly : qPostedOnly === 'true',
        includeOpening: qIncludeOpening === null ? prev.includeOpening : qIncludeOpening !== 'false',
        dateFrom: qDateFrom !== null ? (qDateFrom || '') : prev.dateFrom,
        dateTo: qDateTo !== null ? (qDateTo || '') : prev.dateTo,
      }));
    } catch { /* noop */ }
  }, []);

  // Load dropdown lookups
  useEffect(() => {
    (async () => {
      console.log('🏢 Loading dropdown options...')
      
      const [orgs, projects, accounts] = await Promise.all([
        fetchOrganizations(),
        fetchProjects(),
        fetchAccountsMinimal(),
      ])
      
      console.log('🏢 Loaded organizations:', orgs)
      console.log('📁 Loaded projects:', projects)
      console.log('💰 Loaded accounts:', accounts.length, 'items')
      
      _setOrgOptions(orgs)
      _setProjectOptions(projects)
      setAccountOptions(accounts)
      
      // Auto-set orgId if not already set and orgs are available
      if (!orgId && orgs.length > 0) {
        console.log('🔄 Auto-setting orgId to first available org:', orgs[0].id)
        setOrgId(orgs[0].id)
      }
      
      // Load classifications
      try {
        const { data: classData } = await supabase
          .from('transaction_classifications')
          .select('id, name')
          .order('name')
        setClassificationOptions((classData || []).map(c => ({ id: c.id, name: c.name, name_ar: c.name, code: '' })))
      } catch { /* noop */ }
      
      // Load expenses categories for the first available org
      if (orgs.length > 0) {
        const firstOrgId = orgId || orgs[0].id
        try {
          console.log('💰 Loading expenses categories for org:', firstOrgId)
          const { data: expensesData } = await supabase
            .from('sub_tree_full')
            .select('id, code, description, is_active')
            .eq('org_id', firstOrgId)
            .eq('is_active', true)
            .order('code')
          
          console.log('💰 Loaded expenses categories:', expensesData)
          setExpensesCategoryOptions((expensesData || []).map(c => ({ 
            id: c.id, 
            code: c.code || '', 
            description: c.description || '', 
            name: c.description || ''
          })))
        } catch (err) {
          console.warn('⚠️ Failed to load expenses categories:', err)
        }
      }
    })()
  }, [])

  // Load analysis work item options when org/project changes
  useEffect(() => {
    (async () => {
      console.log('🔍 Analysis Work Items Loading - orgId:', orgId, 'projectId:', projectId)
      
      if (!orgId) { 
        console.log('🔍 No orgId provided, clearing analysis item options')
        setAnalysisItemOptions([]); 
        return 
      }
      
      try {
        console.log('🔍 First trying RPC function list_analysis_work_items')
        
        // Try RPC function first
        const { data: rpcItems, error: rpcError } = await supabase.rpc('list_analysis_work_items', {
          p_org_id: orgId,
          p_only_with_tx: false,
          p_project_id: projectId || null,
          p_search: null,
          p_include_inactive: false, // Only active items
        })
        
        if (!rpcError && rpcItems) {
          console.log('✅ RPC function succeeded - data:', rpcItems)
          const mappedOptions = (rpcItems || []).map((i: any) => ({ 
            id: i.id, 
            code: i.code || '', 
            name: i.name || i.name_ar || '', 
            name_ar: i.name_ar 
          }))
          setAnalysisItemOptions(mappedOptions)
          return
        }
        
        console.warn('⚠️ RPC function failed, trying direct table access. RPC Error:', rpcError)
        
        // Fallback to direct table access
        const { data: items, error } = await supabase
          .from('analysis_work_items')
          .select('id, code, name, name_ar, is_active')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('code')
        
        console.log('🔍 Direct table query result - data:', items, 'error:', error)
        
        if (error) {
          console.error('🚨 Direct table access also failed:', error)
          // If both methods fail, set an empty array but don't throw
          setAnalysisItemOptions([])
          return
        }
        
        const mappedOptions = (items || []).map(i => ({ 
          id: i.id, 
          code: i.code || '', 
          name: i.name || i.name_ar || '', 
          name_ar: i.name_ar 
        }))
        
        console.log('🔍 Setting analysis item options from direct access:', mappedOptions)
        setAnalysisItemOptions(mappedOptions)
        
      } catch (err) {
        console.error('🚨 Failed to load analysis work items:', err)
        setAnalysisItemOptions([])
      }
    })()
  }, [orgId, projectId])
  
  // Load expenses categories when org changes
  useEffect(() => {
    (async () => {
      if (!orgId) { 
        console.log('💰 No orgId provided, clearing expenses category options')
        setExpensesCategoryOptions([]); 
        return 
      }
      
      try {
        console.log('💰 Loading expenses categories for org change:', orgId)
        const { data: expensesData } = await supabase
          .from('sub_tree_full')
          .select('id, code, description, is_active')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('code')
        
        console.log('💰 Loaded expenses categories for org:', expensesData)
        setExpensesCategoryOptions((expensesData || []).map(c => ({ 
          id: c.id, 
          code: c.code || '', 
          description: c.description || '', 
          name: c.description || ''
        })))
      } catch (err) {
        console.warn('⚠️ Failed to load expenses categories:', err)
        setExpensesCategoryOptions([])
      }
    })()
  }, [orgId])

  // Load presets and auto-apply last used
  useEffect(() => {
    loadPresetsAndApplyLast((p) => {
      type GLPresetFilters = Partial<GLFilters> & {
        accountId?: string
        orgId?: string
        projectId?: string
        analysisWorkItemId?: string
        hideZeroAccounts?: boolean
        activityOnly?: boolean
      }
      type ColumnsPreset = { details?: string[]; overview?: string[] } | string[] | undefined

      const f = ((p as { filters?: GLPresetFilters }).filters) ?? {}
      setAccountId(f.accountId || '')
      setOrgId(f.orgId || '')
      setProjectId(f.projectId || '')
      setAnalysisWorkItemId(f.analysisWorkItemId || '')
      setFilters(prev => ({
        ...prev,
        dateFrom: f.dateFrom !== undefined ? f.dateFrom : prev.dateFrom,
        dateTo: f.dateTo !== undefined ? f.dateTo : prev.dateTo,
        includeOpening: typeof f.includeOpening === 'boolean' ? f.includeOpening : prev.includeOpening,
        postedOnly: typeof f.postedOnly === 'boolean' ? f.postedOnly : prev.postedOnly,
      }))
      if (typeof f.hideZeroAccounts === 'boolean') setHideZeroAccounts(f.hideZeroAccounts)
      if (typeof f.activityOnly === 'boolean') setActivityOnly(f.activityOnly)

      const cols = (p as { columns?: ColumnsPreset }).columns
      if (Array.isArray(cols)) {
        setVisibleColumns(cols)
      } else if (cols && typeof cols === 'object') {
        if (Array.isArray(cols.details)) setVisibleColumns(cols.details)
        if (Array.isArray(cols.overview)) setVisibleOverviewColumns(cols.overview)
      }
    }).catch(() => { /* noop */ })
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
          classificationId: classificationId || null,
          analysisWorkItemId: analysisWorkItemId || null,
          expensesCategoryId: expensesCategoryId || null,
        })
        setData(rows)
        if (rows && rows.length > 0 && typeof rows[0].total_rows === 'number') {
          setTotalRows(rows[0].total_rows as number)
        } else {
          setTotalRows(rows.length)
        }
      } catch (e: unknown) {
        const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : undefined
        setError(msg || 'Failed to load general ledger')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filters.dateFrom, filters.dateTo, filters.includeOpening, filters.postedOnly, accountId, orgId, projectId, pageSize, currentPage, classificationId, analysisWorkItemId, expensesCategoryId])

  // Load account summary when on overview - smart pagination approach
  // Removed unused summary state variables
  
  useEffect(() => {
    if (view !== 'overview') return
    const loadSummary = async () => {
      setLoadingSummary(true)
      try {
        // First, try to get a reasonable amount of data to see how much we actually have
        const initialLimit = Math.max(500, pageSize * 5) // Get at least 5 pages worth
        const rows = await fetchGLAccountSummary({
          dateFrom: filters.dateFrom || null,
          dateTo: filters.dateTo || null,
          orgId: orgId || null,
          projectId: projectId || null,
          postedOnly: filters.postedOnly,
          limit: initialLimit,
          offset: 0, // Always start from beginning for smart pagination
          classificationId: classificationId || null,
          analysisWorkItemId: analysisWorkItemId || null,
          expensesCategoryId: expensesCategoryId || null,
        })
        
        // If we got fewer rows than the limit, we have all the data
        if (rows.length < initialLimit) {
          setSummaryRows(rows)
        } else {
          // We might have more data, so fetch all of it
          const allRows = [...rows]
          let offset = initialLimit
          const batchSize = 1000
          
          while (true) {
            const moreRows = await fetchGLAccountSummary({
              dateFrom: filters.dateFrom || null,
              dateTo: filters.dateTo || null,
              orgId: orgId || null,
              projectId: projectId || null,
              postedOnly: filters.postedOnly,
              limit: batchSize,
              offset,
              classificationId: classificationId || null,
              analysisWorkItemId: analysisWorkItemId || null,
              expensesCategoryId: expensesCategoryId || null,
            })
            
            if (moreRows.length === 0) break
            allRows.push(...moreRows)
            
            if (moreRows.length < batchSize) break
            offset += batchSize
          }
          
          setSummaryRows(allRows)
        }
      } finally {
        setLoadingSummary(false)
      }
    }
    loadSummary()
  }, [view, filters.dateFrom, filters.dateTo, filters.postedOnly, orgId, projectId, classificationId, analysisWorkItemId, expensesCategoryId])

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
            classificationId: classificationId || null,
            analysisWorkItemId: analysisWorkItemId || null,
            expensesCategoryId: expensesCategoryId || null,
          }),
          fetchGLAccountSummary({
            dateFrom: prevRange.prevFrom,
            dateTo: prevRange.prevTo,
            orgId: orgId || null,
            projectId: projectId || null,
            postedOnly: filters.postedOnly,
            limit: 10000,
            offset: 0,
            classificationId: classificationId || null,
            analysisWorkItemId: analysisWorkItemId || null,
            expensesCategoryId: expensesCategoryId || null,
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
  }, [compareMode, filters.dateFrom, filters.dateTo, filters.postedOnly, orgId, projectId, prevRange, analysisWorkItemId, expensesCategoryId])

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
        type: (['debit','credit','running_debit','running_credit'].includes(c.key)
          ? 'currency'
          : (c.key === 'entry_date' ? 'date' : 'text')) as 'currency' | 'date' | 'text',
        currency: (['debit','credit','running_debit','running_credit'].includes(c.key) ? (numbersOnly ? 'none' : 'EGP') : undefined),
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
    }))

    // Build prepend summary rows if compareMode is enabled and totals are available
    const prependRows: (string | number)[][] = []
    const pad = (cells: (string | number)[]) => {
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

    const analysisItemLabel = analysisWorkItemId ? (() => {
      const ai = analysisItemOptions.find(a => a.id === analysisWorkItemId)
      return ai ? `${ai.code ? ai.code + ' - ' : ''}${ai.name_ar || ai.name}` : ''
    })() : ''
    return { columns, rows, metadata: { generatedAt: new Date(), filters: { ...filters, includeChildrenInDrilldown, onlyPostable, hideZeroAccounts, activityOnly, analysisWorkItemId, analysisWorkItemLabel: analysisItemLabel }, prependRows: prependRows.length ? prependRows : undefined } }
  }, [data, filters, visibleColumns, compareMode, compareTotals, analysisWorkItemId, analysisItemOptions])

  const filteredSummaryRows = useMemo(() => {
    let rows = summaryRows

    // Apply account filter in overview if selected
    if (accountId) {
      rows = rows.filter(r => r.account_id === accountId)
    }
    
    // Apply search filter first
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase()
      rows = rows.filter(r => {
        const code = (r.account_code || '').toLowerCase()
        const nameAr = (r.account_name_ar || '').toLowerCase()
        const nameEn = (r.account_name_en || '').toLowerCase()
        return code.includes(searchLower) || nameAr.includes(searchLower) || nameEn.includes(searchLower)
      })
    }
    
    if (hideZeroAccounts) {
      const isZeroRow = (r: GLAccountSummaryRow) => {
        const opening = Number(r.opening_debit || 0) + Number(r.opening_credit || 0)
        const period = Number(r.period_debits || 0) + Number(r.period_credits || 0)
        const closing = Number(r.closing_debit || 0) + Number(r.closing_credit || 0)
        const tx = Number(r.transaction_count || 0)
        return opening === 0 && period === 0 && closing === 0 && tx === 0
      }
      rows = rows.filter(r => !isZeroRow(r))
    }
    if (activityOnly) {
      rows = rows.filter(r => (Number(r.period_debits || 0) + Number(r.period_credits || 0)) > 0)
    }
    if (onlyPostable) {
      rows = rows.filter(r => !summaryRows.some(s => s.account_id !== r.account_id && s.account_code && r.account_code && s.account_code.startsWith(r.account_code)))
    }
    if (onlyNonPostable) {
      rows = rows.filter(r => summaryRows.some(s => s.account_id !== r.account_id && s.account_code && r.account_code && s.account_code.startsWith(r.account_code)))
    }

    // Apply advanced filters
    // Amount filters
    if (amountFilters.minDebit) {
      const minDebit = parseFloat(amountFilters.minDebit)
      if (!isNaN(minDebit)) {
        rows = rows.filter(r => Number(r.period_debits || 0) >= minDebit)
      }
    }
    if (amountFilters.maxDebit) {
      const maxDebit = parseFloat(amountFilters.maxDebit)
      if (!isNaN(maxDebit)) {
        rows = rows.filter(r => Number(r.period_debits || 0) <= maxDebit)
      }
    }
    if (amountFilters.minCredit) {
      const minCredit = parseFloat(amountFilters.minCredit)
      if (!isNaN(minCredit)) {
        rows = rows.filter(r => Number(r.period_credits || 0) >= minCredit)
      }
    }
    if (amountFilters.maxCredit) {
      const maxCredit = parseFloat(amountFilters.maxCredit)
      if (!isNaN(maxCredit)) {
        rows = rows.filter(r => Number(r.period_credits || 0) <= maxCredit)
      }
    }
    if (amountFilters.minBalance) {
      const minBalance = parseFloat(amountFilters.minBalance)
      if (!isNaN(minBalance)) {
        rows = rows.filter(r => {
          const balance = Number(r.closing_debit || 0) - Number(r.closing_credit || 0)
          return Math.abs(balance) >= minBalance
        })
      }
    }
    if (amountFilters.maxBalance) {
      const maxBalance = parseFloat(amountFilters.maxBalance)
      if (!isNaN(maxBalance)) {
        rows = rows.filter(r => {
          const balance = Number(r.closing_debit || 0) - Number(r.closing_credit || 0)
          return Math.abs(balance) <= maxBalance
        })
      }
    }

    // Account type filter
    if (accountTypeFilter === 'postable') {
      rows = rows.filter(r => !summaryRows.some(s => s.account_id !== r.account_id && s.account_code && r.account_code && s.account_code.startsWith(r.account_code)))
    } else if (accountTypeFilter === 'summary') {
      rows = rows.filter(r => summaryRows.some(s => s.account_id !== r.account_id && s.account_code && r.account_code && s.account_code.startsWith(r.account_code)))
    }

    // Balance type filter
    if (balanceTypeFilter === 'debit') {
      rows = rows.filter(r => Number(r.closing_debit || 0) > Number(r.closing_credit || 0))
    } else if (balanceTypeFilter === 'credit') {
      rows = rows.filter(r => Number(r.closing_credit || 0) > Number(r.closing_debit || 0))
    } else if (balanceTypeFilter === 'zero') {
      rows = rows.filter(r => Number(r.closing_debit || 0) === Number(r.closing_credit || 0))
    }

    return rows
  }, [summaryRows, hideZeroAccounts, activityOnly, onlyPostable, onlyNonPostable, debouncedSearch, amountFilters, accountTypeFilter, balanceTypeFilter])

  const exportDataOverview: UniversalTableData = useMemo(() => {
        const cols = overviewColumnOptions
          .filter(c => visibleOverviewColumns.includes(c.key))
          .map(c => ({
            key: c.key,
            header: c.label,
            type: (['opening_debit','opening_credit','period_debits','period_credits','closing_debit','closing_credit'].includes(c.key)
              ? 'currency' : 'text') as 'currency' | 'text',
            currency: (['opening_debit','opening_credit','period_debits','period_credits','closing_debit','closing_credit'].includes(c.key) ? (numbersOnly ? 'none' : 'EGP') : undefined),
            align: 'right' as const,
          }))
        const columns = createStandardColumns(cols)
    // add derived column for account type (postable vs summary) to exports
    const exportColumns = [...columns, { key: 'account_type', header: 'نوع الحساب', type: 'text' as const, align: 'right' as const }]

    const rowsBase = filteredSummaryRows.map(r => ({
      account_code: r.account_code,
      account_name: r.account_name_ar || r.account_name_en || '',
      opening_debit: Number(r.opening_debit || 0),
      opening_credit: Number(r.opening_credit || 0),
      period_debits: Number(r.period_debits || 0),
      period_credits: Number(r.period_credits || 0),
      closing_debit: Number(r.closing_debit || 0),
      closing_credit: Number(r.closing_credit || 0),
      transaction_count: r.transaction_count,
      account_type: (!summaryRows.some(s => s.account_id !== r.account_id && s.account_code && r.account_code && s.account_code.startsWith(r.account_code))) ? 'قابل للترحيل' : 'تجميعي',
    }) )

    const rows = rowsBase

    // Prepend compare summary rows when compare mode is enabled
    const prependRows: (string | number)[][] = []
    const pad = (cells: (string | number)[]) => {
      const arr = [...cells]
      while (arr.length < exportColumns.length) arr.push('')
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

    const analysisItemLabel = analysisWorkItemId ? (() => {
      const ai = analysisItemOptions.find(a => a.id === analysisWorkItemId)
      return ai ? `${ai.code ? ai.code + ' - ' : ''}${ai.name_ar || ai.name}` : ''
    })() : ''
    return { columns: exportColumns, rows, metadata: { generatedAt: new Date(), filters: { ...filters, includeChildrenInDrilldown, onlyPostable, onlyNonPostable, hideZeroAccounts, activityOnly, analysisWorkItemId, analysisWorkItemLabel: analysisItemLabel }, prependRows: prependRows.length ? prependRows : undefined } }
  }, [filteredSummaryRows, filters, visibleOverviewColumns, compareMode, compareTotals, includeChildrenInDrilldown, onlyPostable, onlyNonPostable, hideZeroAccounts, activityOnly, summaryRows, analysisWorkItemId, analysisItemOptions])

  // Smart pagination calculation based on actual filtered data for overview
  // For overview mode, use client-side pagination with filtered results
  // For details mode, continue using server-side pagination
  const actualFilteredCount = view === 'overview' ? filteredSummaryRows.length : totalRows
  const totalPages = Math.max(1, Math.ceil(actualFilteredCount / pageSize))
  
  // For overview mode, implement client-side pagination on filteredSummaryRows
  const paginatedSummaryRows = useMemo(() => {
    if (view !== 'overview') return filteredSummaryRows
    
    // Sort by account code first (professional sorting)
    const sorted = [...filteredSummaryRows].sort((a, b) => {
      const codeA = a.account_code || ''
      const codeB = b.account_code || ''
      return codeA.localeCompare(codeB, 'en', { numeric: true })
    })
    
    // Apply client-side pagination only when needed
    if (sorted.length <= pageSize) {
      // If all data fits in one page, show everything
      return sorted
    }
    
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sorted.slice(startIndex, endIndex)
  }, [filteredSummaryRows, view, currentPage, pageSize])

  // Drill-down state and cache per account
  const [drilldown, setDrilldown] = useState<Record<string, { loading: boolean, rows: GLRow[], offset: number, done: boolean, childIds?: string[], childIndex?: number }>>({})

  const loadDrilldownBatch = async (accountIdToLoad: string, append: boolean) => {
    const key = accountIdToLoad
    const state = drilldown[key] || { loading: false, rows: [], offset: 0, done: false }
    if (state.loading || state.done) return { rowCount: state.rows.length }
    const limit = 50
    setDrilldown(prev => ({ ...prev, [key]: { ...state, loading: true } }))
    try {
      // Normal fetch for this account
          const res = await fetchGeneralLedgerReport({
            accountId: accountIdToLoad,
            dateFrom: filters.dateFrom || null,
            dateTo: filters.dateTo || null,
            orgId: orgId || null,
            projectId: projectId || null,
            includeOpening: !!filters.includeOpening,
            postedOnly: filters.postedOnly,
            limit,
            offset: state.offset,
            classificationId: classificationId || null,
            analysisWorkItemId: analysisWorkItemId || null,
            expensesCategoryId: expensesCategoryId || null,
          })

      let rows = res
      const newState = { ...state }

      // If no rows and option enabled, try children accounts with activity (merge results)
      if ((!rows || rows.length === 0) && includeChildrenInDrilldown) {
        // Build child list on first time
        if (!state.childIds) {
          const parentCode = (summaryRows.find(s => s.account_id === accountIdToLoad)?.account_code) || ''
          const childIds = summaryRows
            .filter(s => s.account_id !== accountIdToLoad && s.account_code && parentCode && s.account_code.startsWith(parentCode))
            .filter(s => (Number(s.period_debits||0) + Number(s.period_credits||0)) > 0)
            .sort((a,b) => (a.account_code || '').localeCompare(b.account_code || ''))
            .map(s => s.account_id)
          newState.childIds = childIds
          newState.childIndex = 0
        }
        rows = []
        // Fetch next child batch (one child per call)
        const childIds = newState.childIds || []
        const idx = newState.childIndex ?? 0
        if (idx < childIds.length) {
          const childId = childIds[idx]
          const childRows = await fetchGeneralLedgerReport({
            accountId: childId,
            dateFrom: filters.dateFrom || null,
            dateTo: filters.dateTo || null,
            orgId: orgId || null,
            projectId: projectId || null,
            includeOpening: !!filters.includeOpening,
            postedOnly: filters.postedOnly,
            limit,
            offset: 0,
            classificationId: classificationId || null,
            analysisWorkItemId: analysisWorkItemId || null,
            expensesCategoryId: expensesCategoryId || null,
          })
          rows = childRows
          newState.childIndex = idx + 1
          // mark done when last child consumed
          if (newState.childIndex >= childIds.length) newState.done = true
        } else {
          newState.done = true
        }
      }

      const newRows = append ? [...state.rows, ...rows] : rows
      const done = (rows.length < limit && !includeChildrenInDrilldown) || (includeChildrenInDrilldown ? (newState.done === true) : false)
      setDrilldown(prev => ({ ...prev, [key]: { ...newState, loading: false, rows: newRows, offset: state.offset + (res?.length || 0), done } }))
      return { rowCount: newRows.length }
    } catch {
      setDrilldown(prev => ({ ...prev, [key]: { ...state, loading: false, done: true } }))
      return { rowCount: 0 }
    }
  }

  const toggleExpand = async (accountIdToExpand: string) => {
    setExpandedAccountId(prev => (prev === accountIdToExpand ? null : accountIdToExpand))
    const key = accountIdToExpand
    // If opening and not loaded, fetch first batch
    const state = drilldown[key]
    if (!state || (state.rows.length === 0 && !state.loading)) {
      const res = await loadDrilldownBatch(accountIdToExpand, false)
      // If parent has no direct rows and merged mode is OFF, auto-expand first child with activity
      if ((res?.rowCount ?? 0) === 0 && !includeChildrenInDrilldown) {
        const parentCode = (summaryRows.find(s => s.account_id === accountIdToExpand)?.account_code) || ''
        const firstChild = summaryRows
          .filter(s => s.account_id !== accountIdToExpand && s.account_code && parentCode && s.account_code.startsWith(parentCode))
          .filter(s => (Number(s.period_debits||0) + Number(s.period_credits||0)) > 0)
          .sort((a,b) => (a.account_code || '').localeCompare(b.account_code || ''))[0]
        if (firstChild) {
          setExpandedAccountId(firstChild.account_id)
          await loadDrilldownBatch(firstChild.account_id, false)
        }
      }
    }
  }

  // Auto-collapse expanded row on major context changes (tab or key filters)
  useEffect(() => {
    if (expandedAccountId) setExpandedAccountId(null)
  }, [view, filters.dateFrom, filters.dateTo, filters.includeOpening, filters.postedOnly, orgId, projectId, analysisWorkItemId, expensesCategoryId])

  return (
    <div className={styles.container}>
      {/* Ultra-compact header with export buttons */}
      <div className={`${styles.noPrint} ${styles.compactHeader}`}>
        <h2 className={styles.compactTitle}>دفتر الأستاذ العام</h2>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <PresetBar
            presets={presets}
            selectedPresetId={selectedPresetId}
            newPresetName={newPresetName}
            onChangePreset={async (id) => {
              await selectPresetAndApply(String(id), (p) => {
                type GLPresetFilters = Partial<GLFilters> & {
                  accountId?: string
                  orgId?: string
                  projectId?: string
                  analysisWorkItemId?: string
                }
                type ColumnsPreset = { details?: string[]; overview?: string[] } | string[] | undefined

                const f = ((p as { filters?: GLPresetFilters }).filters) ?? {}
                setAccountId(f.accountId || '')
                setOrgId(f.orgId || '')
                setProjectId(f.projectId || '')
                setAnalysisWorkItemId(f.analysisWorkItemId || '')
                setFilters(prev => ({
                  ...prev,
                  dateFrom: f.dateFrom || prev.dateFrom,
                  dateTo: f.dateTo || prev.dateTo,
                  includeOpening: typeof f.includeOpening === 'boolean' ? f.includeOpening : prev.includeOpening,
                  postedOnly: typeof f.postedOnly === 'boolean' ? f.postedOnly : prev.postedOnly,
                }))
                const cols = (p as { columns?: ColumnsPreset }).columns
                if (Array.isArray(cols)) setVisibleColumns(cols)
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
                  analysisWorkItemId,
                  hideZeroAccounts,
                  activityOnly,
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
          
          {/* Universal Export Buttons and Print Button */}
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            {/* Print Button */}
            <button
              onClick={printGeneralLedger}
              className={styles.presetButton}
              title="طباعة التقرير"
              style={{
                fontSize: '30px',
                padding: '9px 14px',
                minWidth: '54px',
                minHeight: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#6f42c1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(111, 66, 193, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#5a32a3'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(111, 66, 193, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#6f42c1'
                e.currentTarget.style.transform = 'translateY(0px)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(111, 66, 193, 0.3)'
              }}
            >
              🖨️
            </button>
            
            {/* Universal Export Buttons - Larger with hover effects */}
            {view === 'overview' ? (
              <div style={{transform: 'scale(0.7)', transformOrigin: 'center'}}>
                <ExportButtons
                  data={exportDataOverview}
                  config={{
                    title: (() => {
                      const chips: string[] = []
                      chips.push(includeChildrenInDrilldown ? 'الوضع: مدمج' : 'الوضع: توسيع أول فرعي')
                      if (filters.postedOnly) chips.push('فلتر: قيود معتمدة فقط')
                      if (hideZeroAccounts) chips.push('فلتر: إخفاء الحسابات ذات القيم 0')
                      if (activityOnly) chips.push('فلتر: حركة فقط')
                      if (onlyPostable) chips.push('فلتر: قابل للترحيل فقط')
                      if (onlyNonPostable) chips.push('فلتر: تجميعي فقط')
                      if (analysisWorkItemId) {
                        const ai = analysisItemOptions.find(a => a.id === analysisWorkItemId)
                        if (ai) chips.push(`بند التحليل: ${ai.code ? ai.code + ' - ' : ''}${ai.name_ar || ai.name}`)
                      }
                      return `ملخص دفتر الأستاذ العام — ${chips.join(' — ')}`
                    })(),
                    orientation: 'landscape',
                    useArabicNumerals: true,
                    rtlLayout: true,
                  }}
                  size="small"
                  layout="horizontal"
                />
              </div>
            ) : (
              <div style={{transform: 'scale(0.7)', transformOrigin: 'center'}}>
                <ExportButtons
                  data={exportDataDetails}
                  config={{
                    title: (() => {
                      const acc = accountOptions.find(a => a.id === accountId)
                      const base = (() => {
                        if (!acc) return 'تقرير دفتر الأستاذ العام'
                        const hasChildren = !!(acc.code && accountOptions.some(o => o.id !== acc.id && o.code && o.code.startsWith(acc.code || '')))
                        const badge = hasChildren ? 'تجميعي' : 'قابل للترحيل'
                        return `تقرير دفتر الأستاذ — ${acc.code ? acc.code + ' - ' : ''}${acc.name_ar || acc.name} (${badge})`
                      })()
                      const chips: string[] = []
                      if (filters.postedOnly) chips.push('فلتر: قيود معتمدة فقط')
                      chips.push(includeChildrenInDrilldown ? 'الوضع: مدمج' : 'الوضع: توسيع أول فرعي')
                      if (analysisWorkItemId) {
                        const ai = analysisItemOptions.find(a => a.id === analysisWorkItemId)
                        if (ai) chips.push(`بند التحليل: ${ai.code ? ai.code + ' - ' : ''}${ai.name_ar || ai.name}`)
                      }
                      return chips.length ? `${base} — ${chips.join(' — ')}` : base
                    })(),
                    orientation: 'landscape',
                    useArabicNumerals: true,
                    rtlLayout: true,
                  }}
                  size="small"
                  layout="horizontal"
                />
              </div>
            )}

            {/* Quick link to Analysis Item Usage report */}
            <button
              className={styles.presetButton}
              onClick={() => {
                const p = new URLSearchParams()
                if (orgId) p.set('orgId', orgId)
                if (projectId) p.set('projectId', projectId)
                if (filters.dateFrom) p.set('dateFrom', filters.dateFrom)
                if (filters.dateTo) p.set('dateTo', filters.dateTo)
                p.set('onlyWithTx', 'true')
                const url = `/reports/analysis-item-usage?${p.toString()}`
                try { window.open(url, '_blank', 'noopener') } catch {}
              }}
              title="فتح تقرير استخدام بنود التحليل"
              style={{ fontSize: '14px', padding: '8px 12px' }}
            >
              🔗 استخدام البنود التحليلية
            </button>
          </div>
        </div>
      </div>

      {/* Ultra-compact unified toolbar */}
      <div className={`${styles.noPrint} ${styles.compactToolbar}`}>
        {/* Compact view switch */}
        <select 
          value={view} 
          onChange={e => setView(e.target.value as ViewMode)}
          className={styles.compactSelect}
        >
          <option value="overview">ملخص</option>
          <option value="details">تفاصيل</option>
        </select>
        
        {/* Core filters in one row */}
        <input
          className={styles.input}
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
          style={{width: '130px', fontSize: '12px'}}
        />
        <input
          className={styles.input}
          type="date"
          value={filters.dateTo ?? ''}
          onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
          style={{width: '130px', fontSize: '12px'}}
        />
        
        {/* Classification filter - for both views */}
        <select className={styles.select} value={classificationId} onChange={e => setClassificationId(e.target.value)} style={{maxWidth: '180px', fontSize: '12px'}}>
          <option value=''>جميع التصنيفات</option>
          {classificationOptions.map(o => (
            <option key={o.id} value={o.id}>
              {(o.name_ar || o.name).substring(0, 30)}
            </option>
          ))}
        </select>

        {/* Analysis Work Item filter (details view supported) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select className={styles.select} value={analysisWorkItemId} onChange={e => setAnalysisWorkItemId(e.target.value)} style={{maxWidth: '220px', fontSize: '12px'}}>
            <option value=''>جميع بنود التحليل</option>
            {analysisItemOptions.map(o => (
              <option key={o.id} value={o.id}>
                {`${o.code ? o.code + ' - ' : ''}${o.name_ar || o.name}`.substring(0, 60)}
              </option>
            ))}
          </select>
          {analysisWorkItemId && (
            <button
              className={styles.presetButton}
              onClick={() => setAnalysisWorkItemId('')}
              title="مسح فلتر بند التحليل"
              style={{ fontSize: '18px', padding: '6px 10px' }}
            >
              ✖️
            </button>
          )}
        </div>
        
        {/* Expenses Category filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select className={styles.select} value={expensesCategoryId} onChange={e => setExpensesCategoryId(e.target.value)} style={{maxWidth: '220px', fontSize: '12px'}}>
            <option value=''>جميع فئات المصروفات</option>
            {expensesCategoryOptions.map(o => (
              <option key={o.id} value={o.id}>
                {`${o.code ? o.code + ' - ' : ''}${o.description || o.name}`.substring(0, 60)}
              </option>
            ))}
          </select>
          {expensesCategoryId && (
            <button
              className={styles.presetButton}
              onClick={() => setExpensesCategoryId('')}
              title="مسح فلتر فئة المصروف"
              style={{ fontSize: '18px', padding: '6px 10px' }}
            >
              ✖️
            </button>
          )}
        </div>
        
        {/* Account filter - only for details view */}
        {view === 'details' && (
          <select className={styles.select} value={accountId} onChange={e => setAccountId(e.target.value)} style={{maxWidth: '200px', fontSize: '12px'}}>
            <option value=''>جميع الحسابات</option>
            {accountOptions.map(o => (
              <option key={o.id} value={o.id}>
                {`${o.code ? `${o.code} - ` : ''}${o.name_ar || o.name}`.substring(0, 50)}
              </option>
            ))}
          </select>
        )}
        
        {/* Search for overview */}
        {view === 'overview' && (
          <>
            <input
              ref={searchInputRef}
              className={styles.input}
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{width: '120px', fontSize: '12px'}}
            />
            {/* Jump to account code: sets a large page size and filters by code */}
            <input
              className={styles.input}
              type="text"
              placeholder="اذهب إلى رمز (مثال: 51)"
              value={jumpCode}
              onChange={e => setJumpCode(e.target.value)}
              style={{width: '120px', fontSize: '12px'}}
            />
            <button
              className={styles.presetButton}
              onClick={() => { setSearchTerm(jumpCode); setPageSize(1000); setCurrentPage(1) }}
              title="اذهب إلى الرمز"
              style={{fontSize: '18px', padding: '6px 10px'}}
            >
              ↪️
            </button>
          </>
        )}
        
        {/* Smaller option toggles - 1.5x bigger */}
        <button className={styles.presetButton} onClick={() => setHideZeroAccounts(v => !v)} title="إخفاء قيم 0" style={{backgroundColor: hideZeroAccounts ? '#28a745' : 'transparent', fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          🫥
        </button>
        <button className={styles.presetButton} onClick={() => setActivityOnly(v => !v)} title="حركة فقط" style={{backgroundColor: activityOnly ? '#28a745' : 'transparent', fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          📈
        </button>
        <button className={styles.presetButton} onClick={() => setFilters(prev => ({ ...prev, postedOnly: !prev.postedOnly }))} title="قيود معتمدة فقط" style={{backgroundColor: filters.postedOnly ? '#28a745' : 'transparent', fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          ✅
        </button>
        <button className={styles.presetButton} onClick={() => setCompareMode(v => !v)} title="وضع المقارنة" style={{backgroundColor: compareMode ? '#28a745' : 'transparent', fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          🔀
        </button>
        <button className={styles.presetButton} onClick={() => setNumbersOnly(v => !v)} title="أرقام فقط (بدون عملة في التصدير)" style={{backgroundColor: numbersOnly ? '#28a745' : 'transparent', fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          #
        </button>
        
        {/* Clean: turn ALL filters off, including dates (show everything, including zero balances) */}
        <button
          className={styles.presetButton}
          onClick={() => {
            // Reset date range (no date filter)
            setFilters({ dateFrom: '', dateTo: '', includeOpening: true, postedOnly: false })

            // Reset basic selectors
            setAccountId('');
            setOrgId('');
            setProjectId('');
            setClassificationId(''); // Reset classification filter
            setExpensesCategoryId(''); // Reset expenses category filter

            // Turn OFF all additional filters (show zero balances, no special modes)
            setHideZeroAccounts(false);
            setActivityOnly(false);
            setOnlyPostable(false);
            setOnlyNonPostable(false);
            setIncludeChildrenInDrilldown(true);

            // Clear search and pagination helpers
            setCurrentPage(1);
            setSearchTerm('');
            setJumpCode('');

            // Clear advanced amount/type filters
            setAmountFilters({
              minDebit: '',
              maxDebit: '',
              minCredit: '',
              maxCredit: '',
              minBalance: '',
              maxBalance: ''
            });
            setAccountTypeFilter('all');
            setBalanceTypeFilter('all');

            // Close panels
            setShowAdvancedFilters(false);
            setShowAnalytics(false);
          }}
          title="تنظيف المرشحات (عرض كل شيء بما في ذلك الأرصدة الصفرية)"
          style={{fontSize: '28px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
        >
          🧹
        </button>
        
        {/* Show All: clear date limits (select all dates) and keep hide-zero ON */}
        <button
          className={styles.presetButton}
          onClick={() => {
            // Remove date filters (all dates)
            setFilters({ dateFrom: '', dateTo: '', includeOpening: true, postedOnly: false })

            // Reset basic filters
            setAccountId('');
            setOrgId('');
            setProjectId('');
            setClassificationId('');

            // Keep "has balance" view
            setHideZeroAccounts(true);
            setActivityOnly(false);
            setOnlyPostable(false);
            setOnlyNonPostable(false);
            setIncludeChildrenInDrilldown(true);

            // Reset search/pagination
            setCurrentPage(1);
            setSearchTerm('');
            setJumpCode('');

            // Clear advanced filters
            setAmountFilters({
              minDebit: '',
              maxDebit: '',
              minCredit: '',
              maxCredit: '',
              minBalance: '',
              maxBalance: ''
            });
            setAccountTypeFilter('all');
            setBalanceTypeFilter('all');

            // Close panels
            setShowAdvancedFilters(false);
            setShowAnalytics(false);
          }}
          title="عرض جميع البيانات (كل التواريخ وإخفاء الأرصدة الصفرية)"
          style={{
            fontSize: '16px', 
            padding: '8px 16px', 
            marginLeft: '8px',
            minWidth: '100px', 
            minHeight: '42px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#28a745',
            color: 'white',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'            
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#218838'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#28a745'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          🗂️ عرض الكل
        </button>
        

        {/* Full export buttons - smaller */}
        <button className={styles.presetButton} disabled={isExportingFull} onClick={() => handleFullExport('excel')} title="تصدير كل الصفوف (Excel)" style={{fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          📈
        </button>
        <button className={styles.presetButton} disabled={isExportingFull} onClick={() => handleFullExport('csv')} title="تصدير كل الصفوف (CSV)" style={{fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          📄
        </button>
        
        {/* Column settings - smaller */}
        <button className={styles.presetButton} onClick={() => {
          // Initialize temp states with current values
          setTempVisibleColumns([...visibleColumns])
          setTempVisibleOverviewColumns([...visibleOverviewColumns])
          setColumnMenuOpen(true)
        }} title="اختيار الأعمدة" style={{fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          ⚙️
        </button>
        
        {/* Action buttons - smaller */}
        <button className={styles.presetButton} onClick={() => setShowShortcutsHelp(true)} title="عرض اختصارات لوحة المفاتيح (F1 أو Ctrl+H)" style={{fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          ⌨️
        </button>
        <button className={styles.presetButton} onClick={() => setShowAdvancedFilters(true)} title="فتح المرشحات المتقدمة (Ctrl+F)" style={{fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          🔍
        </button>
        <button className={styles.presetButton} onClick={() => setShowAnalytics(true)} title="عرض لوحة التحليلات والإحصائيات (Ctrl+A)" style={{fontSize: '30px', padding: '9px 14px', minWidth: '54px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          📈
        </button>
      </div>

      {/* Export controls for in-report PDF (legacy approach, not universal) */}
      <div className="export-controls">
        <button onClick={exportGLToPDF} className="export-pdf-btn" title="تصدير إلى PDF">
          <span className="export-icon">📄</span>
          تصدير PDF
        </button>
      </div>
      {/* Report content container for PDF export */}
      <div id="gl-report-content" className="financial-report-content">
        {/* Report header (on-screen and printed) */}
        <div className={styles.reportHeader} style={{display: 'none'}}>
        <h2>{companyName || 'الشركة'}</h2>
        <div className={styles.statementTitle}>دفتر الأستاذ العام</div>
        <div className={styles.statementMeta}>
          <span>الفترة: {filters.dateFrom || '—'} ← {filters.dateTo || '—'}</span>
          {orgId && (<span>المنظمة: {(_orgOptions.find(o=>o.id===orgId)?.name_ar || _orgOptions.find(o=>o.id===orgId)?.name || orgId)}</span>)}
          {projectId && (<span>المشروع: {(_projectOptions.find(o=>o.id===projectId)?.name_ar || _projectOptions.find(o=>o.id===projectId)?.name || projectId)}</span>)}
          {filters.postedOnly && (<span>قيود معتمدة فقط</span>)}
        </div>
      </div>

      {/* Column Selection Modal */}
      {columnMenuOpen && (
        <div className={styles.modal} role="dialog" aria-labelledby="column-settings-title" aria-modal="true">
          <div className={styles.modalOverlay} onClick={() => setColumnMenuOpen(false)} style={{backgroundColor: 'rgba(0, 0, 0, 0.6)'}} />
          <div className={styles.modalContent} style={{maxWidth: '800px', width: '90vw', backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)'}}>
            <div className={styles.modalHeader} style={{backgroundColor: 'var(--field_bg)', borderBottom: '1px solid var(--border)'}}>
              <h3 id="column-settings-title" className={styles.modalTitle} style={{color: 'var(--text)'}}>إعدادات الأعمدة</h3>
              <button
                className={styles.modalClose}
                onClick={() => setColumnMenuOpen(false)}
                aria-label="إغلاق إعدادات الأعمدة"
                title="إغلاق (ESC)"
                style={{color: 'var(--muted_text)', backgroundColor: 'transparent', border: 'none', fontSize: '20px'}}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody} style={{backgroundColor: 'var(--surface)'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '24px'}}>
                {/* Overview Columns */}
                <div>
                  <div className={styles.columnGroupTitle} style={{color: 'var(--text)', borderBottom: '2px solid var(--accent)', paddingBottom: '8px', marginBottom: '16px'}}>
                    أعمدة ملخص الحسابات
                    <span style={{fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.7, display: 'block', marginTop: '4px', color: 'var(--muted_text)'}}>
                      اسحب العناصر لإعادة ترتيبها
                    </span>
                  </div>
                  <div className={styles.columnList} style={{maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', backgroundColor: 'var(--field_bg)'}}>
                    {tempVisibleOverviewColumns.map((colKey) => {
                      const opt = overviewColumnOptions.find(o => o.key === colKey)
                      if (!opt) return null
                      const isDragging = draggedColumn === colKey
                      return (
                        <div
                          key={`ov-${colKey}`}
                          className={`${styles.columnItem} ${styles.columnItemDraggable} ${isDragging ? styles.dragging : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, colKey, true)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => {
                            e.preventDefault()
                            try {
                              const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                              const { columnKey: sourceKey, isOverview: isSourceOverview } = data
                              if (isSourceOverview !== true) return
                              const sourceIndex = tempVisibleOverviewColumns.indexOf(sourceKey)
                              const targetIndex = tempVisibleOverviewColumns.indexOf(colKey)
                              if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return
                              const reorderedColumns = reorderColumns(tempVisibleOverviewColumns, sourceIndex, targetIndex)
                              setTempVisibleOverviewColumns(reorderedColumns)
                            } catch (e) {
                              console.warn('Failed to parse drag data:', e)
                            } finally {
                              setDraggedColumn(null)
                            }
                          }}
                          onDragEnd={handleDragEnd}
                          style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 12px', 
                            marginBottom: '6px', 
                            backgroundColor: isDragging ? 'var(--hover-bg)' : 'var(--surface)', 
                            border: `1px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}`, 
                            borderRadius: '6px', 
                            cursor: 'move',
                            transition: 'all 0.2s ease',
                            boxShadow: isDragging ? '0 4px 12px rgba(32, 118, 255, 0.3)' : 'none'
                          }}
                        >
                          <span className={styles.dragHandle} style={{color: 'var(--muted_text)', cursor: 'grab', fontSize: '14px'}}>⋮⋮</span>
                          <input
                            type='checkbox'
                            checked={tempVisibleOverviewColumns.includes(colKey)}
                            onChange={(e) => {
                              setTempVisibleOverviewColumns(prev => e.target.checked ? [...prev, colKey] : prev.filter(k => k !== colKey))
                            }}
                            style={{
                              marginRight: '8px',
                              accentColor: 'var(--accent)',
                              transform: 'scale(1.1)'
                            }}
                          />
                          <span style={{flex: 1, color: 'var(--text)', fontSize: '14px'}}>{opt.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Detail Columns */}
                <div>
                  <div className={styles.columnGroupTitle} style={{color: 'var(--text)', borderBottom: '2px solid var(--success)', paddingBottom: '8px', marginBottom: '16px'}}>
                    أعمدة تفاصيل القيود
                    <span style={{fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.7, display: 'block', marginTop: '4px', color: 'var(--muted_text)'}}>
                      اسحب العناصر لإعادة ترتيبها
                    </span>
                  </div>
                  <div className={styles.columnList} style={{maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', backgroundColor: 'var(--field_bg)'}}>
                    {tempVisibleColumns.map((colKey) => {
                      const opt = detailColumnOptions.find(o => o.key === colKey)
                      if (!opt) return null
                      const isDragging = draggedColumn === colKey
                      return (
                        <div
                          key={colKey}
                          className={`${styles.columnItem} ${styles.columnItemDraggable} ${isDragging ? styles.dragging : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, colKey, false)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => {
                            e.preventDefault()
                            try {
                              const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                              const { columnKey: sourceKey, isOverview: isSourceOverview } = data
                              if (isSourceOverview !== false) return
                              const sourceIndex = tempVisibleColumns.indexOf(sourceKey)
                              const targetIndex = tempVisibleColumns.indexOf(colKey)
                              if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return
                              const reorderedColumns = reorderColumns(tempVisibleColumns, sourceIndex, targetIndex)
                              setTempVisibleColumns(reorderedColumns)
                            } catch (e) {
                              console.warn('Failed to parse drag data:', e)
                            } finally {
                              setDraggedColumn(null)
                            }
                          }}
                          onDragEnd={handleDragEnd}
                          style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 12px', 
                            marginBottom: '6px', 
                            backgroundColor: isDragging ? 'var(--hover-bg)' : 'var(--surface)', 
                            border: `1px solid ${isDragging ? 'var(--success)' : 'var(--border)'}`, 
                            borderRadius: '6px', 
                            cursor: 'move',
                            transition: 'all 0.2s ease',
                            boxShadow: isDragging ? '0 4px 12px rgba(33, 193, 151, 0.3)' : 'none'
                          }}
                        >
                          <span className={styles.dragHandle} style={{color: 'var(--muted_text)', cursor: 'grab', fontSize: '14px'}}>⋮⋮</span>
                          <input
                            type='checkbox'
                            checked={tempVisibleColumns.includes(colKey)}
                            onChange={(e) => {
                              setTempVisibleColumns(prev => e.target.checked ? [...prev, colKey] : prev.filter(k => k !== colKey))
                            }}
                            style={{
                              marginRight: '8px',
                              accentColor: 'var(--success)',
                              transform: 'scale(1.1)'
                            }}
                          />
                          <span style={{flex: 1, color: 'var(--text)', fontSize: '14px'}}>{opt.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div style={{
                marginBottom: '24px', 
                padding: '16px', 
                backgroundColor: 'var(--field_bg)', 
                borderRadius: '8px', 
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}>
                <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text)'}}>
                  ⚡ إجراءات سريعة
                </h4>
                <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                  <button 
                    className={styles.presetButton} 
                    onClick={() => {
                      setTempVisibleOverviewColumns([...overviewColumnOptions.map(c => c.key)])
                      setTempVisibleColumns([...detailColumnOptions.map(c => c.key)])
                    }}
                    style={{
                      fontSize: '12px', 
                      padding: '6px 12px',
                      backgroundColor: 'var(--accent)',
                      color: 'var(--on-accent)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ✅ تحديد الكل
                  </button>
                  <button 
                    className={styles.presetButton} 
                    onClick={() => {
                      setTempVisibleOverviewColumns([])
                      setTempVisibleColumns([])
                    }}
                    style={{
                      fontSize: '12px', 
                      padding: '6px 12px',
                      backgroundColor: 'var(--error)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ❌ إلغاء تحديد الكل
                  </button>
                  <button 
                    className={styles.presetButton} 
                    onClick={() => {
                      setTempVisibleOverviewColumns([...overviewColumnOptions.map(c => c.key)])
                      setTempVisibleColumns([...detailColumnOptions.map(c => c.key)])
                    }}
                    style={{
                      fontSize: '12px', 
                      padding: '6px 12px',
                      backgroundColor: 'var(--warning)',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: '600'
                    }}
                  >
                    🔄 الافتراضي
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Actions */}
            <div className={styles.modalActions} style={{
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px', 
              padding: '16px 24px', 
              borderTop: '1px solid var(--border)', 
              backgroundColor: 'var(--field_bg)'
            }}>
              <button 
                className={styles.presetButton}
                onClick={() => setColumnMenuOpen(false)}
                style={{
                  fontSize: '14px', 
                  padding: '10px 20px', 
                  backgroundColor: 'var(--muted_text)', 
                  color: '#ffffff', 
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: '500'
                }}
              >
                🚫 إلغاء
              </button>
              <button 
                className={styles.presetButton}
                onClick={() => {
                  // Apply the temporary selections to actual state
                  setVisibleColumns([...tempVisibleColumns])
                  setVisibleOverviewColumns([...tempVisibleOverviewColumns])
                  setColumnMenuOpen(false)
                }}
                style={{
                  fontSize: '14px', 
                  padding: '10px 20px', 
                  backgroundColor: 'var(--success)', 
                  color: '#ffffff', 
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(33, 193, 151, 0.3)'
                }}
              >
                💾 حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'overview' && (
        <>
          {/* Compact overview info bar */}
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '6px 0', fontSize: '14px', borderBottom: '1px solid #eee'}}>
            <span><strong>عدد الحسابات:</strong> {filteredSummaryRows.length.toLocaleString('ar-EG')}</span>
            {/* Filters summary chips */}
            <span style={{display: 'inline-flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--muted_text)'}} aria-label="ملخص المرشحات">
              {filters.postedOnly && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>معتمدة فقط</span>}
              {orgId && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>منظمة: {(_orgOptions.find(o=>o.id===orgId)?.name_ar || _orgOptions.find(o=>o.id===orgId)?.name || orgId)}</span>}
              {projectId && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>مشروع: {(_projectOptions.find(o=>o.id===projectId)?.name_ar || _projectOptions.find(o=>o.id===projectId)?.name || projectId)}</span>}
              {accountId && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>حساب: {(() => { const a = accountOptions.find(o=>o.id===accountId); return a ? `${a.code ? a.code+' - ' : ''}${a.name_ar || a.name}` : accountId })()}</span>}
              {hideZeroAccounts && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>إخفاء الأصفار</span>}
              {activityOnly && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>حركة فقط</span>}
              {onlyPostable && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>قابلة للترحيل</span>}
              {onlyNonPostable && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>تجميعية</span>}
              {filters.dateFrom && filters.dateTo && <span style={{background:'var(--field_bg)', border:'1px solid var(--border)', borderRadius: '12px', padding: '2px 8px'}}>الفترة: {filters.dateFrom} → {filters.dateTo}</span>}
            </span>
            {compareMode && compareTotals && showCompareOverview && (
              <>
                <span title={compareTooltip}><strong>صافي السابق:</strong> {Number(compareTotals.prev || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
                <span title={compareTooltip}><strong>صافي الحالي:</strong> {Number(compareTotals.curr || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
                <span title={compareTooltip}><strong>الفرق:</strong> {Number(compareTotals.variance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
                <span title={compareTooltip}><strong>التغير:</strong> {compareTotals.pct == null ? '—' : `${(compareTotals.pct * 100).toFixed(1)}%`}</span>
              </>
            )}
            {/* Inline pagination info */}
            <span style={{marginLeft: 'auto', fontSize: '13px', opacity: 0.8}}>
              الصفحة {currentPage}/{totalPages} • إجمالي: {totalRows.toLocaleString('ar-EG')} • معروض: {filteredSummaryRows.length.toLocaleString('ar-EG')}
            </span>
          </div>
          <div className={`${styles.reportTableWrap} ${densityMode === 'dense' ? styles.dense : ''}`}>
            {loadingSummary ? (
              <div className={styles.footer}>جاري تحميل الملخص...</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{width: 32}}></th>
                    {overviewColumnOptions.filter(c => visibleOverviewColumns.includes(c.key)).map(c => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaryRows.map(row => {
                    const isExpanded = expandedAccountId === row.account_id
                    const colSpan = 1 + overviewColumnOptions.filter(c => visibleOverviewColumns.includes(c.key)).length
                    return (
                      <>
                        <tr
                          key={row.account_id}
                          className={isExpanded ? styles.rowExpanded : ''}
                          onClick={() => toggleExpand(row.account_id)}
                          title="انقر للعرض التفصيلي"
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          aria-controls={`drill-${row.account_id}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleExpand(row.account_id)
                            }
                          }}
                        >
                          <td className={styles.chevronCell} onClick={(e) => { e.stopPropagation(); toggleExpand(row.account_id) }}>
                            <button
                              type="button"
                              className={`${styles.chevronBtn} ${isExpanded ? styles.chevronOpen : ''}`}
                              aria-label={isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}
                              aria-expanded={isExpanded}
                              aria-controls={`drill-${row.account_id}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleExpand(row.account_id)
                                }
                              }}
                            />
                          </td>
{visibleOverviewColumns.includes('account_code') && (<td>{row.account_code}</td>)}
                          {visibleOverviewColumns.includes('account_name') && (
                            <td>
                              {row.account_name_ar || row.account_name_en || ''}
                              {(() => {
                                const hasChildren = summaryRows.some(s => s.account_id !== row.account_id && s.account_code && row.account_code && s.account_code.startsWith(row.account_code))
                                const isPostable = !hasChildren
                                return (
                                  <span className={isPostable ? styles.badgePostable : styles.badgeNonPostable} title={isPostable ? 'حساب قابل للترحيل (ورقي)' : 'حساب تجميعي (غير قابل للترحيل)'}>
                                    {isPostable ? 'قابل للترحيل' : 'تجميعي'}
                                  </span>
                                )
                              })()}
                            </td>
                          )}
                          {visibleOverviewColumns.includes('opening_debit') && (<td>{Number(row.opening_debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                          {visibleOverviewColumns.includes('opening_credit') && (<td>{Number(row.opening_credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                          {visibleOverviewColumns.includes('period_debits') && (<td>{Number(row.period_debits || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                          {visibleOverviewColumns.includes('period_credits') && (<td>{Number(row.period_credits || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                          {visibleOverviewColumns.includes('closing_debit') && (<td>{Number(row.closing_debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                          {visibleOverviewColumns.includes('closing_credit') && (<td>{Number(row.closing_credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>)}
                          {visibleOverviewColumns.includes('transaction_count') && (<td>{row.transaction_count}</td>)}
                        </tr>
                        {isExpanded && (
                          <tr className={styles.drilldownRow}>
                            <td colSpan={colSpan}>
                              <div className={styles.drilldown}>
                                <div className={styles.drilldownHeader}>
                                  <div>
                                    تفاصيل الحساب: {row.account_code} — {row.account_name_ar || row.account_name_en || ''}
                                    <div className={styles.subtleRow}>
                                      <span className={styles.modeChip}>{includeChildrenInDrilldown ? 'الوضع: مدمج' : 'الوضع: توسيع أول فرعي'}</span>
                                      <span className={styles.mutedText}>
                                        المعروض: {drilldown[row.account_id]?.rows.length.toLocaleString('ar-EG')} {drilldown[row.account_id]?.done ? '(الكل معروض)' : '(يمكن تحميل المزيد)'}
                                      </span>
                                    </div>
                                  </div>
                                    <div className={styles.drilldownActions}>
                                      <button
                                        className={styles.presetButton}
                                        onClick={(e) => { e.stopPropagation(); setIncludeChildrenInDrilldown(v => !v); }}
                                        title="تبديل الوضع بين مدمج وتوسيع أول فرعي"
                                      >تبديل الوضع</button>
                                      <button
                                        className={styles.presetButton}
                                        onClick={(e) => { e.stopPropagation(); setAccountId(row.account_id); setView('details'); setCurrentPage(1); }}
                                      >فتح التفاصيل الكاملة</button>
                                      <button
                                        className={styles.presetButton}
                                        onClick={(e) => { e.stopPropagation(); toggleExpand(row.account_id) }}
                                      >إغلاق</button>
                                    </div>
                                </div>
                                {drilldown[row.account_id]?.loading ? (
                                  <div className={styles.skeletonWrap} aria-live="polite" aria-busy="true">
                                    <div className={styles.skeletonRow}>
                                      <span className={styles.skeletonBar} style={{width: '15%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '60%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '10%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '10%'}}></span>
                                    </div>
                                    <div className={styles.skeletonRow}>
                                      <span className={styles.skeletonBar} style={{width: '15%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '40%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '10%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '10%'}}></span>
                                    </div>
                                    <div className={styles.skeletonRow}>
                                      <span className={styles.skeletonBar} style={{width: '15%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '50%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '10%'}}></span>
                                      <span className={styles.skeletonBar} style={{width: '10%'}}></span>
                                    </div>
                                  </div>
                                ) : (drilldown[row.account_id]?.rows?.length ? (
                                  <>
                                  <table id={`drill-${row.account_id}`} className={styles.subTable}>
                                    <thead>
                                      <tr>
                                        <th>التاريخ</th>
                                        <th>الوصف</th>
                                        <th>مدين</th>
                                        <th>دائن</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {drilldown[row.account_id]?.rows.map(r => (
                                        <tr key={`${r.transaction_id}-${r.entry_date}`}>
                                          <td>{r.entry_date}</td>
                                          <td>{r.description || ''}</td>
                                          <td>{Number(r.debit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                                          <td>{Number(r.credit || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div className={styles.drilldownActions}>
                                    {!drilldown[row.account_id]?.done && !drilldown[row.account_id]?.loading && (
                                      <button className={styles.presetButton} onClick={(e) => { e.stopPropagation(); loadDrilldownBatch(row.account_id, true) }}>تحميل المزيد</button>
                                    )}
                                  </div>
                                  </>
                                ) : (
                                  <>
                                    <div className={styles.footer}>لا توجد قيود مباشرة على هذا الحساب في الفترة المحددة.</div>
                                    {/* Suggest child accounts with activity */}
                                    {(() => {
                                      const parentCode = row.account_code || ''
                                      const children = summaryRows.filter(r => r.account_code && r.account_code.startsWith(parentCode) && r.account_id !== row.account_id && (Number(r.period_debits||0) + Number(r.period_credits||0)) > 0)
                                      if (!children.length) return null
                                      return (
                                        <div className={styles.childListWrap}>
                                          <div className={styles.childListTitle}>حسابات فرعية ذات حركة:</div>
                                          <ul className={styles.childList}>
                                            {children.slice(0, 10).map(ch => (
                                              <li key={ch.account_id} className={styles.childItem}>
                                                <span>{ch.account_code} — {ch.account_name_ar || ch.account_name_en || ''}</span>
                                                <button className={styles.presetButton} onClick={(e) => { e.stopPropagation(); toggleExpand(ch.account_id); }}>عرض القيود</button>
                                              </li>
                                            ))}
                                          </ul>
                                          {children.length > 10 && <div className={styles.label}>و{children.length - 10} أخرى… قم بتضييق الفترة أو افتح التفاصيل الكاملة.</div>}
                                        </div>
                                      )
                                    })()}
                                  </>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {view === 'details' && accountId && (
        <div className={styles.detailsHeader}>
          {(() => {
            const acc = accountOptions.find(a => a.id === accountId)
            if (!acc) return null
            const hasChildren = !!(acc.code && accountOptions.some(o => o.id !== acc.id && o.code && o.code.startsWith(acc.code || '')))
            const isPostable = !hasChildren
            return (
              <>
                <div className={styles.detailsHeaderTitle}>
                  {acc.code ? `${acc.code} - ` : ''}{acc.name_ar || acc.name}
                  <span className={isPostable ? styles.badgePostable : styles.badgeNonPostable} title={isPostable ? 'حساب قابل للترحيل (لا يحتوي حسابات فرعية)' : 'حساب تجميعي (يحتوي حسابات فرعية)'} style={{marginInlineStart: 10}}>
                    {isPostable ? 'قابل للترحيل' : 'تجميعي'}
                  </span>
                </div>
                {(acc.category || acc.normal_balance) && (
                  <div className={styles.detailsHeaderMeta}>
                    {acc.category || ''}{acc.category && acc.normal_balance ? ' / ' : ''}{acc.normal_balance || ''}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {view === 'details' && (
        <>
          {/* Compact details info bar */}
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '6px 0', fontSize: '13px', borderBottom: '1px solid #eee', flexWrap: 'wrap'}}>
            <span><strong>عدد السجلات:</strong> {totalRows.toLocaleString('ar-EG')}</span>
            <span><strong>افتتاحي مدين:</strong> {summary.openingDebit.toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
            <span><strong>افتتاحي دائن:</strong> {summary.openingCredit.toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
            <span><strong>فترة مدين:</strong> {summary.periodDebit.toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
            <span><strong>فترة دائن:</strong> {summary.periodCredit.toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
            <span><strong>ختامي مدين:</strong> {summary.closingDebit.toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
            <span><strong>ختامي دائن:</strong> {summary.closingCredit.toLocaleString('ar-EG', { minimumFractionDigits: 0 })}</span>
            {/* Inline pagination info */}
            <span style={{marginLeft: 'auto', fontSize: '12px', opacity: 0.8}}>
              صفحة {currentPage}/{totalPages}
            </span>
          </div>
        </>
      )}

      {view === 'details' && compareMode && compareTotals && (
        <div className={`${styles.reportTableWrap} ${densityMode === 'dense' ? styles.dense : ''}`}>
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
      <div className={`${styles.reportTableWrap} ${densityMode === 'dense' ? styles.dense : ''}`}>
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

      {/* Compact inline pagination controls - only show when needed */}
      {(view === 'overview' && filteredSummaryRows.length === 0) || (view === 'details' && data.length === 0) ? (
        <div style={{textAlign: 'center', padding: '20px', fontSize: '14px', color: '#666'}}>
          {loading ? 'جاري التحميل...' : 'لا توجد بيانات للعرض'}
        </div>
      ) : totalPages > 1 ? (
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '8px 0', borderTop: '1px solid #eee'}}>
          <button className={styles.presetButton} onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{fontSize: '12px'}}>⏮️</button>
          <button className={styles.presetButton} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{fontSize: '12px'}}>◀️</button>
          <span style={{fontSize: '12px', minWidth: '80px', textAlign: 'center'}}>{currentPage}/{totalPages}</span>
          <button className={styles.presetButton} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{fontSize: '12px'}}>▶️</button>
          <button className={styles.presetButton} onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{fontSize: '12px'}}>⏭️</button>
          <select className={styles.presetButton} value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setCurrentPage(1) }} style={{fontSize: '12px', minWidth: '50px'}}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      ) : null}
        </div>
        {/* Keyboard shortcuts help modal */}
        {showShortcutsHelp && (
          <div className={styles.modal} role="dialog" aria-labelledby="shortcuts-title" aria-modal="true">
            <div className={styles.modalOverlay} onClick={() => setShowShortcutsHelp(false)} />
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3 id="shortcuts-title" className={styles.modalTitle}>اختصارات لوحة المفاتيح</h3>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowShortcutsHelp(false)}
                  aria-label="إغلاق المساعدة"
                  title="إغلاق (ESC)"
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.shortcutsGrid}>
                  <div className={styles.shortcutsSection}>
                    <h4>التنقل والعرض</h4>
                    <div className={styles.shortcut}>
                      <kbd>Ctrl + E</kbd>
                      <span>تبديل بين ملخص الحسابات وتفاصيل القيود</span>
                    </div>
                    <div className={styles.shortcut}>
                      <kbd>Ctrl + K</kbd>
                      <span>التركيز على البحث (في وضع الملخص)</span>
                    </div>
                    <div className={styles.shortcut}>
                      <kbd>Ctrl + D</kbd>
                      <span>تبديل كثافة العرض (عادي/مضغوط)</span>
                    </div>
                    <div className={styles.shortcut}>
                      <kbd>Ctrl + M</kbd>
                      <span>تفعيل/إلغاء وضع المقارنة</span>
                    </div>
                  </div>
                  <div className={styles.shortcutsSection}>
                    <h4>الإجراءات</h4>
                    <div className={styles.shortcut}>
                      <kbd>Ctrl + R</kbd>
                      <span>إعادة تعيين جميع المرشحات</span>
                    </div>
                    <div className={styles.shortcut}>
                      <kbd>Ctrl + 1</kbd>
                      <span>تصدير Excel (كامل)</span>
                    </div>
                    <div className={styles.shortcut}>
                      <kbd>Ctrl + 2</kbd>
                      <span>تصدير CSV (كامل)</span>
                    </div>
                  </div>
                  <div className={styles.shortcutsSection}>
                    <h4>المساعدة والإغلاق</h4>
                    <div className={styles.shortcut}>
                      <kbd>F1</kbd> أو <kbd>Ctrl + H</kbd>
                      <span>عرض/إخفاء هذه المساعدة</span>
                    </div>
                    <div className={styles.shortcut}>
                      <kbd>ESC</kbd>
                      <span>إغلاق القوائم والنوافذ المنبثقة</span>
                    </div>
                  </div>
                </div>
                <div className={styles.accessibilityNotes}>
                  <h4>ملاحظات الوصولية</h4>
                  <ul>
                    <li>استخدم <kbd>Tab</kbd> للتنقل بين العناصر التفاعلية</li>
                    <li>اضغط <kbd>Enter</kbd> أو <kbd>Space</kbd> لتفعيل الأزرار والروابط</li>
                    <li>في جدول الملخص، اضغط <kbd>Enter</kbd> على الصفوف لعرض التفاصيل</li>
                    <li>جميع الاختصارات تعمل فقط عندما لا تكون تكتب في حقل نص</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Filters Modal */}
        {showAdvancedFilters && (
          <div className={styles.modal} role="dialog" aria-labelledby="advanced-filters-title" aria-modal="true">
            <div className={styles.modalOverlay} onClick={() => setShowAdvancedFilters(false)} />
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3 id="advanced-filters-title" className={styles.modalTitle}>المرشحات المتقدمة</h3>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowAdvancedFilters(false)}
                  aria-label="إغلاق المرشحات المتقدمة"
                  title="إغلاق (ESC)"
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                {/* Filter Sets Management */}
                <div className={styles.filterSection}>
                  <h4 className={styles.filterSectionTitle}>إدارة مجموعات المرشحات</h4>
                  <div className={styles.filterGroup}>
                    <label className={styles.label}>مجموعة المرشحات المحفوظة</label>
                    <select 
                      className={styles.select} 
                      value={currentFilterSet} 
                      onChange={(e) => {
                        setCurrentFilterSet(e.target.value)
                        // Apply saved filter set logic here
                        const set = savedFilterSets.find(s => s.id === e.target.value)
                        if (set) {
                          setAmountFilters(set.amountFilters || {})
                          setAccountTypeFilter(set.accountTypeFilter || 'all')
                          setBalanceTypeFilter(set.balanceTypeFilter || 'all')
                        }
                      }}
                    >
                      <option value="">-- اختر مجموعة محفوظة --</option>
                      {savedFilterSets.map(set => (
                        <option key={set.id} value={set.id}>{set.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label className={styles.label}>اسم مجموعة المرشحات الجديدة</label>
                    <div className={styles.filterInputGroup}>
                      <input 
                        className={styles.input}
                        type="text" 
                        value={newFilterSetName} 
                        onChange={(e) => setNewFilterSetName(e.target.value)}
                        placeholder="اسم المجموعة الجديدة"
                      />
                      <button 
                        className={styles.presetButton}
                        onClick={() => {
                          if (!newFilterSetName.trim()) return
                          const newSet = {
                            id: Date.now().toString(),
                            name: newFilterSetName.trim(),
                            amountFilters,
                            accountTypeFilter,
                            balanceTypeFilter,
                            dateFrom: filters.dateFrom || '',
                            dateTo: filters.dateTo || ''
                          } as SavedFilterSet
                          setSavedFilterSets((prev: SavedFilterSet[]) => [...prev, newSet])
                          setCurrentFilterSet(newSet.id)
                          setNewFilterSetName('')
                        }}
                        disabled={!newFilterSetName.trim()}
                      >
                        حفظ
                      </button>
                      {currentFilterSet && (
                        <button 
                          className={styles.presetButton}
                          onClick={() => {
                            setSavedFilterSets(prev => prev.filter(s => s.id !== currentFilterSet))
                            setCurrentFilterSet('')
                          }}
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date Range Presets */}
                <div className={styles.filterSection}>
                  <h4 className={styles.filterSectionTitle}>الفترات المحددة مسبقاً</h4>
                  <div className={styles.datePresetsGrid}>
                    <button 
                      className={styles.presetButton}
                      onClick={() => {
                        const today = todayISO()
                        setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }))
                      }}
                    >
                      اليوم
                    </button>
                    <button 
                      className={styles.presetButton}
                      onClick={() => {
                        const today = new Date()
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
                        setFilters(prev => ({ 
                          ...prev, 
                          dateFrom: firstDay.toISOString().slice(0, 10),
                          dateTo: lastDay.toISOString().slice(0, 10)
                        }))
                      }}
                    >
                      هذا الشهر
                    </button>
                    <button 
                      className={styles.presetButton}
                      onClick={() => {
                        const today = new Date()
                        const firstDay = new Date(today.getFullYear(), 0, 1)
                        const lastDay = new Date(today.getFullYear(), 11, 31)
                        setFilters(prev => ({ 
                          ...prev, 
                          dateFrom: firstDay.toISOString().slice(0, 10),
                          dateTo: lastDay.toISOString().slice(0, 10)
                        }))
                      }}
                    >
                      هذا العام
                    </button>
                    <button 
                      className={styles.presetButton}
                      onClick={() => {
                        const today = new Date()
                        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
                        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
                        setFilters(prev => ({ 
                          ...prev, 
                          dateFrom: lastMonth.toISOString().slice(0, 10),
                          dateTo: lastDayOfLastMonth.toISOString().slice(0, 10)
                        }))
                      }}
                    >
                      الشهر الماضي
                    </button>
                    <button 
                      className={styles.presetButton}
                      onClick={() => {
                        const today = new Date()
                        const firstDay = new Date(today.getFullYear() - 1, 0, 1)
                        const lastDay = new Date(today.getFullYear() - 1, 11, 31)
                        setFilters(prev => ({ 
                          ...prev, 
                          dateFrom: firstDay.toISOString().slice(0, 10),
                          dateTo: lastDay.toISOString().slice(0, 10)
                        }))
                      }}
                    >
                      العام الماضي
                    </button>
                    <button 
                      className={styles.presetButton}
                      onClick={() => {
                        const today = new Date()
                        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
                        const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0)
                        setFilters(prev => ({ 
                          ...prev, 
                          dateFrom: quarterStart.toISOString().slice(0, 10),
                          dateTo: quarterEnd.toISOString().slice(0, 10)
                        }))
                      }}
                    >
                      الربع الحالي
                    </button>
                  </div>
                </div>

                {/* Amount Filters */}
                <div className={styles.filterSection}>
                  <h4 className={styles.filterSectionTitle}>تصفية المبالغ</h4>
                  <div className={styles.amountFiltersGrid}>
                    <div className={styles.filterGroup}>
                      <label className={styles.label}>أقل مبلغ مدين</label>
                      <input 
                        className={styles.input}
                        type="number" 
                        step="0.01"
                        value={amountFilters.minDebit} 
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, minDebit: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className={styles.filterGroup}>
                      <label className={styles.label}>أكبر مبلغ مدين</label>
                      <input 
                        className={styles.input}
                        type="number" 
                        step="0.01"
                        value={amountFilters.maxDebit} 
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, maxDebit: e.target.value }))}
                        placeholder="غير محدد"
                      />
                    </div>
                    <div className={styles.filterGroup}>
                      <label className={styles.label}>أقل مبلغ دائن</label>
                      <input 
                        className={styles.input}
                        type="number" 
                        step="0.01"
                        value={amountFilters.minCredit} 
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, minCredit: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className={styles.filterGroup}>
                      <label className={styles.label}>أكبر مبلغ دائن</label>
                      <input 
                        className={styles.input}
                        type="number" 
                        step="0.01"
                        value={amountFilters.maxCredit} 
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, maxCredit: e.target.value }))}
                        placeholder="غير محدد"
                      />
                    </div>
                    <div className={styles.filterGroup}>
                      <label className={styles.label}>أقل رصيد</label>
                      <input 
                        className={styles.input}
                        type="number" 
                        step="0.01"
                        value={amountFilters.minBalance} 
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, minBalance: e.target.value }))}
                        placeholder="غير محدد"
                      />
                    </div>
                    <div className={styles.filterGroup}>
                      <label className={styles.label}>أكبر رصيد</label>
                      <input 
                        className={styles.input}
                        type="number" 
                        step="0.01"
                        value={amountFilters.maxBalance} 
                        onChange={(e) => setAmountFilters(prev => ({ ...prev, maxBalance: e.target.value }))}
                        placeholder="غير محدد"
                      />
                    </div>
                  </div>
                  <div className={styles.filterHint}>
                    💡 اتركوا الحقول فارغة لعدم تطبيق القيود على المبالغ
                  </div>
                </div>

                {/* Scope: Org / Project / Account */}
                <div className={styles.filterSection}>
                  <h4 className={styles.filterSectionTitle}>نطاق البيانات</h4>
                  <div className={styles.filterGroup}>
                    <label className={styles.label}>المنظمة</label>
                    <select
                      className={styles.select}
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                    >
                      <option value="">كل المنظمات</option>
                      {_orgOptions.map(o => (
                        <option key={o.id} value={o.id}>{o.name_ar || o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label className={styles.label}>المشروع</label>
                    <select
                      className={styles.select}
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    >
                      <option value="">كل المشاريع</option>
                      {_projectOptions.map(o => (
                        <option key={o.id} value={o.id}>{o.name_ar || o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label className={styles.label}>الحساب</label>
                    <select
                      className={styles.select}
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      <option value="">جميع الحسابات</option>
                      {accountOptions.map(o => (
                        <option key={o.id} value={o.id}>{`${o.code ? o.code + ' - ' : ''}${o.name_ar || o.name}`}</option>
                      ))}
                    </select>
                  </div>
                  {/* Reset scope only */}
                  <div className={styles.filterGroup}>
                    <button
                      className={styles.presetButton}
                      onClick={() => { setOrgId(''); setProjectId(''); setAccountId('') }}
                    >
                      إعادة تعيين النطاق
                    </button>
                  </div>
                </div>

                {/* Account Type and Balance Filters */}
                <div className={styles.filterSection}>
                  <h4 className={styles.filterSectionTitle}>تصفية الحسابات</h4>
                  <div className={styles.filterGroup}>
                    <label className={styles.label}>نوع الحساب</label>
                    <select 
                      className={styles.select} 
                      value={accountTypeFilter} 
                      onChange={(e) => setAccountTypeFilter(e.target.value as 'all' | 'postable' | 'summary')}
                    >
                      <option value="all">جميع الحسابات</option>
                      <option value="postable">قابلة للترحيل فقط</option>
                      <option value="summary">تجميعية فقط</option>
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label className={styles.label}>نوع الرصيد</label>
                    <select 
                      className={styles.select} 
                      value={balanceTypeFilter} 
                      onChange={(e) => setBalanceTypeFilter(e.target.value as 'all' | 'debit' | 'credit' | 'zero')}
                    >
                      <option value="all">جميع الأرصدة</option>
                      <option value="debit">أرصدة مدينة فقط</option>
                      <option value="credit">أرصدة دائنة فقط</option>
                      <option value="zero">أرصدة صفر فقط</option>
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.modalActions}>
                  <button 
                    className={styles.presetButton}
                    onClick={() => {
                      // Apply filters
                      setShowAdvancedFilters(false)
                      setCurrentPage(1) // Reset to first page when applying filters
                    }}
                  >
                    تطبيق المرشحات
                  </button>
                  <button 
                    className={styles.presetButton}
                    onClick={() => {
                      // Reset all advanced filters
                      setAmountFilters({
                        minDebit: '',
                        maxDebit: '',
                        minCredit: '',
                        maxCredit: '',
                        minBalance: '',
                        maxBalance: ''
                      })
                      setAccountTypeFilter('all')
                      setBalanceTypeFilter('all')
                      setCurrentFilterSet('')
                    }}
                  >
                    إعادة تعيين المرشحات
                  </button>
                  <button 
                    className={styles.presetButton}
                    onClick={() => setShowAdvancedFilters(false)}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className={styles.modal} role="dialog" aria-labelledby="analytics-title" aria-modal="true">
            <div className={styles.modalOverlay} onClick={() => setShowAnalytics(false)} />
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3 id="analytics-title" className={styles.modalTitle}>تحليلات دفتر الأستاذ العام</h3>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowAnalytics(false)}
                  aria-label="إغلاق التحليلات"
                  title="إغلاق (ESC)"
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                {/* Key Performance Indicators */}
                <div className={styles.analyticsSection}>
                  <h4 className={styles.analyticsSectionTitle}>المؤشرات الرئيسية</h4>
                  <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>إجمالي المبالغ المدينة</div>
                      <div className={styles.kpiValue}>
                        {(view === 'overview' 
                          ? filteredSummaryRows.reduce((sum, row) => sum + Number(row.period_debits || 0), 0)
                          : data.reduce((sum, row) => sum + Number(row.debit || 0), 0)
                        ).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>إجمالي المبالغ الدائنة</div>
                      <div className={styles.kpiValue}>
                        {(view === 'overview' 
                          ? filteredSummaryRows.reduce((sum, row) => sum + Number(row.period_credits || 0), 0)
                          : data.reduce((sum, row) => sum + Number(row.credit || 0), 0)
                        ).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>صافي الحركة</div>
                      <div className={styles.kpiValue}>
                        {(() => {
                          const debits = view === 'overview' 
                            ? filteredSummaryRows.reduce((sum, row) => sum + Number(row.period_debits || 0), 0)
                            : data.reduce((sum, row) => sum + Number(row.debit || 0), 0)
                          const credits = view === 'overview' 
                            ? filteredSummaryRows.reduce((sum, row) => sum + Number(row.period_credits || 0), 0)
                            : data.reduce((sum, row) => sum + Number(row.credit || 0), 0)
                          return (debits - credits).toLocaleString('ar-EG', { minimumFractionDigits: 2 })
                        })()
                        }
                      </div>
                    </div>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiLabel}>عدد القيود النشطة</div>
                      <div className={styles.kpiValue}>
                        {view === 'overview' 
                          ? filteredSummaryRows.reduce((sum, row) => sum + Number(row.transaction_count || 0), 0).toLocaleString('ar-EG')
                          : data.length.toLocaleString('ar-EG')
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Distribution Analysis */}
                {view === 'overview' && (
                  <div className={styles.analyticsSection}>
                    <h4 className={styles.analyticsSectionTitle}>تحليل توزيع الحسابات</h4>
                    <div className={styles.distributionGrid}>
                      <div className={styles.distributionCard}>
                        <div className={styles.distributionLabel}>الحسابات القابلة للترحيل</div>
                        <div className={styles.distributionValue}>
                          {filteredSummaryRows.filter(row => {
                            const hasChildren = summaryRows.some(s => s.account_id !== row.account_id && s.account_code && row.account_code && s.account_code.startsWith(row.account_code))
                            return !hasChildren
                          }).length.toLocaleString('ar-EG')}
                        </div>
                        <div className={styles.distributionPercent}>
                          {filteredSummaryRows.length > 0 
                            ? Math.round((filteredSummaryRows.filter(row => {
                                const hasChildren = summaryRows.some(s => s.account_id !== row.account_id && s.account_code && row.account_code && s.account_code.startsWith(row.account_code))
                                return !hasChildren
                              }).length / filteredSummaryRows.length) * 100)
                            : 0
                          }%
                        </div>
                      </div>
                      <div className={styles.distributionCard}>
                        <div className={styles.distributionLabel}>الحسابات التجميعية</div>
                        <div className={styles.distributionValue}>
                          {filteredSummaryRows.filter(row => {
                            const hasChildren = summaryRows.some(s => s.account_id !== row.account_id && s.account_code && row.account_code && s.account_code.startsWith(row.account_code))
                            return hasChildren
                          }).length.toLocaleString('ar-EG')}
                        </div>
                        <div className={styles.distributionPercent}>
                          {filteredSummaryRows.length > 0 
                            ? Math.round((filteredSummaryRows.filter(row => {
                                const hasChildren = summaryRows.some(s => s.account_id !== row.account_id && s.account_code && row.account_code && s.account_code.startsWith(row.account_code))
                                return hasChildren
                              }).length / filteredSummaryRows.length) * 100)
                            : 0
                          }%
                        </div>
                      </div>
                      <div className={styles.distributionCard}>
                        <div className={styles.distributionLabel}>حسابات ذات حركة</div>
                        <div className={styles.distributionValue}>
                          {filteredSummaryRows.filter(row => 
                            (Number(row.period_debits || 0) + Number(row.period_credits || 0)) > 0
                          ).length.toLocaleString('ar-EG')}
                        </div>
                        <div className={styles.distributionPercent}>
                          {filteredSummaryRows.length > 0 
                            ? Math.round((filteredSummaryRows.filter(row => 
                                (Number(row.period_debits || 0) + Number(row.period_credits || 0)) > 0
                              ).length / filteredSummaryRows.length) * 100)
                            : 0
                          }%
                        </div>
                      </div>
                      <div className={styles.distributionCard}>
                        <div className={styles.distributionLabel}>حسابات بدون حركة</div>
                        <div className={styles.distributionValue}>
                          {filteredSummaryRows.filter(row => 
                            (Number(row.period_debits || 0) + Number(row.period_credits || 0)) === 0
                          ).length.toLocaleString('ar-EG')}
                        </div>
                        <div className={styles.distributionPercent}>
                          {filteredSummaryRows.length > 0 
                            ? Math.round((filteredSummaryRows.filter(row => 
                                (Number(row.period_debits || 0) + Number(row.period_credits || 0)) === 0
                              ).length / filteredSummaryRows.length) * 100)
                            : 0
                          }%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Accounts Analysis */}
                {view === 'overview' && filteredSummaryRows.length > 0 && (
                  <div className={styles.analyticsSection}>
                    <h4 className={styles.analyticsSectionTitle}>أهم الحسابات حسب الحركة</h4>
                    <div className={styles.topAccountsList}>
                      {[...filteredSummaryRows]
                        .sort((a, b) => 
                          (Number(b.period_debits || 0) + Number(b.period_credits || 0)) - 
                          (Number(a.period_debits || 0) + Number(a.period_credits || 0))
                        )
                        .slice(0, 10)
                        .map((row, index) => {
                          const totalActivity = Number(row.period_debits || 0) + Number(row.period_credits || 0)
                          return (
                            <div key={row.account_id} className={styles.topAccountItem}>
                              <div className={styles.topAccountRank}>#{index + 1}</div>
                              <div className={styles.topAccountDetails}>
                                <div className={styles.topAccountName}>
                                  {row.account_code} - {row.account_name_ar || row.account_name_en || ''}
                                </div>
                                <div className={styles.topAccountAmount}>
                                  إجمالي الحركة: {totalActivity.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>
                )}

                {/* Period Comparison Analytics */}
                {compareMode && compareTotals && (
                  <div className={styles.analyticsSection}>
                    <h4 className={styles.analyticsSectionTitle}>تحليل المقارنة مع الفترة السابقة</h4>
                    <div className={styles.comparisonAnalytics}>
                      <div className={styles.comparisonCard}>
                        <div className={styles.comparisonLabel}>اتجاه التغيير</div>
                        <div className={styles.comparisonValue}>
                          {compareTotals.variance > 0 ? '📈 زيادة' : compareTotals.variance < 0 ? '📉 نقصان' : '➡️ ثابت'}
                        </div>
                      </div>
                      <div className={styles.comparisonCard}>
                        <div className={styles.comparisonLabel}>قوة التغيير</div>
                        <div className={styles.comparisonValue}>
                          {(() => {
                            if (!compareTotals.pct) return 'غير محسوب'
                            const absPct = Math.abs(compareTotals.pct * 100)
                            if (absPct < 5) return '🟢 تغيير ضعيف'
                            if (absPct < 20) return '🟡 تغيير متوسط'
                            return '🔴 تغيير قوي'
                          })()
                          }
                        </div>
                      </div>
                      <div className={styles.comparisonCard}>
                        <div className={styles.comparisonLabel}>الفترة الأفضل</div>
                        <div className={styles.comparisonValue}>
                          {Math.abs(compareTotals.curr) > Math.abs(compareTotals.prev) ? 'الفترة الحالية' : 'الفترة السابقة'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className={styles.modalActions}>
                  <button 
                    className={styles.presetButton}
                    onClick={() => {
                      // Export analytics data
                      const analyticsData = {
                        generatedAt: new Date(),
                        period: { from: filters.dateFrom, to: filters.dateTo },
                        kpi: {
                          totalDebits: view === 'overview' 
                            ? filteredSummaryRows.reduce((sum, row) => sum + Number(row.period_debits || 0), 0)
                            : data.reduce((sum, row) => sum + Number(row.debit || 0), 0),
                          totalCredits: view === 'overview' 
                            ? filteredSummaryRows.reduce((sum, row) => sum + Number(row.period_credits || 0), 0)
                            : data.reduce((sum, row) => sum + Number(row.credit || 0), 0),
                          activeTransactions: view === 'overview' 
                            ? filteredSummaryRows.reduce((sum, row) => sum + Number(row.transaction_count || 0), 0)
                            : data.length
                        },
                        comparison: compareTotals
                      }
                      
                      const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `gl-analytics-${new Date().toISOString().slice(0, 10)}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    تصدير التحليلات (JSON)
                  </button>
                  <button 
                    className={styles.presetButton}
                    onClick={() => setShowAnalytics(false)}
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reserved for pagination / future actions (no inline styles) */}
      </div>
  )
}

export default GeneralLedger
