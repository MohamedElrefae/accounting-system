# GL2 Migration Summary: Single-Line to Multi-Line Journals

This document summarizes the end-to-end plan, the work completed, and remaining tasks for migrating from legacy single-line transactions to the GL2 multi-line general ledger model. It is structured for programmatic consumption by automation/AI agents.


## 1. Overview
- Objective: Replace legacy single-line transactions with a robust multi-line GL model (GL2) while keeping the app operational during migration using side-by-side schema and compatibility views.
- Strategy: Build GL2 alongside legacy, introduce feature flags and compatibility views, progressively route reads and writes to GL2, and provide UI to manage lifecycle (post/void/reverse).


## 2. Goals and Non-Goals
- Goals
  - Multi-line journal entries with enforced balance and immutability after posting
  - Row-Level Security (RLS) aligned to existing org membership
  - End-to-end CRUD via security-definer RPCs (create, post, void, reverse)
  - Backward-compatible read interfaces via views and services
  - UI support: list, details, actions, export, and runtime toggles
- Non-Goals (for this phase)
  - Historical backfill of all legacy transactions
  - Full deprecation of legacy write path (kept behind flags)


## 3. Target Architecture (High-Level)
- Schema: gl2 (journal_entries, journal_lines, journal_line_dimensions)
- Access Control: RLS via org memberships
- Views: legacy_compat for internal compat; public wrapper views for REST
- RPCs: api_create_journal, api_post_journal, api_void_journal, api_reverse_journal
- Feature Flags: READ_MODE, WRITE_MODE (runtime override supported)
- App Layers: Updated service layer and UI pages (GL2 list, details drawer, pilot/full integration)


## 4. Database Changes (DDL + Security)
- gl2 schema created with:
  - journal_entries: header fields (id, org_id, number, doc_type, doc_date, posting_date, status, description, etc.)
  - journal_lines: multi-line accounts with debit/credit amounts
  - journal_line_dimensions: extensible line-level dimension pairs (dimension_key, dimension_value)
- Constraints
  - Enforced journal balance on post
  - Immutability for posted journals
- RLS
  - Policies implemented using existing org_memberships for visibility and actions
- Reference Data
  - Seeded example entities (organization, branch, project) and minimal lean chart of accounts


## 5. Public and Compatibility Views
- legacy_compat views
  - v_journals_single_line (and posted variant)
  - v_journals_collapsed (collapsed multi-line)
- public views for REST (wrappers over legacy_compat)
  - public.v_gl2_journals_single_line_all (journal_id, number, doc_date, posting_date, debit_account_code, credit_account_code, amount, status)
  - public.v_gl2_journals_collapsed (journal_id, number, doc_date, posting_date, total_debits, total_credits, debit_account_code, credit_account_code, status)
- Enriched view
  - v_gl2_journals_enriched with effective_date and first-line dimensions for filtering


## 6. RPCs (Security-Definer Functions)
- api_create_journal
  - Inserts a draft journal with lines
  - Accepts per-line dimensions; resolves codes to UUIDs (project, cost center, work item, analysis work item, classification, expenses category)
  - Input payload: { p_org_id, p_number, p_doc_type, p_doc_date, p_description?, p_source_module?, p_source_ref_id?, p_entity_code?, p_lines: [{ account_code, debit_base, credit_base, description?, dimensions? }] }
- api_post_journal
  - Posts a draft journal (sets posting_date, locks lines)
  - Input payload: { p_journal_id, p_posting_date }
- api_void_journal
  - Sets status to voided, prevents posting
  - Input payload: { p_journal_id }
- api_reverse_journal
  - Creates a reversing journal with opposite signs, copies dimensions
  - Input payload: { p_journal_id, p_reverse_date }


## 7. Feature Flags
- File: src/config/featureFlags.ts
- READ_MODE: 'legacy' | 'gl2_single_line' | 'gl2_collapsed'
- WRITE_MODE: 'legacy' | 'gl2'
- Runtime overrides supported via window.__READ_MODE_OVERRIDE and window.__WRITE_MODE_OVERRIDE


## 8. Service Layer Changes (src/services/transactions.ts)
- getTransactions: In GL2 read mode, routes to v_gl2_journals_enriched, maps records to legacy shape, and applies filters:
  - search, date range (effective_date), amount, orgId, approvalStatus
  - line-level dimensions: classificationId, expensesCategoryId, workItemId, analysisWorkItemId, costCenterId, projectId
- createJournalUnified: calls api_create_journal with lines and dimensions
- postJournalUnified, voidJournalGL2, reverseJournalGL2: call respective RPCs
- getGL2JournalDetails: fetches header, lines, and dimensions


## 9. UI Changes
- GL2 Journals Pages
  - src/pages/Transactions/Gl2Journals.tsx: lists GL2 journals (single-line preferred, fallback to collapsed); CSV export; runtime mode toggle
  - src/pages/Transactions/TransactionsGL2.tsx: forces GL2 read mode while reusing the Full Transactions view; fixed missing useEffect import
- Details Drawer
  - src/pages/Transactions/Gl2DetailsDrawer.tsx: shows header, lines, and dimensions; actions: Post, Void, Reverse (backed by RPCs)
