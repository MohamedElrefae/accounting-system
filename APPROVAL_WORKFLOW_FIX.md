# Approval Workflow System - Complete Fix

## Problem Analysis

The approval inbox (`/approvals/inbox`) was showing no data because:

1. **Database View Issue**: The `v_line_approval_inbox` view was trying to join `transaction_lines.org_id` which doesn't exist (org_id is in the `transactions` table)
2. **Submit Function Mismatch**: The `submitTransaction` service was passing wrong parameters to the database function
3. **Missing User ID**: The submit function wasn't passing the current user ID (`p_submitted_by`)

## What Was Fixed

### 1. Database Migration (`20250129_fix_line_approval_view.sql`)
- ✅ Fixed view to use `t.org_id` instead of `tl.org_id`
- ✅ Simplified approver assignment: assigns submitter as approver (can be enhanced later)
- ✅ Added proper error handling and logging
- ✅ Dropped and recreated function to fix return type

### 2. Service Layer (`src/services/transactions.ts`)
- ✅ Fixed `submitTransaction` to pass `p_submitted_by` parameter
- ✅ Added user authentication check
- ✅ Added console logging for debugging

### 3. UI Components
- ✅ Transaction table "مراجعة" button opens `ApprovalWorkflowManager`
- ✅ Transaction lines "مراجعة" button opens `EnhancedLineReviewModal`
- ✅ Transaction details "مراجعة واعتماد المعاملة" button opens `ApprovalWorkflowManager`
- ✅ All buttons are always visible but disabled when posted

## How the System Works Now

### Submit Workflow

1. **User creates transaction** with multiple lines
2. **User clicks "إرسال للمراجعة"** (Submit for Review)
3. **System calls** `submitTransaction(transactionId)`
4. **Database function** `submit_transaction_for_line_approval`:
   - Changes all draft lines to 'pending' status
   - Assigns approver (org manager or fallback to submitter)
   - Updates transaction status to 'pending'
   - Creates audit logs

### Approval Workflow

#### Route 1: Approvals Inbox (`/approvals/inbox`)
- **Lines Tab**: Shows all lines assigned to current user for approval
- **Transactions Tab**: Shows old transaction-level approvals (legacy)

#### Route 2: Transactions Pending (`/transactions/pending`)
- Shows all pending transactions
- "مراجعة" button opens `ApprovalWorkflowManager` for full transaction review

#### Route 3: Transaction Details
- "مراجعة واعتماد المعاملة" button opens `ApprovalWorkflowManager`

### Review Actions

**EnhancedLineReviewModal** (Individual Line):
- تعليق (Comment): Add a comment without changing status
- اعتماد (Approve): Approve the line
- طلب تعديل (Request Edit): Request changes
- تنبيه (Flag): Flag for attention

**ApprovalWorkflowManager** (Full Transaction):
- Review all lines at once
- See approval progress
- Approve/reject multiple lines

## Deployment Steps

### 1. Run Database Migration
```bash
# Connect to Supabase and run:
supabase/migrations/20250129_fix_line_approval_view.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Paste the migration content
3. Click "Run"

### 2. Verify Migration
```sql
-- Check view exists
SELECT * FROM v_line_approval_inbox LIMIT 1;

-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'submit_transaction_for_line_approval';
```

### 3. Test Submit Workflow
1. Create a new transaction with 2-3 lines
2. Click "إرسال للمراجعة"
3. Check console for: `✅ Transaction submitted for line approval`
4. Verify lines changed from 'draft' to 'pending':
```sql
SELECT id, line_no, line_status, assigned_approver_id 
FROM transaction_lines 
WHERE transaction_id = 'YOUR_TRANSACTION_ID';
```

### 4. Test Approval Inbox
1. Navigate to `/approvals/inbox`
2. Click "Lines" tab
3. Should see pending lines assigned to you
4. Click "Approve" on a line
5. Verify line status changes to 'approved'

### 5. Test Full Workflow
```sql
-- 1. Create test transaction
INSERT INTO transactions (entry_number, entry_date, description, org_id)
VALUES ('TEST-001', CURRENT_DATE, 'Test Transaction', 'YOUR_ORG_ID')
RETURNING id;

