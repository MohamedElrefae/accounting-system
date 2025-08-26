-- Migration: Create company_config table
-- Description: Add company configuration table for managing transaction numbering and other company settings
-- Created: 2024-12-25

-- Create company_config table
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

-- Add constraints
ALTER TABLE company_config 
ADD CONSTRAINT check_transaction_number_length 
CHECK (transaction_number_length >= 3 AND transaction_number_length <= 8);

ALTER TABLE company_config 
ADD CONSTRAINT check_fiscal_year_start_month 
CHECK (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12);

ALTER TABLE company_config 
ADD CONSTRAINT check_transaction_number_prefix_length 
CHECK (LENGTH(transaction_number_prefix) >= 1 AND LENGTH(transaction_number_prefix) <= 10);

ALTER TABLE company_config 
ADD CONSTRAINT check_currency_symbol_length 
CHECK (LENGTH(currency_symbol) >= 1 AND LENGTH(currency_symbol) <= 10);

-- Create index for performance
CREATE INDEX idx_company_config_created_at ON company_config(created_at DESC);

-- Create index on transactions.entry_number for performance (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'transactions' 
        AND indexname = 'idx_transactions_entry_number'
    ) THEN
        CREATE INDEX idx_transactions_entry_number ON transactions(entry_number);
    END IF;
END $$;

-- Insert default configuration
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
) ON CONFLICT DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE company_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read company config
CREATE POLICY "Users can read company config" ON company_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Only users with admin role can modify company config
CREATE POLICY "Admins can modify company config" ON company_config
    FOR ALL USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_config_updated_at
    BEFORE UPDATE ON company_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE company_config IS 'Company configuration settings including transaction numbering, currency, and fiscal year settings';

-- Add comments to columns
COMMENT ON COLUMN company_config.id IS 'Unique identifier for the configuration record';
COMMENT ON COLUMN company_config.company_name IS 'Name of the company';
COMMENT ON COLUMN company_config.transaction_number_prefix IS 'Prefix for transaction numbers (e.g., JE, INV, PAY)';
COMMENT ON COLUMN company_config.transaction_number_use_year_month IS 'Whether to include year and month in transaction numbers';
COMMENT ON COLUMN company_config.transaction_number_length IS 'Length of the sequential number part (3-8 digits)';
COMMENT ON COLUMN company_config.transaction_number_separator IS 'Separator character used in transaction numbers';
COMMENT ON COLUMN company_config.fiscal_year_start_month IS 'Month when fiscal year starts (1-12)';
COMMENT ON COLUMN company_config.currency_code IS 'ISO currency code (e.g., SAR, USD, EUR)';
COMMENT ON COLUMN company_config.currency_symbol IS 'Currency symbol displayed in UI';
COMMENT ON COLUMN company_config.date_format IS 'Date format used throughout the application';
COMMENT ON COLUMN company_config.number_format IS 'Number format locale (e.g., ar-SA, en-US)';
