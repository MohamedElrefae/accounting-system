# Construction Chart of Accounts Migration Guide

## Overview
This migration replaces the current chart of accounts with a new construction-focused 4-level bilingual structure designed specifically for construction management and IFRS 15 compliance.

## Key Features of New Chart of Accounts
- **4-Level Hierarchy**: Main Category → Sub-category → Sub-sub-category → Detailed Postable Accounts
- **Construction-Specific**: Work in Progress (WIP), Retentions, Contract Assets/Liabilities
- **IFRS 15 Compliant**: Proper revenue recognition for construction contracts
- **Bilingual Support**: Full Arabic and English naming
- **1000/2000 Numbering**: Industry-standard numbering system

## Pre-Migration Requirements

### ✅ Prerequisites Checklist
- [ ] Database backup completed
- [ ] All users notified of maintenance window
- [ ] Current transactions exported if needed for historical reference
- [ ] Development/testing environment validated
- [ ] User training materials prepared

### ⚠️ Important Notes
- **Transaction data will be deleted**: As recommended, all existing transactions will be cleared to avoid conflicts
- **Account structure completely replaced**: Old accounts will be removed entirely
- **No account balance preservation**: Starting fresh with new structure
- **Construction-specific features**: New accounts designed for construction project management

## Migration Execution Steps

### Step 1: Pre-Migration Backup
**Script**: `migration_backup_script.sql`
**Estimated Time**: 2-5 minutes

```sql
-- Creates timestamped backup tables for:
-- - accounts table
-- - transactions table  
-- - account_prefix_map table
-- - Audit log entries for tracking
```

**Verification**:
```sql
SELECT * FROM verify_backup_integrity();
```

### Step 2: Transaction Cleanup
**Script**: `transaction_cleanup_script.sql`  
**Estimated Time**: 5-10 minutes

```sql
-- Safely removes:
-- - All transaction records
-- - Ledger entries
-- - Transaction audit records
-- - Related cached data
-- - User preferences referencing old accounts
```

**Purpose**: Ensures clean state for new chart of accounts without conflicts.

### Step 3: Chart of Accounts Migration
**Script**: `construction_chart_of_accounts_migration.sql`
**Estimated Time**: 3-5 minutes

```sql
-- Creates new account structure:
-- Level 1: 5 main categories (Assets, Liabilities, Equity, Revenue, Expenses)
-- Level 2: Sub-categories (Cash, Receivables, etc.)
-- Level 3: Sub-sub-categories (Domestic Customers, etc.)
-- Updates account prefix map for construction numbering
```

### Step 4: Detailed Account Creation
**Script**: `construction_coa_level_4_accounts.sql`
**Estimated Time**: 5-8 minutes

```sql
-- Creates Level 4 postable accounts:
-- - Cash accounts (Main Cash, Petty Cash)
-- - Bank accounts (Bank A, Bank B)  
-- - Customer accounts (Domestic, Foreign)
-- - Construction-specific accounts (WIP, Retentions)
-- - Complete bilingual naming
```

### Step 5: Verification and Testing
**Script**: `verification_and_testing_scripts.sql`
**Estimated Time**: 2-3 minutes

```sql
-- Comprehensive verification:
-- - Account structure validation
-- - Bilingual support verification
-- - Construction feature testing
-- - Category and balance validation
-- - Transaction readiness testing
```

## Account Structure Overview

### Level 1 - Main Categories
| Code | Arabic | English | Normal Balance |
|------|--------|---------|----------------|
| 1000 | الأصول | Assets | Debit |
| 2000 | الخصوم | Liabilities | Credit |
| 3000 | حقوق الملكية | Equity | Credit |
| 4000 | الإيرادات | Revenue | Credit |
| 5000 | التكاليف والمصروفات | Costs and Expenses | Debit |

### Level 2 - Sub-Categories (Examples)
| Code | Arabic | English | Parent |
|------|--------|---------|--------|
| 1100 | النقدية وما في حكمها | Cash and Cash Equivalents | 1000 |
| 1200 | الذمم والأصول المتداولة | Receivables and Current Assets | 1000 |
| 1600 | أعمال تحت التنفيذ | Work in Progress (WIP) | 1000 |
| 2100 | الدائنون التجاريون | Trade Payables and Subcontractors | 2000 |

### Construction-Specific Features

