import { supabase } from '../../utils/supabase'

export interface PLFilters {
  dateFrom: string | null
  dateTo: string | null
  orgId?: string | null
  projectId?: string | null
  postedOnly?: boolean
}

export interface PLRow {
  account_id: string
  account_code: string
  account_name_ar?: string | null
  account_name_en?: string | null
  account_type: 'revenue' | 'cost_of_sales' | 'expenses' | 'other_income' | 'other_expenses'
  amount: number
  parent_id?: string | null
  level: number
  is_summary: boolean
  sort_order: number
  category?: string | null
}

export interface PLSummary {
  total_revenue: number
  total_cost_of_sales: number
  gross_profit: number
  total_operating_expenses: number
  operating_income: number
  total_other_income: number
  total_other_expenses: number
  net_income_before_tax: number
  net_income: number
  gross_margin_percent: number
  operating_margin_percent: number
  net_margin_percent: number
}

export async function fetchProfitLossReport(filters: PLFilters): Promise<{
  rows: PLRow[]
  summary: PLSummary
}> {
  try {
    // Use GL Summary function directly for guaranteed consistency
    const { data: glSummaryData, error: glError } = await supabase.rpc('get_gl_account_summary', {
      p_date_from: filters.dateFrom,
      p_date_to: filters.dateTo,
      p_org_id: filters.orgId || null,
      p_project_id: filters.projectId || null,
      p_posted_only: filters.postedOnly || false,
      p_limit: null,
      p_offset: null,
      p_classification_id: null,
      p_cost_center_id: null,
      p_work_item_id: null,
      p_expenses_category_id: null,
      p_debit_account_id: null,
      p_credit_account_id: null,
      p_amount_min: null,
      p_amount_max: null
    })
    
    if (glError) throw glError

    // Build P&L structure using GL Summary
    const plRows: PLRow[] = []
    let totalRevenue = 0
    let totalCostOfSales = 0
    let totalOperatingExpenses = 0
    let totalOtherIncome = 0
    let totalOtherExpenses = 0

    for (const row of (glSummaryData || [])) {
      // GL Summary returns closing_debit and closing_credit - match Trial Balance format
      const closingDebit = row.closing_debit || 0
      const closingCredit = row.closing_credit || 0
      
      // Skip accounts with zero activity (same as Trial Balance)
      if (closingDebit === 0 && closingCredit === 0) continue

      // Classify account type based on account code
      const accountType = classifyPLAccountType(row.account_code)
      if (!accountType) continue // Skip if not a P&L account

      // For P&L, use total activity like Trial Balance (debit + credit)
      const displayAmount = closingDebit + closingCredit

      // Accumulate totals
      switch (accountType) {
        case 'revenue':
          totalRevenue += displayAmount
          break
        case 'cost_of_sales':
          totalCostOfSales += displayAmount
          break
        case 'expenses':
          totalOperatingExpenses += displayAmount
          break
        case 'other_income':
          totalOtherIncome += displayAmount
          break
        case 'other_expenses':
          totalOtherExpenses += displayAmount
          break
      }

      plRows.push({
        account_id: row.account_id,
        account_code: row.account_code,
        account_name_ar: row.account_name_ar || row.account_name_en,
        account_name_en: row.account_name_en || row.account_name_ar,
        account_type: accountType,
        amount: displayAmount,
        parent_id: null, // Not available in current schema
        level: 0, // Not available in current schema
        is_summary: false, // Not available in current schema
        sort_order: getSortOrder(accountType),
        category: getCategoryName(accountType)
      })
    }

    // 5. Calculate summary metrics
    const grossProfit = totalRevenue - totalCostOfSales
    const operatingIncome = grossProfit - totalOperatingExpenses
    const netIncomeBeforeTax = operatingIncome + totalOtherIncome - totalOtherExpenses
    const netIncome = netIncomeBeforeTax // Assuming no tax calculation for now

    const summary: PLSummary = {
      total_revenue: totalRevenue,
      total_cost_of_sales: totalCostOfSales,
      gross_profit: grossProfit,
      total_operating_expenses: totalOperatingExpenses,
      operating_income: operatingIncome,
      total_other_income: totalOtherIncome,
      total_other_expenses: totalOtherExpenses,
      net_income_before_tax: netIncomeBeforeTax,
      net_income: netIncome,
      gross_margin_percent: totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0,
      operating_margin_percent: totalRevenue !== 0 ? (operatingIncome / totalRevenue) * 100 : 0,
      net_margin_percent: totalRevenue !== 0 ? (netIncome / totalRevenue) * 100 : 0
    }

    // Sort rows by account type and code
    plRows.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order
      }
      return a.account_code.localeCompare(b.account_code)
    })

    return { rows: plRows, summary }

  } catch (error) {
    console.error('Error fetching P&L report:', error)
    throw error
  }
}

