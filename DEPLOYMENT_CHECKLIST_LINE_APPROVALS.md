# Line Approval System - Deployment Checklist ✅

## Pre-Deployment

### Database
- [ ] Review migration file: `supabase/migrations/20250120_line_based_approval.sql`
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify RLS policies are correct
- [ ] Check function permissions

### Code Review
- [x] TypeScript compilation successful (no errors)
- [x] All imports resolved correctly
- [x] Component structure validated
- [x] Service layer tested
- [x] Hooks implemented correctly

### Testing
- [ ] Unit tests pass (if applicable)
- [ ] Integration tests pass (if applicable)
- [ ] Manual testing completed
- [ ] Cross-browser testing done
- [ ] Mobile responsiveness checked

---

## Deployment Steps

### Step 1: Database Migration
```bash
# Connect to Supabase
supabase db push

# Or apply migration manually
psql -h [host] -U [user] -d [database] -f supabase/migrations/20250120_line_based_approval.sql

# Verify migration
psql -h [host] -U [user] -d [database] -f verify_line_approval_setup.sql
```

**Expected Output:**
- ✅ Columns added to `transaction_lines`
- ✅ Status column added to `transactions`
- ✅ 5 functions created
- ✅ 1 view created
- ✅ 1 trigger created
- ✅ Indexes created

**Verification:**
- [ ] Run `verify_line_approval_setup.sql`
- [ ] Check all objects exist
- [ ] Verify RLS policies active
- [ ] Test function execution

---

### Step 2: Frontend Deployment

#### Build Application
```bash
# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Check for build errors
# Should complete without errors
```

**Files to Deploy:**
- `src/components/Transactions/TransactionWizard.tsx` (modified)
- `src/pages/Approvals/Inbox.tsx` (modified)
- `src/pages/Transactions/Transactions.tsx` (modified)
- `src/components/Approvals/ApprovalStatusBadge.tsx` (new)
- `src/components/Approvals/LineApprovalInbox.tsx` (existing)
- `src/components/Approvals/TransactionApprovalStatus.tsx` (existing)
- `src/hooks/useLineApprovals.ts` (existing)
- `src/services/lineApprovalService.ts` (existing)

#### Deploy to Server
```bash
# Deploy built files
# (Method depends on your hosting)

# Vercel
vercel --prod

# Or manual upload
# Upload dist/ folder to server
```

**Verification:**
- [ ] All files uploaded successfully
- [ ] No 404 errors on routes
- [ ] Assets loading correctly
- [ ] No console errors

---

### Step 3: Cache Management

#### Clear Caches
```bash
# Clear CDN cache (if applicable)
# Clear browser cache
# Clear service worker cache
```

**Actions:**
- [ ] Clear CDN cache
- [ ] Instruct users to hard refresh (Ctrl+Shift+R)
- [ ] Clear Redis cache (if applicable)
- [ ] Restart application servers (if applicable)

---

### Step 4: Permission Setup

#### Assign Permissions
```sql
-- Grant approval review permission to approvers
INSERT INTO user_permissions (user_id, action)
SELECT id, 'approvals.review'
FROM users
WHERE role IN ('manager', 'admin', 'approver');

-- Grant approval management to admins
INSERT INTO user_permissions (user_id, action)
SELECT id, 'approvals.manage'
FROM users
WHERE role = 'admin';
```

**Verification:**
- [ ] Approvers can access inbox
- [ ] Users can submit transactions
- [ ] Admins can manage workflows
- [ ] Non-approvers cannot access inbox

---

### Step 5: Smoke Testing

#### Test Transaction Creation
- [ ] Create new transaction
- [ ] Fill in all steps
- [ ] See approval preview in Step 3
- [ ] Submit for approval
- [ ] Verify status is "submitted"
- [ ] Check lines are "pending"

#### Test Approval Workflow
- [ ] Access approvals inbox
- [ ] See pending line approvals
- [ ] Approve a line
- [ ] Verify line status updated
- [ ] Reject a line
- [ ] Verify transaction status updated

#### Test UI Elements
- [ ] "Approvals Inbox" button visible
- [ ] Tabs work correctly
- [ ] Badge counters show correct numbers
- [ ] Status badges display correctly
- [ ] Progress bars update in real-time

---

## Post-Deployment

### Monitoring

#### Check Logs
```bash
# Check application logs
tail -f /var/log/app.log

# Check database logs
tail -f /var/log/postgresql.log

# Check error logs
# Monitor for any approval-related errors
```

**Watch For:**
- [ ] Database connection errors
- [ ] Permission denied errors
- [ ] Function execution errors
- [ ] RLS policy violations

#### Monitor Performance
- [ ] Page load times acceptable
- [ ] API response times normal
- [ ] Database query performance good
- [ ] No memory leaks

---

### User Communication

