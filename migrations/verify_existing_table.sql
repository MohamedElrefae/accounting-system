-- Verification SQL for existing company_config table
-- Run this to check if everything is set up correctly

-- 1. Check if table exists and view structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'company_config'
ORDER BY ordinal_position;

-- 2. Check if data exists
SELECT * FROM company_config;

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'company_config';

-- 4. If no data exists, insert default data:
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

-- 5. Ensure RLS is enabled and policies exist
ALTER TABLE company_config ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist (ignore errors)
DO $$ 
BEGIN
    CREATE POLICY "company_config_read" ON company_config FOR SELECT USING (true);
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL;
END $$;

DO $$ 
BEGIN
    CREATE POLICY "company_config_write" ON company_config FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL;
END $$;
