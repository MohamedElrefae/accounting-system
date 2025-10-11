# Opening Balance Import & Validation Plan — Status and Next Steps

This document summarizes what has been implemented for the Opening Balance Import experience (and related validation, reconciliation, and audit trail work), and what is planned for later.

## Overview

Goal: Deliver a smooth, fast workflow for uploading opening balances, validating them (client and server), monitoring job status, reconciling totals, and reviewing an audit trail — with export options and helpful keyboard/UI enhancements.

Scope highlights:
- Opening Balance Import page (upload → map → validate → dry run → import)
- Server-side validation breakdowns with exports
- Job status via realtime + polling fallback
- Reconciliation panel
- Compact audit trail
- Keyboard shortcuts and usability polish

---

## Completed Work (Current State)

### API consistency update (subscribeToImport)
- The OpeningBalanceImportService.subscribeToImport method now accepts only a single params object.
- New signature: subscribeToImport({ importId, onTick }) and returns { unsubscribe() }.
- Rationale: consistent, self-documenting call sites and easier future extensibility.
- Migration: all known call sites have been updated. If you encounter legacy positional usage, refactor to the params object.

1) Opening Balance Import UX
- File upload (Excel/CSV), client-side preview (first 100 rows)
- Column mapping UI (account_code, amount; optional cost_center_code, project_code, currency_code)
- Auto-map from headers; save/apply default mappings; filename-specific mapping persistence
- Client-side Validate + Dry Run (Shift+Enter dry run, Ctrl+Enter validate)
- Issues export (CSV), normalized rows export (CSV/clipboard), preview exports
- Visual row status (OK/Warning/Error) with highlights

2) Keyboard and Wizard
- Shortcuts: Ctrl+Enter (Validate), Shift+Enter (Dry Run)
- Mini wizard guiding Upload → Map → Validate → Dry Run → Export
- Wizard persistence (resume, don’t-show-again)

3) Server-side Validation & Breakdown UI
- Trigger server-side validation (“Validate on Server” button)
- ValidationResults component shows:
  - Totals (count, sum with numeric formatting)
  - Breakdown accordions: By Account, By Project, By Cost Center, and Active Rules
  - CSV/JSON exports for each section
  - Right-aligned numeric columns + formatted totals
  - Click-to-copy IDs (account_id/project_id/cost_center_id)
  - “Open in Account Explorer” icon to navigate with query params
  - Accordion open/close state persisted in localStorage

4) Job Status Integration
- Realtime subscription by importId
- Polling fallback to refresh job status when realtime misses updates

5) Reconciliation & Audit Trail
- Reconciliation panel using PeriodClosingService.getReconciliation(orgId, fiscalYearId, periodId)
- Persists Fiscal Period ID used for reconciliation
- Compact Audit Trail panel (uses import history) with CSV/JSON export
- Tables with right-aligned, formatted counts and clickable IDs (copy-to-clipboard)

6) Build Stability & Fixes
- Production builds pass repeatedly
- Resolved stray JSX/syntax issues and removed unused react-window import

---

## Ready-to-Start Later (Planned Next)

Near-term polish
- Optional navigation from IDs in other tables/pages (beyond ValidationResults) to relevant report routes
- Persist master visibility of the “Server-side breakdowns” section (top-level toggle)
- Add totals footer rows where helpful (e.g., audit/history tables) and ensure consistent numeric formatting
- Unit tests for new UI helpers (copy-to-clipboard, number formatting)

Backend integration follow-ups
- Enrich server-side audit events for opening balance lifecycle (if more detail is available)
- Reconciliation enhancements: currency awareness and segment-level comparisons (per project/cost center) when API supports it
- Approval workflow wiring: submit/approve/reject flows tailored for opening balances

Documentation & QA
- Update user-facing docs for the Opening Balance Import flow (with screenshots)
- Add tests for server validation-triggered workflows and job-status polling

---

## Deferred / Out of Scope (for now)
- Any SQL migrations or backend schema changes (require explicit approval per policy)
- Deep linking into multi-entity drilldowns beyond Account Explorer unless routes are agreed

---

## Verification Checklist

- Build & Run
  - npm run build → succeeds
  - npm run dev → app loads; Opening Balance Import renders
- Opening Balance Import
  - Upload sample CSV/XLSX
  - Auto-map, Validate (Ctrl+Enter), Dry Run (Shift+Enter)
  - Normalize / Issues exports work
  - “Validate on Server” returns data and populates breakdown
- Breakdown UI
  - Accordions toggle and persist state
  - IDs are clickable (copy) and open Account Explorer in a new tab
  - CSV/JSON export buttons work
- Reconciliation & Audit Trail
  - Enter period id and fetch reconciliation values
  - Audit Trail shows recent imports; exports work; counts are formatted

---

## How to Use / Demo Steps

1) Navigate to Fiscal → Opening Balance Import
2) Upload your file (CSV/XLSX), confirm/adjust mapping
3) Press Ctrl+Enter to Validate (client) and Shift+Enter to Dry Run
4) Optionally click “Validate on Server” to view breakdowns
5) Use Reconciliation panel to compare against a fiscal period
6) Review Audit Trail list and export as needed
7) Import when satisfied and watch job status update

---

## Notes & Policy
- SQL execution is gated: any new SQL must be presented in a formatted block and explicitly approved before execution
- Current work achieved UI and service-layer integration without introducing new SQL migrations

Prepared by: Agent Mode
Date: 2025-09-23

---

