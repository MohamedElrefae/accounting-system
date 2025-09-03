-- Cost Centers SQL Helper Functions
-- Run this after the main migration to add tree operation helpers

BEGIN;

-- Function: Get next cost center code
CREATE OR REPLACE FUNCTION public.get_next_cost_center_code(
  p_org_id uuid,
  p_parent_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  parent_code text;
  max_child_num integer;
  next_code text;
BEGIN
  -- If no parent, find next root level code
  IF p_parent_id IS NULL THEN
    SELECT COALESCE(MAX(CAST(code AS integer)), 0) + 1
    INTO max_child_num
    FROM public.cost_centers
    WHERE org_id = p_org_id 
      AND parent_id IS NULL 
      AND code ~ '^[0-9]+$'; -- Only numeric codes
    
    RETURN COALESCE(max_child_num, 1)::text;
  END IF;

  -- Get parent code
  SELECT code INTO parent_code
  FROM public.cost_centers
  WHERE id = p_parent_id AND org_id = p_org_id;

  IF parent_code IS NULL THEN
    RAISE EXCEPTION 'Parent cost center not found';
  END IF;

  -- Find max child number for this parent
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(code FROM LENGTH(parent_code) + 2) -- Skip parent code + dot
      AS integer
    )
  ), 0) + 1
  INTO max_child_num
  FROM public.cost_centers
  WHERE org_id = p_org_id 
    AND parent_id = p_parent_id
    AND code ~ ('^' || parent_code || '\.[0-9]+$'); -- Parent.number pattern

  next_code := parent_code || '.' || max_child_num::text;
  RETURN next_code;
END;
$func$;

-- Function: Get cost centers tree (hierarchical with usage stats)
CREATE OR REPLACE FUNCTION public.get_cost_centers_tree(
  p_org_id uuid,
  p_include_inactive boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  org_id uuid,
  project_id uuid,
  parent_id uuid,
  code text,
  name text,
  name_ar text,
  description text,
  is_active boolean,
  position integer,
  created_at timestamptz,
  updated_at timestamptz,
  level integer,
  child_count integer,
  has_children boolean,
  has_active_children boolean,
  transactions_count bigint,
  last_used_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN QUERY
  WITH RECURSIVE cost_center_hierarchy AS (
    -- Base case: root cost centers
    SELECT 
      cc.id,
      cc.org_id,
      cc.project_id,
      cc.parent_id,
      cc.code,
      cc.name,
      cc.name_ar,
      cc.description,
      cc.is_active,
      cc.position,
      cc.created_at,
      cc.updated_at,
      1 as level,
      ARRAY[cc.code] as path
    FROM public.cost_centers cc
    WHERE cc.org_id = p_org_id
      AND cc.parent_id IS NULL
      AND (p_include_inactive OR cc.is_active)
    
    UNION ALL
    
    -- Recursive case: child cost centers
    SELECT 
      cc.id,
      cc.org_id,
      cc.project_id,
      cc.parent_id,
      cc.code,
      cc.name,
      cc.name_ar,
      cc.description,
      cc.is_active,
      cc.position,
      cc.created_at,
      cc.updated_at,
      cch.level + 1,
      cch.path || cc.code
    FROM public.cost_centers cc
    JOIN cost_center_hierarchy cch ON cc.parent_id = cch.id
    WHERE cc.org_id = p_org_id
      AND (p_include_inactive OR cc.is_active)
      AND cch.level < 10 -- Prevent infinite recursion
  ),
  cost_center_stats AS (
    SELECT 
      cch.id,
      cch.org_id,
      cch.project_id,
      cch.parent_id,
      cch.code,
      cch.name,
      cch.name_ar,
      cch.description,
      cch.is_active,
      cch.position,
      cch.created_at,
      cch.updated_at,
      cch.level,
      -- Child counts
      (SELECT COUNT(*) FROM public.cost_centers child WHERE child.parent_id = cch.id) as child_count,
      (SELECT COUNT(*) > 0 FROM public.cost_centers child WHERE child.parent_id = cch.id) as has_children,
      (SELECT COUNT(*) > 0 FROM public.cost_centers child WHERE child.parent_id = cch.id AND child.is_active) as has_active_children,
      -- Transaction stats
      COALESCE(t_stats.tx_count, 0) as transactions_count,
      t_stats.last_used_at
    FROM cost_center_hierarchy cch
    LEFT JOIN (
      SELECT 
        cost_center_id,
        COUNT(*) as tx_count,
        MAX(created_at) as last_used_at
      FROM public.transactions
      WHERE cost_center_id IS NOT NULL
        AND org_id = p_org_id
      GROUP BY cost_center_id
    ) t_stats ON t_stats.cost_center_id = cch.id
  )
  SELECT 
    cs.id::uuid,
    cs.org_id::uuid,
    cs.project_id::uuid,
    cs.parent_id::uuid,
    cs.code::text,
    cs.name::text,
    cs.name_ar::text,
    cs.description::text,
    cs.is_active::boolean,
    cs.position::integer,
    cs.created_at::timestamptz,
    cs.updated_at::timestamptz,
    cs.level::integer,
    cs.child_count::integer,
    cs.has_children::boolean,
    cs.has_active_children::boolean,
    cs.transactions_count::bigint,
    cs.last_used_at::timestamptz
  FROM cost_center_stats cs
  ORDER BY cs.level, cs.code;
END;
$func$;

-- Function: Get cost center path (breadcrumb)
CREATE OR REPLACE FUNCTION public.get_cost_center_path(p_cost_center_id uuid)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  level integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  RETURN QUERY
  WITH RECURSIVE cost_center_path AS (
    -- Start with the given cost center
    SELECT 
      cc.id,
      cc.code,
      cc.name,
      cc.parent_id,
      1 as level
    FROM public.cost_centers cc
    WHERE cc.id = p_cost_center_id
    
    UNION ALL
    
    -- Recursively get parents
    SELECT 
      cc.id,
      cc.code,
      cc.name,
      cc.parent_id,
      ccp.level + 1
    FROM public.cost_centers cc
    JOIN cost_center_path ccp ON cc.id = ccp.parent_id
  )
  SELECT 
    ccp.id::uuid,
    ccp.code::text,
    ccp.name::text,
    ccp.level::integer
  FROM cost_center_path ccp
  ORDER BY ccp.level DESC; -- Root first
END;
$func$;

-- Add computed column helper for cost center path
CREATE OR REPLACE FUNCTION public.get_cost_center_full_path(p_cost_center_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  full_path text := '';
  rec record;
BEGIN
  FOR rec IN 
    SELECT code, name 
    FROM public.get_cost_center_path(p_cost_center_id) 
    ORDER BY level
  LOOP
    IF full_path != '' THEN
      full_path := full_path || ' > ';
    END IF;
    full_path := full_path || rec.code || ' - ' || rec.name;
  END LOOP;
  
  RETURN full_path;
END;
$func$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_cost_center_code(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_centers_tree(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_center_path(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cost_center_full_path(uuid) TO authenticated;

COMMIT;
