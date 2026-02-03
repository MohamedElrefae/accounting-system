# Database Cleanup & Service Consolidation - Design

## Architecture Overview

### Current State (Fragmented)
```
Multiple Transaction Services → Multiple Transaction Tables
Multiple Permission Services → Multiple Permission Tables
Multiple Organization Services → Multiple Organization Tables
Multiple Line Item Services → Multiple Line Item Tables
```

### Target State (Unified)
```
Single Transaction Service → Single Transaction Table (with variants as views/columns)
Single Permission Service → Single Permission Table (scoped roles)
Single Organization Service → Single Organization Table
Single Line Item Service → Single Line Item Table
```

## Database Consolidation Strategy

### Phase 1: Identify & Audit

#### Tables to Audit
1. **Transaction Tables**
   - `transactions` (main)
   - `transaction_line_items` (main)
   - Legacy transaction tables (if any)
   - Draft/temp transaction tables

2. **Permission Tables**
   - `user_roles` (old global roles)
   - `role_permissions` (old)
   - `scoped_user_roles` (new)
   - `scoped_role_permissions` (new)
   - `org_role_permissions` (if exists)
   - `project_role_permissions` (if exists)

3. **Organization Tables**
   - `organizations`
   - `org_memberships`
   - `projects`
   - `project_memberships`
   - Legacy org tables

4. **Access Control Tables**
   - `access_requests`
   - `approved_access_registrations`
   - Legacy access tables

5. **Line Item Tables**
   - `transaction_line_items` (main)
   - `line_item_approvals`
   - Legacy line item tables

### Phase 2: Service Consolidation Map

#### Transaction Services Consolidation
```
MERGE INTO: transactionService.ts
├── transactions.ts
├── transactions-enriched.ts
├── transaction-lines.ts
├── transaction-line-items.ts
├── transaction-line-items-enhanced.ts
├── transaction-line-items-api.ts
├── transaction-line-items-ui.ts
└── transaction-line-items-admin.ts

UNIFIED API:
├── getTransactions(filters)
├── getTransaction(id)
├── createTransaction(data)
├── updateTransaction(id, data)
├── deleteTransaction(id)
├── getLineItems(transactionId)
├── addLineItem(transactionId, data)
├── updateLineItem(id, data)
├── deleteLineItem(id)
├── approveLineItem(id)
└── rejectLineItem(id)
```

#### Permission Services Consolidation
```
MERGE INTO: permissionService.ts
├── permissionSync.ts
├── permissionAuditService.ts
├── permission/PermissionService.ts
└── scopedRolesService.ts

UNIFIED API:
├── getUserPermissions(userId, scope)
├── assignRole(userId, roleId, scope)
├── revokeRole(userId, roleId, scope)
├── getAuditLog(filters)
├── validatePermission(userId, action, resource)
└── syncPermissions(userId)
```

#### Organization Services Consolidation
```
MERGE INTO: organizationService.ts
├── organization.ts
├── org-memberships.ts
└── projectMemberships.ts

UNIFIED API:
├── getOrganizations(userId)
├── getOrganization(id)
├── createOrganization(data)
├── updateOrganization(id, data)
├── getMembers(orgId)
├── addMember(orgId, userId, role)
├── removeMember(orgId, userId)
├── getProjects(orgId)
├── getProjectMembers(projectId)
└── assignProjectRole(projectId, userId, role)
```

#### Access Request Services Consolidation
```
MERGE INTO: accessRequestService.ts
├── accessRequestService.js (remove)
└── accessRequestService.ts (keep)

UNIFIED API:
├── createAccessRequest(data)
├── getAccessRequests(filters)
├── approveAccessRequest(id)
├── rejectAccessRequest(id)
└── getAccessRequestHistory(userId)
```

#### Report Services Consolidation
```
MERGE INTO: reportService.ts
├── reports.ts
├── reports/advancedExportService.ts
├── reports/runningBalanceService.ts
└── reports/* (other report services)

UNIFIED API:
├── getReports(filters)
├── getReport(id)
├── createReport(definition)
├── executeReport(id, params)
├── exportReport(id, format)
└── getReportData(id)
```

