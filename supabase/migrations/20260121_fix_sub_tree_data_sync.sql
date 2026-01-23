-- 2026-01-21: Fix Sub Tree Data Sync Issues
-- This migration fixes data inconsistencies between database, services, and UI

-- ============================================================================
-- ISSUE 1: Direct Query Fallback Missing Fields
-- ============================================================================
-- When views fail, the direct query doesn't include path, linked_account_code, etc.
-- Solution: Ensure path is always populated and add computed fields

-- First, ensure all sub_tree records have valid paths
UPDATE public.sub_tree st
SET path = CASE 
  WHEN parent_id IS NULL THEN code::ltree
  ELSE (SELECT path FROM public.sub_tree WHERE id = st.parent_id) || code::ltree
END
WHERE path IS NULL OR path = ''::ltree;

-- ============================================================================
-- ISSUE 2: Recreate Views with Better Fallback Support
-- ============================================================================

-- Drop existing views to recreate them
DROP VIEW IF EXISTS public.sub_tree_full_v2 CASCADE;
DROP VIEW IF EXISTS public.sub_tree_full CASCADE;

-- Create improved sub_tree_full view with all necessary fields
CREATE OR REPLACE VIEW public.sub_tree_full AS
SELECT
  st.id,
  st.org_id,
  st.parent_id,
  st.code,
  st.description,
  st.add_to_cost,
  st.is_active,
  st.level,
  st.path::text as path,
  st.linked_account_id,
  COALESCE(a.code, '') as linked_account_code,
  COALESCE(a.name, '') as linked_account_name,
  (SELECT COUNT(*)::BIGINT FROM public.sub_tree st2 WHERE st2.parent_id = st.id AND st2.is_active = true) as child_count,
  (SELECT EXISTS(SELECT 1 FROM public.transaction_lines tl WHERE tl.sub_tree_id = st.id LIMIT 1)) as has_transactions,
  st.created_at,
  st.updated_at,
  st.created_by,
  st.updated_by
FROM public.sub_tree st
LEFT JOIN public.accounts a ON a.id = st.linked_account_id
WHERE st.is_active = true;

-- Create optimized v2 view with org_id filter
CREATE OR REPLACE VIEW public.sub_tree_full_v2 AS
SELECT
  st.id,
  st.org_id,
  st.parent_id,
  st.code,
  st.description,
  st.add_to_cost,
  st.is_active,
  st.level,
  st.path::text as path,
  st.linked_account_id,
  COALESCE(a.code, '') as linked_account_code,
  COALESCE(a.name, '') as linked_account_name,
  (SELECT COUNT(*)::BIGINT FROM public.sub_tree st2 
   WHERE st2.org_id = st.org_id AND st2.parent_id = st.id AND st2.is_active = true) as child_count,
  (SELECT EXISTS(SELECT 1 FROM public.transaction_lines tl WHERE tl.sub_tree_id = st.id LIMIT 1)) as has_transactions,
  st.created_at,
  st.updated_at,
  st.created_by,
  st.updated_by
FROM public.sub_tree st
LEFT JOIN public.accounts a ON a.id = st.linked_account_id
WHERE st.is_active = true;

-- ============================================================================
-- ISSUE 3: Add Trigger for Automatic Path Maintenance
-- ============================================================================

-- Create function to maintain path on insert/update
CREATE OR REPLACE FUNCTION public.sub_tree_maintain_path()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate path based on parent
  IF NEW.parent_id IS NULL THEN
    NEW.path := NEW.code::ltree;
    NEW.level := 1;
  ELSE
    SELECT path, level INTO NEW.path, NEW.level
    FROM public.sub_tree
    WHERE id = NEW.parent_id;
    
    IF NEW.path IS NULL THEN
      RAISE EXCEPTION 'Parent not found';
    END IF;
    
    NEW.path := NEW.path || NEW.code::ltree;
    NEW.level := NEW.level + 1;
    
    IF NEW.level > 4 THEN
      RAISE EXCEPTION 'Cannot add children beyond level 4';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_sub_tree_maintain_path ON public.sub_tree;

