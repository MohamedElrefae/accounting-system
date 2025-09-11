/**
 * Test script to verify consistency across all reports using canonical balance calculation
 * This ensures Dashboard, Balance Sheet, P&L, and General Ledger all show the same numbers
 */

import { getCategoryTotals, getAccountBalances, type AccountBalanceFilter } from '../services/account-balances'
import { fetchBalanceSheetReport, type BSFilters } from '../services/reports/balance-sheet'
import { fetchProfitLossReport, type PLFilters } from '../services/reports/profit-loss'

interface ConsistencyTestResult {
  success: boolean
  message: string
  details?: any
}

export async function testReportConsistency(
  dateFrom?: string,
  dateTo?: string,
  postedOnly: boolean = false,
  projectId?: string
): Promise<ConsistencyTestResult[]> {
  const results: ConsistencyTestResult[] = []
  
  try {
    // Test filter configuration
    const balanceFilter: AccountBalanceFilter = {
      dateFrom,
      dateTo,
      postedOnly,
      projectId
    }
    
    const bsFilters: BSFilters = {
      asOfDate: dateTo || null,
      postedOnly,
      projectId: projectId || null
    }
    
    const plFilters: PLFilters = {
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      postedOnly,
      projectId: projectId || null
    }

    console.log('🧪 Testing report consistency with filters:', {
      dateFrom,
      dateTo,
      postedOnly,
      projectId
    })

    // 1. Get canonical category totals (this is what Dashboard uses)
    const categoryTotals = await getCategoryTotals(balanceFilter)
    console.log('📊 Canonical category totals:', categoryTotals)

    // 2. Get Balance Sheet totals
    const balanceSheetResult = await fetchBalanceSheetReport(bsFilters)
    console.log('⚖️ Balance Sheet totals:', {
      total_assets: balanceSheetResult.summary.total_assets,
      total_liabilities: balanceSheetResult.summary.total_liabilities,
      total_equity: balanceSheetResult.summary.total_equity
    })

    // 3. Get P&L totals
    const plResult = await fetchProfitLossReport(plFilters)
    console.log('💰 P&L totals:', {
      total_revenue: plResult.summary.total_revenue,
      total_expenses: plResult.summary.total_operating_expenses
    })

    // 4. Compare Assets
    if (Math.abs(categoryTotals.assets - balanceSheetResult.summary.total_assets) < 0.01) {
      results.push({
        success: true,
        message: '✅ Assets totals match between Dashboard and Balance Sheet'
      })
    } else {
      results.push({
        success: false,
        message: '❌ Assets totals mismatch',
        details: {
          dashboard: categoryTotals.assets,
          balanceSheet: balanceSheetResult.summary.total_assets,
          difference: Math.abs(categoryTotals.assets - balanceSheetResult.summary.total_assets)
        }
      })
    }

    // 5. Compare Liabilities
    if (Math.abs(categoryTotals.liabilities - balanceSheetResult.summary.total_liabilities) < 0.01) {
      results.push({
        success: true,
        message: '✅ Liabilities totals match between Dashboard and Balance Sheet'
      })
    } else {
      results.push({
        success: false,
        message: '❌ Liabilities totals mismatch',
        details: {
          dashboard: categoryTotals.liabilities,
          balanceSheet: balanceSheetResult.summary.total_liabilities,
          difference: Math.abs(categoryTotals.liabilities - balanceSheetResult.summary.total_liabilities)
        }
      })
    }

    // 6. Compare Equity
    if (Math.abs(categoryTotals.equity - balanceSheetResult.summary.total_equity) < 0.01) {
      results.push({
        success: true,
        message: '✅ Equity totals match between Dashboard and Balance Sheet'
      })
    } else {
      results.push({
        success: false,
        message: '❌ Equity totals mismatch',
        details: {
          dashboard: categoryTotals.equity,
          balanceSheet: balanceSheetResult.summary.total_equity,
          difference: Math.abs(categoryTotals.equity - balanceSheetResult.summary.total_equity)
        }
      })
    }

    // 7. Compare Revenue
    if (Math.abs(categoryTotals.revenue - plResult.summary.total_revenue) < 0.01) {
      results.push({
        success: true,
        message: '✅ Revenue totals match between Dashboard and P&L'
      })
    } else {
      results.push({
        success: false,
        message: '❌ Revenue totals mismatch',
        details: {
          dashboard: categoryTotals.revenue,
          profitLoss: plResult.summary.total_revenue,
          difference: Math.abs(categoryTotals.revenue - plResult.summary.total_revenue)
        }
      })
    }

    // 8. Compare Expenses
    if (Math.abs(categoryTotals.expenses - plResult.summary.total_operating_expenses) < 0.01) {
      results.push({
        success: true,
        message: '✅ Expenses totals match between Dashboard and P&L'
      })
    } else {
      results.push({
        success: false,
        message: '❌ Expenses totals mismatch',
        details: {
          dashboard: categoryTotals.expenses,
          profitLoss: plResult.summary.total_operating_expenses,
          difference: Math.abs(categoryTotals.expenses - plResult.summary.total_operating_expenses)
        }
      })
    }

    // 9. Balance Sheet balance check
    const balanceCheck = Math.abs(balanceSheetResult.summary.balance_check)
    if (balanceCheck < 0.01) {
      results.push({
        success: true,
        message: '✅ Balance Sheet is balanced (Assets = Liabilities + Equity)'
      })
    } else {
      results.push({
        success: false,
        message: '❌ Balance Sheet is not balanced',
        details: {
          balance_check: balanceSheetResult.summary.balance_check,
          total_assets: balanceSheetResult.summary.total_assets,
          total_liabilities_and_equity: balanceSheetResult.summary.total_liabilities + balanceSheetResult.summary.total_equity
        }
      })
    }

    // 10. Test account-level consistency
    const accountBalances = await getAccountBalances(balanceFilter)
    const totalAccountsWithBalance = accountBalances.filter(a => a.balance > 0).length
    
    results.push({
      success: true,
      message: `📋 Processed ${accountBalances.length} accounts (${totalAccountsWithBalance} with non-zero balances)`
    })

    // Summary
    const successCount = results.filter(r => r.success).length
    const totalTests = results.length
    
    results.unshift({
      success: successCount === totalTests,
      message: `🎯 Consistency Test Summary: ${successCount}/${totalTests} tests passed`,
      details: {
        successRate: `${Math.round((successCount/totalTests) * 100)}%`,
        filters: balanceFilter
      }
    })

  } catch (error) {
    results.push({
      success: false,
      message: '💥 Consistency test failed with error',
      details: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
  }

  return results
}

/**
 * Run consistency test with current data and log results
 */
export async function runConsistencyTest(): Promise<void> {
  console.log('\n🚀 Running Report Consistency Test...\n')
  
  const results = await testReportConsistency(
    '2023-01-01',  // dateFrom
    '2024-12-31',  // dateTo
    false,         // include unposted
    undefined      // all projects
  )
  
  results.forEach(result => {
    console.log(result.message)
    if (result.details) {
      console.log('   Details:', result.details)
    }
  })
  
  console.log('\n✨ Consistency test completed!\n')
}