#### Work in Progress (WIP) Accounts
- **1600**: Work in Progress main category
- **1601**: WIP – Project A
- **1602**: WIP – Project B

#### Retention Accounts
- **1230**: Retentions Receivable (From Customers)
- **1231**: Retentions Pending Final Acceptance
- **2140**: Retentions Payable (To Suppliers/Subcontractors)

#### Contract Assets/Liabilities (IFRS 15)
- **1240**: Contract Assets – Unbilled Revenue
- **1241**: Recognized Revenue Not Yet Invoiced
- **2220**: Customer Advances / Contract Liabilities

## Database Changes Summary

### Tables Modified
1. **accounts**: Completely replaced with new structure
2. **account_prefix_map**: Updated with construction prefixes
3. **transactions**: Cleared (all data removed)
4. **ledger_entries**: Cleared (all data removed)
5. **transaction_audit**: Cleared (all data removed)

### UI Compatibility
✅ **Fully Compatible**: The current UI already supports:
- Bilingual account names (name and name_ar fields)
- 4-level account hierarchy
- Construction-specific transaction classifications
- All account categories and types

## Post-Migration Tasks

### Immediate Tasks (Day 1)
- [ ] Run verification script and confirm all tests pass
- [ ] Test account tree display in UI
- [ ] Create sample transactions for each account type
- [ ] Verify bilingual display works correctly

### Week 1 Tasks
- [ ] User training on new account structure
- [ ] Update any custom reports
- [ ] Test integration with external systems
- [ ] Document new account usage guidelines

### Ongoing Tasks
- [ ] Monitor system performance
- [ ] Collect user feedback
- [ ] Adjust account structure if needed
- [ ] Prepare for IFRS 15 compliance reporting

## Rollback Plan

### If Issues Occur
1. **Stop all transactions**: Prevent data corruption
2. **Restore from backup**: Use backup tables created in Step 1
3. **Notify stakeholders**: Communicate rollback status
4. **Investigate issues**: Analyze logs and error reports
5. **Plan re-migration**: Fix issues and reschedule

### Rollback Script Template
```sql
BEGIN;

-- Restore accounts from backup
INSERT INTO accounts 
SELECT * FROM accounts_backup_[TIMESTAMP];

-- Restore transactions from backup  
INSERT INTO transactions
SELECT * FROM transactions_backup_[TIMESTAMP];

-- Restore account prefix map
INSERT INTO account_prefix_map
SELECT * FROM account_prefix_map_backup_[TIMESTAMP];

-- Update audit log
INSERT INTO audit_logs (action, details, created_at)
VALUES ('migration.rollback', '{"reason": "Issues encountered"}', now());

COMMIT;
```

## Support and Troubleshooting

### Common Issues

#### Issue: Accounts not displaying in UI
**Solution**: Clear browser cache and check organization selection

#### Issue: Transaction creation fails
**Solution**: Verify account is postable and allows transactions
```sql
SELECT code, name, is_postable, allow_transactions 
FROM accounts 
WHERE org_id = '[ORG_ID]' AND code = '[ACCOUNT_CODE]';
```

#### Issue: Bilingual names not showing
**Solution**: Check language settings and name_ar field population

### Performance Optimization
- Account tree queries are indexed by org_id and parent_id
- Path-based queries use path field with proper indexing
- Category-based filtering uses category field index

## Migration Checklist

### Pre-Migration
- [ ] Backup completed successfully
- [ ] Users notified and training scheduled  
- [ ] Test environment validated
- [ ] Rollback plan documented

### During Migration
- [ ] Step 1: Backup script executed ✅
- [ ] Step 2: Cleanup script executed ✅
- [ ] Step 3: COA migration executed ✅
- [ ] Step 4: Level 4 accounts created ✅
- [ ] Step 5: Verification passed ✅

### Post-Migration  
- [ ] All verification tests pass
- [ ] UI functionality confirmed
- [ ] Sample transactions created
- [ ] User training completed
- [ ] Documentation updated

## Contact Information
- **Database Admin**: [Your DBA contact]
- **System Admin**: [Your System Admin contact]  
- **Business Users**: [Key business user contacts]
- **Support**: [Technical support contact]

---

**Migration Date**: [To be filled during execution]  
**Executed By**: [Migration executor name]  
**Verified By**: [Verification person name]  
**Status**: [PENDING/IN PROGRESS/COMPLETED/ROLLED BACK]
