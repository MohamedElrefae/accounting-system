# Debugging Guide for Dual-Table Transactions Page

## Quick Start

### Step 1: Open Browser Console
1. Press `F12` or right-click → Inspect
2. Go to **Console** tab
3. You should see messages like `🔍`, `❌`, `🚀` prefixes for debugging

### Step 2: Add Debugging Console Logging

Add these temporary console logs to trace the data flow:

#### File: `src/pages/Transactions/Transactions.tsx`

**At line 263 - In the useEffect that fetches transaction lines:**
```typescript
// Fetch transaction lines when transaction is selected
useEffect(() => {
  const fetchLines = async () => {
    console.log('🔄 useEffect triggered, selectedTransactionId:', selectedTransactionId);
    
    if (!selectedTransactionId) {
      console.log('⚠️ No transaction selected, clearing lines');
      setTransactionLines([])
      setSelectedLineId(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('transaction_lines')
        .select('*')
        .eq('transaction_id', selectedTransactionId)
        .order('line_no', { ascending: true })
      
      if (error) {
        console.error('❌ Supabase error fetching lines:', error);
        setTransactionLines([])
      } else if (Array.isArray(data)) {
        console.log('✅ Lines fetched successfully:', data.length, 'lines for transaction', selectedTransactionId);
        setTransactionLines(data)
      } else {
        console.warn('⚠️ Unexpected data format:', data);
        setTransactionLines([])
      }
    } catch (error) {
      console.error('❌ Exception fetching lines:', error)
      setTransactionLines([])
    }
  }
  fetchLines()
}, [selectedTransactionId])
```

**At line 751 - In the reload() function:**
```typescript
async function reload() {
  console.log('🚀 Reload triggered with filters:', {
    mode,
    searchTerm,
    approvalFilter,
    debitFilterId,
    creditFilterId,
    page,
    pageSize
  });

  const { rows, total } = await getTransactions({
    filters: {
      scope: mode === 'my' ? 'my' : 'all',
      pendingOnly: mode === 'pending',
      search: searchTerm,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      amountFrom: filters.amountFrom ? parseFloat(filters.amountFrom) : undefined,
      amountTo: filters.amountTo ? parseFloat(filters.amountTo) : undefined,
      debitAccountId: debitFilterId || undefined,
      creditAccountId: creditFilterId || undefined,
      orgId: orgFilterId || undefined,
      projectId: projectFilterId || undefined,
      classificationId: classificationFilterId || undefined,
      expensesCategoryId: expensesCategoryFilterId || undefined,
      workItemId: workItemFilterId || undefined,
      costCenterId: costCenterFilterId || undefined,
      analysisWorkItemId: (filters as any).analysis_work_item_id || undefined,
      approvalStatus: approvalFilter !== 'all' ? (approvalFilter as any) : undefined,
    },
    page,
    pageSize,
  })
  
  console.log('📊 Response from getTransactions:', {
    rowCount: rows?.length || 0,
    totalCount: total,
    firstRowStatus: rows?.[0]?.approval_status,
    hasContent: rows && rows.length > 0
  });

  setTransactions(rows)
  setTotalCount(total)
  // ... rest of function
}
```

#### File: `src/pages/Transactions/TransactionsHeaderTable.tsx`

**At line 276 - In the onRowClick handler:**
```typescript
onRowClick={(row) => {
  console.log('🔍 Transaction row clicked:', {
    id: row.original.id,
    entryNumber: row.original.entry_number,
    status: row.original.approval_status
  });
  onSelectTransaction(row.original)
}}
```

### Step 3: Browser Console Commands

Run these commands in the browser console to debug:

```javascript
// Check what filters are stored
console.log('Stored approval filter:', localStorage.getItem('transactions_approval_filter'));
console.log('All stored transactions keys:', 
  Object.keys(localStorage).filter(k => k.includes('transaction')));

// Clear approval filter to see all statuses
localStorage.removeItem('transactions_approval_filter');
console.log('Cleared approval filter. Reload page now.');

// Check current page state (if React DevTools installed)
// Look for component state showing:
// - approvalFilter
// - selectedTransactionId
// - transactionLines array length
```

---

## Debugging Workflow

### Issue: Draft Transactions Not Appearing

**Step-by-step debugging:**

