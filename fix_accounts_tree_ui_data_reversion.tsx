// Fix for AccountsTree UI Data Reversion Issue
// Senior Engineer Solution: Prevent data reversion during editing

// This is a patch to be applied to the handleSave function in AccountsTree.tsx

// ISSUE IDENTIFIED:
// 1. Form data is being overwritten during the update process
// 2. Local state updates are causing data reversion
// 3. Name fields are not being handled consistently

// SOLUTION: Replace the account update section in handleSave function

// FIND THIS SECTION in AccountsTree.tsx (around lines 1030-1075):
/*
                  // Prepare account update data
                  
                  const { data, error } = await supabase.rpc('account_update', {
                    p_org_id: orgId,
                    p_id: draft.id,
                    p_code: form.code,
                    p_name: form.name_en || form.name_ar,
                    p_name_ar: form.name_ar,
                    p_account_type: accountType,
                    p_level: parseInt(String(form.level)) || 1,
                    p_status: status,
                  });
                  
                  if (error) {
                    throw error;
                  }
                  
                  if (!data) {
                    throw new Error('No data returned from update function');
                  }
                  
                  const updated = data as any;
                  
                  // Immediately enforce user's allow_transactions choice with a direct update
                  try {
                    const { error: allowErr } = await supabase
                      .from('accounts')
                      .update({ allow_transactions: !!form.allow_transactions })
                      .eq('id', draft.id)
                      .eq('org_id', orgId);
                    if (allowErr) console.warn('allow_transactions update warning:', allowErr);
                  } catch {}
                  
                  // Update core fields in local state
                  setAccounts(prev => prev.map(a => (a.id === draft.id ? {
                    ...a,
                    code: updated.code || form.code,
                    name: updated.name || updated.name_ar || form.name_ar,
                    name_ar: updated.name_ar || form.name_ar,
                    level: updated.level || form.level,
                    status: updated.status || (form.is_active ? 'active' : 'inactive'),
                    account_type: updated.category || updated.account_type || accountType,
                  } : a)));
*/

// REPLACE WITH THIS FIXED VERSION:

// FIXED VERSION - Prevents data reversion during editing
const { data, error } = await supabase.rpc('account_update', {
  p_org_id: orgId,
  p_id: draft.id,
  p_code: form.code,
  p_name: form.name_en || form.name_ar, // Use name_en if available, fallback to name_ar
  p_name_ar: form.name_ar || form.name_en, // Use name_ar if available, fallback to name_en
  p_account_type: accountType,
  p_level: parseInt(String(form.level)) || 1,
  p_status: status,
});

if (error) {
  throw error;
}

if (!data) {
  throw new Error('No data returned from update function');
}

const updated = data as any;

// Immediately enforce user's allow_transactions choice with a direct update
try {
  const { error: allowErr } = await supabase
    .from('accounts')
    .update({ allow_transactions: !!form.allow_transactions })
    .eq('id', draft.id)
    .eq('org_id', orgId);
  if (allowErr) console.warn('allow_transactions update warning:', allowErr);
} catch {}

// FIXED: Update local state with form data first, then merge with server response
// This prevents data reversion during editing
setAccounts(prev => prev.map(a => (a.id === draft.id ? {
  ...a,
  // Use form data as primary source (user's current input)
  code: form.code,
  name: form.name_en || form.name_ar,
  name_ar: form.name_ar || form.name_en,
  level: parseInt(String(form.level)) || 1,
  status: form.is_active ? 'active' : 'inactive',
  account_type: accountType,
  // Merge with server response for fields that might have changed server-side
  parent_id: updated.parent_id || a.parent_id,
  org_id: updated.org_id || a.org_id,
  is_postable: updated.is_postable !== undefined ? updated.is_postable : a.is_postable,
  created_at: updated.created_at || a.created_at,
  updated_at: updated.updated_at || new Date().toISOString(),
} : a)));

// ADDITIONAL FIX: Prevent form data from being overwritten by server response
// After successful update, refresh the account data to ensure consistency
try {
  const { data: refreshedAccount } = await supabase.rpc('get_account_for_edit', {
    p_org_id: orgId,
    p_account_id: draft.id,
  });
  
  if (refreshedAccount) {
    setAccounts(prev => prev.map(a => (a.id === draft.id ? {
      ...a,
      // Update with fresh server data but preserve user's intent
      code: refreshedAccount.code,
      name: refreshedAccount.name,
      name_ar: refreshedAccount.name_ar,
      level: refreshedAccount.level,
      status: refreshedAccount.status,
      category: refreshedAccount.category,
      // Keep other fields from server response
      parent_id: refreshedAccount.parent_id,
      is_postable: refreshedAccount.is_postable,
      updated_at: refreshedAccount.updated_at,
    } : a)));
  }
} catch (refreshError) {
  console.warn('Failed to refresh account data after update:', refreshError);
  // Don't throw error - the update already succeeded
}

// END OF FIXED SECTION
