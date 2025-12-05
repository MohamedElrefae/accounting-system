# Approval Logic Integration Guide

## 🚀 Quick Start

The enhanced approval logic is now ready to integrate into your approval pages. Follow these steps to add line-level review capabilities.

---

## 📦 Files Created

### Services
- `src/services/lineReviewService.ts` - Core line review operations

### Hooks
- `src/hooks/useLineReviews.ts` - React hooks for line reviews

### Components
- `src/components/Approvals/EnhancedLineReviewModal.tsx` - Advanced review modal
- `src/components/Approvals/LineReviewStatus.tsx` - Status display card
- `src/components/Approvals/LineReviewsTable.tsx` - Lines table with reviews
- `src/components/Approvals/ApprovalWorkflowManager.tsx` - Complete workflow orchestrator

### Updated Components
- `src/components/Transactions/LineApprovalModal.tsx` - Enhanced with review history

---

## 🔧 Integration Steps

### Step 1: Add to Approval Page

In your approval page (e.g., `src/pages/Approvals/Inbox.tsx`):

```typescript
import ApprovalWorkflowManager from '@/components/Approvals/ApprovalWorkflowManager'

export function ApprovalDetail() {
  const { transactionId, approvalRequestId } = useParams()

  return (
    <ApprovalWorkflowManager
      transactionId={transactionId}
      approvalRequestId={approvalRequestId}
      onApprovalComplete={() => {
        // Handle completion
        navigate('/approvals')
      }}
      onApprovalFailed={(error) => {
        // Handle error
        showError(error)
      }}
    />
  )
}
```

### Step 2: Use Individual Components

If you prefer more control, use components separately:

```typescript
import LineReviewStatus from '@/components/Approvals/LineReviewStatus'
import LineReviewsTable from '@/components/Approvals/LineReviewsTable'
import EnhancedLineReviewModal from '@/components/Approvals/EnhancedLineReviewModal'
import { useLineReviews, useLineReviewStatus } from '@/hooks/useLineReviews'

export function CustomApprovalPage() {
  const [selectedLine, setSelectedLine] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { lineReviews, loading } = useLineReviews(approvalRequestId)
  const { status } = useLineReviewStatus(transactionId)

  return (
    <>
      {status && (
        <LineReviewStatus
          allLinesReviewed={status.all_lines_reviewed}
          totalLines={status.total_lines}
          linesNeedingReview={status.lines_needing_review}
          linesWithComments={status.lines_with_comments}
          linesWithChangeRequests={status.lines_with_change_requests}
        />
      )}

      <LineReviewsTable
        lines={lineReviews}
        loading={loading}
        onReviewLine={(line) => {
          setSelectedLine(line)
          setModalOpen(true)
        }}
      />

      {selectedLine && (
        <EnhancedLineReviewModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          lineData={selectedLine}
          onAddComment={handleAddComment}
          onRequestEdit={handleRequestEdit}
          onApprove={handleApprove}
          onFlag={handleFlag}
        />
      )}
    </>
  )
}
```

### Step 3: Use Service Functions Directly

For custom workflows:

```typescript
import {
  addLineReviewComment,
  requestLineEdit,
  approveLineReview,
  flagLineForAttention,
  getLineReviewsForApproval,
  checkLinesReviewStatus
} from '@/services/lineReviewService'

// Add a comment
await addLineReviewComment(
  approvalRequestId,
  lineId,
  'Please verify this amount',
  'comment'
)

// Request edit
await requestLineEdit(approvalRequestId, lineId, 'Amount needs adjustment')

// Approve line
await approveLineReview(approvalRequestId, lineId, 'Looks good')

// Flag for attention
await flagLineForAttention(approvalRequestId, lineId, 'Needs manager review')

// Get all reviews
const reviews = await getLineReviewsForApproval(approvalRequestId)

// Check status
const status = await checkLinesReviewStatus(transactionId)
```

---

## 🎯 Common Use Cases

### Use Case 1: Simple Approval Workflow

```typescript
// User opens approval
const { lineReviews } = useLineReviews(approvalRequestId)

// User reviews each line
for (const line of lineReviews) {
  // Click line to open modal
  // Select action (approve, request edit, flag)
  // Add comment if needed
  // Submit
}

// Check if all reviewed
const { status } = useLineReviewStatus(transactionId)
if (status.all_lines_reviewed && status.lines_with_change_requests === 0) {
  // Enable final approval button
}
```

### Use Case 2: Batch Review

```typescript
// Get all lines
const { lineReviews } = useLineReviews(approvalRequestId)

// Filter lines needing review
const needsReview = lineReviews.filter(l => l.review_count === 0)

// Batch approve
for (const line of needsReview) {
  await approveLineReview(approvalRequestId, line.line_id, 'Approved')
}
```

### Use Case 3: Conditional Approval

```typescript
// Check status before allowing approval
const { status } = useLineReviewStatus(transactionId)

const canApprove = 
  status.all_lines_reviewed && 
  status.lines_with_change_requests === 0

if (canApprove) {
  // Show final approval button
} else {
  // Show message about pending reviews
}
```

### Use Case 4: Change Request Workflow

