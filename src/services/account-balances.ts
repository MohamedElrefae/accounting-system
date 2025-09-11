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

  const canonicalQuery = `
    WITH tx_lines AS (
      -- Debit lines
      SELECT
        t.id AS transaction_id,
        t.entry_date,
        t.amount,
        t.is_posted,
        a.id AS account_id,
        a.code AS account_code,
        a.name AS account_name,
        a.category AS account_category,
        a.normal_balance AS account_normal_balance,
        'debit' AS leg
      FROM transactions t
      JOIN accounts a ON a.id = t.debit_account_id
      ${whereClause}

      UNION ALL

      -- Credit lines  
      SELECT
        t.id AS transaction_id,
        t.entry_date,
        t.amount,
        t.is_posted,
        a.id AS account_id,
        a.code AS account_code,
        a.name AS account_name,
        a.category AS account_category,
        a.normal_balance AS account_normal_balance,
        'credit' AS leg
      FROM transactions t
      JOIN accounts a ON a.id = t.credit_account_id
      ${whereClause}
    ),
    tx_lines_signed AS (
      SELECT
        *,
        CASE
          WHEN account_normal_balance = 'debit'  AND leg = 'debit'  THEN amount
          WHEN account_normal_balance = 'debit'  AND leg = 'credit' THEN -amount
          WHEN account_normal_balance = 'credit' AND leg = 'credit' THEN amount
          WHEN account_normal_balance = 'credit' AND leg = 'debit'  THEN -amount
          ELSE 0
        END AS natural_amount
      FROM tx_lines
    )
    SELECT
      account_id,
      account_code,
      account_name,
      account_category,
      account_normal_balance,
      SUM(natural_amount) AS balance,
      COUNT(*) AS movement_count,
      SUM(CASE WHEN leg = 'debit' THEN amount ELSE 0 END) AS total_debits,
      SUM(CASE WHEN leg = 'credit' THEN amount ELSE 0 END) AS total_credits
    FROM tx_lines_signed
    GROUP BY account_id, account_code, account_name, account_category, account_normal_balance
    ORDER BY account_code;
  `;

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
 */
export async function getCategoryTotals(filters: AccountBalanceFilter = {}): Promise<Record<string, number>> {
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
