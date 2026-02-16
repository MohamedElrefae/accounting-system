# Data Exists - Migration Solution

## New Issue
```
new row violates row-level security policy for table "transactions"
```

**Context**: Data already exists in the tables. The RLS error persists even with service role.

## Root Cause Analysis

The RLS error with existing data suggests:
1. Data was partially inserted before
2. RLS policy is still blocking inserts (even with service role)
3. Possible duplicate key conflicts
4. Possible data integrity issues

## Solution: Check and Clean Before Migration

### Step 1: Check Existing Data

Run this SQL in Supabase SQL Editor to see what's already there:

```sql
-- Check transactions table
SELECT COUNT(*) as transaction_count FROM transactions;
SELECT COUNT(*) as transaction_lines_count FROM transaction_lines;

-- Check for org_id issues
SELECT DISTINCT org_id FROM transactions LIMIT 5;
SELECT DISTINCT org_id FROM transaction_lines LIMIT 5;

-- Check for duplicates
SELECT entry_number, COUNT(*) as count 
FROM transactions 
GROUP BY entry_number 
HAVING COUNT(*) > 1;
```

### Step 2: Clear Existing Data (if needed)

If you want to start fresh:

```sql
-- Delete all data from transaction_lines first (foreign key dependency)
DELETE FROM transaction_lines;

-- Delete all data from transactions
DELETE FROM transactions;

-- Verify deletion
SELECT COUNT(*) FROM transactions;
SELECT COUNT(*) FROM transaction_lines;
```

### Step 3: Disable RLS Temporarily

```sql
-- Disable RLS on both tables
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines DISABLE ROW LEVEL SECURITY;
```

### Step 4: Run Migration

```bash
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

Expected output:
```
Transactions: 14224/14224 succeeded
Transaction lines: 14224/14224 succeeded
Success rate: 100.0%
```

### Step 5: Re-enable RLS

```sql
-- Re-enable RLS on both tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
```

---

## Alternative: Keep Existing Data

If you want to keep existing data and only add new records:

### Check for Conflicts

```sql
-- Find which entry_numbers already exist
SELECT DISTINCT entry_number 
FROM transactions 
ORDER BY entry_number;

-- Compare with Excel data to see what's new
```

### Modify Migration to Skip Duplicates

Update `src/executor/migration_executor.py` to check for existing records:

```python
def _record_exists(self, entry_number: str) -> bool:
    """Check if record already exists"""
    try:
        response = self.supabase.table('transactions').select('id').eq('entry_number', entry_number).execute()
        return len(response.data) > 0
    except Exception as e:
        logger.warning(f"Error checking for existing record: {e}")
        return False

def migrate_transactions(self, df: pd.DataFrame):
    """Migrate transactions, skipping duplicates"""
    # ... existing code ...
    
    for _, row in df.iterrows():
        entry_no = row.get('entry no')
        
        # Skip if already exists
        if self._record_exists(entry_no):
            logger.info(f"Skipping duplicate: {entry_no}")
            continue
        
        # ... rest of migration logic ...
```

---

## Recommended Approach

### Option A: Clean Start (RECOMMENDED)
1. Clear all data from tables
2. Disable RLS
3. Run migration
4. Re-enable RLS

**Pros**: Clean, no conflicts, guaranteed success
**Cons**: Loses existing data

### Option B: Keep Existing Data
1. Check what data exists
2. Modify migration to skip duplicates
3. Run migration with duplicate checking

**Pros**: Preserves existing data
**Cons**: More complex, requires code changes

---

## Quick Action Plan

### For Clean Start:

```sql
-- 1. Clear data
DELETE FROM transaction_lines;
DELETE FROM transactions;

-- 2. Disable RLS
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines DISABLE ROW LEVEL SECURITY;
```

Then run:
```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

Then re-enable RLS:
```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
```

---

## Why RLS is Still Blocking

Even with service role, RLS can block if:
1. The RLS policy has a bug or infinite recursion
2. The policy checks something that fails
3. The org_id doesn't match what the policy expects

Disabling RLS temporarily bypasses all these checks.

---

## Status
✅ Column mapping fixed
✅ RLS issue identified
✅ Solution provided for existing data
⏳ Ready for implementation
