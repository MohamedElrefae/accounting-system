-- ============================================================================
-- TEST SUB_TREE CREATION
-- ============================================================================
-- This tests if sub_tree creation actually works despite the error message

-- First, let's see if we can create a test sub_tree
BEGIN;

-- Create a test organization if needed
INSERT INTO public.organizations (id, code, name, status)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'TEST_ORG',
  'Test Organization',
  'active'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = '00000000-0000-0000-0000-000000000001'::uuid);

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
  '00000000-0000-0000-0000-000000000001'::uuid,
  'TEST_001',
  'Test Sub Tree',
  false,
  true,
  NULL,
  auth.uid()
);

-- If we get here, it worked!
SELECT 'SUCCESS - Sub tree creation works!' as result;

ROLLBACK;

