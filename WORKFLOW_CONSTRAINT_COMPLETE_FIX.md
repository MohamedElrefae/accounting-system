# Complete Fix for Opening Balance Import Workflow Constraint Error

## Problem
`import_opening_balances failed: null value in column "workflow_id" of relation "approval_requests" violates not-null constraint`

## Root Cause
The existing `import_opening_balances` RPC function tries to directly INSERT into `approval_requests` table with a NULL `workflow_id`, but the table has a NOT NULL constraint.

## Solution Overview
Instead of modifying the complex existing function, we created a new function that doesn't create approval requests, and updated the UI to use the proper approval creation method.

## Files to Apply

### 1. Database Fix
Run `quick_fix_workflow_constraint.sql` in Supabase SQL editor:
- Creates `import_opening_balances_no_approval` function (same logic, no approval creation)
- Creates trigger to auto-set workflow_id if needed
- Grants proper permissions

### 2. Code Changes (Already Applied)
Updated `OpeningBalanceImportService.ts`:
- Changed `importFromExcel` to use `import_opening_balances_no_approval`
- Changed `importFromManualRows` to use `import_opening_balances_no_approval`
- UI approval creation already uses `fn_create_approval_request` properly

## Why This Works

1. **Separation of Concerns**: Import function only handles data import
2. **UI Handles Approval**: UI creates approval requests using `fn_create_approval_request` which properly resolves workflow_id
3. **No Constraint Violation**: No direct INSERT into approval_requests with NULL workflow_id
4. **Same Functionality**: All import features work exactly the same

## Testing Steps

1. Apply the SQL fix in Supabase
2. Test file import - should work without workflow_id error
3. Test manual entry - should work with project/cost center selection
4. Verify approval requests are created properly through UI

## Rollback Plan (if needed)

If issues occur, revert the two service method changes to use the original `import_opening_balances` function name.
