# Database Migrations

This directory contains SQL migration scripts for the accounting system database.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: **bgxknceshxxifwytalex**
3. Navigate to: **SQL Editor** (left sidebar)
4. Click: **New Query**
5. Copy the contents of the migration file
6. Paste into the SQL editor
7. Click: **Run** (or press `Ctrl+Enter`)

### Option 2: Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref bgxknceshxxifwytalex

# Run migrations
supabase db push
```

### Option 3: Manual psql

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.bgxknceshxxifwytalex.supabase.co:5432/postgres" -f migrations/001_add_organizations_status.sql
```

## Migration Files

| File | Description | Status |
|------|-------------|--------|
| `001_add_organizations_status.sql` | Adds status column to organizations table | ⏳ Pending |

## After Running Migrations

1. Verify in Supabase Dashboard → **Table Editor** → `organizations` table
2. Check that `status` column exists
3. Refresh your app to clear the warning

## Rollback (if needed)

To rollback a migration, create a new migration file that reverses the changes.

Example: `002_remove_organizations_status.sql`
```sql
ALTER TABLE organizations DROP COLUMN IF EXISTS status;
DROP INDEX IF EXISTS idx_organizations_status;
```

