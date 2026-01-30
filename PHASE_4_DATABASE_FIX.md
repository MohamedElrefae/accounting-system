# Phase 4 - Database Fix: org_memberships Table

**Date**: January 25, 2026  
**Issue**: Migration used `user_organizations` table which doesn't exist  
**Solution**: Updated to use `org_memberships` table

---

## What Was Fixed

### Issue
The initial migration files referenced `user_organizations` table which doesn't exist in the database. The correct table is `org_memberships`.

### Files Updated

1. **`supabase/migrations/20260125_create_permission_audit_logs.sql`**
   - Changed RLS policy to use `org_memberships` instead of `user_organizations`

2. **`supabase/migrations/20260125_create_permission_audit_triggers.sql`**
   - Updated `log_user_roles_changes()` function to use `org_memberships`

3. **`src/services/permissionAuditService.ts`**
   - Service already uses Supabase client which handles table references correctly

---

## Corrected RLS Policy

```sql
-- BEFORE (Incorrect)
CREATE POLICY "Users can view permission audit logs for their organization"
  ON permission_audit_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- AFTER (Correct)
CREATE POLICY "Users can view permission audit logs for their organization"
  ON permission_audit_logs FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships 
      WHERE user_id = auth.uid()
    )
  );
```

---

## Corrected Trigger Function

```sql
-- BEFORE (Incorrect)
SELECT org_id INTO v_org_id FROM user_organizations 
WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) LIMIT 1;

-- AFTER (Correct)
SELECT org_id INTO v_org_id FROM org_memberships 
WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) LIMIT 1;
```

---

## Next Steps

1. Delete the old migration files from Supabase (if already applied)
2. Re-apply the corrected migrations
3. Verify the tables and policies are created correctly

---

## Deployment

To deploy the corrected migrations:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Manual SQL execution
# Copy the corrected SQL from the migration files and execute in Supabase SQL editor
```

---

## Verification

After deployment, verify the setup:

```sql
-- Check if permission_audit_logs table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'permission_audit_logs';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'permission_audit_logs';

-- Check triggers
SELECT * FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('user_roles', 'role_permissions', 'roles');
```

---

## Status

✅ Migration files corrected  
✅ Using correct `org_memberships` table  
✅ Ready for deployment

