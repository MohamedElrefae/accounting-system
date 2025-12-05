# Approval Logic - Quick Reference Card

## 🎯 At a Glance

**What:** Enhanced line-level approval system with review tracking and change management.

**Why:** Better visibility into approval process, track changes, manage revisions.

**How:** Use new components, hooks, and services to add line review capabilities.

---

## 📦 What's New

| Component | Purpose | Location |
|-----------|---------|----------|
| `ApprovalWorkflowManager` | Complete workflow orchestrator | `src/components/Approvals/` |
| `EnhancedLineReviewModal` | Advanced review modal | `src/components/Approvals/` |
| `LineReviewStatus` | Status display card | `src/components/Approvals/` |
| `LineReviewsTable` | Lines table with reviews | `src/components/Approvals/` |
| `useLineReviews` | React hook for reviews | `src/hooks/` |
| `useLineReviewStatus` | React hook for status | `src/hooks/` |
| `lineReviewService` | Service functions | `src/services/` |

---

## 🚀 Quick Start

### 1. Add to Approval Page
```typescript
import ApprovalWorkflowManager from '@/components/Approvals/ApprovalWorkflowManager'

<ApprovalWorkflowManager
  transactionId={id}
  approvalRequestId={requestId}
  onApprovalComplete={() => navigate('/approvals')}
/>
```

### 2. Use Hooks
```typescript
const { lineReviews, loading } = useLineReviews(approvalRequestId)
const { status } = useLineReviewStatus(transactionId)
```

### 3. Call Services
```typescript
await addLineReviewComment(approvalRequestId, lineId, 'comment', 'comment')
await requestLineEdit(approvalRequestId, lineId, 'reason')
await approveLineReview(approvalRequestId, lineId, 'notes')
```

---

## 🎨 Components

### ApprovalWorkflowManager
**Complete workflow in one component**
```typescript
<ApprovalWorkflowManager
  transactionId={string}
  approvalRequestId={string}
  onApprovalComplete={() => void}
  onApprovalFailed={(error: string) => void}
/>
```

### LineReviewStatus
**Shows review progress**
```typescript
<LineReviewStatus
  allLinesReviewed={boolean}
  totalLines={number}
  linesNeedingReview={number}
  linesWithComments={number}
  linesWithChangeRequests={number}
/>
```

### LineReviewsTable
**Lists all lines with review status**
```typescript
<LineReviewsTable
  lines={LineReview[]}
  loading={boolean}
  onReviewLine={(line) => void}
/>
```

### EnhancedLineReviewModal
**Advanced review modal**
```typescript
<EnhancedLineReviewModal
  open={boolean}
  lineData={LineReview}
  onAddComment={(comment, type) => Promise}
  onRequestEdit={(reason) => Promise}
  onApprove={(notes?) => Promise}
  onFlag={(reason) => Promise}
/>
```

---

## 🪝 Hooks

### useLineReviews
```typescript
const {
  lineReviews,      // LineReview[]
  loading,          // boolean
  error,            // string | null
  refresh,          // () => Promise
  addComment        // (lineId, comment, type) => Promise
} = useLineReviews(approvalRequestId)
```

### useLineReviewStatus
```typescript
const {
  status,           // LineReviewStatus | null
  loading,          // boolean
  error,            // string | null
  refresh           // () => Promise
} = useLineReviewStatus(transactionId)
```

---

## 🔧 Services

### Add Comment
```typescript
await addLineReviewComment(
  approvalRequestId,
  lineId,
  'comment text',
  'comment' | 'flag' | 'approve' | 'request_change'
)
```

### Request Edit
```typescript
await requestLineEdit(approvalRequestId, lineId, 'reason')
```

### Approve Line
```typescript
await approveLineReview(approvalRequestId, lineId, 'notes?')
```

### Flag Line
```typescript
await flagLineForAttention(approvalRequestId, lineId, 'reason')
```

### Get Reviews
```typescript
const reviews = await getLineReviewsForApproval(approvalRequestId)
```

### Check Status
```typescript
const status = await checkLinesReviewStatus(transactionId)
```

---

## 📊 Data Types

### LineReview
```typescript
{
  line_id: string
  line_no: number
  account_code: string
  account_name: string
  debit_amount: number
  credit_amount: number
  review_count: number
  has_change_requests: boolean
  latest_comment: string | null
  latest_reviewer_email: string | null
  latest_review_at: string | null
}
```

