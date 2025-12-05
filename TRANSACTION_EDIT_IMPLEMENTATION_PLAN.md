# 🚀 Transaction Edit System - Implementation Plan

## Business Rules (Confirmed)

Based on stakeholder input:

1. ✅ **Edit Permission**: Only Draft transactions can be edited directly
2. ✅ **Edit Requests**: Must be approved by original approver
3. ✅ **Approval Reset**: Editing resets approval status (requires re-approval)
4. ✅ **Edit Limits**: No limit on edit attempts
5. ✅ **Resubmit Behavior**: Resets all approvals (fresh review)
6. ✅ **Notifications**: In-app only (no email/SMS)

---

## 📊 Implementation Phases

### Phase 1: TransactionWizard Edit Mode (Week 1)
**Goal**: Make TransactionWizard work for both create and edit

### Phase 2: Approval Integration (Week 2)
**Goal**: Add state-based permissions and workflows

### Phase 3: Polish & Deploy (Week 3)
**Goal**: Production-ready system with full testing

---

## 📅 Phase 1: TransactionWizard Edit Mode (5 days)

### Day 1: Props & Data Loading (8 hours)

#### Morning (4 hours): Add Edit Mode Props
```typescript
// File: src/components/Transactions/TransactionWizard.tsx

interface TransactionWizardProps {
  // Existing props...
  
  // NEW: Edit mode support
  mode?: 'create' | 'edit'
  transactionId?: string
  initialData?: {
    header: TransactionRecord
    lines: TxLineInput[]
  }
  
  // NEW: Approval context
  approvalStatus?: string
  canEdit?: boolean
  
  // NEW: Callbacks
  onEditComplete?: () => void
}
```

**Tasks**:
- [ ] Add new props to interface
- [ ] Add prop validation
- [ ] Add default values
- [ ] Update component documentation

#### Afternoon (4 hours): Implement Data Loading
```typescript
// Load existing transaction data
useEffect(() => {
  if (mode === 'edit' && transactionId) {
    loadTransactionData(transactionId)
  }
}, [mode, transactionId])

const loadTransactionData = async (id: string) => {
  // 1. Load header
  const header = await getTransaction(id)
  
  // 2. Load lines
  const lines = await getTransactionLines(id)
  
  // 3. Populate form
  setBasicInfo(header)
  setLineItems(lines)
  
  // 4. Set approval context
  setApprovalStatus(header.approval_status)
}
```

**Tasks**:
- [ ] Create loadTransactionData function
- [ ] Handle loading states
- [ ] Handle errors gracefully
- [ ] Add loading spinner

---

### Day 2: UI Updates for Edit Mode (8 hours)

#### Morning (4 hours): Update Wizard Header
```typescript
// Dynamic title based on mode
const title = mode === 'edit' 
  ? `تعديل المعاملة - ${transactionId}` 
  : 'إنشاء معاملة جديدة'

// Show approval status in edit mode
{mode === 'edit' && (
  <Chip 
    label={getStatusLabel(approvalStatus)}
    color={getStatusColor(approvalStatus)}
    icon={getStatusIcon(approvalStatus)}
  />
)}
```

**Tasks**:
- [ ] Update wizard title
- [ ] Add status badge
- [ ] Add "Last Modified" info
- [ ] Add "Created By" info

#### Afternoon (4 hours): Update Step Behavior
```typescript
// Step 1: Basic Info
// - Pre-fill all fields in edit mode
// - Disable fields if not editable

// Step 2: Line Items
// - Load existing lines
// - Maintain line IDs for updates
// - Show line history (if available)

// Step 3: Review
// - Show "Update" instead of "Create"
// - Show change summary
// - Show approval impact warning
```

**Tasks**:
- [ ] Update Step 1 (Basic Info)
- [ ] Update Step 2 (Line Items)
- [ ] Update Step 3 (Review)
- [ ] Add change tracking

---

### Day 3: Save Logic (8 hours)

#### Morning (4 hours): Implement Update Logic
```typescript
const handleSave = async () => {
  if (mode === 'create') {
    // Existing create logic
    await createTransaction(data)
  } else {
    // NEW: Update logic
    await updateTransaction(transactionId, data)
    await replaceTransactionLines(transactionId, lineItems)
    
    // Log the edit
    await createAuditLog({
      transaction_id: transactionId,
      action: 'edit',
      actor_id: currentUserId,
      changes: getChangesSummary()
    })
  }
}
```

**Tasks**:
- [ ] Implement updateTransaction call
- [ ] Implement replaceTransactionLines call
- [ ] Add change detection
- [ ] Add audit logging

