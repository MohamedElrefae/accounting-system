# Testing Steps - Approval Workflow

## Prerequisites
- ✅ Database migration applied: `20250129_fix_line_approval_view.sql`
- ✅ User logged in to the application
- ✅ At least one draft transaction with lines exists

## Step 1: Run Quick Test SQL

1. Open Supabase SQL Editor
2. Run: `quick_test_approval.sql`
3. **Expected Results:**
   - Step 1: Shows your user ID (not null)
   - Step 2: Shows draft transactions
   - Step 5: Empty (no pending approvals yet)
   - Step 6: Empty (no pending lines yet)

## Step 2: Submit a Transaction via UI

1. Navigate to `/transactions/my`
2. Find a draft transaction (status: مسودة)
3. Click "إرسال للمراجعة" button
4. **Expected:**
   - Success toast: "تم إرسال المعاملة للمراجعة بنجاح"
   - Transaction status changes to "مُرسلة" or "قيد المراجعة"

## Step 3: Verify in Database

Run this SQL:
```sql
-- Check the transaction you just submitted
SELECT 
  t.id,
  t.entry_number,
  t.status,
  t.lines_total_count,
  t.lines_approved_count
FROM transactions t
WHERE t.entry_number = 'YOUR_ENTRY_NUMBER'  -- Replace with your transaction
ORDER BY t.created_at DESC;

-- Check the lines
SELECT 
  tl.id,
  tl.line_no,
  tl.line_status,
  tl.assigned_approver_id,
  tl.submitted_for_approval_at
FROM transaction_lines tl
WHERE tl.transaction_id = 'YOUR_TRANSACTION_ID'  -- Replace with your transaction ID
ORDER BY tl.line_no;
```

**Expected:**
- Transaction status: 'pending'
- Lines status: 'pending'
- assigned_approver_id: Your user ID
- submitted_for_approval_at: Current timestamp

## Step 4: Check Approval Inbox

1. Navigate to `/approvals/inbox`
2. Click "Lines" tab (📋 اعتماد السطور)
3. **Expected:**
   - Should see the lines you just submitted
   - Each line shows: entry number, line number, account, amounts
   - "Approve" and "Reject" buttons visible

## Step 5: Approve a Line

1. In the inbox, click "Approve" on the first line
2. (Optional) Add notes
3. Click "Approve" in the dialog
4. **Expected:**
   - Success toast
   - Line disappears from inbox
   - If it was the last line: "Transaction fully approved!" message

## Step 6: Verify Approval

Run this SQL:
```sql
-- Check line status
SELECT 
  tl.id,
  tl.line_no,
  tl.line_status,
  tl.approved_by,
  tl.approved_at,
  tl.review_notes
FROM transaction_lines tl
WHERE tl.transaction_id = 'YOUR_TRANSACTION_ID'
ORDER BY tl.line_no;

-- Check transaction status
SELECT 
  t.status,
  t.all_lines_approved,
  t.lines_approved_count,
  t.lines_total_count
FROM transactions t
WHERE t.id = 'YOUR_TRANSACTION_ID';
```

**Expected:**
- Approved line: status='approved', approved_by=your_id, approved_at=timestamp
- Other lines: still 'pending'
- Transaction: lines_approved_count incremented
- If all approved: status='approved', all_lines_approved=true

## Step 7: Test Full Workflow

1. Approve all remaining lines
2. **Expected:**
   - Last approval triggers transaction approval
   - Transaction status → 'approved'
   - all_lines_approved → true
   - Success message: "Transaction fully approved!"

## Step 8: Test via Transactions Page

1. Navigate to `/transactions/pending`
2. Find your submitted transaction
3. Click "مراجعة" button
4. **Expected:**
   - Opens ApprovalWorkflowManager modal
   - Shows all lines with their status
   - Can approve/reject from here

## Troubleshooting

### Issue: "Current user: null"
**Solution:** You're not logged in. Log in to the application first.

### Issue: No draft transactions
**Solution:** Create a new transaction:
1. Go to `/transactions/my`
2. Click "إضافة معاملة جديدة"
3. Add 2-3 lines
4. Save as draft

### Issue: Submit button doesn't work
**Check:**
- Browser console for errors
- Network tab for failed API calls
- Verify transaction has lines

### Issue: Inbox is empty after submit
**Check:**
```sql
-- Are lines pending?
SELECT COUNT(*) FROM transaction_lines WHERE line_status = 'pending';

-- Are they assigned to you?
SELECT COUNT(*) FROM transaction_lines 
WHERE line_status = 'pending' AND assigned_approver_id = auth.uid();

-- Check the view
SELECT * FROM v_line_approval_inbox;
```

### Issue: Can't approve lines
**Check:**
- User has `transactions.review` permission
- Lines are in 'pending' status
- You are the assigned approver

## Success Criteria

✅ Can submit transaction for approval
✅ Lines appear in approval inbox
✅ Can approve individual lines
✅ Transaction auto-approves when all lines approved
✅ Audit logs created for all actions
✅ UI updates reflect database changes

## Next Steps After Testing

1. Test with multiple users (different approvers)
2. Test rejection workflow
3. Test revision workflow
4. Add approval routing rules (if needed)
5. Configure notification system (if needed)
