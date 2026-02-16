# Transactions Schema Deployment Guide

## Overview

This guide explains how to deploy the `transactions` and `transaction_lines` tables to Supabase before running the Excel data migration.

## Problem

The migration was failing with error:
```
Could not find the 'account_code' column of 'transactions' in the schema cache
```

This occurred because the database schema for transactions didn't exist in Supabase yet.

## Solution

Two tables need to be created:

### 1. `transactions` Table (Headers)
- Stores transaction header information
- One row per transaction entry
- Columns: `entry_no`, `entry_date`, `org_id`, status, audit fields

### 2. `transaction_lines` Table (Detail Lines)
- Stores individual line items for each transaction
- Multiple rows per transaction (one per account)
- Columns: `account_code`, `debit`, `credit`, dimensions (project, classification, etc.)

## Deployment Methods

### Method 1: Using Supabase Dashboard (Manual)

1. Go to https://app.supabase.com
2. Select your project: `bgxknceshxxifwytalex`
3. Navigate to SQL Editor
4. Create a new query
5. Copy the entire contents of `supabase/migrations/20260214_create_transactions_schema.sql`
6. Paste into the SQL editor
7. Click "Run"
8. Verify both tables were created

### Method 2: Using Deployment Script (Automated)

```bash
# Deploy the schema
node scripts/deploy-transactions-schema.js
```

This script will:
- Connect to Supabase using service role credentials
- Execute all SQL statements from the migration file
- Verify the tables were created
- Report success/failure

### Method 3: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

## Schema Details

### transactions Table

```sql
CREATE TABLE public.transactions (
  id BIGSERIAL PRIMARY KEY,
  entry_no TEXT NOT NULL UNIQUE,           -- Transaction number (e.g., "TXN-001")
  entry_date DATE NOT NULL,                -- Transaction date
  org_id UUID NOT NULL,                    -- Organization ID (foreign key)
  created_at TIMESTAMP WITH TIME ZONE,     -- Audit: creation timestamp
  updated_at TIMESTAMP WITH TIME ZONE,     -- Audit: last update timestamp
  created_by UUID,                         -- Audit: user who created
  updated_by UUID,                         -- Audit: user who last updated
  status TEXT,                             -- Status: draft, submitted, approved, rejected, posted
  notes TEXT                               -- Optional notes
);
```

**Indexes:**
- `idx_transactions_entry_no` - For fast lookup by entry number
- `idx_transactions_entry_date` - For date range queries
- `idx_transactions_org_id` - For organization filtering
- `idx_transactions_status` - For status filtering

**RLS Policies:**
- Users can only view/edit transactions in their organization

### transaction_lines Table

```sql
CREATE TABLE public.transaction_lines (
  id BIGSERIAL PRIMARY KEY,
  entry_no TEXT NOT NULL,                  -- Foreign key to transactions
  account_code TEXT NOT NULL,              -- Chart of accounts code
  account_name TEXT,                       -- Account name
  transaction_classification_code TEXT,    -- Transaction classification
  classification_code TEXT,                -- Classification dimension
  classification_name TEXT,                -- Classification name
  project_code TEXT,                       -- Project dimension
  project_name TEXT,                       -- Project name
  work_analysis_code TEXT,                 -- Work analysis dimension
  work_analysis_name TEXT,                 -- Work analysis name
  sub_tree_code TEXT,                      -- Sub-tree dimension
  sub_tree_name TEXT,                      -- Sub-tree name
  debit DECIMAL(19, 4),                    -- Debit amount
  credit DECIMAL(19, 4),                   -- Credit amount
  notes TEXT,                              -- Line notes
  org_id UUID NOT NULL,                    -- Organization ID
  created_at TIMESTAMP WITH TIME ZONE,     -- Audit: creation timestamp
  updated_at TIMESTAMP WITH TIME ZONE,     -- Audit: last update timestamp
  created_by UUID,                         -- Audit: user who created
  updated_by UUID,                         -- Audit: user who last updated
  line_number INT,                         -- Line sequence number
  status TEXT                              -- Status: draft, submitted, approved, rejected, posted
);
```

**Indexes:**
- `idx_transaction_lines_entry_no` - For fast lookup by transaction
- `idx_transaction_lines_account_code` - For account filtering
- `idx_transaction_lines_org_id` - For organization filtering
- `idx_transaction_lines_project_code` - For project filtering
- `idx_transaction_lines_classification_code` - For classification filtering
- `idx_transaction_lines_status` - For status filtering

**RLS Policies:**
- Users can only view/edit lines in their organization

## Verification

After deployment, verify the tables exist:

```sql
-- Check transactions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Check transaction_lines table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transaction_lines' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('transactions', 'transaction_lines');
```

## Next Steps

Once the schema is deployed:

1. Ensure you have an organization created in Supabase
2. Run the Excel data migration:
   ```bash
   python migrate.py --excel-file path/to/transactions.xlsx
   ```
3. Monitor the migration for any errors
4. Verify data was imported correctly

## Troubleshooting

### Error: "Could not find the 'account_code' column"
- The migration file hasn't been deployed yet
- Run the deployment script or manually execute the SQL

### Error: "relation 'transactions' does not exist"
- Same as above - schema not deployed

### Error: "duplicate key value violates unique constraint"
- The `entry_no` must be unique
- Check for duplicate transaction numbers in your Excel file

### Error: "violates foreign key constraint 'transactions_org_id_fkey'"
- The `org_id` doesn't exist in the organizations table
- Ensure you have created an organization first

## Files

- **Migration SQL:** `supabase/migrations/20260214_create_transactions_schema.sql`
- **Deployment Script:** `scripts/deploy-transactions-schema.js`
- **Column Mapping:** `config/column_mapping_APPROVED.csv`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the migration SQL file for schema details
3. Check Supabase logs for detailed error messages
4. Verify organization exists and user has access
