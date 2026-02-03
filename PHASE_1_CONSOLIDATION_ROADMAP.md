# Phase 1: Consolidation Roadmap & Implementation Plan

## Executive Summary
This document defines the consolidation strategy, merge order, API changes, and timeline for the database cleanup and service consolidation project.

---

## 1. CONSOLIDATION STRATEGY

### 1.1 Principles
1. **Single Source of Truth**: One service per domain
2. **Backward Compatibility**: Maintain existing APIs where possible
3. **Gradual Migration**: Consolidate one domain at a time
4. **Comprehensive Testing**: Test each consolidation thoroughly
5. **Zero Data Loss**: Backup before any changes

### 1.2 Consolidation Approach
- **Merge Pattern**: Combine all variant services into primary service
- **API Pattern**: Unified API with all methods from variants
- **Compatibility**: Create wrapper functions for old APIs (if needed)
- **Testing**: Unit tests + integration tests + e2e tests

---

## 2. MERGE ORDER & DEPENDENCIES

### 2.1 Dependency Graph
```
Foundation Layer:
├── Permission Services (no dependencies)
└── Organization Services (depends on Permission Services)

Core Layer:
├── Transaction Services (depends on Permission Services)
├── Line Item Services (depends on Transaction Services)
└── Access Request Services (independent)

Support Layer:
├── Report Services (depends on Transaction Services)
└── Fiscal Services (independent)

Utility Layer:
└── All utility services (independent)
```

### 2.2 Recommended Merge Order

#### Phase 1: Foundation (Week 1)
**Priority**: CRITICAL - Other services depend on this
1. **Consolidate Permission Services**
   - Merge: `permissionSync.ts`, `permissionAuditService.ts`, `scopedRolesService.ts` → `permission/PermissionService.ts`
   - Effort: 2-3 days
   - Risk: HIGH (many services depend on this)
   - Testing: Comprehensive

#### Phase 2: Core Infrastructure (Week 2)
**Priority**: HIGH - Core functionality
2. **Consolidate Organization Services**
   - Merge: `org-memberships.ts`, `projectMemberships.ts` → `organization.ts`
   - Effort: 1-2 days
   - Risk: MEDIUM
   - Testing: Comprehensive

3. **Remove Access Request Duplicate**
   - Delete: `accessRequestService.js`
   - Keep: `accessRequestService.ts`
   - Effort: 0.5 days
   - Risk: LOW
   - Testing: Smoke test

#### Phase 3: Transaction Domain (Week 3)
**Priority**: HIGH - Core functionality
4. **Consolidate Transaction Services**
   - Merge: `transactions-enriched.ts`, `transaction-lines.ts`, `transaction-line-items*.ts`, `transaction-validation*.ts` → `transactions.ts`
   - Effort: 3-4 days
   - Risk: HIGH (complex domain)
   - Testing: Comprehensive

5. **Consolidate Line Item Services**
   - Merge: `line-items-admin.ts`, `line-items-catalog.ts`, `line-items-ui.ts` → `line-items.ts`
   - Effort: 1-2 days
   - Risk: MEDIUM
   - Testing: Comprehensive

#### Phase 4: Reporting & Support (Week 4)
**Priority**: MEDIUM - Support functionality
6. **Consolidate Report Services**
   - Merge: All `reports/*.ts` files → `reports.ts`
   - Effort: 2-3 days
   - Risk: MEDIUM
   - Testing: Comprehensive

---

## 3. DETAILED CONSOLIDATION PLANS

### 3.1 Permission Services Consolidation

#### Current State
```
permission/PermissionService.ts (primary)
permissionSync.ts (sync logic)
permissionAuditService.ts (audit logging)
scopedRolesService.ts (scoped roles)
permission/BatchPermissionProcessor.ts (batch processing)
roleAssignment/RoleAssignmentPropagationService.ts (propagation)
scopedRoles/ScopedRolesOptimizationService.ts (optimization)
```

#### Target State
```
permission/PermissionService.ts (unified)
├── Core permission operations
├── Sync logic
├── Audit logging
├── Scoped roles management
├── Batch processing
├── Role propagation
└── Optimization
```

#### API Changes
```typescript
// OLD APIs (to be deprecated)
import { permissionSync } from './permissionSync';
import { permissionAuditService } from './permissionAuditService';
import { scopedRolesService } from './scopedRolesService';

// NEW API (unified)
import { permissionService } from './permission/PermissionService';

// All methods available on single service
permissionService.getUserPermissions(userId, scope);
permissionService.syncPermissions(userId);
permissionService.getAuditLog(filters);
permissionService.assignRole(userId, roleId, scope);
```

