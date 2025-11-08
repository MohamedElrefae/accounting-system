# Implementation Plan: org_id Migration and Unified Multiline Transaction Entry

Date: 2025-10-25
Owner: Agent Mode
Status: In Progress

Goals
- Remove all uses of organization_id across UI, services, and docs; use org_id consistently.
- Keep DB schema unchanged (already uses org_id for transactions).
- Use the current Unified CRUD form; wire Section 2 (transaction lines) to transaction_lines exactly as requested.
- Add confirmation dialog for “Restore Default” with “Don’t ask again”.

Decisions
- Backward compatibility: Remove organization_id everywhere. If any external dependency requires it, add a temporary shim that maps organization_id -> org_id and logs a warning. Default is strict removal.
- Restore Default confirm: Enabled with “Don’t ask again” per-context key (localStorage), default ask = true.

Scope
- Frontend: Transactions.tsx, TransactionFormConfig.tsx, UnifiedTransactionDetailsPanel.tsx, TransactionView.tsx, any services or components referencing organization_id.
- Docs/SQL snippets referencing organization_id updated to org_id to avoid confusion.
- Classification reports: adjust project relation if needed.

Phases
1) Audit and inventory
- Repo-wide grep for organization_id and produce a fix list by category.

2) Frontend fixes (priority)
- Header form: switch field id organization_id -> org_id (preserve existing Unified CRUD use). Ensure initial data, create/update payloads, and display helpers use org_id.
- Transactions.tsx: fix create/update header payloads and initialData; ensure lines editor remains wired to transaction_lines.
- UnifiedTransactionDetailsPanel.tsx: same replacements for initialData and update mapping.
- TransactionView.tsx: remove fallback to organization_id.

3) Confirm dialog for “Restore Default”
- Add confirm + “Don’t ask again” for:
  - Lines layout quick restore (Section 2)
  - Headers table restore
  - Lines table restore
  Keys: txLinesLayout_reset_confirm_suppressed, transactions_table_reset_confirm_suppressed, transactions_lines_table_reset_confirm_suppressed

4) Services and reports
- If any services accept/send organization_id, rename to org_id. Add shim only if strictly necessary.
- Update reports that rely on projects(organization_id) if the projects table uses org_id.

5) Docs/SQL
- Update get_current_schema.sql and transaction_line_items_schema.sql to org_id.

6) QA
- Create header (org_id present) → add lines → balance → save draft → submit → approve → post.
- Negative: missing org_id, XOR amounts, non-postable accounts.
- Multi-tenant: switch orgs; dropdowns reflect org; lines inheritance only org_id and project_id.

Detailed Plan (Phases 0–6)

Phase 0 — Scope & decision points
- Scope: Only use org_id (UUID) everywhere; remove organization_id. No schema changes.
- Decision: Backward-compat mapping (accept organization_id in API for 1 release) — default OFF.
- Deliverables: Fixed create/update paths, strict typing, UI header (8 fields), lines (11 fields), restore-default confirm.

Phase 1 — Repository-wide audit
- Search: organization_id in frontend (ts/tsx), backend (ts/js), SQL (migrations/functions/views), tests, docs.
- Produce an inventory with file paths and exact lines to change; tag each as: FE-payload, FE-type, BE-DTO, BE-SQL, Trigger, View, Test, Doc.

Phase 2 — Backend corrections (API/DB)
- DTOs/types: Replace organization_id with org_id in request/response models; add strict validators requiring org_id on create.
- Controllers/services: Update create/update logic to read org_id; remove any mapping to organization_id. Optional compatibility shim if needed.
- SQL: Verify all INSERT/UPDATE/WHERE use org_id; fix any stragglers in raw SQL or query builders.
- Triggers/functions/views: Scan for NEW.organization_id references; CREATE OR REPLACE to use NEW.org_id; refresh dependent materialized views.
- Error messages: Ensure missing org_id → clear Arabic error; surface DB trigger messages verbatim.

Phase 3 — Frontend corrections (UI/state/services)
- Header form: Constrain to exactly 8 fields (transactions schema): entry_date, description, description_ar, org_id, project_id, reference_number, notes, notes_ar.
- Local defaults: Use only default_org_id and default_project_id; load on New; allow saving these as defaults.
- FE types: Update Transaction, TransactionInput, and form schemas to use org_id (UUID). Remove organization_id everywhere.
- Services: Create/update payloads send org_id; list/detail responses typed with org_id.
- Lines editor: Ensure visible fields = 11; only org_id, project_id inherit from header; show 🔗 when inherited; allow override.
- Filters: Ensure dropdowns are filtered by active org_id (and project where applicable).
- Buttons: Preserve UI cleanup (debug/obsolete removed, “إضافة قيود المعاملة” placement).
- Restore Default confirmation: Confirm + “عدم السؤال مجدداً” stored in localStorage (layout_reset_confirm_suppressed keys).

