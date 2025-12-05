# Line-Level Approval Implementation - Exact Steps

## ✅ COMPLETED
1. Fixed icon import error in LineApprovalInbox
2. Fixed RPC function type mismatch (VARCHAR → TEXT)
3. Created test data with 2 pending lines
4. Replaced transaction-level approve/reject/revise buttons with "Review Lines" button
5. Added approval progress badge showing "X/Y approved (Z%)"

## 🔄 IN PROGRESS - TransactionWizard Enhancement

### Current State
- TransactionWizard opens in edit mode when clicking "Review Lines"
- Shows step 2 (lines) with all line data
- No approval controls yet

### Required Changes

#### 1. Add Line Approval State to TransactionWizard
```typescript
// Add to TransactionWizard.tsx state
const [lineApprovalMode, setLineApprovalMode] = useState(false)
const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set())
const [lineStatuses, setLineStatuses] = useState<Record<string, {
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  approved_by?: string
  rejected_by?: string
  rejection_reason?: string
}>>({})
```

#### 2. Detect Approval Mode
```typescript
// In useEffect or props
useEffect(() => {
  if (editingTransaction && mode === 'pending') {
    setLineApprovalMode(true)
    // Fetch line statuses
    fetchLineStatuses(editingTransaction.id)
  }
}, [editingTransaction, mode])
```

#### 3. Add Approval Controls to Line Rows
For each line in step 2, add:
- Checkbox for bulk selection
- Status badge (pending/approved/rejected)
- Individual approve/reject buttons
- Show approver name if approved

#### 4. Add Bulk Action Buttons
At top of lines table:
- "Select All" checkbox
- "Approve Selected" button (green)
- "Reject Selected" button (red)
- Counter: "3 lines selected"

#### 5. Wire Up Approval Functions
```typescript
import { approveLine, rejectLine } from '../../services/lineApprovalService'

const handleApproveLine = async (lineId: string, notes?: string) => {
  const result = await approveLine(lineId, notes)
  if (result.transaction_approved) {
    showToast('✅ All lines approved! Transaction approved!')
  }
  await refreshLineStatuses()
}

const handleBulkApprove = async () => {
  for (const lineId of selectedLines) {
    await approveLine(lineId)
  }
  await refreshLineStatuses()
  setSelectedLines(new Set())
}
```

## 📋 UI Layout for Step 2 (Lines) in Approval Mode

```
┌─────────────────────────────────────────────────────────┐
│ بنود المعاملة - وضع المراجعة                            │
├─────────────────────────────────────────────────────────┤
│ [✓] Select All    [Approve Selected (3)] [Reject Selected] │
├─────────────────────────────────────────────────────────┤
│ [✓] Line 1: 1000-Assets | Debit: 1,000                 │
│     Status: ⏳ Pending | [✅ Approve] [❌ Reject]        │
├─────────────────────────────────────────────────────────┤
│ [✓] Line 2: 2000-Liabilities | Credit: 1,000           │
│     Status: ⏳ Pending | [✅ Approve] [❌ Reject]        │
├─────────────────────────────────────────────────────────┤
│ [ ] Line 3: 3000-Equity | Debit: 500                   │
│     Status: ✅ Approved by user@example.com             │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Next Actions

1. **Modify TransactionWizard.tsx:**
   - Add approval mode detection
   - Add checkbox column to lines table
   - Add status badge column
   - Add approve/reject buttons per line
   - Add bulk action controls

2. **Update Transactions.tsx:**
   - Pass `mode='pending'` to wizard when opening from pending page
   - Handle approval callbacks
   - Refresh transaction list after approvals

3. **Test Flow:**
   - Open /transactions/pending
   - Click "Review Lines" on test transaction
   - Wizard opens showing lines with approval controls
   - Select lines and approve
   - Verify progress updates
   - Verify transaction auto-approves when all lines approved

## 📝 Code Snippets Ready to Use

### Line Status Badge Component
```tsx
const LineStatusBadge = ({ status, approver }: { status: string, approver?: string }) => {
  const config = {
    pending: { label: 'قيد المراجعة', color: '#f59e0b', icon: '⏳' },
    approved: { label: 'معتمد', color: '#10b981', icon: '✅' },
    rejected: { label: 'مرفوض', color: '#ef4444', icon: '❌' },
    draft: { label: 'مسودة', color: '#6b7280', icon: '📝' }
  }[status] || config.draft
  
  return (
    <span style={{ 
      background: config.color, 
      color: 'white', 
      padding: '4px 8px', 
      borderRadius: '4px',
      fontSize: '12px'
    }}>
      {config.icon} {config.label}
      {approver && ` - ${approver}`}
    </span>
  )
}
```

### Bulk Approve Handler
```typescript
const handleBulkApprove = async () => {
  if (selectedLines.size === 0) {
    showToast('Please select lines to approve', { severity: 'warning' })
    return
  }
  
  setIsSubmitting(true)
  try {
    const results = await Promise.all(
      Array.from(selectedLines).map(lineId => approveLine(lineId))
    )
    
    const allApproved = results.some(r => r.transaction_approved)
    if (allApproved) {
      showToast('🎉 All lines approved! Transaction is now approved!', { severity: 'success' })
      onClose() // Close wizard
      await reload() // Refresh transaction list
    } else {
      showToast(`✅ ${selectedLines.size} lines approved`, { severity: 'success' })
      await fetchLineStatuses(draftTransactionId!)
    }
    
    setSelectedLines(new Set())
  } catch (err) {
    showToast('Failed to approve lines', { severity: 'error' })
  } finally {
    setIsSubmitting(false)
  }
}
```

## ⚠️ Important Notes

1. **Permission Check**: Only show approval controls if user has `transactions.review` permission
2. **Read-Only Mode**: When in approval mode, disable editing of line amounts/accounts
3. **Status Sync**: After any approval action, refresh line statuses from database
4. **Transaction Auto-Approval**: Backend trigger handles this automatically
5. **Audit Trail**: All approvals are logged in audit_logs table

## 🚀 Ready to Implement

The foundation is complete. The wizard just needs approval UI controls added to step 2.
Would you like me to implement the TransactionWizard changes now?
