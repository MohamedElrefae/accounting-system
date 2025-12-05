# Diagnostic Guide - Blank Approvals Page 🔍

## Quick Diagnosis

The approvals inbox page is blank because the database migration likely hasn't been applied yet. Follow these steps to diagnose and fix:

### Step 1: Run the Test Page

Navigate to: `http://localhost:3000/approvals/test-setup`

This will show you:
- ✅ Current user info
- ✅ Whether RPC functions exist
- ✅ Whether database tables exist
- ✅ Whether approval columns exist

### Step 2: Check the Results

**If you see all ✅ (green):**
- Database migration is applied correctly
- Problem is elsewhere (see "Advanced Debugging" below)

**If you see ❌ (red):**
- Database migration hasn't been applied
- Follow "Apply Database Migration" section below

---

## Apply Database Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /path/to/project

# Push migrations to Supabase
supabase db push

# Verify migration was applied
supabase db pull
```

### Option 2: Manual SQL Execution

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Open file: `supabase/migrations/20250120_line_based_approval.sql`
4. Copy all SQL
5. Paste into Supabase SQL Editor
6. Click "Run"

### Option 3: Using psql (Direct Database)

```bash
# Connect to your Supabase database
psql -h [host] -U [user] -d [database] -f supabase/migrations/20250120_line_based_approval.sql

# Verify
psql -h [host] -U [user] -d [database] -f verify_line_approval_setup.sql
```

---

## Verify Migration Was Applied

After applying the migration, run the test page again:

```
http://localhost:3000/approvals/test-setup
```

You should see:
```
✅ All systems ready! Database migration appears to be applied correctly.
```

---

## Advanced Debugging

If the test page shows everything is OK but the inbox is still blank:

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for these debug messages:

```
🔄 Loading line approvals...
🔍 Getting line approvals for user: [user-id]
📊 RPC response: { data: [...], error: null }
✅ Line approvals loaded: [...]
📋 LineApprovalInbox rendered: { lines: X, loading: false, error: null }
```

### If You See Errors

**Error: "function get_my_line_approvals does not exist"**
- Migration hasn't been applied
- Run the migration (see section above)

**Error: "permission denied for schema public"**
- RLS policies issue
- Check Supabase RLS settings
- Verify user has correct role

**Error: "column approval_status does not exist"**
- Migration partially applied
- Drop and re-apply migration

### Check Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Look for requests to Supabase
5. Check if RPC calls are being made
6. Check response status (should be 200)

---

## Common Issues & Solutions

### Issue 1: Blank Page, No Errors

**Cause:** Migration not applied or RPC function doesn't exist

**Solution:**
```bash
# Apply migration
supabase db push

# Verify
curl -X POST https://[project].supabase.co/rest/v1/rpc/get_my_line_approvals \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"p_user_id": "[user-id]"}'
```

### Issue 2: "Function does not exist" Error

**Cause:** Migration wasn't applied correctly

**Solution:**
1. Go to Supabase SQL Editor
2. Run: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%line_approval%';`
3. If no results, apply migration again

### Issue 3: "Permission Denied" Error

**Cause:** RLS policies blocking access

**Solution:**
1. Check user role in Supabase
2. Verify RLS policies in migration
3. Temporarily disable RLS for testing:
   ```sql
   ALTER TABLE transaction_lines DISABLE ROW LEVEL SECURITY;
   ```

### Issue 4: Empty List (No Pending Approvals)

**This is normal!** If there are no pending approvals, you'll see:
```
✅ All caught up!
No pending line approvals at the moment
```

To test with data:
1. Create a transaction
2. Submit it for approval
3. Check the inbox again

---

## Step-by-Step Fix

### If Blank Page:

1. **Clear browser cache**
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

2. **Run test page**
   ```
   http://localhost:3000/approvals/test-setup
   ```

3. **Check results**
   - All ✅? → Go to step 5
   - Any ❌? → Go to step 4

4. **Apply migration**
   ```bash
   supabase db push
   ```

5. **Refresh test page**
   - Still ❌? → Check Supabase logs
   - All ✅? → Go to step 6

6. **Clear cache again**
   ```
   Ctrl+Shift+R
   ```

7. **Navigate to inbox**
   ```
   http://localhost:3000/approvals/inbox
   ```

8. **Should see:**
   - Page header "صندوق الموافقات"
   - Two tabs with counters
   - Either "All caught up!" or list of approvals

---

## Verify Everything Works

### Create Test Transaction:

1. Go to `/transactions/all`
2. Click "New Transaction"
3. Fill in details:
   - Date: Today
   - Description: "Test transaction"
   - Organization: Any
   - Add 2 lines (debit/credit)
4. Click "Submit for Approval"

### Check Approvals Inbox:

1. Go to `/approvals/inbox`
2. Should see the transaction lines in the inbox
3. Try approving one line
4. Should see status update

---

## Debug Checklist

- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Test page shows all ✅
- [ ] Database migration applied
- [ ] User is authenticated (super_admin role)
- [ ] No console errors
- [ ] Network requests successful (200 status)
- [ ] RPC function exists in database
- [ ] Approval columns exist in transaction_lines table
- [ ] At least one transaction submitted for approval

---

## Still Not Working?

### Collect Debug Info:

1. **Screenshot of test page** (`/approvals/test-setup`)
2. **Console errors** (F12 → Console tab)
3. **Network errors** (F12 → Network tab)
4. **Database query result:**
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name LIKE '%line_approval%';
   ```

### Share This Info:

- Test page results
- Console error messages
- Network request failures
- Database query results
- Steps you've already tried

---

**Status**: Diagnostic tools ready
**Date**: 2025-01-23
**Next Step**: Visit `/approvals/test-setup` to diagnose
