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
    // Use GL Summary function directly for guaranteed consistency
    const { data: glSummaryData, error: glError } = await supabase.rpc('get_gl_account_summary_filtered', {
      p_date_from: null, // Balance Sheet is as-of a date, so no start date
      p_date_to: filters.asOfDate,
      p_org_id: filters.orgId || null,
      p_project_id: filters.projectId || null,
      p_posted_only: filters.postedOnly || false,
      p_limit: null,
      p_offset: null,
      p_classification_id: null,
      p_analysis_work_item_id: null,
      p_expenses_category_id: null, // Backward-compat param (DB will coalesce)
      p_sub_tree_id: null
    })
    
    if (glError) throw glError

    // Build Balance Sheet structure using GL Summary
    const bsRows: BSRow[] = []
    let totalAssets = 0
    let totalCurrentAssets = 0
    let totalFixedAssets = 0
    let totalLiabilities = 0
    let totalCurrentLiabilities = 0
    let totalLongTermLiabilities = 0
    let totalEquity = 0

    for (const row of (glSummaryData || [])) {
      // GL Summary returns closing_debit and closing_credit - match Trial Balance format
      const closingDebit = row.closing_debit || 0
      const closingCredit = row.closing_credit || 0
      
      // Skip accounts with zero activity (same as Trial Balance)
      if (closingDebit === 0 && closingCredit === 0) continue

      // Classify account type based on account code
      const accountType = classifyBSAccountType(row.account_code)
      if (!accountType) continue // Skip if not a Balance Sheet account

      // For Balance Sheet, use total activity like Trial Balance (debit + credit)
      const displayAmount = closingDebit + closingCredit

      // Accumulate totals
      switch (accountType) {
        case 'assets':
          totalAssets += displayAmount
          // Sub-categorize assets based on account code
          if (isCurrentAsset(row.account_code)) {
            totalCurrentAssets += displayAmount
          } else {
            totalFixedAssets += displayAmount
          }
          break
        case 'liabilities':
          totalLiabilities += displayAmount
          // Sub-categorize liabilities
          if (isCurrentLiability(row.account_code)) {
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
        account_id: row.account_id,
        account_code: row.account_code,
        account_name_ar: row.account_name_ar || row.account_name_en,
        account_name_en: row.account_name_en || row.account_name_ar,
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

// function classifyBSAccountTypeFromCategory(category: string): BSRow['account_type'] | null {
//   if (!category) return null

//   const categoryLower = category.toLowerCase()
  
  // Map canonical service categories to Balance Sheet types
//   if (categoryLower === 'assets') {
//     return 'assets'
//   }
//   if (categoryLower === 'liabilities') {
//     return 'liabilities'
//   }
//   if (categoryLower === 'equity') {
//     return 'equity'
//   }
  
//   // Revenue and expenses are not Balance Sheet accounts
//   return null
// }

function classifyBSAccountType(code: string): BSRow['account_type'] | null {
  if (!code) return null

  // Remove non-alphanumeric characters and get first digit/character
  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const firstChar = cleanCode.charAt(0)

  // Fixed mapping based on actual chart of accounts:
  // 1 = الأصول (Assets) - Balance Sheet
  if (firstChar === '1') {
    return 'assets'
  }
  
  // 2 = الخصوم (Liabilities) - Balance Sheet
  if (firstChar === '2') {
    return 'liabilities'
  }
  
  // 3 = حقوق الملكية (Equity) - Balance Sheet - FIXED!
  if (firstChar === '3') {
    return 'equity'
  }
  
  // 4 = الإيرادات (Revenue) - NOT Balance Sheet
  if (firstChar === '4') {
    return null
  }
  
  // 5 = التكاليف والمصروفات (Expenses) - NOT Balance Sheet
  if (firstChar === '5') {
    return null
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
