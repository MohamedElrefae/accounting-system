import { supabase } from '../../utils/supabase'

export interface BSFilters {
  asOfDate: string | null
  orgId?: string | null
  projectId?: string | null
  postedOnly?: boolean
}

export interface BSRow {
  account_id: string
  account_code: string
  account_name_ar?: string | null
  account_name_en?: string | null
  account_type: 'assets' | 'liabilities' | 'equity'
  amount: number
  sort_order: number
  category?: string | null
}

export interface BSSummary {
  total_assets: number
  total_current_assets: number
  total_fixed_assets: number
  total_liabilities: number
  total_current_liabilities: number
  total_long_term_liabilities: number
  total_equity: number
  net_worth: number
  balance_check: number // Should be 0 if balanced
}

export async function fetchBalanceSheetReport(filters: BSFilters): Promise<{
  rows: BSRow[]
  summary: BSSummary
}> {
  try {
    // 1. Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, code, name, name_ar, status, category, normal_balance')
      .eq('status', 'active')
      .order('code')

    if (accountsError) throw accountsError

    // 2. Get transactions up to the as-of date
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

    if (filters.asOfDate) {
      transactionQuery = transactionQuery.lte('entry_date', filters.asOfDate)
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

      // Standard double-entry: Debit increases assets/expenses, Credit increases liabilities/equity/revenue
      if (tx.debit_account_id) {
        const currentBalance = accountBalances.get(tx.debit_account_id) || 0
        accountBalances.set(tx.debit_account_id, currentBalance + amount)
      }

      if (tx.credit_account_id) {
        const currentBalance = accountBalances.get(tx.credit_account_id) || 0
        accountBalances.set(tx.credit_account_id, currentBalance - amount)
      }
    }

    // 4. Classify accounts and build Balance Sheet structure
    const bsRows: BSRow[] = []
    let totalAssets = 0
    let totalCurrentAssets = 0
    let totalFixedAssets = 0
    let totalLiabilities = 0
    let totalCurrentLiabilities = 0
    let totalLongTermLiabilities = 0
    let totalEquity = 0

    for (const account of accounts || []) {
      const balance = accountBalances.get(account.id) || 0
      
      // Skip accounts with zero balance
      if (balance === 0) continue

      // Classify account type based on code
      const accountType = classifyBSAccountType(account.code || '')
      if (!accountType) continue // Skip if not a Balance Sheet account

      // For Balance Sheet accounts, we typically show the raw balance
      // Assets: Positive debit balance
      // Liabilities: Positive credit balance (shown as positive)
      // Equity: Positive credit balance (shown as positive)
      let displayAmount = balance
      if (accountType === 'liabilities' || accountType === 'equity') {
        displayAmount = -balance // Credit balances shown as positive
      }

      // Accumulate totals
      switch (accountType) {
        case 'assets':
          totalAssets += displayAmount
          // Sub-categorize assets based on account code
          if (isCurrentAsset(account.code || '')) {
            totalCurrentAssets += displayAmount
          } else {
            totalFixedAssets += displayAmount
          }
          break
        case 'liabilities':
          totalLiabilities += displayAmount
          // Sub-categorize liabilities
          if (isCurrentLiability(account.code || '')) {
            totalCurrentLiabilities += displayAmount
          } else {
            totalLongTermLiabilities += displayAmount
          }
          break
        case 'equity':
          totalEquity += displayAmount
          break
      }

      bsRows.push({
        account_id: account.id,
        account_code: account.code || '',
        account_name_ar: account.name_ar,
        account_name_en: account.name,
        account_type: accountType,
        amount: displayAmount,
        sort_order: getSortOrder(accountType),
        category: getCategoryName(accountType)
      })
    }

    // 5. Calculate summary metrics
    const netWorth = totalAssets - totalLiabilities
    const balanceCheck = totalAssets - (totalLiabilities + totalEquity)

    const summary: BSSummary = {
      total_assets: totalAssets,
      total_current_assets: totalCurrentAssets,
      total_fixed_assets: totalFixedAssets,
      total_liabilities: totalLiabilities,
      total_current_liabilities: totalCurrentLiabilities,
      total_long_term_liabilities: totalLongTermLiabilities,
      total_equity: totalEquity,
      net_worth: netWorth,
      balance_check: balanceCheck
    }

    // Sort rows by account type and code
    bsRows.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order
      }
      return a.account_code.localeCompare(b.account_code)
    })

    return { rows: bsRows, summary }

  } catch (error) {
    console.error('Error fetching Balance Sheet report:', error)
    throw error
  }
}

function classifyBSAccountType(code: string): BSRow['account_type'] | null {
  if (!code) return null

  // Remove non-alphanumeric characters and get first digit/character
  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const firstChar = cleanCode.charAt(0)

  // Based on your actual chart of accounts from the screenshot:
  // 1 = الأصول (Assets) - Balance Sheet
  if (firstChar === '1') {
    return 'assets'
  }
  
  // 2 = الالتزامات (Liabilities) - Balance Sheet
  if (firstChar === '2') {
    return 'liabilities'
  }
  
  // 3 = الإيرادات (Revenue) - NOT Balance Sheet
  if (firstChar === '3') {
    return null
  }
  
  // 4 = المصروفات (Expenses) - NOT Balance Sheet
  if (firstChar === '4') {
    return null
  }
  
  // 5 = حقوق الملكية (Equity) - Balance Sheet
  if (firstChar === '5') {
    return 'equity'
  }

  // Handle other possible patterns
  if (cleanCode.startsWith('ASSET') || cleanCode.startsWith('CASH') || cleanCode.startsWith('INV')) {
    return 'assets'
  }

  if (cleanCode.startsWith('LIAB') || cleanCode.startsWith('PAYAB') || cleanCode.startsWith('LOAN')) {
    return 'liabilities'
  }

  if (cleanCode.startsWith('EQUITY') || cleanCode.startsWith('CAPITAL') || cleanCode.startsWith('RETAINED')) {
    return 'equity'
  }

  return null // Not a Balance Sheet account
}

function isCurrentAsset(code: string): boolean {
  if (!code) return false
  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  
  // Current assets typically include: Cash, Accounts Receivable, Inventory, Prepaid
  // Usually 11xx - 15xx range
  const firstTwo = cleanCode.substring(0, 2)
  return ['11', '12', '13', '14', '15'].includes(firstTwo) ||
         cleanCode.includes('CASH') || 
         cleanCode.includes('RECEIV') || 
         cleanCode.includes('INVENTORY') ||
         cleanCode.includes('PREPAID')
}

function isCurrentLiability(code: string): boolean {
  if (!code) return false
  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  
  // Current liabilities typically include: Accounts Payable, Short-term loans, Accrued
  // Usually 21xx - 25xx range  
  const firstTwo = cleanCode.substring(0, 2)
  return ['21', '22', '23', '24', '25'].includes(firstTwo) ||
         cleanCode.includes('PAYAB') || 
         cleanCode.includes('ACCRUED') || 
         cleanCode.includes('SHORT')
}

function getSortOrder(accountType: BSRow['account_type']): number {
  switch (accountType) {
    case 'assets':
      return 1
    case 'liabilities':
      return 2
    case 'equity':
      return 3
    default:
      return 999
  }
}

function getCategoryName(accountType: BSRow['account_type']): string {
  switch (accountType) {
    case 'assets':
      return 'الأصول'
    case 'liabilities':
      return 'الالتزامات'
    case 'equity':
      return 'حقوق الملكية'
    default:
      return 'أخرى'
  }
}
