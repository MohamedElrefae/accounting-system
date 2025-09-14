# Fix: Expenses Category Filter in General Ledger

## Issue
The UI shows the expenses category dropdown, but the filter doesn't affect the report data because the database functions are missing the `expenses_category_id` parameter.

Error: `Could not find the function public.get_general_ledger_report_filtered(..., p_expenses_category_id, ...) in the schema cache`

## Solution Steps

### 1. Check Current Database Functions
First, run this SQL to see what functions exist:
```sql
-- Check existing General Ledger functions in the database
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as parameters,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname ILIKE '%general_ledger%' OR p.proname ILIKE '%gl_account%')
ORDER BY p.proname;
```

### 2. Create/Update Database Functions
Run the complete SQL script from `create_gl_functions_with_expenses_category.sql`:

```sql
-- Drop existing functions if they exist (to handle signature changes)
DROP FUNCTION IF EXISTS public.get_general_ledger_report_filtered(...);
DROP FUNCTION IF EXISTS public.get_gl_account_summary_filtered(...);

-- Create new functions with expenses_category_id support
-- (See create_gl_functions_with_expenses_category.sql for full implementation)
```

**Key changes in the functions:**
- Added `p_expenses_category_id text DEFAULT NULL` parameter
- Added filter condition: `AND (p_expenses_category_id IS NULL OR t.expenses_category_id = p_expenses_category_id::uuid)`

### 3. Test Database Functions
Run the test queries from `test_gl_functions.sql` to verify:

```sql
-- Basic test
SELECT COUNT(*) FROM get_general_ledger_report_filtered(p_org_id => 'YOUR_ORG_ID', p_limit => 5);

-- Test with expenses category filter
SELECT COUNT(*) FROM get_general_ledger_report_filtered(
    p_org_id => 'YOUR_ORG_ID',
    p_expenses_category_id => 'EXPENSES_CATEGORY_ID',
    p_limit => 1000
);
```

### 4. Frontend Changes (Already Applied)
✅ The following frontend changes have been completed:

**General Ledger Component (`src/pages/Reports/GeneralLedger.tsx`):**
- ✅ State management for `expensesCategoryId` and `expensesCategoryOptions`
- ✅ UI dropdown for expenses category selection
- ✅ Data loading includes expenses category filter in all effects
- ✅ Export functions include expenses category filter
- ✅ Drill-down functions include expenses category filter
- ✅ Reset buttons clear the expenses category filter
- ✅ Auto-collapse effect includes expenses category in dependencies
- ✅ Export titles include expenses category information

**Service Layer Updates:**
- ✅ `GLFilters` interface includes `expensesCategoryId` field
- ✅ `GLAccountSummaryFilters` interface includes `expensesCategoryId` field  
- ✅ `fetchGeneralLedgerReport` passes `p_expenses_category_id` parameter
- ✅ `fetchGLAccountSummary` updated to call `get_gl_account_summary_filtered`
- ✅ `fetchGLTotals` includes expenses category parameter

## Verification Steps

### 1. Test in UI
After running the database updates:
1. Start development server: `npm run dev`
2. Navigate to General Ledger page
3. Select an organization with expenses categories
4. Choose an expenses category from dropdown
5. Verify report data changes (fewer results when filtered)

### 2. Database Verification
Use these SQL queries to verify filtering works:

```sql
-- Get available expenses categories
SELECT id, code, description 
FROM expenses_categories_full 
WHERE org_id = 'YOUR_ORG_ID' AND is_active = true;

-- Compare filtered vs unfiltered results
WITH all_transactions AS (
    SELECT COUNT(*) as total_count
    FROM get_general_ledger_report_filtered(p_org_id => 'YOUR_ORG_ID', p_limit => 10000)
),
filtered_transactions AS (
    SELECT COUNT(*) as filtered_count
    FROM get_general_ledger_report_filtered(
        p_org_id => 'YOUR_ORG_ID',
        p_expenses_category_id => 'EXPENSES_CATEGORY_ID',
        p_limit => 10000
    )
)
SELECT 
    total_count,
    filtered_count,
    CASE 
        WHEN filtered_count < total_count THEN 'FILTER WORKING ✅'
        ELSE 'CHECK DATA - No filtering effect'
    END as status
FROM all_transactions, filtered_transactions;
```

## Files Modified
- ✅ `src/pages/Reports/GeneralLedger.tsx` - UI and state management
- ✅ `src/services/reports/general-ledger.ts` - Service interface and calls
- ✅ `src/services/reports/gl-account-summary.ts` - Updated to use filtered function
- 🔄 Database functions (need to be created/updated via SQL)

## Expected Result
After applying the database changes:
- ✅ Expenses category dropdown appears in General Ledger UI
- ✅ Selecting an expenses category filters the report data
- ✅ Overview mode shows only accounts with transactions in that expenses category
- ✅ Details mode shows only transaction entries for that expenses category
- ✅ Export functions respect the expenses category filter
- ✅ Compare mode and drill-down work with the filter applied

## Next Steps
1. **Run the database SQL scripts** (most important step)
2. **Test the UI** to verify filtering works
3. **Run verification SQL queries** to confirm database-level filtering

The frontend code is complete and ready - only the database functions need to be created!