# 🗄️ Database Deployment Instructions

## Expenses Category Filter Feature - Database Setup

### 📋 Required SQL Functions

To complete the deployment of the expenses category filter feature, you need to run these SQL scripts in your **production database**:

### 1. ✅ Create/Update GL Functions (REQUIRED)
Run this script to create the database functions that support expenses category filtering:

**File:** `create_gl_functions_typecast.sql`

**What it does:**
- Creates `get_general_ledger_report_filtered` function with expenses_category_id support
- Creates `get_gl_account_summary_filtered` function with expenses_category_id support  
- Handles type casting to avoid PostgreSQL compatibility issues
- Includes full filtering logic for both debit and credit transactions

### 2. ✅ Fix Analysis Work Item Filtering (RECOMMENDED)
Run this script to fix the analysis work item filtering consistency issue:

**File:** `fix_analysis_workitem_filtering.sql`

**What it does:**
- Fixes the logic where overview showed accounts without checking analysis work item match
- Ensures overview and drill-down views are consistent
- Maintains expenses category filtering functionality

### 📊 Verification Queries

After running the SQL scripts, verify the deployment with these queries:

```sql
-- 1. Check functions exist
SELECT proname, pg_get_function_identity_arguments(oid) 
FROM pg_proc 
WHERE proname IN ('get_general_ledger_report_filtered', 'get_gl_account_summary_filtered');

-- 2. Test basic functionality
SELECT COUNT(*) FROM get_general_ledger_report_filtered(p_limit => 5);
SELECT COUNT(*) FROM get_gl_account_summary_filtered(p_limit => 5);

-- 3. Test expenses category filtering
SELECT COUNT(*) FROM get_general_ledger_report_filtered(
    p_expenses_category_id => 'YOUR_EXPENSES_CATEGORY_ID', 
    p_limit => 100
);
```

### 🚀 Deployment Status

- ✅ **Frontend Code**: Deployed to Vercel automatically
- ⏳ **Database Functions**: Need to be run manually in production database
- ✅ **Git Commit**: `ea2dcc1` - "feat: Add expenses category filter to General Ledger"
- ✅ **Branch**: `revert-to-last-deploy` pushed to GitHub

### 🎯 Expected Features After Full Deployment

1. **General Ledger UI** shows expenses category dropdown
2. **Filter functionality** works in both overview and details modes
3. **Export functions** include expenses category filtering
4. **Drill-down views** respect the expenses category filter
5. **Analysis work item filtering** works consistently between overview and details
6. **Reset buttons** clear all filters including expenses categories

### ⚠️ Important Note

The frontend code is now deployed, but the **expenses category filter won't work** until you run the required SQL scripts in your production database. The UI will show the dropdown, but filtering won't occur without the database functions.

### 🔧 Quick Deploy Commands

1. **Access your production database** (Supabase, PostgreSQL, etc.)
2. **Run:** `create_gl_functions_typecast.sql`
3. **Run:** `fix_analysis_workitem_filtering.sql`  
4. **Verify** with the test queries above
5. **Test** the expenses category filter in the UI

Once these SQL scripts are executed, the expenses category filter will be fully functional! 🎉