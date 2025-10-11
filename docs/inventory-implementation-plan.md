# Inventory Implementation Plan

Last updated: 2025-10-05

This document tracks end-to-end implementation status for the Inventory module: database procedures, posting flows, UI editors, validation, automation, and GL integration.

## Phase 4 (baseline) — Verified
- Schemas/tables: inventory_gl_config, inventory_movements, inventory_stock, inventory_documents, inventory_document_lines confirmed.
- transactions table extended with source_module and source_reference_id; indexes in place.

## Phase 5 — Posting engine, stock valuation, orchestration, automation, GL link

### Step 1 — Helper functions (Complete)
- inventory.fn_get_material_cost_moving_avg(uuid, uuid)
  - Computes moving-average unit cost from inventory_movements (quantity > 0); safe fallback to standard price when available; resilient to missing materials table.
- inventory.fn_upsert_stock(uuid, uuid, uuid, numeric, numeric)
  - Upserts inventory_stock and updates on_hand, reserved, available atomically.
- inventory.fn_insert_movement(...)
  - Inserts movement rows compatible with generated columns and NOT NULL constraints.

### Step 2 — Receive posting (Complete)
- inventory.sp_post_receive(org_id, document_id, movement_date, created_by, lines JSONB)
  - Inserts movements with movement_type = 'receipt'.
  - Increments stock at target location.
  - Requires document_line_id (FK enforced).
  - One-shot seed and verification scripts executed successfully.

### Step 3 — Issue posting (Complete)
- inventory.sp_post_issue(...)
  - Inserts movements with movement_type = 'issue' and negative quantity.
  - Decrements stock at issuing location.
  - Verified: on_hand decremented correctly (e.g., 5 -> 3).

### Step 4 — Transfer posting (Complete)
- inventory.sp_post_transfer(...)
  - Creates transfer_out (negative) and transfer_in (positive) movements; same unit_cost both legs.
  - Updates stock at from/to locations accordingly.
  - Verified stock moved: FROM decremented, TO incremented.

### Step 5 — Adjust posting (Complete)
- inventory.sp_post_adjust(...)
  - Supports adjust_increase (positive) and adjust_decrease (negative).
  - Updates stock; verified net impact (+2 then -1 -> net +1).

### Step 6 — Returns posting (Complete)
- inventory.sp_post_return(...)
  - return_to_vendor (negative) and return_from_project (positive).
  - Updates stock; verified both directions.

### Step 7 — Orchestration (Complete)
- inventory.sp_approve_inventory_document(org, doc, user)
  - Draft -> Approved (idempotent), fully qualified columns; fixed ambiguity.
- inventory.sp_post_inventory_document(org, doc, user)
  - Router that builds line JSON and dispatches to Step 2–6 procedures.
  - COUNT(*) cast to integer; marks header Posted; supports auto-approve if draft.
- inventory.sp_void_inventory_document(org, doc, user, reason)
  - Reverses movements and stock if Posted; sets status -> voided.
- Automated tests: one-shot seed, post, verify, void; stock restored.

### Step 8 — Automation + GL (Complete)
- Org settings table: public.inventory_settings
  - Flags: auto_approve, auto_post, auto_gl_post.
  - Setter: inventory.sp_set_inventory_settings(org, auto_approve, auto_post, auto_gl_post).
- Triggers
  - AFTER INSERT on inventory_documents: auto-approve (no auto-post here).
  - AFTER INSERT on inventory_document_lines: if auto_post true, auto-approve if needed, then post via router.
- GL Posting
  - inventory.sp_gl_post_inventory_document(org, doc, user):
    - For each movement, picks (org_id, movement_type) mapping from inventory_gl_config (lowest priority value), inserts balanced single-row entry into public.transactions with source link to the inventory document.
  - Router hook: sp_post_inventory_document calls GL posting automatically when auto_gl_post is true.
- GL Config seeding (Complete)
  - Receipt: DR Inventory (1300), CR AP (2111/2100)
  - Issue: DR COGS/Site Materials (5110), CR Inventory (1300)
  - Adjust Increase: DR Inventory (1300), CR Inventory Adjustments (5995)
  - Adjust Decrease: DR Inventory Adjustments (5995), CR Inventory (1300)
  - Return to Vendor: DR AP (2111/2100), CR Inventory (1300)
  - Return from Project: DR Inventory (1300), CR COGS/Site Materials (5110)
  - Mappings resolved against existing accounts per chosen org.

## UI Implementation Status (Complete for core editors)
- Receive, Issue, Transfer, Adjust, Return pages:
  - UOM dropdowns from service
  - Multi-line entry with add/remove, sequential line numbers
  - Zod validation for headers and lines
  - Materials & Locations CRUD dialogs on listing pages
  - Work Item / Project / Cost Center selectors integrated (Issue/Return)
  - Movements page shows material/location codes and names
  - Adjust/Return editors synced with backend semantics (no negative line quantities; explicit type selection routes to inventory.sp_post_adjust / inventory.sp_post_return; header marked posted; GL posted via inventory.sp_gl_post_inventory_document)

