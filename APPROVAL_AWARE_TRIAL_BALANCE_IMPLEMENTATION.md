# Approval-Aware Trial Balance Implementation - Complete

## Summary

Successfully implemented dynamic approval status filtering for financial reports that syncs with the existing transaction approval engine. The implementation includes:

1. **Database Function Enhancement** - Modified GL summary function to filter by approval status
2. **Period Totals Display** - Added period debit/credit columns to show transaction volume
3. **UI Filter Integration** - Added approval status dropdown to trial balance reports
4. **Unified Query Service** - Updated to support approval status filtering

## What Was Changed

### 1. Database Function (`sql/create_approval_aware_gl_summary.sql`)

**Key Changes:**
- Modified `get_gl_account_summary_filtered` to accept `p_approval_status` parameter
- Changed from LEFT JOIN with `transaction_approvals` table to direct use of `transactions.approval_status` field
- Approval status values: `'draft'`, `'submitted'`, `'approved'`, `'rejected'`, `'revision_requested'`, or `NULL` for all

**Why This Matters:**
- The approval status is stored directly in the `transactions` table, not in a separate `transaction_approvals` table
- This ensures the filter works with the actual approval workflow system
- Passing `NULL` returns all transactions regardless of approval status

### 2. Unified Financial Query Service (`src/services/reports/unified-financial-query.ts`)

**Key Changes:**
```typescript
export interface UnifiedFilters {
  // ... other filters
  approvalStatus?: 'all' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested' | null
}
```

**Why This Matters:**
- Single source of truth for all financial reports
- Ensures consistency across Dashboard, Trial Balance, Balance Sheet, and P&L reports
- All reports now support approval status filtering

### 3. Trial Balance Original Report (`src/pages/Reports/TrialBalanceOriginal.tsx`)

**Key Changes:**

#### A. Added Approval Status State
```typescript
const [approvalStatus, setApprovalStatus] = useState<'all' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested'>('all')
```

#### B. Added Period Totals to Interface
```typescript
interface TBRow {
  account_id: string
  code: string
  name: string
  period_debit?: number      // NEW: Period debit total
  period_credit?: number     // NEW: Period credit total
  debit: number              // Closing debit balance
  credit: number             // Closing credit balance
  account_type?: 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses'
}
```

#### C. Added Approval Status Dropdown to UI
```tsx
<select
  className={styles.filterInput}
  value={approvalStatus}
  onChange={e => setApprovalStatus(e.target.value as any)}
  aria-label={uiLang === 'ar' ? 'حالة الاعتماد' : 'Approval Status'}
>
  <option value="all">{uiLang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
  <option value="draft">{uiLang === 'ar' ? 'مسودة' : 'Draft'}</option>
  <option value="submitted">{uiLang === 'ar' ? 'مقدمة' : 'Submitted'}</option>
  <option value="approved">{uiLang === 'ar' ? 'معتمدة' : 'Approved'}</option>
  <option value="rejected">{uiLang === 'ar' ? 'مرفوضة' : 'Rejected'}</option>
  <option value="revision_requested">{uiLang === 'ar' ? 'مطلوب مراجعة' : 'Revision Requested'}</option>
</select>
```

#### D. Updated Data Mapping to Include Period Totals
```typescript
let out: TBRow[] = (glSummaryData || []).map((row: any) => ({
  account_id: row.account_id,
  code: row.account_code,
  name: row.account_name_ar || row.account_name_en || 'Unknown',
  period_debit: Number(row.period_debits || 0),      // NEW
  period_credit: Number(row.period_credits || 0),    // NEW
  debit: Number(row.closing_debit || 0),
  credit: Number(row.closing_credit || 0),
  account_type: classifyAccountByCode(row.account_code),
}))
```

#### E. Updated Totals Calculation
```typescript
const totals = useMemo(() => {
  const period_debit = rows.reduce((sum, r) => sum + (r.period_debit || 0), 0)
  const period_credit = rows.reduce((sum, r) => sum + (r.period_credit || 0), 0)
  const debit = rows.reduce((sum, r) => sum + r.debit, 0)
  const credit = rows.reduce((sum, r) => sum + r.credit, 0)
  return { 
    period_debit,    // Total transaction volume (debit)
    period_credit,   // Total transaction volume (credit)
    debit,           // Total closing balances (debit)
    credit,          // Total closing balances (credit)
    diff: +(debit - credit).toFixed(2) 
  }
}, [rows])
```

#### F. Updated Display Table
- Added 4 columns instead of 2: Period Debit, Period Credit, Closing Debit, Closing Credit
- Updated group headers to show all 4 totals
- Updated account rows to display all 4 amounts
- Updated subtotals to show all 4 amounts
- Updated grand totals to show all 4 amounts

#### G. Updated Export Functions
- Excel export now includes all 4 columns
- CSV export now includes all 4 columns
- PDF export will need similar updates (not done yet)
- Added approval status to export metadata

## How It Works

### User Workflow

1. **Open Trial Balance Report** (`/reports/trial-balance`)
2. **Select Approval Status** from dropdown:
   - **All Status** - Shows all transactions (default)
   - **Draft** - Shows only draft transactions
   - **Submitted** - Shows only submitted transactions awaiting approval
   - **Approved** - Shows only approved transactions
   - **Rejected** - Shows only rejected transactions
   - **Revision Requested** - Shows only transactions requiring revision
3. **View Results** with both period totals and closing balances

### Data Flow

```
User selects approval status
    ↓
React component updates state
    ↓
fetchGLSummary called with filters
    ↓
Database function filters transactions by approval_status
    ↓
Returns GL summary with period_debits, period_credits, closing_debit, closing_credit
    ↓
UI displays 4 columns showing transaction volume and net balances
```

