# Single Source of Truth - Complete Data Flow

## End-to-End Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Transactions.tsx (Parent)                     │
│                                                                   │
│  State:                                                           │
│  ├── selectedTransactionId: string                               │
│  ├── transactionLines: any[] ← SINGLE SOURCE OF TRUTH            │
│  └── refreshLinesTrigger: number                                 │
│                                                                   │
│  useEffect(() => {                                               │
│    if (selectedTransactionId) {                                  │
│      const lines = await getLineReviewsForTransaction(...)       │
│      setTransactionLines(lines)  ← UPDATE STATE                  │
│    }                                                              │
│  }, [selectedTransactionId, refreshLinesTrigger])                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ transactionLines prop
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ TransactionLines │ │ Details Panel    │ │ Modal            │
│ Table            │ │ (Unified)        │ │ (Review)         │
│                  │ │                  │ │                  │
│ Receives:        │ │ Receives:        │ │ Receives:        │
│ transactionLines │ │ transactionLines │ │ lineData (from   │
│                  │ │                  │ │ transactionLines)│
│ Displays:        │ │ Displays:        │ │                  │
│ - All lines      │ │ - Line items     │ │ Displays:        │
│ - Status         │ │ - Status         │ │ - Line details   │
│ - Approval info  │ │ - Approval info  │ │ - Approval trail │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    All show SAME data
```

---

## Step-by-Step Data Flow

### Step 1: User Selects Transaction

```typescript
// In Transactions.tsx
const handleSelectTransaction = (tx: TransactionRecord) => {
  setSelectedTransactionId(tx.id)  // ← Triggers useEffect
  setDetailsFor(tx)
  setDetailsOpen(true)
}
```

### Step 2: useEffect Fetches Lines

```typescript
// In Transactions.tsx
useEffect(() => {
  if (!selectedTransactionId) {
    setTransactionLines([])
    return
  }
  
  try {
    // Import service
    const { getLineReviewsForTransaction } = await import('../../services/lineReviewService')
    
    // Fetch lines with approval history
    const lines = await getLineReviewsForTransaction(selectedTransactionId)
    
    // Update state (SINGLE SOURCE OF TRUTH)
    setTransactionLines(lines)
    
  } catch (error) {
    console.error('Error fetching lines:', error)
    setTransactionLines([])
  }
}, [selectedTransactionId, refreshLinesTrigger])
```

### Step 3: Data Structure

```typescript
// What getLineReviewsForTransaction returns
interface LineWithApprovalData {
  id: string
  transaction_id: string
  account_id: string
  debit: number
  credit: number
  description: string
  
  // Approval data
  approval_status: 'pending' | 'approved' | 'rejected'
  approval_history: {
    id: string
    action: 'approve' | 'reject' | 'request_changes'
    actor_user_id: string
    actor_email: string
    created_at: string
    reason?: string
  }[]
  
  // Other fields
  project_id?: string
  cost_center_id?: string
  work_item_id?: string
}
```

### Step 4: Pass to Child Components

```typescript
// In Transactions.tsx render
<UnifiedTransactionDetailsPanel
  transaction={detailsFor}
  audit={audit}
  approvalHistory={approvalHistory}
  userNames={userNames}
  
  // ← PASS SINGLE SOURCE OF TRUTH
  transactionLines={transactionLines}
  
  // ... other props ...
/>

<TransactionLinesTable
  lines={transactionLines}
  onSelectLine={handleSelectLine}
/>

{lineDetailModalOpen && selectedLineId && (
  <EnhancedLineReviewModalV2
    lineData={transactionLines.find(l => l.id === selectedLineId)}
    onClose={() => setLineDetailModalOpen(false)}
  />
)}
```

### Step 5: Child Components Receive Data

```typescript
// In UnifiedTransactionDetailsPanel.tsx
interface Props {
  transactionLines?: any[]
  // ... other props ...
}

