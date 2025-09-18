import { supabase } from '../utils/supabase';

export interface AccountBalanceFilter {
  dateFrom?: string;
  dateTo?: string;
  postedOnly?: boolean;
  orgId?: string;
  projectId?: string;
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: string;
  normalBalance: 'debit' | 'credit';
  totalDebits: number;
  totalCredits: number;
  balance: number;
  transactionCount: number;
}

/**
 * Canonical balance calculation using enterprise-grade natural balance logic
 * This ensures consistent balances across ALL reports, handling backwards entries correctly
 */
export async function getAccountBalances(filters: AccountBalanceFilter = {}): Promise<AccountBalance[]> {
  // Build the canonical SQL query with filters
  let whereClause = '';
  void whereClause; // silence unused for now
  const params: any[] = [];
  
  const conditions = [];
  if (filters.dateFrom) {
    conditions.push(`t.entry_date >= $${params.length + 1}`);
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push(`t.entry_date <= $${params.length + 1}`);
    params.push(filters.dateTo);
  }
  if (filters.postedOnly) {
    conditions.push(`t.is_posted = $${params.length + 1}`);
    params.push(true);
  }
  if (filters.orgId) {
    conditions.push(`t.org_id = $${params.length + 1}`);
    params.push(filters.orgId);
  }
  if (filters.projectId) {
    conditions.push(`t.project_id = $${params.length + 1}`);
    params.push(filters.projectId);
  }
  
  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }


  // For now, let's implement the canonical logic using multiple Supabase queries
  // This approach ensures compatibility while maintaining the canonical calculation
  
  // Get all transactions with filters
  let txQuery = supabase
    .from('transactions')
    .select('id, entry_date, amount, debit_account_id, credit_account_id, is_posted, org_id, project_id');

  if (filters.dateFrom) {
    txQuery = txQuery.gte('entry_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    txQuery = txQuery.lte('entry_date', filters.dateTo);
  }
  if (filters.postedOnly) {
    txQuery = txQuery.eq('is_posted', true);
  }
  if (filters.orgId) {
    txQuery = txQuery.eq('org_id', filters.orgId);
  }
  if (filters.projectId) {
    txQuery = txQuery.eq('project_id', filters.projectId);
  }

  const { data: transactions, error: txError } = await txQuery;
  if (txError) throw txError;

  // Get all accounts
  const { data: accounts, error: acctError } = await supabase
    .from('accounts')
    .select('id, code, name, category, normal_balance');
  if (acctError) throw acctError;

  // Apply canonical calculation logic
  const accountBalances: { [accountId: string]: AccountBalance } = {};

  // Process each transaction to create debit and credit lines
  for (const tx of transactions || []) {
    // Process debit line
    const debitAccount = accounts?.find(a => a.id === tx.debit_account_id);
    if (debitAccount) {
      if (!accountBalances[debitAccount.id]) {
        accountBalances[debitAccount.id] = {
          accountId: debitAccount.id,
          accountCode: debitAccount.code,
          accountName: debitAccount.name,
          category: debitAccount.category,
          normalBalance: debitAccount.normal_balance,
          balance: 0,
          transactionCount: 0,
          totalDebits: 0,
          totalCredits: 0
        };
      }
      
      const account = accountBalances[debitAccount.id];
      account.totalDebits += tx.amount;
      account.transactionCount++;
      
      // Apply canonical natural amount calculation
      const naturalAmount = debitAccount.normal_balance === 'debit' ? tx.amount : -tx.amount;
      account.balance += naturalAmount;
    }

    // Process credit line
    const creditAccount = accounts?.find(a => a.id === tx.credit_account_id);
    if (creditAccount) {
      if (!accountBalances[creditAccount.id]) {
        accountBalances[creditAccount.id] = {
          accountId: creditAccount.id,
          accountCode: creditAccount.code,
          accountName: creditAccount.name,
          category: creditAccount.category,
          normalBalance: creditAccount.normal_balance,
          balance: 0,
          transactionCount: 0,
          totalDebits: 0,
          totalCredits: 0
        };
      }
      
      const account = accountBalances[creditAccount.id];
      account.totalCredits += tx.amount;
      account.transactionCount++;
      
      // Apply canonical natural amount calculation
      const naturalAmount = creditAccount.normal_balance === 'credit' ? tx.amount : -tx.amount;
      account.balance += naturalAmount;
    }
  }

  // Return only accounts with transactions, with positive balance for display
  return Object.values(accountBalances)
    .filter(b => b.transactionCount > 0)
    .map(b => ({
      ...b,
      balance: Math.abs(b.balance) // Always positive for display
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
}

/**
 * Get balance for a specific account
 */
export async function getAccountBalance(accountId: string, filters: AccountBalanceFilter = {}): Promise<AccountBalance | null> {
  const balances = await getAccountBalances(filters);
  return balances.find(b => b.accountId === accountId) || null;
}

/**
 * Get totals by category (for dashboard cards)
 * Now uses the unified GL Summary service for consistency with financial reports
 */
export async function getCategoryTotals(filters: AccountBalanceFilter = {}): Promise<Record<string, number>> {
  // Import the unified GL Summary service
  const { getDashboardCategoryTotals } = await import('./gl-summary');
  
  try {
    const totals = await getDashboardCategoryTotals({
      dateFrom: filters.dateFrom ?? null,
      dateTo: filters.dateTo ?? null,
      postedOnly: !!filters.postedOnly,
      orgId: filters.orgId ?? null,
      projectId: filters.projectId ?? null
    });

    // Return in the expected format for backward compatibility
    return {
      asset: totals.assets,
      liability: totals.liabilities,
      equity: totals.equity,
      revenue: totals.revenue,
      expense: totals.expenses,
      net_income: totals.netIncome
    };
  } catch (error) {
    console.error('Failed to get category totals from GL Summary, falling back to legacy method:', error);
    
    // Fallback to the original method if GL Summary fails
    const balances = await getAccountBalances(filters);
    const totals: Record<string, number> = {};

    for (const balance of balances) {
      if (!totals[balance.category]) {
        totals[balance.category] = 0;
      }
      totals[balance.category] += Math.abs(balance.balance);
    }

    return totals;
  }
}
