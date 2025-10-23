-- Migration: Create separate line_items catalog and link to transaction_line_items
-- Purpose: Revert to a clear separation between a reusable catalog (line_items)
--          and actual transaction line details (transaction_line_items).
-- Date: 2025-10-20

BEGIN;

-- 1) Create enum for item types (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'item_type_enum'
  ) THEN
    CREATE TYPE item_type_enum AS ENUM ('material', 'service', 'equipment', 'labor');
  END IF;
END$$;

-- 2) Create the line_items catalog table (hierarchical)
CREATE TABLE IF NOT EXISTS public.line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  parent_id UUID NULL REFERENCES public.line_items(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 1,
  path TEXT NOT NULL,
  is_selectable BOOLEAN NOT NULL DEFAULT FALSE,
  item_type item_type_enum,
  specifications JSONB,
  base_unit_of_measure VARCHAR(50),
  standard_cost NUMERIC(15,4),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  org_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, code)
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS ix_line_items_parent ON public.line_items(parent_id);
CREATE INDEX IF NOT EXISTS ix_line_items_path ON public.line_items(path);
CREATE INDEX IF NOT EXISTS ix_line_items_org_active ON public.line_items(org_id, is_active);
CREATE INDEX IF NOT EXISTS ix_line_items_selectable ON public.line_items(is_selectable) WHERE is_selectable = TRUE;

-- 4) Triggers to keep path/updated_at
CREATE OR REPLACE FUNCTION public.fn_line_item_update_path()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_parent_path TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.level := 1;
    NEW.path := LOWER(NEW.code);
  ELSE
    SELECT path INTO v_parent_path FROM public.line_items WHERE id = NEW.parent_id;
    NEW.level := (SELECT COALESCE(level, 0) FROM public.line_items WHERE id = NEW.parent_id) + 1;
    NEW.path := v_parent_path || '.' || LOWER(NEW.code);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_line_items_path ON public.line_items;
CREATE TRIGGER trg_line_items_path
BEFORE INSERT OR UPDATE ON public.line_items
FOR EACH ROW EXECUTE FUNCTION public.fn_line_item_update_path();

-- 5) Add line_item_id to transaction_line_items (idempotent)
ALTER TABLE public.transaction_line_items
  ADD COLUMN IF NOT EXISTS line_item_id UUID NULL REFERENCES public.line_items(id);

CREATE INDEX IF NOT EXISTS ix_tli_line_item_id ON public.transaction_line_items(line_item_id);

-- 6) Optional backfill: migrate templates from transaction_line_items (transaction_id IS NULL)
--    into line_items once per org. Safe to run; ignores duplicates by unique(org_id, code).
WITH templates AS (
  SELECT DISTINCT
    COALESCE(org_id, '00000000-0000-0000-0000-000000000000') AS org_id,
    item_code AS code,
    COALESCE(item_name, item_name_ar, item_code) AS name,
    item_name_ar,
    parent_id,
    unit_of_measure AS base_unit_of_measure,
    unit_price AS standard_cost,
    TRUE AS is_active
  FROM public.transaction_line_items
  WHERE transaction_id IS NULL
    AND item_code IS NOT NULL
)
INSERT INTO public.line_items (org_id, code, name, name_ar, parent_id, base_unit_of_measure, standard_cost, is_active, is_selectable, path, level)
SELECT t.org_id, t.code, t.name, t.item_name_ar, NULL, t.base_unit_of_measure, t.standard_cost, t.is_active, FALSE,
       LOWER(t.code), 1
FROM templates t
ON CONFLICT (org_id, code) DO NOTHING;

-- 7) Views to simplify joins
CREATE OR REPLACE VIEW public.v_transaction_line_items_enhanced AS
SELECT 
  tli.*,
  li.code          AS catalog_code,
  li.name          AS catalog_name,
  li.name_ar       AS catalog_name_ar,
  li.base_unit_of_measure AS catalog_unit,
  li.standard_cost AS catalog_standard_cost,
  li.path          AS catalog_path,
  li.level         AS catalog_level,
  li.is_selectable AS catalog_is_selectable
FROM public.transaction_line_items tli
LEFT JOIN public.line_items li ON li.id = tli.line_item_id;

-- 8) RLS and permissions
-- Enable RLS and add org-based policies
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS line_items_select_policy ON public.line_items;
DROP POLICY IF EXISTS line_items_insert_policy ON public.line_items;
DROP POLICY IF EXISTS line_items_update_policy ON public.line_items;
DROP POLICY IF EXISTS line_items_delete_policy ON public.line_items;

CREATE POLICY line_items_select_policy ON public.line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = line_items.org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY line_items_insert_policy ON public.line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = line_items.org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY line_items_update_policy ON public.line_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = line_items.org_id
        AND om.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = line_items.org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY line_items_delete_policy ON public.line_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = line_items.org_id
        AND om.user_id = auth.uid()
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_items TO authenticated;

COMMIT;
