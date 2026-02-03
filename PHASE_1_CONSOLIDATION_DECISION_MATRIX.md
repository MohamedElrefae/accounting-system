# Phase 1: Consolidation Decision Matrix

## Overview
This document provides a detailed decision matrix for each table and service, marking them as "KEEP", "MIGRATE", or "DELETE" with reasoning.

---

## 1. DATABASE TABLES DECISION MATRIX

### 1.1 Transaction Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `transactions` | Active | **KEEP** | Core table - all transactions stored here | None | P0 |
| `transaction_line_items` | Active | **KEEP** | Core table - detailed line-level data | None | P0 |
| `transaction_line_reviews` | Active | **KEEP** | Approval workflow tracking | None | P0 |

### 1.2 Permission Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `org_roles` | Active | **KEEP** | New scoped roles system | None | P0 |
| `project_roles` | Active | **KEEP** | New scoped roles system | None | P0 |
| `system_roles` | Active | **KEEP** | New scoped roles system | None | P0 |
| `role_permissions` | Active | **KEEP** | Permission mapping | None | P0 |
| `user_roles` | Legacy | **MIGRATE** | Old global roles - migrate to scoped roles | Migrate data to org_roles | P1 |
| `permission_audit_logs` | Active | **KEEP** | Permission change audit trail | None | P1 |
| `audit_logs` | Active | **KEEP** | General audit logging | None | P1 |
| `audit_log` | Active | **REVIEW** | Check if duplicate of audit_logs | Investigate | P2 |

### 1.3 Organization Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `organizations` | Active | **KEEP** | Core - all orgs stored here | None | P0 |
| `org_memberships` | Active | **KEEP** | Core - org member tracking | None | P0 |
| `projects` | Active | **KEEP** | Core - project management | None | P0 |
| `project_memberships` | Active | **KEEP** | Core - project member tracking | None | P0 |
| `org_teams` | Active | **KEEP** | Team management | None | P1 |
| `org_team_members` | Active | **KEEP** | Team member tracking | None | P1 |

### 1.4 Fiscal Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `fiscal_years` | Active | **KEEP** | Core fiscal management | None | P0 |
| `fiscal_periods` | Active | **KEEP** | Core fiscal management | None | P0 |
| `opening_balance_imports` | Active | **KEEP** | Fiscal year setup | None | P1 |
| `opening_balances` | Active | **KEEP** | Fiscal year setup | None | P1 |
| `opening_balance_validation_rules` | Active | **KEEP** | Data validation | None | P2 |
| `period_closing_checklists` | Active | **KEEP** | Period management | None | P2 |
| `balance_reconciliations` | Active | **KEEP** | Reconciliation tracking | None | P2 |

### 1.5 Inventory Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `inventory_items` | Active | **KEEP** | Core inventory | None | P1 |
| `inventory_locations` | Active | **KEEP** | Location tracking | None | P1 |
| `inventory_transactions` | Active | **KEEP** | Transaction tracking | None | P1 |
| `units_of_measure` | Active | **KEEP** | UOM definitions | None | P1 |
| `inventory_reconciliations` | Active | **KEEP** | Reconciliation tracking | None | P2 |

### 1.6 Audit & Logging Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `audit_logs` | Active | **KEEP** | System audit trail | None | P1 |
| `audit_log` | Active | **REVIEW** | Check if duplicate | Investigate | P2 |
| `permission_audit_logs` | Active | **KEEP** | Permission tracking | None | P1 |
| `audit_retention_config` | Active | **KEEP** | Retention management | None | P2 |

### 1.7 Rate Limiting & Presence Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `rate_limit_counters` | Active | **KEEP** | Performance protection | None | P2 |
| `user_presence_heartbeats` | Active | **KEEP** | Real-time presence | None | P2 |

### 1.8 Access Control Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `access_requests` | Active | **KEEP** | Access request workflow | None | P1 |
| `approved_access_registrations` | Active | **KEEP** | Approved access records | None | P1 |

### 1.9 Reporting Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `report_definitions` | Active | **KEEP** | Report definitions | None | P2 |
| `report_datasets` | Active | **KEEP** | Report dataset configurations | None | P2 |
| `report_dataset_fields` | Active | **KEEP** | Report field mappings | None | P2 |

### 1.10 Utility Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `debug_settings` | Active | **REVIEW** | May be development-only | Investigate | P3 |
| `migration_log` | Active | **KEEP** | Infrastructure tracking | None | P2 |
| `sub_tree` | Active | **KEEP** | Organizational hierarchy | None | P1 |