## Automation & Verification (Complete)
- Zero-effort seed-and-test blocks for each posting flow and orchestration (approve/post/void).
- Auto-approve/post triggers in place; verified end-to-end posting from header+line inserts.
- GL auto-post enabled via settings; verified transactions with source linkage.
- Smoke Playbook: see `docs/inventory-smoke-playbook.md` for a quick UI-only validation checklist.

## Next Tasks
- UI/UX
  - Migrate all inventory editors to React Hook Form with Zod resolver for per-field inline errors.
  - Enhance selectors with async search/autocomplete for materials, locations, work items.
  - Optional: richer in-memory grid for line editing with validation.
- Reporting
  - Movement/stock valuation reports by period, org, material, location.
  - Reconciliation views linking inventory documents to GL transactions.
- Functional
  - Lot/serial tracking flows where is_trackable = true (allocate and consume).
  - Safety stock/reorder suggestions based on minimum_stock_level and reorder rules.
  - Optional: location hierarchy roll-ups and project-specific subledgers.
- Hardening
  - Concurrency tests for high-volume posting (row locking around stock upserts already implemented).
  - Add configurable rounding/precision policies for costs and quantities.
  - Add guardrails around negative stock if disallowed by org policy.
- GL
  - Option to aggregate per document into one journal instead of per movement.
  - Optional: transfers via clearing accounts if required (currently no GL impact by default).

## How to Run (Quick Reference)
- Approve: SELECT * FROM inventory.sp_approve_inventory_document(org_id, doc_id, user_id);
- Post:    SELECT * FROM inventory.sp_post_inventory_document(org_id, doc_id, user_id);
- Void:    SELECT * FROM inventory.sp_void_inventory_document(org_id, doc_id, user_id, 'reason');
- GL Post: SELECT * FROM inventory.sp_gl_post_inventory_document(org_id, doc_id, user_id);
- Settings: SELECT inventory.sp_set_inventory_settings(org_id, true, true, true); -- enable auto-approve, auto-post, auto-gl

---

## Appendix A — Consolidated notes from previous plan (INVENTORY_IMPLEMENTATION_PLAN.md)

Status: Approved plan; SQL steps will be gated for verification; all other app work proceeds end-to-end with progress reported here.

Key Decisions (Confirmed)
- Tenancy key: org_id everywhere for isolation
- Schema: public
- Domain naming:
  - Materials (not items)
  - inventory_locations (warehouses, sites; extensible to vehicles/yards)
- Existing accounting linkage:
  - Keep transaction_line_items intact
  - Posting will create accounting transactions and line items; do not reshape existing tables
  - Add two columns to transactions for cross-module traceability (enterprise pattern):
    - source_module text (e.g., 'inventory', 'subcontractor_payments', …)
    - source_reference_id uuid (ID in the originating module)
- Security: NO RLS for inventory; enforce via app permissions and org_id filtering
- Permissions: inventory.view, inventory.manage, inventory.adjust, inventory.transfer, inventory.approve, inventory.post
- Document numbering: per-org, per-type enterprise sequences (prefix + year + padded number), e.g., RCPT-2025-000123
- Valuation methods (initial scope):
  - Moving average (default)
  - Last purchase price (as default option)
  - Manual override at document line (within configured tolerance)
  - Roadmap: FIFO and others later
- Lot/serial tracking: optional (enabled only if material.is_trackable)

Objectives
- Implement an enterprise-grade inventory module integrated with projects, cost centers, work_items, analysis_work_items, and accounting, with Arabic/RTL support and MUI consistency.

Architecture Overview
- Masters
  - materials_categories (hierarchical)
  - materials (bilingual fields, UOM, control flags, optional links to analysis/work items and cost centers)
  - uoms & material_uom_conversions
  - inventory_locations (types: warehouse/site; optional project_id/cost_center_id; parent hierarchy)
- Stock & Ledger
  - inventory_stock_levels (material_id × location_id snapshot; on_hand/reserved/on_order; average_cost/last_cost)
  - inventory_movements (immutable ledger; movement_type; references to docs/transactions)
- Documents & Posting
  - inventory_documents (header) with status: draft/approved/posted/void; per-type numbering
  - inventory_document_lines (lines) with UOM/qty/cost; optional lot/serial; optional project/cost_center/work items
  - inventory_gl_config (movement/account mapping rules)
  - inventory_postings (link to accounting.transaction_line_items)
- Integration Touchpoints
  - org_id on all tables; optional project_id, cost_center_id, analysis_work_item_id, work_item_id
  - transactions gets (source_module, source_reference_id) for traceability

Security & Permissions
- App-level enforcement only (no inventory RLS):
  - All services/RPCs filter by org_id
  - Route guards and UI actions gated by permissions
