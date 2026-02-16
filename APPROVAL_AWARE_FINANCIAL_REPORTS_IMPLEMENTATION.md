# Approval-Aware Financial Reports Implementation

## Problem Analysis

Based on diagnostic results:

1. **All 2,161 transactions are in DRAFT status** (`is_posted = false`)
2. **Date filtering doesn't work** - Reports show all data regardless of date range
3. **No approval integration** - Reports don't respect approval workflow
4. **Period totals missing** - Reports show only closing balances, not transaction volume

## Root Causes

### 1. Posted Status Issue
```
Total transactions: 2,161
Posted: 0
Draft: 2,161 (100%)

Total debit/credit: 905,925,674.84
Shown in reports: 204,937,398.11 (22.6%)
```

The GL function filters by `is_posted = true` by default, showing only 22.6% of data.

### 2. Date Filtering Not Working
The function shows closing balances that include ALL transactions, not just those in the date range. This is because:
- Opening balance calculation works correctly (before date_from)
- Period calculation works correctly (between dates)
- But closing balance = opening + period shows cumulative totals

### 3. No Approval Integration
Current system uses `is_posted` flag, but doesn't integrate with approval workflow:
- Transactions can be posted without approval
- Approved transactions might not be posted
- No way to filter by approval status

## Solution: Three-Part Implementation

### Part 1: Add Approval Status Filter to UnifiedFilters

Update `src/services/reports/unified-financial-query.ts`:

```typescript
export interface UnifiedFilters {
  dateFrom?: string | null
  dateTo?: string | null
  orgId?: string | null
  projectId?: string | null
  costCenterId?: string | null
  postedOnly?: boolean
  approvalStatus?: 'all' | 'approved' | 'pending' | 'rejected' | null  // NEW
  classificationId?: string | null
  analysisWorkItemId?: string | null
  expensesCategoryId?: string | null
  subTreeId?: string | null
  limit?: number | null
  offset?: number | null
}
```

### Part 2: Update Database Function

Create new function that:
1. Respects approval status from transaction_approvals table
2. Fixes date filtering to show only transactions in range
3. Returns both period totals AND closing balances

### Part 3: Update UI Components

Add approval status filter to all financial reports:
- Trial Balance
- Trial Balance All Levels
- Balance Sheet
- Profit & Loss
- General Ledger
- Dashboard

## Implementation Steps

### Step 1: Create Enhanced GL Summary Function

```sql
-- File: sql/create_approval_aware_gl_summary.sql
```

This function will:
- Join with transaction_approvals table
- Filter by approval_status
- Calculate opening balance (before date_from)
- Calculate period activity (between dates) 
- Calculate closing balance (opening + period)
- Return period_debits, period_credits, closing_debit, closing_credit

### Step 2: Update UnifiedFilters Interface

Add `approvalStatus` parameter to all filter interfaces.

### Step 3: Update fetchGLSummary Function

Pass approval status to database function.

### Step 4: Update UI Components

Add approval status dropdown to report filters:
- All (show everything)
- Approved Only
- Pending Approval
- Rejected

### Step 5: Fix Date Filtering

Ensure reports show ONLY transactions within the selected date range, not cumulative totals.

## Expected Results After Implementation

### Before (Current State)
```
Date Range: 2024-01-01 to 2024-12-31
Filter: Posted Only
Result: 204,937,398.11 (22.6% of data)
Issue: Shows cumulative balances, not period activity
```

### After (Fixed State)
```
Date Range: 2024-01-01 to 2024-12-31
Filter: Approved Only
Result: 
  - Period Debit: 905,925,674.84 (transaction volume)
  - Period Credit: 905,925,674.84 (transaction volume)
  - Closing Debit: 204,937,398.11 (net position)
  - Closing Credit: 204,937,398.11 (net position)
```

## Benefits

1. **Approval Integration**: Reports respect approval workflow
2. **Accurate Date Filtering**: Shows only transactions in selected period
3. **Complete Picture**: Shows both transaction volume and net balances
4. **Flexible Filtering**: Can view all, approved, pending, or rejected transactions
5. **Audit Trail**: Clear visibility of approval status in reports

## Migration Path

### Phase 1: Quick Fix (Immediate)
Post all imported transactions to make them visible:
```sql
UPDATE transactions SET is_posted = true;
```

### Phase 2: Approval Integration (1-2 days)
1. Create approval-aware GL function
2. Update UnifiedFilters interface
3. Update fetchGLSummary function
4. Add approval status filter to UI

### Phase 3: Enhanced Display (1 day)
1. Add period total columns to reports
2. Update export functions
3. Update PDF generation

## Next Steps

1. **Immediate**: Run `sql/fix_trial_balance_post_all_transactions.sql` to post all transactions
2. **Short-term**: Implement approval-aware filtering
3. **Medium-term**: Add period total columns to reports

Would you like me to proceed with the implementation?