### Phase 3: Hard Delete Strategy

#### Step 1: Data Backup
```sql
-- Create backup tables for all data
CREATE TABLE IF NOT EXISTS backup_transactions AS SELECT * FROM transactions;
CREATE TABLE IF NOT EXISTS backup_transaction_line_items AS SELECT * FROM transaction_line_items;
CREATE TABLE IF NOT EXISTS backup_user_roles AS SELECT * FROM user_roles;
-- ... etc for all tables
```

#### Step 2: Identify Legacy Tables
```sql
-- Find tables with no recent activity
SELECT table_name, 
       (SELECT MAX(modified_at) FROM table_name) as last_modified
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY last_modified;
```

#### Step 3: Migrate Critical Data
```sql
-- Migrate any data from old tables to new unified tables
-- Example: Migrate old permissions to scoped_user_roles
INSERT INTO scoped_user_roles (user_id, role_id, org_id, created_at)
SELECT user_id, role_id, NULL, created_at FROM user_roles
WHERE NOT EXISTS (
  SELECT 1 FROM scoped_user_roles 
  WHERE scoped_user_roles.user_id = user_roles.user_id
);
```

#### Step 4: Remove Dependencies
```sql
-- Drop RLS policies on old tables
DROP POLICY IF EXISTS old_policy ON old_table;

-- Drop triggers on old tables
DROP TRIGGER IF EXISTS old_trigger ON old_table;

-- Drop functions referencing old tables
DROP FUNCTION IF EXISTS old_function();

-- Drop indexes on old tables
DROP INDEX IF EXISTS old_index;
```

#### Step 5: Hard Delete Tables
```sql
-- Hard delete old tables (CASCADE to remove dependencies)
DROP TABLE IF EXISTS old_transaction_table CASCADE;
DROP TABLE IF EXISTS old_permission_table CASCADE;
DROP TABLE IF EXISTS old_org_table CASCADE;
-- ... etc
```

## Implementation Order

### Priority 1: Permission Services (Foundation)
- Consolidate permission services first (other services depend on it)
- Migrate from old `user_roles` to `scoped_user_roles`
- Update all permission checks to use unified service

### Priority 2: Organization Services
- Consolidate org/project membership services
- Ensure all org-scoped operations use unified service
- Update scope context to use new service

### Priority 3: Transaction Services
- Consolidate transaction and line item services
- Migrate any legacy transaction data
- Update all transaction operations

### Priority 4: Access Request Services
- Simple consolidation (remove .js duplicate)
- Merge into single TypeScript service

### Priority 5: Report Services
- Consolidate report implementations
- Ensure all report generation uses unified service

## API Compatibility Layer

For smooth migration, create compatibility wrappers:

```typescript
// Old API → New API mapping
export const transactionService = {
  // Old methods (deprecated)
  getTransactions: (filters) => newTransactionService.getTransactions(filters),
  getLineItems: (txnId) => newTransactionService.getLineItems(txnId),
  
  // New unified methods
  ...newTransactionService
};
```

## Testing Strategy

### Unit Tests
- Test each consolidated service independently
- Verify all old APIs still work (compatibility layer)
- Test data migration logic

### Integration Tests
- Test service interactions
- Verify RLS policies work with new tables
- Test permission enforcement

### End-to-End Tests
- Full workflow testing (create transaction → approve → export)
- Multi-user scenarios
- Permission boundary testing

### Performance Tests
- Query performance on consolidated tables
- Index effectiveness
- Concurrent user load testing

## Rollback Plan

If issues occur:
1. Restore from backup tables
2. Revert service files from git
3. Restore old RLS policies and triggers
4. Restart application

## Success Criteria

- ✅ All old services removed
- ✅ All old tables deleted
- ✅ All imports updated
- ✅ All tests passing
- ✅ No performance degradation
- ✅ Zero data loss
- ✅ All workflows functional

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Data loss | Full backup before deletion, verify migration |
| Broken imports | Automated search/replace, comprehensive testing |
| Performance issues | Index optimization, query analysis |
| RLS policy failures | Test policies before deletion |
| Trigger/function failures | Identify all dependencies before deletion |
