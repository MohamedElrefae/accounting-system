/**
 * Unified GL Summary Service
 * 
 * This service provides a single source of truth for all financial calculations
 * used across the dashboard and financial reports. It ensures consistency by
 * using the same database function (get_gl_account_summary_filtered) that 
 * the Balance Sheet and P&L reports already use.
 */

import { supabase } from '../utils/supabase';

export interface GLFilters {
  dateFrom?: string | null;  // null means unbounded start (for balance sheet as-of behavior)
  dateTo?: string | null;    // null means up to latest
  postedOnly?: boolean;
  orgId?: string | null;
  projectId?: string | null;
}

export interface GLAccountSummaryRow {
  account_id: string;
  account_code: string;
  account_name_en?: string | null;
  account_name_ar?: string | null;
  opening_debit?: number;
  opening_credit?: number; 
  period_debits?: number;
  period_credits?: number;
  closing_debit?: number;
  closing_credit?: number;
  transaction_count?: number;
}

export interface DashboardCategoryTotals {
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  netIncome: number; // revenue - expenses (positive for profit)
}

/**
 * Fetches GL account summary data using the same function as financial reports
 */
export async function fetchGLSummary(filters: GLFilters): Promise<GLAccountSummaryRow[]> {
  try {
    // Ensure empty strings are converted to null for date parameters
    const dateFrom = filters.dateFrom && filters.dateFrom.trim() !== '' ? filters.dateFrom : null;
    const dateTo = filters.dateTo && filters.dateTo.trim() !== '' ? filters.dateTo : null;
    
    // Use parameter structure from working gl-account-summary service
const { data, error } = await supabase.rpc('get_gl_account_summary_filtered', {
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_org_id: filters.orgId ?? null,
      p_project_id: filters.projectId ?? null,
      p_posted_only: filters.postedOnly ?? false,
      p_limit: null,
      p_offset: null,
      p_classification_id: null,
      p_analysis_work_item_id: null,
      p_expenses_category_id: null,
      p_sub_tree_id: null
    });

    if (error) {
      console.error('GL Summary RPC error details:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        originalFilters: filters,
        actualParameters: {
          p_date_from: dateFrom,
          p_date_to: dateTo,
          p_org_id: filters.orgId ?? null,
          p_project_id: filters.projectId ?? null,
          p_posted_only: filters.postedOnly ?? false,
        }
      });
      throw error;
    }

    return (data ?? []) as GLAccountSummaryRow[];
  } catch (error) {
    console.error('Failed to fetch GL Summary:', error);
    throw error;
  }
}

/**
 * Maps account code to category type (1-5) based on chart of accounts structure
 */
function classifyAccountByCode(code: string): 1 | 2 | 3 | 4 | 5 | null {
  if (!code) return null;

  const firstChar = code.charAt(0);
  
  switch (firstChar) {
    case '1': return 1; // Assets
    case '2': return 2; // Liabilities  
    case '3': return 3; // Equity
    case '4': return 4; // Revenue
    case '5': return 5; // Expenses
    default: return null;
  }
}

/**
 * Gets dashboard category totals using the same GL Summary function as reports
 * This ensures perfect consistency between dashboard cards and financial reports
 */
export async function getDashboardCategoryTotals(filters: GLFilters): Promise<DashboardCategoryTotals> {
  try {
    const rows = await fetchGLSummary(filters);

    const totals: DashboardCategoryTotals = {
      assets: 0,
      liabilities: 0, 
      equity: 0,
      revenue: 0,
      expenses: 0,
      netIncome: 0
    };

    for (const row of rows) {
      const accountType = classifyAccountByCode(row.account_code);
      if (!accountType) continue;

      // Use the same calculation logic as Balance Sheet and P&L reports:
      // Total activity = closing_debit + closing_credit
      const closingDebit = row.closing_debit || 0;
      const closingCredit = row.closing_credit || 0;
      
      // Skip accounts with zero activity
      if (closingDebit === 0 && closingCredit === 0) continue;

      // Calculate display amount using same logic as reports
      const displayAmount = closingDebit + closingCredit;

      // Accumulate by category (all positive for dashboard display)
      switch (accountType) {
        case 1: // Assets
          totals.assets += displayAmount;
          break;
        case 2: // Liabilities  
          totals.liabilities += displayAmount;
          break;
        case 3: // Equity
          totals.equity += displayAmount;
          break;
        case 4: // Revenue
          totals.revenue += displayAmount;
          break;
        case 5: // Expenses
          totals.expenses += displayAmount;
          break;
      }
    }

    // Calculate net income (profit/loss)
    totals.netIncome = totals.revenue - totals.expenses;

    return totals;
  } catch (error) {
    console.error('Failed to get dashboard category totals:', error);
    throw error;
  }
}

/**
 * Gets monthly revenue and expenses data for dashboard charts
 * This ensures chart data matches the same calculation logic as reports
 */
export async function getMonthlyRevenueExpenses(
  dateFrom: string,
  dateTo: string,
  filters: Omit<GLFilters, 'dateFrom' | 'dateTo'>
): Promise<Array<{ month: string; revenue: number; expenses: number }>> {
  try {
    // For now, get the total for the period
    // In the future, this could be enhanced to get month-by-month data
    // if the GL function supports monthly grouping
    
    const rows = await fetchGLSummary({
      ...filters,
      dateFrom,
      dateTo
    });

    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const row of rows) {
      const accountType = classifyAccountByCode(row.account_code);
      if (!accountType) continue;

      const closingDebit = row.closing_debit || 0;
      const closingCredit = row.closing_credit || 0;
      
      if (closingDebit === 0 && closingCredit === 0) continue;

      const displayAmount = closingDebit + closingCredit;

      if (accountType === 4) { // Revenue
        totalRevenue += displayAmount;
      } else if (accountType === 5) { // Expenses
        totalExpenses += displayAmount;
      }
    }

    // Return as single period for now
    // This can be enhanced later to support actual monthly breakdowns
    const periodLabel = new Date(dateTo).toLocaleString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    });

    return [{ 
      month: periodLabel, 
      revenue: totalRevenue, 
      expenses: totalExpenses 
    }];
  } catch (error) {
    console.error('Failed to get monthly revenue/expenses:', error);
    throw error;
  }
}