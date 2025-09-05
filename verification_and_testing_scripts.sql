-- ================================================================
-- CHART OF ACCOUNTS MIGRATION - VERIFICATION AND TESTING
-- ================================================================
-- This script provides comprehensive verification and testing for the 
-- construction chart of accounts migration
-- Run AFTER completing all migration scripts

BEGIN;

-- Create a comprehensive verification report
CREATE OR REPLACE FUNCTION verify_construction_coa_migration()
RETURNS TABLE (
    test_category TEXT,
    test_name TEXT,
    expected_value TEXT,
    actual_value TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    target_org_id UUID;
    account_count_by_level JSON;
    postable_accounts_count INTEGER;
    non_postable_accounts_count INTEGER;
    bilingual_accounts_count INTEGER;
    construction_specific_count INTEGER;
BEGIN
    -- Get target organization
    SELECT id INTO target_org_id FROM organizations WHERE code = 'MAIN' LIMIT 1;
    
    -- ================================================================
    -- TEST 1: Organization Setup
    -- ================================================================
    IF target_org_id IS NULL THEN
        RETURN QUERY VALUES (
            'Organization Setup',
            'Target Organization Exists',
            'UUID',
            'NULL',
            'FAIL',
            'Main organization not found'
        );
        RETURN;
    ELSE
        RETURN QUERY VALUES (
            'Organization Setup',
            'Target Organization Exists',
            'UUID',
            target_org_id::TEXT,
            'PASS',
            'Main organization found successfully'
        );
    END IF;
    
    -- ================================================================
    -- TEST 2: Account Structure Verification
    -- ================================================================
    
    -- Test Level 1 accounts (5 expected: Assets, Liabilities, Equity, Revenue, Expenses)
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id AND level = 1;
    
    RETURN QUERY VALUES (
        'Account Structure',
        'Level 1 Accounts Count',
        '5',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count = 5 THEN 'PASS' ELSE 'FAIL' END,
        'Main account categories: Assets, Liabilities, Equity, Revenue, Expenses'
    );
    
    -- Test Level 2 accounts count
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id AND level = 2;
    
    RETURN QUERY VALUES (
        'Account Structure',
        'Level 2 Accounts Count',
        '>=10',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count >= 10 THEN 'PASS' ELSE 'FAIL' END,
        'Sub-category accounts'
    );
    
    -- Test Level 3 accounts count
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id AND level = 3;
    
    RETURN QUERY VALUES (
        'Account Structure',
        'Level 3 Accounts Count',
        '>=15',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count >= 15 THEN 'PASS' ELSE 'FAIL' END,
        'Sub-sub-category accounts'
    );
    
    -- Test Level 4 accounts (postable accounts)
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id AND level = 4 AND is_postable = true;
    
    RETURN QUERY VALUES (
        'Account Structure',
        'Level 4 Postable Accounts Count',
        '>=20',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count >= 20 THEN 'PASS' ELSE 'FAIL' END,
        'Detailed postable accounts for transactions'
    );
    
    -- ================================================================
    -- TEST 3: Bilingual Support Verification
    -- ================================================================
    
    -- Test accounts with both English and Arabic names
    SELECT count(*) INTO bilingual_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND name IS NOT NULL AND name != ''
    AND name_ar IS NOT NULL AND name_ar != '';
    
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id;
    
    RETURN QUERY VALUES (
        'Bilingual Support',
        'Bilingual Accounts Percentage',
        '100%',
        ROUND((bilingual_accounts_count::DECIMAL / postable_accounts_count * 100), 2)::TEXT || '%',
        CASE WHEN bilingual_accounts_count = postable_accounts_count THEN 'PASS' ELSE 'FAIL' END,
        'All accounts should have both English and Arabic names'
    );
    
    -- ================================================================
    -- TEST 4: Construction-Specific Features
    -- ================================================================
    
    -- Test for Work in Progress accounts (construction-specific)
    SELECT count(*) INTO construction_specific_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND (name ILIKE '%work in progress%' OR name_ar LIKE '%أعمال تحت التنفيذ%'
         OR code LIKE '16%');
    
    RETURN QUERY VALUES (
        'Construction Features',
        'Work in Progress Accounts',
        '>=2',
        construction_specific_count::TEXT,
        CASE WHEN construction_specific_count >= 2 THEN 'PASS' ELSE 'FAIL' END,
        'WIP accounts for construction projects'
    );
    
    -- Test for Retention accounts (construction-specific)
    SELECT count(*) INTO construction_specific_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND (name ILIKE '%retention%' OR name_ar LIKE '%احتجاز%');
    
    RETURN QUERY VALUES (
        'Construction Features',
        'Retention Accounts',
        '>=2',
        construction_specific_count::TEXT,
        CASE WHEN construction_specific_count >= 2 THEN 'PASS' ELSE 'FAIL' END,
        'Retention receivable and payable accounts'
    );
    
    -- Test for Contract Assets/Liabilities (IFRS 15 compliance)
    SELECT count(*) INTO construction_specific_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND (name ILIKE '%contract asset%' OR name ILIKE '%contract liabilit%'
         OR name_ar LIKE '%أصول تعاقدية%' OR name_ar LIKE '%التزامات تعاقدية%');
    
    RETURN QUERY VALUES (
        'Construction Features',
        'Contract Assets/Liabilities (IFRS 15)',
        '>=2',
        construction_specific_count::TEXT,
        CASE WHEN construction_specific_count >= 2 THEN 'PASS' ELSE 'FAIL' END,
        'IFRS 15 compliant contract accounting'
    );
    
    -- ================================================================
    -- TEST 5: Account Categories and Normal Balances
    -- ================================================================
    
    -- Test Asset accounts have debit normal balance
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND category = 'asset' 
    AND normal_balance != 'debit';
    
    RETURN QUERY VALUES (
        'Account Categories',
        'Asset Accounts Normal Balance',
        '0 (All should be debit)',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Asset accounts should have debit normal balance'
    );
    
    -- Test Liability accounts have credit normal balance
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND category = 'liability' 
    AND normal_balance != 'credit';
    
    RETURN QUERY VALUES (
        'Account Categories',
        'Liability Accounts Normal Balance',
        '0 (All should be credit)',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Liability accounts should have credit normal balance'
    );
    
    -- ================================================================
    -- TEST 6: Account Hierarchy and Paths
    -- ================================================================
    
    -- Test path structure consistency
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND level > 1 
    AND parent_id IS NULL;
    
    RETURN QUERY VALUES (
        'Account Hierarchy',
        'Orphaned Accounts (Level > 1 without parent)',
        '0',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count = 0 THEN 'PASS' ELSE 'FAIL' END,
        'All non-root accounts should have a parent'
    );
    
    -- Test path format consistency
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND level = 2 
    AND path !~ '^\d{4}\.\d{4}$';
    
    RETURN QUERY VALUES (
        'Account Hierarchy',
        'Level 2 Path Format',
        '0 (All should follow XXXX.XXXX format)',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Level 2 accounts should follow correct path format'
    );
    
    -- ================================================================
    -- TEST 7: Transaction Capability
    -- ================================================================
    
    -- Test postable accounts have allow_transactions = true
    SELECT count(*) INTO postable_accounts_count
    FROM accounts 
    WHERE org_id = target_org_id 
    AND is_postable = true 
    AND allow_transactions = false;
    
    RETURN QUERY VALUES (
        'Transaction Capability',
        'Postable Accounts with Transaction Flag',
        '0 (All postable should allow transactions)',
        postable_accounts_count::TEXT,
        CASE WHEN postable_accounts_count = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Postable accounts should allow transactions'
    );
    
    -- ================================================================
    -- TEST 8: Account Prefix Map Update
    -- ================================================================
    
    -- Test account prefix map has construction-specific entries
    SELECT count(*) INTO construction_specific_count
    FROM account_prefix_map 
    WHERE prefix IN ('16', '21', '22', '41', '51', '52') 
    AND is_active = true;
    
    RETURN QUERY VALUES (
        'System Configuration',
        'Construction Account Prefixes',
        '6',
        construction_specific_count::TEXT,
        CASE WHEN construction_specific_count >= 6 THEN 'PASS' ELSE 'FAIL' END,
        'Account prefix map updated for construction numbering'
    );
    
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- RUN COMPREHENSIVE VERIFICATION
-- ================================================================

SELECT 
    test_category,
    test_name,
    expected_value,
    actual_value,
    status,
    details
FROM verify_construction_coa_migration()
ORDER BY 
    CASE test_category 
        WHEN 'Organization Setup' THEN 1
        WHEN 'Account Structure' THEN 2
        WHEN 'Bilingual Support' THEN 3
        WHEN 'Construction Features' THEN 4
        WHEN 'Account Categories' THEN 5
        WHEN 'Account Hierarchy' THEN 6
        WHEN 'Transaction Capability' THEN 7
        WHEN 'System Configuration' THEN 8
        ELSE 9
    END,
    test_name;

-- ================================================================
-- DETAILED ACCOUNT ANALYSIS
-- ================================================================

-- Show account structure summary
SELECT 
    'Account Structure Summary' as report_type,
    level,
    category,
    count(*) as account_count,
    count(*) FILTER (WHERE is_postable = true) as postable_count,
    count(*) FILTER (WHERE name_ar IS NOT NULL AND name_ar != '') as bilingual_count
FROM accounts 
WHERE org_id = (SELECT id FROM organizations WHERE code = 'MAIN' LIMIT 1)
GROUP BY level, category
ORDER BY level, category;

-- Show construction-specific accounts
SELECT 
    'Construction-Specific Accounts' as report_type,
    level,
    code,
    name,
    name_ar,
    category,
    is_postable
FROM accounts 
WHERE org_id = (SELECT id FROM organizations WHERE code = 'MAIN' LIMIT 1)
AND (
    code LIKE '16%' OR  -- Work in Progress
    name ILIKE '%retention%' OR name_ar LIKE '%احتجاز%' OR  -- Retentions
    name ILIKE '%contract asset%' OR name_ar LIKE '%أصول تعاقدية%' OR  -- Contract assets
    name ILIKE '%contract liabilit%' OR name_ar LIKE '%التزامات تعاقدية%' OR  -- Contract liabilities
    name ILIKE '%subcontractor%' OR name_ar LIKE '%مقاول%' -- Subcontractors
)
ORDER BY code;

-- ================================================================
-- SAMPLE TRANSACTION TEST (OPTIONAL)
-- ================================================================

-- Create a test function to verify account relationships work for transactions
CREATE OR REPLACE FUNCTION test_transaction_capability()
RETURNS TABLE (
    test_name TEXT,
    account_code TEXT,
    account_name TEXT,
    can_post BOOLEAN,
    test_result TEXT
) AS $$
DECLARE
    test_debit_account UUID;
    test_credit_account UUID;
    test_entry_number TEXT := 'TEST-001';
    test_org_id UUID;
BEGIN
    -- Get organization
    SELECT id INTO test_org_id FROM organizations WHERE code = 'MAIN' LIMIT 1;
    
    -- Test if we can identify suitable accounts for a sample transaction
    -- Get a cash account (debit side)
    SELECT id INTO test_debit_account
    FROM accounts 
    WHERE org_id = test_org_id 
    AND is_postable = true 
    AND category = 'asset'
    AND code LIKE '111%'  -- Cash accounts
    LIMIT 1;
    
    -- Get a capital account (credit side)  
    SELECT id INTO test_credit_account
    FROM accounts 
    WHERE org_id = test_org_id 
    AND is_postable = true 
    AND category = 'equity'
    AND code LIKE '311%'  -- Capital accounts
    LIMIT 1;
    
    -- Return test results
    RETURN QUERY 
    SELECT 
        'Sample Transaction Setup',
        a.code,
        a.name,
        a.is_postable,
        CASE WHEN a.is_postable THEN 'READY' ELSE 'NOT READY' END
    FROM accounts a
    WHERE a.id IN (test_debit_account, test_credit_account)
    ORDER BY a.code;
    
    -- Summary test result
    IF test_debit_account IS NOT NULL AND test_credit_account IS NOT NULL THEN
        RETURN QUERY VALUES (
            'Transaction Readiness Test',
            'SYSTEM',
            'Ready for sample transactions',
            true,
            'PASS - Can create test transactions'
        );
    ELSE
        RETURN QUERY VALUES (
            'Transaction Readiness Test',
            'SYSTEM',
            'Missing required postable accounts',
            false,
            'FAIL - Cannot create test transactions'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Run transaction capability test
SELECT * FROM test_transaction_capability();

COMMIT;

-- ================================================================
-- MIGRATION COMPLETION SUMMARY
-- ================================================================

-- Final summary report
SELECT 
    '=== CONSTRUCTION CHART OF ACCOUNTS MIGRATION SUMMARY ===' as summary_header
UNION ALL
SELECT 
    'Migration Date: ' || now()::DATE::TEXT
UNION ALL
SELECT 
    'Organization: ' || COALESCE(name, 'MAIN') 
    FROM organizations WHERE code = 'MAIN' LIMIT 1
UNION ALL
SELECT 
    'Total Accounts Created: ' || count(*)::TEXT
    FROM accounts WHERE org_id = (SELECT id FROM organizations WHERE code = 'MAIN' LIMIT 1)
UNION ALL
SELECT 
    'Postable Accounts: ' || count(*)::TEXT
    FROM accounts 
    WHERE org_id = (SELECT id FROM organizations WHERE code = 'MAIN' LIMIT 1)
    AND is_postable = true
UNION ALL
SELECT 
    'Bilingual Support: ' || 
    CASE WHEN count(*) FILTER (WHERE name_ar IS NOT NULL AND name_ar != '') = count(*) 
         THEN 'COMPLETE' ELSE 'INCOMPLETE' END
    FROM accounts WHERE org_id = (SELECT id FROM organizations WHERE code = 'MAIN' LIMIT 1)
UNION ALL
SELECT 
    'Construction Features: ENABLED (WIP, Retentions, Contract Assets/Liabilities)'
UNION ALL
SELECT 
    'Status: MIGRATION COMPLETED - READY FOR TESTING';

-- Instructions for users
SELECT 
    'NEXT STEPS FOR USERS:' as instructions_header
UNION ALL
SELECT '1. Review the verification test results above'
UNION ALL  
SELECT '2. Test the chart of accounts in the UI'
UNION ALL
SELECT '3. Create sample transactions to verify functionality'
UNION ALL
SELECT '4. Train users on new construction-specific accounts'
UNION ALL
SELECT '5. Update any custom reports to use new account structure';