- Permissions (final list):
  - inventory.view (read-only)
  - inventory.manage (CRUD materials & locations)
  - inventory.adjust (create/approve adjustments)
  - inventory.transfer (create/approve transfers)
  - inventory.approve (approve any inventory document type)
  - inventory.post (post approved docs to GL)
- Suggested roles:
  - org_admin: full (incl. post)
  - accountant: approve + post
  - inventory_manager: manage/adjust/transfer/approve (no post by default)
  - site_engineer: create issues/returns for assigned projects only
  - viewer: read-only

Valuation & Costing (Initial)
- Moving Average: recompute on each receipt; used by default for issues/transfers
- Last Purchase Price: optional default for issues/transfers
- Manual Override: permitted on lines within tolerance; audited
- Tolerances: org-level configuration
- Roadmap: FIFO/others with costing layers

Posting & GL Rules
- Workflow: Draft → Approved (validations) → Posted (GL entries created)
- Mapping (via inventory_gl_config):
  - Receipt: Dr Inventory, Cr GRNI/AP
  - Issue to Project: Dr WIP/COGS, Cr Inventory
  - Transfer: Dr Inventory (to), Cr Inventory (from) — net zero
  - Adjustment Increase: Dr Inventory, Cr Gain/Loss
  - Adjustment Decrease: Dr Gain/Loss, Cr Inventory
  - Return to Vendor: Dr GRNI/AP, Cr Inventory
  - Return from Project: Dr Inventory, Cr WIP/COGS (reversal)
- Document numbering: per org and doc type with enterprise prefixes/padding
- Posting outputs:
  - Create transactions + transaction_line_items
  - Link each created line back via inventory_postings
  - Update inventory_movements & inventory_stock_levels
  - Stamp transactions.source_module='inventory' and source_reference_id=<inventory_document_id>

UI/UX (MUI + Arabic/RTL)
- Routes (gated by VITE_FEATURE_INVENTORY):
  - /inventory (dashboard)
  - /inventory/materials
  - /inventory/locations
  - /inventory/on-hand
  - /inventory/movements
  - /inventory/receive
  - /inventory/issue
  - /inventory/transfer
  - /inventory/adjust
  - /inventory/returns
- Pages/Components:
  - InventoryDashboardPage: KPIs, low stock, pending approvals
  - MaterialsPage + MaterialFormDialog
  - LocationsPage + LocationFormDialog
  - OnHandPage: per material/location/lot, export-ready
  - MovementsPage: ledger with filters (date/material/project/movement)
  - Receive/Issue/Transfer/Adjust/Returns document editors (RHF + Zod; Arabic labels; numeric inputs LTR)
  - ApprovalBanner + PostingStatus components

Services & Hooks (Supabase + React Query)
- Services:
  - materials.service, locations.service, documents.service, movements.service, config.service
- Hooks:
  - useMaterials(), useCreateMaterial(), useUpdateMaterial()
  - useLocations(), useCreateLocation(), useUpdateLocation()
  - useInventoryDocuments(type), useInventoryDocument(id)
  - useApproveInventoryDocument(), usePostInventoryDocument()
  - useOnHand(filter), useMovements(filter)
- Patterns:
  - Uniform ServiceResponse
  - org_id filters in every call
  - Centralized error handling

Phased Delivery & Gating
- Critical Note (owner directive):
  - SQL: Gated — STOP after each phase until verified in SQL editor
  - All other code: Proceed end-to-end; no pauses; report progress here after each phase

- Phase 0: Completed — Latest schema snapshot and alignment
- Phase 1 (SQL): Core masters
  - materials_categories, materials, uoms, material_uom_conversions, inventory_locations
  - document numbering metadata (per org/type)
  - indexes on org_id and lookup fields
- Phase 2 (SQL): Documents & Lines
  - inventory_documents, inventory_document_lines (workflow fields)
- Phase 3 (SQL): Movements & Stock
  - inventory_movements (immutable), inventory_stock_levels; on-hand view
- Phase 4 (SQL): GL config & Postings linkage
  - inventory_gl_config, inventory_postings
  - transactions add source_module, source_reference_id
- Phase 5 (SQL + RPC): Costing & Posting
  - approve_document, post_inventory_document, void_document
  - moving average + last purchase + manual override
- Phase 6 (SQL): Performance hardening
  - composite indexes on movements, stock levels, documents
- Phase 7 (App): Permissions, routes, feature flag wiring
  - inventory.* permissions; navigation and guards; VITE_FEATURE_INVENTORY
- Phase 8 (App): UI
  - All inventory pages/components
- Phase 9 (QA): Tests & acceptance
  - Services/unit, components, E2E flows, performance checks

Acceptance Criteria
- Data correctness: receipts/issues/transfers/adjustments reflected in on-hand and movements with accurate costs
- Accounting correctness: balanced transactions and correct accounts per inventory_gl_config
- Security: permissions enforced; org isolation maintained
- UX: Arabic/RTL, form validation, export capabilities
- Performance: responsive ledgers and on-hand views at scale
