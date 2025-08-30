-- Check what organization ID your data actually uses
SELECT 'ACTUAL ORG_ID IN DATA:' as info;
SELECT DISTINCT 
    COALESCE(org_id::text, 'NULL') as org_id,
    count(*) as account_count
FROM accounts 
GROUP BY org_id;

SELECT 'TRANSACTIONS ORG_ID:' as info;
SELECT DISTINCT 
    COALESCE(org_id::text, 'NULL') as org_id,
    count(*) as transaction_count  
FROM transactions 
GROUP BY org_id;

-- Test with the actual org_id if it exists
SELECT 'TESTING WITH FIRST ACTUAL ORG_ID:' as info;
SELECT * FROM get_trial_balance_current_tx_enhanced(
    (SELECT COALESCE(org_id::text, '00000000-0000-0000-0000-000000000001') FROM accounts LIMIT 1),
    'posted'
) LIMIT 5;
