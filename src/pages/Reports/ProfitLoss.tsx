import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { exportToExcel, exportToCSV } from '../../utils/UniversalExportManager'
import styles from './ProfitLoss.module.css'
import './StandardFinancialStatements.css'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { getCompanyConfig } from '../../services/company-config'
import { fetchTransactionsDateRange } from '../../services/reports/account-explorer'
import { fetchProfitLossReport, type PLFilters, type PLRow, type PLSummary } from '../../services/reports/profit-loss'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Bolt from '@mui/icons-material/Bolt'
import Print from '@mui/icons-material/Print'
import Refresh from '@mui/icons-material/Refresh'
import IosShare from '@mui/icons-material/IosShare'
import TableView from '@mui/icons-material/TableView'
import TrendingUp from '@mui/icons-material/TrendingUp'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import UnfoldMore from '@mui/icons-material/UnfoldMore'
import UnfoldLess from '@mui/icons-material/UnfoldLess'

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

interface GroupedPLData {
  key: string
  titleAr: string
  titleEn: string
  rows: PLRow[]
  total: number
}

export default function ProfitLoss() {
  const [dateFrom, setDateFrom] = useState<string>(startOfYearISO())
  const [dateTo, setDateTo] = useState<string>(todayISO())
  const [loading, setLoading] = useState<boolean>(false)
  const [rows, setRows] = useState<PLRow[]>([])
  const [summary, setSummary] = useState<PLSummary | null>(null)
  const [error, setError] = useState<string>('')
  const [includeZeros, setIncludeZeros] = useState<boolean>(false)
  const [uiLang, setUiLang] = useState<'ar' | 'en'>('ar')
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [detailedView, setDetailedView] = useState<boolean>(true)
  const [postedOnly, setPostedOnly] = useState<boolean>(false)
  // Numbers-only setting (hide currency symbol)
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true)
  // Collapse/expand state for account groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  
  useEffect(() => {
    try {
      const v = localStorage.getItem('pl_numbersOnly')
      if (v !== null) setNumbersOnly(v === 'true')
    } catch {}
  }, [])
  
  useEffect(() => {
    try { localStorage.setItem('pl_numbersOnly', String(numbersOnly)) } catch {}
  }, [numbersOnly])

  // Group rows by account type for better presentation
  const grouped = useMemo((): GroupedPLData[] => {
    const groups: GroupedPLData[] = []
    const typeOrder = ['revenue', 'cost_of_sales', 'expenses', 'other_income', 'other_expenses']
    
    const titles = {
      revenue: { ar: 'الإيرادات', en: 'Revenue' },
      cost_of_sales: { ar: 'تكلفة المبيعات', en: 'Cost of Sales' },
      expenses: { ar: 'المصروفات التشغيلية', en: 'Operating Expenses' },
      other_income: { ar: 'إيرادات أخرى', en: 'Other Income' },
      other_expenses: { ar: 'مصروفات أخرى', en: 'Other Expenses' }
    }

    for (const type of typeOrder) {
      const typeRows = rows.filter(r => r.account_type === type)
      if (typeRows.length > 0 || !includeZeros) {
        const total = typeRows.reduce((sum, r) => sum + r.amount, 0)
        if (total !== 0 || includeZeros) {
          groups.push({
            key: type,
            titleAr: titles[type as keyof typeof titles].ar,
            titleEn: titles[type as keyof typeof titles].en,
            rows: typeRows,
            total
          })
        }
      }
    }

    return groups
  }, [rows, includeZeros])

  useEffect(() => {
    // Auto-load once
    loadProjects().then(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-set date range from first to last transaction for current project
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchTransactionsDateRange({
          orgId: null,
          projectId: projectId || null,
          postedOnly: postedOnly,
        })
        if (r) {
          if (r.min_date) setDateFrom(r.min_date)
          if (r.max_date) setDateTo(r.max_date)
        }
      } catch {}
    })()
  }, [projectId, postedOnly])

  async function loadProjects() {
    const { data } = await supabase.from('projects').select('id, code, name').eq('status', 'active').order('code')
    setProjects(data || [])
    try { 
      const cfg = await getCompanyConfig()
      setCompanyName(cfg.company_name || '')
    } catch {}
  }

  async function load() {
    try {
      setLoading(true)
      setError('')

      const filters: PLFilters = {
        dateFrom,
        dateTo,
        projectId: projectId || null,
        postedOnly
      }

      const result = await fetchProfitLossReport(filters)
      
      let filteredRows = result.rows
      if (!includeZeros) {
        filteredRows = result.rows.filter(r => r.amount !== 0)
      }

      setRows(filteredRows)
      setSummary(result.summary)
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء تحميل قائمة الدخل')
      setRows([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  function doExport(kind: 'excel' | 'csv') {
    if (!summary) return

    const cols = [
      { key: 'account_code', header: uiLang === 'ar' ? 'رمز الحساب' : 'Account Code', type: 'text' as const },
      { key: 'account_name', header: uiLang === 'ar' ? 'اسم الحساب' : 'Account Name', type: 'text' as const },
      { key: 'amount', header: uiLang === 'ar' ? 'المبلغ' : 'Amount', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
    ]

    // Build export data with sections and calculations
    const exportRows: any[] = []
    
    // Revenue section
    const revenueRows = grouped.find(g => g.key === 'revenue')
    if (revenueRows) {
      exportRows.push({ account_code: uiLang === 'ar' ? revenueRows.titleAr : revenueRows.titleEn, account_name: '', amount: '' })
      revenueRows.rows.forEach(r => exportRows.push({
        account_code: r.account_code,
        account_name: uiLang === 'ar' ? (r.account_name_ar || r.account_name_en) : (r.account_name_en || r.account_name_ar),
        amount: r.amount
      }))
      exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', account_name: '', amount: summary.total_revenue })
      exportRows.push({ account_code: '', account_name: '', amount: '' })
    }

    // Cost of Sales section
    const cosRows = grouped.find(g => g.key === 'cost_of_sales')
    if (cosRows) {
      exportRows.push({ account_code: uiLang === 'ar' ? cosRows.titleAr : cosRows.titleEn, account_name: '', amount: '' })
      cosRows.rows.forEach(r => exportRows.push({
        account_code: r.account_code,
        account_name: uiLang === 'ar' ? (r.account_name_ar || r.account_name_en) : (r.account_name_en || r.account_name_ar),
        amount: r.amount
      }))
      exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي تكلفة المبيعات' : 'Total Cost of Sales', account_name: '', amount: summary.total_cost_of_sales })
      exportRows.push({ account_code: '', account_name: '', amount: '' })
    }

    // Gross Profit
    exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي الربح' : 'Gross Profit', account_name: '', amount: summary.gross_profit })
    exportRows.push({ account_code: '', account_name: '', amount: '' })

    // Operating Expenses section
    const expenseRows = grouped.find(g => g.key === 'expenses')
    if (expenseRows) {
      exportRows.push({ account_code: uiLang === 'ar' ? expenseRows.titleAr : expenseRows.titleEn, account_name: '', amount: '' })
      expenseRows.rows.forEach(r => exportRows.push({
        account_code: r.account_code,
        account_name: uiLang === 'ar' ? (r.account_name_ar || r.account_name_en) : (r.account_name_en || r.account_name_ar),
        amount: r.amount
      }))
      exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي المصروفات التشغيلية' : 'Total Operating Expenses', account_name: '', amount: summary.total_operating_expenses })
      exportRows.push({ account_code: '', account_name: '', amount: '' })
    }

    // Operating Income
    exportRows.push({ account_code: uiLang === 'ar' ? 'الدخل التشغيلي' : 'Operating Income', account_name: '', amount: summary.operating_income })
    exportRows.push({ account_code: '', account_name: '', amount: '' })

    // Other sections
    const otherIncomeRows = grouped.find(g => g.key === 'other_income')
    if (otherIncomeRows && otherIncomeRows.rows.length > 0) {
      exportRows.push({ account_code: uiLang === 'ar' ? otherIncomeRows.titleAr : otherIncomeRows.titleEn, account_name: '', amount: '' })
      otherIncomeRows.rows.forEach(r => exportRows.push({
        account_code: r.account_code,
        account_name: uiLang === 'ar' ? (r.account_name_ar || r.account_name_en) : (r.account_name_en || r.account_name_ar),
        amount: r.amount
      }))
      exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي الإيرادات الأخرى' : 'Total Other Income', account_name: '', amount: summary.total_other_income })
      exportRows.push({ account_code: '', account_name: '', amount: '' })
    }

    const otherExpenseRows = grouped.find(g => g.key === 'other_expenses')
    if (otherExpenseRows && otherExpenseRows.rows.length > 0) {
      exportRows.push({ account_code: uiLang === 'ar' ? otherExpenseRows.titleAr : otherExpenseRows.titleEn, account_name: '', amount: '' })
      otherExpenseRows.rows.forEach(r => exportRows.push({
        account_code: r.account_code,
        account_name: uiLang === 'ar' ? (r.account_name_ar || r.account_name_en) : (r.account_name_en || r.account_name_ar),
        amount: r.amount
      }))
      exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي المصروفات الأخرى' : 'Total Other Expenses', account_name: '', amount: summary.total_other_expenses })
      exportRows.push({ account_code: '', account_name: '', amount: '' })
    }

    // Net Income
    exportRows.push({ account_code: uiLang === 'ar' ? 'صافي الدخل' : 'Net Income', account_name: '', amount: summary.net_income })

    const data = {
      columns: cols,
      rows: exportRows,
      metadata: {
        prependRows: [
          [uiLang === 'ar' ? 'الشركة' : 'Company', companyName || (uiLang === 'ar' ? 'غير محدد' : 'N/A')],
          [uiLang === 'ar' ? 'الفترة' : 'Period', `${dateFrom} → ${dateTo}`],
          [uiLang === 'ar' ? 'المشروع' : 'Project', projectId ? (projects.find(p => p.id === projectId)?.code + ' — ' + (projects.find(p => p.id === projectId)?.name || '')) : (uiLang === 'ar' ? 'الكل' : 'All')],
          [''],
          [uiLang === 'ar' ? 'ملخص المؤشرات المالية:' : 'Financial Metrics Summary:'],
          [uiLang === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Margin', `${summary.gross_margin_percent.toFixed(2)}%`],
          [uiLang === 'ar' ? 'هامش الربح التشغيلي' : 'Operating Margin', `${summary.operating_margin_percent.toFixed(2)}%`],
          [uiLang === 'ar' ? 'هامش الربح الصافي' : 'Net Margin', `${summary.net_margin_percent.toFixed(2)}%`],
        ]
      }
    }
    
    const opts = { 
      title: uiLang === 'ar' ? 'قائمة الدخل (الأرباح والخسائر)' : 'Profit & Loss Statement', 
      rtlLayout: uiLang === 'ar' 
    }
    
    if (kind === 'excel') return exportToExcel(data as any, opts as any)
    return exportToCSV(data as any, opts as any)
  }

  async function exportToPDF() {
    const element = document.getElementById('financial-report-content') as HTMLElement | null
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
          const el = doc.getElementById('financial-report-content') as HTMLElement | null
          if (el) {
            el.style.direction = 'rtl'
            el.style.textAlign = 'right'
            el.style.fontFamily = 'Arial, sans-serif'
            el.style.fontSize = '14px'
            el.style.lineHeight = '1.5'
            el.style.color = '#000000'
            ;(el.style as any).WebkitFontSmoothing = 'antialiased'
            ;(el.style as any).MozOsxFontSmoothing = 'grayscale'
            // Show the statement header for PDF capture
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
      const filenameBase = uiLang === 'ar' ? 'قائمة_الدخل' : 'Profit_Loss'
      pdf.save(`${filenameBase}_${currentDate}.pdf`)
    } catch (err) {
      console.error('PDF export failed', err)
      alert(uiLang === 'ar' ? 'فشل في تصدير PDF' : 'Failed to export PDF')
    }
  }

  function printReport() {
    window.print()
  }

  // Toggle group collapse/expand
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newCollapsed = new Set(prev)
      if (newCollapsed.has(groupKey)) {
        newCollapsed.delete(groupKey)
      } else {
        newCollapsed.add(groupKey)
      }
      return newCollapsed
    })
  }

  // Handle keyboard navigation for group headers
  const handleGroupKeyDown = (event: React.KeyboardEvent, groupKey: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleGroupCollapse(groupKey)
    }
  }

  // Expand all groups
  const expandAllGroups = () => {
    setCollapsedGroups(new Set())
  }

  // Collapse all groups
  const collapseAllGroups = () => {
    setCollapsedGroups(new Set(grouped.map(g => g.key)))
  }

  useEffect(() => {
    // Auto reload when inputs change
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, projectId, includeZeros, postedOnly])

  // Performance status
  const performanceStatus = useMemo(() => {
    if (!summary) return null
    
    if (summary.net_income > 0) {
      return {
        status: 'profit',
        textAr: `✓ ربح صافي: ${formatArabicCurrency(summary.net_income, numbersOnly ? 'none' : 'EGP')}`,
        textEn: `✓ Net Profit: ${formatArabicCurrency(summary.net_income, numbersOnly ? 'none' : 'EGP')}`
      }
    } else if (summary.net_income < 0) {
      return {
        status: 'loss',
        textAr: `⚠ خسارة صافية: ${formatArabicCurrency(Math.abs(summary.net_income), numbersOnly ? 'none' : 'EGP')}`,
        textEn: `⚠ Net Loss: ${formatArabicCurrency(Math.abs(summary.net_income), numbersOnly ? 'none' : 'EGP')}`
      }
    } else {
      return {
        status: 'breakeven',
        textAr: '➡️ التعادل (لا ربح ولا خسارة)',
        textEn: '➡️ Break-even (no profit or loss)'
      }
    }
  }, [summary, numbersOnly])

  return (
    <div className={styles.container}>
      {/* Unified one-row filter bar using advanced implementation */}
      <div className={`${styles.professionalFilterBar} ${styles.noPrint}`}>
        {/* Left Section: Date Filters */}
        <div className={styles.filterSection}>
          <select 
            className={styles.filterSelect} 
            value={projectId} 
            onChange={e => setProjectId(e.target.value)} 
            aria-label={uiLang === 'ar' ? 'المشروع' : 'Project'}
            title={uiLang === 'ar' ? 'اختر مشروع للتصفية' : 'Select project to filter'}
          >
            <option value="">{uiLang === 'ar' ? 'كل المشاريع' : 'All Projects'}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
          <input 
            className={styles.filterInput} 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)} 
            aria-label={uiLang === 'ar' ? 'من' : 'From'} 
            title={uiLang === 'ar' ? 'تاريخ بداية الفترة' : 'Period start date'}
          />
          <input 
            className={styles.filterInput} 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)} 
            aria-label={uiLang === 'ar' ? 'إلى' : 'To'} 
            title={uiLang === 'ar' ? 'تاريخ نهاية الفترة' : 'Period end date'}
          />
        </div>

        {/* Center Section: Language + Group Controls + Feature Toggles */}
        <div className={styles.centerSection}>
          <div className={styles.languageToggle} role="group" aria-label={uiLang === 'ar' ? 'اللغة' : 'Language'}>
            <button type="button" className={`${styles.languageOption} ${uiLang === 'ar' ? styles.active : ''}`} onClick={() => setUiLang('ar')}>ع</button>
            <button type="button" className={`${styles.languageOption} ${uiLang === 'en' ? styles.active : ''}`} onClick={() => setUiLang('en')}>En</button>
          </div>
          
          <div className={styles.groupControls}>
            <button 
              type="button" 
              className={styles.groupControlButton}
              onClick={expandAllGroups}
              disabled={loading || grouped.length === 0}
              title={uiLang === 'ar' ? 'توسيع جميع المجموعات' : 'Expand all groups'}
              aria-label={uiLang === 'ar' ? 'توسيع جميع المجموعات' : 'Expand all groups'}
            >
              <UnfoldMore fontSize="small" />
            </button>
            <button 
              type="button" 
              className={styles.groupControlButton}
              onClick={collapseAllGroups}
              disabled={loading || grouped.length === 0}
              title={uiLang === 'ar' ? 'طي جميع المجموعات' : 'Collapse all groups'}
              aria-label={uiLang === 'ar' ? 'طي جميع المجموعات' : 'Collapse all groups'}
            >
              <UnfoldLess fontSize="small" />
            </button>
          </div>

          <div className={styles.featureToggles}>
            <button
              type="button"
              className={`${styles.featureToggle} ${includeZeros ? styles.active : ''}`}
              onClick={() => setIncludeZeros(v => !v)}
              title={uiLang === 'ar' ? 'إظهار الأرصدة الصفرية' : 'Show zero balances'}
              aria-label={uiLang === 'ar' ? 'إظهار الأرصدة الصفرية' : 'Show zero balances'}
            >
              {includeZeros ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
              <span className={styles.toggleText}>{uiLang === 'ar' ? 'عرض الأصفار' : 'Show Zeros'}</span>
            </button>
            <button
              type="button"
              className={`${styles.featureToggle} ${detailedView ? styles.active : ''}`}
              onClick={() => setDetailedView(v => !v)}
              title={uiLang === 'ar' ? 'العرض التفصيلي' : 'Detailed view'}
              aria-label={uiLang === 'ar' ? 'العرض التفصيلي' : 'Detailed view'}
            >
              <Bolt fontSize="small" />
              <span className={styles.toggleText}>{uiLang === 'ar' ? 'التفاصيل' : 'Detailed'}</span>
            </button>
            <button
              type="button"
              className={`${styles.featureToggle} ${postedOnly ? styles.active : ''}`}
              onClick={() => setPostedOnly(v => !v)}
              title={uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted only'}
              aria-label={uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted only'}
            >
              <Visibility fontSize="small" />
              <span className={styles.toggleText}>{uiLang === 'ar' ? 'المعتمد فقط' : 'Posted Only'}</span>
            </button>
            <button
              type="button"
              className={`${styles.featureToggle} ${numbersOnly ? styles.active : ''}`}
              onClick={() => setNumbersOnly(v => !v)}
              title={uiLang === 'ar' ? 'أرقام فقط بدون عملة' : 'Numbers only (no currency)'}
              aria-label={uiLang === 'ar' ? 'أرقام فقط بدون عملة' : 'Numbers only (no currency)'}
            >
              {numbersOnly ? <TrendingUp fontSize="small" /> : <VisibilityOff fontSize="small" />}
              <span className={styles.toggleText}>{uiLang === 'ar' ? 'أرقام فقط' : 'Numbers Only'}</span>
            </button>
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className={styles.actionSection}>
          <div className={styles.exportGroup}>
            <button 
              type="button" 
              className={styles.exportButton} 
              onClick={() => doExport('excel')} 
              disabled={loading || rows.length === 0}
              title={uiLang === 'ar' ? 'تصدير إلى Excel' : 'Export to Excel'}
              aria-label={uiLang === 'ar' ? 'تصدير قائمة الدخل إلى Excel' : 'Export profit & loss to Excel'}
            >
              <IosShare fontSize="small" /> Excel
            </button>
            <button 
              type="button" 
              className={styles.exportButton} 
              onClick={() => doExport('csv')} 
              disabled={loading || rows.length === 0}
              title={uiLang === 'ar' ? 'تصدير إلى CSV' : 'Export to CSV'}
              aria-label={uiLang === 'ar' ? 'تصدير قائمة الدخل إلى CSV' : 'Export profit & loss to CSV'}
            >
              <TableView fontSize="small" /> CSV
            </button>
          </div>
          <button 
            type="button" 
            className={`${styles.actionButton} ${styles.secondary}`} 
            onClick={printReport} 
            disabled={loading || grouped.length === 0}
            title={uiLang === 'ar' ? 'طباعة التقرير' : 'Print the report'}
            aria-label={uiLang === 'ar' ? 'طباعة قائمة الدخل' : 'Print profit & loss report'}
          >
            <Print fontSize="small" /> {uiLang === 'ar' ? 'طباعة' : 'Print'}
          </button>
          <button 
            type="button" 
            className={`${styles.actionButton} ${styles.primary}`} 
            onClick={load} 
            disabled={loading}
            title={uiLang === 'ar' ? 'تحديث البيانات' : 'Refresh the data'}
            aria-label={uiLang === 'ar' ? 'تحديث بيانات قائمة الدخل' : 'Refresh profit & loss data'}
          >
            <Refresh fontSize="small" /> {loading ? (uiLang === 'ar' ? 'جاري التحميل...' : 'Loading...') : (uiLang === 'ar' ? 'تحديث' : 'Refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorAlert}>{error}</div>
      )}

      {/* Legacy report layout for consistent styling */}
      <div className="standard-financial-statements">
        {/* Dedicated export button (legacy approach, not universal) */}
        <div className="export-controls">
          <button onClick={exportToPDF} className="export-pdf-btn" title={uiLang === 'ar' ? 'تصدير إلى PDF' : 'Export to PDF'}>
            <span className="export-icon">📄</span>
            {uiLang === 'ar' ? 'تصدير PDF' : 'Export PDF'}
          </button>
        </div>
        
        <div id="financial-report-content" className="financial-report-content">
          <div className={styles.reportHeader} style={{display: 'none'}}>
            <h2>{companyName || (uiLang === 'ar' ? 'الشركة' : 'Company')}</h2>
            <div className={styles.statementTitle}>{uiLang === 'ar' ? 'قائمة الدخل' : 'Profit & Loss Statement'}</div>
            <div className={styles.statementMeta}>
              <span>{uiLang === 'ar' ? 'الفترة' : 'Period'}: {dateFrom} ← {dateTo}</span>
              {projectId && (
                <span>{uiLang === 'ar' ? 'المشروع' : 'Project'}: {projects.find(p => p.id === projectId)?.name || projectId}</span>
              )}
              {postedOnly && (
                <span>{uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted only'}</span>
              )}
            </div>
            {performanceStatus && (
              <div className={`${styles.statusBanner} ${styles[`status${performanceStatus.status.charAt(0).toUpperCase() + performanceStatus.status.slice(1)}`]}`}>
                {uiLang === 'ar' ? performanceStatus.textAr : performanceStatus.textEn}
              </div>
            )}
          </div>

          <div className="statement-content">
            {summary && (
              <div className="profit-loss-container">
                <div className="profit-loss-header">
                  <div className="account-column">{uiLang === 'ar' ? 'البيان' : 'Description'}</div>
                  <div className="amounts-columns">
                    <div className="amount-column">{uiLang === 'ar' ? 'المبلغ' : 'Amount'}</div>
                  </div>
                </div>

                {grouped.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.key)
                  return (
                    <div key={group.key} className="financial-group">
                      <div className="group-header collapsible-header">
                        <button
                          type="button"
                          className="group-toggle-button"
                          onClick={() => toggleGroupCollapse(group.key)}
                          aria-expanded={!isCollapsed}
                          aria-controls={`group-content-${group.key}`}
                          title={isCollapsed 
                            ? (uiLang === 'ar' ? `توسيع ${uiLang === 'ar' ? group.titleAr : group.titleEn}` : `Expand ${group.titleEn}`)
                            : (uiLang === 'ar' ? `طي ${uiLang === 'ar' ? group.titleAr : group.titleEn}` : `Collapse ${group.titleEn}`)
                          }
                        >
                          {isCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                        </button>
                        <h3 
                          className="group-title clickable" 
                          onClick={() => toggleGroupCollapse(group.key)}
                          onKeyDown={(e) => handleGroupKeyDown(e, group.key)}
                          tabIndex={0}
                          role="button"
                        >
                          {uiLang === 'ar' ? group.titleAr : group.titleEn}
                          <span className="account-count">({group.rows.length})</span>
                        </h3>
                        <div className="group-totals-preview">
                          <span className="preview-amount">{formatArabicCurrency(Math.abs(group.total), numbersOnly ? 'none' : 'EGP')}</span>
                        </div>
                      </div>
                      {!isCollapsed && (
                        <>
                          {detailedView && (
                            <div id={`group-content-${group.key}`} className="group-content">
                              {group.rows.map((row) => (
                                <div key={row.account_id} className="account-line level-0">
                                  <div className="account-info">
                                    <span className="account-code">{row.account_code}</span>
                                    <span className="account-name">
                                      {uiLang === 'ar' ? (row.account_name_ar || row.account_name_en) : (row.account_name_en || row.account_name_ar)}
                                    </span>
                                  </div>
                                  <div className="account-amounts">
                                    <span className="amount">{formatArabicCurrency(Math.abs(row.amount), numbersOnly ? 'none' : 'EGP')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="group-subtotal">
                            <span className="subtotal-label">
                              {uiLang === 'ar' ? `إجمالي ${group.titleAr}` : `Total ${group.titleEn}`}
                            </span>
                            <div className="subtotal-amounts">
                              <span className="subtotal-amount">{formatArabicCurrency(Math.abs(group.total), numbersOnly ? 'none' : 'EGP')}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}

                {/* Key calculations */}
                <div className="profit-loss-calculations">
                  <div className="calculation-line gross-profit">
                    <span className="calc-label">{uiLang === 'ar' ? 'إجمالي الربح' : 'Gross Profit'}</span>
                    <div className="calc-amounts">
                      <span className="calc-amount">{formatArabicCurrency(summary.gross_profit, numbersOnly ? 'none' : 'EGP')}</span>
                    </div>
                  </div>

                  <div className="calculation-line operating-income">
                    <span className="calc-label">{uiLang === 'ar' ? 'الدخل التشغيلي' : 'Operating Income'}</span>
                    <div className="calc-amounts">
                      <span className="calc-amount">{formatArabicCurrency(summary.operating_income, numbersOnly ? 'none' : 'EGP')}</span>
                    </div>
                  </div>

                  <div className="calculation-line net-income">
                    <span className="calc-label">{uiLang === 'ar' ? 'صافي الدخل' : 'Net Income'}</span>
                    <div className="calc-amounts">
                      <span className={`calc-amount ${summary.net_income >= 0 ? 'profit' : 'loss'}`}>
                        {formatArabicCurrency(summary.net_income, numbersOnly ? 'none' : 'EGP')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial ratios */}
                <div className="profit-loss-ratios">
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Margin'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(summary.gross_margin_percent.toFixed(2)), 'none')}%</span>
                  </div>
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'هامش الربح التشغيلي' : 'Operating Margin'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(summary.operating_margin_percent.toFixed(2)), 'none')}%</span>
                  </div>
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'هامش الربح الصافي' : 'Net Margin'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(summary.net_margin_percent.toFixed(2)), 'none')}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
