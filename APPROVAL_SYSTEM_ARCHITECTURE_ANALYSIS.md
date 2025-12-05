# 🔴 CRITICAL: Approval System Architecture Analysis

## The Problem: No Single Source of Truth

Your screenshot shows **THREE DIFFERENT DATA SOURCES** showing different approval statuses for the same line:

1. **Box 1 (Left sidebar)**: One status
2. **Box 2 (Bottom table)**: Different status
3. **Box 3 (Top modal)**: Yet another status

## Root Cause Analysis

### Current Architecture (BROKEN)
```
Transactions.tsx
├── transactionLines state (fetched from lineReviewService)
├── TransactionLinesTable component (displays lines)
│   └── Shows approval status from transactionLines
├── Modal (EnhancedLineReviewModalV2)
│   └── Shows approval status from different data source
└── Sidebar/Details panel
    └── Shows approval status from yet another source
```

### The Problem
- **Multiple data fetches**: Different components fetch the same data independently
- **No synchronization**: When approval status changes, not all components update
- **Stale data**: Each component has its own cached copy
- **Race conditions**: Async operations complete at different times

## Services Involved (Creating Chaos)

1. **lineReviewService.getLineReviewsForTransaction()**
   - Fetches lines with approval history
   - Used by: Transactions.tsx useEffect

2. **transaction-lines service**
   - Fetches basic line data
   - Used by: TransactionLinesTable

3. **lineReviewService.checkLinesReviewStatus()**
   - Fetches approval status summary
   - Used by: EnhancedLineApprovalManager

4. **Direct Supabase queries**
   - Various components query directly
   - No centralized data management

## The Solution: Single Source of Truth

### Architecture (FIXED)
```
Transactions.tsx (Single Data Store)
├── transactionLines state (SINGLE SOURCE)
│   └── Fetched ONCE from lineReviewService
│   └── Contains ALL data needed by all components
│
├── TransactionLinesTable
│   └── Reads from transactionLines state
│   └── Shows approval status from state
│
├── Modal (EnhancedLineReviewModalV2)
│   └── Reads from transactionLines state
│   └── Shows approval status from state
│
└── Sidebar/Details panel
    └── Reads from transactionLines state
    └── Shows approval status from state
```

## Implementation Strategy

### Step 1: Centralize Data Fetching
- Fetch ALL line data ONCE in Transactions.tsx
- Use `getLineReviewsForTransaction()` which includes:
  - Line details
  - Approval history
  - Latest approval action
  - Review count
  - Change request status

### Step 2: Pass Data Down
- Pass `transactionLines` state to all child components
- Components read from props, not fetch independently
- No duplicate fetches

### Step 3: Update on Changes
- When approval status changes, update `transactionLines` state
- All components automatically re-render with new data
- Single point of update

### Step 4: Invalidate Cache
- When user performs an action (approve, reject, etc.)
- Refetch the specific line data
- Update the state
- All components see the change immediately

## Data Flow (CORRECT)

```
User clicks "Review"
    ↓
Modal opens
    ↓
Modal reads from transactionLines state
    ↓
Shows approval history from state
    ↓
User approves/rejects
    ↓
Call approval API
    ↓
Refetch line data
    ↓
Update transactionLines state
    ↓
All components re-render with new data
    ↓
Status is now in sync everywhere
```

## What Needs to Change

### 1. Transactions.tsx
- ✅ Already fetching with `getLineReviewsForTransaction()`
- ✅ Already storing in `transactionLines` state
- ✅ Already passing to components

### 2. TransactionLinesTable
- ✅ Already receives `transactionLines` as prop
- ✅ Already displays from prop
- No changes needed

### 3. EnhancedLineReviewModalV2
- ✅ Already receives `lineData` as prop
- ✅ Already displays from prop
- No changes needed

### 4. Sidebar/Details Panel
- ✅ Should read from `transactionLines` state
- ✅ Should NOT fetch independently
- May need updates

## Why Data is Out of Sync

1. **Sidebar fetches independently** → Shows old data
2. **Modal fetches independently** → Shows different old data
3. **Table fetches independently** → Shows yet another old data
4. **No refresh mechanism** → Changes don't propagate

## The Fix (Minimal)

### Ensure ALL components use the SAME data source:
```typescript
// CORRECT: All components read from transactionLines state
<TransactionLinesTable lines={transactionLines} />
<Modal lineData={transactionLines.find(l => l.id === selectedLineId)} />
<Sidebar lines={transactionLines} />

// WRONG: Each component fetches independently
<TransactionLinesTable /> // fetches its own data
<Modal /> // fetches its own data
<Sidebar /> // fetches its own data
```

## Verification Checklist

- [ ] Transactions.tsx fetches data ONCE
- [ ] All components receive data via props
- [ ] No component fetches independently
- [ ] When approval changes, state updates
- [ ] All components show same status
- [ ] No stale data issues

---

## Status: CRITICAL ARCHITECTURE ISSUE

This is not a bug fix - this is an **architectural refactor** needed to ensure data consistency.

The good news: The infrastructure is already in place. We just need to ensure all components use the same data source.
