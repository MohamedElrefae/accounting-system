-- ============================================================================
-- Fix Stack Depth Error on transaction_line_items
-- The error "stack depth limit exceeded" means there's a recursive trigger
-- ============================================================================

-- Step 1: List all USER triggers on transaction_line_items (not system triggers)
SELECT 
  tgname AS trigger_name,
  tgtype,
  proname AS function_name,
  tgenabled,
  CASE WHEN tgisinternal THEN 'SYSTEM' ELSE 'USER' END as trigger_type
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'transaction_line_items'::regclass
  AND NOT tgisinternal  -- Only user-defined triggers
ORDER BY tgname;

-- Step 2: Disable only USER triggers (not system/FK triggers)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'transaction_line_items'::regclass 
      AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE transaction_line_items DISABLE TRIGGER %I', r.tgname);
    RAISE NOTICE 'Disabled trigger: %', r.tgname;
  END LOOP;
END $$;

-- Step 3: Test a simple select (should work now)
SELECT * FROM transaction_line_items LIMIT 5;

-- Step 4: Re-enable user triggers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'transaction_line_items'::regclass 
      AND NOT tgisinternal
  LOOP
    EXECUTE format('ALTER TABLE transaction_line_items ENABLE TRIGGER %I', r.tgname);
    RAISE NOTICE 'Enabled trigger: %', r.tgname;
  END LOOP;
END $$;

-- ============================================================================
-- Check for RLS policies that might cause recursion
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 100) as qual_preview,
  LEFT(with_check::text, 100) as with_check_preview
FROM pg_policies 
WHERE tablename = 'transaction_line_items';

-- ============================================================================
-- If a specific trigger function is causing recursion, add a guard:
-- ============================================================================
-- Find the trigger function and add this at the start:
--
-- IF pg_trigger_depth() > 1 THEN
--   RETURN NEW;
-- END IF;
--
-- This prevents the trigger from running recursively.

-- ============================================================================
-- Quick fix: If RLS is causing the issue, check if policies reference the same table
-- ============================================================================
-- Look for policies that SELECT from transaction_line_items within their conditions
-- These can cause infinite recursion

-- To temporarily disable RLS for testing:
-- ALTER TABLE transaction_line_items DISABLE ROW LEVEL SECURITY;

-- To re-enable:
-- ALTER TABLE transaction_line_items ENABLE ROW LEVEL SECURITY;