#### Afternoon (4 hours): Error Handling & Validation
```typescript
// Validation rules
const validateEdit = () => {
  // 1. Check if transaction is editable
  if (!canEdit) {
    throw new Error('Transaction is locked')
  }
  
  // 2. Check if data is valid
  if (!isValid(data)) {
    throw new Error('Invalid data')
  }
  
  // 3. Check if lines balance
  if (!isBalanced(lineItems)) {
    throw new Error('Lines must balance')
  }
  
  return true
}
```

**Tasks**:
- [ ] Add validation rules
- [ ] Add error messages
- [ ] Add retry logic
- [ ] Add rollback on failure

---

### Day 4: Integration with Transactions Page (8 hours)

#### Morning (4 hours): Update Edit Button
```typescript
// File: src/pages/Transactions/Transactions.tsx

// Replace old edit logic
const handleEdit = (transaction: TransactionRecord) => {
  // OLD: setFormOpen(true)
  
  // NEW: Open wizard in edit mode
  setWizardMode('edit')
  setEditingTransaction(transaction)
  setWizardOpen(true)
}
```

**Tasks**:
- [ ] Update edit button handler
- [ ] Pass transaction data to wizard
- [ ] Handle wizard close
- [ ] Refresh list after edit

#### Afternoon (4 hours): Remove Old Edit System
```typescript
// Remove:
// - UnifiedCRUDForm for transaction editing
// - MultiLineEditor standalone usage
// - Old form panel

// Keep:
// - TransactionWizard (now handles both create and edit)
```

**Tasks**:
- [ ] Remove old form code
- [ ] Remove unused imports
- [ ] Clean up state variables
- [ ] Update tests

---

### Day 5: Testing & Bug Fixes (8 hours)

#### Morning (4 hours): Unit Tests
```typescript
describe('TransactionWizard Edit Mode', () => {
  it('loads existing transaction data', async () => {
    // Test data loading
  })
  
  it('updates transaction on save', async () => {
    // Test update logic
  })
  
  it('shows correct title in edit mode', () => {
    // Test UI updates
  })
  
  it('validates edit permissions', () => {
    // Test permission checks
  })
})
```

**Tasks**:
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test error scenarios
- [ ] Test edge cases

#### Afternoon (4 hours): Manual Testing & Fixes
**Test Scenarios**:
- [ ] Edit draft transaction
- [ ] Try to edit submitted transaction (should fail)
- [ ] Edit with invalid data
- [ ] Edit with unbalanced lines
- [ ] Cancel edit
- [ ] Save edit successfully

---

## 📅 Phase 2: Approval Integration (5 days)

### Day 6: State-Based Permissions (8 hours)

#### Morning (4 hours): Permission Matrix
```typescript
// File: src/utils/transactionPermissions.ts

export const canEditTransaction = (
  transaction: TransactionRecord,
  currentUserId: string,
  permissions: string[]
): boolean => {
  // Rule 1: Posted transactions are immutable
  if (transaction.is_posted) return false
  
  // Rule 2: Only draft can be edited directly
  if (transaction.approval_status !== 'draft') return false
  
  // Rule 3: Must be owner or have manage permission
  const isOwner = transaction.created_by === currentUserId
  const canManage = permissions.includes('transactions.manage')
  
  return isOwner || canManage
}
```

**Tasks**:
- [ ] Create permission utility functions
- [ ] Implement permission matrix
- [ ] Add permission checks to UI
- [ ] Add permission checks to API

#### Afternoon (4 hours): Update UI Based on State
```typescript
// Show appropriate buttons based on state
const getAvailableActions = (transaction: TransactionRecord) => {
  const status = transaction.approval_status
  
  if (status === 'draft') {
    return ['edit', 'delete', 'submit']
  }
  
  if (status === 'submitted' || status === 'approved') {
    return ['request_edit', 'view']
  }
  
  if (status === 'revision_requested' || status === 'rejected') {
    return ['edit', 'resubmit', 'view']
  }
  
  if (transaction.is_posted) {
    return ['view']
  }
}
```

**Tasks**:
- [ ] Implement getAvailableActions
- [ ] Update action buttons
- [ ] Add tooltips explaining why actions are disabled
- [ ] Add visual indicators (lock icons, etc.)

---

### Day 7: Edit Request System (8 hours)

#### Morning (4 hours): Database Schema
```sql
-- File: supabase/migrations/XXX_edit_requests.sql

CREATE TABLE edit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_edit_requests_transaction ON edit_requests(transaction_id);
CREATE INDEX idx_edit_requests_status ON edit_requests(status);

-- RLS Policies
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own edit requests"
  ON edit_requests FOR SELECT
  USING (requested_by = auth.uid());

CREATE POLICY "Users can create edit requests"
  ON edit_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Approvers can review edit requests"
  ON edit_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = edit_requests.transaction_id
      AND t.approved_by = auth.uid()
    )
  );
```

**Tasks**:
- [ ] Create migration file
- [ ] Run migration
- [ ] Test RLS policies
- [ ] Add indexes

