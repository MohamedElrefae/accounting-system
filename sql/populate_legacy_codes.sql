-- Populate legacy_code values in accounts table from CSV data
-- This fixes the account mapping issue

-- First, let's check current state
SELECT id, code, legacy_code, name 
FROM accounts 
WHERE legacy_code IS NULL 
LIMIT 10;

-- Create a temporary table to hold the CSV data
CREATE TEMP TABLE temp_accounts_data (
  id UUID,
  org_id UUID,
  code TEXT,
  name TEXT,
  category TEXT,
  normal_balance TEXT,
  parent_id UUID,
  level INTEGER,
  path TEXT,
  status TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  name_ar TEXT,
  description_ar TEXT,
  is_standard BOOLEAN,
  allow_transactions BOOLEAN,
  is_postable BOOLEAN,
  is_active BOOLEAN,
  legacy_code TEXT,
  legacy_name TEXT
);

-- Update accounts table with legacy_code values
-- Match by code and org_id to ensure accuracy
UPDATE accounts a
SET legacy_code = t.legacy_code
FROM temp_accounts_data t
WHERE a.code = t.code 
  AND a.org_id = t.org_id
  AND a.legacy_code IS NULL
  AND t.legacy_code IS NOT NULL;

-- Verify the update
SELECT COUNT(*) as updated_count
FROM accounts
WHERE legacy_code IS NOT NULL;

-- Show sample of updated records
SELECT id, code, legacy_code, name 
FROM accounts 
WHERE legacy_code IS NOT NULL 
LIMIT 20;