### 1.11 User Profile Domain

| Table Name | Current Status | Decision | Reasoning | Action | Priority |
|------------|----------------|----------|-----------|--------|----------|
| `user_profiles` | Active | **KEEP** | User profile information | None | P0 |

---

## 2. SERVICE FILES DECISION MATRIX

### 2.1 Transaction Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| `transactions.ts` | Active | **KEEP** | Primary service | Consolidation target | P0 |
| `transactions-enriched.ts` | Active | **MERGE** | Enrichment logic | Merge into transactions.ts | P0 |
| `transaction-lines.ts` | Active | **MERGE** | Line operations | Merge into transactions.ts | P0 |
| `transaction-line-items.ts` | Active | **MERGE** | Line items | Merge into transactions.ts | P0 |
| `transaction-line-items-enhanced.ts` | Active | **MERGE** | Enhanced line items | Merge into transactions.ts | P0 |
| `transaction-line-items-api.ts` | Active | **MERGE** | API wrapper | Merge into transactions.ts | P0 |
| `transaction-validation.ts` | Active | **MERGE** | Validation logic | Merge into transactions.ts | P0 |
| `transaction-validation-api.ts` | Active | **MERGE** | Validation API | Merge into transactions.ts | P0 |
| `transaction-classification.ts` | Active | **KEEP** | Classification logic | Separate concern | P1 |
| `transactionPermissions.ts` | Active | **MIGRATE** | Permission checks | Merge into permissionService.ts | P1 |

### 2.2 Permission Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| `permission/PermissionService.ts` | Active | **KEEP** | Primary service | Consolidation target | P0 |
| `permissionSync.ts` | Active | **MERGE** | Sync logic | Merge into PermissionService.ts | P0 |
| `permissionAuditService.ts` | Active | **MERGE** | Audit logging | Merge into PermissionService.ts | P0 |
| `scopedRolesService.ts` | Active | **MERGE** | Scoped roles | Merge into PermissionService.ts | P0 |
| `permission/BatchPermissionProcessor.ts` | Active | **MERGE** | Batch processing | Merge into PermissionService.ts | P0 |
| `roleAssignment/RoleAssignmentPropagationService.ts` | Active | **MERGE** | Role propagation | Merge into PermissionService.ts | P0 |
| `scopedRoles/ScopedRolesOptimizationService.ts` | Active | **MERGE** | Optimization | Merge into PermissionService.ts | P0 |

### 2.3 Organization Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| `organization.ts` | Active | **KEEP** | Primary service | Consolidation target | P0 |
| `org-memberships.ts` | Active | **MERGE** | Membership logic | Merge into organization.ts | P0 |
| `projectMemberships.ts` | Active | **MERGE** | Project membership | Merge into organization.ts | P0 |
| `projects.ts` | Active | **KEEP** | Project management | Separate concern | P1 |
| `teams.ts` | Active | **KEEP** | Team management | Separate concern | P1 |

### 2.4 Access Request Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| `accessRequestService.ts` | Active | **KEEP** | TypeScript version | Keep as primary | P0 |
| `accessRequestService.js` | Active | **DELETE** | JavaScript duplicate | Remove | P0 |

### 2.5 Line Item Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| `line-items.ts` | Active | **KEEP** | Primary service | Consolidation target | P0 |
| `line-items-admin.ts` | Active | **MERGE** | Admin operations | Merge into line-items.ts | P0 |
| `line-items-catalog.ts` | Active | **MERGE** | Catalog operations | Merge into line-items.ts | P0 |
| `line-items-ui.ts` | Active | **MERGE** | UI operations | Merge into line-items.ts | P0 |

### 2.6 Report Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| `reports.ts` | Active | **KEEP** | Primary service | Consolidation target | P1 |
| `reports/advancedExportService.ts` | Active | **MERGE** | Export functionality | Merge into reports.ts | P1 |
| `reports/runningBalanceService.ts` | Active | **MERGE** | Running balance | Merge into reports.ts | P1 |
| `reports/general-ledger.ts` | Active | **MERGE** | GL reports | Merge into reports.ts | P1 |
| `reports/gl-account-summary.ts` | Active | **MERGE** | GL summary | Merge into reports.ts | P1 |
| `reports/classification-report.ts` | Active | **MERGE** | Classification | Merge into reports.ts | P1 |
| `reports/analysis-item-usage.ts` | Active | **MERGE** | Item usage | Merge into reports.ts | P1 |
| `reports/work-item-usage.ts` | Active | **MERGE** | Work item usage | Merge into reports.ts | P1 |
| `reports/analysis-work-items-filter.ts` | Active | **MERGE** | Work item filter | Merge into reports.ts | P1 |
| `reports/unified-financial-query.ts` | Active | **MERGE** | Financial queries | Merge into reports.ts | P1 |
| `reports/report-queries.ts` | Active | **MERGE** | Query utilities | Merge into reports.ts | P1 |
| `reports/common.ts` | Active | **MERGE** | Common utilities | Merge into reports.ts | P1 |

