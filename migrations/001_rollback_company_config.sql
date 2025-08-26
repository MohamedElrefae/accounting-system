-- Rollback Migration: Remove company_config table
-- Description: Rollback the company configuration table and related objects
-- Created: 2024-12-25

-- Drop trigger
DROP TRIGGER IF EXISTS update_company_config_updated_at ON company_config;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop policies
DROP POLICY IF EXISTS "Users can read company config" ON company_config;
DROP POLICY IF EXISTS "Admins can modify company config" ON company_config;

-- Drop indexes
DROP INDEX IF EXISTS idx_company_config_created_at;
DROP INDEX IF EXISTS idx_transactions_entry_number;

-- Drop table
DROP TABLE IF EXISTS company_config;
