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
    // 1. Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, code, name, name_ar, status, category, normal_balance')
      .eq('status', 'active')
      .order('code')

    if (accountsError) throw accountsError

    // 2. Get transactions within date range
    let transactionQuery = supabase
      .from('transactions')
      .select(`
        debit_account_id,
        credit_account_id,
        amount,
        entry_date,
        project_id,
        is_posted
      `)

    if (filters.dateFrom) {
      transactionQuery = transactionQuery.gte('entry_date', filters.dateFrom)
    }
    if (filters.dateTo) {
      transactionQuery = transactionQuery.lte('entry_date', filters.dateTo)
    }
    if (filters.projectId) {
      transactionQuery = transactionQuery.eq('project_id', filters.projectId)
    }
    if (filters.postedOnly) {
      transactionQuery = transactionQuery.eq('is_posted', true)
    }

    const { data: transactions, error: transactionsError } = await transactionQuery

    if (transactionsError) throw transactionsError

    // 3. Calculate account balances
    const accountBalances = new Map<string, number>()

    for (const tx of transactions || []) {
      const amount = Number(tx.amount || 0)

      // Debit increases expense accounts, decreases revenue accounts
      if (tx.debit_account_id) {
        const currentBalance = accountBalances.get(tx.debit_account_id) || 0
        accountBalances.set(tx.debit_account_id, currentBalance + amount)
      }

      // Credit increases revenue accounts, decreases expense accounts
      if (tx.credit_account_id) {
        const currentBalance = accountBalances.get(tx.credit_account_id) || 0
        accountBalances.set(tx.credit_account_id, currentBalance - amount)
      }
    }

    // 4. Classify accounts and build P&L structure
    const plRows: PLRow[] = []
    let totalRevenue = 0
    let totalCostOfSales = 0
    let totalOperatingExpenses = 0
    let totalOtherIncome = 0
    let totalOtherExpenses = 0

    for (const account of accounts || []) {
      const balance = accountBalances.get(account.id) || 0
      
      // Skip accounts with zero balance
      if (balance === 0) continue

      // Classify account type based on code
      const accountType = classifyPLAccountType(account.code || '')
      if (!accountType) continue // Skip if not a P&L account

      // For revenue accounts, we need to negate the balance since credit increases revenue
      let displayAmount = balance
      if (accountType === 'revenue' || accountType === 'other_income') {
        displayAmount = -balance // Revenue accounts have negative balance, show as positive
      }

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
        account_id: account.id,
        account_code: account.code || '',
        account_name_ar: account.name_ar,
        account_name_en: account.name,
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

function classifyPLAccountType(code: string): PLRow['account_type'] | null {
  if (!code) return null

  // Remove non-alphanumeric characters and get first digit/character
  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const firstChar = cleanCode.charAt(0)
  const firstTwo = cleanCode.substring(0, 2)

  // Based on your actual chart of accounts from the screenshot:
  // 1 = الأصول (Assets) - NOT P&L
  if (firstChar === '1') {
    return null
  }
  
  // 2 = الالتزامات (Liabilities) - NOT P&L
  if (firstChar === '2') {
    return null
  }
  
  // 3 = الإيرادات (Revenue) - THIS IS P&L!
  if (firstChar === '3') {
    return 'revenue'
  }
  
  // 4 = المصروفات (Expenses) - THIS IS P&L!
  if (firstChar === '4') {
    // Sub-categorize expenses based on sub-codes
    if (firstTwo === '40' || firstTwo === '41' || firstTwo === '42') {
      return 'cost_of_sales' // Cost of sales/COGS
    }
    if (firstTwo >= '43' && firstTwo <= '48') {
      return 'expenses' // Operating expenses
    }
    if (firstTwo === '49') {
      return 'other_expenses' // Other expenses
    }
    // Default all 4xxx to expenses if no specific sub-category
    return 'expenses'
  }
  
  // 5 = حقوق الملكية (Equity) - NOT P&L
  if (firstChar === '5') {
    return null
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
