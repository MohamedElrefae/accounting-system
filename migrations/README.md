# Database Migrations - Company Configuration

This directory contains database migration files for the company configuration feature.

## Migration Files

### 1. `001_create_company_config.sql`
**Purpose**: Creates the `company_config` table with all necessary constraints, indexes, and RLS policies.

**Features**:
- Company information storage
- Transaction number configuration
- Currency and fiscal year settings
- Row Level Security (RLS) policies
- Automatic `updated_at` timestamp updates
- Data validation constraints

### 2. `001_rollback_company_config.sql`
**Purpose**: Rollback migration that removes the company_config table and all related objects.

**Use case**: If you need to undo the migration.

### 3. `supabase_migration.sql`
**Purpose**: Supabase-optimized migration file that can be run directly in the Supabase SQL editor.

**Features**:
- Uses `IF NOT EXISTS` clauses for safe re-runs
- Compatible with Supabase RLS and auth system
- Includes default data insertion

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project
   - Go to "SQL Editor"

2. **Run Migration**
   - Copy the contents of `supabase_migration.sql`
   - Paste into the SQL editor
   - Click "Run" to execute

3. **Verify Installation**
   ```sql
   -- Check if table was created
   SELECT * FROM company_config;
   
   -- Check table structure
   \d company_config
   ```

### Option 2: Supabase CLI

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link your project**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. **Run migration**
   ```bash
   supabase db push
   ```

### Option 3: Direct PostgreSQL

If you have direct access to your PostgreSQL database:

```bash
psql -h your-db-host -p 5432 -U your-username -d your-database -f 001_create_company_config.sql
```

## Migration Details

### Table Structure

```sql
company_config (
  id UUID PRIMARY KEY,
  company_name TEXT NOT NULL,
  transaction_number_prefix TEXT NOT NULL,
  transaction_number_use_year_month BOOLEAN NOT NULL,
  transaction_number_length INTEGER NOT NULL,
  transaction_number_separator TEXT NOT NULL,
  fiscal_year_start_month INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  date_format TEXT NOT NULL,
  number_format TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
)
```

### Constraints Added

- `check_transaction_number_length`: Ensures length is between 3-8 digits
- `check_fiscal_year_start_month`: Ensures month is between 1-12
- `check_transaction_number_prefix_length`: Ensures prefix is 1-10 characters
- `check_currency_symbol_length`: Ensures currency symbol is 1-10 characters

### Indexes Created

- `idx_company_config_created_at`: For performance on created_at queries
- `idx_transactions_entry_number`: For performance on transaction number lookups

### Security (RLS Policies)

- **Read Policy**: All authenticated users can read company config
- **Write Policy**: Only admin users can modify company config

### Default Configuration

The migration inserts a default configuration:

```json
{
  "company_name": "شركتي",
  "transaction_number_prefix": "JE",
  "transaction_number_use_year_month": true,
  "transaction_number_length": 4,
  "transaction_number_separator": "-",
  "fiscal_year_start_month": 1,
  "currency_code": "SAR",
  "currency_symbol": "ر.س",
  "date_format": "YYYY-MM-DD",
  "number_format": "ar-SA"
}
```

## Verification Steps

After running the migration, verify it worked correctly:

### 1. Check Table Creation
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'company_config';
```

### 2. Check Default Data
```sql
SELECT * FROM company_config;
```

### 3. Check Constraints
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'company_config';
```

### 4. Check RLS Policies
```sql
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'company_config';
```

### 5. Test Transaction Number Generation

After the migration, you can test the new transaction numbering:

```javascript
// In your application
import { getNextTransactionNumber } from './services/transactions';

// This should now generate: JE-202412-0001, JE-202412-0002, etc.
const nextNumber = await getNextTransactionNumber();
console.log(nextNumber);
```

## Rollback Instructions

If you need to rollback the migration:

### Using SQL File
```bash
psql -h your-db-host -p 5432 -U your-username -d your-database -f 001_rollback_company_config.sql
```

### Using Supabase Dashboard
1. Open SQL Editor in Supabase Dashboard
2. Copy contents of `001_rollback_company_config.sql`
3. Run the script

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure your database user has CREATE TABLE permissions
   - For Supabase, ensure you're using the service role key

2. **Table Already Exists**
   - Use `supabase_migration.sql` which has `IF NOT EXISTS` clauses
   - Or manually drop the table first: `DROP TABLE IF EXISTS company_config;`

3. **RLS Policy Errors**
   - Ensure the `user_profiles` table exists with a `role` column
   - Check that your auth system is properly configured

4. **Constraint Violations**
   - Check that default values meet the constraint requirements
   - Verify data types match the schema

### Getting Help

If you encounter issues:

1. Check the Supabase logs in the Dashboard
2. Verify your database connection
3. Ensure all prerequisite tables exist (users, user_profiles, transactions)
4. Check your user permissions

## Next Steps

After successful migration:

1. **Update Application**: Ensure your app is using the latest transaction service code
2. **Test Functionality**: Create a few test transactions to verify numbering works
3. **Configure Company Settings**: Use the CompanySettings component to customize your setup
4. **Monitor Performance**: Watch for any performance issues with the new indexing

## Migration Changelog

- **2024-12-25**: Initial creation of company_config table
  - Added transaction numbering configuration
  - Added currency and fiscal year settings  
  - Added RLS security policies
  - Added performance indexes
