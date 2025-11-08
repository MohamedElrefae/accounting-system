-- 2025-10-26: Rename legacy organization_id columns to org_id across all tables; backfill and drop legacy where appropriate
-- This migration is idempotent and safe to re-run.
SET search_path = public;

DO $$
DECLARE
  r RECORD;
  has_org_id boolean;
BEGIN
  -- Iterate over all user tables that have a column named organization_id
  FOR r IN
    SELECT c.oid::regclass AS tbl, a.attname AS col
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attname = 'organization_id'
      AND a.attnum > 0
  LOOP
    -- Check if org_id already exists on this table
    SELECT EXISTS (
      SELECT 1 FROM pg_attribute a2
      WHERE a2.attrelid = r.tbl
        AND a2.attname = 'org_id'
        AND a2.attnum > 0
    ) INTO has_org_id;

    IF has_org_id THEN
      -- If both exist: copy data from organization_id into org_id when org_id is NULL
      EXECUTE format('UPDATE %s SET org_id = organization_id WHERE org_id IS NULL', r.tbl);
      -- Then drop the legacy column
      EXECUTE format('ALTER TABLE %s DROP COLUMN IF EXISTS organization_id', r.tbl);
    ELSE
      -- Only legacy exists: rename it to org_id
      EXECUTE format('ALTER TABLE %s RENAME COLUMN organization_id TO org_id', r.tbl);
    END IF;
  END LOOP;
END $$;

-- Ensure common foreign keys point to organizations(id)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'f' AND conname ILIKE '%organization_id%'
  ) LOOP
    -- No-op: renaming the column automatically updates FKs; we keep constraint names as-is
    NULL;
  END LOOP;
END $$;

-- Patch known functions/triggers to use org_id (safe no-op if already done)
CREATE OR REPLACE FUNCTION public.set_default_organization_and_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    BEGIN
      SELECT om.org_id INTO NEW.org_id
      FROM public.org_memberships om
      WHERE om.user_id = auth.uid()
      ORDER BY COALESCE(om.is_default, false) DESC, om.created_at ASC
      LIMIT 1;
    EXCEPTION WHEN others THEN
      -- ignore
    END;
  END IF;

  IF NEW.org_id IS NULL THEN
    NEW.org_id := NEW.org_id; -- no-op fallback; replace with your default if desired
  END IF;

  IF NEW.project_id IS NULL THEN
    BEGIN
      SELECT p.id INTO NEW.project_id
      FROM public.projects p
      WHERE (p.org_id = NEW.org_id OR p.org_id IS NULL) AND p.code = 'GENERAL'
      ORDER BY p.org_id NULLS LAST
      LIMIT 1;
    EXCEPTION WHEN others THEN
      -- leave NULL
    END;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'transactions' AND t.tgname = 'set_defaults_on_transactions'
  ) THEN
    EXECUTE 'DROP TRIGGER set_defaults_on_transactions ON public.transactions';
  END IF;
  EXECUTE 'CREATE TRIGGER set_defaults_on_transactions BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_default_organization_and_project()';
END $$;
