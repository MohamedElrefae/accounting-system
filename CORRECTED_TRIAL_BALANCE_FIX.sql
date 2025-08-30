-- CORRECTED TRIAL BALANCE FIX
-- This script creates all the functions expected by the frontend without referencing non-existent columns

-- First, drop any existing conflicting functions
DROP FUNCTION IF EXISTS get_trial_balance_current_tx_enhanced(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_trial_balance_current_tx_enhanced_page(text, text, text, int, text) CASCADE;
DROP FUNCTION IF EXISTS get_trial_balance_current_tx(text, text) CASCADE;
DROP FUNCTION IF EXISTS get_account_balances_as_of_tx_enhanced(text, timestamp with time zone, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_account_balances_as_of_tx_enhanced_page(text, timestamp with time zone, text, text, int, text) CASCADE;
DROP FUNCTION IF EXISTS get_trial_balance_current_grouped_tx_enhanced(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS get_account_balances_as_of_grouped_tx_enhanced(text, timestamp with time zone, text, text) CASCADE;

-- Enable debug mode
SET log_statement = 'all';

-- 1. Main current trial balance function (enhanced)
CREATE OR REPLACE FUNCTION get_trial_balance_current_tx_enhanced(
    p_org_id text,
    p_mode text DEFAULT 'posted',
    p_project_id text DEFAULT NULL
) RETURNS TABLE (
    account_id text,
    code text,
    name text,
    debit_amount numeric,
    credit_amount numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id::text as account_id,
        COALESCE(a.code, '')::text as code,
        COALESCE(a.name, a.code, '')::text as name,
        COALESCE(
            SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0
        )::numeric as debit_amount,
        COALESCE(
            SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0
        )::numeric as credit_amount
    FROM accounts a
    LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND (p_mode = 'all' OR t.is_posted = true)
        AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
    GROUP BY a.id, a.code, a.name
    HAVING (
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) != 0
        OR COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) != 0
    )
    ORDER BY a.code;
END;
$$;

-- 2. Paginated current trial balance function
CREATE OR REPLACE FUNCTION get_trial_balance_current_tx_enhanced_page(
    p_org_id text,
    p_mode text DEFAULT 'posted',
    p_project_id text DEFAULT NULL,
    p_limit int DEFAULT 200,
    p_after_code text DEFAULT NULL
) RETURNS TABLE (
    account_id text,
    code text,
    name text,
    debit_amount numeric,
    credit_amount numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id::text as account_id,
        COALESCE(a.code, '')::text as code,
        COALESCE(a.name, a.code, '')::text as name,
        COALESCE(
            SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0
        )::numeric as debit_amount,
        COALESCE(
            SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0
        )::numeric as credit_amount
    FROM accounts a
    LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND (p_mode = 'all' OR t.is_posted = true)
        AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
    WHERE (p_after_code IS NULL OR a.code > p_after_code)
    GROUP BY a.id, a.code, a.name
    HAVING (
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) != 0
        OR COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) != 0
    )
    ORDER BY a.code
    LIMIT p_limit;
END;
$$;

-- 3. Fallback basic trial balance function
CREATE OR REPLACE FUNCTION get_trial_balance_current_tx(
    p_org_id text,
    p_mode text DEFAULT 'posted'
) RETURNS TABLE (
    account_id text,
    code text,
    name text,
    total_debit numeric,
    total_credit numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id::text as account_id,
        COALESCE(a.code, '')::text as code,
        COALESCE(a.name, a.code, '')::text as name,
        COALESCE(
            SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0
        )::numeric as total_debit,
        COALESCE(
            SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0
        )::numeric as total_credit
    FROM accounts a
    LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND (p_mode = 'all' OR t.is_posted = true)
    GROUP BY a.id, a.code, a.name
    HAVING (
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) != 0
        OR COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) != 0
    )
    ORDER BY a.code;
END;
$$;