#### Afternoon (4 hours): API Endpoints
```typescript
// File: src/services/editRequests.ts

export const requestEdit = async (
  transactionId: string,
  reason: string
): Promise<void> => {
  const { error } = await supabase
    .from('edit_requests')
    .insert({
      transaction_id: transactionId,
      reason: reason,
      status: 'pending'
    })
  
  if (error) throw error
  
  // Create notification for approver
  await createNotification({
    user_id: getOriginalApproverId(transactionId),
    type: 'edit_request',
    title: 'طلب تعديل معاملة',
    message: `طلب ${getCurrentUserName()} تعديل المعاملة`,
    link: `/transactions/${transactionId}`
  })
}

export const approveEditRequest = async (
  requestId: string,
  note?: string
): Promise<void> => {
  // 1. Update edit request
  await supabase
    .from('edit_requests')
    .update({
      status: 'approved',
      reviewed_by: getCurrentUserId(),
      reviewed_at: new Date(),
      review_note: note
    })
    .eq('id', requestId)
  
  // 2. Update transaction status
  const request = await getEditRequest(requestId)
  await supabase
    .from('transactions')
    .update({
      approval_status: 'revision_requested'
    })
    .eq('id', request.transaction_id)
  
  // 3. Notify requester
  await createNotification({
    user_id: request.requested_by,
    type: 'edit_approved',
    title: 'تم الموافقة على طلب التعديل',
    message: 'يمكنك الآن تعديل المعاملة',
    link: `/transactions/${request.transaction_id}`
  })
}
```

**Tasks**:
- [ ] Create editRequests service
- [ ] Implement requestEdit
- [ ] Implement approveEditRequest
- [ ] Implement rejectEditRequest
- [ ] Add error handling

---

### Day 8: Edit Request UI (8 hours)

#### Morning (4 hours): Request Edit Modal
```typescript
// File: src/components/Transactions/RequestEditModal.tsx

const RequestEditModal: React.FC<Props> = ({
  open,
  onClose,
  transactionId
}) => {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async () => {
    setLoading(true)
    try {
      await requestEdit(transactionId, reason)
      showToast('تم إرسال طلب التعديل', { severity: 'success' })
      onClose()
    } catch (error) {
      showToast('فشل إرسال الطلب', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>طلب تعديل المعاملة</DialogTitle>
      <DialogContent>
        <TextField
          label="سبب التعديل"
          multiline
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={handleSubmit} disabled={!reason || loading}>
          إرسال الطلب
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

**Tasks**:
- [ ] Create RequestEditModal component
- [ ] Add validation
- [ ] Add loading states
- [ ] Add error handling

#### Afternoon (4 hours): Review Edit Requests UI
```typescript
// File: src/components/Transactions/EditRequestsPanel.tsx

const EditRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<EditRequest[]>([])
  
  return (
    <Box>
      <Typography variant="h6">طلبات التعديل</Typography>
      {requests.map(request => (
        <Card key={request.id}>
          <CardContent>
            <Typography>المعاملة: {request.transaction_id}</Typography>
            <Typography>السبب: {request.reason}</Typography>
            <Typography>الحالة: {request.status}</Typography>
          </CardContent>
          <CardActions>
            {request.status === 'pending' && (
              <>
                <Button onClick={() => approveRequest(request.id)}>
                  موافقة
                </Button>
                <Button onClick={() => rejectRequest(request.id)}>
                  رفض
                </Button>
              </>
            )}
          </CardActions>
        </Card>
      ))}
    </Box>
  )
}
```

**Tasks**:
- [ ] Create EditRequestsPanel component
- [ ] Add approve/reject handlers
- [ ] Add filtering
- [ ] Add pagination

---

### Day 9: Resubmit Functionality (8 hours)

#### Morning (4 hours): Database Schema
```sql
-- File: supabase/migrations/XXX_resubmissions.sql

CREATE TABLE resubmissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  resubmitted_by UUID NOT NULL REFERENCES auth.users(id),
  resubmitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  changes_summary JSONB,
  previous_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resubmissions_transaction ON resubmissions(transaction_id);
```

**Tasks**:
- [ ] Create migration file
- [ ] Run migration
- [ ] Add RLS policies
- [ ] Test schema

#### Afternoon (4 hours): Resubmit API & UI
```typescript
// File: src/services/resubmissions.ts

