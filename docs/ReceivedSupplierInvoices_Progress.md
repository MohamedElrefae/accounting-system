# Received Supplier Invoices – Progress Report (Phases A–C)

This report summarizes current progress for the Received Supplier Invoices module and outlines remaining work. All work follows the STOP POINT policy; future changes will be provided in small, verifiable steps.


## Status Summary

Completed
- Phase A: Infrastructure and Core DB
  - A1 Enum purchase_invoice_status created
  - A2 company_config extended per org:
    - Added org_id, default_tax_rate, input_vat_account_id, retentions_payable_account_id
    - Unique index on org_id (nullable) and FKs to accounts
  - A3 Tables purchase_invoices and purchase_invoice_lines created
    - Indexes for org/date/supplier and unique constraints
    - Supplier 2110 guard trigger (code-prefix heuristic)
  - A4 inventory.purchase_invoice_staging created + indexes
  - A5 purchase_invoice_postings created + indexes
  - A6 purchase_invoice_tax_config created + indexes
    - Seeded default 14% VAT rule per org targeting 1245 where available
  - A7 purchase_invoice_numbering and fn_get_next_pi_number created
  - A8 is_valid_status_transition created
  - A9 sp_calculate_purchase_invoice_tax created (rules engine with fallback to company_config)
  - A10 purchase_invoice_status_history created

- Phase B: Staging Business Logic
  - B1 sp_clear_staging_data
  - B2 sp_stage_purchase_invoice (stages expense debits, VAT debits, supplier credit; accumulates retentions)
  - B3 sp_validate_staging_data (ensures mappings, reconciles debits vs credits+retentions; writes consolidated errors if any)
  - B4 optional sp_stage_and_validate_purchase_invoice wrapper

- Phase C: Posting and Reporting
  - C1 sp_post_purchase_invoice_final (staging → multiple GL transactions)
    - Posts expense groups (Dr expense, Cr supplier)
    - Posts VAT groups (Dr input VAT 1245, Cr supplier)
    - Posts retentions (Dr supplier, Cr retentions payable 2140) when applicable
    - Links via purchase_invoice_postings, updates invoice to posted
  - C2 sp_reverse_purchase_invoice (creates reversing transactions and marks postings reversed)
  - C3 sp_approve_and_maybe_post_purchase_invoice (approves and optionally auto-posts per company_config.auto_post_on_approve)
  - C4 v_ap_invoice_postings
  - C5 v_ap_aging_base
  - C6 sp_reconcile_invoice_staging_vs_posted
  - C7 optional grants executed successfully


## What Remains (Phase D)

D1 Backend Services (API)
- Endpoints
  - GET /api/purchase-invoices, GET /api/purchase-invoices/:id
  - POST /api/purchase-invoices (create header + lines; allocate invoice_number_int via fn_get_next_pi_number)
  - PUT /api/purchase-invoices/:id (update header/lines; re-stage)
  - POST /api/purchase-invoices/:id/stage-and-validate (wrapper: clear → stage → validate)
  - POST /api/purchase-invoices/:id/submit
  - POST /api/purchase-invoices/:id/approve (calls C3)
  - POST /api/purchase-invoices/:id/post (calls C1 explicitly)
  - POST /api/purchase-invoices/:id/reverse (calls C2)
  - Attachments: POST/GET /api/purchase-invoices/:id/attachments
  - Exports: GET /api/purchase-invoices/export; Print: GET /api/purchase-invoices/:id/print
- Validations
  - Dedup: unique (org_id, supplier_account_id, invoice_number_ext)
  - Supplier account under 2110
  - Line amounts non-negative; sub_tree.linked_account_id mapping exists

D2 UI Scaffolding (UnifiedCRUD + token theme, no inline styles)
- Pages
  - /purchase-invoices (list)
  - /purchase-invoices/new (create)
  - /purchase-invoices/:id (edit/view)
- Components
  - PurchaseInvoiceHeader (UnifiedCRUDForm)
  - PurchaseInvoiceLinesGrid (materials picker, free-text lines; totals footer)
  - SupplierAccountPicker (filtered to 2110 subtree)
  - AttachmentsPanel (documents integration)
  - ApprovalsPanel (submit/approve/reject/request-changes; Post GL if not auto)
  - Diagnostics panel (staging validation/errors and tax rule matches)

D3 Observability and Tests
- Structured logs for staging, posting, and reconciliation
- SQL tests: stage/validate/post/reverse; numbering concurrency; tax rules precedence
- Service tests: create/update/submit/approve/post; error and edge cases
- UI e2e: draft → submit → approve → post; accessibility checks


## Operational Notes
- Linkage uses transactions.source_module='purchase_invoices' and source_reference_id=invoice_id; purchase_invoice_postings provides explicit join to posted transactions.
- Retentions rely on company_config.retentions_payable_account_id per org; ensure it’s configured where retentions apply.
- Tax rules default to 14% per org with account 1245; add granular rules via purchase_invoice_tax_config as needed.
- The supplier guard uses a 2110 code-prefix heuristic; can be upgraded to path-based checks using your ltree structure.


## Next When You Return
- I can prepare D1 backend endpoints and handlers first, or provide a demo flow script (SQL and minimal HTTP calls) to create a sample invoice, stage, validate, approve, post, and reconcile.
- Tell me which you prefer, and I will proceed with small, verifiable steps per your STOP POINT policy.
