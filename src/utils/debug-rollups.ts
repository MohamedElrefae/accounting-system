// Database rollups debugging utility
import { supabase } from './supabase';

export interface RollupsDebugInfo {
  orgId: string;
  totalAccounts: number;
  accountsWithTransactions: number;
  viewDataCount: number;
  rpcDataCount: number;
  sampleAccounts: Array<{
    id: string;
    code: string;
    name: string;
    has_transactions: boolean;
    net_amount: number;
  }>;
}

export async function debugAccountRollups(orgId: string): Promise<RollupsDebugInfo> {
  console.log('🔍 Starting rollups debug for org:', orgId);
  
  // 1. Check basic account count
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, code, name, name_ar, org_id')
    .eq('org_id', orgId)
    .limit(10);
  
  if (accountsError) {
    console.error('❌ Error fetching accounts:', accountsError);
    throw accountsError;
  }
  
  console.log('✅ Found', accounts?.length || 0, 'accounts (showing first 10)');
  console.log('📄 Sample accounts:', accounts?.map(a => ({ id: a.id, code: a.code, name: a.name_ar || a.name })));
  
  // 2. Check transactions count and details
  const { count: transactionCount, error: txError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);
  
  if (txError) {
    console.error('❌ Error counting transactions:', txError);
  } else {
    console.log('✅ Found', transactionCount || 0, 'transactions');
  }
  
  // 2.1 Get sample transactions to see structure
  const { data: sampleTx, error: sampleTxError } = await supabase
    .from('transactions')
    .select('id, org_id, debit_account_id, credit_account_id, amount, is_posted')
    .eq('org_id', orgId)
    .limit(5);
  
  if (!sampleTxError && sampleTx) {
    console.log('📋 Sample transactions:', sampleTx);
  }
  
  // 2.2 Check if accounts in the transactions match our account list
  if (accounts && sampleTx) {
    const accountIds = new Set(accounts.map(a => a.id));
    const txAccountIds = new Set([...sampleTx.map(t => t.debit_account_id), ...sampleTx.map(t => t.credit_account_id)]);
    const overlap = [...txAccountIds].filter(id => accountIds.has(id));
    console.log('🔗 Account overlap check:', {
      totalAccounts: accountIds.size,
      uniqueTxAccounts: txAccountIds.size,
      accountsWithTx: overlap.length
    });
  }
  
  // 3. Test the original view
  const { data: viewData, error: viewError } = await supabase
    .from('v_accounts_activity_rollups')
    .select('id, has_transactions, net_amount')
    .eq('org_id', orgId)
    .limit(5);
  
  if (viewError) {
    console.error('❌ Error fetching from view:', viewError);
  } else {
    console.log('✅ View returned', viewData?.length || 0, 'records');
    console.log('📊 Sample view data:', viewData);
  }
  
  // 4. Test the RPC function (if available)
  let rpcData: any[] = [];
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_accounts_activity_rollups', {
      p_org_id: orgId,
      p_include_unposted: false
    });
    
    if (rpcError) {
      console.error('❌ Error calling RPC (might not exist yet):', rpcError);
    } else {
      rpcData = rpcResult || [];
      console.log('✅ RPC returned', rpcData.length, 'records');
      console.log('📊 Sample RPC data:', rpcData.slice(0, 3));
    }
  } catch (err) {
    console.warn('⚠️ RPC function not available yet:', err);
  }
  
  // 5. Build result
  const sampleAccounts = (accounts || []).slice(0, 5).map(acc => {
    const viewRecord = viewData?.find(v => v.id === acc.id);
    const rpcRecord = rpcData.find(r => r.id === acc.id);
    
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name_ar || acc.name,
      has_transactions: viewRecord?.has_transactions || rpcRecord?.has_transactions || false,
      net_amount: Number(viewRecord?.net_amount || rpcRecord?.net_amount || 0)
    };
  });
  
  return {
    orgId,
    totalAccounts: accounts?.length || 0,
    accountsWithTransactions: (viewData || []).filter(v => v.has_transactions).length,
    viewDataCount: viewData?.length || 0,
    rpcDataCount: rpcData.length,
    sampleAccounts
  };
}