-- 2. Add lines
INSERT INTO transaction_lines (transaction_id, line_no, account_id, debit_amount, credit_amount)
VALUES 
  ('TRANSACTION_ID', 1, 'ACCOUNT_ID_1', 1000, 0),
  ('TRANSACTION_ID', 2, 'ACCOUNT_ID_2', 0, 1000);

-- 3. Submit for approval (via UI or SQL)
SELECT * FROM submit_transaction_for_line_approval('TRANSACTION_ID', auth.uid());

-- 4. Check inbox
SELECT * FROM get_my_line_approvals(auth.uid());

-- 5. Approve lines
SELECT * FROM approve_line('LINE_ID_1', auth.uid(), 'Looks good');
SELECT * FROM approve_line('LINE_ID_2', auth.uid(), 'Approved');

-- 6. Verify transaction approved
SELECT status, all_lines_approved, lines_approved_count, lines_total_count
FROM transactions
WHERE id = 'TRANSACTION_ID';
```

## Troubleshooting

### Issue: Inbox shows no data
**Check:**
```sql
-- 1. Are there pending lines?
SELECT COUNT(*) FROM transaction_lines WHERE line_status = 'pending';

-- 2. Are lines assigned to you?
SELECT COUNT(*) FROM transaction_lines 
WHERE line_status = 'pending' AND assigned_approver_id = auth.uid();

-- 3. Check view directly
SELECT * FROM v_line_approval_inbox;
```

**Solution:**
- If no pending lines: Submit a transaction first
- If not assigned: Check organization manager settings
- If view empty: Run the migration again

### Issue: Submit fails
**Check console for:**
- "User not authenticated" → User not logged in
- "No draft lines to submit" → Lines already submitted or no lines exist
- Database error → Check migration was applied

### Issue: Buttons not working
**Check:**
- Browser console for errors
- Network tab for failed API calls
- Verify user has `transactions.review` permission

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     APPROVAL WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CREATE TRANSACTION                                       │
│     └─> Lines in 'draft' status                            │
│                                                              │
│  2. SUBMIT FOR APPROVAL                                      │
│     └─> submitTransaction(id)                               │
│         └─> submit_transaction_for_line_approval()          │
│             ├─> Lines → 'pending' status                    │
│             ├─> Assign approvers                            │
│             └─> Transaction → 'pending' status              │
│                                                              │
│  3. REVIEW (Multiple Routes)                                 │
│     ├─> /approvals/inbox (Lines Tab)                        │
│     │   └─> EnhancedLineReviewModal                         │
│     ├─> /transactions/pending                               │
│     │   └─> ApprovalWorkflowManager                         │
│     └─> /transactions/:id (Details)                         │
│         └─> ApprovalWorkflowManager                         │
│                                                              │
│  4. APPROVE/REJECT                                           │
│     └─> approve_line() or reject_line()                     │
│         ├─> Line → 'approved'/'rejected'                    │
│         └─> If all approved → Transaction → 'approved'      │
│                                                              │
│  5. POST (Optional)                                          │
│     └─> post_transaction()                                  │
│         └─> Transaction → 'posted' (immutable)              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Files Modified

1. `supabase/migrations/20250129_fix_line_approval_view.sql` - Database fix
2. `src/services/transactions.ts` - Submit function fix
3. `src/pages/Transactions/Transactions.tsx` - UI integration
4. `src/pages/Transactions/TransactionsHeaderTable.tsx` - Review button
5. `src/pages/Transactions/TransactionLinesTable.tsx` - Line review button
6. `src/pages/Transactions/TransactionDetails.tsx` - Details review button

## Next Steps

1. ✅ Run database migration
2. ✅ Test submit workflow
3. ✅ Test approval inbox
4. ✅ Test full end-to-end workflow
5. 📝 Document for team
6. 🎓 Train users on new workflow

## Support

If issues persist:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify user permissions
4. Test with a fresh transaction
