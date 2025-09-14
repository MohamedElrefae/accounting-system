-- Analysis Work Items Debugging Queries
-- Run these in your Supabase SQL editor to diagnose the issue

-- 1. Check if analysis_work_items exist and verify your user has access
SELECT COUNT(*) as total_analysis_items FROM analysis_work_items;

-- 2. Check if you have organization memberships
SELECT 
  om.user_id,
  om.org_id,
  om.role,
  o.name as org_name,
  o.code as org_code
FROM org_memberships om
JOIN organizations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();

-- 3. Check analysis work items for your organizations
SELECT 
  awi.id,
  awi.code,
  awi.name,
  awi.name_ar,
  awi.is_active,
  o.name as org_name,
  o.code as org_code
FROM analysis_work_items awi
JOIN organizations o ON o.id = awi.org_id
WHERE awi.org_id IN (
  SELECT om.org_id FROM org_memberships om WHERE om.user_id = auth.uid()
)
ORDER BY o.code, awi.code;

-- 4. Test direct access to analysis_work_items table (this should match what the UI is trying to do)
SELECT id, code, name, name_ar, is_active
FROM analysis_work_items
WHERE is_active = true
ORDER BY code;

-- 5. Test the RPC function that was failing
SELECT * FROM list_analysis_work_items(
  p_org_id := (SELECT om.org_id FROM org_memberships om WHERE om.user_id = auth.uid() LIMIT 1),
  p_only_with_tx := false,
  p_project_id := null,
  p_search := null,
  p_include_inactive := true
);

-- 6. Check RLS policies on analysis_work_items table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'analysis_work_items';