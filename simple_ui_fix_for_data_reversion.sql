-- Simple Fix for UI Data Reversion Issue
-- Senior Engineer Solution: Prevent form data from being overwritten

-- The issue is in AccountsTree.tsx around lines 1065-1073
-- Replace this section:

// PROBLEMATIC CODE:
/*
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

// FIXED VERSION - Use form data as primary source:
setAccounts(prev => prev.map(a => (a.id === draft.id ? {
  ...a,
  // Use form data (user's current input) as primary source
  code: form.code,
  name: form.name_en || form.name_ar,
  name_ar: form.name_ar || form.name_en,
  level: parseInt(String(form.level)) || 1,
  status: form.is_active ? 'active' : 'inactive',
  account_type: accountType,
  // Only use server response for fields that should come from server
  parent_id: updated.parent_id || a.parent_id,
  org_id: updated.org_id || a.org_id,
  is_postable: updated.is_postable !== undefined ? updated.is_postable : a.is_postable,
  created_at: updated.created_at || a.created_at,
  updated_at: updated.updated_at || new Date().toISOString(),
} : a)));

// ADDITIONAL FIX: Clear form after successful save
// This prevents old data from persisting in form state
setDialogMode('view');
setDraft(null);

-- END OF UI FIX
