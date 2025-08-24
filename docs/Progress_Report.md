# Accounting System Integration Progress Report

Date: 2025-08-23

## Scope and goals
- Introduced a single-line transaction entry flow in the current app with reliable posting, permissions, and reporting.
- Ensured the Transactions page aligns with your Accounts Tree UI and integrates with your existing permissions model and Supabase backend.
- Added guardrails for data integrity, observability, and a path toward proper accounting (ledger + trial balance).

---

## What’s in place now

### 1) Database and security

#### Transactions schema (minimal, single-row model)
- Fields: `entry_number`, `entry_date`, `description`, `reference_number`, `debit_account_id`, `credit_account_id`, `amount`, `notes`, `is_posted`, `posted_by`, `posted_at`, `created_by`, timestamps.

#### RLS and permissions
- Permissions catalog and `has_permission(user, name)` helper supporting both direct and role-derived grants.
- RLS policies on `public.transactions`:
  - Select: all authenticated.
  - Insert: requires `transactions.create`.
  - Update: by creator on unposted with `transactions.update`, or `transactions.manage`.
  - Delete: by creator on unposted with `transactions.delete`, or `transactions.manage`.
- `post_transaction` RPC guarded by `transactions.post`.

#### Audit
- `public.transaction_audit` table + trigger logs `create/update/delete/post` with actor and details.

#### Telemetry
- `public.client_error_logs` table to capture client-side failures with `user_id`, `context`, `message`, `extra`.

### 2) Backend services (Supabase client)
- `src/services/transactions.ts`:
  - `getTransactions` with server-side pagination, filtering, and exact count.
    - Filters: search (entry_number, description, reference_number, notes), date range, amount range, debit/credit account, scope (my/all), pendingOnly.
  - CRUD: `createTransaction`, `updateTransaction`, `deleteTransaction`.
  - `postTransaction` via RPC `post_transaction`.
  - `getAccounts` (active accounts, includes `is_postable`).
  - `getTransactionAudit`, `getUserDisplayMap` for name resolution.
- `src/services/telemetry.ts`:
  - `logClientError(context, message, extra)` inserts into `client_error_logs` with current user id.

### 3) Frontend: Transactions page
- File: `src/pages/Transactions/Transactions.tsx`
- Features:
  - Single-row entry modal with MUI Autocomplete for debit/credit accounts.
  - Server-side pagination and filtering (date, amount, posted/unposted, account filters, search) with exact count.
  - Export enriched with account labels and metadata.
  - Posting (pending view) and deletion with permissions.
  - Edit with form modal and permission checks.
  - Optimistic UX for create, post, and delete with rollback + detailed toasts.
  - Diagnostic panel showing effective permissions (toggle).
  - Admin logs viewer as a modal submenu button “سجل الأخطاء” (requires `transactions.manage`).
- UI/UX consistency:
  - `Transactions.css` aligned with AccountsTree theme: header, controls, table, buttons, modal.
  - `PermissionBadge` component for diagnostics.
  - `WithPermission` wrapper for gating actions and hiding restricted actions.

### 4) Admin/Diagnostics
- Permission and diagnostics:
  - `useHasPermission` hook aggregates role and direct grants.
  - `WithPermission` wrapper simplifies gating UI by permission keys.
  - `PermissionBadge` chips for diagnostics panel.
- Client error logs viewer:
  - `src/pages/admin/ClientErrorLogs.tsx`:
    - Search and date filters, server-side pagination, table view, gated with `transactions.manage`.
  - Mounted as modal submenu from Transactions header (no separate route required yet).

### 5) Accounting integrity
- Stronger sync guarantees:
  - DB-level validation for postable/active accounts and positive amounts.
  - Snapshot account labels on post to preserve historical names after renames.
- Ledger and trial balance:
  - Double-entry insertion at post time (two rows per transaction) into `public.ledger_entries`.
  - `public.v_trial_balance` (all-time totals).
  - `public.trial_balance_range(p_from, p_to)` to compute opening, period debit/credit, and closing per account.

---

## Migrations added (in order)
1. `006_transactions_permissions_rls.sql`
   - Permissions/roles tables if missing, permissions insert with dynamic schema compatibility (`name_ar`, `resource`, `action`).
   - `has_permission` function.
   - RLS policies on `public.transactions`.
   - `post_transaction` RPC, `transaction_audit` table and trigger.
   - Fixes for policy syntax and `permission_id` return type (schema-agnostic).
2. `007_client_error_logs.sql`
   - `client_error_logs` table and indexes.
3. `008_stronger_sync_accounts_transactions.sql`
   - Validation trigger: different accounts, both postable and active; amount > 0.
   - Snapshot columns on `transactions` for account code/name at post time.
   - `post_transaction` updated to snapshot labels.
4. `009_general_ledger.sql`
   - `ledger_entries` (double-entry lines) + indexes.
   - `v_trial_balance` view (all-time totals).
   - `post_transaction` extended to write debit/credit lines and audit.
