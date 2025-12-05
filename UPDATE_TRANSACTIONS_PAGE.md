# Update Transactions Page - Quick Guide

## Current State
The `Transactions.tsx` page uses the old `LineApprovalModal` component. While it still works, it doesn't have the enhanced features.

## Two Options

### Option 1: Keep Using LineApprovalModal (Recommended for Backward Compatibility)

**Status:** ✅ Already Updated
- The modal now includes review history
- Shows line amounts
- Supports flag action
- Better visual organization
- **No changes needed!**

### Option 2: Use New ApprovalWorkflowManager (Recommended for Full Features)

**Status:** Requires Update

#### Step 1: Update Imports

**File:** `src/pages/Transactions/Transactions.tsx`

**Find:**
```typescript
import LineApprovalModal from '../../components/Transactions/LineApprovalModal'
```

**Replace with:**
```typescript
import ApprovalWorkflowManager from '../../components/Approvals/ApprovalWorkflowManager'
```

#### Step 2: Update State Variables

**Find:**
```typescript
const [lineApprovalModalOpen, setLineApprovalModalOpen] = useState(false)
const [selectedLineForApproval, setSelectedLineForApproval] = useState<{
  lineId: string
  lineNo: number
  accountLabel: string
}>()
```

**Add:**
```typescript
const [selectedApprovalRequestId, setSelectedApprovalRequestId] = useState<string | null>(null)
```

#### Step 3: Update Modal Rendering

**Find (around line 3461):**
```typescript
{/* Line Approval Modal */}
{selectedLineForApproval && (
  <LineApprovalModal
    open={lineApprovalModalOpen}
    onClose={() => {
      setLineApprovalModalOpen(false)
      setSelectedLineForApproval(null)
    }}
    lineNo={selectedLineForApproval.lineNo}
    accountLabel={selectedLineForApproval.accountLabel}
    onApprove={async (notes) => {
      try {
        const { approveLine } = await import('../../services/lineApprovalService')
        const result = await approveLine(selectedLineForApproval.lineId, notes)
        if (result.transaction_approved) {
          showToast('✅ تم اعتماد جميع السطور! تمت الموافقة على المعاملة!', { severity: 'success' })
          await reload()
        } else {
          showToast(`✅ تم اعتماد السطر - ${result.message}`, { severity: 'success' })
          if (selectedTransactionId) {
            const { data } = await supabase
              .from('transaction_lines')
              .select('*')
              .eq('transaction_id', selectedTransactionId)
              .order('line_no', { ascending: true })
            if (data) setTransactionLines(data)
          }
        }
      } catch (err: any) {
        showToast(err?.message || 'فشل اعتماد السطر', { severity: 'error' })
        throw err
      }
    }}
    onRequestEdit={async (reason) => {
      // Handle request edit
    }}
    onReject={async (reason) => {
      // Handle reject
    }}
  />
)}
```

**Replace with:**
```typescript
{/* Enhanced Approval Workflow Manager */}
{selectedLineForApproval && selectedTransactionId && selectedApprovalRequestId && (
  <ApprovalWorkflowManager
    transactionId={selectedTransactionId}
    approvalRequestId={selectedApprovalRequestId}
    onApprovalComplete={() => {
      setLineApprovalModalOpen(false)
      setSelectedLineForApproval(null)
      setSelectedApprovalRequestId(null)
      showToast('✅ تمت الموافقة على جميع الأسطر!', { severity: 'success' })
      reload()
    }}
    onApprovalFailed={(error) => {
      showToast(error, { severity: 'error' })
    }}
  />
)}
```

#### Step 4: Update Event Handler

**Find:**
```typescript
useEffect(() => {
  const handleOpenModal = (event: any) => {
    const { lineId, lineNo, accountLabel } = event.detail
    setSelectedLineForApproval({ lineId, lineNo, accountLabel })
    setLineApprovalModalOpen(true)
  }
  window.addEventListener('openLineApprovalModal', handleOpenModal)
  return () => window.removeEventListener('openLineApprovalModal', handleOpenModal)
}, [])
```

**Update to:**
```typescript
useEffect(() => {
  const handleOpenModal = (event: any) => {
    const { lineId, lineNo, accountLabel, approvalRequestId } = event.detail
    setSelectedLineForApproval({ lineId, lineNo, accountLabel })
    setSelectedApprovalRequestId(approvalRequestId)
    setLineApprovalModalOpen(true)
  }
  window.addEventListener('openLineApprovalModal', handleOpenModal)
  return () => window.removeEventListener('openLineApprovalModal', handleOpenModal)
}, [])
```

---

## Comparison

| Feature | Old Modal | New Manager |
|---------|-----------|------------|
| Line comments | ❌ | ✅ |
| Request edits | ❌ | ✅ |
| Flag lines | ❌ | ✅ |
| Review history | ❌ | ✅ |
| Progress tracking | ❌ | ✅ |
| Status display | ❌ | ✅ |
| Tabbed interface | ❌ | ✅ |
| Final approval | ❌ | ✅ |

---

## Testing After Update

1. **Navigate to Transactions page**
2. **Create a transaction with multiple lines**
3. **Click on a line to open approval modal**
4. **Verify:**
   - ✅ Modal opens correctly
   - ✅ All action buttons work
   - ✅ Comments can be added
   - ✅ Status updates in real-time
   - ✅ Final approval works

---

## Rollback

If you need to revert to the old modal:

1. Remove the `ApprovalWorkflowManager` import
2. Re-add the `LineApprovalModal` import
3. Restore the old JSX code
4. The old modal still works and is backward compatible

---

## Notes

- **Option 1 (Keep Old Modal):** Minimal changes, still works, has some enhancements
- **Option 2 (Use New Manager):** Full features, better UX, requires more changes
- **Recommendation:** Start with Option 1, upgrade to Option 2 later if needed

---

**Status:** Ready to implement

Choose your option and follow the steps above!

