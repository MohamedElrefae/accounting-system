import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { exportToExcel, exportToCSV } from '../../utils/UniversalExportManager'
import styles from './BalanceSheet.module.css'
import './StandardFinancialStatements.css'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { getCompanyConfig } from '../../services/company-config'
import { fetchTransactionsDateRange } from '../../services/reports/common'
import { fetchBalanceSheetReport, type BSFilters, type BSRow } from '../../services/reports/balance-sheet'
import { getActiveOrgId, getActiveProjectId } from '../../utils/org'
import { fetchOrganizations, type LookupOption } from '../../services/lookups'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Bolt from '@mui/icons-material/Bolt'
import Print from '@mui/icons-material/Print'
import Refresh from '@mui/icons-material/Refresh'
import IosShare from '@mui/icons-material/IosShare'
import TableView from '@mui/icons-material/TableView'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import UnfoldMore from '@mui/icons-material/UnfoldMore'
import UnfoldLess from '@mui/icons-material/UnfoldLess'
import TrendingUp from '@mui/icons-material/TrendingUp'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}


interface GroupedBSData {
  key: string
  titleAr: string
  titleEn: string
  rows: BSRow[]
  total: number
}

interface BSData {
  assets: BSRow[]
  liabilities: BSRow[]
  equity: BSRow[]
  total_assets: number
  total_liabilities: number
  total_equity: number
  total_liabilities_and_equity: number
  net_worth: number
  balance_check: number
}

