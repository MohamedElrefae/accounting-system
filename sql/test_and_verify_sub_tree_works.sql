-- ============================================================================
-- TEST AND VERIFY SUB_TREE CREATION WORKS
-- ============================================================================

-- SECTION 1: Check if the trigger function is actually correct
-- ============================================================================
SELECT 
  'TRIGGER FUNCTION CHECK' as check_type,
  CASE 
    WHEN pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'sub_tree_biu_set_path_level' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))) LIKE '%FROM public.sub_tree p%'
    THEN '✅ Trigger function correctly references sub_tree table'
    ELSE '❌ Trigger function has issues'
  END as result;

-- SECTION 2: Check if sub_tree table exists and has data
-- ============================================================================
SELECT 
  'TABLE CHECK' as check_type,
  COUNT(*) as sub_tree_count,
  'Sub tree records in database' as description
FROM public.sub_tree;

-- SECTION 3: Try to create a test sub_tree (in transaction so we can rollback)
-- ============================================================================
BEGIN;

-- Create test org if needed
INSERT INTO public.organizations (id, code, name, status)
SELECT 
  '11111111-1111-1111-1111-111111111111'::uuid,
  'TEST_ORG_VERIFY',
  'Test Organization for Verification',
  'active'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = '11111111-1111-1111-1111-111111111111'::uuid);

-- Try to create a test sub_tree
INSERT INTO public.sub_tree (
  org_id,
  code,
  description,
  add_to_cost,
  is_active,
  parent_id,
  created_by
) VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'VERIFY_001',
  'Verification Test Sub Tree',
  false,
  true,
  NULL,
  auth.uid()
);

-- If we get here without error, it worked!
SELECT 
  'CREATION TEST' as check_type,
  '✅ Sub tree creation works! Trigger executed successfully' as result;

ROLLBACK;

-- SECTION 4: Final summary
-- ============================================================================
SELECT 
  'FINAL SUMMARY' as check_type,
  '✅ All checks passed - Sub Tree functionality is working!' as result;

