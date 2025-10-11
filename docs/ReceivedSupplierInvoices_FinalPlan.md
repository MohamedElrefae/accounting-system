# Received Supplier Invoices – Final Plan (Frozen Scope)

This document describes the new “Receive Supplier Invoices” capability to be implemented in your accounting-system. It is intended for client review and approval prior to any execution of schema changes or code implementation. All steps will follow the STOP POINT policy: every SQL step will be provided separately and must be executed and verified before proceeding.


## 1. Executive summary
- Introduce a new module to capture and manage received supplier invoices (purchase invoices) using your Unified CRUD pattern.
- Create a draft GL transaction immediately upon invoice creation, keep it in sync while the invoice is in draft/submitted state, and post upon approval (respecting company_config.auto_post_on_approve).
- VAT handling enabled using company-level configuration; optional retentions supported.
- Supplier selection from the 2110 Suppliers subtree in the accounts tree. Header also carries Sub Tree account; line items carry sub_tree_id for expense mapping.
- Full integration with approvals, documents/attachments, inventory materials catalog, exports, and supplier statements/AP aging through GL.
- UI implemented with UnifiedCRUDForm, themed via tokens, no inline styles or inline constants.


## 2. Scope
In scope
- Database tables: purchase_invoices, purchase_invoice_lines, supporting enum and constraints.
- Draft GL build and final posting functions using transactions and transaction_line_items, linked via transactions.source_module='purchase_invoices' and transactions.source_reference_id=<invoice_id>.
- VAT configuration via company_config (add default_tax_rate, input_vat_account_id) and optional retention mapping (retentions_payable_account_id).
- Approval workflow integration using approval_requests/approval_steps.
- Attachments via documents and document_versions.
- UI pages: list, create/edit, view; line grid; materials and supplier pickers; attachments; approvals panel; exports and print.
- Reporting alignment so posted invoices flow into supplier statements and AP aging.

Out of scope (for this phase)
- Payments/settlements processing.
- Complex multi-tax or WHT certificates beyond a single VAT scheme.
- Landed cost allocations.


## 3. Architecture overview
- Persistence: PostgreSQL (public schema; inventory assets in public per environment data).
- GL linkage: transactions (header), transaction_line_items (details), using source_module and source_reference_id for traceability.
- Approvals: approval_requests and approval_steps.
- Documents: documents and document_versions.
- Inventory catalogs: materials and uoms in public schema.
- Theming/UI: UnifiedCRUDForm; tokenized theme; no inline styles.


## 4. Data model
### 4.1 Enum
- public.purchase_invoice_status: draft, submitted, approved, posted, rejected, changes_requested.

### 4.2 Tables
- public.purchase_invoices (header)
  - id (uuid, PK)
  - org_id (uuid, FK organizations.id)
  - supplier_account_id (uuid, FK accounts.id) — must belong to 2110 subtree
  - supplier_sub_tree_id (uuid, FK sub_tree.id) — header-level expense group
  - invoice_number_int (text, required) — internal PI-YYYYMM-####
  - invoice_number_ext (text, required) — vendor’s invoice number
  - invoice_date (date)
  - due_date (date, nullable)
  - currency_code (text)
  - exchange_rate (numeric(18,6), default 1)
  - project_id (uuid, nullable)
  - cost_center_id (uuid, nullable)
  - reference_no (text, nullable)
  - notes (text, nullable)
  - retention_percent (numeric(7,4), nullable)
  - retention_amount (numeric(18,6), nullable)
  - tax_scheme_id (uuid, nullable)
  - subtotal_amount, discount_total, tax_total, retention_total, grand_total, amount_due (numeric(18,6))
  - status (purchase_invoice_status, default 'draft')
  - approval_request_id (uuid, nullable)
  - gl_transaction_id (uuid, nullable)
  - gl_draft_transaction_id (uuid, nullable)
  - posted_at, posted_by (nullable)
  - supplier_name_snapshot (text, nullable)
  - is_deleted (boolean, default false)
  - created_at/by, updated_at/by

  Constraints and indexes
  - Unique (org_id, invoice_number_int)
  - Unique (org_id, supplier_account_id, invoice_number_ext)
  - Index (org_id, status, invoice_date)
  - Index (org_id, supplier_account_id)