const UnifiedTransactionDetailsPanel: React.FC<Props> = ({
  transactionLines: propsTransactionLines,
  // ... other destructuring ...
}) => {
  const [txLines, setTxLines] = useState<any[]>([])
  
  // Sync with parent's data
  useEffect(() => {
    if (propsTransactionLines) {
      setTxLines(propsTransactionLines)
    }
  }, [propsTransactionLines])
  
  // Use txLines for rendering
  return (
    <div>
      {txLines.map(line => (
        <div key={line.id}>
          <span>{line.description}</span>
          <span className={`status-${line.approval_status}`}>
            {line.approval_status}
          </span>
        </div>
      ))}
    </div>
  )
}
```

### Step 6: User Performs Action

```typescript
// In UnifiedTransactionDetailsPanel.tsx
const handleApproveLineItem = async (lineId: string) => {
  try {
    // Perform approval action
    await approveLineItem(lineId)
    
    // Trigger refresh in parent
    setRefreshLinesTrigger(prev => prev + 1)
    
  } catch (error) {
    console.error('Error approving line:', error)
  }
}
```

### Step 7: Parent Re-fetches Data

```typescript
// In Transactions.tsx
// When refreshLinesTrigger changes, useEffect runs again
useEffect(() => {
  // ... fetch logic ...
  const lines = await getLineReviewsForTransaction(selectedTransactionId)
  setTransactionLines(lines)  // ← Update with new data
}, [selectedTransactionId, refreshLinesTrigger])  // ← Dependency
```

### Step 8: All Components Update

```
setTransactionLines(newLines)
        │
        ├─→ UnifiedTransactionDetailsPanel re-renders
        │   └─→ useEffect syncs with new props
        │       └─→ setTxLines(newLines)
        │           └─→ Component re-renders with new status
        │
        ├─→ TransactionLinesTable re-renders
        │   └─→ Receives new lines prop
        │       └─→ Component re-renders with new status
        │
        └─→ Modal re-renders (if open)
            └─→ Receives new lineData prop
                └─→ Component re-renders with new status
```

---

## Data Consistency Example

### Scenario: Approve a Line Item

**Initial State:**
```typescript
transactionLines = [
  {
    id: 'line-1',
    description: 'Office Supplies',
    approval_status: 'pending',  // ← All components show this
    approval_history: []
  }
]
```

**All Components Show:**
- TransactionLinesTable: "pending"
- Details Panel: "pending"
- Modal: "pending"

**User Clicks Approve:**
```typescript
await approveLineItem('line-1')
setRefreshLinesTrigger(prev => prev + 1)  // ← Trigger refresh
```

**Parent Re-fetches:**
```typescript
const lines = await getLineReviewsForTransaction(selectedTransactionId)
// Returns:
// {
//   id: 'line-1',
//   approval_status: 'approved',  // ← Updated
//   approval_history: [{
//     action: 'approve',
//     actor_email: 'user@example.com',
//     created_at: '2024-01-01T10:00:00Z'
//   }]
// }

setTransactionLines(lines)  // ← Update state
```

**All Components Update:**
- TransactionLinesTable: "approved" ✅
- Details Panel: "approved" ✅
- Modal: "approved" ✅

---

## Service Layer

### getLineReviewsForTransaction

```typescript
// In src/services/lineReviewService.ts
export async function getLineReviewsForTransaction(transactionId: string) {
  // Query 1: Get transaction lines
  const { data: lines } = await supabase
    .from('transaction_line_items')
    .select('*')
    .eq('transaction_id', transactionId)
  
  // Query 2: Get approval status for each line
  const lineIds = lines.map(l => l.id)
  const { data: approvals } = await supabase
    .from('line_approvals')
    .select('*')
    .in('line_id', lineIds)
  
  // Query 3: Get approval history
  const { data: history } = await supabase
    .from('approval_history')
    .select('*')
    .in('line_id', lineIds)
  
  // Combine data
  return lines.map(line => ({
    ...line,
    approval_status: approvals.find(a => a.line_id === line.id)?.status,
    approval_history: history.filter(h => h.line_id === line.id)
  }))
}
```

---

## Performance Metrics

### API Calls

**Before (Multiple Fetches):**
```
Transaction selected
├─ Transactions.tsx fetches lines
├─ UnifiedTransactionDetailsPanel fetches lines
└─ Modal fetches lines
= 3 API calls per transaction
```

**After (Single Fetch):**
```
Transaction selected
└─ Transactions.tsx fetches lines
= 1 API call per transaction
```

**Improvement:** 66% reduction in API calls

### Data Consistency

**Before:**
```
Component A shows: pending
Component B shows: approved
Component C shows: pending
= Inconsistent UI
```

**After:**
```
Component A shows: approved
Component B shows: approved
Component C shows: approved
= Consistent UI
```

---

## Troubleshooting

### Issue: Component not updating

**Check:**
1. Is component receiving transactionLines prop?
2. Is useEffect syncing with prop?
3. Is parent state being updated?

**Debug:**
```typescript
useEffect(() => {
  console.log('Received lines:', propsTransactionLines)
  if (propsTransactionLines) {
    setLines(propsTransactionLines)
  }
}, [propsTransactionLines])
```

### Issue: Stale data showing

**Check:**
1. Is refreshLinesTrigger being updated?
2. Is parent useEffect re-running?
3. Is new data being fetched?

**Debug:**
```typescript
useEffect(() => {
  console.log('Fetching lines for:', selectedTransactionId)
  // ... fetch logic ...
  console.log('Lines updated:', lines)
}, [selectedTransactionId, refreshLinesTrigger])
```

---

## Summary

The single source of truth pattern ensures:
- ✅ One fetch per transaction
- ✅ All components see same data
- ✅ Automatic sync on updates
- ✅ Better performance
- ✅ Easier maintenance

