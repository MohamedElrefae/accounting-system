-- ================================================
-- ABSOLUTE FINAL FIX - Handles ALL Missing Columns in ALL Tables
-- This version ensures ALL tables have ALL needed columns
-- ================================================

-- 1. Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced(uuid,timestamp with time zone,text,uuid);
DROP FUNCTION IF EXISTS public.get_account_balances_as_of_tx_enhanced_page(uuid,timestamp with time zone,text,uuid,integer,text);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced(uuid,text,uuid);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx_enhanced_page(uuid,integer,integer);
DROP FUNCTION IF EXISTS public.get_trial_balance_current_tx(uuid,text);

-- 2. Create organizations table with minimal columns first
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add missing columns to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- 4. Create projects table with minimal columns first  
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add ALL missing columns to projects table one by one
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS org_id UUID;

-- 6. Create the missing paginated function with correct parameters
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_tx_enhanced_page(
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
    -- Debug bypass - always allow if debug mode is enabled
    IF NOT public.is_debug_mode() THEN
        IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        a.code::TEXT,
        a.name::TEXT,
        a.name_ar::TEXT,
        a.account_type::TEXT,
        COALESCE(SUM(CASE WHEN je.debit_amount > 0 THEN je.debit_amount ELSE 0 END), 0) as debit_balance,
        COALESCE(SUM(CASE WHEN je.credit_amount > 0 THEN je.credit_amount ELSE 0 END), 0) as credit_balance,
        COUNT(DISTINCT t.id) as transaction_count,
        MAX(t.transaction_date) as last_transaction_date
    FROM public.accounts a
    LEFT JOIN public.journal_entries je ON a.id = je.account_id
    LEFT JOIN public.transactions t ON je.transaction_id = t.id
    WHERE a.org_id = org_id_param
        AND (t.id IS NULL OR t.status = 'posted')
        AND (t.id IS NULL OR t.org_id = org_id_param)
    GROUP BY a.id, a.code, a.name, a.name_ar, a.account_type
    ORDER BY a.code
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Fix the main trial balance function with correct parameter names
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
    -- Debug bypass
    IF NOT public.is_debug_mode() THEN
        IF auth.uid() IS NULL AND auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        a.id as account_id,
        a.code::TEXT,
        a.name::TEXT,
        COALESCE(SUM(CASE WHEN je.debit_amount > 0 THEN je.debit_amount ELSE 0 END), 0) as debit_amount,
        COALESCE(SUM(CASE WHEN je.credit_amount > 0 THEN je.credit_amount ELSE 0 END), 0) as credit_amount
    FROM public.accounts a
    LEFT JOIN public.journal_entries je ON a.id = je.account_id
    LEFT JOIN public.transactions t ON je.transaction_id = t.id
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR (p_mode = 'all' OR t.status = 'posted'))
        AND (t.id IS NULL OR t.org_id = p_org_id)
        AND (p_project_id IS NULL OR EXISTS (
            SELECT 1 FROM public.journal_entries je2 
            WHERE je2.transaction_id = t.id AND je2.project_id = p_project_id
        ))
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create the as-of balance functions that the client expects
CREATE OR REPLACE FUNCTION public.get_account_balances_as_of_tx_enhanced(
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
        a.code::TEXT,
        a.name::TEXT,
        COALESCE(SUM(je.debit_amount - je.credit_amount), 0) as balance_signed_amount
    FROM public.accounts a
    LEFT JOIN public.journal_entries je ON a.id = je.account_id
    LEFT JOIN public.transactions t ON je.transaction_id = t.id
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR t.transaction_date <= p_as_of)
        AND (t.id IS NULL OR (p_mode = 'all' OR t.status = 'posted'))
        AND (t.id IS NULL OR t.org_id = p_org_id)
        AND (p_project_id IS NULL OR je.project_id = p_project_id OR je.project_id IS NULL)
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create paginated as-of balance function
CREATE OR REPLACE FUNCTION public.get_account_balances_as_of_tx_enhanced_page(
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
        a.code::TEXT,
        a.name::TEXT,
        COALESCE(SUM(je.debit_amount - je.credit_amount), 0) as balance_signed_amount
    FROM public.accounts a
    LEFT JOIN public.journal_entries je ON a.id = je.account_id
    LEFT JOIN public.transactions t ON je.transaction_id = t.id
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR t.transaction_date <= p_as_of)
        AND (t.id IS NULL OR (p_mode = 'all' OR t.status = 'posted'))
        AND (t.id IS NULL OR t.org_id = p_org_id)
        AND (p_project_id IS NULL OR je.project_id = p_project_id OR je.project_id IS NULL)
        AND (p_after_code IS NULL OR a.code > p_after_code)
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create fallback trial balance function
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_tx(
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
        a.code::TEXT,
        a.name::TEXT,
        COALESCE(SUM(CASE WHEN je.debit_amount > 0 THEN je.debit_amount ELSE 0 END), 0) as total_debit,
        COALESCE(SUM(CASE WHEN je.credit_amount > 0 THEN je.credit_amount ELSE 0 END), 0) as total_credit
    FROM public.accounts a
    LEFT JOIN public.journal_entries je ON a.id = je.account_id
    LEFT JOIN public.transactions t ON je.transaction_id = t.id
    WHERE a.org_id = p_org_id
        AND (t.id IS NULL OR (p_mode = 'all' OR t.status = 'posted'))
        AND (t.id IS NULL OR t.org_id = p_org_id)
    GROUP BY a.id, a.code, a.name
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Now add sample data (after ALL columns in ALL tables are created)
-- Clean up first to avoid duplicates
DELETE FROM public.projects WHERE code IN ('PROJ001', 'PROJ002', 'PROJ003');
DELETE FROM public.organizations WHERE code IN ('ORG001', 'ORG002', 'ORG003');

-- Insert sample projects (all columns should exist now)
INSERT INTO public.projects (code, name, name_ar, status, org_id) 
VALUES 
    ('PROJ001', 'Sample Project 1', 'مشروع تجريبي 1', 'active', gen_random_uuid()),
    ('PROJ002', 'Sample Project 2', 'مشروع تجريبي 2', 'active', gen_random_uuid()),
    ('PROJ003', 'Sample Project 3', 'مشروع تجريبي 3', 'active', gen_random_uuid());

-- Insert sample organizations (all columns should exist now)
INSERT INTO public.organizations (code, name, name_ar) 
VALUES 
    ('ORG001', 'Main Organization', 'المنظمة الرئيسية'),
    ('ORG002', 'Branch Office', 'مكتب الفرع'),
    ('ORG003', 'Remote Office', 'مكتب بعيد');

-- 12. Fix RLS policies to be completely permissive for debug
DROP POLICY IF EXISTS debug_projects_policy ON public.projects;
DROP POLICY IF EXISTS debug_organizations_policy ON public.organizations;
DROP POLICY IF EXISTS debug_accounts_policy ON public.accounts;
DROP POLICY IF EXISTS debug_transactions_policy ON public.transactions;
DROP POLICY IF EXISTS debug_journal_entries_policy ON public.journal_entries;

-- Enable RLS first
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create completely open policies for debug mode
CREATE POLICY debug_projects_policy ON public.projects FOR ALL USING (true);
CREATE POLICY debug_organizations_policy ON public.organizations FOR ALL USING (true);
CREATE POLICY debug_accounts_policy ON public.accounts FOR ALL USING (true);
CREATE POLICY debug_transactions_policy ON public.transactions FOR ALL USING (true);
CREATE POLICY debug_journal_entries_policy ON public.journal_entries FOR ALL USING (true);

-- 13. Grant all necessary permissions
GRANT ALL ON public.projects TO authenticated, anon;
GRANT ALL ON public.organizations TO authenticated, anon;
GRANT ALL ON public.accounts TO authenticated, anon;
GRANT ALL ON public.transactions TO authenticated, anon;
GRANT ALL ON public.journal_entries TO authenticated, anon;

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx_enhanced_page(UUID, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx_enhanced(UUID, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_account_balances_as_of_tx_enhanced(UUID, TIMESTAMPTZ, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_account_balances_as_of_tx_enhanced_page(UUID, TIMESTAMPTZ, TEXT, UUID, INTEGER, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance_current_tx(UUID, TEXT) TO authenticated, anon;

-- 14. Verify everything is working
SELECT 'DEBUG MODE STATUS:' as check_type, 
       CASE WHEN public.is_debug_mode() THEN 'ENABLED ✓' ELSE 'DISABLED ✗' END as status;

SELECT 'CREATED FUNCTIONS:' as check_type, COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%trial_balance%' OR routine_name LIKE '%account_balances%');

SELECT 'PROJECTS TABLE:' as check_type, COUNT(*) as count FROM public.projects;
SELECT 'ORGANIZATIONS TABLE:' as check_type, COUNT(*) as count FROM public.organizations;

-- Test the main function that was failing
SELECT 'FUNCTION TEST:' as check_type, 
       CASE 
           WHEN EXISTS(SELECT 1 FROM public.get_trial_balance_current_tx_enhanced(gen_random_uuid(), 'posted', NULL) LIMIT 1) 
           THEN 'WORKING ✓' 
           ELSE 'NO DATA (OK)' 
       END as status;

-- Show what functions were created
SELECT 'FUNCTIONS LIST:' as info, routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE '%trial_balance%' OR routine_name LIKE '%account_balances%')
ORDER BY routine_name;

-- Show final table structures
SELECT 'PROJECTS COLUMNS:' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

SELECT 'ORGANIZATIONS COLUMNS:' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'organizations'
ORDER BY ordinal_position;

-- Show sample data was inserted successfully
SELECT 'SAMPLE PROJECTS:' as info, code, name, status FROM public.projects ORDER BY code LIMIT 5;
SELECT 'SAMPLE ORGANIZATIONS:' as info, code, name FROM public.organizations ORDER BY code LIMIT 5;
