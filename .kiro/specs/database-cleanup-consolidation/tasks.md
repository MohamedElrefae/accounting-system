# Database Cleanup & Service Consolidation - Tasks

## Phase 1: Audit & Analysis

- [ ] 1.1 Discover all tables in public schema and document purpose
- [ ] 1.2 Create dependency map (foreign keys, triggers, RLS policies)
- [ ] 1.3 Identify duplicate/legacy tables
- [ ] 1.4 Audit service files and map to database tables
- [ ] 1.5 Create consolidation roadmap with merge order

## Phase 2: Backup & Preparation

- [ ] 2.1 Create backup tables for all data
- [ ] 2.2 Document all RLS policies on tables to be deleted
- [ ] 2.3 Document all triggers and functions on tables to be deleted
- [ ] 2.4 Document all indexes on tables to be deleted
- [ ] 2.5 Create migration scripts for data consolidation

## Phase 3: Service Consolidation

- [ ] 3.1 Consolidate transaction services into single transactionService.ts
- [ ] 3.2 Consolidate permission services into single permissionService.ts
- [ ] 3.3 Consolidate organization services into single organizationService.ts
- [ ] 3.4 Consolidate access request services (remove .js duplicate)
- [ ] 3.5 Consolidate report services into single reportService.ts
- [ ] 3.6 Create compatibility layer for old APIs (if needed)

## Phase 4: Code Updates

- [ ] 4.1 Update all imports in components to use unified services
- [ ] 4.2 Update all imports in pages to use unified services
- [ ] 4.3 Update all imports in hooks to use unified services
- [ ] 4.4 Update all imports in contexts to use unified services
- [ ] 4.5 Remove old service files after verification
- [ ] 4.6 Verify no broken imports remain

## Phase 5: Database Cleanup

- [ ] 5.1 Execute data migration scripts (old tables → new unified tables)
- [ ] 5.2 Drop RLS policies on old tables
- [ ] 5.3 Drop triggers on old tables
- [ ] 5.4 Drop functions referencing old tables
- [ ] 5.5 Drop indexes on old tables
- [ ] 5.6 Hard delete old tables (CASCADE)

## Phase 6: Testing & Validation

- [ ] 6.1 Run unit tests for all consolidated services
- [ ] 6.2 Run integration tests for service interactions
- [ ] 6.3 Run end-to-end tests for major workflows
- [ ] 6.4 Performance test: verify no degradation
- [ ] 6.5 Test RLS policies still enforce correctly
- [ ] 6.6 Test permission boundaries with new unified service

## Phase 7: Documentation & Cleanup

- [ ] 7.1 Document unified service APIs
- [ ] 7.2 Create migration guide for developers
- [ ] 7.3 Update architecture documentation
- [ ] 7.4 Document removed tables and their replacements
- [ ] 7.5 Clean up backup tables (after verification period)
- [ ] 7.6 Update team on changes

## Detailed Task Breakdown

### Task 1.1: Discover all tables in public schema
**Acceptance Criteria:**
- [ ] Query information_schema to list all tables
- [ ] Document table name, row count, last modified date
- [ ] Categorize tables by domain (transactions, permissions, org, etc.)
- [ ] Identify which tables are actively used vs legacy
- [ ] Create spreadsheet with table inventory

**Deliverable:** `sql/audit_all_tables.sql` + inventory spreadsheet

---

### Task 1.2: Create dependency map
**Acceptance Criteria:**
- [ ] Identify all foreign key relationships
- [ ] List all triggers on each table
- [ ] List all RLS policies on each table
- [ ] List all functions that reference each table
- [ ] Create visual dependency diagram

**Deliverable:** Dependency map document + SQL queries

---

### Task 1.3: Identify duplicate/legacy tables
**Acceptance Criteria:**
- [ ] Compare table schemas to find duplicates
- [ ] Identify tables with no recent activity
- [ ] Identify tables with no foreign key references
- [ ] Mark tables as "keep", "migrate", or "delete"
- [ ] Document reasoning for each decision

**Deliverable:** Consolidation decision matrix

---

### Task 1.4: Audit service files
**Acceptance Criteria:**
- [ ] List all service files in src/services
- [ ] Document what each service does
- [ ] Map each service to database tables it uses
- [ ] Identify overlapping functionality
- [ ] Identify services that can be merged

**Deliverable:** Service audit spreadsheet

---

### Task 1.5: Create consolidation roadmap
**Acceptance Criteria:**
- [ ] Define merge order (dependencies first)
- [ ] Document API changes needed
- [ ] Identify breaking changes
- [ ] Plan compatibility layer if needed
- [ ] Create timeline estimate

**Deliverable:** Consolidation roadmap document

---

### Task 2.1: Create backup tables
**Acceptance Criteria:**
- [ ] Create backup table for each table to be deleted
- [ ] Verify backup contains all data
- [ ] Document backup table names
- [ ] Create script to restore from backup if needed

**Deliverable:** `sql/create_backup_tables.sql`

---

### Task 2.2-2.4: Document dependencies
**Acceptance Criteria:**
- [ ] Export all RLS policies for old tables
- [ ] Export all triggers for old tables
- [ ] Export all functions for old tables
- [ ] Export all indexes for old tables
- [ ] Create drop scripts for each

**Deliverable:** SQL scripts for dropping dependencies

---

### Task 3.1-3.5: Consolidate services
**Acceptance Criteria:**
- [ ] Merge all variant services into single unified service
- [ ] Combine all methods into unified API
- [ ] Remove duplicate code
- [ ] Maintain backward compatibility (if needed)
- [ ] Add comprehensive JSDoc comments

**Deliverable:** Consolidated service files

---

### Task 4.1-4.6: Update imports
**Acceptance Criteria:**
- [ ] Search for all imports of old services
- [ ] Update imports to use unified services
- [ ] Verify no broken imports
- [ ] Run linter to catch issues
- [ ] Delete old service files

**Deliverable:** Updated codebase with new imports

---

### Task 5.1-5.6: Database cleanup
**Acceptance Criteria:**
- [ ] Execute migration scripts
- [ ] Verify data integrity after migration
- [ ] Drop all dependencies
- [ ] Hard delete old tables
- [ ] Verify no orphaned references

**Deliverable:** Cleaned database schema

---

### Task 6.1-6.6: Testing
**Acceptance Criteria:**
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All e2e tests passing
- [ ] Performance metrics acceptable
- [ ] RLS policies enforcing correctly
- [ ] No data loss

**Deliverable:** Test results report

---

### Task 7.1-7.6: Documentation
**Acceptance Criteria:**
- [ ] API documentation for unified services
- [ ] Migration guide for developers
- [ ] Architecture documentation updated
- [ ] Removed tables documented
- [ ] Team notified of changes
- [ ] Backup tables cleaned up

**Deliverable:** Documentation + team communication

---

## Success Metrics

- **Database**: Reduce table count by 40-50%
- **Services**: Reduce service file count by 60%
- **Code**: Eliminate duplicate code
- **Performance**: No degradation
- **Quality**: All tests passing
- **Data**: Zero data loss

## Risk Checklist

- [ ] Full backup created before any deletions
- [ ] All dependencies identified and documented
- [ ] Migration scripts tested on staging
- [ ] Rollback plan documented
- [ ] Team trained on new unified services
- [ ] Monitoring in place for issues
