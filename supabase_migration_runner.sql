-- ================================================================
-- SUPABASE MIGRATION RUNNER - Construction Chart of Accounts
-- ================================================================
-- Copy and paste each section individually into Supabase SQL Editor
-- Do NOT run all at once - execute section by section

-- ================================================================
-- SECTION 1: BACKUP (Run first)
-- ================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS accounts_backup_migration AS 
SELECT * FROM accounts;

CREATE TABLE IF NOT EXISTS transactions_backup_migration AS
SELECT * FROM transactions;

CREATE TABLE IF NOT EXISTS transaction_entries_backup_migration AS
SELECT * FROM transaction_entries;

CREATE TABLE IF NOT EXISTS account_prefix_map_backup_migration AS
SELECT * FROM account_prefix_map;

SELECT 'Backup Section 1 Completed - ' || now()::text as status;

COMMIT;

-- ================================================================
-- SECTION 2: CLEANUP (Run after Section 1)
-- ================================================================

BEGIN;

-- Get organization ID
DO $$
DECLARE 
    target_org_id UUID;
BEGIN
    SELECT id INTO target_org_id 
    FROM organizations 
    WHERE code = 'MAIN' 
    LIMIT 1;
    
    IF target_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization MAIN not found';
    END IF;
    
    -- Clean existing data
    DELETE FROM transaction_entries WHERE transaction_id IN (
        SELECT id FROM transactions WHERE org_id = target_org_id
    );
    
    DELETE FROM transactions WHERE org_id = target_org_id;
    
    RAISE NOTICE 'Cleanup completed for org: %', target_org_id;
END $$;

SELECT 'Cleanup Section 2 Completed - ' || now()::text as status;

COMMIT;

-- ================================================================
-- SECTION 3: MIGRATION (Run after Section 2) 
-- ================================================================
-- Copy the main migration script content here
-- Use the fixed construction_chart_of_accounts_migration.sql content

-- ================================================================  
-- SECTION 4: VERIFICATION (Run last)
-- ================================================================

-- Verify the migration
SELECT 
    'Migration Verification' as check_type,
    COUNT(*) as total_accounts,
    COUNT(*) FILTER (WHERE level = 1) as level_1_accounts,
    COUNT(*) FILTER (WHERE level = 2) as level_2_accounts, 
    COUNT(*) FILTER (WHERE level = 3) as level_3_accounts
FROM accounts 
WHERE org_id = (SELECT id FROM organizations WHERE code = 'MAIN' LIMIT 1);

-- Check bilingual support
SELECT 
    'Bilingual Check' as check_type,
    COUNT(*) FILTER (WHERE name IS NOT NULL AND name != '') as has_english_names,
    COUNT(*) FILTER (WHERE name_ar IS NOT NULL AND name_ar != '') as has_arabic_names,
    COUNT(*) as total_accounts
FROM accounts 
WHERE org_id = (SELECT id FROM organizations WHERE code = 'MAIN' LIMIT 1);

SELECT 'Verification Completed - ' || now()::text as status;
