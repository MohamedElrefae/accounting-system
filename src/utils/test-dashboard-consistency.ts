/**
 * Quick test to verify dashboard consistency fix is working
 * Run this in the browser console to test the new unified GL Summary service
 */

import { getDashboardCategoryTotals } from '../services/gl-summary';
import { getCategoryTotals } from '../services/account-balances';

export async function testDashboardConsistency() {
  console.log('🧪 Testing Dashboard Consistency Fix...\n');

  try {
    // Test the unified service directly
    const directTotals = await getDashboardCategoryTotals({
      dateFrom: null, // Balance sheet as-of behavior
      dateTo: new Date().toISOString().slice(0, 10),
      postedOnly: false,
      orgId: null,
      projectId: null
    });

    console.log('✅ Direct GL Summary totals:', directTotals);

    // Test through the account-balances service (what dashboard actually calls)
    const dashboardTotals = await getCategoryTotals({
      dateFrom: undefined,
      dateTo: new Date().toISOString().slice(0, 10),
      postedOnly: false,
      orgId: undefined,
      projectId: undefined
    });

    console.log('✅ Dashboard category totals:', dashboardTotals);

    // Verify they match
    const matches = {
      assets: Math.abs(directTotals.assets - (dashboardTotals.asset || 0)) < 0.01,
      liabilities: Math.abs(directTotals.liabilities - (dashboardTotals.liability || 0)) < 0.01,
      equity: Math.abs(directTotals.equity - (dashboardTotals.equity || 0)) < 0.01,
      revenue: Math.abs(directTotals.revenue - (dashboardTotals.revenue || 0)) < 0.01,
      expenses: Math.abs(directTotals.expenses - (dashboardTotals.expense || 0)) < 0.01,
    };

    console.log('🔍 Consistency check:', matches);

    const allMatch = Object.values(matches).every(m => m);
    
    if (allMatch) {
      console.log('🎉 SUCCESS: All totals are consistent!');
      
      // Check Balance Sheet equation
      const balanceSheetBalanced = Math.abs(directTotals.assets - (directTotals.liabilities + directTotals.equity)) < 0.01;
      console.log(`⚖️ Balance Sheet balanced: ${balanceSheetBalanced ? '✅' : '❌'}`);
      console.log(`   Assets: ${directTotals.assets.toLocaleString()}`);
      console.log(`   Liabilities + Equity: ${(directTotals.liabilities + directTotals.equity).toLocaleString()}`);
      
      // Check P&L calculation
      console.log(`💰 Net Income: ${directTotals.netIncome.toLocaleString()}`);
      console.log(`   Revenue: ${directTotals.revenue.toLocaleString()}`);
      console.log(`   Expenses: ${directTotals.expenses.toLocaleString()}`);
      
    } else {
      console.log('❌ INCONSISTENCY DETECTED:', matches);
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.testDashboardConsistency = testDashboardConsistency;
  console.log('💡 Run testDashboardConsistency() in the console to test consistency');
}