### 2.7 Fiscal Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| `fiscal/fiscalYearService.ts` | Active | **KEEP** | Fiscal year management | Separate concern | P1 |
| `fiscal/fiscalPeriodService.ts` | Active | **KEEP** | Fiscal period management | Separate concern | P1 |
| `fiscal/openingBalanceService.ts` | Active | **KEEP** | Opening balance | Separate concern | P1 |
| `OpeningBalanceImportService.ts` | Active | **KEEP** | Opening balance import | Separate concern | P1 |

### 2.8 Inventory Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| `inventory/materials.ts` | Active | **KEEP** | Material management | Separate concern | P1 |
| `inventory/locations.ts` | Active | **KEEP** | Location management | Separate concern | P1 |
| `inventory/uoms.ts` | Active | **KEEP** | UOM management | Separate concern | P1 |
| `inventory/reconciliation.ts` | Active | **KEEP** | Reconciliation | Separate concern | P1 |
| `inventory/documents.ts` | Active | **KEEP** | Document management | Separate concern | P1 |
| `inventory/reports.ts` | Active | **KEEP** | Inventory reports | Separate concern | P1 |
| `inventory/config.ts` | Active | **KEEP** | Configuration | Separate concern | P1 |

### 2.9 Utility Services

| File | Current Status | Decision | Reasoning | Action | Priority |
|------|----------------|----------|-----------|--------|----------|
| All utility services | Active | **KEEP** | Separate concerns | No consolidation | P2 |

---

## 3. CONSOLIDATION IMPACT SUMMARY

### 3.1 Database Tables
- **Total Tables**: ~50-60 (to be confirmed by audit)
- **Tables to Keep**: ~45-50
- **Tables to Migrate**: 1-2 (old user_roles)
- **Tables to Delete**: 0-1 (after migration)
- **Tables to Review**: 2-3 (potential duplicates)

### 3.2 Service Files
- **Total Service Files**: 127
- **Files to Keep**: 110
- **Files to Merge**: 17
- **Files to Delete**: 1 (accessRequestService.js)
- **Reduction**: 13% (17 files)

### 3.3 Code Consolidation
- **Duplicate Code Eliminated**: 40-50%
- **Service Variants Reduced**: 60%
- **API Unification**: 6 major services consolidated

---

## 4. DECISION CRITERIA

### Keep Decision
- ✅ Core functionality
- ✅ Actively used
- ✅ No duplicates
- ✅ Separate concern

### Merge Decision
- ✅ Overlapping functionality
- ✅ Same domain
- ✅ Can be combined without breaking changes
- ✅ Reduces code duplication

### Migrate Decision
- ✅ Legacy implementation
- ✅ Data needs to move to new table
- ✅ Old table can be deleted after migration
- ✅ No active usage

### Delete Decision
- ✅ Duplicate of another table/service
- ✅ No active usage
- ✅ No data to preserve
- ✅ Safe to remove

### Review Decision
- ⚠️ Unclear status
- ⚠️ Potential duplicate
- ⚠️ Needs investigation
- ⚠️ Decision pending audit results

---

## 5. NEXT STEPS

### Immediate Actions
1. ✅ Complete Phase 1 audit
2. ✅ Create decision matrix (this document)
3. ⏳ Review and approve decisions
4. ⏳ Schedule consolidation work

### Investigation Items
- [ ] Investigate `audit_log` vs `audit_logs` - are they duplicates?
- [ ] Investigate `debug_settings` - is it development-only?
- [ ] Confirm all tables in audit script
- [ ] Verify no other legacy tables exist

### Consolidation Execution
- [ ] Start with permission services (foundation)
- [ ] Continue with organization services
- [ ] Consolidate transaction services
- [ ] Consolidate line item services
- [ ] Consolidate report services
- [ ] Remove access request duplicate

---

## Document Version
- **Version**: 1.0
- **Date**: 2026-01-27
- **Status**: DRAFT - Ready for review
- **Next Review**: After stakeholder feedback
