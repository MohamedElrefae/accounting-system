# Phase 2 Verification Instructions

**Purpose**: Verify that all Phase 2 database components are deployed and working correctly

**File**: `sql/verify_phase_2_complete.sql`

---

## How to Run the Verification

### Option 1: Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire content from `sql/verify_phase_2_complete.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. Review the results

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db execute --file sql/verify_phase_2_complete.sql
```

### Option 3: psql (Direct Database Connection)

```bash
# Using psql directly
psql "postgresql://[user]:[password]@[host]:[port]/[database]" < sql/verify_phase_2_complete.sql
```

---

## What the Verification Script Checks

### 1. **Audit Log Table** (Section 1-3)
- ✅ Table exists
- ✅ All columns present (id, org_id, user_id, action, resource, resource_id, old_value, new_value, created_at)
- ✅ Indexes created (org_id, user_id, created_at, action)

### 2. **All 8 Functions** (Section 4)
- ✅ `log_audit()` - Logs audit events
- ✅ `assign_role_to_user()` - Assigns roles to users
- ✅ `revoke_role_from_user()` - Revokes roles from users
- ✅ `get_user_roles()` - Gets user's roles
- ✅ `assign_permission_to_role()` - Assigns permissions to roles
- ✅ `revoke_permission_from_role()` - Revokes permissions from roles
- ✅ `get_role_permissions()` - Gets role's permissions
- ✅ `get_user_permissions_filtered()` - Gets current user's permissions

### 3. **Function Definitions** (Section 5)
- ✅ Full function code displayed
- ✅ Verify SECURITY DEFINER is set
- ✅ Verify proper parameter types

### 4. **RLS Policies** (Section 6-7)
- ✅ Policies exist on audit_log table
- ✅ Row Level Security is enabled

### 5. **Audit Data** (Section 8-9)
- ✅ Count of audit entries
- ✅ Sample of recent audit entries
- ✅ Verify data is being logged

### 6. **Function Grants** (Section 10)
- ✅ Verify authenticated users have EXECUTE permission
- ✅ Verify service role has proper access

### 7. **Summary** (Section 11)
- ✅ Overall deployment status
- ✅ All components present = ✅ READY

### 8. **Function Details** (Section 12)
- ✅ Function parameters
- ✅ Return types

---

## Expected Results

### ✅ SUCCESS - All Components Deployed

You should see:
- All 8 functions showing "✅ EXISTS"
- audit_log table exists with all columns
- All indexes created
- RLS policies enabled
- Summary shows "✅ ALL PHASE 2 COMPONENTS DEPLOYED"

### ❌ FAILURE - Missing Components

If you see "❌ MISSING" for any function or table:
1. Check the migration files were deployed
2. Run the migrations manually if needed
3. Verify no errors during deployment

---

## Troubleshooting

### If audit_log table is missing:
```sql
-- Run this to create it
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_org_fk FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT audit_log_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

### If functions are missing:
1. Check `supabase/migrations/` folder for Phase 2 migration files
2. Verify migration files start with `20260126_phase_2_`
3. Run migrations manually if needed

### If RLS policies are missing:
```sql
-- Create RLS policy for audit_log
CREATE POLICY IF NOT EXISTS audit_log_org_isolation ON audit_log
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS audit_log_insert_service_role ON audit_log
  FOR INSERT
  WITH CHECK (true);
```

---

## Quick Test Queries

After verification, you can test the functions:

### Test 1: Assign Role to User
```sql
SELECT * FROM assign_role_to_user(
  'user-uuid-here'::uuid,
  1,
  'org-uuid-here'::uuid
);
```

### Test 2: Get User Roles
```sql
SELECT * FROM get_user_roles(
  'user-uuid-here'::uuid,
  'org-uuid-here'::uuid
);
```

### Test 3: Assign Permission to Role
```sql
SELECT * FROM assign_permission_to_role(
  1,
  1,
  'org-uuid-here'::uuid
);
```

### Test 4: Get Role Permissions
```sql
SELECT * FROM get_role_permissions(
  1,
  'org-uuid-here'::uuid
);
```

### Test 5: Get Filtered User Permissions
```sql
SELECT * FROM get_user_permissions_filtered(
  'org-uuid-here'::uuid
);
```

### Test 6: Check Audit Log
```sql
SELECT * FROM audit_log
WHERE org_id = 'org-uuid-here'::uuid
ORDER BY created_at DESC
LIMIT 10;
```

---

## Next Steps

If all components are verified ✅:
1. Phase 2 database foundation is complete
2. Ready to proceed with TASK-2.2: Add Project Access Validation
3. Update ScopeContext to use these functions
4. Implement scope enforcement logic

If any components are missing ❌:
1. Deploy missing migrations
2. Create missing functions/tables
3. Re-run verification script
4. Confirm all components show ✅

---

## Files Referenced

- `sql/verify_phase_2_complete.sql` - This verification script
- `supabase/migrations/20260126_phase_2_audit_logging.sql` - Audit logging
- `supabase/migrations/20260126_phase_2_role_assignment_functions.sql` - Role functions
- `supabase/migrations/20260126_phase_2_permission_assignment_functions.sql` - Permission functions
- `supabase/migrations/20260126_phase_2_filtered_permissions_function.sql` - Filtered permissions

---

**Status**: Ready to verify Phase 2 deployment  
**Time to run**: ~30 seconds  
**Expected result**: ✅ ALL PHASE 2 COMPONENTS DEPLOYED
