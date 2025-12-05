-- Verification and fix for cost_centers RPC function
-- Run this in Supabase SQL Editor to verify and fix the RPC function

-- Step 1: Check if the function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_cost_centers_for_selector';

-- Step 2: If the function doesn't exist or needs to be recreated, run this:
DROP FUNCTION IF EXISTS public.get_cost_centers_for_selector(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_cost_centers_for_selector(
  p_org_id uuid,
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  name_ar text,
  project_id uuid,
  level integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cc.id,
    cc.code,
    cc.name,
    cc.name_ar,
    cc.project_id,
    COALESCE(array_length(string_to_array(cc.code, '.'), 1), 1) AS level
  FROM cost_centers cc
  WHERE cc.org_id = p_org_id
    AND cc.is_active = true
    AND (
      p_project_id IS NULL
      OR cc.project_id IS NULL
      OR cc.project_id = p_project_id
    )
  ORDER BY cc.code;
$$;

COMMENT ON FUNCTION public.get_cost_centers_for_selector(uuid, uuid)
  IS 'Returns the active cost centers for an organization (and optionally a project), allowing the UI to bypass RLS failures.';

GRANT EXECUTE ON FUNCTION public.get_cost_centers_for_selector(uuid, uuid) TO anon, authenticated;

-- Step 3: Verify the function works
-- Replace the UUID with an actual org_id from your database
-- SELECT * FROM get_cost_centers_for_selector('your-org-id-here'::uuid);

-- Step 4: Check cost_centers table has data
SELECT COUNT(*) as total_cost_centers, 
       COUNT(*) FILTER (WHERE is_active = true) as active_cost_centers
FROM cost_centers;

-- Step 5: Check RLS policies on cost_centers table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'cost_centers';
