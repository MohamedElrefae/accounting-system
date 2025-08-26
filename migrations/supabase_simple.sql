-- Simple Supabase Migration for Company Configuration
-- This version creates the table and basic structure without complex constraints
-- Run this if the full migration has issues

-- Create company_config table
CREATE TABLE IF NOT EXISTS company_config (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_config_created_at ON company_config(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_entry_number ON transactions(entry_number);

-- Insert default configuration if table is empty
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
) 
SELECT 
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
WHERE NOT EXISTS (SELECT 1 FROM company_config);

-- Enable Row Level Security
ALTER TABLE company_config ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read company config
CREATE POLICY IF NOT EXISTS "authenticated_read_company_config" ON company_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to modify (you can restrict this later)
CREATE POLICY IF NOT EXISTS "authenticated_modify_company_config" ON company_config
    FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_company_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_company_config_updated_at ON company_config;
CREATE TRIGGER update_company_config_updated_at
    BEFORE UPDATE ON company_config
    FOR EACH ROW
    EXECUTE FUNCTION update_company_config_updated_at();