// Function to test the view directly with specific account IDs
export async function testViewDirectly(orgId: string, accountIds?: string[]) {
  console.log('🔭 Testing view directly for org:', orgId, 'accounts:', accountIds);
  
  try {
    // Test the view without account filtering first
    let query = supabase
      .from('v_accounts_activity_rollups')
      .select('id, org_id, has_transactions, net_amount, total_debit_amount, total_credit_amount, child_count')
      .eq('org_id', orgId);
    
    if (accountIds && accountIds.length > 0) {
      query = query.in('id', accountIds);
    }
    
    const { data, error } = await query.limit(10);
    
    if (error) {
      console.error('❌ View query error:', error);
      return null;
    }
    
    console.log('✅ Direct view query results:', data?.length || 0, 'records');
    console.log('📊 Full view data:', data);
    
    // Check for non-zero values
    const nonZero = data?.filter(r => r.has_transactions || r.net_amount !== 0) || [];
    console.log('📈 Non-zero records:', nonZero.length, 'out of', data?.length || 0);
    
    return data;
  } catch (err) {
    console.error('❌ Error testing view directly:', err);
    return null;
  }
}

// Function to manually calculate rollups for debugging
export async function manualRollupsCalculation(orgId: string, accountIds: string[]) {
  console.log('🤔 Manual rollups calculation for', accountIds.length, 'accounts');
  
  try {
    // Get transactions for these specific accounts
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, debit_account_id, credit_account_id, amount, is_posted')
      .eq('org_id', orgId)
      .or(`debit_account_id.in.(${accountIds.join(',')}),credit_account_id.in.(${accountIds.join(',')})`);
    
    if (txError) {
      console.error('❌ Error fetching transactions:', txError);
      return null;
    }
    
    console.log('📊 Found', transactions?.length || 0, 'transactions for these accounts');
    
    // Calculate manually
    const results: Record<string, { has_transactions: boolean; debit_total: number; credit_total: number; net_amount: number }> = {};
    
    accountIds.forEach(id => {
      results[id] = { has_transactions: false, debit_total: 0, credit_total: 0, net_amount: 0 };
    });
    
    transactions?.forEach(tx => {
      const amount = Number(tx.amount || 0);
      
      if (accountIds.includes(tx.debit_account_id)) {
        results[tx.debit_account_id].has_transactions = true;
        results[tx.debit_account_id].debit_total += amount;
        results[tx.debit_account_id].net_amount += amount;
      }
      
      if (accountIds.includes(tx.credit_account_id)) {
        results[tx.credit_account_id].has_transactions = true;
        results[tx.credit_account_id].credit_total += amount;
        results[tx.credit_account_id].net_amount -= amount;
      }
    });
    
    console.log('📦 Manual calculation results:', results);
    return results;
  } catch (err) {
    console.error('❌ Error in manual calculation:', err);
    return null;
  }
}

// Function to test both posted and unposted transactions
export async function testRollupModes(orgId: string) {
  console.log('🧪 Testing rollup modes for org:', orgId);
  
  try {
    // Test posted only
    const { data: postedData, error: _postedError } = await supabase.rpc('get_accounts_activity_rollups', {
      p_org_id: orgId,
      p_include_unposted: false
    });
    
    console.log('📋 Posted only:', postedData?.length || 0, 'accounts with activity');
    
    // Test all transactions
    const { data: allData, error: _allError } = await supabase.rpc('get_accounts_activity_rollups', {
      p_org_id: orgId,
      p_include_unposted: true
    });
    
    console.log('📋 All transactions:', allData?.length || 0, 'accounts with activity');
    
    // Compare results
    if (postedData && allData) {
      const postedCount = postedData.filter((d: any) => d.has_transactions).length;
      const allCount = allData.filter((d: any) => d.has_transactions).length;
      
      console.log('🔄 Difference:', allCount - postedCount, 'additional accounts when including unposted');
    }
    
    return { postedData, allData };
  } catch (err) {
    console.error('❌ Error testing rollup modes:', err);
    throw err;
  }
}
