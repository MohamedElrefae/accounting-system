# LINE-BASED APPROVAL IMPLEMENTATION GUIDE
## Complete End-to-End Setup

---

## ✅ COMPLETED STEPS

### 1. Database Migration ✓
**File**: `supabase/migrations/20250120_line_based_approval.sql`
- Added line approval columns to `transaction_lines`
- Added approval tracking to `transactions`
- Created view `v_line_approval_inbox`
- Created 5 functions for approval workflow
- Created trigger for auto-sync
- Created indexes for performance

### 2. Service Layer ✓
**File**: `src/services/lineApprovalService.ts`
- `submitTransactionForLineApproval()` - Submit all lines
- `getMyLineApprovals()` - Get inbox
- `approveLine()` - Approve a line
- `rejectLine()` - Reject a line
- `getTransactionApprovalStatus()` - Check progress
- `getTransactionLinesWithApproval()` - Get lines with details

### 3. React Hooks ✓
**File**: `src/hooks/useLineApprovals.ts`
- `useLineApprovalInbox()` - Manage inbox
- `useTransactionApprovalStatus()` - Monitor status
- `useTransactionLinesApproval()` - View lines

### 4. UI Components ✓
**File**: `src/components/Approvals/LineApprovalInbox.tsx`
- Full inbox UI with approve/reject
- Priority indicators
- Detailed line information
- Approval notes and rejection reasons

**File**: `src/components/Approvals/TransactionApprovalStatus.tsx`
- Progress bar
- Status indicators
- Line counts (approved/pending/rejected)

---

## 🚀 NEXT STEPS TO COMPLETE

### STEP 1: Run Database Migration

**In Supabase SQL Editor**:
```sql
-- Copy and paste the entire content of:
-- supabase/migrations/20250120_line_based_approval.sql
```

**Verify**:
```sql
-- Check columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
AND column_name IN ('line_status', 'approved_by', 'assigned_approver_id');
-- Should return 3 rows

-- Check functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%line%approval%';
-- Should return 5 functions

-- Check view
SELECT table_name FROM information_schema.views 
WHERE table_name = 'v_line_approval_inbox';
-- Should return 1 row
```

---

### STEP 2: Update Transaction Submit Logic

**In**: `src/pages/Transactions/Transactions.tsx` or wherever you handle transaction creation

**Add import**:
```typescript
import { submitTransactionForLineApproval } from '@/services/lineApprovalService'
```

**Update the submit handler**:
```typescript
// Find your existing transaction submit function
// It might look like this:
async function handleCreateTransaction(data: any) {
  try {
    // 1. Create transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        entry_date: data.entry_date,
        description: data.description,
        org_id: data.org_id,
        // ... other fields
      })
      .select()
      .single()
    
    if (error) throw error
    
    // 2. Create transaction lines
    const { error: linesError } = await supabase
      .from('transaction_lines')
      .insert(
        data.lines.map((line, idx) => ({
          transaction_id: transaction.id,
          line_no: idx + 1,
          account_id: line.account_id,
          debit_amount: line.debit_amount || 0,
          credit_amount: line.credit_amount || 0,
          description: line.description,
          org_id: line.org_id,
          project_id: line.project_id,
          cost_center_id: line.cost_center_id,
          // All lines start as 'draft' by default
        }))
      )
    
    if (linesError) throw linesError
    
    // 3. NEW: Submit for line-based approval
    const result = await submitTransactionForLineApproval(transaction.id)
    
    if (result.success) {
      showToast('success', `Transaction created! ${result.lines_submitted} lines submitted for approval`)
      onClose()
      refresh()
    }
    
  } catch (error) {
    showToast('error', 'Failed to create transaction')
    console.error(error)
  }
}
```

---

### STEP 3: Add Approval Inbox to Navigation

**In**: `src/App.tsx` or your routing file

**Add route**:
```typescript
import LineApprovalInbox from '@/components/Approvals/LineApprovalInbox'

// In your routes:
<Route path="/approvals/lines" element={<LineApprovalInbox />} />
```

**Add to navigation menu**:
```typescript
{
  label: 'Line Approvals',
  path: '/approvals/lines',
  icon: <CheckCircle />
}
```

---

### STEP 4: Add Approval Status to Transaction View

**In**: Transaction detail/view page

```typescript
import TransactionApprovalStatus from '@/components/Approvals/TransactionApprovalStatus'

// In your transaction detail component:
function TransactionDetail({ transactionId }: { transactionId: string }) {
  return (
    <Box>
      {/* Existing transaction details */}
      
      {/* NEW: Show approval status */}
      <TransactionApprovalStatus transactionId={transactionId} />
      
      {/* Rest of transaction details */}
    </Box>
  )
}
```

---

### STEP 5: Update Transaction List to Show Approval Status

**In**: `src/pages/Transactions/Transactions.tsx`

**Add columns to show approval progress**:
```typescript
// In your transaction list query, include:
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    *,
    lines_approved_count,
    lines_total_count,
    all_lines_approved
  `)

