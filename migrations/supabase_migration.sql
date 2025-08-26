-- Supabase Migration for Company Configuration
-- Run this in your Supabase SQL editor or via Supabase CLI
-- This creates the company_config table with proper RLS policies

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

-- Add constraints (with safe execution)
DO $$ 
BEGIN
    -- Check and add transaction_number_length constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'company_config' 
        AND constraint_name = 'check_transaction_number_length'
    ) THEN
        ALTER TABLE company_config 
        ADD CONSTRAINT check_transaction_number_length 
        CHECK (transaction_number_length >= 3 AND transaction_number_length <= 8);
    END IF;

    -- Check and add fiscal_year_start_month constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'company_config' 
        AND constraint_name = 'check_fiscal_year_start_month'
    ) THEN
        ALTER TABLE company_config 
        ADD CONSTRAINT check_fiscal_year_start_month 
        CHECK (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12);
    END IF;

    -- Check and add transaction_number_prefix_length constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'company_config' 
        AND constraint_name = 'check_transaction_number_prefix_length'
    ) THEN
        ALTER TABLE company_config 
        ADD CONSTRAINT check_transaction_number_prefix_length 
        CHECK (LENGTH(transaction_number_prefix) >= 1 AND LENGTH(transaction_number_prefix) <= 10);
    END IF;

    -- Check and add currency_symbol_length constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'company_config' 
        AND constraint_name = 'check_currency_symbol_length'
    ) THEN
        ALTER TABLE company_config 
        ADD CONSTRAINT check_currency_symbol_length 
        CHECK (LENGTH(currency_symbol) >= 1 AND LENGTH(currency_symbol) <= 10);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_config_created_at ON company_config(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_entry_number ON transactions(entry_number);

-- Insert default configuration (only if table is empty)
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

-- Enable RLS
ALTER TABLE company_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can read company config" ON company_config
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Admins can modify company config" ON company_config
    FOR ALL USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );

-- Create or replace trigger function for updated_at
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