Phase 4 — Tests & QA
- Backend tests: Create with org_id succeeds; using organization_id fails (or maps per decision). Update, list/filter by org_id; approval/posting unaffected.
- Frontend tests: Header defaults load; create+add lines balanced → save draft enabled; inheritance behavior; layout reset confirm flows (with/without “don’t ask again”).
- Negative tests: Missing org_id; debit+credit both set; account not postable; DB errors surfaced in Arabic.
- Multi-tenant: Switch org_id and verify dropdowns and line defaults update.

Phase 5 — Tooling & reliability
- Lint/typecheck/build: Fix TS/ESLint issues from rename; ensure no organization_id references remain.
- E2E smoke: Full lifecycle (draft → submit → approve → post) with line-level attachments only.

Phase 6 — Rollout
- Migration note: No DB migration; note breaking API change (organization_id removed). If compat shim approved, document deprecation window.
- Docs: Update README/usage and remove organization_id mentions; update unified-multiline-entry document references as needed.
- Monitoring: Log any requests containing organization_id for a short period (if compat shim enabled).

Open confirmations
- Backward compatibility: Strict removal. If an external caller still sends organization_id, enable a temporary shim (map to org_id + warn) behind a flag.
- Restore Default dialog: Proceed with confirm + “don’t ask again” (default ask = true).

Section enforcement & wiring
- Header: 8 editable fields exactly (transactions table): entry_date, description, description_ar, org_id, project_id, reference_number, notes, notes_ar.
- Lines: 11 fields exactly (transaction_lines): account_id, debit_amount, credit_amount, description, org_id, project_id, cost_center_id, work_item_id, analysis_work_item_id, classification_id, sub_tree_id.
- Inheritance: Only org_id and project_id inherit from header; UI shows 🔗 and allows override.
- Use current Unified CRUD form; Section 2 is wired to transaction_lines as the primary multiline editor.

Progress Log
- 2025-10-25 21:25: Created plan file and audited repo with grep.
- Findings to fix:
  - src/pages/Transactions/Transactions.tsx: organization_id used in initial data and payload mapping.
  - src/components/Transactions/TransactionFormConfig.tsx: field id organization_id and dependsOnAny; optionsProvider reads form.organization_id.
  - src/components/Transactions/UnifiedTransactionDetailsPanel.tsx: initialData and update mapping use organization_id.
  - src/pages/Transactions/TransactionView.tsx: AttachDocumentsPanel fallback to organization_id.
  - Docs/SQL: get_current_schema.sql and database-queries/transaction_line_items_schema.sql reference organization_id.
  - Reports: classification-report.ts relates projects(organization_id).

- 2025-10-25 21:32: Implemented FE replacements to org_id in:
  - src/components/Transactions/TransactionFormConfig.tsx (field id and dependencies)
  - src/pages/Transactions/Transactions.tsx (initialData and payload mappings)
  - src/components/Transactions/UnifiedTransactionDetailsPanel.tsx (initialData and payload mappings)
  - src/pages/Transactions/TransactionView.tsx (removed organization_id fallback)
- 2025-10-25 21:34: Added “Restore Default” confirmations with suppression for:
  - Headers table (transactions_table_reset_confirm_suppressed)
  - Lines table (transactions_lines_table_reset_confirm_suppressed)
  - Lines layout quick restore (txLinesLayout_reset_confirm_suppressed)
- 2025-10-25 21:36: Updated docs/SQL and reports:
  - get_current_schema.sql: organization_id -> org_id
  - database-queries/transaction_line_items_schema.sql: organization_id -> org_id
  - classification-report.ts: projects(organization_id) -> projects(org_id) and related filters
- 2025-10-25 21:44: Enforced header = 8 fields (added description_ar, notes_ar; hid non-header fields) and wired edits to persist description_ar/notes_ar.
- 2025-10-25 21:46: Strict removal applied to projects service (no organization_id alias). Updated migration view to drop legacy organization_id column.

Checklist
- [x] Replace organization_id -> org_id in header form config and data flow
- [x] Fix create/update header payloads to use org_id
- [x] Ensure lines editor remains wired; inherit org_id/project_id only
- [x] Add confirm + “don’t ask again” for restore buttons
- [x] Update docs/SQL and reports references
- [ ] Quick manual QA for create/edit/lines/save

Notes
- Header field set to remain as-is for now (using current Unified CRUD form) but mapped to org_id internally. Further pruning to exact 8 fields can be scheduled after this fix if desired.
