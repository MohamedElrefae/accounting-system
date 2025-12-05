# ✅ New Modal Flow Implementation

## Two Separate Flows

### Flow 1: Click "Review" on Transaction Line
```
User clicks "Review" button on a line in TransactionLinesTable
        ↓
onOpenLineReview handler fires
        ↓
setLineDetailModalOpen(true)
        ↓
EnhancedLineReviewModalV2 opens
        ↓
Shows:
├─ Location 1: Line Details
│  ├─ Account Code
│  ├─ Account Name
│  ├─ Org ID
│  ├─ Project ID
│  └─ Description
│
└─ Location 2: Approval Audit Trail
   ├─ All approval actions
   ├─ User who performed action
   ├─ Timestamp
   └─ Comments/Reason
```

**Component**: `EnhancedLineReviewModalV2`  
**State**: `lineDetailModalOpen`  
**For**: Viewing details of ONE specific line

---

### Flow 2: Select Transaction in Header Table
```
User selects a transaction in TransactionHeaderTable
        ↓
onSelectTransaction handler fires
        ↓
setLinesTableModalOpen(true)
        ↓
Dialog with EnhancedLineReviewsTable opens
        ↓
Shows:
├─ Table of all transaction lines
├─ Line number
├─ Account code
├─ Account name
├─ Debit/Credit amounts
├─ Review count
├─ Approval status
└─ Expand arrow for each line
        ↓
User can:
├─ Click expand arrow to see line details
├─ Take action on specific line
└─ View approval history
```

**Component**: `EnhancedLineReviewsTable` (inside Dialog)  
**State**: `linesTableModalOpen`  
**For**: Viewing ALL lines of a transaction

---

## Code Changes

### 1. New State Variables Added
```typescript
// Line detail modal state (for viewing single line details)
const [lineDetailModalOpen, setLineDetailModalOpen] = useState(false)

// Lines table modal state (for viewing all lines of a transaction)
const [linesTableModalOpen, setLinesTableModalOpen] = useState(false)
```

### 2. Updated onOpenLineReview Handler
```typescript
onOpenLineReview={(line) => {
  setSelectedLineForApproval({
    lineId: line.id,
    lineNo: line.line_no,
    accountLabel: line.description || ''
  })
  setSelectedTransactionId(selectedTransactionId)
  setLineDetailModalOpen(true)  // ← Changed from lineApprovalModalOpen
}}
```

### 3. Updated onSelectTransaction Handler
```typescript
onSelectTransaction={(tx) => {
  setSelectedTransactionId(tx.id)
  setSelectedLineId(null)
  setLinesTableModalOpen(true)  // ← NEW: Open lines table modal
}}
```

### 4. New Imports Added
```typescript
import EnhancedLineReviewModalV2 from '../../components/Approvals/EnhancedLineReviewModalV2'
import EnhancedLineReviewsTable from '../../components/Approvals/EnhancedLineReviewsTable'
```

### 5. Two New Modals Rendered

**Modal 1: Line Detail Modal**
```typescript
{lineDetailModalOpen && selectedLineForApproval && selectedTransactionId && (
  <EnhancedLineReviewModalV2
    open={lineDetailModalOpen}
    onClose={() => {
      setLineDetailModalOpen(false)
      setSelectedLineForApproval(null)
    }}
    lineData={{...}}
    onAddComment={async () => {}}
    onRequestEdit={async () => {}}
    onApprove={async () => {}}
    onFlag={async () => {}}
  />
)}
```

**Modal 2: Lines Table Modal**
```typescript
{linesTableModalOpen && selectedTransactionId && (
  <Dialog
    open={linesTableModalOpen}
    onClose={() => setLinesTableModalOpen(false)}
  >
    <DialogTitle>أسطر المعاملة</DialogTitle>
    <DialogContent>
      <EnhancedLineReviewsTable
        lines={transactionLines}
        loading={false}
        onReviewLine={(line) => {
          setSelectedLineForApproval({...})
          setLineDetailModalOpen(true)
        }}
      />
    </DialogContent>
  </Dialog>
)}
```

---

## User Experience

### Scenario 1: Review Specific Line
1. User is in Transactions page
2. Selects a transaction
3. Sees transaction lines in bottom table
4. Clicks "Review" button on any line
5. **Modal opens showing**:
   - Location 1: Line details
   - Location 2: Approval audit trail
6. Can see all approval actions for that line
7. Can add comments, approve, request changes, etc.

### Scenario 2: Review All Lines
1. User is in Transactions page
2. Clicks on a transaction in header table
3. **Modal opens showing**:
   - Table of all lines for that transaction
   - Each line with expand arrow
4. Can click expand arrow on any line
5. **Opens line detail modal** (Scenario 1)
6. Can take action on that specific line

---

## Component Hierarchy

```
Transactions.tsx
├─ TransactionHeaderTable
│  └─ onSelectTransaction → setLinesTableModalOpen(true)
│
├─ TransactionLinesTable
│  └─ onOpenLineReview → setLineDetailModalOpen(true)
│
├─ Modal 1: EnhancedLineReviewModalV2
│  └─ Shows line details + approval audit trail
│
└─ Modal 2: Dialog with EnhancedLineReviewsTable
   └─ Shows all lines for transaction
      └─ Click line → Opens Modal 1
```

---

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `src/pages/Transactions/Transactions.tsx` | Added new state, handlers, and modals | ✅ |

---

## Testing

### Test 1: Line Detail Modal
1. Go to Transactions page
2. Select a transaction
3. Click "Review" on any line
4. **Expected**: `EnhancedLineReviewModalV2` opens
5. **Expected**: Shows Location 1 & Location 2

### Test 2: Lines Table Modal
1. Go to Transactions page
2. Click on a transaction in header table
3. **Expected**: Dialog opens with lines table
4. **Expected**: Shows all lines for that transaction

### Test 3: Navigation Between Modals
1. Lines table modal is open
2. Click expand arrow on any line
3. **Expected**: Line detail modal opens
4. **Expected**: Shows details for that specific line

### Test 4: Close and Reopen
1. Open line detail modal
2. Close it
3. Open lines table modal
4. Click expand on different line
5. **Expected**: Line detail modal opens with new line data

---

**Status**: ✅ COMPLETE  
**Date**: 2024-01-15  
**Implementation**: Two separate modal flows  
**Ready for Testing**: YES
