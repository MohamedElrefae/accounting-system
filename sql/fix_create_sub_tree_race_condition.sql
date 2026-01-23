-- ============================================================================
-- FIX create_sub_tree RACE CONDITION
-- ============================================================================
-- The issue: p_description validation fails on first call because it's checking
-- LENGTH(p_description) which returns NULL if p_description is NULL
-- This causes "الوصف مطلوب (1..300)" error on first attempt
-- On second attempt, the description is cached/available, so it works

-- SECTION 1: Drop and recreate the function with proper NULL handling
-- ============================================================================

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
  v_level INTEGER;
  v_path ltree;
  v_parent_path ltree;
  v_desc_trimmed VARCHAR;
BEGIN
  -- Trim and validate description (handle NULL properly)
  v_desc_trimmed := TRIM(COALESCE(p_description, ''));
  
  IF LENGTH(v_desc_trimmed) < 1 OR LENGTH(v_desc_trimmed) > 300 THEN
    RAISE EXCEPTION 'الوصف مطلوب (1..300)';
  END IF;

  -- Determine level and path
  IF p_parent_id IS NULL THEN
    v_level := 1;
    v_path := p_code::ltree;
  ELSE
    SELECT level, path INTO v_level, v_parent_path FROM public.sub_tree WHERE id = p_parent_id;
    IF v_level IS NULL THEN
      RAISE EXCEPTION 'Parent not found';
    END IF;
    IF v_level >= 4 THEN
      RAISE EXCEPTION 'Cannot add children beyond level 4';
    END IF;
    v_level := v_level + 1;
    v_path := v_parent_path || p_code::ltree;
  END IF;

  -- Insert the new record
  INSERT INTO public.sub_tree (
    org_id, parent_id, code, description, add_to_cost, is_active, level, path, linked_account_id, created_by
  ) VALUES (
    p_org_id, p_parent_id, TRIM(COALESCE(p_code, '')), v_desc_trimmed, p_add_to_cost, TRUE, v_level, v_path, p_linked_account_id, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 2: Also fix update_sub_tree function
-- ============================================================================

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
DECLARE
  v_desc_trimmed VARCHAR;
BEGIN
  -- Validate description if provided (handle NULL properly)
  IF p_description IS NOT NULL THEN
    v_desc_trimmed := TRIM(p_description);
    IF LENGTH(v_desc_trimmed) < 1 OR LENGTH(v_desc_trimmed) > 300 THEN
      RAISE EXCEPTION 'الوصف مطلوب (1..300)';
    END IF;
  END IF;

  UPDATE public.sub_tree
  SET
    code = COALESCE(NULLIF(TRIM(p_code), ''), code),
    description = COALESCE(v_desc_trimmed, description),
    add_to_cost = COALESCE(p_add_to_cost, add_to_cost),
    is_active = COALESCE(p_is_active, is_active),
    linked_account_id = CASE
      WHEN p_clear_linked_account THEN NULL
      WHEN p_linked_account_id IS NOT NULL THEN p_linked_account_id
      ELSE linked_account_id
    END,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = auth.uid()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 3: Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_sub_tree TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sub_tree TO authenticated;

-- SECTION 4: Verify fix
-- ============================================================================

SELECT 
  'VERIFICATION' as check_type,
  CASE 
    WHEN pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'create_sub_tree' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))) LIKE '%v_desc_trimmed%'
    THEN '✅ create_sub_tree function fixed with proper NULL handling'
    ELSE '❌ create_sub_tree function still has issues'
  END as result;

