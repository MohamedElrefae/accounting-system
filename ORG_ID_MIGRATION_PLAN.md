# Organization ID Migration Plan
## Adding org_id Columns for Consistent Multi-Tenant Isolation

**Date**: December 19, 2025  
**Status**: 🔄 In Progress

---

## Overview

This plan outlines the steps to add `org_id` columns to 11 tables that currently lack organization isolation, followed by UI/service updates and RLS policy deployment.

---

## Phase 1: Database Schema Migration ✅

**File**: `supabase/migrations/20251219_add_org_id_columns.sql`

### Tables to Modify

| Table | Parent Table for org_id | Status |
|-------|------------------------|--------|
| `approval_actions` | `approval_requests.org_id` | 🔄 Pending |
| `approval_steps` | `approval_workflows.org_id` | 🔄 Pending |
| `document_associations` | `documents.org_id` | 🔄 Pending |
| `document_versions` | `documents.org_id` | 🔄 Pending |
| `purchase_invoice_status_history` | `purchase_invoices.org_id` | 🔄 Pending |
| `transaction_audit` | `transactions.org_id` | 🔄 Pending |
| `transaction_line_reviews` | `transaction_lines.org_id` | 🔄 Pending |
| `report_datasets` | NULL (system-wide) or org-specific | 🔄 Pending |
| `report_execution_logs` | `report_definitions.org_id` | 🔄 Pending |
| `account_prefix_map` | NULL (system-wide) or org-specific | 🔄 Pending |
| `approved_emails` | NULL (system-wide) or org-specific | 🔄 Pending |

### Execution Steps

1. **Backup database** before running migration
2. Run `20251219_add_org_id_columns.sql` in Supabase SQL Editor
3. Verify all 11 tables have `org_id` column

---

## Phase 2: UI/Service Updates 🔄

### 2.1 Document Services ✅ COMPLETED

**File**: `src/services/documents.ts`

**Changes Made**:
- ✅ `Document` interface already has `org_id`
- ✅ `DocumentVersion` interface - Added `org_id` field
- ✅ `uploadDocument()` - Now includes `org_id` in version creation
- ✅ `createDocumentVersion()` - Now includes `org_id` in version creation

### 2.2 Reports Service ✅ COMPLETED

**File**: `src/services/reports.ts`

**Changes Made**:
- ✅ `getReportDatasets(orgId?)` - Now filters by org_id OR null (system-wide)

### 2.3 Account Prefix Map Service ✅ COMPLETED

**File**: `src/services/account-prefix-map.ts`

**Changes Made**:
- ✅ `PrefixRule` interface - Added `org_id` field
- ✅ `fetchPrefixRules(orgId?)` - Now filters by org_id OR null (system-wide)
- ✅ Org-specific rules take precedence over system-wide rules

### 2.4 Approval Services ⚠️ HANDLED BY DATABASE

**Note**: Approval actions and steps will get `org_id` populated from parent tables via the database migration. The RPC functions handle org_id internally.

### 2.5 Purchase Invoice Services ⚠️ HANDLED BY DATABASE

**Note**: Status history records will get `org_id` populated from parent invoice via the database migration.

### 2.6 Transaction Audit Services ✅ ALREADY IMPLEMENTED

**Files**:
- `src/services/lineReviewService.ts` - Already fetches `org_id` from `transaction_lines`

**Note**: Transaction audit and line reviews will get `org_id` populated from parent tables via the database migration. RPC functions handle org_id internally.

---

## Phase 3: RLS Policy Deployment 🔄

**File**: `supabase/migrations/20251219_comprehensive_rls_policies.sql`

### Updated RLS Strategy

After adding `org_id` columns, all tables will use consistent isolation:

```sql
-- Standard org_id isolation pattern
CREATE POLICY table_org_access ON table_name
  FOR ALL TO authenticated
  USING (
    public.is_super_admin() 
    OR public.fn_is_org_member(org_id, auth.uid())
    OR org_id IS NULL  -- For system-wide records
  )
  WITH CHECK (
    public.is_super_admin() 
    OR public.fn_is_org_member(org_id, auth.uid())
  );
```

---

## Phase 4: Testing Checklist

### Database Tests
- [ ] All 11 tables have `org_id` column
- [ ] Existing data populated with correct `org_id` from parent tables
- [ ] Foreign key constraints working
- [ ] Indexes created for performance

### Service Tests
- [ ] Document version creation includes `org_id`
- [ ] Report datasets filtered correctly (system + org-specific)
- [ ] Account prefix rules filtered correctly
- [ ] Approval actions/steps include `org_id`
- [ ] Transaction audit includes `org_id`

### RLS Tests
- [ ] Users can only see their organization's data
- [ ] System-wide records (org_id = NULL) visible to all
- [ ] Super admins can see all data
- [ ] Cross-org data leakage prevented

---

## Execution Order

```
1. BACKUP DATABASE
   ↓
2. Run: 20251219_add_org_id_columns.sql
   ↓
3. Verify org_id columns added
   ↓
4. Update UI services (Phase 2)
   ↓
5. Run: 20251219_comprehensive_rls_policies.sql
   ↓
6. Test all functionality
   ↓
7. Monitor for 24 hours
```

---

## Rollback Plan

If issues occur:

```sql
-- Remove org_id columns (EMERGENCY ONLY)
ALTER TABLE approval_actions DROP COLUMN IF EXISTS org_id;
ALTER TABLE approval_steps DROP COLUMN IF EXISTS org_id;
ALTER TABLE document_associations DROP COLUMN IF EXISTS org_id;
ALTER TABLE document_versions DROP COLUMN IF EXISTS org_id;
ALTER TABLE purchase_invoice_status_history DROP COLUMN IF EXISTS org_id;
ALTER TABLE transaction_audit DROP COLUMN IF EXISTS org_id;
ALTER TABLE transaction_line_reviews DROP COLUMN IF EXISTS org_id;
ALTER TABLE report_datasets DROP COLUMN IF EXISTS org_id;
ALTER TABLE report_execution_logs DROP COLUMN IF EXISTS org_id;
ALTER TABLE account_prefix_map DROP COLUMN IF EXISTS org_id;
ALTER TABLE approved_emails DROP COLUMN IF EXISTS org_id;
```

---

## Files Created/Modified

### New Migration Files
- `supabase/migrations/20251219_add_org_id_columns.sql` - Add org_id columns
- `supabase/migrations/20251219_comprehensive_rls_policies.sql` - RLS policies

### Services to Update
- `src/services/documents.ts` - DocumentVersion interface + queries
- `src/services/reports.ts` - org_id filtering
- `src/services/account-prefix-map.ts` - org_id filtering
- `src/services/lineReviewService.ts` - org_id on creation
- `src/services/transactions.ts` - audit org_id

### Types to Update
- `src/types/reports.ts` - Add org_id to ReportDataset, ReportExecutionLog

---

**Next Action**: Run `20251219_add_org_id_columns.sql` in Supabase SQL Editor