export const resubmitTransaction = async (
  transactionId: string,
  note: string
): Promise<void> => {
  const transaction = await getTransaction(transactionId)
  
  // 1. Create resubmission record
  await supabase.from('resubmissions').insert({
    transaction_id: transactionId,
    note: note,
    previous_status: transaction.approval_status
  })
  
  // 2. Update transaction status
  await supabase
    .from('transactions')
    .update({
      approval_status: 'submitted',
      submitted_at: new Date()
    })
    .eq('id', transactionId)
  
  // 3. Reset approvals (fresh review)
  await supabase
    .from('approval_history')
    .delete()
    .eq('transaction_id', transactionId)
  
  // 4. Notify reviewers
  await notifyReviewers(transactionId, 'resubmitted')
}
```

**Tasks**:
- [ ] Implement resubmitTransaction
- [ ] Create ResubmitModal component
- [ ] Add to TransactionWizard
- [ ] Test resubmit flow

---

### Day 10: Notifications System (8 hours)

#### Morning (4 hours): Notification Schema
```sql
-- File: supabase/migrations/XXX_notifications.sql

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
```

**Tasks**:
- [ ] Create migration
- [ ] Add RLS policies
- [ ] Create notification service
- [ ] Test notifications

#### Afternoon (4 hours): Notification UI
```typescript
// File: src/components/Notifications/NotificationBell.tsx

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${getCurrentUserId()}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [])
  
  return (
    <IconButton>
      <Badge badgeContent={unreadCount} color="error">
        <NotificationsIcon />
      </Badge>
    </IconButton>
  )
}
```

**Tasks**:
- [ ] Create NotificationBell component
- [ ] Add real-time subscription
- [ ] Create notification list
- [ ] Add mark as read functionality

---

## 📅 Phase 3: Polish & Deploy (5 days)

### Day 11: UI/UX Polish (8 hours)

**Tasks**:
- [ ] Consistent styling across all components
- [ ] Add loading skeletons
- [ ] Add smooth transitions
- [ ] Add success/error animations
- [ ] Improve error messages
- [ ] Add helpful tooltips
- [ ] Test on different screen sizes
- [ ] Test RTL layout

---

### Day 12: Performance Optimization (8 hours)

**Tasks**:
- [ ] Add lazy loading for wizard
- [ ] Implement caching for transaction data
- [ ] Optimize database queries
- [ ] Add debouncing for search
- [ ] Reduce bundle size
- [ ] Add code splitting
- [ ] Test performance metrics
- [ ] Optimize images/icons

---

### Day 13: Documentation (8 hours)

**Tasks**:
- [ ] Update user guide
- [ ] Create developer documentation
- [ ] Document API endpoints
- [ ] Create workflow diagrams
- [ ] Record tutorial videos
- [ ] Create FAQ document
- [ ] Update help section
- [ ] Create training materials

---

### Day 14: Testing (8 hours)

**Tasks**:
- [ ] Unit tests (80% coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security testing
- [ ] Accessibility testing
- [ ] Performance testing
- [ ] Browser compatibility testing
- [ ] Mobile testing

---

### Day 15: Deployment & Monitoring (8 hours)

**Tasks**:
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] User acceptance testing
- [ ] Fix critical bugs
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Monitor performance
- [ ] Gather user feedback

---

## 📊 Success Metrics

### Technical Metrics:
- ✅ Edit success rate > 99%
- ✅ Page load time < 2 seconds
- ✅ Zero data loss incidents
- ✅ 100% audit trail coverage
- ✅ Test coverage > 80%

### User Metrics:
- ✅ User satisfaction > 4.5/5
- ✅ Edit completion rate > 95%
- ✅ Support tickets reduced by 50%
- ✅ Training time reduced by 40%

---

## 🎯 Deliverables

### Week 1:
- ✅ TransactionWizard with edit mode
- ✅ Data loading and saving
- ✅ Updated UI for edit mode
- ✅ Unit tests

### Week 2:
- ✅ State-based permissions
- ✅ Edit request system
- ✅ Resubmit functionality
- ✅ Notification system

### Week 3:
- ✅ Polished UI/UX
- ✅ Complete documentation
- ✅ Full test coverage
- ✅ Production deployment

---

## 🚨 Risk Mitigation

### Risk 1: Data Loss
**Mitigation**: 
- Optimistic locking with version numbers
- Transaction-level database locks
- Automatic backups before edits

### Risk 2: Approval Bypass
**Mitigation**:
- Server-side permission checks
- Immutable posted transactions
- Complete audit trail

### Risk 3: Performance Issues
**Mitigation**:
- Lazy loading
- Caching strategy
- Database query optimization

---

## 📞 Support Plan

### During Development:
- Daily standups
- Weekly demos
- Slack channel for questions

### During Rollout:
- Dedicated support team
- Training sessions
- Quick response to issues

### Post-Rollout:
- Monthly check-ins
- Continuous improvement
- Feature requests tracking

---

**Status**: 📋 **READY TO IMPLEMENT**  
**Start Date**: TBD  
**End Date**: TBD + 3 weeks  
**Team**: 1 Senior Engineer  
**Approved By**: Stakeholders  

---

**Next Step**: Begin Phase 1, Day 1 - Add Edit Mode Props to TransactionWizard
