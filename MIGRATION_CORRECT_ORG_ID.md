# Migration - Correct Organization ID

## Issue Identified

The migration was using the wrong organization ID:
- **Wrong**: `731a3a00-6fa6-4282-9bec-8b5a8678e127`
- **Correct**: `d5789445-11e3-4ad6-9297-b56521675114`

**Error:**
```
insert or update on table "transactions" violates foreign key constraint "transactions_org_id_fkey"
Key (org_id)=(731a3a00-6fa6-4282-9bec-8b5a8678e127) is not present in table "organizations"
```

---

## Execute Migration with Correct Org ID

### Step 1: Disable RLS

```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines DISABLE ROW LEVEL SECURITY;
```

### Step 2: Clear Old Data (Optional)

```sql
DELETE FROM transaction_lines;
DELETE FROM transactions;
```

### Step 3: Run Migration with CORRECT Org ID

```powershell
python migrate.py --mode execute --batch-size 100 --org-id d5789445-11e3-4ad6-9297-b56521675114
```

### Step 4: Re-enable RLS

```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
```

### Step 5: Verify Results

```sql
-- Check transaction count (should be 2,164)
SELECT COUNT(*) FROM transactions 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';

-- Check transaction lines count (should be 14,224)
SELECT COUNT(*) FROM transaction_lines 
WHERE org_id = 'd5789445-11e3-4ad6-9297-b56521675114';
```

---

## Expected Results

```
Transactions: 2,164/2,164 succeeded
Transaction lines: 14,224/14,224 succeeded
Success rate: 100.0%
```

---

## Status: ✅ READY

All fixes applied. Use the correct org_id and migration will complete successfully.

