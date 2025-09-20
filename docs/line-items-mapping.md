# Line Items Mapping and Integration

This document defines the minimal hierarchical catalog and its integration with transactional line items, reusing the existing table public.transaction_line_items.

Key decision: We do NOT create a separate physical table. Instead:
- Catalog items (the hierarchy) are rows in public.transaction_line_items where transaction_id IS NULL
- Transaction rows are rows where transaction_id IS NOT NULL (existing behavior)
- A view public.line_items exposes only the catalog rows for convenience and to keep UI/services simple

1) Catalog: line_items view (hierarchical)
- Backed by public.transaction_line_items where transaction_id IS NULL
- Mapped columns:
  - id -> transaction_line_items.id
  - code -> coalesce(item_code, '')
  - name -> coalesce(item_name, '')
  - name_ar -> item_name_ar
  - parent_id -> parent_id
  - level -> level
  - path -> path (maintained by trigger on transaction_line_items)
  - is_selectable -> is_selectable
  - item_type -> item_type (enum: material/service/equipment/labor)
  - specifications -> specifications (jsonb)
  - base_unit_of_measure -> unit_of_measure
  - standard_cost -> standard_cost
  - is_active -> is_active
  - org_id -> org_id
  - created_at/updated_at -> created_at/updated_at

Rules
- Only leaf items (no children) can be selectable; enforced by DB trigger and UI.
- Path is computed from parent path + lower(code) via trigger on transaction_line_items.

2) Transactions: transaction_line_items (operational lines)
Existing columns preserved. Minimal additions already aligned in DB for catalog support:
- parent_id uuid (for hierarchy)
- level int, path text
- is_selectable boolean, item_type item_type_enum
- specifications jsonb, unit_of_measure text, standard_cost numeric(15,4), is_active boolean

Operational additions for amounts (if not already present):
- discount_amount numeric(18,6) default 0
- tax_amount numeric(18,6) default 0
- Optional: tax_rate numeric(9,4)

Integration column (FK)
- line_item_id uuid NULL references public.transaction_line_items(id) -- points to a catalog row (transaction_id is null)

3) Totals formula (view, no stored redundancy)
line_total = (quantity * unit_price * (percentage/100)) - discount_amount + tax_amount

Note: The catalog hierarchy has no transaction_id and no amounts; amounts apply to operational rows where transaction_id is not null.

4) UI/Service types
Catalog selectable items (used in dropdown)
- id, code, name, name_ar, path, categoryPath (derived from path), base_unit_of_measure, standard_cost, item_type

Transaction editor line
- id?: string
- line_number: number
- quantity: number
- percentage?: number (default 100)
- unit_price: number
- discount_amount?: number (default 0)
- tax_amount?: number (default 0)
- unit_of_measure?: string | null
- item_code?: string | null
- item_name?: string | null
- analysis_work_item_id?: string | null
- sub_tree_id?: string | null
- line_item_id?: string | null (FK to catalog leaf)

5) Access control (RLS)
- org-based via org_memberships on public.transaction_line_items, with catalog rows restricted to transaction_id is null (policy name: tli_catalog_org_member_all).
- public.line_items is a view; read access is granted to authenticated.

6) Dataflow
- User selects from catalog (line_items where is_selectable = true & is_active = true & org_id = current org).
- UI stores line_item_id on transaction_line_items row; unit_of_measure can default from catalog item base_unit_of_measure.
- Totals computed in view. Reports aggregate from view or v_tx_lines_signed.

7) SQL snippets (creation & verification)
- Drop physical line_items if created by mistake
- Add catalog columns and triggers to public.transaction_line_items
- Create view public.line_items over transaction_line_items (transaction_id is null)
- Add org-based RLS policies for catalog rows
- Create RPCs for create/update/toggle/delete against transaction_line_items
