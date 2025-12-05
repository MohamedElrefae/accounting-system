-- Verification SQL for wizard draft support migration
-- Run this after applying 072_wizard_draft_support.sql to verify success

-- ============================================================
-- 1. Verify columns exist
-- ============================================================

SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND table_schema = 'public'
  AND column_name IN ('is_wizard_draft', 'wizard_draft_created_at')
ORDER BY column_name;

-- Expected output:
-- | column_name             | data_type                   | column_default | is_nullable |
-- |-------------------------|-----------------------------| ---------------|-------------|
-- | is_wizard_draft         | boolean                     | false          | YES         |
-- | wizard_draft_created_at | timestamp with time zone    | NULL           | YES         |

-- ============================================================
-- 2. Verify index exists
-- ============================================================

SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'transactions' 
  AND indexname = 'idx_transactions_wizard_draft';

-- Expected: Should return 1 row with the index definition

-- ============================================================
-- 3. Verify functions exist
-- ============================================================

SELECT 
  routine_name, 
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('cleanup_wizard_drafts', 'delete_wizard_draft');

-- Expected: Should return 2 rows

-- ============================================================
-- 4. Test cleanup function (dry run - check count)
-- ============================================================

SELECT COUNT(*) as orphaned_drafts
FROM transactions 
WHERE is_wizard_draft = TRUE 
  AND wizard_draft_created_at < NOW() - INTERVAL '24 hours';

-- This shows how many drafts would be cleaned up

-- ============================================================
-- 5. Check current wizard drafts (should be 0 initially)
-- ============================================================

SELECT COUNT(*) as current_wizard_drafts
FROM transactions 
WHERE is_wizard_draft = TRUE;

