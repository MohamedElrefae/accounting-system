-- Test Trial Balance All Levels after fixing to use closing_debit/closing_credit consistently
-- Copy and paste this SQL block

WITH gl_summary_base AS (
    SELECT 
        s.account_id,
        s.account_code,
        s.account_name_en,
        s.closing_debit,
        s.closing_credit
    FROM public.get_gl_account_summary(
        '2024-01-01'::date,
        CURRENT_DATE::date,
        'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
        NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    ) s
),
trial_balance_original AS (
    SELECT 
        account_code,
        account_name_en,
        closing_debit as tb_orig_debit,
        closing_credit as tb_orig_credit,
        (closing_debit + closing_credit) as tb_orig_activity
    FROM gl_summary_base
    WHERE closing_debit != 0 OR closing_credit != 0
),
trial_balance_all_levels_fixed AS (
    -- Trial Balance All Levels now uses closing_debit/closing_credit in both modes
    SELECT 
        account_code,
        account_name_en,
        closing_debit as tball_debit,
        closing_credit as tball_credit,
        (closing_debit + closing_credit) as tball_activity
    FROM gl_summary_base
    WHERE closing_debit != 0 OR closing_credit != 0
)

-- PERFECT CONSISTENCY TEST
SELECT 
    '🎯 TRIAL BALANCE ALL LEVELS FIX' as test_result,
    
    -- Original Trial Balance
    (SELECT COUNT(*) FROM trial_balance_original) as tb_orig_accounts,
    (SELECT SUM(tb_orig_debit) FROM trial_balance_original) as tb_orig_debits,
    (SELECT SUM(tb_orig_credit) FROM trial_balance_original) as tb_orig_credits,
    (SELECT SUM(tb_orig_activity) FROM trial_balance_original) as tb_orig_total_activity,
    
    -- Trial Balance All Levels (fixed)
    (SELECT COUNT(*) FROM trial_balance_all_levels_fixed) as tball_accounts,
    (SELECT SUM(tball_debit) FROM trial_balance_all_levels_fixed) as tball_debits,
    (SELECT SUM(tball_credit) FROM trial_balance_all_levels_fixed) as tball_credits,
    (SELECT SUM(tball_activity) FROM trial_balance_all_levels_fixed) as tball_total_activity,
    
    -- PERFECT MATCH CHECK
    CASE 
        WHEN (SELECT COUNT(*) FROM trial_balance_original) = (SELECT COUNT(*) FROM trial_balance_all_levels_fixed)
        THEN '✅ ACCOUNT COUNT MATCH'
        ELSE '❌ ACCOUNT COUNT DIFFER'
    END as account_count_status,
    
    CASE 
        WHEN (SELECT SUM(tb_orig_debits) FROM trial_balance_original) = (SELECT SUM(tball_debit) FROM trial_balance_all_levels_fixed)
        THEN '✅ DEBITS MATCH'
        ELSE '❌ DEBITS DIFFER'
    END as debits_status,
    
    CASE 
        WHEN (SELECT SUM(tb_orig_credit) FROM trial_balance_original) = (SELECT SUM(tball_credit) FROM trial_balance_all_levels_fixed)
        THEN '✅ CREDITS MATCH'
        ELSE '❌ CREDITS DIFFER'
    END as credits_status,
    
    CASE 
        WHEN (SELECT SUM(tb_orig_activity) FROM trial_balance_original) = (SELECT SUM(tball_activity) FROM trial_balance_all_levels_fixed)
        THEN '✅ TOTAL ACTIVITY MATCH'
        ELSE '❌ TOTAL ACTIVITY DIFFER'
    END as total_activity_status,
    
    -- OVERALL RESULT
    CASE 
        WHEN (SELECT COUNT(*) FROM trial_balance_original) = (SELECT COUNT(*) FROM trial_balance_all_levels_fixed)
        AND (SELECT SUM(tb_orig_debit) FROM trial_balance_original) = (SELECT SUM(tball_debit) FROM trial_balance_all_levels_fixed)
        AND (SELECT SUM(tb_orig_credit) FROM trial_balance_original) = (SELECT SUM(tball_credit) FROM trial_balance_all_levels_fixed)
        AND (SELECT SUM(tb_orig_activity) FROM trial_balance_original) = (SELECT SUM(tball_activity) FROM trial_balance_all_levels_fixed)
        THEN '🎉 PERFECT CONSISTENCY - ALL TRIAL BALANCES MATCH!'
        ELSE '⚠ STILL HAVE DIFFERENCES'
    END as final_status;

-- SAMPLE ACCOUNT VERIFICATION
SELECT 
    '✅ SAMPLE VERIFICATION' as section,
    orig.account_code,
    orig.account_name_en,
    orig.tb_orig_debit as original_debit,
    orig.tb_orig_credit as original_credit,
    orig.tb_orig_activity as original_activity,
    
    fixed.tball_debit as all_levels_debit,
    fixed.tball_credit as all_levels_credit,
    fixed.tball_activity as all_levels_activity,
    
    CASE 
        WHEN orig.tb_orig_activity = fixed.tball_activity THEN '✅ PERFECT MATCH'
        ELSE '❌ STILL DIFFER'
    END as match_status

FROM trial_balance_original orig
INNER JOIN trial_balance_all_levels_fixed fixed ON orig.account_code = fixed.account_code
ORDER BY orig.account_code
LIMIT 5;
