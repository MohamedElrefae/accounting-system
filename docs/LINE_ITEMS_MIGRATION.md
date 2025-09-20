# Line Items Catalog (using transaction_line_items)

This project reuses `public.transaction_line_items` for both:
- Catalog items (hierarchy): rows where `transaction_id IS NULL`
- Transaction lines: rows where `transaction_id IS NOT NULL` (existing)

A view `public.line_items` exposes only the catalog rows so UI/services can query a dedicated endpoint without duplicating tables.

## Migration steps (DB SQL)

Run these in Supabase SQL editor (once per environment):

1. Drop physical `line_items` table if it was created by mistake
```sql
-- Safe if table does not exist
DROP TABLE IF EXISTS public.line_items CASCADE;
```

2. Add catalog columns and indexes to `public.transaction_line_items`
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type_enum') THEN
    CREATE TYPE item_type_enum AS ENUM ('material', 'service', 'equipment', 'labor');
  END IF;
END$$;

ALTER TABLE public.transaction_line_items
  ADD COLUMN IF NOT EXISTS parent_id uuid,
  ADD COLUMN IF NOT EXISTS level int,
  ADD COLUMN IF NOT EXISTS path text,
  ADD COLUMN IF NOT EXISTS is_selectable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS item_type item_type_enum,
  ADD COLUMN IF NOT EXISTS specifications jsonb,
  ADD COLUMN IF NOT EXISTS unit_of_measure text,
  ADD COLUMN IF NOT EXISTS standard_cost numeric(15,4),
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_tli_parent ON public.transaction_line_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_tli_path ON public.transaction_line_items(path);
CREATE INDEX IF NOT EXISTS idx_tli_catalog_org ON public.transaction_line_items(org_id) WHERE transaction_id IS NULL;
```

3. Path trigger (maintains `path` for catalog rows)
```sql
CREATE OR REPLACE FUNCTION public.fn_tli_update_path() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE parent_path text; BEGIN
  IF (NEW.transaction_id IS NOT NULL) THEN RETURN NEW; END IF;
  IF NEW.parent_id IS NULL THEN
    NEW.path := LOWER(COALESCE(NEW.item_code, NEW.code, ''));
  ELSE
    SELECT path INTO parent_path FROM public.transaction_line_items WHERE id = NEW.parent_id;
    NEW.path := COALESCE(parent_path,'') || CASE WHEN parent_path IS NULL OR parent_path = '' THEN '' ELSE '.' END || LOWER(COALESCE(NEW.item_code, NEW.code, ''));
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_tli_update_path ON public.transaction_line_items;
CREATE TRIGGER trg_tli_update_path BEFORE INSERT OR UPDATE ON public.transaction_line_items FOR EACH ROW EXECUTE FUNCTION public.fn_tli_update_path();
```

4. View `public.line_items` (catalog alias)
```sql
CREATE OR REPLACE VIEW public.line_items AS
SELECT
  tli.id,
  COALESCE(tli.item_code, '') AS code,
  COALESCE(tli.item_name, '') AS name,
  tli.item_name_ar AS name_ar,
  tli.parent_id,
  tli.level,
  tli.path,
  COALESCE(tli.is_selectable, false) AS is_selectable,
  tli.item_type,
  tli.specifications,
  tli.unit_of_measure AS base_unit_of_measure,
  tli.standard_cost,
  COALESCE(tli.is_active, true) AS is_active,
  tli.org_id,
  tli.created_at,
  tli.updated_at
FROM public.transaction_line_items tli
WHERE tli.transaction_id IS NULL;
```

5. Enforce leaf-only selectable (optional but recommended)
```sql
CREATE OR REPLACE FUNCTION public.fn_guard_selectable_leaf_tli() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE v_children int; BEGIN
  IF (NEW.transaction_id IS NULL) AND (NEW.is_selectable IS TRUE) THEN
    SELECT COUNT(*) INTO v_children FROM public.transaction_line_items WHERE parent_id = NEW.id;
    IF v_children > 0 THEN RAISE EXCEPTION 'Only leaf items can be selectable'; END IF;
  END IF; RETURN NEW; END$$;

DROP TRIGGER IF EXISTS trg_tli_guard_selectable ON public.transaction_line_items;
CREATE TRIGGER trg_tli_guard_selectable BEFORE INSERT OR UPDATE ON public.transaction_line_items FOR EACH ROW EXECUTE FUNCTION public.fn_guard_selectable_leaf_tli();

CREATE OR REPLACE FUNCTION public.fn_unselect_parent_tli() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.transaction_id IS NULL AND NEW.parent_id IS NOT NULL THEN
    UPDATE public.transaction_line_items SET is_selectable = FALSE, updated_at = NOW() WHERE id = NEW.parent_id AND is_selectable = TRUE;
  END IF; RETURN NEW; END$$;

DROP TRIGGER IF EXISTS trg_tli_unselect_parent ON public.transaction_line_items;
CREATE TRIGGER trg_tli_unselect_parent AFTER INSERT OR UPDATE ON public.transaction_line_items FOR EACH ROW EXECUTE FUNCTION public.fn_unselect_parent_tli();
```

6. RLS policy for catalog rows (org-based)
```sql
ALTER TABLE public.transaction_line_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_line_items TO authenticated;
GRANT SELECT ON public.line_items TO authenticated;

DROP POLICY IF EXISTS tli_catalog_org_member_all ON public.transaction_line_items;
CREATE POLICY tli_catalog_org_member_all ON public.transaction_line_items AS PERMISSIVE FOR ALL TO authenticated
USING (
  transaction_id IS NULL AND EXISTS (
    SELECT 1 FROM public.org_memberships m WHERE m.org_id = transaction_line_items.org_id AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  transaction_id IS NULL AND EXISTS (
    SELECT 1 FROM public.org_memberships m WHERE m.org_id = transaction_line_items.org_id AND m.user_id = auth.uid()
  )
);
```

7. RPC functions (create/update/toggle/delete) against `transaction_line_items` (catalog rows only)
```sql
-- fn_line_item_create, fn_line_item_update, fn_line_item_toggle_active, fn_line_item_delete
-- See migration SQL in code comments or contact the dev team; these are implemented with security definer and org membership checks.
```

## Verify migration (PowerShell)

Install dependencies once:
```powershell
npm install
```

Run the migration validator:
```powershell
npm run check:migration
```

Expected output includes:
- `✅ transaction_line_items has all required catalog columns`
- `✅ public.line_items view is accessible`
- `✅ RPC fn_line_item_* is present`

If you see any `❌` lines, re-run the SQL steps above, then run the validator again.
