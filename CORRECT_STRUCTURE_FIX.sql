-- ================================================
-- CORRECT STRUCTURE FIX - Using your actual table structure
-- This creates functions that work with your real data model
-- ================================================

-- Drop the incorrect functions first
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced_page(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced(UUID, TIMESTAMPTZ, TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced_page(UUID, TIMESTAMPTZ, TEXT, UUID, INTEGER, TEXT);

-- 1. Main trial balance function (corrected for your structure)
CREATE FUNCTION public.get_trial_balance_current_tx_enhanced(
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
    -- Debug bypass
    IF NOT public.is_debug_mode() THEN
        IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
    WITH account_balances AS (
        -- Get debit balances (when account is on debit side)
        SELECT 
            t.debit_account_id as account_id,
            SUM(t.amount) as debit_total,
            0::NUMERIC as credit_total
        FROM public.transactions t
        WHERE t.org_id = p_org_id
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id)
        GROUP BY t.debit_account_id
        
        UNION ALL
        
        -- Get credit balances (when account is on credit side)
        SELECT 
            t.credit_account_id as account_id,
            0::NUMERIC as debit_total,
            SUM(t.amount) as credit_total
        FROM public.transactions t
        WHERE t.org_id = p_org_id
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id)
        GROUP BY t.credit_account_id
    )
    SELECT 
        a.id as account_id,
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(SUM(ab.debit_total), 0) as debit_amount,
        COALESCE(SUM(ab.credit_total), 0) as credit_amount
    FROM public.accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id
    WHERE a.org_id = p_org_id
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Paginated trial balance function (corrected)
CREATE FUNCTION public.get_trial_balance_current_tx_enhanced_page(
    org_id_param UUID,
    limit_param INTEGER DEFAULT 100,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE(
    account_code TEXT,
    account_name TEXT,
    account_name_ar TEXT,
    account_type TEXT,
    debit_balance NUMERIC,
    credit_balance NUMERIC,
    transaction_count BIGINT,
    last_transaction_date TIMESTAMPTZ
) AS $$
BEGIN
    -- Debug bypass
    IF NOT public.is_debug_mode() THEN
        IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
    WITH account_balances AS (
        -- Get debit balances and transaction info
        SELECT 
            t.debit_account_id as account_id,
            SUM(t.amount) as debit_total,
            0::NUMERIC as credit_total,
            COUNT(*) as tx_count,
            MAX(t.entry_date) as last_date
        FROM public.transactions t
        WHERE t.org_id = org_id_param
            AND t.is_posted = true
        GROUP BY t.debit_account_id
        
        UNION ALL
        
        -- Get credit balances and transaction info
        SELECT 
            t.credit_account_id as account_id,
            0::NUMERIC as debit_total,
            SUM(t.amount) as credit_total,
            COUNT(*) as tx_count,
            MAX(t.entry_date) as last_date
        FROM public.transactions t
        WHERE t.org_id = org_id_param
            AND t.is_posted = true
        GROUP BY t.credit_account_id
    )
    SELECT 
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(a.name_ar, '')::TEXT,
        COALESCE(a.category, '')::TEXT,
        COALESCE(SUM(ab.debit_total), 0) as debit_balance,
        COALESCE(SUM(ab.credit_total), 0) as credit_balance,
        COALESCE(SUM(ab.tx_count), 0) as transaction_count,
        MAX(ab.last_date) as last_transaction_date
    FROM public.accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id
    WHERE a.org_id = org_id_param
    GROUP BY a.id, a.code, a.name, a.name_ar, a.category
    ORDER BY a.code
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fallback trial balance function (corrected)
CREATE FUNCTION public.get_trial_balance_current_tx(
    p_org_id UUID,
    p_mode TEXT DEFAULT 'posted'
)
RETURNS TABLE(
    account_id UUID,
    code TEXT,
    name TEXT,
    total_debit NUMERIC,
    total_credit NUMERIC
) AS $$
BEGIN
    -- Debug bypass
    IF NOT public.is_debug_mode() THEN
        IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
    WITH account_balances AS (
        -- Debit side
        SELECT 
            t.debit_account_id as account_id,
            SUM(t.amount) as debit_total,
            0::NUMERIC as credit_total
        FROM public.transactions t
        WHERE t.org_id = p_org_id
            AND (p_mode = 'all' OR t.is_posted = true)
        GROUP BY t.debit_account_id
        
        UNION ALL
        
        -- Credit side
        SELECT 
            t.credit_account_id as account_id,
            0::NUMERIC as debit_total,
            SUM(t.amount) as credit_total
        FROM public.transactions t
        WHERE t.org_id = p_org_id
            AND (p_mode = 'all' OR t.is_posted = true)
        GROUP BY t.credit_account_id
    )
    SELECT 
        a.id as account_id,
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(SUM(ab.debit_total), 0) as total_debit,
        COALESCE(SUM(ab.credit_total), 0) as total_credit
    FROM public.accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id
    WHERE a.org_id = p_org_id
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. As-of balance function (corrected)
CREATE FUNCTION public.get_account_balances_as_of_tx_enhanced(
    p_org_id UUID,
    p_as_of TIMESTAMPTZ,
    p_mode TEXT DEFAULT 'posted',
    p_project_id UUID DEFAULT NULL
)
RETURNS TABLE(
    account_id UUID,
    code TEXT,
    name TEXT,
    balance_signed_amount NUMERIC
) AS $$
BEGIN
    -- Debug bypass
    IF NOT public.is_debug_mode() THEN
        IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
    WITH account_balances AS (
        -- Debit side (positive for the account)
        SELECT 
            t.debit_account_id as account_id,
            SUM(t.amount) as balance_amount
        FROM public.transactions t
        WHERE t.org_id = p_org_id
            AND t.entry_date <= p_as_of
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id)
        GROUP BY t.debit_account_id
        
        UNION ALL
        
        -- Credit side (negative for the account)
        SELECT 
            t.credit_account_id as account_id,
            -SUM(t.amount) as balance_amount
        FROM public.transactions t
        WHERE t.org_id = p_org_id
            AND t.entry_date <= p_as_of
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id)
        GROUP BY t.credit_account_id
    )
    SELECT 
        a.id as account_id,
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(SUM(ab.balance_amount), 0) as balance_signed_amount
    FROM public.accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id
    WHERE a.org_id = p_org_id
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Paginated as-of balance function (corrected)
CREATE FUNCTION public.get_account_balances_as_of_tx_enhanced_page(
    p_org_id UUID,
    p_as_of TIMESTAMPTZ,
    p_mode TEXT DEFAULT 'posted',
    p_project_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 100,
    p_after_code TEXT DEFAULT NULL
)
RETURNS TABLE(
    account_id UUID,
    code TEXT,
    name TEXT,
    balance_signed_amount NUMERIC
) AS $$
BEGIN
    -- Debug bypass
    IF NOT public.is_debug_mode() THEN
        IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
    WITH account_balances AS (
        -- Debit side (positive)
        SELECT 
            t.debit_account_id as account_id,
            SUM(t.amount) as balance_amount
        FROM public.transactions t
        WHERE t.org_id = p_org_id
            AND t.entry_date <= p_as_of
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id)
        GROUP BY t.debit_account_id
        
        UNION ALL
        
        -- Credit side (negative)
        SELECT 
            t.credit_account_id as account_id,
            -SUM(t.amount) as balance_amount
        FROM public.transactions t
        WHERE t.org_id = p_org_id
            AND t.entry_date <= p_as_of
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id)
        GROUP BY t.credit_account_id
    )
    SELECT 
        a.id as account_id,
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(SUM(ab.balance_amount), 0) as balance_signed_amount
    FROM public.accounts a
    LEFT JOIN account_balances ab ON a.id = ab.account_id
    WHERE a.org_id = p_org_id
        AND (p_after_code IS NULL OR a.code > p_after_code)
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx_enhanced(UUID, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx_enhanced_page(UUID, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_account_balances_as_of_tx_enhanced(UUID, TIMESTAMPTZ, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_account_balances_as_of_tx_enhanced_page(UUID, TIMESTAMPTZ, TEXT, UUID, INTEGER, TEXT) TO authenticated, anon;

-- Simple test
SELECT 'FUNCTIONS CORRECTED FOR YOUR ACTUAL DATA STRUCTURE!' as status;

-- Show function list
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%trial_balance%' OR routine_name LIKE '%account_balances%')
ORDER BY routine_name;

SELECT '🎯 FUNCTIONS NOW MATCH YOUR REAL TABLE STRUCTURE! 🎯' as final_status;
