# 🚀 QUICK INTEGRATION STEPS

## ✅ COMPLETED
1. ✅ Database migration successful
2. ✅ Service layer created
3. ✅ React hooks created
4. ✅ UI components created
5. ✅ Route added to `/approvals/lines`

---

## 🎯 NEXT: Integrate with Transaction Creation

### Option 1: Add Submit Button to Transaction Details

**In**: `src/pages/Transactions/Transactions.tsx`

**Add import at top**:
```typescript
import { submitTransactionForLineApproval } from '@/services/lineApprovalService'
```

**Add this function** (around line 200-300, near other transaction actions):
```typescript
const handleSubmitForLineApproval = async (transactionId: string) => {
  try {
    setIsSaving(true)
    const result = await submitTransactionForLineApproval(transactionId)
    
    if (result.success) {
      showToast('success', `✅ ${result.lines_submitted} lines submitted for approval!`)
      await loadTransactions() // Refresh list
    }
  } catch (error) {
    showToast('error', 'Failed to submit for approval')
    console.error(error)
  } finally {
    setIsSaving(false)
  }
}
```

**Add button in transaction details panel** (find where other action buttons are):
```typescript
<Button
  variant="contained"
  color="primary"
  onClick={() => handleSubmitForLineApproval(transaction.id)}
  disabled={isSaving}
>
  Submit for Line Approval
</Button>
```

---

### Option 2: Auto-Submit After Transaction Creation

**In**: `TransactionWizard.tsx` or wherever `onSubmit` is handled

**Find the onSubmit handler** and add after transaction is created:
```typescript
// After transaction and lines are created:
const result = await submitTransactionForLineApproval(transactionId)
if (result.success) {
  showToast('success', `Transaction created and ${result.lines_submitted} lines submitted for approval!`)
}
```

---

## 🧪 TESTING

### Test 1: Create Transaction
1. Go to Transactions page
2. Create new transaction with 2-3 lines
3. Click "Submit for Line Approval"
4. Check: Lines should be in 'pending' status

### Test 2: View Inbox
1. Navigate to `/approvals/lines`
2. Should see pending lines
3. Try approving one line
4. Check progress updates

### Test 3: Full Approval Flow
1. Create transaction with 3 lines
2. Submit for approval
3. Go to inbox
4. Approve all 3 lines
5. Check transaction status = 'approved'

---

## 📊 VERIFY IN DATABASE

```sql
-- Check a transaction's approval status
SELECT 
  t.id,
  t.entry_number,
  t.status,
  t.lines_total_count,
  t.lines_approved_count,
  t.all_lines_approved
FROM transactions t
WHERE t.entry_number = 'YOUR-ENTRY-NUMBER';

-- Check line statuses
SELECT 
  line_no,
  line_status,
  assigned_approver_id,
  approved_by,
  approved_at
FROM transaction_lines
WHERE transaction_id = 'YOUR-TRANSACTION-ID'
ORDER BY line_no;
```

---

## 🎉 YOU'RE DONE!

The system is fully functional. Just add the submit button and test!

**Access the inbox at**: `/approvals/lines`