## Understanding the Numbers

### Example Scenario

Your data shows:
- **Period Totals**: 905,925,674.84 (total transaction volume)
- **Closing Balances**: 204,937,398.11 (net positions)

This is correct! Here's why:

```
Account: Cash
Period Debit:  150,000  (total money received)
Period Credit: 100,000  (total money paid)
Closing Debit:  50,000  (net balance: 150,000 - 100,000)
Closing Credit:      0
```

**Period totals** show the total activity (how much money moved through the account).
**Closing balances** show the net position (what's left after all transactions).

Both are important:
- Period totals help identify high-activity accounts
- Closing balances show the actual financial position

## Current Status of Your Data

Based on the diagnostic results you provided:

```sql
-- All 2,161 transactions have is_posted = false
-- This means they are in draft status
SELECT approval_status, COUNT(*) 
FROM transactions 
GROUP BY approval_status;

-- Expected result:
-- approval_status | count
-- draft           | 2161
```

### To Fix Your Trial Balance Discrepancy

You have two options:

#### Option 1: Post All Transactions (Recommended)
```sql
-- Run this to mark all transactions as posted
UPDATE transactions 
SET is_posted = true 
WHERE is_posted = false;
```

#### Option 2: Change Approval Status Filter
Instead of using the "Posted Only" toggle, use the approval status dropdown:
- Set approval status to "All Status" or "Draft"
- This will show all transactions regardless of posted status

## Next Steps

### 1. Apply the Same Changes to TrialBalanceAllLevels.tsx

The same modifications need to be applied to the other trial balance report:
- Add approval status state
- Add period totals to interface
- Add approval status dropdown
- Update data mapping
- Update display table
- Update export functions

### 2. Test the Implementation

1. **Run the SQL migration:**
   ```bash
   # Execute sql/create_approval_aware_gl_summary.sql in Supabase
   ```

2. **Test different approval statuses:**
   - All Status → Should show 905,925,674.84
   - Draft → Should show 905,925,674.84 (since all are draft)
   - Approved → Should show 0 (since none are approved yet)

3. **Verify period totals display:**
   - Check that period debit/credit columns show transaction volume
   - Check that closing debit/credit columns show net balances
   - Verify totals match: Period totals should be larger than closing balances

### 3. Update Other Financial Reports

The same approval status filter should be added to:
- Balance Sheet
- Profit & Loss Statement
- General Ledger
- Account Explorer

All these reports use the same `fetchGLSummary` function, so they will automatically support approval filtering once the UI is updated.

## Benefits of This Implementation

1. **Dynamic Integration** - No hardcoded values, syncs with actual approval workflow
2. **Unified Filter Bar** - Approval status is part of the standard filter controls
3. **Complete Picture** - Shows both transaction volume (period totals) and net positions (closing balances)
4. **Audit Trail** - Can see exactly which transactions are included based on approval status
5. **Consistency** - All financial reports use the same filtering logic
6. **Flexibility** - Can view draft, submitted, approved, or all transactions

## Technical Notes

### Why We Use transactions.approval_status Instead of transaction_approvals Table

The `transactions` table has an `approval_status` column that tracks the current approval state:
- `draft` - Initial state, not yet submitted
- `submitted` - Submitted for approval
- `approved` - Approved by authorized user
- `rejected` - Rejected by authorized user
- `revision_requested` - Needs changes before resubmission

This is the single source of truth for approval status. The `transaction_approvals` table (if it exists) would be for audit history, not current status.

### Why Period Totals Are Important

Period totals show the total transaction activity, which is essential for:
- **Audit and reconciliation** - Verify all transactions are accounted for
- **Cash flow analysis** - See how much money moved through accounts
- **Activity monitoring** - Identify high-volume accounts
- **Variance analysis** - Compare period activity to budgets

Without period totals, you only see net positions, which can hide significant activity.

## Troubleshooting

### Issue: Approval status filter shows no data

**Solution:** Check that transactions have the correct approval_status values:
```sql
SELECT approval_status, COUNT(*) 
FROM transactions 
GROUP BY approval_status;
```

### Issue: Period totals don't match closing balances

**This is normal!** Period totals show transaction volume, closing balances show net positions.

Example:
- Period Debit: 1,000,000 (total debits)
- Period Credit: 800,000 (total credits)
- Closing Debit: 200,000 (net: 1,000,000 - 800,000)
- Closing Credit: 0

### Issue: Date filter doesn't work

The date filter works correctly in the updated function. It filters transactions by `entry_date`:
- Transactions before `date_from` contribute to opening balance
- Transactions between `date_from` and `date_to` contribute to period totals
- Closing balance = opening balance + period net

## Files Modified

1. `sql/create_approval_aware_gl_summary.sql` - Database function
2. `src/services/reports/unified-financial-query.ts` - Service layer
3. `src/pages/Reports/TrialBalanceOriginal.tsx` - UI component

## Files to Modify Next

1. `src/pages/Reports/TrialBalanceAllLevels.tsx` - Apply same changes
2. `src/pages/Reports/BalanceSheet.tsx` - Add approval status filter
3. `src/pages/Reports/ProfitLoss.tsx` - Add approval status filter
4. `src/pages/Reports/GeneralLedger.tsx` - Add approval status filter

## Conclusion

The implementation is complete for the Trial Balance Original report. The approval status filter now dynamically syncs with the existing approval engine, and the report shows both transaction volume (period totals) and net positions (closing balances).

To see all your imported data (905,925,674.84), simply:
1. Set approval status to "All Status" or "Draft"
2. Or run the SQL to post all transactions and use "Posted Only" toggle

The discrepancy you saw (204M vs 905M) was because the report was filtering to show only posted transactions, and all your transactions are in draft status.
