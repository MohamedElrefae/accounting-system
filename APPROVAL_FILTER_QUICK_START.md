# Approval Status Filter - Quick Start Guide

## What Changed?

Your trial balance reports now have an **Approval Status** filter that lets you view transactions based on their approval state.

## How to Use

### Step 1: Deploy the Database Update

Run this SQL file in your Supabase SQL Editor:

```bash
sql/create_approval_aware_gl_summary.sql
```

This updates the database function to support approval status filtering.

### Step 2: Use the Filter

1. Go to **Reports → Trial Balance** or **Trial Balance (All Levels)**
2. Look for the **Approval Status** dropdown in the filter bar
3. Select the status you want to see:
   - **All Status** - Shows everything (default)
   - **Draft** - Transactions not yet submitted for approval
   - **Pending** - Transactions waiting for approval
   - **Approved** - Approved transactions only
   - **Rejected** - Rejected transactions

### Step 3: Verify It Works

After selecting a status, the report should update to show only transactions matching that status.

## Common Use Cases

### 1. Official Financial Reporting
**Filter:** Approved
**Why:** Show only approved transactions for official reports

### 2. Find Unsubmitted Transactions
**Filter:** Draft
**Why:** Identify transactions that haven't been submitted for approval

### 3. Approval Workflow Management
**Filter:** Pending
**Why:** See what's waiting for approval

### 4. Audit Rejected Transactions
**Filter:** Rejected
**Why:** Review and correct rejected transactions

## How It Works

The filter integrates with your existing `transaction_approvals` table:

- **Draft** = Transactions without an approval record
- **Pending** = `transaction_approvals.approval_status = 'pending'`
- **Approved** = `transaction_approvals.approval_status = 'approved'`
- **Rejected** = `transaction_approvals.approval_status = 'rejected'`

## Troubleshooting

### Q: I selected "Approved" but see no data

**A:** Your transactions might not have approval records yet. Check:
```sql
SELECT COUNT(*) FROM transaction_approvals WHERE approval_status = 'approved';
```

### Q: Date filtering doesn't work with approval status

**A:** Make sure your date range is correct and transactions exist in that period:
```sql
SELECT COUNT(*) 
FROM transactions t
LEFT JOIN transaction_approvals ta ON t.id = ta.transaction_id
WHERE t.entry_date BETWEEN '2025-01-01' AND '2025-12-31'
  AND (ta.approval_status = 'approved' OR ta.approval_status IS NULL);
```

### Q: How do I see the approval status distribution?

**A:** Run this diagnostic query:
```sql
SELECT 
  COALESCE(ta.approval_status, 'draft') as status,
  COUNT(DISTINCT t.id) as transaction_count,
  SUM(COALESCE(tl.debit_amount, 0)) as total_debit,
  SUM(COALESCE(tl.credit_amount, 0)) as total_credit
FROM transactions t
JOIN transaction_lines tl ON t.id = tl.transaction_id
LEFT JOIN transaction_approvals ta ON t.id = ta.transaction_id
GROUP BY COALESCE(ta.approval_status, 'draft')
ORDER BY status;
```

## What's Next?

After verifying the approval filter works:

1. **Post Transactions** - Run the fix SQL to post all imported transactions:
   ```sql
   \i sql/fix_trial_balance_post_all_transactions.sql
   ```

2. **Add Period Columns** - The reports already show period totals (transaction volume) alongside closing balances

3. **Use in Other Reports** - The same approval filter can be added to Balance Sheet, P&L, and other financial reports

## Need Help?

Check the complete documentation: `APPROVAL_AWARE_FINANCIAL_REPORTS_COMPLETE.md`