#### Notify Users
```
Subject: New Line-Based Approval System Now Live

Dear Team,

We've deployed a new line-based approval system for transactions:

✅ Granular approval control (line-by-line)
✅ Real-time status tracking
✅ Streamlined approval workflow
✅ Quick access from transactions page

Key Changes:
- Transaction submission now goes through approval
- Each line requires separate approval
- New "Approvals Inbox" button on transactions page
- Auto-approval when all lines approved

Please review the quick reference guide for details.

Questions? Contact support.
```

**Actions:**
- [ ] Send announcement email
- [ ] Update user documentation
- [ ] Schedule training session (if needed)
- [ ] Provide quick reference card

---

### Documentation

#### Update Documentation
- [ ] Update user manual
- [ ] Update admin guide
- [ ] Update API documentation
- [ ] Update training materials

#### Archive Old Docs
- [ ] Archive old approval workflow docs
- [ ] Update changelog
- [ ] Tag release in git
- [ ] Update version numbers

---

## Rollback Plan

### If Critical Issues Arise

#### Step 1: Revert Frontend
```bash
# Revert to previous deployment
git revert [commit-hash]
npm run build
# Deploy previous version
```

#### Step 2: Database (Optional)
```sql
-- Database schema is backward compatible
-- No rollback needed unless critical issue

-- If needed, drop new objects:
DROP TRIGGER IF EXISTS auto_approve_transaction_trigger ON transaction_lines;
DROP FUNCTION IF EXISTS check_transaction_fully_approved();
DROP FUNCTION IF EXISTS get_transaction_approval_status(uuid);
DROP FUNCTION IF EXISTS get_pending_line_approvals(uuid);
DROP FUNCTION IF EXISTS reject_transaction_line(uuid, text);
DROP FUNCTION IF EXISTS approve_transaction_line(uuid, text);
DROP VIEW IF EXISTS v_pending_line_approvals;

-- Remove columns (only if absolutely necessary)
-- ALTER TABLE transaction_lines DROP COLUMN approval_status;
-- etc.
```

#### Step 3: Notify Users
```
Subject: Temporary Rollback - Approval System

We've temporarily rolled back to the previous version
due to [issue description].

Your data is safe. We're working on a fix.

Expected resolution: [timeframe]
```

---

## Success Criteria

### Technical
- [x] All TypeScript errors resolved
- [ ] All tests passing
- [ ] No console errors
- [ ] No database errors
- [ ] Performance metrics acceptable

### Functional
- [ ] Users can create transactions
- [ ] Transactions submit for approval
- [ ] Approvers can access inbox
- [ ] Approvals work correctly
- [ ] Auto-approval triggers properly

### User Experience
- [ ] UI is intuitive
- [ ] No confusion about workflow
- [ ] Quick access works
- [ ] Status badges clear
- [ ] Progress tracking accurate

---

## Support Plan

### First 24 Hours
- [ ] Monitor logs continuously
- [ ] Respond to user questions quickly
- [ ] Track any issues reported
- [ ] Be ready for hotfix if needed

### First Week
- [ ] Collect user feedback
- [ ] Monitor performance metrics
- [ ] Address any minor issues
- [ ] Update documentation as needed

### First Month
- [ ] Review adoption metrics
- [ ] Analyze approval patterns
- [ ] Identify optimization opportunities
- [ ] Plan enhancements

---

## Metrics to Track

### Usage Metrics
- Number of transactions submitted
- Number of approvals processed
- Average approval time
- Rejection rate

### Performance Metrics
- Page load time
- API response time
- Database query time
- Error rate

### User Satisfaction
- User feedback score
- Support ticket volume
- Feature adoption rate
- Training completion rate

---

## Contact Information

### Support Team
- **Email**: support@example.com
- **Phone**: +1-xxx-xxx-xxxx
- **Slack**: #approval-system-support

### Technical Team
- **Lead Developer**: [Name]
- **Database Admin**: [Name]
- **DevOps**: [Name]

---

## Sign-Off

### Deployment Approval

- [ ] **Developer**: Code reviewed and tested
  - Name: ________________
  - Date: ________________

- [ ] **QA**: Testing completed successfully
  - Name: ________________
  - Date: ________________

- [ ] **DBA**: Database migration approved
  - Name: ________________
  - Date: ________________

- [ ] **Manager**: Business approval granted
  - Name: ________________
  - Date: ________________

---

## Deployment Log

### Deployment Details
- **Date**: ________________
- **Time**: ________________
- **Deployed By**: ________________
- **Environment**: ☐ Staging  ☐ Production
- **Version**: 1.0.0

### Issues Encountered
```
[Document any issues encountered during deployment]
```

### Resolution
```
[Document how issues were resolved]
```

### Final Status
- ☐ Successful
- ☐ Successful with minor issues
- ☐ Failed (rolled back)

---

**Deployment Checklist Version**: 1.0.0
**Last Updated**: 2025-01-23
**Status**: Ready for Use
