# Unified Filter Fix - Complete Analysis and Solution

## Problem Identified

The unified filter service on transaction-related pages had a critical issue: **some filter dimensions were defined in the UI but not applied in the Supabase queries**. This meant users could select filters like "Classification", "Cost Center", "Work Item", "Analysis Item", and "Expenses Category", but these filters would not actually affect the data shown in the table.

### Why Debit/Credit Account Filters Worked

The debit and credit account filters worked because they used a special dual-condition approach:
```typescript
if (appliedFilters.debitAccountId) {
    query = query.eq('account_id', appliedFilters.debitAccountId).gt('debit_amount', 0)
}
if (appliedFilters.creditAccountId) {
    query = query.eq('account_id', appliedFilters.creditAccountId).gt('credit_amount', 0)
}
```

This works because a transaction line has ONE `account_id` but TWO amount columns (`debit_amount` and `credit_amount`), allowing the same account to appear in different contexts.

### Why Other Filters Didn't Work

The following filters were **UI-complete but backend-incomplete**:
- `classificationId` - Defined in filter state, rendered in UI, stored in localStorage, but NOT applied in queries
- `costCenterId` - Same issue
- `workItemId` - Same issue
- `analysisWorkItemId` - Same issue
- `expensesCategoryId` - Same issue (maps to `sub_tree_id` in database)

## Root Cause

The filter logic was missing from the Supabase query builders in three pages:

1. **TransactionLinesReport.tsx** - Two fetch functions: `fetchAllLines()` and `fetchAllFilteredLines()`
2. **AllLinesEnriched.tsx** - One fetch function: `fetchAllLines()` (plus summary query)
3. **MyLinesEnriched.tsx** - One fetch function: `fetchMyLines()`

## Solution Applied

Added the missing filter conditions to all query builders:

```typescript
if (appliedFilters.classificationId) {
    query = query.eq('classification_id', appliedFilters.classificationId)
}
if (appliedFilters.costCenterId) {
    query = query.eq('cost_center_id', appliedFilters.costCenterId)
}
if (appliedFilters.workItemId) {
    query = query.eq('work_item_id', appliedFilters.workItemId)
}
if (appliedFilters.analysisWorkItemId) {
    query = query.eq('analysis_work_item_id', appliedFilters.analysisWorkItemId)
}
if (appliedFilters.expensesCategoryId) {
    query = query.eq('sub_tree_id', appliedFilters.expensesCategoryId)
}
```

### Files Modified

1. **src/pages/Reports/TransactionLinesReport.tsx**
   - Added filters to `fetchAllLines()` function
   - Added filters to `fetchAllFilteredLines()` function

2. **src/pages/Transactions/AllLinesEnriched.tsx**
   - Added filters to main `fetchAllLines()` query
   - Added filters to summary query (for consistent totals)

3. **src/pages/Transactions/MyLinesEnriched.tsx**
   - Added filters to `fetchMyLines()` function

### Pages NOT Modified (Already Correct)

- **TransactionsEnriched.tsx** - Uses RPC functions that already receive all filters
- **RunningBalanceEnriched.tsx** - Uses `runningBalanceService.ts` which already applies all filters correctly

## Impact

### Before Fix
- Users could select classification, cost center, work item, analysis item, or expenses category filters
- The filters would appear to be applied (UI showed selected values)
- But the table data would NOT be filtered - all records would still display

### After Fix
- All filter dimensions now work consistently
- Selecting any filter dimension will correctly filter the displayed data
- Summary calculations (totals, counts) also respect all filters
- Grouped views and pagination work correctly with all filters

## Testing Recommendations

1. **TransactionLinesReport page**
   - Apply a classification filter → verify only lines with that classification appear
   - Apply a cost center filter → verify only lines with that cost center appear
   - Apply a work item filter → verify only lines with that work item appear
   - Apply an analysis item filter → verify only lines with that analysis item appear
   - Apply an expenses category filter → verify only lines with that category appear
   - Test with grouping enabled → verify subtotals are correct
   - Test with summary mode → verify summary reflects filtered data

2. **AllLinesEnriched page**
   - Repeat all tests above
   - Verify summary bar totals match filtered data

3. **MyLinesEnriched page**
   - Repeat all tests above
   - Verify only current user's lines are shown

4. **Cross-page consistency**
   - Apply same filters on different pages → verify results are consistent
   - Test filter combinations (e.g., classification + cost center) → verify AND logic works

## Technical Details

### Filter Mapping
- `classificationId` → `classification_id` column
- `costCenterId` → `cost_center_id` column
- `workItemId` → `work_item_id` column
- `analysisWorkItemId` → `analysis_work_item_id` column
- `expensesCategoryId` → `sub_tree_id` column (expenses category is stored as sub_tree)

### Query Pattern
All filters use the same pattern:
```typescript
if (appliedFilters.filterName) {
    query = query.eq('column_name', appliedFilters.filterName)
}
```

This is consistent with how other filters (debit account, credit account, project, org, etc.) are applied.

## Verification

All modified files have been checked for:
- ✅ Syntax errors - None found
- ✅ Type errors - None found
- ✅ Consistent filter application across all query builders
- ✅ Proper handling of null/undefined filter values
- ✅ Correct column name mappings

## Future Improvements

1. Consider extracting filter application logic into a reusable utility function to avoid duplication
2. Add unit tests for filter application logic
3. Consider adding filter validation to catch missing filters early
4. Document the filter-to-column mapping in a centralized location
