# Transaction Refactor - Quick Reference Checklist

## 📋 Pre-Refactor Verification

### Database
- [ ] Verify all triggers on `transactions` table
- [ ] Verify all triggers on `transaction_lines` table
- [ ] List all views using `debit_account_id`, `credit_account_id`, `amount`
- [ ] List all RPC functions using legacy fields
- [ ] Check foreign key constraints
- [ ] Verify cascade delete rules

### Data
- [ ] Count transactions with legacy fields populated
- [ ] Count transactions with lines
- [ ] Count transactions without lines
- [ ] Identify orphaned data
- [ ] Backup production database

### Code
- [ ] Find all usages of `createTransaction()` (legacy)
- [ ] Find all usages of `debit_account_id` in codebase
- [ ] Find all usages of `credit_account_id` in codebase
- [ ] Find all usages of `amount` field in transaction context
- [ ] List all components using `TransactionFormConfig`

---

## 🔧 Refactor Tasks

### 1. Data Migration
- [ ] Write migration script (SQL)
- [ ] Test on development database
- [ ] Test on staging database
- [ ] Verify balance after migration
- [ ] Verify all transactions have minimum 2 lines
- [ ] Run migration on production (maintenance window)

### 2. Database Updates
- [ ] Update triggers to remove legacy field dependencies
- [ ] Update views to use `transaction_lines`
- [ ] Update RPC functions
- [ ] Add deprecation comments to legacy columns
- [ ] Create indexes on `transaction_lines` if needed

### 3. Service Layer
- [ ] Mark `createTransaction()` as deprecated
- [ ] Update `updateTransaction()` to reject legacy fields
- [ ] Add validation for multi-line requirements
- [ ] Update error messages
- [ ] Add migration helper functions

### 4. UI Components
- [ ] Refactor `UnifiedTransactionDetailsPanel`
  - [ ] Add line editor section
  - [ ] Remove legacy field inputs
  - [ ] Add balance display
  - [ ] Add line validation
  - [ ] Test edit mode
- [ ] Update `TransactionFormConfig`
  - [ ] Remove `debit_account_id` field
  - [ ] Remove `credit_account_id` field
  - [ ] Remove `amount` field
  - [ ] Add line editor config
- [ ] Update `TransactionDetails` page
- [ ] Update any other forms using legacy fields

### 5. Testing
- [ ] Unit tests for services
- [ ] Integration tests for API
- [ ] Component tests for UI
- [ ] End-to-end tests for workflows
- [ ] Performance tests for large transactions
- [ ] Test with different user roles
- [ ] Test approval workflow
- [ ] Test posting workflow

### 6. Documentation
- [ ] Update API documentation
- [ ] Update user guide
- [ ] Update developer guide
- [ ] Add migration notes
- [ ] Update changelog

### 7. Deployment
- [ ] Deploy to development
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Rollback plan ready

### 8. Cleanup (After 30 days)
- [ ] Remove deprecated functions
- [ ] Remove legacy field validations
- [ ] Update database schema documentation

### 9. Final Cleanup (After 60 days)
- [ ] Drop legacy columns from database
- [ ] Remove all legacy code
- [ ] Archive old documentation

---

## 🚨 Rollback Plan

If issues occur:
1. Stop deployment
2. Restore database from backup
3. Revert code changes
4. Investigate root cause
5. Fix and retry

---

## ✅ Success Criteria

- [ ] All transactions have lines
- [ ] No usage of legacy fields in new code
- [ ] Edit mode works for multi-line transactions
- [ ] Balance validation works
- [ ] Approval workflow works
- [ ] No data loss
- [ ] Performance acceptable
- [ ] User feedback positive

---

**Status:** Ready for execution  
**Owner:** Development Team  
**Timeline:** 4-6 weeks
