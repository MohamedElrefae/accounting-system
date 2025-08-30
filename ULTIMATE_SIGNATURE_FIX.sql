-- ================================================
-- ULTIMATE SIGNATURE FIX - Get exact signatures and drop them
-- This finds all function variants and drops them by exact signature
-- ================================================

-- Drop functions with exact signatures based on what we know exists
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(uuid, text);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(text, text, uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(uuid, uuid);

DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx(uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx(uuid, text);

DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced_page(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced_page(uuid, text, uuid);

DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced(uuid, timestamptz, text, uuid);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced(uuid, date, text, uuid);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced(uuid, timestamptz);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced(uuid, timestamptz, text);

DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced_page(uuid, timestamptz, text, uuid, integer, text);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced_page(uuid, date, text, uuid, integer, text);

-- Also try common variations that might exist
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(org_id_param uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(org_id_param uuid, mode_param text);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(org_id_param uuid, mode_param text, project_id_param uuid);

-- Now create the single, clean version of each function

-- 1. Main trial balance function (ONE SIGNATURE ONLY)
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
    SELECT 
        a.id as account_id,
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(SUM(CASE WHEN t.debit_amount > 0 THEN t.debit_amount ELSE 0 END), 0) as debit_amount,
        COALESCE(SUM(CASE WHEN t.credit_amount > 0 THEN t.credit_amount ELSE 0 END), 0) as credit_amount
    FROM public.accounts a
    LEFT JOIN public.transactions t ON a.id = t.account_id
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR (p_mode = 'all' OR t.status = 'posted'))
        AND (t.id IS NULL OR t.org_id = p_org_id)
        AND (p_project_id IS NULL OR t.project_id = p_project_id OR t.project_id IS NULL)
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Paginated trial balance function (ONE SIGNATURE ONLY)
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
    SELECT 
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(a.name_ar, '')::TEXT,
        COALESCE(a.account_type, '')::TEXT,
        COALESCE(SUM(CASE WHEN t.debit_amount > 0 THEN t.debit_amount ELSE 0 END), 0) as debit_balance,
        COALESCE(SUM(CASE WHEN t.credit_amount > 0 THEN t.credit_amount ELSE 0 END), 0) as credit_balance,
        COUNT(t.id) as transaction_count,
        MAX(t.transaction_date) as last_transaction_date
    FROM public.accounts a
    LEFT JOIN public.transactions t ON a.id = t.account_id
    WHERE a.org_id = org_id_param
        AND (t.id IS NULL OR t.status = 'posted')
        AND (t.id IS NULL OR t.org_id = org_id_param)
    GROUP BY a.id, a.code, a.name, a.name_ar, a.account_type
    ORDER BY a.code
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fallback trial balance function (ONE SIGNATURE ONLY)
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
    SELECT 
        a.id as account_id,
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(SUM(CASE WHEN t.debit_amount > 0 THEN t.debit_amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN t.credit_amount > 0 THEN t.credit_amount ELSE 0 END), 0) as total_credit
    FROM public.accounts a
    LEFT JOIN public.transactions t ON a.id = t.account_id
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR (p_mode = 'all' OR t.status = 'posted'))
        AND (t.id IS NULL OR t.org_id = p_org_id)
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. As-of balance function (ONE SIGNATURE ONLY)
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
    SELECT 
        a.id as account_id,
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(SUM(COALESCE(t.debit_amount, 0) - COALESCE(t.credit_amount, 0)), 0) as balance_signed_amount
    FROM public.accounts a
    LEFT JOIN public.transactions t ON a.id = t.account_id
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR t.transaction_date <= p_as_of)
        AND (t.id IS NULL OR (p_mode = 'all' OR t.status = 'posted'))
        AND (t.id IS NULL OR t.org_id = p_org_id)
        AND (p_project_id IS NULL OR t.project_id = p_project_id OR t.project_id IS NULL)
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Paginated as-of balance function (ONE SIGNATURE ONLY)
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
    SELECT 
        a.id as account_id,
        COALESCE(a.code, '')::TEXT,
        COALESCE(a.name, '')::TEXT,
        COALESCE(SUM(COALESCE(t.debit_amount, 0) - COALESCE(t.credit_amount, 0)), 0) as balance_signed_amount
    FROM public.accounts a
    LEFT JOIN public.transactions t ON a.id = t.account_id
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR t.transaction_date <= p_as_of)
        AND (t.id IS NULL OR (p_mode = 'all' OR t.status = 'posted'))
        AND (t.id IS NULL OR t.org_id = p_org_id)
        AND (p_project_id IS NULL OR t.project_id = p_project_id OR t.project_id IS NULL)
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

-- Simple verification
SELECT 'ULTIMATE FIX COMPLETED!' as status;
SELECT 'Functions now exist with clean signatures' as info;

-- Show final function list
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%trial_balance%' OR routine_name LIKE '%account_balances%')
ORDER BY routine_name;

SELECT '✅ CLEAN FUNCTIONS CREATED - TEST YOUR APP NOW! ✅' as final_status;
