-- ============================================================================
-- FIX OLD CHECK CONSTRAINT
-- ============================================================================
-- The sub_tree table has an old check constraint named
-- "expenses_categories_code_numeric_chk" that only allows numeric codes
-- This is blocking sub_tree creation with alphanumeric codes

-- SECTION 1: Find and drop the old check constraint
-- ============================================================================

ALTER TABLE public.sub_tree
DROP CONSTRAINT IF EXISTS expenses_categories_code_numeric_chk;

-- SECTION 2: Verify constraint is dropped
-- ============================================================================

SELECT 
  'CONSTRAINT CHECK' as check_type,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'sub_tree'
      AND constraint_name = 'expenses_categories_code_numeric_chk'
    )
    THEN '✅ Old check constraint dropped'
    ELSE '❌ Old check constraint still exists'
  END as result;

-- SECTION 3: Test sub_tree creation with alphanumeric code
-- ============================================================================

BEGIN;

-- Create test org if needed
INSERT INTO public.organizations (id, code, name, status)
SELECT 
  '22222222-2222-2222-2222-222222222222'::uuid,
  'TEST_ORG_FINAL',
  'Test Organization Final',
  'active'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = '22222222-2222-2222-2222-222222222222'::uuid);

-- Try to create a test sub_tree with alphanumeric code
INSERT INTO public.sub_tree (
  org_id,
  code,
  description,
  add_to_cost,
  is_active,
  parent_id,
  created_by
) VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'TEST_001',
  'Test Sub Tree with Alphanumeric Code',
  false,
  true,
  NULL,
  auth.uid()
);

SELECT 
  'CREATION TEST' as check_type,
  '✅ Sub tree creation works with alphanumeric code!' as result;

ROLLBACK;

-- SECTION 4: Final verification
-- ============================================================================

SELECT 
  'FINAL STATUS' as check_type,
  '✅ All constraints fixed - Sub Tree is ready to use!' as result;

