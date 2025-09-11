-- Test Trial Balance All Levels consistency with Trial Balance Original
-- Copy and paste this SQL block

WITH gl_summary_base AS (
    SELECT 
        s.account_id,
        s.account_code,
        s.account_name_en,
        s.opening_debit,
        s.opening_credit,
        s.period_debits,
        s.period_credits,
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
    -- How Trial Balance Original works (correct format)
    SELECT 
        account_code,
        account_name_en,
        closing_debit as tb_orig_debit,
        closing_credit as tb_orig_credit,
        (closing_debit + closing_credit) as tb_orig_activity
    FROM gl_summary_base
    WHERE closing_debit != 0 OR closing_credit != 0
),
trial_balance_all_levels_asof AS (
    -- How Trial Balance All Levels works in "as-of" mode (should match Original)
    SELECT 
        account_code,
        account_name_en,
        closing_debit as tball_debit,
        closing_credit as tball_credit,
        (closing_debit + closing_credit) as tball_activity
    FROM gl_summary_base
    WHERE closing_debit != 0 OR closing_credit != 0
),
trial_balance_all_levels_range AS (
    -- How Trial Balance All Levels works in "range" mode (might be different)
    SELECT 
        account_code,
        account_name_en,
        period_debits as tball_period_debits,
        period_credits as tball_period_credits,
        (period_debits + period_credits) as tball_period_activity
    FROM gl_summary_base
    WHERE period_debits != 0 OR period_credits != 0
)

-- CONSISTENCY CHECK
SELECT 
    'TB ALL LEVELS CONSISTENCY' as test_name,
    
    -- Original Trial Balance
    (SELECT COUNT(*) FROM trial_balance_original) as tb_orig_accounts,
    (SELECT SUM(tb_orig_debit) FROM trial_balance_original) as tb_orig_debits,
    (SELECT SUM(tb_orig_credit) FROM trial_balance_original) as tb_orig_credits,
    (SELECT SUM(tb_orig_activity) FROM trial_balance_original) as tb_orig_total_activity,
    
    -- Trial Balance All Levels (as-of mode)
    (SELECT COUNT(*) FROM trial_balance_all_levels_asof) as tball_asof_accounts,
    (SELECT SUM(tball_debit) FROM trial_balance_all_levels_asof) as tball_asof_debits,
    (SELECT SUM(tball_credit) FROM trial_balance_all_levels_asof) as tball_asof_credits,
    (SELECT SUM(tball_activity) FROM trial_balance_all_levels_asof) as tball_asof_total_activity,
    
    -- Trial Balance All Levels (range mode) 
    (SELECT COUNT(*) FROM trial_balance_all_levels_range) as tball_range_accounts,
    (SELECT SUM(tball_period_debits) FROM trial_balance_all_levels_range) as tball_range_debits,
    (SELECT SUM(tball_period_credits) FROM trial_balance_all_levels_range) as tball_range_credits,
    (SELECT SUM(tball_period_activity) FROM trial_balance_all_levels_range) as tball_range_total_activity,
    
    -- CONSISTENCY FLAGS
    CASE 
        WHEN (SELECT SUM(tb_orig_activity) FROM trial_balance_original) = 
             (SELECT SUM(tball_activity) FROM trial_balance_all_levels_asof)
        THEN '✅ AS-OF MODE MATCHES ORIGINAL'
        ELSE '❌ AS-OF MODE DIFFERS'
    END as asof_consistency,
    
    CASE 
        WHEN (SELECT SUM(tb_orig_activity) FROM trial_balance_original) = 
             (SELECT SUM(tball_period_activity) FROM trial_balance_all_levels_range)
        THEN '✅ RANGE MODE MATCHES ORIGINAL'
        ELSE '❌ RANGE MODE DIFFERS'
    END as range_consistency;

-- ACCOUNT-LEVEL COMPARISON (Sample)
SELECT 
    'ACCOUNT-LEVEL CHECK' as section,
    orig.account_code,
    orig.account_name_en,
    orig.tb_orig_debit as original_debit,
    orig.tb_orig_credit as original_credit,
    orig.tb_orig_activity as original_activity,
    
    asof_mode.tball_debit as all_levels_asof_debit,
    asof_mode.tball_credit as all_levels_asof_credit,
    asof_mode.tball_activity as all_levels_asof_activity,
    
    range_mode.tball_period_debits as all_levels_range_debits,
    range_mode.tball_period_credits as all_levels_range_credits,
    range_mode.tball_period_activity as all_levels_range_activity,
    
    -- Match status
    CASE 
        WHEN orig.tb_orig_activity = asof_mode.tball_activity THEN '✅ AS-OF MATCH'
        ELSE '❌ AS-OF DIFFER'
    END as asof_match,
    
    CASE 
        WHEN orig.tb_orig_activity = range_mode.tball_period_activity THEN '✅ RANGE MATCH'
        ELSE '❌ RANGE DIFFER'
    END as range_match

FROM trial_balance_original orig
FULL OUTER JOIN trial_balance_all_levels_asof asof_mode ON orig.account_code = asof_mode.account_code
FULL OUTER JOIN trial_balance_all_levels_range range_mode ON orig.account_code = range_mode.account_code
ORDER BY orig.account_code
LIMIT 10;
