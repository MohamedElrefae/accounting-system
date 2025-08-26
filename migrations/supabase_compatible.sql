-- PostgreSQL Compatible Migration for Company Configuration
-- This version works with all PostgreSQL versions including older Supabase instances

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

-- Create indexes (with error handling)
DO $$ 
BEGIN
    CREATE INDEX idx_company_config_created_at ON company_config(created_at DESC);
EXCEPTION 
    WHEN duplicate_table THEN 
        -- Index already exists, ignore
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE INDEX idx_transactions_entry_number ON transactions(entry_number);
EXCEPTION 
    WHEN duplicate_table THEN 
        -- Index already exists, ignore
        NULL;
END $$;

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

-- Create RLS policies (with error handling)
DO $$ 
BEGIN
    CREATE POLICY "users_can_read_company_config" ON company_config
        FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION 
    WHEN duplicate_object THEN 
        -- Policy already exists, ignore
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "authenticated_can_modify_company_config" ON company_config
        FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION 
    WHEN duplicate_object THEN 
        -- Policy already exists, ignore
        NULL;
END $$;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_company_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_company_config_updated_at ON company_config;
CREATE TRIGGER update_company_config_updated_at
    BEFORE UPDATE ON company_config
    FOR EACH ROW
    EXECUTE FUNCTION update_company_config_updated_at();
