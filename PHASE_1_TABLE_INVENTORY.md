# Phase 1: Database Table Inventory & Analysis

## Executive Summary
This document provides a comprehensive audit of all tables in the public schema, categorized by domain, with analysis of their purpose, usage, and consolidation recommendations.

---

## 1. TRANSACTION DOMAIN

### 1.1 Core Transaction Tables

| Table Name | Purpose | Row Count | Status | Notes |
|------------|---------|-----------|--------|-------|
| `transactions` | Main transaction records | Active | KEEP | Core table - all transactions stored here |
| `transaction_line_items` | Line items within transactions | Active | KEEP | Core table - detailed line-level data |
| `transaction_line_reviews` | Reviews/approvals for line items | Active | KEEP | Approval workflow tracking |

### 1.2 Legacy/Duplicate Transaction Tables
- **Status**: To be identified via audit script
- **Candidates**: Any tables with names like `transactions_legacy`, `transaction_drafts`, `transaction_temp`

---

## 2. PERMISSION & ROLE DOMAIN

### 2.1 Core Permission Tables (New - Scoped Roles)

| Table Name | Purpose | Status | Notes |
|------------|---------|--------|-------|
| `org_roles` | Organization-level role assignments | KEEP | New scoped roles system |
| `project_roles` | Project-level role assignments | KEEP | New scoped roles system |
| `system_roles` | System-level role assignments | KEEP | New scoped roles system |
| `role_permissions` | Permissions associated with roles | KEEP | Permission mapping |

### 2.2 Legacy Permission Tables (Old - Global Roles)

| Table Name | Purpose | Status | Notes |
|------------|---------|--------|-------|
| `user_roles` | Old global role assignments | MIGRATE/DELETE | Legacy - migrate to scoped_user_roles |
| `permission_audit_logs` | Permission change audit trail | KEEP | Audit logging |

---

## 3. ORGANIZATION & PROJECT DOMAIN

### 3.1 Core Organization Tables

| Table Name | Purpose | Status | Notes |
|------------|---------|--------|-------|
| `organizations` | Organization records | KEEP | Core - all orgs stored here |
| `org_memberships` | Organization membership records | KEEP | Core - org member tracking |
| `projects` | Project records within organizations | KEEP | Core - project management |
| `project_memberships` | Project membership records | KEEP | Core - project member tracking |
| `org_teams` | Team groupings within organizations | KEEP | Team management |
| `org_team_members` | Team membership records | KEEP | Team member tracking |

---

## 4. FISCAL MANAGEMENT DOMAIN

### 4.1 Fiscal Tables

| Table Name | Purpose | Status | Notes |
|------------|---------|--------|-------|
| `fiscal_years` | Fiscal year definitions | KEEP | Core fiscal management |
| `fiscal_periods` | Fiscal period definitions | KEEP | Core fiscal management |
| `opening_balance_imports` | Opening balance import records | KEEP | Fiscal year setup |
| `opening_balances` | Opening balance data | KEEP | Fiscal year setup |
| `opening_balance_validation_rules` | Validation rules for opening balances | KEEP | Data validation |
| `period_closing_checklists` | Checklists for period closing | KEEP | Period management |
| `balance_reconciliations` | Balance reconciliation records | KEEP | Reconciliation tracking |

---

## 5. INVENTORY DOMAIN

### 5.1 Inventory Tables
- **Status**: To be identified via audit script
- **Expected Tables**: 
  - `inventory_items` or `materials`
  - `inventory_locations`
  - `inventory_transactions`
  - `units_of_measure` (UOM)
  - `inventory_reconciliations`

---

## 6. AUDIT & LOGGING DOMAIN

### 6.1 Audit Tables

| Table Name | Purpose | Status | Notes |
|------------|---------|--------|-------|
| `audit_logs` | General audit logging | KEEP | System audit trail |
| `audit_log` | Alternative audit log table | REVIEW | Check if duplicate of audit_logs |
| `permission_audit_logs` | Permission-specific audit logs | KEEP | Permission tracking |
| `audit_retention_config` | Audit retention policy configuration | KEEP | Retention management |

---

## 7. RATE LIMITING & PRESENCE DOMAIN

### 7.1 Rate Limiting & Presence Tables

| Table Name | Purpose | Status | Notes |
|------------|---------|--------|-------|
| `rate_limit_counters` | Rate limiting counters | KEEP | Performance protection |
| `user_presence_heartbeats` | User presence tracking | KEEP | Real-time presence |