```typescript
// User requests changes on specific lines
const linesToChange = [line1, line2, line3]

for (const line of linesToChange) {
  await requestLineEdit(
    approvalRequestId,
    line.line_id,
    'Please adjust amount to match invoice'
  )
}

// Later, user modifies lines and resubmits
// System automatically flags for re-review
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Approval Page                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ ApprovalWorkflowManager                                     │
│ - Orchestrates workflow                                     │
│ - Manages modal states                                      │
│ - Handles final approval                                    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ LineReviewStatus │ │ LineReviewsTable │ │ Enhanced Modal   │
│ - Shows progress │ │ - Lists lines    │ │ - Review actions │
│ - Stats display  │ │ - Review history │ │ - Comments       │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Hooks (useLineReviews, useLineReviewStatus)                │
│ - Fetch data                                                │
│ - Manage state                                              │
│ - Handle refresh                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Services (lineReviewService)                               │
│ - API calls                                                 │
│ - RPC functions                                             │
│ - Data transformation                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase                                                    │
│ - transaction_line_reviews table                            │
│ - RPC functions                                             │
│ - Audit logging                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Considerations

All functions include:
- ✅ User authentication checks
- ✅ Organization membership validation
- ✅ Approval permission verification
- ✅ Audit logging
- ✅ RLS policies enforcement

---

## 📈 Performance Tips

1. **Lazy Load Reviews**
   ```typescript
   // Only load when needed
   const { lineReviews } = useLineReviews(
     modalOpen ? approvalRequestId : null
   )
   ```

2. **Batch Operations**
   ```typescript
   // Process multiple lines efficiently
   const results = await Promise.all(
     lines.map(l => approveLineReview(approvalRequestId, l.line_id))
   )
   ```

3. **Memoize Components**
   ```typescript
   const MemoizedTable = React.memo(LineReviewsTable)
   ```

---

## 🧪 Testing

### Test Line Review Flow
```typescript
// 1. Load reviews
const reviews = await getLineReviewsForApproval(approvalRequestId)
expect(reviews.length).toBeGreaterThan(0)

// 2. Add comment
const result = await addLineReviewComment(
  approvalRequestId,
  reviews[0].line_id,
  'Test comment',
  'comment'
)
expect(result.success).toBe(true)

// 3. Check status
const status = await checkLinesReviewStatus(transactionId)
expect(status.lines_with_comments).toBeGreaterThan(0)
```

### Test Approval Workflow
```typescript
// 1. Request edit
await requestLineEdit(approvalRequestId, lineId, 'Needs change')

// 2. Verify status
const status = await checkLinesReviewStatus(transactionId)
expect(status.lines_with_change_requests).toBeGreaterThan(0)

// 3. Approve after change
await approveLineReview(approvalRequestId, lineId, 'Now approved')

// 4. Verify updated
const updated = await checkLinesReviewStatus(transactionId)
expect(updated.lines_with_change_requests).toBeLessThan(status.lines_with_change_requests)
```

---

## 🐛 Troubleshooting

### Issue: Reviews not loading
**Solution:** Check that `approvalRequestId` is valid and user has permission

### Issue: Modal not updating after action
**Solution:** Ensure `refresh()` is called after each action

### Issue: Status not reflecting changes
**Solution:** Call `refreshStatus()` after line modifications

### Issue: Comments not appearing
**Solution:** Verify `transaction_line_reviews` table exists and has data

---

## 📚 API Reference

### Service Functions

#### `addLineReviewComment(approvalRequestId, lineId, comment, reviewType)`
- **Parameters:**
  - `approvalRequestId`: UUID of approval request
  - `lineId`: UUID of transaction line
  - `comment`: Review comment text
  - `reviewType`: 'comment' | 'flag' | 'approve' | 'request_change'
- **Returns:** `{ success, review_id, message }`

#### `requestLineEdit(approvalRequestId, lineId, reason)`
- **Parameters:**
  - `approvalRequestId`: UUID of approval request
  - `lineId`: UUID of transaction line
  - `reason`: Reason for edit request
- **Returns:** `{ success, review_id, message }`

#### `approveLineReview(approvalRequestId, lineId, notes?)`
- **Parameters:**
  - `approvalRequestId`: UUID of approval request
  - `lineId`: UUID of transaction line
  - `notes`: Optional approval notes
- **Returns:** `{ success, review_id, message }`

#### `flagLineForAttention(approvalRequestId, lineId, reason)`
- **Parameters:**
  - `approvalRequestId`: UUID of approval request
  - `lineId`: UUID of transaction line
  - `reason`: Reason for flag
- **Returns:** `{ success, review_id, message }`

#### `getLineReviewsForApproval(approvalRequestId)`
- **Parameters:**
  - `approvalRequestId`: UUID of approval request
- **Returns:** `LineReview[]`

#### `checkLinesReviewStatus(transactionId)`
- **Parameters:**
  - `transactionId`: UUID of transaction
- **Returns:** `LineReviewStatus`

---

## ✅ Deployment Checklist

- [ ] Database migration applied
- [ ] Service layer created
- [ ] Hooks implemented
- [ ] Components created
- [ ] Integration tested
- [ ] Error handling verified
- [ ] Audit logging confirmed
- [ ] Performance tested
- [ ] User documentation updated
- [ ] Team trained

---

## 🎓 Next Steps

1. **Deploy Database Migration**
   - Run the SQL migration in your Supabase project

2. **Test Components**
   - Test each component in isolation
   - Test integration with approval page

3. **Update UI**
   - Add ApprovalWorkflowManager to approval pages
   - Update approval inbox to show line status

4. **Train Users**
   - Document new review actions
   - Show how to use progress indicators
   - Explain change request workflow

5. **Monitor**
   - Check audit logs for usage
   - Monitor performance
   - Gather user feedback

