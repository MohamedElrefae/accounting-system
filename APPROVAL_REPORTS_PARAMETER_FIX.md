# Approval Reports Parameter Fix

## Issue

Error when loading trial balance reports:
```
Could not find the function public.get_gl_account_summary_filtered(
  p_analysis_work_item_id, p_approval_status, p_classification_id, 
  p_date_from, p_date_to, p_expenses_category_id, p_limit, p_offset, 
  p_org_id, p_posted_only, p_project_id, p_sub_tree_id
) in the schema cache
```

## Root Cause

The TypeScript code passes `p_expenses_category_id` parameter, but the SQL function I created didn't include it (because the column doesn't exist in the database).

## Solution

I've updated the SQL function to include `p_expenses_category_id` parameter for backward compatibility, but it's not used in the WHERE clause since the column doesn't exist.

## Fixed SQL File

The file `sql/create_approval_aware_gl_summary_FIXED.sql` has been updated with:

1. Added `p_expenses_category_id uuid DEFAULT NULL` parameter
2. Added comment: `-- DEPRECATED: Column doesn't exist, kept for backward compatibility`
3. Updated GRANT statement to include the new parameter

## Deploy Now

Run the updated SQL file in Supabase SQL Editor:
```
sql/create_approval_aware_gl_summary_FIXED.sql
```

This will:
1. Drop the existing function (if any)
2. Create the new function with all required parameters
3. Grant permissions
4. Run test queries

## Expected Result

After deployment:
- ✅ Trial balance reports should load without errors
- ✅ Approval status filter should appear
- ✅ All 2,161 transactions should show when "All Status" or "Draft" selected

## Verification

After running the SQL:

1. Go to `/reports/trial-balance`
2. You should see the approval status dropdown
3. Select "All Status" → Should show 2,161 transactions (905M total)
4. No errors in browser console

## Why This Happened

The TypeScript code in `unified-financial-query.ts` passes `p_expenses_category_id` because it's defined in the `UnifiedFilters` interface, even though:
- The column `expenses_category_id` doesn't exist in `transaction_lines` table
- The parameter is never actually used for filtering

The fix maintains backward compatibility by accepting the parameter but ignoring it.

## Next Steps

1. ✅ Deploy the updated SQL file
2. ✅ Test in UI
3. (Optional) Clean up TypeScript code to remove unused `expensesCategoryId` parameter
