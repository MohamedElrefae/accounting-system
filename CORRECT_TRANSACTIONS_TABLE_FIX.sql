-- ================================================
-- CORRECT TRIAL BALANCE FIX - USING TRANSACTIONS TABLE WITH CORRECT COLUMNS
-- This version uses your actual transactions table with the correct column names
-- ================================================

-- 1. Drop all existing trial balance functions
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_simplified();
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx(uuid,text);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(uuid,text,uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced_page(uuid,integer,integer);

-- 2. Create the main trial balance function using transactions table with correct columns
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_tx_simplified()
RETURNS TABLE(
    account_id UUID,
    code TEXT,
    name TEXT,
    debit_amount NUMERIC,
    credit_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as account_id,
        a.code::TEXT,
        a.name::TEXT,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as debit_amount,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as credit_amount
    FROM public.accounts a
    LEFT JOIN public.transactions t ON (a.id = t.debit_account_id OR a.id = t.credit_account_id)
    WHERE t.is_posted = true OR t.id IS NULL
    GROUP BY a.id, a.code, a.name
    HAVING COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) > 0
        OR COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) > 0
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create enhanced version with org filter
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_tx_enhanced(
    p_org_id UUID,
    p_mode TEXT DEFAULT 'posted',
    p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(
    account_id UUID,
    code TEXT,
    name TEXT,
    debit_amount NUMERIC,
    credit_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as account_id,
        a.code::TEXT,
        a.name::TEXT,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as debit_amount,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as credit_amount
    FROM public.accounts a
    LEFT JOIN public.transactions t ON (a.id = t.debit_account_id OR a.id = t.credit_account_id)
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR (p_mode = 'all' OR t.is_posted = true))
        AND (t.id IS NULL OR t.org_id = p_org_id)
        AND (p_project_id IS NULL OR t.project_id = p_project_id OR t.id IS NULL)
    GROUP BY a.id, a.code, a.name
    HAVING COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) > 0
        OR COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) > 0
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create paginated version
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_tx_enhanced_page(
    p_org_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    account_id UUID,
    code TEXT,
    name TEXT,
    debit_amount NUMERIC,
    credit_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as account_id,
        a.code::TEXT,
        a.name::TEXT,
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) as debit_amount,
        COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) as credit_amount
    FROM public.accounts a
    LEFT JOIN public.transactions t ON (a.id = t.debit_account_id OR a.id = t.credit_account_id)
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR t.is_posted = true)
        AND (t.id IS NULL OR t.org_id = p_org_id)
    GROUP BY a.id, a.code, a.name
    HAVING COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) > 0
        OR COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) > 0
    ORDER BY a.code
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create basic version with org filter
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_tx(
    p_org_id UUID,
    p_mode TEXT DEFAULT 'posted'
)
RETURNS TABLE(
    account_id UUID,
    code TEXT,
    name TEXT,
    debit_amount NUMERIC,
    credit_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.get_trial_balance_current_tx_enhanced(p_org_id, p_mode, NULL::uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx_simplified() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx_enhanced(uuid,text,uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx_enhanced_page(uuid,integer,integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx(uuid,text) TO authenticated, anon;

-- 7. Test with your actual transactions data
SELECT 'TESTING WITH TRANSACTIONS TABLE DATA:' as info;

-- Test the simplified function
SELECT 'SIMPLIFIED FUNCTION TEST:' as test_type;
SELECT * FROM public.get_trial_balance_current_tx_simplified() LIMIT 10;

-- Show sample data from your transactions table
SELECT 'YOUR TRANSACTIONS DATA:' as info;
SELECT 
    t.entry_number,
    t.description,
    t.amount,
    da.code as debit_code,
    da.name as debit_name,
    ca.code as credit_code,
    ca.name as credit_name,
    t.is_posted
FROM public.transactions t
LEFT JOIN public.accounts da ON t.debit_account_id = da.id
LEFT JOIN public.accounts ca ON t.credit_account_id = ca.id
ORDER BY t.entry_date DESC
LIMIT 5;

-- Show account balances calculation
SELECT 'ACCOUNT BALANCES FROM YOUR TRANSACTIONS:' as info;
SELECT 
    a.code,
    a.name,
    SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END) as total_credits
FROM public.accounts a
LEFT JOIN public.transactions t ON (a.id = t.debit_account_id OR a.id = t.credit_account_id)
WHERE t.is_posted = true OR t.id IS NULL
GROUP BY a.id, a.code, a.name
HAVING SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END) > 0
    OR SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END) > 0
ORDER BY a.code;

SELECT '✅ FIXED TO USE TRANSACTIONS TABLE WITH CORRECT COLUMNS! Your trial balance should now show your actual data.' as result;