#### Breaking Changes
- None (all old methods preserved)

#### Migration Path
1. Create unified service with all methods
2. Update imports in components/pages
3. Run tests
4. Delete old service files
5. Verify no broken imports

---

### 3.2 Organization Services Consolidation

#### Current State
```
organization.ts (primary)
org-memberships.ts (membership logic)
projectMemberships.ts (project membership logic)
```

#### Target State
```
organization.ts (unified)
├── Organization CRUD
├── Org membership management
└── Project membership management
```

#### API Changes
```typescript
// OLD APIs
import { organization } from './organization';
import { orgMemberships } from './org-memberships';
import { projectMemberships } from './projectMemberships';

// NEW API (unified)
import { organization } from './organization';

// All methods available on single service
organization.getOrganizations(userId);
organization.getMembers(orgId);
organization.getProjectMembers(projectId);
```

#### Breaking Changes
- None (all old methods preserved)

#### Migration Path
1. Merge org-memberships.ts into organization.ts
2. Merge projectMemberships.ts into organization.ts
3. Update imports
4. Run tests
5. Delete old files

---

### 3.3 Transaction Services Consolidation

#### Current State
```
transactions.ts (primary)
transactions-enriched.ts (enrichment)
transaction-lines.ts (line operations)
transaction-line-items.ts (line items)
transaction-line-items-enhanced.ts (enhanced line items)
transaction-line-items-api.ts (API wrapper)
transaction-validation.ts (validation)
transaction-validation-api.ts (validation API)
```

#### Target State
```
transactions.ts (unified)
├── Transaction CRUD
├── Line item operations
├── Enrichment logic
├── Validation logic
└── API wrappers
```

#### API Changes
```typescript
// OLD APIs
import { transactions } from './transactions';
import { transactionsEnriched } from './transactions-enriched';
import { transactionLines } from './transaction-lines';
import { transactionLineItems } from './transaction-line-items';
import { transactionValidation } from './transaction-validation';

// NEW API (unified)
import { transactions } from './transactions';

// All methods available on single service
transactions.getTransactions(filters);
transactions.enrichTransaction(transaction);
transactions.getLineItems(transactionId);
transactions.validateTransaction(data);
```

#### Breaking Changes
- None (all old methods preserved)

#### Migration Path
1. Create unified transactions.ts with all methods
2. Update imports in components/pages
3. Run tests
4. Delete old files
5. Verify no broken imports

---

### 3.4 Line Item Services Consolidation

#### Current State
```
line-items.ts (primary)
line-items-admin.ts (admin operations)
line-items-catalog.ts (catalog operations)
line-items-ui.ts (UI operations)
```

#### Target State
```
line-items.ts (unified)
├── Core operations
├── Admin operations
├── Catalog operations
└── UI operations
```

#### API Changes
```typescript
// OLD APIs
import { lineItems } from './line-items';
import { lineItemsAdmin } from './line-items-admin';
import { lineItemsCatalog } from './line-items-catalog';
import { lineItemsUI } from './line-items-ui';

// NEW API (unified)
import { lineItems } from './line-items';

// All methods available on single service
lineItems.getLineItems(filters);
lineItems.bulkUpdateLineItems(updates);
lineItems.getCatalogItems();
lineItems.getLineItemsForDisplay(filters);
```

#### Breaking Changes
- None (all old methods preserved)

#### Migration Path
1. Merge all line-items-*.ts into line-items.ts
2. Update imports
3. Run tests
4. Delete old files

---

### 3.5 Report Services Consolidation

#### Current State
```
reports.ts (primary)
reports/advancedExportService.ts
reports/runningBalanceService.ts
reports/general-ledger.ts
reports/gl-account-summary.ts
reports/classification-report.ts
reports/analysis-item-usage.ts
reports/work-item-usage.ts
reports/analysis-work-items-filter.ts
reports/unified-financial-query.ts
reports/report-queries.ts
reports/common.ts
```

#### Target State
```
reports.ts (unified)
├── Core report operations
├── Export functionality
├── Running balance reports
├── General ledger reports
├── GL account summary
├── Classification reports
├── Analysis reports
└── Query utilities
```

#### API Changes
```typescript
// OLD APIs
import { reports } from './reports';
import { advancedExportService } from './reports/advancedExportService';
import { runningBalanceService } from './reports/runningBalanceService';
import { generalLedger } from './reports/general-ledger';

// NEW API (unified)
import { reports } from './reports';

// All methods available on single service
reports.getReports(filters);
reports.exportReport(id, format);
reports.getRunningBalance(params);
reports.getGeneralLedger(params);
```