1. **Check localStorage filter**:
   ```javascript
   // In browser console
   localStorage.getItem('transactions_approval_filter');
   // Should be 'all' or null (not 'approved', 'posted', etc.)
   
   // If not 'all', clear it:
   localStorage.removeItem('transactions_approval_filter');
   location.reload();
   ```

2. **Check reload() output**:
   - Create a new draft transaction
   - Watch console for `🚀 Reload triggered` message
   - Check the `approvalStatus` value being sent
   - Should be `undefined` when filter is 'all'

3. **Check getTransactions response**:
   - Look for `📊 Response from getTransactions` in console
   - Check `rowCount` - should include draft transactions
   - Check `firstRowStatus` - should show various statuses including 'draft'

### Issue: Empty Lines Table When Transaction Selected

**Step-by-step debugging:**

1. **Click a transaction row**:
   - Watch for `🔍 Transaction row clicked` in console
   - Verify the transaction ID is logged

2. **Check line fetching**:
   - Watch for `🔄 useEffect triggered, selectedTransactionId:` message
   - Should show the transaction ID you clicked
   - If you don't see this, the state isn't being updated

3. **Check Supabase response**:
   - Look for `✅ Lines fetched successfully:` or `❌ Supabase error` messages
   - Shows how many lines were retrieved
   - If error, check the error message

4. **Manual Supabase query** (in browser console):
   ```javascript
   // Test if transaction_lines table has data
   // Paste your transaction ID here:
   const txId = 'paste-transaction-id-here';
   
   // Then in console:
   supabase.from('transaction_lines')
     .select('*')
     .eq('transaction_id', txId)
     .then(r => console.log('Lines:', r.data, 'Error:', r.error))
   ```

---

## Expected Console Output (Happy Path)

When everything works correctly, you should see:

```
🚀 Reload triggered with filters: { mode: 'my', approvalFilter: 'all', ... }
📊 Response from getTransactions: { rowCount: 5, totalCount: 5, firstRowStatus: 'draft', hasContent: true }

[User clicks a transaction]

🔍 Transaction row clicked: { id: 'abc123', entryNumber: 'TXN-001', status: 'draft' }
🔄 useEffect triggered, selectedTransactionId: abc123
✅ Lines fetched successfully: 3 lines for transaction abc123
```

---

## Common Issues and Solutions

### Issue: "🔄 useEffect triggered" but selectedTransactionId is null

**Cause**: `onSelectTransaction` callback not being called

**Solution**: 
- Check if `onRowClick` is firing (look for `🔍` message)
- Check if `onSelectTransaction` is passed to TransactionsHeaderTable
- Verify the callback actually calls `setSelectedTransactionId`

### Issue: "🔄 useEffect triggered" but error "Cannot read property 'from' of undefined"

**Cause**: Supabase client not initialized

**Solution**:
- Check import of supabase at top of file
- Verify supabase is imported from `'../../utils/supabase'`
- Check that `supabase` client is properly exported from that module

### Issue: Draft transactions show as empty array

**Cause**: 
1. getTransactions() not returning drafts
2. Local filter hiding drafts
3. DB query filtering by wrong status

**Solution**:
- Check if `approvalStatus: undefined` is being sent to backend
- Verify backend code returns drafts when status is undefined
- Check if there ARE draft transactions in the database

---

## Database Verification

If console logs show 0 transactions, verify the database:

```sql
-- Check if draft transactions exist
SELECT id, entry_number, approval_status, created_at 
FROM transactions 
WHERE approval_status = 'draft' 
LIMIT 5;

-- Check if transaction has lines
SELECT * FROM transaction_lines 
WHERE transaction_id = 'your-transaction-id' 
ORDER BY line_no;
```

---

## Performance Monitoring

Add this to check if queries are slow:

```typescript
// At start of reload()
const startTime = performance.now();

// After await getTransactions()
const duration = performance.now() - startTime;
console.log(`⏱️ getTransactions took ${duration.toFixed(2)}ms`);
```

If duration > 2000ms, query might be slow. Check server logs.

---

## Removing Debug Logging

Once issues are fixed, remove or comment out all console.log statements:

```typescript
// Before removing, use Find & Replace in VS Code:
// Find: console\.log\('
// Replace: // console.log('
```

Or use a conditional flag:

```typescript
const DEBUG = false; // Set to false in production

if (DEBUG) console.log('Debug message');
```
