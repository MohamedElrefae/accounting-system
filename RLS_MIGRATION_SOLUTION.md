# RLS Migration Solution

## New Error Encountered
```
new row violates row-level security policy for table "transactions"
```

## Root Cause
The migration is using a regular authenticated user that doesn't have the proper organization membership to insert records. RLS policies are blocking the insert even though `org_id` is being set correctly.

## Solution Options

### Option 1: Use Service Role (RECOMMENDED)
Use Supabase's service role key which bypasses RLS policies. This is the safest approach for migrations.

**Steps:**
1. Get the service role key from Supabase project settings
2. Update `.env.local` to use service role instead of anon key
3. Run migration

**Advantages:**
- Bypasses RLS safely
- No need to modify database policies
- Standard practice for migrations
- Can be reverted after migration

### Option 2: Temporarily Disable RLS
Disable RLS on the tables during migration, then re-enable.

**Steps:**
1. Run SQL to disable RLS on transactions and transaction_lines tables
2. Run migration
3. Re-enable RLS

**Disadvantages:**
- Requires database access
- More manual steps
- Risk of forgetting to re-enable

### Option 3: Add Migration User to Organization
Add the migration user to the organization with appropriate permissions.

**Disadvantages:**
- Requires user management
- More complex setup
- Not ideal for automated migrations

---

## Recommended: Option 1 - Service Role

### Step 1: Get Service Role Key

1. Go to Supabase Dashboard
2. Project: `bgxknceshxxifwytalex`
3. Settings → API
4. Copy the "Service Role" key (NOT the anon key)

### Step 2: Update `.env.local`

Replace the current `SUPABASE_KEY` with the service role key:

```bash
SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
SUPABASE_KEY=<SERVICE_ROLE_KEY_HERE>  # Use service role, not anon key
```

### Step 3: Run Migration

```bash
python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

Expected result:
```
Transactions: 14224/14224 succeeded
Transaction lines: 14224/14224 succeeded
Success rate: 100.0%
```

---

## Alternative: Option 2 - Temporarily Disable RLS

If you prefer to disable RLS temporarily:

### Step 1: Disable RLS

Run this SQL in Supabase SQL Editor:

```sql
-- Disable RLS on transactions table
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on transaction_lines table
ALTER TABLE transaction_lines DISABLE ROW LEVEL SECURITY;
```

### Step 2: Run Migration

```bash
python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
```

### Step 3: Re-enable RLS

Run this SQL in Supabase SQL Editor:

```sql
-- Re-enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on transaction_lines table
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
```

---

## Why RLS is Blocking the Insert

The RLS policy on the `transactions` table likely requires:
1. User must be authenticated
2. User must be a member of the organization (`org_id`)
3. User can only insert records for their organization

The migration user doesn't have organization membership, so even though `org_id` is set correctly, the policy blocks the insert.

---

## Service Role vs Anon Key

| Aspect | Anon Key | Service Role |
|--------|----------|--------------|
| RLS Policies | Enforced | Bypassed |
| Use Case | Client-side | Server-side, migrations |
| Security | High | High (server-only) |
| Migrations | ❌ Blocked by RLS | ✅ Works |

---

## Implementation Steps

### Quick Start (Service Role Method)

1. **Get service role key from Supabase**
   - Dashboard → Settings → API → Service Role key

2. **Update `.env.local`**
   ```
   SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
   SUPABASE_KEY=<SERVICE_ROLE_KEY>
   ```

3. **Run dry-run**
   ```bash
   python migrate.py --mode dry-run --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
   ```

4. **Verify success**
   - Check for 100% success rate
   - No RLS errors

5. **Run execute**
   ```bash
   python migrate.py --mode execute --batch-size 100 --org-id 731a3a00-6fa6-4282-9bec-8b5a8678e127
   ```

6. **Revert to anon key** (optional)
   - After migration completes, you can revert to anon key if desired

---

## Status
✅ RLS issue identified
✅ Solution provided
⏳ Ready for implementation
