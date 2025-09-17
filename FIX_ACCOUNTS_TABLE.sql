-- ================================================
-- FIX ACCOUNTS TABLE - Create or Update Structure
-- Run this in Supabase Dashboard SQL Editor
-- ================================================

-- Check if accounts table exists, if not create it
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_ar TEXT,
    category TEXT NOT NULL CHECK (category IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    account_type TEXT,
    parent_id UUID REFERENCES public.accounts(id),
    level INTEGER DEFAULT 1,
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
    is_postable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    org_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add category column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'category') THEN
        ALTER TABLE accounts ADD COLUMN category TEXT NOT NULL DEFAULT 'asset' CHECK (category IN ('asset', 'liability', 'equity', 'revenue', 'expense'));
    END IF;
    
    -- Add normal_balance column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'normal_balance') THEN
        ALTER TABLE accounts ADD COLUMN normal_balance TEXT NOT NULL DEFAULT 'debit' CHECK (normal_balance IN ('debit', 'credit'));
    END IF;
    
    -- Add is_postable column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'is_postable') THEN
        ALTER TABLE accounts ADD COLUMN is_postable BOOLEAN DEFAULT false;
    END IF;
    
    -- Add is_active column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'is_active') THEN
        ALTER TABLE accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Insert sample accounts if table is empty
INSERT INTO public.accounts (code, name, name_ar, category, account_type, normal_balance, is_postable, is_active)
SELECT * FROM (VALUES
    ('1000', 'Assets', 'الأصول', 'asset', 'asset', 'debit', false, true),
    ('1100', 'Current Assets', 'الأصول المتداولة', 'asset', 'asset', 'debit', false, true),
    ('1110', 'Cash', 'النقد', 'asset', 'asset', 'debit', true, true),
    ('1120', 'Accounts Receivable', 'المدينون', 'asset', 'asset', 'debit', true, true),
    ('2000', 'Liabilities', 'الخصوم', 'liability', 'liability', 'credit', false, true),
    ('2100', 'Current Liabilities', 'الخصوم المتداولة', 'liability', 'liability', 'credit', false, true),
    ('2110', 'Accounts Payable', 'الدائنون', 'liability', 'liability', 'credit', true, true),
    ('3000', 'Equity', 'حقوق الملكية', 'equity', 'equity', 'credit', false, true),
    ('3100', 'Owner Equity', 'رأس المال', 'equity', 'equity', 'credit', true, true),
    ('4000', 'Revenue', 'الإيرادات', 'revenue', 'revenue', 'credit', false, true),
    ('4100', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', 'revenue', 'credit', true, true),
    ('5000', 'Expenses', 'المصروفات', 'expense', 'expense', 'debit', false, true),
    ('5100', 'Operating Expenses', 'المصروفات التشغيلية', 'expense', 'expense', 'debit', true, true)
) AS sample_data(code, name, name_ar, category, account_type, normal_balance, is_postable, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.accounts LIMIT 1);

-- Enable RLS (Row Level Security) if not enabled
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to read accounts" ON public.accounts;
CREATE POLICY "Allow authenticated users to read accounts" ON public.accounts
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow authenticated users to manage accounts" ON public.accounts;
CREATE POLICY "Allow authenticated users to manage accounts" ON public.accounts
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.accounts TO service_role;

-- Verification queries to run after script
SELECT 'Accounts table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
ORDER BY ordinal_position;

SELECT 'Sample accounts count:' as info;
SELECT COUNT(*) as total_accounts FROM public.accounts;

SELECT 'Sample accounts:' as info;
SELECT code, name, category, normal_balance, is_postable, is_active 
FROM public.accounts 
ORDER BY code 
LIMIT 10;