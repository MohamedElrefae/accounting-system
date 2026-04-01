-- Migration: Make transaction_number_prefix optional
-- Description: Remove NOT NULL constraint from transaction_number_prefix to make it optional
-- Created: 2026-04-01

-- First, update existing empty strings to NULL (to satisfy the upcoming constraint)
UPDATE company_config
SET transaction_number_prefix = NULL
WHERE transaction_number_prefix = '' OR transaction_number_prefix IS NULL;

-- Make the column nullable
ALTER TABLE company_config
ALTER COLUMN transaction_number_prefix DROP NOT NULL;

-- Drop existing constraint if any
ALTER TABLE company_config
DROP CONSTRAINT IF EXISTS check_transaction_number_prefix_length;

-- Add constraint: allow NULL or non-empty strings up to 10 chars
-- Empty strings are converted to NULL above
ALTER TABLE company_config
ADD CONSTRAINT check_transaction_number_prefix_length
CHECK (
    transaction_number_prefix IS NULL 
    OR (LENGTH(transaction_number_prefix) >= 1 AND LENGTH(transaction_number_prefix) <= 10)
);

-- Update comment
COMMENT ON COLUMN company_config.transaction_number_prefix IS 'Optional prefix for transaction numbers (e.g., JE, INV). If null or empty, no prefix is used.';

-- Migration complete
