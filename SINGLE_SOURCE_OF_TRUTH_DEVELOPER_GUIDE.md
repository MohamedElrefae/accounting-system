# Single Source of Truth - Developer Guide

## Quick Reference

### The Pattern

```typescript
// Parent Component (Transactions.tsx)
const [transactionLines, setTransactionLines] = useState<any[]>([])

// Fetch ONCE
useEffect(() => {
  const lines = await getLineReviewsForTransaction(selectedTransactionId)
  setTransactionLines(lines)
}, [selectedTransactionId])

// Pass to ALL children
<ChildComponent transactionLines={transactionLines} />
```

### Child Components

```typescript
// Child Component
interface Props {
  transactionLines?: any[]
}

const ChildComponent: React.FC<Props> = ({ transactionLines: propsTransactionLines }) => {
  const [lines, setLines] = useState<any[]>([])
  
  // Use prop, don't fetch
  useEffect(() => {
    if (propsTransactionLines) {
      setLines(propsTransactionLines)
    }
  }, [propsTransactionLines])
  
  return <div>{lines.map(l => <div>{l.status}</div>)}</div>
}
```

---

## DO's ✅

- ✅ Fetch data in parent component
- ✅ Pass data via props to children
- ✅ Update parent state when data changes
- ✅ Let children re-render from props
- ✅ Use useEffect to sync with props

---

## DON'Ts ❌

- ❌ Fetch same data in multiple components
- ❌ Maintain separate state for same data
- ❌ Ignore prop updates
- ❌ Create independent data sources
- ❌ Bypass parent state

---

## Adding New Components

If you need to add a new component that displays transaction lines:

### 1. Add to Props Interface
```typescript
interface Props {
  transactionLines?: any[]
}
```

### 2. Receive in Component
```typescript
const MyComponent: React.FC<Props> = ({ transactionLines: propsTransactionLines }) => {
```

### 3. Sync with Props
```typescript
useEffect(() => {
  if (propsTransactionLines) {
    setMyLines(propsTransactionLines)
  }
}, [propsTransactionLines])
```

### 4. Pass from Parent
```typescript
<MyComponent transactionLines={transactionLines} />
```

---

## Debugging

### Check if data is synced
```typescript
// In browser console
// 1. Open Transactions page
// 2. Select a transaction
// 3. Check console logs:
console.log('Lines fetched:', lines.length)
console.log('Line data:', lines)
```

### Verify all components see same data
```typescript
// In each component
useEffect(() => {
  console.log('Component received lines:', propsTransactionLines)
}, [propsTransactionLines])
```

### Check for independent fetches
```typescript
// Search for this pattern in components:
// ❌ BAD: Independent fetch
const [lines, setLines] = useState([])
useEffect(() => {
  const lines = await getLineReviewsForTransaction(id)
  setLines(lines)
}, [id])

// ✅ GOOD: Use props
useEffect(() => {
  if (propsTransactionLines) {
    setLines(propsTransactionLines)
  }
}, [propsTransactionLines])
```

---

## Common Issues

### Issue: Component shows old data
**Cause:** Not syncing with props
**Fix:** Add useEffect to sync with propsTransactionLines

### Issue: Different components show different status
**Cause:** Independent fetches
**Fix:** Remove independent fetch, use props instead

### Issue: Changes don't update all components
**Cause:** Not re-fetching in parent
**Fix:** Trigger refresh in parent component

---

## Performance Tips

1. **Memoize expensive computations**
   ```typescript
   const processedLines = useMemo(() => {
     return transactionLines.map(l => ({ ...l, processed: true }))
   }, [transactionLines])
   ```

2. **Use useCallback for handlers**
   ```typescript
   const handleApprove = useCallback(async (lineId) => {
     // Handle approval
   }, [])
   ```

3. **Avoid unnecessary re-renders**
   ```typescript
   const MemoizedComponent = React.memo(MyComponent)
   ```

---

## Testing

### Unit Test Example
```typescript
describe('Single Source of Truth', () => {
  it('should sync data across components', () => {
    const lines = [{ id: '1', status: 'pending' }]
    
    render(
      <Transactions>
        <TransactionLinesTable transactionLines={lines} />
        <UnifiedTransactionDetailsPanel transactionLines={lines} />
      </Transactions>
    )
    
    // Both should show same status
    expect(screen.getAllByText('pending')).toHaveLength(2)
  })
})
```

### Integration Test Example
```typescript
describe('Approval Status Sync', () => {
  it('should update all components when status changes', async () => {
    // 1. Select transaction
    // 2. Verify initial status in all components
    // 3. Change status
    // 4. Verify updated status in all components
  })
})
```

---

## Related Files

- `src/pages/Transactions/Transactions.tsx` - Parent component with state
- `src/components/Transactions/UnifiedTransactionDetailsPanel.tsx` - Child component
- `src/pages/Transactions/TransactionLinesTable.tsx` - Child component
- `src/components/Approvals/EnhancedLineReviewModalV2.tsx` - Child component
- `src/services/lineReviewService.ts` - Data fetching service

---

## Questions?

Refer to:
- `SINGLE_SOURCE_OF_TRUTH_VERIFICATION_COMPLETE.md` - Full verification
- `SINGLE_SOURCE_OF_TRUTH_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `SINGLE_SOURCE_OF_TRUTH_FIX_PLAN.md` - Original plan

