# Line-Level Approval Migration Plan

## Overview
Migrate approval buttons from transaction-level to line-level in `/transactions/pending` page.

## Current Architecture
- **TransactionsHeaderTable**: Shows transactions with approve/reject/revise buttons
- **Actions**: `onApprove`, `onRevise`, `onReject` at transaction level
- **Functions**: `approveTransaction()`, `rejectTransaction()`, `requestRevision()`

## Target Architecture

### 1. Display Changes
**Transaction Row:**
- Show approval progress badge: "2/5 lines approved (40%)"
- Remove approve/reject/revise buttons
- Add "View Lines" button to expand line details

**Line Rows (Expandable):**
- Show each line with: account, amount, description, status
- Line-level approve/reject buttons
- Status badges: draft, pending, approved, rejected

### 2. Data Flow
```
User clicks "Approve Line" 
  → Call approve_line(line_id, user_id, notes)
  → Backend updates line_status = 'approved'
  → Trigger auto-updates transaction status
  → If all lines approved → transaction.status = 'approved'
  → Frontend refreshes and shows updated progress
```

### 3. Implementation Steps

#### Step 1: Create LineApprovalRow Component
```tsx
// src/components/Transactions/LineApprovalRow.tsx
- Display line details
- Show approval status badge
- Approve/Reject buttons with permission checks
- Handle approval actions
```

#### Step 2: Update TransactionsHeaderTable
- Add expandable rows for lines
- Show approval progress in transaction row
- Replace transaction-level buttons with "View Lines"

#### Step 3: Update Transactions.tsx
- Add line approval handlers
- Fetch lines when transaction expanded
- Use lineApprovalService functions

#### Step 4: Database Sync
- Ensure all existing transactions have line_status set
- Migrate old approval_status to line-based system

## UI Mockup

```
┌─ Transaction Row ────────────────────────────────────────┐
│ TEST-001 | 2025-11-24 | Test Transaction                 │
│ Progress: ●●●○○ 3/5 approved (60%)                       │
│ [Details] [View Lines ▼] [Documents]                     │
└──────────────────────────────────────────────────────────┘
  ┌─ Line 1 ─────────────────────────────────────────────┐
  │ 1000-Assets | Debit: 1,000 | Test line 1             │
  │ Status: ✅ Approved by user@example.com               │
  └─────────────────────────────────────────────────────────┘
  ┌─ Line 2 ─────────────────────────────────────────────┐
  │ 2000-Liabilities | Credit: 1,000 | Test line 2       │
  │ Status: ⏳ Pending | [Approve] [Reject]               │
  └─────────────────────────────────────────────────────────┘
```

## Verification Checklist
- [ ] Line approval buttons work
- [ ] Transaction status syncs when all lines approved
- [ ] Progress indicator updates in real-time
- [ ] Permissions enforced at line level
- [ ] Old transactions migrated to new system
- [ ] Audit trail preserved

## Rollback Plan
If issues occur:
1. Keep old transaction-level buttons as fallback
2. Add feature flag to toggle between systems
3. Gradual migration per organization
