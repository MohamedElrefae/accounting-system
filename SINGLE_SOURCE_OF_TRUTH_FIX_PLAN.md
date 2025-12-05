# ✅ Single Source of Truth - Fix Plan

## The Core Issue
Multiple components are fetching the same data independently, causing sync issues.

## The Solution
**ONE data fetch, ALL components read from it**

## Implementation

### Current State (BROKEN)
```
Transactions.tsx
├── transactionLines (fetched from lineReviewService) ✅
├── TransactionLinesTable (reads from transactionLines) ✅
├── Modal (reads from transactionLines) ✅
└── Sidebar (fetches independently) ❌ PROBLEM
```

### Fixed State
```
Transactions.tsx
├── transactionLines (fetched ONCE from lineReviewService) ✅
├── TransactionLinesTable (reads from transactionLines) ✅
├── Modal (reads from transactionLines) ✅
└── Sidebar (reads from transactionLines) ✅
```

## What's Already Correct

✅ **Transactions.tsx**
- Fetches lines with `getLineReviewsForTransaction()`
- Stores in `transactionLines` state
- Passes to components

✅ **TransactionLinesTable**
- Receives `transactionLines` as prop
- Displays from prop
- Shows correct status

✅ **Modal (EnhancedLineReviewModalV2)**
- Receives `lineData` as prop
- Displays from prop
- Shows correct status

## What Needs Fixing

❌ **Sidebar/Details Panel**
- May be fetching independently
- May not be reading from `transactionLines` state
- Showing different status

## Action Items

### 1. Audit Sidebar Component
- Check if it fetches data independently
- Check if it reads from props or state

### 2. Update Sidebar
- Remove independent fetches
- Read from `transactionLines` prop
- Pass data from Transactions.tsx

### 3. Verify All Components
- TransactionLinesTable ✅
- Modal ✅
- Sidebar ❌
- Any other components showing approval status

### 4. Test Sync
- Change approval status
- Verify ALL components update
- No stale data

## Code Pattern (CORRECT)

```typescript
// In Transactions.tsx
const [transactionLines, setTransactionLines] = useState<any[]>([])

// Fetch ONCE
useEffect(() => {
  const lines = await getLineReviewsForTransaction(selectedTransactionId)
  setTransactionLines(lines)
}, [selectedTransactionId])

// Pass to components
<TransactionLinesTable lines={transactionLines} />
<Modal lineData={transactionLines.find(l => l.id === selectedLineId)} />
<Sidebar lines={transactionLines} />
```

## Code Pattern (WRONG - Don't Do This)

```typescript
// In Sidebar component
const [lines, setLines] = useState([])

// Fetch independently ❌
useEffect(() => {
  const lines = await getLineReviewsForTransaction(selectedTransactionId)
  setLines(lines)
}, [selectedTransactionId])

// Shows different data ❌
<div>{lines.map(l => <div>{l.status}</div>)}</div>
```

## Expected Result

After fix:
- ✅ All components show same approval status
- ✅ When status changes, all components update
- ✅ No stale data
- ✅ No sync issues
- ✅ Single source of truth

---

## Next Steps

1. Identify which component is fetching independently
2. Remove independent fetch
3. Pass data from Transactions.tsx
4. Test sync
5. Verify all components show same status

This is a **data architecture fix**, not a bug fix.
