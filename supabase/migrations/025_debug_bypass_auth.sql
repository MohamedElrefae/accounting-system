-- ================================================
-- Migration: Debug Bypass for Authentication
-- Purpose: Temporarily disable complex auth to focus on core functionality
-- ================================================

-- Create a debug settings table
CREATE TABLE IF NOT EXISTS public.debug_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert debug bypass setting
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
-- Simplify RLS Policies (Debug Mode)
-- ================================================

-- Drop existing RLS policies temporarily
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all existing RLS policies on main tables
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND tablename IN ('accounts', 'transactions', 'journal_entries', 'projects', 'organizations'))
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
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

-- Create projects and organizations tables if they don't exist
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT,
    name_ar TEXT,
    org_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    name TEXT,
    name_ar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simple RLS policies for projects and organizations
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY debug_projects_policy ON public.projects FOR ALL USING (
    public.is_debug_mode() OR auth.uid() IS NOT NULL
);

CREATE POLICY debug_organizations_policy ON public.organizations FOR ALL USING (
    public.is_debug_mode() OR auth.uid() IS NOT NULL
);

-- Grant necessary permissions
GRANT SELECT ON public.projects TO authenticated, anon;
GRANT SELECT ON public.organizations TO authenticated, anon;

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