export default function BalanceSheet() {
  const [asOfDate, setAsOfDate] = useState<string>(todayISO())
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<BSData | null>(null)
  const [error, setError] = useState<string>('')
  const [includeZeros, setIncludeZeros] = useState<boolean>(false)
  const [uiLang, setUiLang] = useState<'ar' | 'en'>('ar')
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([])
  const [projectId, setProjectId] = useState<string>(() => { try { return getActiveProjectId() || '' } catch { return '' } })
  const [companyName, setCompanyName] = useState<string>('')
  const [orgId, setOrgId] = useState<string>('')
  const [_orgOptions, _setOrgOptions] = useState<LookupOption[]>([])
  const [detailedView, setDetailedView] = useState<boolean>(true)
  const [postedOnly, setPostedOnly] = useState<boolean>(false)
  // Numbers-only setting (hide currency symbol)
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true)
  // Collapsible groups state - same as P&L
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  
  useEffect(() => {
    try {
      const v = localStorage.getItem('bs_numbersOnly')
      if (v !== null) setNumbersOnly(v === 'true')
    } catch {}
  }, [])
  
  useEffect(() => {
    try { localStorage.setItem('bs_numbersOnly', String(numbersOnly)) } catch {}
  }, [numbersOnly])

  useEffect(() => {
    const useGlobal = (()=>{ try { return localStorage.getItem('bs:useGlobalProject') === '1' } catch { return true } })()
    if (useGlobal) { try { setProjectId(getActiveProjectId() || '') } catch {} }
  }, [orgId])

  // Group rows by account type for better presentation
  const grouped = useMemo((): GroupedBSData[] => {
    if (!data) return []
    
    const groups: GroupedBSData[] = []
    
    const titles = {
      assets: { ar: 'الأصول', en: 'Assets' },
      liabilities: { ar: 'الالتزامات', en: 'Liabilities' },
      equity: { ar: 'حقوق الملكية', en: 'Equity' }
    }

    // Assets section
    if (data.assets.length > 0 || includeZeros) {
      const assetsFiltered = includeZeros ? data.assets : data.assets.filter((r: BSRow) => r.amount !== 0)
      if (assetsFiltered.length > 0) {
        groups.push({
          key: 'assets',
          titleAr: titles.assets.ar,
          titleEn: titles.assets.en,
          rows: assetsFiltered,
          total: data.total_assets
        })
      }
    }

    // Liabilities section
    if (data.liabilities.length > 0 || includeZeros) {
      const liabilitiesFiltered = includeZeros ? data.liabilities : data.liabilities.filter((r: BSRow) => r.amount !== 0)
      if (liabilitiesFiltered.length > 0) {
        groups.push({
          key: 'liabilities',
          titleAr: titles.liabilities.ar,
          titleEn: titles.liabilities.en,
          rows: liabilitiesFiltered,
          total: data.total_liabilities
        })
      }
    }

    // Equity section
    if (data.equity.length > 0 || includeZeros) {
      const equityFiltered = includeZeros ? data.equity : data.equity.filter((r: BSRow) => r.amount !== 0)
      if (equityFiltered.length > 0) {
        groups.push({
          key: 'equity',
          titleAr: titles.equity.ar,
          titleEn: titles.equity.en,
          rows: equityFiltered,
          total: data.total_equity
        })
      }
    }

    return groups
  }, [data, includeZeros])

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
          if (r.max_date) setAsOfDate(r.max_date)
        }
      } catch {}
    })()
  }, [projectId, postedOnly])

  async function loadProjects() {
    const { data: projectData } = await supabase.from('projects').select('id, code, name').eq('status', 'active').order('code')
    setProjects(projectData || [])
    
    // Load organizations and set default
    try { 
      const orgs = await fetchOrganizations(); 
      _setOrgOptions(orgs || [])
      // Set default org from localStorage or first available
      const storedOrgId = getActiveOrgId()
      if (storedOrgId) {
        setOrgId(storedOrgId)
      } else if (orgs && orgs.length > 0) {
        setOrgId(orgs[0].id)
      }
    } catch {}
    
    try { 
      const cfg = await getCompanyConfig()
      setCompanyName(cfg.company_name || '')
    } catch {}
  }

  async function load() {
    try {
      setLoading(true)
      setError('')

      const filters: BSFilters = {
        asOfDate,
        orgId: orgId || null,
        projectId: projectId || null,
        postedOnly
      }

      const result = await fetchBalanceSheetReport(filters)
      
      // Transform the service result into the expected data structure
      const assets = result.rows.filter(r => r.account_type === 'assets')
      const liabilities = result.rows.filter(r => r.account_type === 'liabilities')
      const equity = result.rows.filter(r => r.account_type === 'equity')
      
      const transformedData: BSData = {
        assets,
        liabilities,
        equity,
        total_assets: result.summary.total_assets,
        total_liabilities: result.summary.total_liabilities,
        total_equity: result.summary.total_equity,
        total_liabilities_and_equity: result.summary.total_liabilities + result.summary.total_equity,
        net_worth: result.summary.net_worth,
        balance_check: result.summary.balance_check
      }
      
      setData(transformedData)
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء تحميل الميزانية العمومية')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  function doExport(kind: 'excel' | 'csv') {
    if (!data) return

    const cols = [
      { key: 'account_code', header: uiLang === 'ar' ? 'رمز الحساب' : 'Account Code', type: 'text' as const },
      { key: 'account_name', header: uiLang === 'ar' ? 'اسم الحساب' : 'Account Name', type: 'text' as const },
      { key: 'balance', header: uiLang === 'ar' ? 'الرصيد' : 'Balance', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
    ]

    // Build export data with sections
    const exportRows: any[] = []
    
    // Assets section
    const assetsGroup = grouped.find(g => g.key === 'assets')
    if (assetsGroup) {
      exportRows.push({ account_code: uiLang === 'ar' ? assetsGroup.titleAr : assetsGroup.titleEn, account_name: '', balance: '' })
      assetsGroup.rows.forEach(r => exportRows.push({
        account_code: r.account_code,
        account_name: uiLang === 'ar' ? (r.account_name_ar || r.account_name_en) : (r.account_name_en || r.account_name_ar),
        balance: r.amount
      }))
      exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي الأصول' : 'Total Assets', account_name: '', balance: data.total_assets })
      exportRows.push({ account_code: '', account_name: '', balance: '' })
    }

    // Liabilities section
    const liabilitiesGroup = grouped.find(g => g.key === 'liabilities')
    if (liabilitiesGroup) {
      exportRows.push({ account_code: uiLang === 'ar' ? liabilitiesGroup.titleAr : liabilitiesGroup.titleEn, account_name: '', balance: '' })
      liabilitiesGroup.rows.forEach(r => exportRows.push({
        account_code: r.account_code,
        account_name: uiLang === 'ar' ? (r.account_name_ar || r.account_name_en) : (r.account_name_en || r.account_name_ar),
        balance: r.amount
      }))
      exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي الالتزامات' : 'Total Liabilities', account_name: '', balance: data.total_liabilities })
      exportRows.push({ account_code: '', account_name: '', balance: '' })
    }

    // Equity section
    const equityGroup = grouped.find(g => g.key === 'equity')
    if (equityGroup) {
      exportRows.push({ account_code: uiLang === 'ar' ? equityGroup.titleAr : equityGroup.titleEn, account_name: '', balance: '' })
      equityGroup.rows.forEach(r => exportRows.push({
        account_code: r.account_code,
        account_name: uiLang === 'ar' ? (r.account_name_ar || r.account_name_en) : (r.account_name_en || r.account_name_ar),
        balance: r.amount
      }))
      exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي حقوق الملكية' : 'Total Equity', account_name: '', balance: data.total_equity })
      exportRows.push({ account_code: '', account_name: '', balance: '' })
    }

    // Totals
    exportRows.push({ account_code: uiLang === 'ar' ? 'إجمالي الالتزامات وحقوق الملكية' : 'Total Liabilities & Equity', account_name: '', balance: data.total_liabilities_and_equity })

    const exportData = {
      columns: cols,
      rows: exportRows,
      metadata: {
        prependRows: [
          [uiLang === 'ar' ? 'الشركة' : 'Company', companyName || (uiLang === 'ar' ? 'غير محدد' : 'N/A')],
          [uiLang === 'ar' ? 'كما في تاريخ' : 'As of', asOfDate],
          [uiLang === 'ar' ? 'المشروع' : 'Project', projectId ? (projects.find(p => p.id === projectId)?.code + ' — ' + (projects.find(p => p.id === projectId)?.name || '')) : (uiLang === 'ar' ? 'الكل' : 'All')],
          [''],
          [uiLang === 'ar' ? 'ملخص المؤشرات المالية:' : 'Financial Summary:'],
          [uiLang === 'ar' ? 'إجمالي الأصول' : 'Total Assets', formatArabicCurrency(data.total_assets, numbersOnly ? 'none' : 'EGP')],
          [uiLang === 'ar' ? 'إجمالي الالتزامات' : 'Total Liabilities', formatArabicCurrency(data.total_liabilities, numbersOnly ? 'none' : 'EGP')],
          [uiLang === 'ar' ? 'إجمالي حقوق الملكية' : 'Total Equity', formatArabicCurrency(data.total_equity, numbersOnly ? 'none' : 'EGP')],
          [uiLang === 'ar' ? 'صافي القيمة' : 'Net Worth', formatArabicCurrency(data.net_worth, numbersOnly ? 'none' : 'EGP')],
        ]
      }
    }
    
    const opts = { 
      title: uiLang === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet', 
      rtlLayout: uiLang === 'ar' 
    }
    
    if (kind === 'excel') return exportToExcel(exportData as any, opts as any)
    return exportToCSV(exportData as any, opts as any)
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
      const filenameBase = uiLang === 'ar' ? 'الميزانية_العمومية' : 'Balance_Sheet'
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
    const projectName = projectId ? projects.find(p => p.id === projectId)?.name : (uiLang === 'ar' ? 'كل المشاريع' : 'All Projects')
    
    // Build professional commercial report HTML
    const reportHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${uiLang === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}</title>
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
            
            .report-date {
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
            
            /* Table Structure */
            .report-content {
              margin-top: 20px;
            }
            
            .financial-section {
              margin-bottom: 20px;
              border: 1px solid black;
              background: white;
            }
            
            .section-header {
              background: white;
              border-bottom: 2px solid black;
              padding: 8px 12px;
              font-weight: bold;
              font-size: 14px;
              color: black;
              text-align: center;
            }
            
            .account-row {
              display: flex;
              border-bottom: 1px solid #666;
              padding: 6px 12px;
              background: white;
            }
            
            .account-row:hover {
              background: white;
            }
            
            .account-code {
              width: 80px;
              font-family: 'Courier New', monospace;
              font-weight: bold;
              color: black;
              font-size: 11px;
            }
            
            .account-name {
              flex: 1;
              color: black;
              font-weight: normal;
              padding: 0 10px;
            }
            
            .account-amount {
              width: 120px;
              text-align: right;
              font-family: 'Courier New', monospace;
              font-weight: bold;
              color: black;
            }
            
            .section-total {
              display: flex;
              border-top: 2px solid black;
              background: white;
              padding: 8px 12px;
              font-weight: bold;
              font-size: 13px;
              color: black;
            }
            
            .total-label {
              flex: 1;
              font-weight: bold;
            }
            
            .total-amount {
              width: 120px;
              text-align: right;
              font-family: 'Courier New', monospace;
              font-weight: bold;
              border-bottom: 3px double black;
            }
            
            /* Summary Section */
            .summary-section {
              margin-top: 30px;
              border: 2px solid black;
              background: white;
            }
            
            .summary-header {
              background: white;
              color: black;
              padding: 10px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              border-bottom: 2px solid black;
            }
            
            .summary-row {
              display: flex;
              padding: 8px 12px;
              border-bottom: 1px solid #666;
              font-weight: bold;
            }
            
            .summary-row:last-child {
              border-bottom: none;
              background: white;
              font-size: 14px;
              border-top: 2px solid black;
            }
            
            .summary-label {
              flex: 1;
              color: black;
            }
            
            .summary-amount {
              width: 120px;
              text-align: right;
              font-family: 'Courier New', monospace;
              color: black;
            }
            
            .balance-check {
              color: black !important;
              font-weight: bold;
            }
            
            .balance-check.balanced {
              color: black !important;
            }
            
            .balance-check.unbalanced {
              color: black !important;
              text-decoration: underline;
            }
            
            /* Ratios Section */
            .ratios-section {
              margin-top: 20px;
              border: 1px solid black;
              background: white;
            }
            
            .ratios-header {
              background: white;
              color: black;
              padding: 8px;
              text-align: center;
              font-weight: bold;
              border-bottom: 1px solid black;
            }
            
            .ratio-row {
              display: flex;
              padding: 5px 12px;
              border-bottom: 1px solid #ccc;
              font-size: 11px;
            }
            
            .ratio-row:last-child {
              border-bottom: none;
            }
            
            .ratio-label {
              flex: 1;
              color: black;
            }
            
            .ratio-value {
              width: 80px;
              text-align: right;
              font-family: 'Courier New', monospace;
              font-weight: bold;
              color: black;
            }
            
            /* Print-specific */
            @media print {
              body { padding: 10mm; }
              .financial-section { break-inside: avoid; }
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
            <div class="report-title">${uiLang === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}</div>
            <div class="report-date">${uiLang === 'ar' ? 'كما في تاريخ' : 'As of'}: ${asOfDate}</div>
            <div class="report-filters">
              <span class="filter-item">${uiLang === 'ar' ? 'المشروع' : 'Project'}: ${projectName}</span>
              <span class="filter-item">${uiLang === 'ar' ? 'تاريخ الطباعة' : 'Print Date'}: ${currentDate}</span>
              ${postedOnly ? `<span class="filter-item">${uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted Only'}</span>` : ''}
              <span class="filter-item">${uiLang === 'ar' ? 'العرض' : 'View'}: ${detailedView ? (uiLang === 'ar' ? 'تفصيلي' : 'Detailed') : (uiLang === 'ar' ? 'ملخص' : 'Summary')}</span>
            </div>
          </div>
          
          <!-- Report Content -->
          <div class="report-content">
            ${data ? generatePrintContent() : ''}
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
    if (!data) return ''
    
    let html = ''
    
    // Assets Section
    const assetsGroup = grouped.find(g => g.key === 'assets')
    if (assetsGroup) {
      html += `
        <div class="financial-section">
          <div class="section-header">${uiLang === 'ar' ? assetsGroup.titleAr : assetsGroup.titleEn}</div>
          ${detailedView ? assetsGroup.rows.map(row => `
            <div class="account-row">
              <div class="account-code">${row.account_code}</div>
              <div class="account-name">${uiLang === 'ar' ? (row.account_name_ar || row.account_name_en) : (row.account_name_en || row.account_name_ar)}</div>
              <div class="account-amount">${formatArabicCurrency(Math.abs(row.amount), numbersOnly ? 'none' : 'EGP')}</div>
            </div>
          `).join('') : ''}
          <div class="section-total">
            <div class="total-label">${uiLang === 'ar' ? 'إجمالي الأصول' : 'Total Assets'}</div>
            <div class="total-amount">${formatArabicCurrency(data.total_assets, numbersOnly ? 'none' : 'EGP')}</div>
          </div>
        </div>
      `
    }
    
    // Liabilities Section
    const liabilitiesGroup = grouped.find(g => g.key === 'liabilities')
    if (liabilitiesGroup) {
      html += `
        <div class="financial-section">
          <div class="section-header">${uiLang === 'ar' ? liabilitiesGroup.titleAr : liabilitiesGroup.titleEn}</div>
          ${detailedView ? liabilitiesGroup.rows.map(row => `
            <div class="account-row">
              <div class="account-code">${row.account_code}</div>
              <div class="account-name">${uiLang === 'ar' ? (row.account_name_ar || row.account_name_en) : (row.account_name_en || row.account_name_ar)}</div>
              <div class="account-amount">${formatArabicCurrency(Math.abs(row.amount), numbersOnly ? 'none' : 'EGP')}</div>
            </div>
          `).join('') : ''}
          <div class="section-total">
            <div class="total-label">${uiLang === 'ar' ? 'إجمالي الالتزامات' : 'Total Liabilities'}</div>
            <div class="total-amount">${formatArabicCurrency(data.total_liabilities, numbersOnly ? 'none' : 'EGP')}</div>
          </div>
        </div>
      `
    }
    
    // Equity Section
    const equityGroup = grouped.find(g => g.key === 'equity')
    if (equityGroup) {
      html += `
        <div class="financial-section">
          <div class="section-header">${uiLang === 'ar' ? equityGroup.titleAr : equityGroup.titleEn}</div>
          ${detailedView ? equityGroup.rows.map(row => `
            <div class="account-row">
              <div class="account-code">${row.account_code}</div>
              <div class="account-name">${uiLang === 'ar' ? (row.account_name_ar || row.account_name_en) : (row.account_name_en || row.account_name_ar)}</div>
              <div class="account-amount">${formatArabicCurrency(Math.abs(row.amount), numbersOnly ? 'none' : 'EGP')}</div>
            </div>
          `).join('') : ''}
          <div class="section-total">
            <div class="total-label">${uiLang === 'ar' ? 'إجمالي حقوق الملكية' : 'Total Equity'}</div>
            <div class="total-amount">${formatArabicCurrency(data.total_equity, numbersOnly ? 'none' : 'EGP')}</div>
          </div>
        </div>
      `
    }
    
    // Summary Section
    const balanceStatus = Math.abs(data.balance_check) < 0.01 ? 'balanced' : 'unbalanced'
    html += `
      <div class="summary-section">
        <div class="summary-header">${uiLang === 'ar' ? 'ملخص الميزانية العمومية' : 'Balance Sheet Summary'}</div>
        <div class="summary-row">
          <div class="summary-label">${uiLang === 'ar' ? 'إجمالي الأصول' : 'Total Assets'}</div>
          <div class="summary-amount">${formatArabicCurrency(data.total_assets, numbersOnly ? 'none' : 'EGP')}</div>
        </div>
        <div class="summary-row">
          <div class="summary-label">${uiLang === 'ar' ? 'إجمالي الالتزامات وحقوق الملكية' : 'Total Liabilities & Equity'}</div>
          <div class="summary-amount">${formatArabicCurrency(data.total_liabilities_and_equity, numbersOnly ? 'none' : 'EGP')}</div>
        </div>
        <div class="summary-row">
          <div class="summary-label">${uiLang === 'ar' ? 'التوازن المحاسبي' : 'Balance Check'}</div>
          <div class="summary-amount balance-check ${balanceStatus}">
            ${Math.abs(data.balance_check) < 0.01 ? (uiLang === 'ar' ? 'متوازنة ✓' : 'Balanced ✓') : formatArabicCurrency(data.balance_check, numbersOnly ? 'none' : 'EGP')}
          </div>
        </div>
      </div>
    `
    
    // Financial Ratios Section
    html += `
      <div class="ratios-section">
        <div class="ratios-header">${uiLang === 'ar' ? 'النسب المالية الرئيسية' : 'Key Financial Ratios'}</div>
        <div class="ratio-row">
          <div class="ratio-label">${uiLang === 'ar' ? 'نسبة المديونية' : 'Debt Ratio'}</div>
          <div class="ratio-value">${formatArabicCurrency(parseFloat(((data.total_liabilities / data.total_assets) * 100).toFixed(2)), 'none')}%</div>
        </div>
        <div class="ratio-row">
          <div class="ratio-label">${uiLang === 'ar' ? 'نسبة حقوق الملكية' : 'Equity Ratio'}</div>
          <div class="ratio-value">${formatArabicCurrency(parseFloat(((data.total_equity / data.total_assets) * 100).toFixed(2)), 'none')}%</div>
        </div>
        <div class="ratio-row">
          <div class="ratio-label">${uiLang === 'ar' ? 'معدل العائد على الأصول' : 'Return on Assets'}</div>
          <div class="ratio-value">${formatArabicCurrency(parseFloat(((data.net_worth / data.total_assets) * 100).toFixed(2)), 'none')}%</div>
        </div>
        <div class="ratio-row">
          <div class="ratio-label">${uiLang === 'ar' ? 'معدل العائد على حقوق الملكية' : 'Return on Equity'}</div>
          <div class="ratio-value">${data.total_equity !== 0 ? formatArabicCurrency(parseFloat(((data.net_worth / data.total_equity) * 100).toFixed(2)), 'none') : formatArabicCurrency(0, 'none')}%</div>
        </div>
      </div>
    `
    
    return html
  }

  // Collapsible group functions - same as P&L
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  const handleGroupKeyDown = (e: React.KeyboardEvent<HTMLElement>, groupKey: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleGroupCollapse(groupKey)
    }
  }

  // Group control functions - same as P&L
  const expandAllGroups = () => {
    setCollapsedGroups(new Set())
  }

  const collapseAllGroups = () => {
    setCollapsedGroups(new Set(grouped.map(g => g.key)))
  }

  useEffect(() => {
    // Auto reload when inputs change
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfDate, projectId, includeZeros, postedOnly])

  // Balance status
  const balanceStatus = useMemo(() => {
    if (!data) return null
    
    const isBalanced = Math.abs(data.balance_check) < 0.01
    
    return {
      status: isBalanced ? 'balanced' : 'unbalanced',
      textAr: isBalanced ? 'متوازنة ✓' : `غير متوازنة: فرق ${formatArabicCurrency(Math.abs(data.balance_check), numbersOnly ? 'none' : 'EGP')}`,
      textEn: isBalanced ? 'Balanced ✓' : `Unbalanced: Difference ${formatArabicCurrency(Math.abs(data.balance_check), numbersOnly ? 'none' : 'EGP')}`
    }
  }, [data, numbersOnly])

  return (
    <div className={styles.container}>
      {/* Unified one-row filter bar using advanced implementation - EXACT copy from P&L */}
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
            value={asOfDate} 
            onChange={e => setAsOfDate(e.target.value)} 
            aria-label={uiLang === 'ar' ? 'كما في تاريخ' : 'As of'} 
            title={uiLang === 'ar' ? 'تاريخ الميزانية' : 'Balance sheet date'}
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
          {/* Show All button - comprehensive business view */}
          <button
            type="button"
            className={`${styles.actionButton} ${styles.showAll}`}
            onClick={() => {
              // Reset to show all data with meaningful filters
              setAsOfDate(todayISO())
              setProjectId('')
              setIncludeZeros(false) // Hide zero balances for business view
              setPostedOnly(false)
              setDetailedView(true)
            }}
            title={uiLang === 'ar' ? 'عرض جميع البيانات (الحسابات ذات الأرصدة فقط)' : 'Show All Data (Accounts with balances only)'}
            aria-label={uiLang === 'ar' ? 'عرض جميع بيانات الميزانية' : 'Show all balance sheet data'}
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
              disabled={loading || grouped.length === 0}
              title={uiLang === 'ar' ? 'تصدير إلى Excel' : 'Export to Excel'}
              aria-label={uiLang === 'ar' ? 'تصدير الميزانية إلى Excel' : 'Export balance sheet to Excel'}
            >
              <IosShare fontSize="small" /> Excel
            </button>
            <button 
              type="button" 
              className={styles.exportButton} 
              onClick={() => doExport('csv')} 
              disabled={loading || grouped.length === 0}
              title={uiLang === 'ar' ? 'تصدير إلى CSV' : 'Export to CSV'}
              aria-label={uiLang === 'ar' ? 'تصدير الميزانية إلى CSV' : 'Export balance sheet to CSV'}
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
            aria-label={uiLang === 'ar' ? 'طباعة الميزانية العمومية' : 'Print balance sheet report'}
          >
            <Print fontSize="small" /> {uiLang === 'ar' ? 'طباعة' : 'Print'}
          </button>
          <button 
            type="button" 
            className={`${styles.actionButton} ${styles.primary}`} 
            onClick={load} 
            disabled={loading}
            title={uiLang === 'ar' ? 'تحديث البيانات' : 'Refresh the data'}
            aria-label={uiLang === 'ar' ? 'تحديث بيانات الميزانية العمومية' : 'Refresh balance sheet data'}
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
            <div className={styles.statementTitle}>{uiLang === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}</div>
            <div className={styles.statementMeta}>
              <span>{uiLang === 'ar' ? 'كما في تاريخ' : 'As of'}: {asOfDate}</span>
              {projectId && (
                <span>{uiLang === 'ar' ? 'المشروع' : 'Project'}: {projects.find(p => p.id === projectId)?.name || projectId}</span>
              )}
              {postedOnly && (
                <span>{uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted only'}</span>
              )}
            </div>
            {balanceStatus && (
              <div className={`${styles.statusBanner} ${styles[`status${balanceStatus.status.charAt(0).toUpperCase() + balanceStatus.status.slice(1)}`]}`}>
                {uiLang === 'ar' ? balanceStatus.textAr : balanceStatus.textEn}
              </div>
            )}
          </div>

          <div className="statement-content">
            {data && (
              <div className="balance-sheet-container">
                <div className="balance-sheet-header">
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

                {/* Key Balance Sheet calculations */}
                <div className="balance-sheet-calculations">
                  <div className="calculation-line total-assets">
                    <span className="calc-label">{uiLang === 'ar' ? 'إجمالي الأصول' : 'Total Assets'}</span>
                    <div className="calc-amounts">
                      <span className="calc-amount">{formatArabicCurrency(data.total_assets, numbersOnly ? 'none' : 'EGP')}</span>
                    </div>
                  </div>

                  <div className="calculation-line total-liabilities-equity">
                    <span className="calc-label">{uiLang === 'ar' ? 'إجمالي الالتزامات وحقوق الملكية' : 'Total Liabilities & Equity'}</span>
                    <div className="calc-amounts">
                      <span className="calc-amount">{formatArabicCurrency(data.total_liabilities_and_equity, numbersOnly ? 'none' : 'EGP')}</span>
                    </div>
                  </div>

                  <div className="calculation-line balance-check">
                    <span className="calc-label">{uiLang === 'ar' ? 'التوازن المحاسبي' : 'Balance Check'}</span>
                    <div className="calc-amounts">
                      <span className={`calc-amount ${Math.abs(data.balance_check) < 0.01 ? 'balanced' : 'unbalanced'}`}>
                        {Math.abs(data.balance_check) < 0.01 ? (uiLang === 'ar' ? 'متوازنة ✓' : 'Balanced ✓') : formatArabicCurrency(data.balance_check, numbersOnly ? 'none' : 'EGP')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial ratios */}
                <div className="balance-sheet-ratios">
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'نسبة المديونية' : 'Debt Ratio'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(((data.total_liabilities / data.total_assets) * 100).toFixed(2)), 'none')}%</span>
                  </div>
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'نسبة حقوق الملكية' : 'Equity Ratio'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(((data.total_equity / data.total_assets) * 100).toFixed(2)), 'none')}%</span>
                  </div>
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'معدل العائد على الأصول' : 'Return on Assets'}</span>
                    <span className="ratio-value">{formatArabicCurrency(parseFloat(((data.net_worth / data.total_assets) * 100).toFixed(2)), 'none')}%</span>
                  </div>
                  <div className="ratio-line">
                    <span className="ratio-label">{uiLang === 'ar' ? 'معدل العائد على حقوق الملكية' : 'Return on Equity'}</span>
                    <span className="ratio-value">{data.total_equity !== 0 ? formatArabicCurrency(parseFloat(((data.net_worth / data.total_equity) * 100).toFixed(2)), 'none') : formatArabicCurrency(0, 'none')}%</span>
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
