-- ================================================
-- COPY AND PASTE THIS ENTIRE SCRIPT INTO SUPABASE DASHBOARD
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- Paste this script and click "Run"
-- ================================================

-- Create a debug settings table
CREATE TABLE IF NOT EXISTS public.debug_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert debug bypass setting (ENABLED by default)
INSERT INTO public.debug_settings (key, value, description) 
VALUES ('bypass_auth', true, 'Bypass all authentication checks for development')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Grant access to debug settings
GRANT SELECT ON public.debug_settings TO authenticated, anon;

-- Helper function to check if debug mode is enabled
CREATE OR REPLACE FUNCTION public.is_debug_mode()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((SELECT value FROM public.debug_settings WHERE key = 'bypass_auth'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Update Trial Balance Functions with Debug Bypass
-- ================================================

-- Current Trial Balance (Grouped)
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_grouped(org_id_param UUID)
RETURNS TABLE(
    account_code TEXT,
    account_name TEXT,
    account_name_ar TEXT,
    account_type TEXT,
    debit_balance NUMERIC,
    credit_balance NUMERIC
) AS $$
BEGIN
    -- Debug bypass or basic auth check
    IF NOT public.is_debug_mode() THEN
        -- Only require valid JWT, skip org membership for now
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
        COALESCE(SUM(CASE WHEN je.credit_amount > 0 THEN je.credit_amount ELSE 0 END), 0) as credit_balance
    FROM public.accounts a
    LEFT JOIN public.journal_entries je ON a.id = je.account_id
    LEFT JOIN public.transactions t ON je.transaction_id = t.id
    WHERE a.org_id = org_id_param
        AND (t.id IS NULL OR t.status = 'posted')
        AND (t.id IS NULL OR t.org_id = org_id_param)
    GROUP BY a.id, a.code, a.name, a.name_ar, a.account_type
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Current Trial Balance (Enhanced)
CREATE OR REPLACE FUNCTION public.get_trial_balance_current_tx_enhanced(
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
    -- Debug bypass or basic auth check
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

-- As-of Trial Balance (Grouped)
CREATE OR REPLACE FUNCTION public.get_trial_balance_as_of_grouped(
    org_id_param UUID,
    as_of_date DATE
)
RETURNS TABLE(
    account_code TEXT,
    account_name TEXT,
    account_name_ar TEXT,
    account_type TEXT,
    debit_balance NUMERIC,
    credit_balance NUMERIC
) AS $$
BEGIN
    -- Debug bypass or basic auth check
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
        COALESCE(SUM(CASE WHEN je.credit_amount > 0 THEN je.credit_amount ELSE 0 END), 0) as credit_balance
    FROM public.accounts a
    LEFT JOIN public.journal_entries je ON a.id = je.account_id
    LEFT JOIN public.transactions t ON je.transaction_id = t.id
    WHERE a.org_id = org_id_param
        AND (t.id IS NULL OR (t.status = 'posted' AND t.transaction_date <= as_of_date))
        AND (t.id IS NULL OR t.org_id = org_id_param)
    GROUP BY a.id, a.code, a.name, a.name_ar, a.account_type
    ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- As-of Trial Balance (Enhanced)
CREATE OR REPLACE FUNCTION public.get_trial_balance_as_of_tx_enhanced(
    org_id_param UUID,
    as_of_date DATE,
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
    -- Debug bypass or basic auth check
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
        AND (t.id IS NULL OR (t.status = 'posted' AND t.transaction_date <= as_of_date))
        AND (t.id IS NULL OR t.org_id = org_id_param)
    GROUP BY a.id, a.code, a.name, a.name_ar, a.account_type
    ORDER BY a.code
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Create missing tables and fix RLS
-- ================================================

-- Create projects table if missing
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT,
    name_ar TEXT,
    org_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organizations table if missing
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT,
    name_ar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic RLS policies
DO $$ 
BEGIN
    -- Drop existing policies that might cause issues
    DROP POLICY IF EXISTS debug_accounts_policy ON public.accounts;
    DROP POLICY IF EXISTS debug_transactions_policy ON public.transactions;
    DROP POLICY IF EXISTS debug_journal_entries_policy ON public.journal_entries;
    DROP POLICY IF EXISTS debug_projects_policy ON public.projects;
    DROP POLICY IF EXISTS debug_organizations_policy ON public.organizations;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if policies don't exist
        NULL;
END $$;

-- Create simple debug-friendly RLS policies
CREATE POLICY debug_accounts_policy ON public.accounts FOR ALL USING (
    public.is_debug_mode() OR auth.uid() IS NOT NULL
);

CREATE POLICY debug_transactions_policy ON public.transactions FOR ALL USING (
    public.is_debug_mode() OR auth.uid() IS NOT NULL
);

CREATE POLICY debug_journal_entries_policy ON public.journal_entries FOR ALL USING (
    public.is_debug_mode() OR auth.uid() IS NOT NULL
);

CREATE POLICY debug_projects_policy ON public.projects FOR ALL USING (
    public.is_debug_mode() OR auth.uid() IS NOT NULL
);

CREATE POLICY debug_organizations_policy ON public.organizations FOR ALL USING (
    public.is_debug_mode() OR auth.uid() IS NOT NULL
);

-- Grant permissions
GRANT SELECT ON public.projects TO authenticated, anon;
GRANT SELECT ON public.organizations TO authenticated, anon;
GRANT SELECT ON public.debug_settings TO authenticated, anon;

-- ================================================
-- Create Debug Control Functions
-- ================================================

-- Function to enable debug mode
CREATE OR REPLACE FUNCTION public.enable_debug_mode()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.debug_settings SET value = true WHERE key = 'bypass_auth';
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable debug mode
CREATE OR REPLACE FUNCTION public.disable_debug_mode()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.debug_settings SET value = false WHERE key = 'bypass_auth';
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check debug status
CREATE OR REPLACE FUNCTION public.get_debug_status()
RETURNS TABLE(debug_enabled BOOLEAN, description TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ds.value, false) as debug_enabled,
        COALESCE(ds.description, 'Debug bypass not configured') as description
    FROM public.debug_settings ds
    WHERE ds.key = 'bypass_auth';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to debug control functions
GRANT EXECUTE ON FUNCTION public.enable_debug_mode() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.disable_debug_mode() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_debug_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_debug_mode() TO authenticated, anon;

-- ================================================
-- SCRIPT COMPLETE - CHECK RESULTS BELOW
-- ================================================

-- Verify debug mode is enabled
SELECT 'DEBUG MODE STATUS:' as info, debug_enabled, description 
FROM public.get_debug_status();

-- Show available functions
SELECT 'FUNCTIONS CREATED:' as info, routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%trial_balance%' 
OR routine_name LIKE '%debug%';

-- Show created tables
SELECT 'TABLES CREATED:' as info, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('debug_settings', 'projects', 'organizations');