#### Breaking Changes
- None (all old methods preserved)

#### Migration Path
1. Create unified reports.ts with all methods
2. Update imports
3. Run tests
4. Delete old files

---

## 4. IMPLEMENTATION TIMELINE

### Week 1: Permission Services
- **Day 1-2**: Consolidate permission services
- **Day 3**: Update imports across codebase
- **Day 4**: Comprehensive testing
- **Day 5**: Verification and cleanup

### Week 2: Organization & Access Services
- **Day 1-2**: Consolidate organization services
- **Day 3**: Remove access request duplicate
- **Day 4**: Update imports
- **Day 5**: Testing and verification

### Week 3: Transaction Services
- **Day 1-3**: Consolidate transaction services
- **Day 4**: Consolidate line item services
- **Day 5**: Update imports and testing

### Week 4: Report Services & Cleanup
- **Day 1-2**: Consolidate report services
- **Day 3-4**: Update imports and testing
- **Day 5**: Final verification and documentation

### Week 5: Database Cleanup (Phase 2)
- **Day 1-2**: Backup and preparation
- **Day 3-4**: Execute database cleanup
- **Day 5**: Verification and monitoring

---

## 5. TESTING STRATEGY

### 5.1 Unit Tests
- Test each consolidated service independently
- Verify all methods work correctly
- Test edge cases and error handling

### 5.2 Integration Tests
- Test service interactions
- Verify data flows correctly
- Test permission enforcement

### 5.3 End-to-End Tests
- Test complete workflows
- Multi-user scenarios
- Permission boundary testing

### 5.4 Performance Tests
- Query performance
- Memory usage
- Concurrent user load

### 5.5 Regression Tests
- Verify no broken functionality
- Test all existing features
- Verify RLS policies still work

---

## 6. ROLLBACK PLAN

### If Issues Occur
1. **Immediate**: Revert service files from git
2. **Database**: Restore from backup if needed
3. **Imports**: Revert import changes
4. **Testing**: Run full test suite
5. **Monitoring**: Watch for errors

### Rollback Triggers
- Test failures > 5%
- Performance degradation > 10%
- Data loss detected
- Critical functionality broken

---

## 7. SUCCESS METRICS

### Code Metrics
- Service file count: 127 → 110 (13% reduction)
- Code duplication: Eliminate 40-50%
- Lines of code: Reduce by 20-30%

### Quality Metrics
- Test coverage: Maintain > 80%
- Code quality: No regressions
- Performance: No degradation

### Operational Metrics
- Zero data loss
- All tests passing
- All imports updated
- No broken functionality

---

## 8. RISK ASSESSMENT

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|-----------|
| Breaking imports | HIGH | MEDIUM | Automated search/replace, comprehensive testing |
| API changes | HIGH | LOW | Backward compatibility layer |
| Performance impact | MEDIUM | LOW | Profile before/after, optimize queries |
| Data loss | LOW | LOW | Backup before changes, verify migrations |
| Circular dependencies | MEDIUM | MEDIUM | Analyze dependency graph, refactor if needed |
| Test failures | MEDIUM | MEDIUM | Comprehensive testing, gradual rollout |

---

## 9. COMMUNICATION PLAN

### Stakeholders
- Development team
- QA team
- Product team
- DevOps team

### Communication Schedule
- **Week 1**: Kickoff meeting, explain plan
- **Weekly**: Status updates
- **After each phase**: Demo and feedback
- **Final**: Completion report

### Documentation
- Update architecture documentation
- Create migration guide for developers
- Document removed tables and replacements
- Update API documentation

---

## 10. NEXT STEPS

### Immediate (This Week)
1. ✅ Complete Phase 1 audit
2. ✅ Create consolidation roadmap (this document)
3. ⏳ Review and approve roadmap
4. ⏳ Schedule kickoff meeting

### Short Term (Next Week)
1. ⏳ Start permission services consolidation
2. ⏳ Update imports
3. ⏳ Run tests
4. ⏳ Verify no broken functionality

### Medium Term (Weeks 2-4)
1. ⏳ Continue with remaining consolidations
2. ⏳ Update all imports
3. ⏳ Comprehensive testing
4. ⏳ Performance validation

### Long Term (Week 5+)
1. ⏳ Database cleanup (Phase 2)
2. ⏳ Final verification
3. ⏳ Documentation
4. ⏳ Team training

---

## Document Version
- **Version**: 1.0
- **Date**: 2026-01-27
- **Status**: DRAFT - Ready for review
- **Approval**: Pending
- **Next Review**: After stakeholder feedback