## Phase 1 Plan (Sequenced; SQL per step with separate verification block)

Last updated Phase 1 plan (sequenced; each step will come with its own SQL + a separate verification SQL block; we will pause for your verification after each)

1) Security helpers and audit trigger foundation
•  Create:
◦  fn_is_org_member(org_id, user_id default auth.uid()): true if user is a member of org_memberships for org_id.
◦  fn_can_manage_fiscal(org_id, user_id default auth.uid()): true if is_super_admin() OR has_permission(user_id,'transactions.manage') AND user is a member of org.
◦  tg_set_audit_fields(): before insert/update trigger to set created_at/updated_at and created_by/updated_by on new tables.
•  Reason: consistent isolation and write gating across all new tables.

2) New schema: fiscal_years (RLS enabled)
•  Columns: id, org_id FK, year_number, name_en/name_ar, description_en/description_ar, start_date, end_date, status(draft|active|closed|archived), is_current, closed_at/closed_by, created_by/updated_by, created_at/updated_at.
•  Constraints: unique(org_id, year_number), start_date ≤ end_date.
•  Indexes: (org_id, status, is_current), (org_id, year_number).
•  RLS: SELECT for org members; INSERT/UPDATE/DELETE require fn_can_manage_fiscal.
•  Trigger: tg_set_audit_fields.

3) New schema: fiscal_periods (RLS enabled)
•  Columns: id, org_id, fiscal_year_id FK, period_number (1..24), period_code (e.g., YYYY-MM), name_en/name_ar, description_en/description_ar, start_date, end_date, status(open|locked|closed), is_current, closing_notes, closed_at/closed_by, created_by/updated_by, created_at/updated_at.
•  Constraints: unique(org_id, fiscal_year_id, period_number), start_date ≤ end_date, period range within parent fiscal_years.
•  Indexes: (org_id, fiscal_year_id, status), (org_id, is_current), (fiscal_year_id, period_number).
•  RLS: same pattern as fiscal_years.
•  Trigger: tg_set_audit_fields.

4) New schema: period_closing_checklists (RLS enabled)
•  Columns: id, org_id, fiscal_year_id, fiscal_period_id, name_en/name_ar, description_en/description_ar, status(pending|in_progress|completed), items jsonb default [], created_by/updated_by, created_at/updated_at.
•  Constraints: unique(org_id, fiscal_period_id, name_en).
•  Indexes: (org_id, fiscal_period_id, status).
•  RLS: SELECT org members; write via fn_can_manage_fiscal.
•  Trigger: tg_set_audit_fields.

5) New schema: opening_balance_imports (RLS enabled)
•  Job tracker: id, org_id, fiscal_year_id, source, source_file_url, metadata jsonb, status(pending|processing|completed|failed|partially_completed), totals and error_report jsonb, audit fields.
•  Indexes: (org_id, fiscal_year_id, status), (created_at desc).
•  RLS + Trigger as above.

6) New schema: opening_balances (RLS enabled)
•  id, org_id, fiscal_year_id, account_id, project_id?, cost_center_id?, amount numeric(20,4), currency_code?, import_id?, is_locked default false, audit fields.
•  Uniqueness: one row per (org_id, fiscal_year_id, account_id, project_id?, cost_center_id?).
•  Indexes: (org_id, fiscal_year_id), (org_id, account_id), (org_id, project_id), (org_id, cost_center_id), (org_id, is_locked).
•  RLS + Trigger as above.

7) New schema: opening_balance_validation_rules (RLS enabled)
•  id, org_id, rule_code unique per org, name_en/name_ar, description_en/description_ar, severity(info|warning|error), validation_expression (controlled), active, audit fields.
•  Indexes: (org_id, active), (org_id, rule_code).
•  RLS + Trigger as above.

8) New schema: balance_reconciliations (RLS enabled)
•  id, org_id, fiscal_year_id, fiscal_period_id?, as_of_date, gl_total, opening_total, difference, status(pending|balanced|out_of_balance), notes_en/notes_ar, audit fields.
•  Indexes: (org_id, fiscal_year_id, status), (org_id, as_of_date desc).
•  RLS + Trigger as above.

9) Functions (business logic)
•  create_fiscal_year(org_id, year_number, start_date, end_date, user_id, create_monthly_periods): inserts year, optionally generates periods; RLS-friendly.
•  close_fiscal_period(period_id, user_id, closing_notes): validates and closes period; updates checklist; RLS-friendly.
•  validate_opening_balances(org_id, fiscal_year_id) returns jsonb.
•  validate_construction_opening_balances(org_id, fiscal_year_id) returns jsonb.
•  import_opening_balances(org_id, fiscal_year_id, import_data jsonb, user_id) returns import_id: upsert rows, accumulate results, run validation.

10) Audit and approvals wiring
•  fn_emit_audit_event(actor_id, org_id, entity_type, entity_id, action, metadata) → inserts into audit_logs using discovered columns.
•  fn_create_approval_request(...) → inserts into approval_requests (no RLS currently) or coordinates with approval_workflows.
•  Hook these into the business functions.

11) Grants and hardening
•  EXECUTE on all new functions to authenticated and service_role; avoid anon unless necessary.
•  Minimal policies (no dependence on debug_*) and optional lock protections on opening_balances.

12) Migrations mirroring
•  After each step is verified in Supabase, we’ll add the corresponding migration files into supabase/migrations with incremental timestamps.

Policy reminder: For every step above, I will present the SQL in a properly formatted block, then pause for your verification before continuing.