-- Create trigger
CREATE TRIGGER trg_sub_tree_maintain_path
BEFORE INSERT OR UPDATE OF parent_id, code ON public.sub_tree
FOR EACH ROW
EXECUTE FUNCTION public.sub_tree_maintain_path();

-- ============================================================================
-- ISSUE 4: Add Trigger for Updated_at Timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sub_tree_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sub_tree_update_timestamp ON public.sub_tree;

CREATE TRIGGER trg_sub_tree_update_timestamp
BEFORE UPDATE ON public.sub_tree
FOR EACH ROW
EXECUTE FUNCTION public.sub_tree_update_timestamp();

-- ============================================================================
-- ISSUE 5: Improve RPC Functions with Better Error Handling
-- ============================================================================

-- Drop and recreate create_sub_tree with trigger support
DROP FUNCTION IF EXISTS public.create_sub_tree CASCADE;

CREATE OR REPLACE FUNCTION public.create_sub_tree(
  p_org_id UUID,
  p_code VARCHAR,
  p_description VARCHAR,
  p_add_to_cost BOOLEAN DEFAULT FALSE,
  p_parent_id UUID DEFAULT NULL,
  p_linked_account_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_parent_level INTEGER;
BEGIN
  -- Validate inputs
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID is required';
  END IF;
  
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RAISE EXCEPTION 'Code is required';
  END IF;
  
  IF p_description IS NULL OR TRIM(p_description) = '' THEN
    RAISE EXCEPTION 'الوصف مطلوب (1..300)';
  END IF;
  
  IF LENGTH(TRIM(p_description)) > 300 THEN
    RAISE EXCEPTION 'الوصف يجب ألا يزيد عن 300 حرف';
  END IF;

  -- Validate parent if provided
  IF p_parent_id IS NOT NULL THEN
    SELECT level INTO v_parent_level FROM public.sub_tree WHERE id = p_parent_id;
    IF v_parent_level IS NULL THEN
      RAISE EXCEPTION 'Parent category not found';
    END IF;
    IF v_parent_level >= 4 THEN
      RAISE EXCEPTION 'Cannot add children beyond level 4';
    END IF;
  END IF;

  -- Validate linked account if provided
  IF p_linked_account_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_linked_account_id) THEN
      RAISE EXCEPTION 'Linked account not found';
    END IF;
  END IF;

  -- Insert the new record (triggers will handle path and level)
  INSERT INTO public.sub_tree (
    org_id, parent_id, code, description, add_to_cost, is_active, linked_account_id, created_by
  ) VALUES (
    p_org_id, p_parent_id, TRIM(p_code), TRIM(p_description), p_add_to_cost, TRUE, p_linked_account_id, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate update_sub_tree with better validation
DROP FUNCTION IF EXISTS public.update_sub_tree CASCADE;

CREATE OR REPLACE FUNCTION public.update_sub_tree(
  p_id UUID,
  p_code VARCHAR DEFAULT NULL,
  p_description VARCHAR DEFAULT NULL,
  p_add_to_cost BOOLEAN DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_linked_account_id UUID DEFAULT NULL,
  p_clear_linked_account BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate description if provided
  IF p_description IS NOT NULL THEN
    IF TRIM(p_description) = '' THEN
      RAISE EXCEPTION 'الوصف مطلوب (1..300)';
    END IF;
    IF LENGTH(TRIM(p_description)) > 300 THEN
      RAISE EXCEPTION 'الوصف يجب ألا يزيد عن 300 حرف';
    END IF;
  END IF;

  -- Validate linked account if provided
  IF p_linked_account_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_linked_account_id) THEN
      RAISE EXCEPTION 'Linked account not found';
    END IF;
  END IF;

  UPDATE public.sub_tree
  SET
    code = COALESCE(NULLIF(TRIM(p_code), ''), code),
    description = COALESCE(NULLIF(TRIM(p_description), ''), description),
    add_to_cost = COALESCE(p_add_to_cost, add_to_cost),
    is_active = COALESCE(p_is_active, is_active),
    linked_account_id = CASE
      WHEN p_clear_linked_account THEN NULL
      WHEN p_linked_account_id IS NOT NULL THEN p_linked_account_id
      ELSE linked_account_id
    END
  WHERE id = p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ISSUE 6: Improve RPC for Next Code Generation
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_sub_tree_next_code CASCADE;

CREATE OR REPLACE FUNCTION public.rpc_sub_tree_next_code(
  p_org_id UUID,
  p_parent_id UUID DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
  v_max_code INTEGER;
  v_prefix VARCHAR;
  v_parent_code VARCHAR;
BEGIN
  -- Get parent code if exists
  IF p_parent_id IS NOT NULL THEN
    SELECT code INTO v_parent_code FROM public.sub_tree WHERE id = p_parent_id;
    IF v_parent_code IS NULL THEN
      RAISE EXCEPTION 'Parent not found';
    END IF;
    v_prefix := v_parent_code || '.';
  ELSE
    v_prefix := '';
  END IF;

  -- Get the max numeric code at this level
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM LENGTH(v_prefix) + 1) AS INTEGER)), 0)
  INTO v_max_code
  FROM public.sub_tree
  WHERE org_id = p_org_id
    AND (p_parent_id IS NULL AND parent_id IS NULL OR p_parent_id IS NOT NULL AND parent_id = p_parent_id);

  RETURN v_prefix || LPAD((v_max_code + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- ISSUE 7: Ensure Proper Indexes
-- ============================================================================

-- Drop redundant indexes
DROP INDEX IF EXISTS public.idx_exp_cat_org;
DROP INDEX IF EXISTS public.idx_exp_cat_parent;
DROP INDEX IF EXISTS public.idx_exp_cat_path_gist;
DROP INDEX IF EXISTS public.idx_exp_cat_path_btree;
DROP INDEX IF EXISTS public.ix_sub_tree_org;
DROP INDEX IF EXISTS public.ix_sub_tree_parent;
DROP INDEX IF EXISTS public.ix_sub_tree_path;
DROP INDEX IF EXISTS public.ix_ec_code;
DROP INDEX IF EXISTS public.ix_ec_lower_desc;

-- Ensure essential indexes exist
CREATE INDEX IF NOT EXISTS idx_sub_tree_org_id ON public.sub_tree(org_id);
CREATE INDEX IF NOT EXISTS idx_sub_tree_parent_id ON public.sub_tree(parent_id);
CREATE INDEX IF NOT EXISTS idx_sub_tree_org_parent ON public.sub_tree(org_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_sub_tree_org_path ON public.sub_tree(org_id, path);
CREATE INDEX IF NOT EXISTS idx_sub_tree_is_active ON public.sub_tree(is_active);
CREATE INDEX IF NOT EXISTS idx_sub_tree_linked_account ON public.sub_tree(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_sub_tree_org_code ON public.sub_tree(org_id, code);

-- ============================================================================
-- ISSUE 8: Verify Data Integrity
-- ============================================================================

-- Check for orphaned records (parent_id doesn't exist)
-- SELECT id, code, parent_id FROM public.sub_tree 
-- WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM public.sub_tree);

-- Check for invalid levels
-- SELECT id, code, level FROM public.sub_tree WHERE level < 1 OR level > 4;

-- Check for invalid descriptions
-- SELECT id, code, description FROM public.sub_tree 
-- WHERE description IS NULL OR LENGTH(description) < 1 OR LENGTH(description) > 300;

-- ============================================================================
-- ISSUE 9: Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.sub_tree_maintain_path TO authenticated;
GRANT EXECUTE ON FUNCTION public.sub_tree_update_timestamp TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sub_tree_next_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sub_tree TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sub_tree TO authenticated;

-- ============================================================================
-- ISSUE 10: Analyze Table for Query Optimization
-- ============================================================================

ANALYZE public.sub_tree;