function classifyPLAccountTypeFromCategory(category: string): PLRow['account_type'] | null {
  if (!category) return null

  const categoryLower = category.toLowerCase()
  
  // Map canonical service categories to P&L types
  if (categoryLower === 'revenue') {
    return 'revenue'
  }
  if (categoryLower === 'expenses') {
    // Default expenses to operating expenses for now
    // Could be enhanced with sub-categorization later
    return 'expenses'
  }
  
  // Assets, liabilities, and equity are not P&L accounts
  return null
}

function classifyPLAccountType(code: string): PLRow['account_type'] | null {
  if (!code) return null

  // Remove non-alphanumeric characters and get first digit/character
  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const firstChar = cleanCode.charAt(0)
  const firstTwo = cleanCode.substring(0, 2)

  // Fixed mapping based on actual chart of accounts:
  // 1 = الأصول (Assets) - NOT P&L
  if (firstChar === '1') {
    return null
  }
  
  // 2 = الخصوم (Liabilities) - NOT P&L
  if (firstChar === '2') {
    return null
  }
  
  // 3 = حقوق الملكية (Equity) - NOT P&L
  if (firstChar === '3') {
    return null
  }
  
  // 4 = الإيرادات (Revenue) - THIS IS P&L! - FIXED!
  if (firstChar === '4') {
    return 'revenue'
  }
  
  // 5 = التكاليف والمصروفات (Expenses) - THIS IS P&L! - FIXED!
  if (firstChar === '5') {
    // Sub-categorize expenses based on sub-codes
    if (firstTwo === '50' || firstTwo === '51' || firstTwo === '52') {
      return 'cost_of_sales' // Cost of sales/COGS
    }
    if (firstTwo >= '53' && firstTwo <= '58') {
      return 'expenses' // Operating expenses
    }
    if (firstTwo === '59') {
      return 'other_expenses' // Other expenses
    }
    // Default all 5xxx to expenses if no specific sub-category
    return 'expenses'
  }

  // Handle other possible P&L patterns
  if (cleanCode.startsWith('REV') || cleanCode.startsWith('SAL') || cleanCode.startsWith('INC')) {
    return 'revenue'
  }

  if (cleanCode.startsWith('COGS') || cleanCode.startsWith('COS') || cleanCode.includes('COST')) {
    return 'cost_of_sales'
  }
  
  if (cleanCode.startsWith('EXP') || cleanCode.startsWith('OPR')) {
    return 'expenses'
  }

  // Other Income patterns
  if (cleanCode.includes('OTHERINCOME') || cleanCode.includes('MISCIN')) {
    return 'other_income'
  }

  // Other Expenses patterns
  if (cleanCode.includes('OTHEREXP') || cleanCode.includes('MISCEXP')) {
    return 'other_expenses'
  }

  return null // Not a P&L account
}

function getSortOrder(accountType: PLRow['account_type']): number {
  switch (accountType) {
    case 'revenue':
      return 1
    case 'cost_of_sales':
      return 2
    case 'expenses':
      return 3
    case 'other_income':
      return 4
    case 'other_expenses':
      return 5
    default:
      return 999
  }
}

function getCategoryName(accountType: PLRow['account_type']): string {
  switch (accountType) {
    case 'revenue':
      return 'الإيرادات'
    case 'cost_of_sales':
      return 'تكلفة المبيعات'
    case 'expenses':
      return 'المصروفات التشغيلية'
    case 'other_income':
      return 'إيرادات أخرى'
    case 'other_expenses':
      return 'مصروفات أخرى'
    default:
      return 'أخرى'
  }
}
