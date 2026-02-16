# RLS Fix - Quick Action Guide

## Problem
```
new row violates row-level security policy for table "transactions"
```

## Solution
Use Supabase **Service Role** key instead of anon key. Service role bypasses RLS and is designed for migrations.

---

## 3-Step Fix

### Step 1: Get Service Role Key
1. Go to: https://app.supabase.com/project/bgxknceshxxifwytalex/settings/api
2. Copy the **Service Role** key (long string starting with `eyJ...`)
3. Keep it safe - don't share it

### Step 2: Update `.env.local`
Replace the `SUPABASE_KEY` value:

**Before:**
```
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # anon key
```

**After:**
```
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service role key
```

### Step 3: Run Migration
```bash
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

**Expected output:**
```
Transactions: 14224/14224 succeeded
Transaction lines: 14224/14224 succeeded
Success rate: 100.0%
```

---

## Then Execute
```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

---

## Why This Works

- **Anon key**: Enforces RLS policies (blocks migration)
- **Service role**: Bypasses RLS (allows migration)
- Service role is designed for server-side operations like migrations

---

## After Migration (Optional)

You can revert to anon key if desired:
```
SUPABASE_KEY=<ORIGINAL_ANON_KEY>
```

---

## Status
✅ Ready to implement
