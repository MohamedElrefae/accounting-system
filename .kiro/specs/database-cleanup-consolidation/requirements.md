# Database Cleanup & Service Consolidation - Requirements

## Overview
Consolidate fragmented database tables and services into unified, single-source-of-truth implementations for improved scalability, maintainability, and performance.

## Current State Analysis

### Fragmented Services (Identified)
- **Transaction Services**: `transactions.ts`, `transactions-enriched.ts`, `transaction-lines.ts`, `transaction-line-items.ts`, `transaction-line-items-enhanced.ts`, `transaction-line-items-api.ts`, `transaction-line-items-ui.ts`, `transaction-line-items-admin.ts`
- **Line Item Services**: Multiple overlapping implementations
- **Permission Services**: `permissionSync.ts`, `permissionAuditService.ts`, `PermissionService.ts` (in permission folder)
- **Organization Services**: `organization.ts`, `org-memberships.ts`, `projectMemberships.ts`
- **Access Services**: `accessRequestService.js`, `accessRequestService.ts` (duplicate formats)
- **User Services**: Multiple user/profile/member related services
- **Report Services**: `reports.ts` + `reports/` folder with multiple implementations

### Duplicate/Legacy Tables (To Identify)
- Old transaction tables vs new unified transaction tables
- Legacy permission tables vs new scoped roles tables
- Duplicate user profile tables
- Old access request tables
- Redundant fiscal period tables
- Legacy line item approval tables

## Acceptance Criteria

### 1. Database Schema Audit
- [ ] **1.1** Identify all tables in public schema with their purpose and usage
- [ ] **1.2** Map dependencies between tables (foreign keys, triggers, RLS policies)
- [ ] **1.3** Identify duplicate/redundant tables with same data structure
- [ ] **1.4** Document which tables are actively used vs legacy
- [ ] **1.5** Create dependency graph showing table relationships

### 2. Service Consolidation Plan
- [ ] **2.1** Audit all service files and identify overlapping functionality
- [ ] **2.2** Map which services use which database tables
- [ ] **2.3** Identify services that can be merged (e.g., transaction variants)
- [ ] **2.4** Create consolidation roadmap with merge order
- [ ] **2.5** Document API changes needed for unified services

### 3. Hard Delete Strategy
- [ ] **3.1** Create backup of all data from tables to be deleted
- [ ] **3.2** Identify and migrate any critical data to unified tables
- [ ] **3.3** Remove old RLS policies referencing deleted tables
- [ ] **3.4** Drop old triggers and functions referencing deleted tables
- [ ] **3.5** Drop old indexes on deleted tables
- [ ] **3.6** Hard delete old tables (CASCADE where safe)

### 4. Service Consolidation Execution
- [ ] **4.1** Merge transaction service variants into single `transactionService.ts`
- [ ] **4.2** Merge line item services into single `lineItemService.ts`
- [ ] **4.3** Merge permission services into single `permissionService.ts`
- [ ] **4.4** Merge organization services into single `organizationService.ts`
- [ ] **4.5** Merge access request services (remove .js duplicate)
- [ ] **4.6** Consolidate report services

### 5. Code Updates
- [ ] **5.1** Update all imports across codebase to use unified services
- [ ] **5.2** Remove old service files after migration
- [ ] **5.3** Update component/page files to use new unified APIs
- [ ] **5.4** Verify no broken imports or references

### 6. Testing & Validation
- [ ] **6.1** Run full test suite to ensure no regressions
- [ ] **6.2** Verify all CRUD operations work with unified services
- [ ] **6.3** Validate RLS policies still enforce correctly
- [ ] **6.4** Performance test: verify no degradation from consolidation
- [ ] **6.5** End-to-end testing of all major workflows

### 7. Documentation
- [ ] **7.1** Document unified service APIs
- [ ] **7.2** Create migration guide for developers
- [ ] **7.3** Update architecture documentation
- [ ] **7.4** Document removed tables and their replacements

## Success Metrics
- **Database**: Reduce table count by 40-50% (remove duplicates/legacy)
- **Services**: Reduce service file count by 60% (consolidate variants)
- **Code Quality**: Eliminate duplicate code, single source of truth
- **Performance**: Maintain or improve query performance
- **Maintainability**: Clearer service boundaries, easier to understand

## Scope Boundaries
- **In Scope**: Database tables, service consolidation, hard deletes
- **Out of Scope**: UI/component changes (only update imports), business logic changes
- **Risk Level**: HIGH - requires careful data migration and testing

## Dependencies
- Backup of production database
- Comprehensive test coverage
- Staging environment for validation
- Team review of consolidation plan

## Timeline Estimate
- Phase 1 (Audit): 2-3 days
- Phase 2 (Planning): 1-2 days
- Phase 3 (Execution): 3-5 days
- Phase 4 (Testing): 2-3 days
- Phase 5 (Cleanup): 1 day
