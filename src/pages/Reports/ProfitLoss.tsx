import React, { useEffect, useMemo, useState } from 'react'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { exportToExcel, exportToCSV } from '../../utils/UniversalExportManager'
import styles from './ProfitLoss.module.css'
import './StandardFinancialStatements.css'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { getCompanyConfig } from '../../services/company-config'
import { fetchTransactionsDateRange } from '../../services/reports/common';
import { getProfitLoss, type UnifiedFilters, type ProfitLossRow as PLRow, type ProfitLossSummary as PLSummary } from '../../services/reports/unified-financial-query'
import { useScope } from '../../contexts/ScopeContext'
import { getConnectionMonitor } from '../../utils/connectionMonitor'
import StalenessIndicator from '../../components/Common/StalenessIndicator'
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
import useAppStore from '../../store/useAppStore'

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
  const { currentOrg, currentProject } = useScope()
  const lang = useAppStore((s: { language: string }) => s.language)
  const isAr = lang === 'ar'
  const { isOnline } = getConnectionMonitor().getHealth()

  const [dateFrom, setDateFrom] = useState<string>(startOfYearISO())
  const [dateTo, setDateTo] = useState<string>(todayISO())
  const [loading, setLoading] = useState<boolean>(false)
  const [rows, setRows] = useState<PLRow[]>([])
  const [summary, setSummary] = useState<PLSummary | null>(null)
  const [error, setError] = useState<string>('')
  const [includeZeros, setIncludeZeros] = useState<boolean>(false)
  const uiLang = isAr ? 'ar' : 'en'
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
    } catch { }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('pl_numbersOnly', String(numbersOnly)) } catch { }
  }, [numbersOnly])

  // Removed legacy effect sync

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
    loadInitialData().then(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-set date range from first to last transaction for current project
  useEffect(() => {
    (async () => {
      try {
        const r = await fetchTransactionsDateRange({
          orgId: null,
          projectId: currentProject?.id || null,
          postedOnly: postedOnly,
        })
        if (r) {
          if (r.min_date) setDateFrom(r.min_date)
          if (r.max_date) setDateTo(r.max_date)
        }
      } catch { }
    })()
  }, [currentProject?.id, postedOnly])

  async function loadInitialData() {
    try {
      const cfg = await getCompanyConfig()
      setCompanyName(cfg.company_name || '')
    } catch { }
  }

  async function load() {
    try {
      setLoading(true)
      setError('')

      const filters: UnifiedFilters = {
        dateFrom,
        dateTo,
        orgId: currentOrg?.id || null,
        projectId: currentProject?.id || null,
        postedOnly
      }

      const result = await getProfitLoss(filters)

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

  // Debounced + visibility-aware reload on filter changes
  useEffect(() => {
    let canceled = false
    const t = setTimeout(() => { if (!canceled && !document.hidden) load() }, 250)
    return () => { canceled = true; clearTimeout(t) }
  }, [dateFrom, dateTo, currentOrg?.id, currentProject?.id, postedOnly, includeZeros])

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
          [uiLang === 'ar' ? 'المشروع' : 'Project', currentProject ? (currentProject.code + ' — ' + (currentProject.name || '')) : (uiLang === 'ar' ? 'الكل' : 'All')],
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
              ; (el.style as any).WebkitFontSmoothing = 'antialiased'
              ; (el.style as any).MozOsxFontSmoothing = 'grayscale'
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
    const printContent = document.getElementById('financial-report-content')
    if (!printContent) return

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Prepare report data
    const currentDate = new Date().toLocaleDateString('ar-EG')

    // Build professional commercial report HTML
    const reportHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${uiLang === 'ar' ? 'قائمة الدخل' : 'Profit & Loss Statement'}</title>
          <style>
            /* Commercial Accounting Report Styles */
            * { box-sizing: border-box; margin: 0; padding: 0; }
            
            body { 
              font-family: 'Arial', 'Tahoma', sans-serif;
              direction: rtl;
              background: white;
              color: black;
              font-size: 12px;
              line-height: 1.3;
              padding: 15mm;
            }
            
            /* Report Header - Commercial Standard */
            .print-header {
              text-align: center;
              margin-bottom: 25px;
              border: 2px solid black;
              padding: 15px;
            }
            
            .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 8px;
              color: black;
              text-transform: uppercase;
            }
            
            .report-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 8px;
              color: black;
              text-decoration: underline;
            }
            
            .report-period {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
              color: black;
            }
            
            .report-filters {
              font-size: 11px;
              color: black;
              border-top: 1px solid black;
              padding-top: 8px;
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
            }
            
            .filter-item {
              margin: 2px 10px;
              font-weight: normal;
            }
            
            /* Performance Status Banner */
            .performance-status {
              margin: 10px 0;
              padding: 8px 15px;
              border: 2px solid black;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
            }
            
            .performance-status.profit {
              background: #f0f8f0;
              color: #006600;
              border-color: #006600;
            }
            
            .performance-status.loss {
              background: #fff0f0;
              color: #cc0000;
              border-color: #cc0000;
            }
            
            .performance-status.breakeven {
              background: #f8f8f0;
              color: #666600;
              border-color: #666600;
            }
            
            /* Table Structure */
            .report-content {
              margin-top: 20px;
            }
            
            .profit-loss-table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid black;
              background: white;
              margin-bottom: 20px;
            }
            
            .table-header {
              background: white;
              border-bottom: 2px solid black;
              font-weight: bold;
              color: black;
            }
            
            .table-header th {
              padding: 10px 8px;
              text-align: center;
              font-size: 13px;
              border-right: 1px solid black;
              font-weight: bold;
            }
            
            .table-header th:last-child {
              border-right: none;
            }
            
            .section-group {
              border-bottom: 1px solid #666;
            }
            
            .section-header-row {
              background: #f5f5f5;
              font-weight: bold;
              font-size: 13px;
              border-bottom: 2px solid black;
            }
            
            .section-header-row td {
              padding: 8px;
              color: black;
              font-weight: bold;
              text-align: center;
              border-right: 1px solid black;
            }
            
            .section-header-row td:last-child {
              border-right: none;
            }
            
            .account-row {
              border-bottom: 1px solid #ccc;
              background: white;
            }
            
            .account-row:hover {
              background: white;
            }
            
            .account-row td {
              padding: 6px 8px;
              color: black;
              font-size: 11px;
              border-right: 1px solid #ccc;
            }
            
            .account-row td:last-child {
              border-right: none;
            }
            
            .account-code {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              text-align: center;
              width: 100px;
            }
            
            .account-name {
              text-align: right;
              font-weight: normal;
            }
            
            .amount {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              text-align: right;
              width: 120px;
            }
            
            .section-subtotal {
              background: #f0f0f0;
              font-weight: bold;
              font-size: 12px;
              border-top: 1px solid black;
              border-bottom: 2px solid black;
            }
            
            .section-subtotal td {
              padding: 8px;
              color: black;
              font-weight: bold;
              border-right: 1px solid black;
            }
            
            .section-subtotal td:last-child {
              border-right: none;
            }
            
            /* Calculations Section */
            .calculations-section {
              margin-top: 20px;
              border: 2px solid black;
              background: white;
            }
            
            .calculations-header {
              background: #e8e8e8;
              color: black;
              padding: 10px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              border-bottom: 2px solid black;
            }
            
            .calculation-row {
              display: flex;
              padding: 8px 12px;
              border-bottom: 1px solid #ccc;
              font-weight: bold;
              font-size: 13px;
            }
            
            .calculation-row.major {
              background: #f5f5f5;
              border-bottom: 2px solid black;
              font-size: 14px;
            }
            
            .calculation-row.final {
              background: #e0e0e0;
              border-top: 2px solid black;
              border-bottom: 2px solid black;
              font-size: 15px;
            }
            
            .calc-label {
              flex: 1;
              color: black;
              font-weight: bold;
            }
            
            .calc-amount {
              width: 120px;
              text-align: right;
              font-family: 'Courier New', monospace;
              color: black;
              font-weight: bold;
            }
            
            .calc-amount.profit {
              color: #006600;
            }
            
            .calc-amount.loss {
              color: #cc0000;
            }
            
            /* Financial Ratios Section */
            .ratios-section {
              margin-top: 20px;
              border: 2px solid black;
              background: white;
            }
            
            .ratios-header {
              background: #e8e8e8;
              color: black;
              padding: 10px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              border-bottom: 2px solid black;
            }
            
            .ratio-row {
              display: flex;
              padding: 6px 12px;
              border-bottom: 1px solid #ccc;
              font-size: 12px;
            }
            
            .ratio-row:last-child {
              border-bottom: none;
            }
            
            .ratio-label {
              flex: 1;
              color: black;
              font-weight: normal;
            }
            
            .ratio-value {
              width: 80px;
              text-align: right;
              font-family: 'Courier New', monospace;
              color: black;
              font-weight: bold;
            }
            
            /* Print-specific */
            @media print {
              body { padding: 10mm; }
              .section-group { break-inside: avoid; }
              @page { 
                size: A4; 
                margin: 15mm;
              }
            }
          </style>
        </head>
        <body>
          <!-- Professional Commercial Report Header -->
          <div class="print-header">
            <div class="company-name">${companyName || (uiLang === 'ar' ? 'الشركة التجارية' : 'Commercial Company')}</div>
            <div class="report-title">${uiLang === 'ar' ? 'قائمة الدخل (الأرباح والخسائر)' : 'Profit & Loss Statement'}</div>
            <div class="report-period">${uiLang === 'ar' ? 'من' : 'From'}: ${dateFrom} ${uiLang === 'ar' ? 'إلى' : 'To'}: ${dateTo}</div>
            <div class="report-filters">
              <span class="filter-item">${uiLang === 'ar' ? 'المشروع' : 'Project'}: ${currentProject?.name || (uiLang === 'ar' ? 'الكل' : 'All')}</span>
              <span class="filter-item">${uiLang === 'ar' ? 'تاريخ الطباعة' : 'Print Date'}: ${currentDate}</span>
              ${postedOnly ? `<span class="filter-item">${uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted Only'}</span>` : ''}
              ${detailedView ? `<span class="filter-item">${uiLang === 'ar' ? 'عرض تفصيلي' : 'Detailed View'}</span>` : ''}
            </div>
          </div>
          
          ${performanceStatus ? `
            <div class="performance-status ${performanceStatus.status}">
              ${uiLang === 'ar' ? performanceStatus.textAr : performanceStatus.textEn}
            </div>
          ` : ''}
          
          <!-- Report Content -->
          <div class="report-content">
            ${generatePrintContent()}
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

  // Generate print content with proper commercial formatting
  function generatePrintContent(): string {
    if (!summary) return '<p>لا توجد بيانات للعرض</p>'

    let html = ''

    // Profit & Loss Table
    html += `
      <table class="profit-loss-table">
        <thead class="table-header">
          <tr>
            <th style="width: 100px;">${uiLang === 'ar' ? 'رمز الحساب' : 'Account Code'}</th>
            <th style="width: 300px;">${uiLang === 'ar' ? 'اسم الحساب / البيان' : 'Account Name / Description'}</th>
            <th style="width: 120px;">${uiLang === 'ar' ? 'المبلغ' : 'Amount'}</th>
          </tr>
        </thead>
        <tbody>
    `

    // Generate grouped content
    grouped.forEach(group => {
      // Section Header
      html += `
        <tr class="section-header-row">
          <td colspan="3">${uiLang === 'ar' ? group.titleAr : group.titleEn}</td>
        </tr>
      `

      // Section Accounts (if detailed view)
      if (detailedView) {
        group.rows.forEach(row => {
          const accountName = uiLang === 'ar' ? (row.account_name_ar || row.account_name_en) : (row.account_name_en || row.account_name_ar)

          html += `
            <tr class="account-row">
              <td class="account-code">${row.account_code}</td>
              <td class="account-name">${accountName}</td>
              <td class="amount">${formatArabicCurrency(Math.abs(row.amount), numbersOnly ? 'none' : 'EGP')}</td>
            </tr>
          `
        })
      }

      // Section Subtotal
      html += `
        <tr class="section-subtotal">
          <td colspan="2">${uiLang === 'ar' ? `إجمالي ${group.titleAr}` : `Total ${group.titleEn}`}</td>
          <td class="amount">${formatArabicCurrency(Math.abs(group.total), numbersOnly ? 'none' : 'EGP')}</td>
        </tr>
      `
    })

    html += `
        </tbody>
      </table>
    `

    // Calculations Section
    html += `
      <div class="calculations-section">
        <div class="calculations-header">${uiLang === 'ar' ? 'الحسابات والمؤشرات المالية' : 'Financial Calculations & Metrics'}</div>
        <div class="calculation-row major">
          <div class="calc-label">${uiLang === 'ar' ? 'إجمالي الربح' : 'Gross Profit'}</div>
          <div class="calc-amount ${summary.gross_profit >= 0 ? 'profit' : 'loss'}">
            ${formatArabicCurrency(summary.gross_profit, numbersOnly ? 'none' : 'EGP')}
          </div>
        </div>
        <div class="calculation-row major">
          <div class="calc-label">${uiLang === 'ar' ? 'الدخل التشغيلي' : 'Operating Income'}</div>
          <div class="calc-amount ${summary.operating_income >= 0 ? 'profit' : 'loss'}">
            ${formatArabicCurrency(summary.operating_income, numbersOnly ? 'none' : 'EGP')}
          </div>
        </div>
        <div class="calculation-row final">
          <div class="calc-label">${uiLang === 'ar' ? 'صافي الدخل' : 'Net Income'}</div>
          <div class="calc-amount ${summary.net_income >= 0 ? 'profit' : 'loss'}">
            ${formatArabicCurrency(summary.net_income, numbersOnly ? 'none' : 'EGP')}
          </div>
        </div>
      </div>
    `

    // Financial Ratios Section
    html += `
      <div class="ratios-section">
        <div class="ratios-header">${uiLang === 'ar' ? 'نسب الربحية' : 'Profitability Ratios'}</div>
        <div class="ratio-row">
          <div class="ratio-label">${uiLang === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Margin'}</div>
          <div class="ratio-value">${formatArabicCurrency(parseFloat(summary.gross_margin_percent.toFixed(2)), 'none')}%</div>
        </div>
        <div class="ratio-row">
          <div class="ratio-label">${uiLang === 'ar' ? 'هامش الربح التشغيلي' : 'Operating Margin'}</div>
          <div class="ratio-value">${formatArabicCurrency(parseFloat(summary.operating_margin_percent.toFixed(2)), 'none')}%</div>
        </div>
        <div class="ratio-row">
          <div class="ratio-label">${uiLang === 'ar' ? 'هامش الربح الصافي' : 'Net Margin'}</div>
          <div class="ratio-value">${formatArabicCurrency(parseFloat(summary.net_margin_percent.toFixed(2)), 'none')}%</div>
        </div>
      </div>
    `

    return html
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
  }, [dateFrom, dateTo, currentProject?.id, currentOrg?.id, includeZeros, postedOnly])

  // Performance status
  const performanceStatus = useMemo(() => {
    if (!summary) return null

    if (summary.net_income > 0) {
      return {
        status: 'profit',
        textAr: `✓ ربح صافي: ${formatArabicCurrency(summary.net_income, numbersOnly ? 'none' : 'EGP', { useArabicNumerals: true })}`,
        textEn: `✓ Net Profit: ${formatArabicCurrency(summary.net_income, numbersOnly ? 'none' : 'EGP', { useArabicNumerals: false })}`
      }
    } else if (summary.net_income < 0) {
      return {
        status: 'loss',
        textAr: `⚠ خسارة صافية: ${formatArabicCurrency(Math.abs(summary.net_income), numbersOnly ? 'none' : 'EGP', { useArabicNumerals: true })}`,
        textEn: `⚠ Net Loss: ${formatArabicCurrency(Math.abs(summary.net_income), numbersOnly ? 'none' : 'EGP', { useArabicNumerals: false })}`
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
      {!isOnline && (
        <StalenessIndicator
          isStale={true}
          lastUpdated={new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
        />
      )}
      {/* Unified one-row filter bar using advanced implementation */}
      <div className={`${styles.professionalFilterBar} ${styles.noPrint}`}>
        {/* Left Section: Date Filters */}
        {/* Left Section: Scope status + Date Filters */}
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{uiLang === 'ar' ? 'المؤسسة' : 'Organization'}</label>
            <div className={styles.filterValueText}>{currentOrg?.name || '—'}</div>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{uiLang === 'ar' ? 'المشروع' : 'Project'}</label>
            <div className={styles.filterValueText}>{currentProject?.name || (uiLang === 'ar' ? 'كل المشاريع' : 'All Projects')}</div>
          </div>

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
          <div className={styles.languageDisplay}>
            {uiLang === 'ar' ? 'العربية' : 'English'}
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
          {/* Show All button - comprehensive business view */}
          <button
            type="button"
            className={`${styles.actionButton} ${styles.showAll}`}
            onClick={() => {
              // Reset to show all data with meaningful filters
              setDateFrom(startOfYearISO())
              setDateTo(todayISO())
              setIncludeZeros(false) // Hide zero balances for business view
              setPostedOnly(false)
              setDetailedView(true)
            }}
            title={uiLang === 'ar' ? 'عرض جميع البيانات (الحسابات ذات الأرصدة فقط)' : 'Show All Data (Accounts with balances only)'}
            aria-label={uiLang === 'ar' ? 'عرض جميع بيانات قائمة الدخل' : 'Show all profit & loss data'}
            style={{
              fontSize: '14px',
              padding: '8px 16px',
              marginRight: '8px',
              minWidth: '100px',
              backgroundColor: '#28a745',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
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
            🗂️ {uiLang === 'ar' ? 'عرض الكل' : 'Show All'}
          </button>

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
          <div className={styles.reportHeader} style={{ display: 'none' }}>
            <h2>{companyName || (uiLang === 'ar' ? 'الشركة' : 'Company')}</h2>
            <div className={styles.statementTitle}>{uiLang === 'ar' ? 'قائمة الدخل' : 'Profit & Loss Statement'}</div>
            <div className={styles.statementMeta}>
              <span>{uiLang === 'ar' ? 'الفترة' : 'Period'}: {dateFrom} ← {dateTo}</span>
              {currentProject?.id && (
                <span>{uiLang === 'ar' ? 'المشروع' : 'Project'}: {currentProject.name}</span>
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
                          <span className="preview-amount">{formatArabicCurrency(Math.abs(group.total), numbersOnly ? 'none' : 'EGP', { useArabicNumerals: isAr })}</span>
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
                                    <span className="amount">{formatArabicCurrency(Math.abs(row.amount), numbersOnly ? 'none' : 'EGP', { useArabicNumerals: isAr })}</span>
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
                              <span className="subtotal-amount">{formatArabicCurrency(Math.abs(group.total), numbersOnly ? 'none' : 'EGP', { useArabicNumerals: isAr })}</span>
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
                      <span className="calc-amount">{formatArabicCurrency(summary.gross_profit, numbersOnly ? 'none' : 'EGP', { useArabicNumerals: isAr })}</span>
                    </div>
                  </div>

                  <div className="calculation-line operating-income">
                    <span className="calc-label">{uiLang === 'ar' ? 'الدخل التشغيلي' : 'Operating Income'}</span>
                    <div className="calc-amounts">
                      <span className="calc-amount">{formatArabicCurrency(summary.operating_income, numbersOnly ? 'none' : 'EGP', { useArabicNumerals: isAr })}</span>
                    </div>
                  </div>

                  <div className="calculation-line net-income">
                    <span className="calc-label">{uiLang === 'ar' ? 'صافي الدخل' : 'Net Income'}</span>
                    <div className="calc-amounts">
                      <span className={`calc-amount ${summary.net_income >= 0 ? 'profit' : 'loss'}`}>
                        {formatArabicCurrency(summary.net_income, numbersOnly ? 'none' : 'EGP', { useArabicNumerals: isAr })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial ratios */}
                <div className="profit-loss-ratios">
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'هامش الربح الإجمالي' : 'Gross Margin'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(summary.gross_margin_percent.toFixed(2)), 'none', { useArabicNumerals: isAr })}%</span>
                  </div>
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'هامش الربح التشغيلي' : 'Operating Margin'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(summary.operating_margin_percent.toFixed(2)), 'none', { useArabicNumerals: isAr })}%</span>
                  </div>
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'هامش الربح الصافي' : 'Net Margin'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(summary.net_margin_percent.toFixed(2)), 'none', { useArabicNumerals: isAr })}%</span>
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