- public.purchase_invoice_lines (details)
  - id (uuid, PK)
  - org_id (uuid, FK organizations.id)
  - invoice_id (uuid, FK purchase_invoices.id, on delete cascade)
  - line_no (int)
  - material_id (uuid, FK materials.id, nullable)
  - item_name (text, nullable)
  - quantity (numeric(18,6), default 1)
  - unit_of_measure (text, nullable)
  - percentage (numeric(9,6), nullable)
  - unit_price (numeric(18,6), default 0)
  - discount_amount (numeric(18,6), default 0)
  - tax_amount (numeric(18,6), default 0)
  - sub_tree_id (uuid, FK sub_tree.id) — expense mapping
  - analysis_work_item_id (uuid, nullable)
  - cost_center_id (uuid, nullable)
  - project_id (uuid, nullable)
  - retention_percent (numeric(7,4), nullable)
  - retention_amount (numeric(18,6), nullable)
  - line_subtotal (numeric(18,6), default 0)
  - line_total (numeric(18,6), default 0)
  - sort_key (int, default 0)
  - created_at/by, updated_at/by

  Constraints and indexes
  - Unique (invoice_id, line_no)
  - Index (invoice_id)
  - Index (org_id, material_id)


## 5. Numbering
- Internal invoice_number_int format: PI-YYYYMM-####.
- Monthly sequence per org. Generated server-side at insert (retry on collision).
- Once assigned, never changes when invoice_date is edited (audit stability).


## 6. VAT & retentions
- VAT enabled; tax rate sourced from company_config.default_tax_rate.
- Input VAT account mapping in company_config.input_vat_account_id (1245 in environment).
- Optional retentions: header-level or per-line; retentions payable mapping in company_config.retentions_payable_account_id (2140 in environment).
- Rounding: store high precision; post rounded to 2 decimals; if needed, create rounding difference GL line.


## 7. Posting model and GL integration
- On create/update in draft/submitted: maintain a draft GL transaction (transactions) and detail lines (transaction_line_items) linked via:
  - transactions.source_module = 'purchase_invoices'
  - transactions.source_reference_id = purchase_invoices.id
  - transactions.has_line_items = true
  - transactions.org_id populated
- On post (usually on approval if auto_post_on_approve=true):
  - Credit supplier_account_id (2110 subtree) for (grand_total - retention_total)
  - Debit expense accounts resolved from line sub_tree_id mapping using linked_account_id or configured mapping rule
  - Debit Input VAT account (1245) for tax_total
  - Credit Retentions Payable (2140) for retention_total (if any)
  - Mark invoice posted, set gl_transaction_id, is_posted true on the transaction
- Multi-currency: store document currency totals on invoice; GL captures base currency using exchange_rate; retain metadata for document currency as needed.


## 8. Approvals and lifecycle
- States: draft → submitted → approved → posted; rejected or changes_requested return to draft/editable.
- submit: create approval_request (target_table='purchase_invoices', target_id=<id>).
- approve: set status approved, optionally post immediately if company_config.auto_post_on_approve=true; otherwise allow explicit post.
- reject: set status rejected with reason; no posting.
- Audit: log status changes with actor and timestamp.


## 9. API endpoints (proposed)
- GET /api/purchase-invoices?org_id=&supplier_account_id=&status=&date_from=&date_to=&search=&page=&page_size=&sort=
- GET /api/purchase-invoices/:id
- POST /api/purchase-invoices
- PUT /api/purchase-invoices/:id
- DELETE /api/purchase-invoices/:id (soft delete)
- POST /api/purchase-invoices/:id/submit
- POST /api/purchase-invoices/:id/approve
- POST /api/purchase-invoices/:id/reject
- POST /api/purchase-invoices/:id/request-changes
- POST /api/purchase-invoices/:id/post-gl
- POST /api/purchase-invoices/:id/attachments
- GET /api/purchase-invoices/:id/attachments
- GET /api/purchase-invoices/export
- GET /api/purchase-invoices/:id/print

Error model
- Codes: VALIDATION_ERROR, DUPLICATE_VENDOR_INVOICE, FK_NOT_FOUND, ILLEGAL_STATUS_TRANSITION, POSTING_FAILED, CONFLICT
- Include human-readable messages and field-level details