- Full Transactions Page
  - src/pages/Transactions/Transactions.tsx: added runtime GL2/Legacy toggle; wired entry number click in GL2 mode to open the GL2 details drawer; existing ExportButtons enable XLSX export
- Create Journal Page (GL2)
  - src/pages/Transactions/CreateJournalGL2.tsx: draft creation with line-level dimensions and optional code inputs (resolved server-side)
- Common Components added/polished
  - src/components/Common/AsyncAutocomplete.tsx: async select with debounce, keyboard nav, clear, loader
  - src/components/Common/DraggableResizableDialog.tsx: draggable by title, resizable from bottom-right, persists size/position


## 10. Data Seeding and Testing
- Seeded minimal entities and a lean chart of accounts (construction-oriented)
- Verified end-to-end by creating, inserting lines, and posting balanced journal entries
- Fixed UUID aggregation error by swapping to scalar subqueries for account lookup


## 11. Migration and Rollout Plan
- Phase 1: Side-by-side GL2 schema, RPCs, and views — COMPLETE
- Phase 2: Read-only pilot in UI via feature flags — COMPLETE
- Phase 3: Add lifecycle actions (post/void/reverse) — COMPLETE
- Phase 4: Write APIs + UI to create journals with dimensions — COMPLETE
- Phase 5: Full-page integration (toggleable read mode), exports — COMPLETE
- Phase 6: Broaden filters and ensure enriched view supports all UI filters — COMPLETE
- Phase 7: Validation & acceptance
  - Data verification scripts and smoke tests — PENDING
  - Performance tuning and indexes — PENDING (based on usage)
- Phase 8: Decommission legacy write path (optional) — PENDING


## 12. Verification Procedures
- SQL checks
  - Create a draft via api_create_journal; verify journal_entries and journal_lines
  - Post via api_post_journal; verify status and that lines are locked
  - Reverse and void via respective RPCs; verify status
- REST/view checks (Supabase)
  - Ensure public.v_gl2_journals_single_line_all and public.v_gl2_journals_collapsed exist with expected columns
  - If REST returns 404 after changes, run: `notify pgrst, 'reload schema';`
- UI checks
  - Toggle read mode on Full Transactions page; confirm GL2 data appears
  - Click entry number in GL2 mode; the details drawer opens and supports Post/Void/Reverse
  - Export XLSX via ExportButtons


## 13. Known Issues and Fixes Applied
- RLS helper referencing missing active_org_id — Fixed by using org_memberships
- PostgreSQL MAX on UUID — Fixed by switching to scalar subselects
- useEffect not imported — Fixed in TransactionsGL2.tsx
- Vite build missing components — Added minimal AsyncAutocomplete and DraggableResizableDialog, later polished
- REST 404 on public.public.view — Fixed by unqualifying table names in the frontend calls and re-creating public views with exact columns


## 14. Pending Work (Actionable TODOs)
- Views/REST
  - Confirm public views exist with expected columns and grants; if changed, run `notify pgrst, 'reload schema'`
- Performance
  - Add indexes on gl2.journal_entries(status, posting_date, org_id) and on common dimensions in journal_line_dimensions
- Validation/Testing
  - Add smoke tests for RPCs and UI flows (create/post/void/reverse)
  - Add data validation scripts for balance per period
- UX Enhancements (optional)
  - Banner indicator and one-click toggle for GL2 read mode on the Full page
  - Make entire GL2 rows clickable to open the details drawer
  - Persist read mode override in localStorage
- Decommissioning
  - Decide on legacy write path retirement timeline and a final cutover plan


## 15. Rollback Plan
- App: Switch READ_MODE and WRITE_MODE to 'legacy' via feature flags (and clear runtime overrides)
- DB: Keep GL2 schema intact; no destructive rollback needed. If a view change caused issues, revert to prior definition (version in VCS)


## 16. Object Inventory (Reference)
- Schemas: gl2, legacy_compat, public
- Tables: gl2.journal_entries, gl2.journal_lines, gl2.journal_line_dimensions
- Views: 
  - legacy_compat.v_journals_single_line, legacy_compat.v_journals_single_line_posted
  - legacy_compat.v_journals_collapsed
  - public.v_gl2_journals_single_line_all, public.v_gl2_journals_collapsed
  - v_gl2_journals_enriched (with effective_date and dimension columns for filters)
- RPCs:
  - api_create_journal, api_post_journal, api_void_journal, api_reverse_journal
- Feature Flags:
  - READ_MODE, WRITE_MODE, with runtime overrides
- UI:
  - src/pages/Transactions/Gl2Journals.tsx (pilot list), src/pages/Transactions/TransactionsGL2.tsx (full-page mode)
  - src/pages/Transactions/Gl2DetailsDrawer.tsx (details + actions)
  - src/pages/Transactions/Transactions.tsx (Full page with toggle + export)


## 17. Operational Notes
- Schema cache: After creating/replacing views or grants, always run `notify pgrst, 'reload schema'` to avoid REST 404s.
- RLS: Ensure org_memberships are accurate for the acting user/service role to insert/post journals.


---
Last updated: <AUTO>