---

## 8. ACCESS CONTROL DOMAIN

### 8.1 Access Control Tables
- **Status**: To be identified via audit script
- **Expected Tables**:
  - `access_requests` - Access request workflow
  - `approved_access_registrations` - Approved access records

---

## 9. REPORTING DOMAIN

### 9.1 Report Tables
- **Status**: To be identified via audit script
- **Expected Tables**:
  - `report_definitions` - Report definitions
  - `report_datasets` - Report dataset configurations
  - `report_dataset_fields` - Report field mappings

---

## 10. UTILITY DOMAIN

### 10.1 Utility Tables

| Table Name | Purpose | Status | Notes |
|------------|---------|--------|-------|
| `debug_settings` | Debug configuration | REVIEW | May be development-only |
| `migration_log` | Migration tracking | KEEP | Infrastructure tracking |
| `sub_tree` | Hierarchical tree structure | KEEP | Organizational hierarchy |

---

## 11. USER PROFILE DOMAIN

### 11.1 User Profile Tables
- **Status**: To be identified via audit script
- **Expected Tables**:
  - `user_profiles` - User profile information
  - `user_roles` - User role assignments (legacy)

---

## Domain Summary Table

| Domain | Table Count | Status | Priority | Notes |
|--------|------------|--------|----------|-------|
| Transactions | 3 | KEEP | P1 | Core functionality |
| Permissions | 4-5 | MIXED | P1 | Scoped roles new, old roles legacy |
| Organizations | 6 | KEEP | P1 | Core functionality |
| Fiscal | 7 | KEEP | P2 | Important but stable |
| Inventory | 5-6 | KEEP | P2 | Stable domain |
| Audit & Logging | 4 | KEEP | P3 | Support functionality |
| Rate Limiting | 2 | KEEP | P3 | Performance |
| Access Control | 2-3 | REVIEW | P2 | May have duplicates |
| Reporting | 3-4 | REVIEW | P2 | May have duplicates |
| Utility | 3 | REVIEW | P3 | May have legacy items |
| User Profiles | 2-3 | REVIEW | P2 | May have duplicates |

---

## Consolidation Recommendations

### Phase 1 Actions (Audit - Current)
- [x] Create comprehensive table inventory
- [x] Categorize tables by domain
- [ ] Run audit_all_tables.sql to get exact counts and activity
- [ ] Identify legacy/inactive tables
- [ ] Document all foreign key relationships

### Phase 2 Actions (Planning)
- [ ] Create dependency map
- [ ] Identify duplicate tables
- [ ] Plan service consolidation
- [ ] Create migration strategy

### Phase 3 Actions (Execution)
- [ ] Backup all data
- [ ] Migrate legacy data
- [ ] Drop old tables
- [ ] Update services

---

## Next Steps

1. **Execute audit_all_tables.sql** against production database
2. **Analyze results** to identify:
   - Exact row counts
   - Last activity dates
   - Foreign key relationships
   - Duplicate structures
3. **Create detailed dependency map** (Task 1.2)
4. **Identify consolidation candidates** (Task 1.3)
5. **Audit service files** (Task 1.4)
6. **Create consolidation roadmap** (Task 1.5)

---

## Key Findings (To be Updated)

### Potential Duplicates to Investigate
- `audit_logs` vs `audit_log` - Check if these are duplicates
- Old `user_roles` vs new `org_roles`/`project_roles`/`system_roles` - Scoped roles migration
- Multiple permission tables - Consolidate to single permission service

### Legacy Tables to Consider Removing
- Any tables with no activity in 90+ days
- Any tables with no foreign key references
- Any tables with duplicate structure to newer tables

### Service Consolidation Opportunities
- Transaction services (8 variants) → 1 unified service
- Permission services (3-4 variants) → 1 unified service
- Organization services (3 variants) → 1 unified service
- Report services (multiple) → 1 unified service

---

## Audit Execution Instructions

To get complete audit data:

```bash
# Connect to Supabase database
psql postgresql://[user]:[password]@[host]/[database]

# Run the audit script
\i sql/audit_all_tables.sql

# Export results to CSV for analysis
\copy (SELECT * FROM audit_results) TO 'audit_results.csv' WITH CSV HEADER
```

---

## Document Version
- **Version**: 1.0
- **Date**: 2026-01-27
- **Status**: DRAFT - Awaiting audit script execution
- **Next Review**: After audit_all_tables.sql execution