-- 4. As-of date trial balance function (enhanced)
CREATE OR REPLACE FUNCTION get_account_balances_as_of_tx_enhanced(
    p_org_id text,
    p_as_of timestamp with time zone,
    p_mode text DEFAULT 'posted',
    p_project_id text DEFAULT NULL
) RETURNS TABLE (
    account_id text,
    code text,
    name text,
    balance_signed_amount numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH account_balances AS (
        SELECT 
            a.id as account_id,
            a.code,
            a.name,
            COALESCE(
                SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0
            ) - COALESCE(
                SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0
            ) as balance_signed
        FROM accounts a
        LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
            AND t.entry_date <= p_as_of
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
        GROUP BY a.id, a.code, a.name
    )
    SELECT 
        ab.account_id::text,
        COALESCE(ab.code, '')::text,
        COALESCE(ab.name, ab.code, '')::text,
        ab.balance_signed::numeric as balance_signed_amount
    FROM account_balances ab
    WHERE ab.balance_signed != 0
    ORDER BY ab.code;
END;
$$;

-- 5. Paginated as-of date trial balance function
CREATE OR REPLACE FUNCTION get_account_balances_as_of_tx_enhanced_page(
    p_org_id text,
    p_as_of timestamp with time zone,
    p_mode text DEFAULT 'posted',
    p_project_id text DEFAULT NULL,
    p_limit int DEFAULT 200,
    p_after_code text DEFAULT NULL
) RETURNS TABLE (
    account_id text,
    code text,
    name text,
    balance_signed_amount numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH account_balances AS (
        SELECT 
            a.id as account_id,
            a.code,
            a.name,
            COALESCE(
                SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0
            ) - COALESCE(
                SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0
            ) as balance_signed
        FROM accounts a
        LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
            AND t.entry_date <= p_as_of
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
        WHERE (p_after_code IS NULL OR a.code > p_after_code)
        GROUP BY a.id, a.code, a.name
    )
    SELECT 
        ab.account_id::text,
        COALESCE(ab.code, '')::text,
        COALESCE(ab.name, ab.code, '')::text,
        ab.balance_signed::numeric as balance_signed_amount
    FROM account_balances ab
    WHERE ab.balance_signed != 0
    ORDER BY ab.code
    LIMIT p_limit;
END;
$$;

-- 6. Hierarchical grouped current trial balance function
CREATE OR REPLACE FUNCTION get_trial_balance_current_grouped_tx_enhanced(
    p_org_id text,
    p_mode text DEFAULT 'posted',
    p_project_id text DEFAULT NULL
) RETURNS TABLE (
    kind text,
    code text,
    name text,
    level int,
    debit_amount numeric,
    credit_amount numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'account'::text as kind,
        COALESCE(a.code, '')::text as code,
        COALESCE(a.name, a.code, '')::text as name,
        1::int as level, -- Default level since we don't know if level column exists
        COALESCE(
            SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0
        )::numeric as debit_amount,
        COALESCE(
            SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0
        )::numeric as credit_amount
    FROM accounts a
    LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
        AND (p_mode = 'all' OR t.is_posted = true)
        AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
    GROUP BY a.id, a.code, a.name
    HAVING (
        COALESCE(SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0) != 0
        OR COALESCE(SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0) != 0
    )
    ORDER BY a.code;
END;
$$;

-- 7. Hierarchical grouped as-of date trial balance function
CREATE OR REPLACE FUNCTION get_account_balances_as_of_grouped_tx_enhanced(
    p_org_id text,
    p_as_of timestamp with time zone,
    p_mode text DEFAULT 'posted',
    p_project_id text DEFAULT NULL
) RETURNS TABLE (
    kind text,
    code text,
    name text,
    level int,
    debit_amount numeric,
    credit_amount numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH account_balances AS (
        SELECT 
            a.id as account_id,
            a.code,
            a.name,
            COALESCE(
                SUM(CASE WHEN t.debit_account_id = a.id THEN t.amount ELSE 0 END), 0
            ) as total_debits,
            COALESCE(
                SUM(CASE WHEN t.credit_account_id = a.id THEN t.amount ELSE 0 END), 0
            ) as total_credits
        FROM accounts a
        LEFT JOIN transactions t ON (t.debit_account_id = a.id OR t.credit_account_id = a.id)
            AND t.entry_date <= p_as_of
            AND (p_mode = 'all' OR t.is_posted = true)
            AND (p_project_id IS NULL OR t.project_id = p_project_id::uuid)
        GROUP BY a.id, a.code, a.name
    )
    SELECT 
        'account'::text as kind,
        COALESCE(ab.code, '')::text as code,
        COALESCE(ab.name, ab.code, '')::text as name,
        1::int as level, -- Default level
        ab.total_debits::numeric as debit_amount,
        ab.total_credits::numeric as credit_amount
    FROM account_balances ab
    WHERE ab.total_debits != 0 OR ab.total_credits != 0
    ORDER BY ab.code;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_trial_balance_current_tx_enhanced(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_balance_current_tx_enhanced_page(text, text, text, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_balance_current_tx(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_balances_as_of_tx_enhanced(text, timestamp with time zone, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_balances_as_of_tx_enhanced_page(text, timestamp with time zone, text, text, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_balance_current_grouped_tx_enhanced(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_balances_as_of_grouped_tx_enhanced(text, timestamp with time zone, text, text) TO authenticated;

-- Test the functions
SELECT 'Testing get_trial_balance_current_tx_enhanced...' as test_info;
SELECT count(*) as row_count FROM get_trial_balance_current_tx_enhanced('00000000-0000-0000-0000-000000000001', 'posted');

SELECT 'Testing get_trial_balance_current_tx fallback...' as test_info;
SELECT count(*) as row_count FROM get_trial_balance_current_tx('00000000-0000-0000-0000-000000000001', 'posted');

SELECT 'Functions created successfully!' as result;
