
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { exportToExcel, exportToCSV } from '../../utils/UniversalExportManager'
import styles from './TrialBalanceOriginal.module.css'
import './StandardFinancialStatements.css'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { getCompanyConfig } from '../../services/company-config'
import { fetchPrefixRules, type PrefixRule } from '../../services/account-prefix-map'
import {
  Visibility,
  VisibilityOff,
  Bolt,
  Print,
  Refresh,
  IosShare,
  TableView,
  ExpandMore,
  ExpandLess,
  UnfoldMore,
  UnfoldLess,
  PictureAsPdf,
} from '../../components/icons/SimpleIcons';
import { fetchTransactionsDateRange } from '../../services/reports/common';
import { getActiveOrgId } from '../../utils/org';
import { fetchOrganizations, type LookupOption } from '../../services/lookups';
import { PDFGenerator, type PDFOptions, type PDFTableData } from '../../services/pdf-generator';
import { fetchGLSummary, type UnifiedFilters } from '../../services/reports/unified-financial-query';

interface TBRow {
  account_id: string
  code: string
  name: string
  debit: number
  credit: number
  account_type?: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
}

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

export default function TrialBalanceOriginal() {
  const [dateFrom, setDateFrom] = useState<string>(startOfYearISO())
  const [dateTo, setDateTo] = useState<string>(todayISO())
  const [loading, setLoading] = useState<boolean>(false)
  const [rows, setRows] = useState<TBRow[]>([])
  const [error, setError] = useState<string>('')
  const [includeZeros, setIncludeZeros] = useState<boolean>(false)
  const [uiLang, setUiLang] = useState<'ar' | 'en'>('ar')
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')
  const [orgId, setOrgId] = useState<string>('')
  const [_orgOptions, _setOrgOptions] = useState<LookupOption[]>([])
  const [activeGroupsOnly, setActiveGroupsOnly] = useState<boolean>(false)
  const [_prefixRules, _setPrefixRules] = useState<PrefixRule[]>([])
  const [_breakPerGroup, _setBreakPerGroup] = useState<boolean>(false)
  const [postedOnly, setPostedOnly] = useState<boolean>(false)
  // Numbers-only setting (hide currency symbol)
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true)
  // Collapse/expand state for account groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  
  useEffect(() => {
    try {
      const v = localStorage.getItem('tb_numbersOnly')
      if (v !== null) setNumbersOnly(v === 'true')
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('tb_numbersOnly', String(numbersOnly)) } catch {}
  }, [numbersOnly])

  const totals = useMemo(() => {
    const debit = rows.reduce((sum, r) => sum + r.debit, 0)
    const credit = rows.reduce((sum, r) => sum + r.credit, 0)
    return { debit, credit, diff: +(debit - credit).toFixed(2) }
  }, [rows])

  const grouped = useMemo(() => {
    const groups: { key: string; titleAr: string; titleEn: string; rows: TBRow[]; totals: { debit: number; credit: number } }[] = []
    const order = ['assets','liabilities','equity','revenue','expenses']
    const title = (k: string) => ({
      assets: { ar: 'الأصول (Assets)', en: 'Assets' },
      liabilities: { ar: 'الخصوم (Liabilities)', en: 'Liabilities' },
      equity: { ar: 'حقوق الملكية (Equity)', en: 'Equity' },
      revenue: { ar: 'الإيرادات (Revenues)', en: 'Revenues' },
      expenses: { ar: 'المصروفات (Expenses)', en: 'Expenses' },
    } as any)[k] || { ar: k, en: k }
    for (const k of order) {
      const r = rows.filter(x => x.account_type === k)
      const debit = r.reduce((s, x) => s + x.debit, 0)
      const credit = r.reduce((s, x) => s + x.credit, 0)
      if (r.length) groups.push({ key: k, titleAr: title(k).ar, titleEn: title(k).en, rows: r, totals: { debit, credit } })
    }
    const filtered = activeGroupsOnly ? groups.filter(g => (g.totals.debit !== 0 || g.totals.credit !== 0)) : groups
    return filtered
  }, [rows, activeGroupsOnly])

  useEffect(() => {
    // Auto-load once
    loadProjects().then(() => load())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-set date range from first to last transaction for current project (all projects if none)
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
    
    try { const cfg = await getCompanyConfig(); setCompanyName(cfg.company_name || ''); } catch {}
    try { const rules = await fetchPrefixRules(); _setPrefixRules(rules) } catch { /* fallback in classifier */ }
  }

  async function load() {
    try {
      setLoading(true)
      setError('')

      // Use unified-financial-query for guaranteed consistency with all financial reports
      const filters: UnifiedFilters = {
        dateFrom,
        dateTo,
        orgId: orgId || null,
        projectId: projectId || null,
        postedOnly,
      }
      
      const glSummaryData = await fetchGLSummary(filters)
      
      // Helper function to classify account type from account code
      function classifyAccountByCode(code: string): TBRow['account_type'] {
        if (!code) return undefined
        const firstToken = String(code).trim().split(/[^0-9A-Za-z]/)[0]
        const d1 = firstToken.substring(0,1)
        
        if (d1 === '1') return 'assets'
        if (d1 === '2') return 'liabilities'
        if (d1 === '3') return 'equity'
        if (d1 === '4') return 'revenue'
        if (d1 === '5') return 'expenses'
        
        return undefined
      }
      
      // Convert GL Summary data to Trial Balance format
      // GL Summary returns closing_debit and closing_credit which are the account balances
      let out: TBRow[] = (glSummaryData || []).map((row: any) => ({
        account_id: row.account_id,
        code: row.account_code,
        name: row.account_name_ar || row.account_name_en || 'Unknown',
        debit: Number(row.closing_debit || 0),
        credit: Number(row.closing_credit || 0),
        account_type: classifyAccountByCode(row.account_code),
      } as TBRow))

      if (!includeZeros) {
        out = out.filter(r => r.debit !== 0 || r.credit !== 0)
      }

      setRows(out)
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ أثناء تحميل ميزان المراجعة')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Debounced + visibility-aware reload on filter changes
  useEffect(() => {
    let canceled = false
    const t = setTimeout(() => { if (!canceled && !document.hidden) load() }, 250)
    return () => { canceled = true; clearTimeout(t) }
  }, [dateFrom, dateTo, orgId, projectId, postedOnly, includeZeros, activeGroupsOnly])

  function doExport(kind: 'excel' | 'csv') {
    const cols = [
      { key: 'code', header: uiLang === 'ar' ? 'رمز الحساب' : 'Account Code', type: 'text' as const },
      { key: 'name', header: uiLang === 'ar' ? 'اسم الحساب' : 'Account Name', type: 'text' as const },
      { key: 'debit', header: uiLang === 'ar' ? 'مدين' : 'Debit', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
      { key: 'credit', header: uiLang === 'ar' ? 'دائن' : 'Credit', type: 'currency' as const, currency: numbersOnly ? 'none' : 'EGP' },
    ]
    // Flatten grouped structure to export with section headers and subtotals
    const exportRows: any[] = []
    grouped.forEach(g => {
      exportRows.push({ code: uiLang === 'ar' ? g.titleAr : g.titleEn, name: '', debit: g.totals.debit, credit: g.totals.credit })
      g.rows.forEach(r => exportRows.push({ code: r.code, name: r.name, debit: r.debit, credit: r.credit }))
exportRows.push({ code: uiLang === 'ar' ? `إجمالي ${g.titleAr}` : `Subtotal ${g.titleEn}`, name: '', debit: g.totals.debit, credit: g.totals.credit })
    })
    // Append grand total and difference rows
    exportRows.push({ code: uiLang === 'ar' ? 'الإجمالي العام' : 'Grand Total', name: '', debit: totals.debit, credit: totals.credit })
    if (Math.abs(totals.debit - totals.credit) > 0.0001) {
      exportRows.push({ code: uiLang === 'ar' ? 'الفرق' : 'Difference', name: '', debit: '', credit: Math.abs(totals.debit - totals.credit) })
    }
    const data = {
      columns: cols,
      rows: exportRows,
      metadata: {
        prependRows: [
          [uiLang === 'ar' ? 'الشركة' : 'Company', companyName || (uiLang === 'ar' ? 'غير محدد' : 'N/A')],
          [uiLang === 'ar' ? 'الفترة' : 'Period', `${dateFrom} → ${dateTo}`],
          [uiLang === 'ar' ? 'المشروع' : 'Project', projectId ? (projects.find(p => p.id === projectId)?.code + ' — ' + (projects.find(p => p.id === projectId)?.name || '')) : (uiLang === 'ar' ? 'الكل' : 'All')],
        ]
      }
    }
    const opts = { title: uiLang === 'ar' ? 'ميزان المراجعة (أصلي)' : 'Trial Balance (Original)', rtlLayout: uiLang === 'ar' }
    if (kind === 'excel') return exportToExcel(data as any, opts as any)
    return exportToCSV(data as any, opts as any)
  }

  // Professional PDF Export with UI Theme Colors
  async function exportToProfessionalPDF() {
    try {
      // Prepare data for PDF generation
      const columns = [
        { key: 'code', header: uiLang === 'ar' ? 'رمز الحساب' : 'Account Code', width: '100px', align: 'center' as const, type: 'text' as const },
        { key: 'name', header: uiLang === 'ar' ? 'اسم الحساب' : 'Account Name', width: 'auto', align: 'right' as const, type: 'text' as const },
        { key: 'debit', header: uiLang === 'ar' ? 'مدين' : 'Debit', width: '120px', align: 'right' as const, type: 'currency' as const },
        { key: 'credit', header: uiLang === 'ar' ? 'دائن' : 'Credit', width: '120px', align: 'right' as const, type: 'currency' as const },
      ]

      // Build table data with group headers and rows
      const tableRows: any[] = []
      grouped.forEach(group => {
        // Add group header
        tableRows.push({
          code: '',
          name: uiLang === 'ar' ? group.titleAr : group.titleEn,
          debit: '',
          credit: '',
          isGroupHeader: true,
          level: 0
        })
        
        // Add group accounts
        group.rows.forEach(row => {
          tableRows.push({
            code: row.code,
            name: row.name,
            debit: row.debit,
            credit: row.credit,
            isGroupHeader: false,
            level: 1
          })
        })
      })

      const tableData: PDFTableData = {
        columns,
        rows: tableRows,
        totals: {
          totalDebits: totals.debit,
          totalCredits: totals.credit,
          netTotal: totals.diff,
        }
      }

      const options: PDFOptions = {
        title: uiLang === 'ar' ? 'ميزان المراجعة' : 'Trial Balance',
        subtitle: `${uiLang === 'ar' ? 'الفترة من' : 'Period from'} ${dateFrom} ${uiLang === 'ar' ? 'إلى' : 'to'} ${dateTo}`,
        companyName: companyName || (uiLang === 'ar' ? 'الشركة التجارية للمقاولات' : 'Commercial Contracting Company'),
        reportDate: `${dateFrom} ← ${dateTo}`,
        orientation: 'portrait',
        pageSize: 'A4',
        showHeader: true,
        showFooter: true,
        language: uiLang,
        numbersOnly: numbersOnly,
        currencySymbol: numbersOnly ? 'none' : 'ج.م'
      }

      await PDFGenerator.generateFinancialReportPDF(tableData, options)
    } catch (err) {
      console.error('Professional PDF export failed:', err)
      alert(uiLang === 'ar' ? 'فشل في تصدير PDF المهني' : 'Failed to export professional PDF')
    }
  }

  // Legacy PDF Export (keep for backward compatibility)
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
            const header = el.querySelector('.statement-header') as HTMLElement
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
      const filenameBase = uiLang === 'ar' ? 'ميزان_المراجعة' : 'Trial_Balance'
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
          <title>${uiLang === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}</title>
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
            
            /* Table Structure */
            .report-content {
              margin-top: 20px;
            }
            
            .trial-balance-table {
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
              padding: 10px 8px;
              text-align: center;
              font-size: 13px;
              border-right: 1px solid black;
              font-weight: bold;
            }
            
            .table-header th:last-child {
              border-right: none;
            }
            
            .account-group {
              border-bottom: 1px solid #666;
            }
            
            .group-header-row {
              background: white;
              font-weight: bold;
              font-size: 13px;
              border-bottom: 2px solid black;
            }
            
            .group-header-row td {
              padding: 8px;
              color: black;
              font-weight: bold;
              text-align: center;
              border-right: 1px solid black;
            }
            
            .group-header-row td:last-child {
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
            
            .amount-debit, .amount-credit {
              font-family: 'Courier New', monospace;
              font-weight: bold;
              text-align: right;
              width: 120px;
            }
            
            .group-subtotal {
              background: white;
              font-weight: bold;
              font-size: 12px;
              border-top: 1px solid black;
              border-bottom: 2px solid black;
            }
            
            .group-subtotal td {
              padding: 8px;
              color: black;
              font-weight: bold;
              border-right: 1px solid black;
            }
            
            .group-subtotal td:last-child {
              border-right: none;
            }
            
            /* Grand Total Section */
            .grand-total {
              margin-top: 20px;
              border: 2px solid black;
              background: white;
            }
            
            .grand-total-header {
              background: white;
              color: black;
              padding: 10px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              border-bottom: 2px solid black;
            }
            
            .total-row {
              display: flex;
              padding: 8px 12px;
              border-bottom: 1px solid #666;
              font-weight: bold;
              font-size: 13px;
            }
            
            .total-row:last-child {
              border-bottom: none;
              background: white;
              border-top: 2px solid black;
            }
            
            .total-label {
              flex: 1;
              color: black;
              font-weight: bold;
            }
            
            .total-debit, .total-credit {
              width: 120px;
              text-align: right;
              font-family: 'Courier New', monospace;
              color: black;
              font-weight: bold;
              margin-left: 20px;
            }
            
            .balance-status {
              color: black !important;
              font-weight: bold;
              text-align: center;
              padding: 10px;
              margin-top: 10px;
              border: 1px solid black;
            }
            
            .balance-status.balanced {
              background: white;
              color: black !important;
            }
            
            .balance-status.unbalanced {
              background: white;
              color: black !important;
              text-decoration: underline;
            }
            
            /* Print-specific */
            @media print {
              body { padding: 10mm; }
              .account-group { break-inside: avoid; }
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
            <div class="report-title">${uiLang === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}</div>
            <div class="report-period">${uiLang === 'ar' ? 'من' : 'From'}: ${dateFrom} ${uiLang === 'ar' ? 'إلى' : 'To'}: ${dateTo}</div>
            <div class="report-filters">
              <span class="filter-item">${uiLang === 'ar' ? 'المشروع' : 'Project'}: ${projectName}</span>
              <span class="filter-item">${uiLang === 'ar' ? 'تاريخ الطباعة' : 'Print Date'}: ${currentDate}</span>
              ${postedOnly ? `<span class="filter-item">${uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted Only'}</span>` : ''}
              ${activeGroupsOnly ? `<span class="filter-item">${uiLang === 'ar' ? 'مجموعات نشطة فقط' : 'Active Groups Only'}</span>` : ''}
            </div>
          </div>
          
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
    let html = ''
    
    // Trial Balance Table
    html += `
      <table class="trial-balance-table">
        <thead class="table-header">
          <tr>
            <th style="width: 100px;">${uiLang === 'ar' ? 'رمز الحساب' : 'Account Code'}</th>
            <th style="width: 300px;">${uiLang === 'ar' ? 'اسم الحساب' : 'Account Name'}</th>
            <th style="width: 120px;">${uiLang === 'ar' ? 'مدين' : 'Debit'}</th>
            <th style="width: 120px;">${uiLang === 'ar' ? 'دائن' : 'Credit'}</th>
          </tr>
        </thead>
        <tbody>
    `
    
    // Generate grouped content
    grouped.forEach(group => {
      // Group Header
      html += `
        <tr class="group-header-row">
          <td colspan="4">${uiLang === 'ar' ? group.titleAr : group.titleEn}</td>
        </tr>
      `
      
      // Group Accounts
      group.rows.forEach(row => {
        const debitAmount = row.debit !== 0 ? formatArabicCurrency(row.debit, numbersOnly ? 'none' : 'EGP') : ''
        const creditAmount = row.credit !== 0 ? formatArabicCurrency(row.credit, numbersOnly ? 'none' : 'EGP') : ''
        
        html += `
          <tr class="account-row">
            <td class="account-code">${row.code}</td>
            <td class="account-name">${row.name}</td>
            <td class="amount-debit">${debitAmount}</td>
            <td class="amount-credit">${creditAmount}</td>
          </tr>
        `
      })
      
      // Group Subtotal
      html += `
        <tr class="group-subtotal">
          <td colspan="2">${uiLang === 'ar' ? `إجمالي ${group.titleAr}` : `Total ${group.titleEn}`}</td>
          <td class="amount-debit">${formatArabicCurrency(group.totals.debit, numbersOnly ? 'none' : 'EGP')}</td>
          <td class="amount-credit">${formatArabicCurrency(group.totals.credit, numbersOnly ? 'none' : 'EGP')}</td>
        </tr>
      `
    })
    
    html += `
        </tbody>
      </table>
    `
    
    // Grand Total Section
    const balanceStatus = Math.abs(totals.diff) < 0.01 ? 'balanced' : 'unbalanced'
    html += `
      <div class="grand-total">
        <div class="grand-total-header">${uiLang === 'ar' ? 'المجاميع العامة' : 'Grand Totals'}</div>
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'إجمالي المدين' : 'Total Debits'}</div>
          <div class="total-debit">${formatArabicCurrency(totals.debit, numbersOnly ? 'none' : 'EGP')}</div>
          <div class="total-credit"></div>
        </div>
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'إجمالي الدائن' : 'Total Credits'}</div>
          <div class="total-debit"></div>
          <div class="total-credit">${formatArabicCurrency(totals.credit, numbersOnly ? 'none' : 'EGP')}</div>
        </div>
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'الفرق' : 'Difference'}</div>
          <div class="total-debit"></div>
          <div class="total-credit">${Math.abs(totals.diff) < 0.01 ? (uiLang === 'ar' ? 'متوازن ✓' : 'Balanced ✓') : formatArabicCurrency(Math.abs(totals.diff), numbersOnly ? 'none' : 'EGP')}</div>
        </div>
      </div>
    `
    
    // Balance Status
    html += `
      <div class="balance-status ${balanceStatus}">
        ${Math.abs(totals.diff) < 0.01 
          ? (uiLang === 'ar' ? 'ميزان المراجعة متوازن ✓' : 'Trial Balance is Balanced ✓') 
          : (uiLang === 'ar' ? `ميزان المراجعة غير متوازن: فرق ${formatArabicCurrency(Math.abs(totals.diff), numbersOnly ? 'none' : 'EGP')}` : `Trial Balance is Unbalanced: Difference ${formatArabicCurrency(Math.abs(totals.diff), numbersOnly ? 'none' : 'EGP')}`)}
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
    if (orgId) load()  // Only load when we have an org_id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, projectId, includeZeros, activeGroupsOnly, postedOnly, orgId])

  return (
    <div className={styles.container}>
      {/* Unified one-row filter bar using reusable component */}
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

        {/* Center Section: Language + Group Controls + Icon Toggles */}
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
              className={`${styles.featureToggle} ${activeGroupsOnly ? styles.active : ''}`}
              onClick={() => setActiveGroupsOnly(v => !v)}
              title={uiLang === 'ar' ? 'المجموعات ذات الحركة فقط' : 'Only groups with activity'}
              aria-label={uiLang === 'ar' ? 'المجموعات ذات الحركة فقط' : 'Only groups with activity'}
            >
              <Bolt fontSize="small" />
              <span className={styles.toggleText}>{uiLang === 'ar' ? 'النشط فقط' : 'Active Only'}</span>
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
              {numbersOnly ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
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
              setProjectId('')
              setIncludeZeros(false) // Hide zero balances for business view
              setPostedOnly(false)
              setActiveGroupsOnly(true)
            }}
            title={uiLang === 'ar' ? 'عرض جميع البيانات (الحسابات ذات الأرصدة فقط)' : 'Show All Data (Accounts with balances only)'}
            aria-label={uiLang === 'ar' ? 'عرض جميع بيانات ميزان المراجعة' : 'Show all trial balance data'}
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
              aria-label={uiLang === 'ar' ? 'تصدير ميزان المراجعة إلى Excel' : 'Export trial balance to Excel'}
            >
              <IosShare fontSize="small" /> Excel
            </button>
            <button 
              type="button" 
              className={styles.exportButton} 
              onClick={() => doExport('csv')} 
              disabled={loading || rows.length === 0}
              title={uiLang === 'ar' ? 'تصدير إلى CSV' : 'Export to CSV'}
              aria-label={uiLang === 'ar' ? 'تصدير ميزان المراجعة إلى CSV' : 'Export trial balance to CSV'}
            >
              <TableView fontSize="small" /> CSV
            </button>
            <button 
              type="button" 
              className={styles.exportButton}
              onClick={exportToProfessionalPDF} 
              disabled={loading || rows.length === 0}
              title={uiLang === 'ar' ? 'تصدير إلى PDF مهني' : 'Export to Professional PDF'}
              aria-label={uiLang === 'ar' ? 'تصدير ميزان المراجعة إلى PDF مهني بألوان واجهة المستخدم' : 'Export trial balance to professional PDF with UI colors'}
              style={{
                background: 'linear-gradient(135deg, #026081, #0abbfa)',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(2, 96, 129, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #025670, #0299d9)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 96, 129, 0.3)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #026081, #0abbfa)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(2, 96, 129, 0.2)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <PictureAsPdf fontSize="small" /> {uiLang === 'ar' ? 'PDF مهني' : 'Pro PDF'}
            </button>
          </div>
          <button 
            type="button" 
            className={`${styles.actionButton} ${styles.secondary}`} 
            onClick={printReport} 
            disabled={loading || grouped.length === 0}
            title={uiLang === 'ar' ? 'طباعة التقرير' : 'Print the report'}
            aria-label={uiLang === 'ar' ? 'طباعة ميزان المراجعة' : 'Print trial balance report'}
          >
            <Print fontSize="small" /> {uiLang === 'ar' ? 'طباعة' : 'Print'}
          </button>
          <button 
            type="button" 
            className={`${styles.actionButton} ${styles.primary}`} 
            onClick={load} 
            disabled={loading}
            title={uiLang === 'ar' ? 'تحديث البيانات' : 'Refresh the data'}
            aria-label={uiLang === 'ar' ? 'تحديث بيانات ميزان المراجعة' : 'Refresh trial balance data'}
          >
            <Refresh fontSize="small" /> {loading ? (uiLang === 'ar' ? 'جاري التحميل...' : 'Loading...') : (uiLang === 'ar' ? 'تحديث' : 'Refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorAlert}>{error}</div>
      )}

      {/* Legacy report layout replicated from original app */}
      <div className="standard-financial-statements">
        {/* Dedicated export button (legacy approach, not universal) */}
        <div className="export-controls">
          <button onClick={exportToPDF} className="export-pdf-btn" title={uiLang === 'ar' ? 'تصدير إلى PDF' : 'Export to PDF'}>
            <span className="export-icon">📄</span>
            {uiLang === 'ar' ? 'تصدير PDF' : 'Export PDF'}
          </button>
        </div>
        <div id="financial-report-content" className="financial-report-content">
          <div className="statement-header" style={{display: 'none'}}>
            <h1 className="company-name">{companyName || (uiLang === 'ar' ? 'الشركة' : 'Company')}</h1>
            <h2 className="statement-title">{uiLang === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}</h2>
            <h3 className="statement-period">{uiLang === 'ar' ? 'الفترة' : 'Period'}: {dateFrom} ← {dateTo}</h3>
          </div>

          <div className="statement-content">
            <div className="trial-balance-container">
              <div className="trial-balance-header">
                <div className="account-column">{uiLang === 'ar' ? 'اسم الحساب' : 'Account Name'}</div>
                <div className="amounts-columns">
                  <div className="debit-column">{uiLang === 'ar' ? 'مدين' : 'Debit'}</div>
                  <div className="credit-column">{uiLang === 'ar' ? 'دائن' : 'Credit'}</div>
                </div>
              </div>

              {grouped.map((g) => {
                const isCollapsed = collapsedGroups.has(g.key)
                return (
                  <div key={g.key} className="financial-group">
                    <div className="group-header collapsible-header">
                      <button
                        type="button"
                        className="group-toggle-button"
                        onClick={() => toggleGroupCollapse(g.key)}
                        aria-expanded={!isCollapsed}
                        aria-controls={`group-content-${g.key}`}
                        title={isCollapsed 
                          ? (uiLang === 'ar' ? `توسيع ${uiLang === 'ar' ? g.titleAr : g.titleEn}` : `Expand ${g.titleEn}`)
                          : (uiLang === 'ar' ? `طي ${uiLang === 'ar' ? g.titleAr : g.titleEn}` : `Collapse ${g.titleEn}`)
                        }
                      >
                        {isCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                      </button>
                      <h3 
                        className="group-title clickable" 
                        onClick={() => toggleGroupCollapse(g.key)}
                        onKeyDown={(e) => handleGroupKeyDown(e, g.key)}
                        tabIndex={0}
                        role="button"
                      >
                        {uiLang === 'ar' ? g.titleAr : g.titleEn}
                        <span className="account-count">({g.rows.length})</span>
                      </h3>
                      <div className="group-totals-preview">
                        <span className="preview-debit">{formatArabicCurrency(g.totals.debit, numbersOnly ? 'none' : 'EGP')}</span>
                        <span className="preview-credit">{formatArabicCurrency(g.totals.credit, numbersOnly ? 'none' : 'EGP')}</span>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <>
                        <div id={`group-content-${g.key}`} className="group-content">
                          {g.rows.map((r) => (
                            <div key={r.account_id} className="account-line level-0">
                              <div className="account-info">
                                <span className="account-code">{r.code}</span>
                                <span className="account-name">{r.name}</span>
                              </div>
                              <div className="account-amounts">
                                <span className="debit-amount">{r.debit > 0 ? formatArabicCurrency(r.debit, numbersOnly ? 'none' : 'EGP') : '—'}</span>
                                <span className="credit-amount">{r.credit > 0 ? formatArabicCurrency(r.credit, numbersOnly ? 'none' : 'EGP') : '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="group-subtotal">
                          <span className="subtotal-label">{uiLang === 'ar' ? `إجمالي ${g.titleAr}` : `Subtotal ${g.titleEn}`}</span>
                          <div className="subtotal-amounts">
                            <span className="subtotal-debit">{formatArabicCurrency(g.totals.debit, numbersOnly ? 'none' : 'EGP')}</span>
                            <span className="subtotal-credit">{formatArabicCurrency(g.totals.credit, numbersOnly ? 'none' : 'EGP')}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              <div className="trial-balance-totals">
                <span className="totals-label">{uiLang === 'ar' ? 'الإجمالي العام' : 'Grand Total'}</span>
                <div className="totals-amounts">
                  <span className="total-debits">{formatArabicCurrency(totals.debit, numbersOnly ? 'none' : 'EGP')}</span>
                  <span className="total-credits">{formatArabicCurrency(totals.credit, numbersOnly ? 'none' : 'EGP')}</span>
                </div>
              </div>

              <div className="trial-balance-check">
                <div className={`balance-status ${totals.diff === 0 ? 'balanced' : 'unbalanced'}`}>
                  {totals.diff === 0 ? (
                    uiLang === 'ar' ? '✓ ميزان المراجعة متوازن' : '✓ Trial Balance is balanced'
                  ) : (
                    uiLang === 'ar' ? '⚠ ميزان المراجعة غير متوازن' : '⚠ Trial Balance is not balanced'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