Idempotency/concurrency
- Optional idempotency key for create
- ETag/If-Match or versioning for updates/state changes


## 10. UI plan (Unified CRUD + token theme)
Pages/routes
- /purchase-invoices (list)
- /purchase-invoices/new (create)
- /purchase-invoices/:id (edit/view)

Components
- PurchaseInvoiceHeader (UnifiedCRUDForm-based)
- PurchaseInvoiceLinesGrid (add/edit/delete/copy, totals footer)
- MaterialPickerDialog (uses materials catalog)
- SupplierAccountPicker (filters to 2110 subtree)
- AttachmentsPanel (documents integration)
- ApprovalsPanel (lifecycle actions)

UX principles
- No inline styles; use tokenized classes/CSS modules
- Robust empty/error states; keyboard accessibility
- Actions: Save Draft, Submit, Approve/Reject/Request Changes, Post GL, Print/Export, Attach Files


## 11. Security & permissions
- Permissions: purchase_invoices.view/create/edit/submit/approve/post/attachments/export
- Org scoping enforced on all operations
- Supplier account must be under 2110 subtree (guardrails and validation)
- Soft delete via is_deleted on header


## 12. Non-functional & observability
- Performance: indexes on org_id/status/date; server-side pagination and sorting
- Reliability: all mutations in transactions; idempotent posting to avoid duplicates
- Accessibility: WCAG-friendly forms/grids; focus management and ARIA
- Observability: structured logs and metrics for invoice volume, approval cycle time, posting throughput, failures
- Build stability: auto-fix TS/JSX where possible per project rule


## 13. Testing strategy
SQL
- Seed suppliers (2110 subtree), Input VAT (1245), Retentions (2140), VAT rate in company_config
- Insert invoices with varied lines (material/no-material, discounts, tax, retention)
- Validate totals and GL postings; validate lifecycle transitions and draft GL sync

TypeScript
- Unit tests for services: create/update/submit/approve/post/delete
- Validation tests: dedup (org_id+supplier+invoice_number_ext), subtree checks
- Totals computation tests including edge cases

UI
- Component tests for header and lines grid
- E2E for draft → submit → approve → post
- Accessibility checks for pickers/grids


## 14. Deployment & migration plan
STOP POINT policy
- We will deliver SQL in small steps. You will run and verify each step before we proceed to the next.

Migration steps
- A: Create enum and tables; extend company_config with VAT/retentions mappings
- B: Numbering series and generator (PI-YYYYMM-####)
- C: Totals and tax calculation triggers
- D: Draft GL build function and sync on edit; posting function
- E: Views for AP drill-down and exports

Rollback
- Drop triggers/functions before tables if needed
- Feature-flag UI routes and endpoints for incremental rollout


## 15. Open questions (confirmation targets)
- Confirm whether any organization-specific overrides of Input VAT (1245) and Retentions (2140) accounts are needed per org in company_config.
- Confirm if invoice_number_ext is always mandatory (current plan: yes, mandatory).
- Confirm whether you want a visible company flag to permit per-line VAT override in the UI (default: disabled; admin-only toggle later).
- Confirm base currency logic and exchange rate source of truth (current plan: invoice stores currency_code/exchange_rate; GL posts base amounts).


## 16. Acceptance criteria
- Users can create/edit/list purchase invoices with server-computed totals.
- Draft GL is created immediately and kept in sync through draft/submitted.
- Approval workflow transitions are available; auto-post behavior respects company_config.auto_post_on_approve.
- VAT and optional retentions are correctly reflected in GL postings.
- Attachments can be uploaded and listed per invoice.
- Exports and printouts are available and accurate.
- Uniqueness constraint prevents duplicate vendor invoices per supplier per org.
- UI uses UnifiedCRUDForm and token theme; no inline styles or inline constants; robust empty and error states.


## 17. Execution notes
- All SQL steps will be shared in separate blocks for execution in your environment; we will pause after each for your verification per project rule.
- The existing transactions model lacks target_table/target_id; we will rely on source_module='purchase_invoices' and source_reference_id for linkage.
- Supplier account enforcement uses a 2110 code prefix heuristic initially; can be enhanced to path-based checks if required.