// In your table columns:
{
  field: 'approval_progress',
  headerName: 'Approval',
  width: 150,
  renderCell: (params) => {
    const approved = params.row.lines_approved_count || 0
    const total = params.row.lines_total_count || 0
    const progress = total > 0 ? (approved / total * 100) : 0
    
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress 
          variant="determinate" 
          value={progress}
          color={progress === 100 ? 'success' : 'warning'}
        />
        <Typography variant="caption">
          {approved}/{total}
        </Typography>
      </Box>
    )
  }
}
```

---

## 🎯 TESTING CHECKLIST

### Test 1: Create and Submit Transaction
```
1. Create new transaction with 3 lines
2. Submit transaction
3. Verify:
   ✓ All lines status = 'pending'
   ✓ Transaction status = 'pending'
   ✓ lines_total_count = 3
   ✓ lines_approved_count = 0
```

### Test 2: Approve Lines
```
1. Go to Line Approval Inbox
2. Approve line 1
3. Verify:
   ✓ Line 1 status = 'approved'
   ✓ Transaction shows 1/3 approved
4. Approve line 2
5. Verify:
   ✓ Transaction shows 2/3 approved
6. Approve line 3
7. Verify:
   ✓ All lines approved
   ✓ Transaction status = 'approved'
   ✓ all_lines_approved = TRUE
```

### Test 3: Reject Line
```
1. Create transaction with 2 lines
2. Submit for approval
3. Reject line 1 with reason
4. Verify:
   ✓ Line 1 status = 'rejected'
   ✓ Transaction status = 'requires_revision'
   ✓ Rejection reason saved
```

### Test 4: Approval Progress
```
1. Create transaction with 5 lines
2. Submit for approval
3. Approve 2 lines
4. Verify:
   ✓ Progress shows 40% (2/5)
   ✓ Status component shows correct counts
   ✓ Can't post yet
5. Approve remaining 3 lines
6. Verify:
   ✓ Progress shows 100%
   ✓ Can post = TRUE
```

---

## 📊 SQL QUERIES FOR TESTING

### Check Line Status
```sql
SELECT 
  tl.line_no,
  tl.line_status,
  tl.approved_by,
  tl.approved_at,
  a.code as account_code
FROM transaction_lines tl
LEFT JOIN glaccounts a ON tl.account_id = a.id
WHERE tl.transaction_id = '<transaction-id>'
ORDER BY tl.line_no;
```

### Check Transaction Status
```sql
SELECT 
  id,
  entry_number,
  status,
  approval_method,
  lines_total_count,
  lines_approved_count,
  all_lines_approved
FROM transactions
WHERE id = '<transaction-id>';
```

### Check Approval Inbox
```sql
SELECT * FROM v_line_approval_inbox
WHERE assigned_approver_id = '<user-id>';
```

### Check Audit Trail
```sql
SELECT 
  action,
  resource_type,
  details,
  created_at
FROM audit_logs
WHERE resource_id = '<transaction-id>'
ORDER BY created_at DESC;
```

---

## 🔧 TROUBLESHOOTING

### Issue: Lines not showing in inbox
**Check**:
1. Line status is 'pending'
2. assigned_approver_id is set
3. User ID matches assigned_approver_id

**Fix**:
```sql
-- Manually assign approver
UPDATE transaction_lines
SET assigned_approver_id = '<user-id>'
WHERE transaction_id = '<transaction-id>';
```

### Issue: Transaction not auto-approving
**Check**:
1. All lines have status = 'approved'
2. Trigger is enabled

**Fix**:
```sql
-- Manually trigger update
UPDATE transactions
SET 
  lines_approved_count = (
    SELECT COUNT(*) FROM transaction_lines 
    WHERE transaction_id = transactions.id 
    AND line_status = 'approved'
  ),
  all_lines_approved = (
    SELECT COUNT(*) = COUNT(*) FILTER (WHERE line_status = 'approved')
    FROM transaction_lines 
    WHERE transaction_id = transactions.id
  ),
  status = CASE 
    WHEN all_lines_approved THEN 'approved'
    ELSE status
  END
WHERE id = '<transaction-id>';
```

### Issue: Functions not found
**Check**:
```sql
SELECT routine_name, routine_schema
FROM information_schema.routines
WHERE routine_name LIKE '%line%';
```

**Fix**: Re-run migration

---

## ✅ SUCCESS CRITERIA

After implementation, you should have:

```
✅ Database migration applied successfully
✅ All 5 functions created
✅ View v_line_approval_inbox exists
✅ Trigger auto-updates transaction
✅ Service layer compiles without errors
✅ Hooks work correctly
✅ Line Approval Inbox shows pending lines
✅ Approve/Reject buttons work
✅ Transaction auto-approves when all lines approved
✅ Progress tracking works
✅ Audit logs capture all actions
✅ Can post approved transactions
```

---

## 🎉 YOU'RE DONE!

The line-based approval system is now fully implemented!

**Key Features**:
- ✅ Line-level approval control
- ✅ Transaction auto-approval
- ✅ Progress tracking
- ✅ Approval inbox
- ✅ Reject with reasons
- ✅ Audit trail
- ✅ Automatic sync via trigger

**Next Steps**:
1. Run the migration
2. Test with sample transactions
3. Train users on new workflow
4. Monitor approval performance
