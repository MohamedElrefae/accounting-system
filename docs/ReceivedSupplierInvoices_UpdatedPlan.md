# Received Supplier Invoices – Updated Plan (Aligned with Inventory Patterns)

This plan revises the previously frozen scope by adopting the proven inventory patterns described in purchase-invoice-detailed-recommendations.md and your confirmations:
- company_config extended per org (org_id-based defaults)
- Seed a default 14% VAT rule per org targeting account 1245
- Keep postings linkage name as purchase_invoice_postings (aligned with inventory_postings naming style)
- Approvals switch auto_post_on_approve triggers final posting on approve

The STOP POINT policy remains: every SQL step will be sent in distinct blocks, and we will pause after each for your verification.


## 1) Key changes vs. prior plan
- Replace continuous draft GL syncing with a staging-first pattern like inventory.ledger
- Introduce a flexible, prioritized tax/retention rules engine like inventory_gl_config
- Improve numbering with optimistic locking and optional pre-allocation
- Formalize status transitions with a small state machine and status history


## 2) Data architecture
- Core tables (unchanged):
  - public.purchase_invoices
  - public.purchase_invoice_lines
- New supporting tables:
  - inventory.purchase_invoice_staging: holds computed accounting effects for invoice lines before posting
  - public.purchase_invoice_postings: links posted invoices to transactions and transaction_line_items
  - public.purchase_invoice_tax_config: prioritized rules for VAT and retentions
  - public.purchase_invoice_numbering: safe concurrent allocator for PI-YYYYMM-####
  - public.purchase_invoice_status_history: audit trail for lifecycle transitions
- company_config: extend with org_id to support per-org defaults


## 3) Numbering strategy
- Function fn_get_next_pi_number(org_id, invoice_date): returns PI-YYYYMM-####
- Uses public.purchase_invoice_numbering with optimistic locking and conflict-safe insert
- Optional pre-allocation fields for high throughput scenarios


## 4) Tax and retention engine
- public.purchase_invoice_tax_config drives VAT and retention calculation with priority and flexible scoping (supplier category, material category, project, cost center, sub_tree)
- sp_calculate_purchase_invoice_tax resolves tax_rate, tax_amount, tax_account_id, retention_rate, retention_amount, retention_account_id
- Seeding: for each org, create a default rule with tax_rate=0.14 and tax_account_id pointing to 1245 (Input VAT Recoverable)
- Falls back to company_config defaults when no rule matches


## 5) Staging-first posting model
- During draft/submitted:
  - Server recomputes and stores effects in inventory.purchase_invoice_staging only
  - purchase_invoices totals remain canonical; staging reflects detailed debits/credits per line
- On approval/post:
  - Build transactions row with has_line_items=true, source_module='purchase_invoices', source_reference_id=invoice_id
  - Create transaction_line_items per staged effects:
    - Credit supplier (2110 subtree) for grand_total - retention_total
    - Debit expense accounts from sub_tree mapping or config
    - Debit Input VAT (1245) for tax_total
    - Credit Retentions Payable (2140) if retention applies
  - Insert linkage row in public.purchase_invoice_postings
- Reversal: sp_reverse_purchase_invoice allowed if no dependent payments/credits


## 6) Lifecycle and approvals
- Enum public.purchase_invoice_status: draft, submitted, approved, posted, rejected, changes_requested
- is_valid_status_transition enforces allowed transitions
- fn_transition_purchase_invoice_status updates status, writes status history, and when entering approved:
  - If company_config.auto_post_on_approve=true (per org), call sp_post_purchase_invoice_final
- Rejected/changes_requested: clean staging as needed, no GL impact


## 7) UI and UX (UnifiedCRUD + token theme)
- No inline styles or inline constants; use token theme and services
- Header form with UnifiedCRUDForm; lines grid for materials and free-text lines
- Supplier picker filtered to 2110 subtree; Sub Tree required on header; per-line sub_tree_id
- Attachments via documents; Approvals panel to submit/approve/reject/request changes; explicit Post GL if auto-post disabled
- Diagnostics panel to display staging validation errors and rule matches


## 8) Security and validations
- Supplier account must be under 2110 (code-prefix guard initially; can enhance to path-based)
- Uniqueness: (org_id, invoice_number_int) and (org_id, supplier_account_id, invoice_number_ext)
- Amounts non-negative; currency and exchange_rate validated
- Org scoping on all reads/writes; soft delete via is_deleted on header


## 9) Observability and performance goals
- Index coverage on staging, tax config, and numbering (org_id, dates, priorities)
- Targets: <100ms tax rule resolution; <200ms staging validations under typical load
- Reconciliation utilities: staging vs posted GL consistency checks
- Structured logs and metrics for postings, rule hits, numbering retries


## 10) Testing strategy
- SQL: stage/validate/post/reverse flows; numbering concurrency; tax rule selection precedence; reconciliation checks
- Services: create/update/submit/approve/post; error and edge cases
- UI: E2E draft → submit → approve → post; a11y tests for form and grid


## 11) Phased delivery with STOP POINTs
Phase A – Infra + Staging
- Create/extend: enum, purchase_invoices, purchase_invoice_lines
- Add: inventory.purchase_invoice_staging, public.purchase_invoice_postings, public.purchase_invoice_tax_config, public.purchase_invoice_numbering, public.purchase_invoice_status_history
- Extend company_config with org_id and per-org defaults (default_tax_rate, input_vat_account_id, retentions_payable_account_id)
- Seed: default rule per org at 14% targeting 1245, respecting your existing account IDs
- Base functions: fn_get_next_pi_number, sp_calculate_purchase_invoice_tax, is_valid_status_transition
- STOP POINT: you verify objects and seed data

Phase B – Business logic on staging
- sp_stage_purchase_invoice (compute and persist staging effects)
- sp_validate_staging_data (business rules and integrity checks)
- sp_clear_staging_data (safe cleanup)
- Monitoring functions for performance and consistency
- STOP POINT: you verify validations and performance

Phase C – GL integration and posting
- sp_post_purchase_invoice_final (migrate staging → GL)
- sp_reverse_purchase_invoice (controlled reversal)
- Reconciliation scripts and reporting views (AP aging, supplier statements, tax views)
- STOP POINT: end-to-end verified before enabling UI entry in production


## 12) Open confirmations (resolved)
- company_config per-org extension: YES (extend with org_id)
- Seed default tax rule per org: YES at 14%, tax account = 1245
- Postings linkage table name: Keep purchase_invoice_postings (aligned with inventory_postings style)
- Auto-post on approve: YES (company_config.auto_post_on_approve per org)


## 13) Next steps
- I will prepare Phase A SQL in small independent blocks (DDL + seeds + base functions). Per your SQL verification rule, I will stop after sharing them for your approval before proceeding to Phase B.
