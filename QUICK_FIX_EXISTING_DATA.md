# Quick Fix - Existing Data Issue

## Problem
Data already exists in tables, RLS still blocking inserts.

## Solution
Temporarily disable RLS, run migration, re-enable RLS.

---

## 4-Step Fix

### Step 1: Clear Old Data (Optional)

In Supabase SQL Editor, run:

```sql
DELETE FROM transaction_lines;
DELETE FROM transactions;
```

### Step 2: Disable RLS

```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines DISABLE ROW LEVEL SECURITY;
```

### Step 3: Run Migration

```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

When prompted, type `yes`

### Step 4: Re-enable RLS

```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
```

---

## Expected Result

```
Transactions: 14224/14224 succeeded
Transaction lines: 14224/14224 succeeded
Success rate: 100.0%
```

---

## Status
✅ Ready to implement
