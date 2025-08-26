-- MINIMAL Supabase Migration - Copy and paste this into Supabase SQL Editor
-- This is the simplest version that should work on any Supabase instance

-- Step 1: Create the table
CREATE TABLE company_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'شركتي',
  transaction_number_prefix TEXT NOT NULL DEFAULT 'JE',
  transaction_number_use_year_month BOOLEAN NOT NULL DEFAULT true,
  transaction_number_length INTEGER NOT NULL DEFAULT 4,
  transaction_number_separator TEXT NOT NULL DEFAULT '-',
  fiscal_year_start_month INTEGER NOT NULL DEFAULT 1,
  currency_code TEXT NOT NULL DEFAULT 'SAR',
  currency_symbol TEXT NOT NULL DEFAULT 'ر.س',
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  number_format TEXT NOT NULL DEFAULT 'ar-SA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 2: Insert default data
INSERT INTO company_config (
    company_name,
    transaction_number_prefix,
    transaction_number_use_year_month,
    transaction_number_length,
    transaction_number_separator,
    fiscal_year_start_month,
    currency_code,
    currency_symbol,
    date_format,
    number_format
) VALUES (
    'شركتي',
    'JE',
    true,
    4,
    '-',
    1,
    'SAR',
    'ر.س',
    'YYYY-MM-DD',
    'ar-SA'
);

-- Step 3: Enable RLS
ALTER TABLE company_config ENABLE ROW LEVEL SECURITY;

-- Step 4: Create basic policies
CREATE POLICY "company_config_read" ON company_config FOR SELECT USING (true);
CREATE POLICY "company_config_write" ON company_config FOR ALL USING (auth.role() = 'authenticated');
