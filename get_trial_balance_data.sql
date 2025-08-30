-- Get current trial balance data to see account structure
SELECT 
    account_id,
    code,
    name,
    kind,
    level,
    debit_amount,
    credit_amount
FROM public.get_trial_balance_current_grouped_tx_enhanced(
    (SELECT id FROM public.organizations LIMIT 1),
    'posted',
    NULL
)
ORDER BY code;