5. `010_fix_ledger_for_single_row_entry.sql`
   - Dropped unique index on `ledger_entries(transaction_id)` to allow two rows per single-row transaction.
6. `011_trial_balance_range.sql`
   - `trial_balance_range(p_from, p_to)` function for date-ranged trial balance.
   - Preserved `v_trial_balance` for all-time totals.

---

## QA checklist
- Apply migrations in order (006 → 007 → 008 → 009 → 010 → 011) without errors.
- Permissions:
  - User without perms can view but not create/update/delete/post.
  - `transactions.create` enables creating in “My” view.
  - `transactions.update/delete` work for creator on unposted rows.
  - `transactions.post` enables posting from “Pending”.
  - `transactions.manage` enables managing all unposted and shows “سجل الأخطاء”.
- Transactions UI:
  - Filters and pagination work with correct totals.
  - Autocomplete pickers show only postable accounts; inactive accounts hidden for new entries.
  - Export shows accurate labels and metadata.
- Posting:
  - `is_posted`, `posted_by`, `posted_at` set; two `ledger_entries` rows created.
  - Snapshot columns populated on posted transactions.
- Trial balance:
  - `v_trial_balance` shows cumulative totals.
  - `trial_balance_range(from, to)` returns opening, period debit/credit, closing accurately on test data.
- Telemetry & diagnostics:
  - Client errors produce rows in `client_error_logs`.
  - Admin viewer displays and filters logs.

---

## Operational notes
- RLS is enabled on `transactions`; ensure user roles/permissions are seeded and assigned.
- Validation triggers block non-postable/inactive accounts at DB level, complementing client filters.
- Posting idempotency: function checks existing ledger rows before insert.
- Snapshot labels preserve historical readability when accounts are renamed later.

---

## Known limitations
- Single-row transactions only (one debit, one credit). Multi-line journals would require schema changes (transaction lines table and posting refactor).
- Reports compute from ledger on-the-fly; at large scale consider materialized views or pre-aggregations.
- Account renames allowed; snapshots protect history but no lock on changes.
- No period lock system yet; users can post to any date unless restricted.

---

## Recommended next steps

### UI/Reports
- Trial Balance UI page with date range and export.
- Ledger/Account Activity page with account picker, date range, and text search.

### Data integrity & workflows
- Period lock model (e.g., `periods` table with open/closed flags) and enforcement in `post_transaction`.
- Optional approval workflow (pending → approved → posted) with distinct permissions.

### Performance & DX
- Additional indexes based on real filter usage.
- Materialized views for heavy reporting windows (e.g., monthly TB), with refresh jobs.

### Testing & monitoring
- Unit/integration tests for posting, RLS, and validation triggers.
- Admin dashboard cards (recent postings, TB snapshot, errors over time).

### Security hardening
- Granular permissions (view-only, export, admin diagnostics).
- RLS on `client_error_logs` (e.g., readable by `transactions.manage` or service role only).

---

## Deployment guide
1. Run migrations 006 → 011 in order.
2. Seed roles and permissions; assign `user_roles` to target users.
3. Restart frontend; verify:
   - Permissions diagnostics, Transactions flows.
   - Posting → ledger rows.
   - Trial balance function results.
   - Telemetry logging and admin viewer access.

### Roll-back plan
- Temporarily revoke or rename `post_transaction` if needed.
- Drop newly introduced objects (e.g., `ledger_entries`, `v_trial_balance`, `trial_balance_range`) if causing issues.
- Grant `transactions.manage` temporarily to admins during incident triage.

---

## Short usage snippets

Trial balance (current month):
```sql
select *
from public.trial_balance_range(date_trunc('month', now())::date, now()::date);
```

Trial balance (custom range):
```sql
select *
from public.trial_balance_range('2025-01-01', '2025-03-31');
```

Ledger for an account:
```sql
select *
from public.ledger_entries
where account_id = '{{ACCOUNT_ID}}'
order by entry_date desc;
```

---

## Appendix: Key files
- Frontend
  - `src/pages/Transactions/Transactions.tsx` (server-side filters, optimistic UX, posting, submenu for logs)
  - `src/pages/Transactions/Transactions.css` (theming aligned with AccountsTree)
  - `src/components/Common/PermissionBadge.tsx`
  - `src/components/Common/withPermission.tsx`
  - `src/pages/admin/ClientErrorLogs.tsx`
- Backend services
  - `src/services/transactions.ts`
  - `src/services/telemetry.ts`
- Migrations
  - `src/database/migrations/006_transactions_permissions_rls.sql`
  - `src/database/migrations/007_client_error_logs.sql`
  - `src/database/migrations/008_stronger_sync_accounts_transactions.sql`
  - `src/database/migrations/009_general_ledger.sql`
  - `src/database/migrations/010_fix_ledger_for_single_row_entry.sql`
  - `src/database/migrations/011_trial_balance_range.sql`