### LineReviewStatus
```typescript
{
  all_lines_reviewed: boolean
  total_lines: number
  lines_needing_review: number
  lines_with_comments: number
  lines_with_change_requests: number
}
```

---

## 🎯 Common Patterns

### Pattern 1: Simple Review
```typescript
const { lineReviews } = useLineReviews(approvalRequestId)
// User clicks line → Modal opens → User selects action → Submit
```

### Pattern 2: Check Before Approve
```typescript
const { status } = useLineReviewStatus(transactionId)
if (status.all_lines_reviewed && status.lines_with_change_requests === 0) {
  // Show final approval button
}
```

### Pattern 3: Batch Approve
```typescript
const { lineReviews } = useLineReviews(approvalRequestId)
for (const line of lineReviews) {
  await approveLineReview(approvalRequestId, line.line_id)
}
```

### Pattern 4: Get Pending
```typescript
const { lineReviews } = useLineReviews(approvalRequestId)
const pending = lineReviews.filter(l => l.review_count === 0)
```

---

## 🔄 Workflow

```
1. Load Approval
   ↓
2. Get Line Reviews
   ↓
3. Display Status & Lines
   ↓
4. User Reviews Each Line
   ├─ Add Comment
   ├─ Request Edit
   ├─ Approve
   └─ Flag
   ↓
5. Check Status
   ├─ All Reviewed? → Enable Final Approval
   ├─ Change Requests? → Show Alert
   └─ Pending? → Show Progress
   ↓
6. Final Approval
   ↓
7. Submit & Complete
```

---

## ⚡ Performance Tips

1. **Lazy Load**
   ```typescript
   const { lineReviews } = useLineReviews(
     modalOpen ? approvalRequestId : null
   )
   ```

2. **Memoize**
   ```typescript
   const MemoizedTable = React.memo(LineReviewsTable)
   ```

3. **Batch Operations**
   ```typescript
   await Promise.all(lines.map(l => approve(l.id)))
   ```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Reviews not loading | Check `approvalRequestId` is valid |
| Modal not updating | Call `refresh()` after action |
| Status not changing | Verify `transactionId` is correct |
| Comments not showing | Check `transaction_line_reviews` table |
| Permissions error | Verify user has approval role |

---

## 📚 Documentation

- **Overview:** `ENHANCED_APPROVAL_LOGIC_SUMMARY.md`
- **Integration:** `APPROVAL_LOGIC_INTEGRATION_GUIDE.md`
- **Examples:** `APPROVAL_LOGIC_EXAMPLES.md`
- **Deployment:** `APPROVAL_LOGIC_DEPLOYMENT_CHECKLIST.md`

---

## 🔗 Related Files

- Database: `supabase/migrations/20250120_line_based_approval.sql`
- Service: `src/services/lineReviewService.ts`
- Hooks: `src/hooks/useLineReviews.ts`
- Components: `src/components/Approvals/`

---

## 💡 Key Features

✅ Line-level review tracking
✅ Multiple action types (comment, approve, edit, flag)
✅ Review history per line
✅ Change request management
✅ Progress monitoring
✅ Audit logging
✅ Real-time updates
✅ Batch operations
✅ Error handling
✅ Performance optimized

---

## 🎓 Learning Path

1. **Understand the System**
   - Read `ENHANCED_APPROVAL_LOGIC_SUMMARY.md`
   - Review database schema

2. **See Examples**
   - Check `APPROVAL_LOGIC_EXAMPLES.md`
   - Run sample code

3. **Integrate**
   - Follow `APPROVAL_LOGIC_INTEGRATION_GUIDE.md`
   - Add to your pages

4. **Deploy**
   - Use `APPROVAL_LOGIC_DEPLOYMENT_CHECKLIST.md`
   - Test thoroughly

---

## 📞 Support

**Questions?** Check the documentation files or contact the development team.

**Issues?** Review troubleshooting section or check error logs.

**Feedback?** Share suggestions for improvements.

---

## ✨ What's Next?

- [ ] Deploy database migration
- [ ] Add components to approval pages
- [ ] Test workflows
- [ ] Train users
- [ ] Monitor usage
- [ ] Gather feedback
- [ ] Plan improvements

---

**Version:** 1.0
**Last Updated:** 2025-01-20
**Status:** Ready for Production

