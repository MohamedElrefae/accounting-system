import React, { useEffect, useMemo, useRef, useState } from 'react'
import styles from './TrialBalanceAllLevels.module.css'
import './StandardFinancialStatements.css'
import { supabase } from '../../utils/supabase'
import { formatArabicCurrency } from '../../utils/ArabicTextEngine'
import { type ExplorerMode } from '../../components/Reports/AccountColumns'
import { exportToExcel, exportToCSV } from '../../utils/UniversalExportManager'
import type { UniversalTableData, UniversalTableColumn } from '../../utils/UniversalExportManager'
import { getCompanyConfig } from '../../services/company-config'
import { fetchProjects, fetchOrganizations, type LookupOption } from '../../services/lookups'
import IosShare from '@mui/icons-material/IosShare'
import TableView from '@mui/icons-material/TableView'
import Print from '@mui/icons-material/Print'
import Refresh from '@mui/icons-material/Refresh'
import UnfoldMore from '@mui/icons-material/UnfoldMore'
import UnfoldLess from '@mui/icons-material/UnfoldLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

// Page: Trial Balance (All Levels) — hierarchical expand/collapse with L1..L4 & All
// Reuses Account Explorer RPC for accurate period/opening/closing numbers.

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

export default function TrialBalanceAllLevels() {
  // Filters
  const [mode, setMode] = useState<ExplorerMode>('range') // range => show period columns, asof => opening/closing toggle
  const [dateFrom, setDateFrom] = useState<string>(startOfYearISO())
  const [dateTo, setDateTo] = useState<string>(todayISO())
  const [postedOnly, setPostedOnly] = useState<boolean>(false)
  const [projectId, setProjectId] = useState<string>('')
  const [projectOptions, setProjectOptions] = useState<LookupOption[]>([])
  const [orgOptions, setOrgOptions] = useState<LookupOption[]>([])
  const [orgId, setOrgId] = useState<string>('')

  // Toggles
  const [numbersOnly, setNumbersOnly] = useState<boolean>(true) // export numbers only
  const [includeZeros, setIncludeZeros] = useState<boolean>(false)
  const [uiLang, setUiLang] = useState<'ar' | 'en'>('ar')

  // Data
  type TBAmounts = { opening_debit: number; opening_credit: number; period_debits: number; period_credits: number; closing_debit: number; closing_credit: number }
  type TBNode = { id: string; code: string; name: string; name_ar: string | null; level: number; parent_id: string | null; status: string; category: string | null; children: TBNode[]; amounts: TBAmounts; rollup: TBAmounts }
  const [roots, setRoots] = useState<TBNode[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [companyName, setCompanyName] = useState<string>('')

  // Supabase row types
  type DBAccount = {
    id: string
    code: string
    name: string
    name_ar: string | null
    level: number
    parent_id: string | null
    status: string
    category: string | null
    org_id: string
  }
  type GLSummaryRow = {
    account_id: string
    opening_debit?: number | null
    opening_credit?: number | null
    period_debits?: number | null
    period_credits?: number | null
    closing_debit?: number | null
    closing_credit?: number | null
  }

  const orgIdRef = useRef<string | null>(null)

  // Persist numbersOnly like other pages
  useEffect(() => { try { const v = localStorage.getItem('tb_all_numbersOnly'); if (v !== null) setNumbersOnly(v === 'true') } catch { /* noop */ } }, [])
  useEffect(() => { try { localStorage.setItem('tb_all_numbersOnly', String(numbersOnly)) } catch { /* noop */ } }, [numbersOnly])

  // Load company and projects
  useEffect(() => {
    (async () => {
      try { const cfg = await getCompanyConfig(); setCompanyName(cfg?.company_name || '') } catch { /* noop */ }
      try { const orgs = await fetchOrganizations(); setOrgOptions(orgs || []); } catch { /* noop */ }
      try { const projs = await fetchProjects(); setProjectOptions(projs || []) } catch { /* noop */ }
      // Default org selection: prefer stored, else first
      try {
        const { getActiveOrgId } = require('../../utils/org');
        const stored = getActiveOrgId?.();
        if (stored) setOrgId(stored);
        else if (orgOptions.length > 0) setOrgId(orgOptions[0].id);
      } catch { /* noop */ }
    })()
  }, [])

  // Keep ref in sync with state for RPC calls
  useEffect(() => { orgIdRef.current = orgId || null }, [orgId])

  // Auto-set date range - removed account explorer dependency

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      // 1) Fetch accounts for selected org
      let accQ = supabase
        .from('accounts')
        .select('id, code, name, name_ar, level, parent_id, status, category, org_id')
        .order('code', { ascending: true })
      if (orgIdRef.current) accQ = accQ.eq('org_id', orgIdRef.current)
      const accRes = await accQ
      if (accRes.error) throw accRes.error
      const accounts = (accRes.data || []) as DBAccount[]

      // 2) Fetch GL summary for current filters
      const { data: summaryData, error: sumErr } = await supabase.rpc('get_gl_account_summary', {
        p_date_from: mode === 'range' ? (dateFrom || null) : null,
        p_date_to: dateTo || null,
        p_org_id: orgIdRef.current || null,
        p_project_id: projectId || null,
        p_posted_only: postedOnly,
        p_limit: null,
        p_offset: null,
      })
      if (sumErr) throw sumErr
      const summaryRows = (summaryData || []) as GLSummaryRow[]
      const amountsById = new Map<string, TBAmounts>()
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

      // 3) Build nodes map
      const nodeMap = new Map<string, TBNode>()
      for (const a of accounts) {
        const amt = amountsById.get(a.id) || { opening_debit: 0, opening_credit: 0, period_debits: 0, period_credits: 0, closing_debit: 0, closing_credit: 0 }
        const n: TBNode = {
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
          rollup: { opening_debit: 0, opening_credit: 0, period_debits: 0, period_credits: 0, closing_debit: 0, closing_credit: 0 },
        }
        nodeMap.set(a.id, n)
      }
      // 4) Link children
      const rootsLocal: TBNode[] = []
      for (const n of nodeMap.values()) {
        if (n.parent_id && nodeMap.has(n.parent_id)) {
          nodeMap.get(n.parent_id)!.children.push(n)
        } else {
          rootsLocal.push(n)
        }
      }
      // 5) Rollup (post-order)
      const sumAmounts = (a: TBAmounts, b: TBAmounts): TBAmounts => ({
        opening_debit: a.opening_debit + b.opening_debit,
        opening_credit: a.opening_credit + b.opening_credit,
        period_debits: a.period_debits + b.period_debits,
        period_credits: a.period_credits + b.period_credits,
        closing_debit: a.closing_debit + b.closing_debit,
        closing_credit: a.closing_credit + b.closing_credit,
      })
      const dfs = (node: TBNode): TBAmounts => {
        let acc = { ...node.amounts }
        for (const c of node.children) {
          const rc = dfs(c)
          acc = sumAmounts(acc, rc)
        }
        node.rollup = acc
        return acc
      }
      for (const r of rootsLocal) dfs(r)

      setRoots(rootsLocal)
      // Expand L1 by default
      const l1 = new Set<string>()
      for (const r of rootsLocal) l1.add(r.id)
      setExpanded(l1)
    } catch (e: unknown) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : undefined
      setError(msg || (uiLang === 'ar' ? 'فشل تحميل ميزان المراجعة' : 'Failed to load Trial Balance'))
      setRoots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData().catch(() => { /* noop */ }) }, [mode, postedOnly, orgId, projectId, dateFrom, dateTo])

  // Expand to target level 1..4
  async function expandToLevel(targetLevel: number) {
    const newExpanded = new Set<string>()
    const walk = (node: TBNode) => {
      if (node.level <= targetLevel) newExpanded.add(node.id)
      if (node.children && node.children.length) node.children.forEach(walk)
    }
    roots.forEach(walk)
    setExpanded(newExpanded)
  }

  function collapseAll() { setExpanded(new Set()) }
  function expandAll() {
    const newSet = new Set<string>()
    const walk = (node: TBNode) => { newSet.add(node.id); node.children.forEach(walk) }
    roots.forEach(walk)
    setExpanded(newSet)
  }

  // Visible nodes (DFS respecting expanded)
  const visibleNodes = useMemo(() => {
    const out: TBNode[] = []
    const dfs = (node: TBNode) => {
      out.push(node)
      if (expanded.has(node.id)) node.children.forEach(dfs)
    }
    roots.forEach(dfs)
    return out
  }, [roots, expanded])

  // Export visible rows
  async function exportVisible(kind: 'excel' | 'csv') {
    if (!visibleNodes.length) return
    const modeTitle = mode === 'range' ? (uiLang === 'ar' ? 'الوضع: حركة خلال فترة' : 'Mode: Range') : (uiLang === 'ar' ? 'الوضع: أرصدة حتى تاريخ' : 'Mode: As-Of')
    const title = (uiLang === 'ar' ? 'ميزان المراجعة (شجري)' : 'Trial Balance (All Levels)') + ' — ' + modeTitle
    const cols: UniversalTableColumn[] = (mode === 'range'
      ? [
          { key: 'code', header: uiLang === 'ar' ? 'الكود' : 'Code', type: 'text' },
          { key: 'name', header: uiLang === 'ar' ? 'اسم الحساب' : 'Account', type: 'text' },
          { key: 'period_debits', header: uiLang === 'ar' ? 'مدين الفترة' : 'Period Debits', type: 'currency', currency: numbersOnly ? 'none' : 'EGP' },
          { key: 'period_credits', header: uiLang === 'ar' ? 'دائن الفترة' : 'Period Credits', type: 'currency', currency: numbersOnly ? 'none' : 'EGP' },
        ]
      : [
          { key: 'code', header: uiLang === 'ar' ? 'الكود' : 'Code', type: 'text' },
          { key: 'name', header: uiLang === 'ar' ? 'اسم الحساب' : 'Account', type: 'text' },
          { key: 'closing_debit', header: uiLang === 'ar' ? 'ختامي مدين' : 'Closing Debit', type: 'currency', currency: numbersOnly ? 'none' : 'EGP' },
          { key: 'closing_credit', header: uiLang === 'ar' ? 'ختامي دائن' : 'Closing Credit', type: 'currency', currency: numbersOnly ? 'none' : 'EGP' },
        ]) as UniversalTableColumn[]
    const rows = visibleNodes
      .filter(n => includeZeros || !isZero(n))
      .map(n => ({
        code: n.code,
        name: n.name_ar || n.name,
        period_debits: Number(n.rollup.period_debits || 0),
        period_credits: Number(n.rollup.period_credits || 0),
        closing_debit: Number(n.rollup.closing_debit || 0),
        closing_credit: Number(n.rollup.closing_credit || 0),
      }))
    const data: UniversalTableData = { columns: cols, rows }
    if (kind === 'excel') await exportToExcel(data, { title, rtlLayout: uiLang === 'ar', useArabicNumerals: true })
    else await exportToCSV(data, { title, rtlLayout: uiLang === 'ar', useArabicNumerals: true })
  }

  // Professional print function like original Trial Balance
  function printReport() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Prepare report data
    const currentDate = new Date().toLocaleDateString('ar-EG')
    const projectName = projectId ? projectOptions.find(p => p.id === projectId)?.name : (uiLang === 'ar' ? 'كل المشاريع' : 'All Projects')
    
    // Build professional commercial report HTML
    const reportHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${uiLang === 'ar' ? 'ميزان المراجعة (جميع المستويات)' : 'Trial Balance (All Levels)'}</title>
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
              background: #f0f0f0;
              font-weight: bold;
              font-size: 13px;
              border-bottom: 1px solid black;
            }
            
            .group-header-row td {
              padding: 8px;
              color: black;
              font-weight: bold;
              text-align: right;
              border-right: 1px solid black;
            }
            
            .group-header-row td:last-child {
              border-right: none;
            }
            
            .account-row {
              border-bottom: 1px solid #eee;
              background: white;
            }
            
            .account-row.level-0 {
              background: white;
            }
            
            .account-row.level-1 {
              background: white;
              padding-left: 15px;
            }
            
            .account-row.level-2 {
              background: white;
              padding-left: 30px;
            }
            
            .account-row.level-3 {
              background: white;
              padding-left: 45px;
            }
            
            .account-row.level-4 {
              background: white;
              padding-left: 60px;
            }
            
            .account-row td {
              padding: 6px 8px;
              color: black;
              font-size: 11px;
              border-right: 1px solid #ddd;
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
            <div class="report-title">${uiLang === 'ar' ? 'ميزان المراجعة (جميع المستويات)' : 'Trial Balance (All Levels)'}</div>
            <div class="report-period">${mode === 'range' ? `${uiLang === 'ar' ? 'من' : 'From'}: ${dateFrom} ${uiLang === 'ar' ? 'إلى' : 'To'}: ${dateTo}` : `${uiLang === 'ar' ? 'حتى تاريخ' : 'As of'}: ${dateTo}`}</div>
            <div class="report-filters">
              <span class="filter-item">${uiLang === 'ar' ? 'المشروع' : 'Project'}: ${projectName}</span>
              <span class="filter-item">${uiLang === 'ar' ? 'تاريخ الطباعة' : 'Print Date'}: ${currentDate}</span>
              ${postedOnly ? `<span class="filter-item">${uiLang === 'ar' ? 'قيود معتمدة فقط' : 'Posted Only'}</span>` : ''}
              ${!includeZeros ? `<span class="filter-item">${uiLang === 'ar' ? 'إخفاء الأصفار' : 'Hide Zeros'}</span>` : ''}
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
            ${mode === 'range' ? `
              <th style="width: 120px;">${uiLang === 'ar' ? 'مدين الفترة' : 'Period Debit'}</th>
              <th style="width: 120px;">${uiLang === 'ar' ? 'دائن الفترة' : 'Period Credit'}</th>
            ` : `
              <th style="width: 120px;">${uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit'}</th>
              <th style="width: 120px;">${uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit'}</th>
            `}
          </tr>
        </thead>
        <tbody>
    `
    
    // Generate hierarchical content
    const renderNodePrint = (node: TBNode, level: number): string => {
      if (!includeZeros && isZero(node)) return ''
      
      const debit = mode === 'range' ? node.rollup.period_debits : node.rollup.closing_debit
      const credit = mode === 'range' ? node.rollup.period_credits : node.rollup.closing_credit
      
      const debitAmount = debit > 0 ? formatArabicCurrency(debit, numbersOnly ? 'none' : 'EGP') : ''
      const creditAmount = credit > 0 ? formatArabicCurrency(credit, numbersOnly ? 'none' : 'EGP') : ''
      
      const indent = '&nbsp;'.repeat(level * 4)
      
      let result = `
        <tr class="account-row level-${level}">
          <td class="account-code">${node.code}</td>
          <td class="account-name">${indent}${node.name_ar || node.name}</td>
          <td class="amount-debit">${debitAmount}</td>
          <td class="amount-credit">${creditAmount}</td>
        </tr>
      `
      
      // Add children if expanded
      if (expanded.has(node.id) && node.children.length > 0) {
        for (const child of node.children) {
          result += renderNodePrint(child, level + 1)
        }
      }
      
      return result
    }
    
    // Render all root nodes
    for (const root of roots) {
      if (!includeZeros && isZero(root)) continue
      html += renderNodePrint(root, 0)
    }
    
    html += `
        </tbody>
      </table>
    `
    
    // Grand Total Section
    const totalDebits = roots.reduce((s, r) => s + (mode === 'range' ? r.rollup.period_debits : r.rollup.closing_debit), 0)
    const totalCredits = roots.reduce((s, r) => s + (mode === 'range' ? r.rollup.period_credits : r.rollup.closing_credit), 0)
    const difference = Math.abs(totalDebits - totalCredits)
    const isBalanced = difference < 0.01
    
    html += `
      <div class="grand-total">
        <div class="grand-total-header">${uiLang === 'ar' ? 'المجاميع العامة' : 'Grand Totals'}</div>
        <div class="total-row">
          <div class="total-label">${mode === 'range' ? (uiLang === 'ar' ? 'إجمالي مدين الفترة' : 'Total Period Debits') : (uiLang === 'ar' ? 'إجمالي المدين الختامي' : 'Total Closing Debits')}</div>
          <div class="total-debit">${formatArabicCurrency(totalDebits, numbersOnly ? 'none' : 'EGP')}</div>
          <div class="total-credit"></div>
        </div>
        <div class="total-row">
          <div class="total-label">${mode === 'range' ? (uiLang === 'ar' ? 'إجمالي دائن الفترة' : 'Total Period Credits') : (uiLang === 'ar' ? 'إجمالي الدائن الختامي' : 'Total Closing Credits')}</div>
          <div class="total-debit"></div>
          <div class="total-credit">${formatArabicCurrency(totalCredits, numbersOnly ? 'none' : 'EGP')}</div>
        </div>
        <div class="total-row">
          <div class="total-label">${uiLang === 'ar' ? 'الفرق' : 'Difference'}</div>
          <div class="total-debit"></div>
          <div class="total-credit">${isBalanced ? (uiLang === 'ar' ? 'متوازن ✓' : 'Balanced ✓') : formatArabicCurrency(difference, numbersOnly ? 'none' : 'EGP')}</div>
        </div>
      </div>
    `
    
    // Balance Status
    html += `
      <div class="balance-status ${isBalanced ? 'balanced' : 'unbalanced'}">
        ${isBalanced 
          ? (uiLang === 'ar' ? 'ميزان المراجعة متوازن ✓' : 'Trial Balance is Balanced ✓') 
          : (uiLang === 'ar' ? `ميزان المراجعة غير متوازن: فرق ${formatArabicCurrency(difference, numbersOnly ? 'none' : 'EGP')}` : `Trial Balance is Unbalanced: Difference ${formatArabicCurrency(difference, numbersOnly ? 'none' : 'EGP')}`)}
      </div>
    `
    
    return html
  }

  const isZero = (n: TBNode) => (mode === 'range')
    ? (Number(n.rollup.period_debits || 0) === 0 && Number(n.rollup.period_credits || 0) === 0)
    : (Number(n.rollup.closing_debit || 0) === 0 && Number(n.rollup.closing_credit || 0) === 0)

  // Group nodes by account type (first-level classification)

  // Collapse/expand state for groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  
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

  const TreeRow: React.FC<{ node: TBNode; level: number }> = ({ node, level }) => {
    if (!includeZeros && isZero(node)) return null
    const isExpanded = expanded.has(node.id)
    const hasChildren = (node.children && node.children.length > 0)
    const toggle = () => setExpanded(prev => { const s = new Set(prev); if (s.has(node.id)) s.delete(node.id); else s.add(node.id); return s })

    const debit = mode === 'range' ? node.rollup.period_debits : node.rollup.closing_debit
    const credit = mode === 'range' ? node.rollup.period_credits : node.rollup.closing_credit

    const indentClass = styles[`indent-${Math.min(level, 6)}` as keyof typeof styles] || ''

    return (
      <>
        {/* Account row */}
        <div className={styles.accountLine}>
          <div className={`${styles.accountInfo} ${indentClass}`}>
            {hasChildren && (
              <button type="button" className={styles.treeToggle} onClick={toggle} aria-expanded={isExpanded} aria-label={uiLang === 'ar' ? 'تبديل' : 'Toggle'}>
                {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </button>
            )}
            <span className={styles.accountCode}>{node.code}</span>
            <span className={styles.accountName}>{node.name_ar || node.name}</span>
          </div>
          <div className={styles.accountAmounts}>
            <span className={styles.debitAmount}>{debit > 0 ? formatArabicCurrency(debit, numbersOnly ? 'none' : 'EGP') : '—'}</span>
            <span className={styles.creditAmount}>{credit > 0 ? formatArabicCurrency(credit, numbersOnly ? 'none' : 'EGP') : '—'}</span>
          </div>
        </div>
        {/* Children rows (expanded vertically below parent) */}
        {isExpanded && hasChildren && (
          node.children.map(child => (
            <TreeRow key={child.id} node={child} level={level + 1} />
          ))
        )}
      </>
    )
  }

  return (
    <div className={styles.container} dir={uiLang === 'ar' ? 'rtl' : 'ltr'}>
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

        {/* Center: language + group controls + toggles */}
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
            <button type="button" className={`${styles.featureToggle} ${numbersOnly ? 'active' : ''}`} onClick={() => setNumbersOnly(v => !v)} title={uiLang === 'ar' ? 'أرقام فقط' : 'Numbers only'}>
              {numbersOnly ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}<span className={styles.toggleText}>{uiLang === 'ar' ? 'أرقام فقط' : 'Numbers Only'}</span>
            </button>
            <button type="button" className={styles.featureToggle} onClick={() => setMode(m => m === 'range' ? 'asof' : 'range')} title={uiLang === 'ar' ? 'تبديل عرض الأعمدة' : 'Toggle columns'}>
              <span className={styles.toggleText}>{mode === 'range' ? (uiLang === 'ar' ? 'عرض افتتاحي/ختامي' : 'Show Opening/Closing') : (uiLang === 'ar' ? 'عرض حركة الفترة' : 'Show Period')}</span>
            </button>
          </div>
        </div>

        {/* Right: export/print/refresh */}
        <div className={styles.actionSection}>
          <div className={styles.exportGroup}>
            <button type="button" className={styles.exportButton} onClick={() => exportVisible('excel')} title={uiLang === 'ar' ? 'تصدير Excel' : 'Export Excel'}><IosShare fontSize="small" /> Excel</button>
            <button type="button" className={styles.exportButton} onClick={() => exportVisible('csv')} title={uiLang === 'ar' ? 'تصدير CSV' : 'Export CSV'}><TableView fontSize="small" /> CSV</button>
          </div>
          <button type="button" className={`${styles.actionButton} ${styles.secondary}`} onClick={printReport} title={uiLang === 'ar' ? 'طباعة' : 'Print'}><Print fontSize="small" /> {uiLang === 'ar' ? 'طباعة' : 'Print'}</button>
<button type="button" className={`${styles.actionButton} ${styles.primary}`} onClick={loadData} disabled={loading} title={uiLang === 'ar' ? 'تحديث' : 'Refresh'}>
            <Refresh fontSize="small" /> {loading ? (uiLang === 'ar' ? 'جاري التحميل...' : 'Loading...') : (uiLang === 'ar' ? 'تحديث' : 'Refresh')}
          </button>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <div id="tb-all-report-content" className={styles.contentWrapper}>
        <div className="standard-financial-statements">
          <div className="trial-balance-container">
            <div className="trial-balance-header">
              <div className="account-column">{uiLang === 'ar' ? 'اسم الحساب' : 'Account Name'}</div>
              <div className="amounts-columns">
                {mode === 'range' ? (
                  <>
                    <div className="debit-column">{uiLang === 'ar' ? 'مدين الفترة' : 'Period Debits'}</div>
                    <div className="credit-column">{uiLang === 'ar' ? 'دائن الفترة' : 'Period Credits'}</div>
                  </>
                ) : (
                  <>
                    <div className="debit-column">{uiLang === 'ar' ? 'مدين ختامي' : 'Closing Debit'}</div>
                    <div className="credit-column">{uiLang === 'ar' ? 'دائن ختامي' : 'Closing Credit'}</div>
                  </>
                )}
              </div>
            </div>

            {/* Render groups like original Trial Balance */}
            {roots.map(root => {
              const isCollapsed = collapsedGroups.has(root.id)
              const debit = mode === 'range' ? root.rollup.period_debits : root.rollup.closing_debit
              const credit = mode === 'range' ? root.rollup.period_credits : root.rollup.closing_credit
              
              if (!includeZeros && isZero(root)) return null
              
              return (
                <div key={root.id} className={styles.financialGroup}>
                  {/* Group Header */}
                  <div className={styles.groupHeader}>
                    <button
                      type="button"
                      className={styles.treeToggle}
                      onClick={() => toggleGroupCollapse(root.id)}
                      aria-expanded={!isCollapsed}
                    >
                      {isCollapsed ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
                    </button>
                    <h3 className={styles.groupTitle}>
                      {root.name_ar || root.name}
                      <span className={styles.accountCount}>({root.children.length + 1})</span>
                    </h3>
                    <div className={styles.accountAmounts}>
                      <span className={styles.debitAmount}>{debit > 0 ? formatArabicCurrency(debit, numbersOnly ? 'none' : 'EGP') : '—'}</span>
                      <span className={styles.creditAmount}>{credit > 0 ? formatArabicCurrency(credit, numbersOnly ? 'none' : 'EGP') : '—'}</span>
                    </div>
                  </div>
                  
                  {/* Group Content */}
                  {!isCollapsed && (
                    <div className={styles.groupContent}>
                      <TreeRow key={root.id} node={root} level={0} />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Totals */}
            <div className="trial-balance-totals">
              <span className="totals-label">{uiLang === 'ar' ? 'الإجمالي العام' : 'Grand Total'}</span>
              <div className="totals-amounts">
                {mode === 'range' ? (
                  <>
                    <span className="total-debits">{formatArabicCurrency(roots.reduce((s, r) => s + r.rollup.period_debits, 0), numbersOnly ? 'none' : 'EGP')}</span>
                    <span className="total-credits">{formatArabicCurrency(roots.reduce((s, r) => s + r.rollup.period_credits, 0), numbersOnly ? 'none' : 'EGP')}</span>
                  </>
                ) : (
                  <>
                    <span className="total-debits">{formatArabicCurrency(roots.reduce((s, r) => s + r.rollup.closing_debit, 0), numbersOnly ? 'none' : 'EGP')}</span>
                    <span className="total-credits">{formatArabicCurrency(roots.reduce((s, r) => s + r.rollup.closing_credit, 0), numbersOnly ? 'none' : 'EGP')}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
