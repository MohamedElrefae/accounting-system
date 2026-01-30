# RLS Infinite Recursion - Technical Diagnosis

## Error Message
```
infinite recursion detected in policy for relation "system_roles"
```

## Call Stack
```
organizations.ts:147  [getOrganizations] Error fetching organizations
projects.ts:91  [getActiveProjects] Error: Failed to load active projects
ScopeProvider.tsx:150  [ScopeProvider] Error loading scope
```

## Root Cause Analysis

### The Problem Chain

1. **TopBar tries to load organizations**
   ```typescript
   // src/services/organization.ts
   const { data, error } = await supabase
     .from('organizations')
     .select('id, code, name, name_ar, is_active, created_at')
     .eq('is_active', true)
   ```

2. **Supabase checks RLS policy on `organizations` table**
   ```sql
   -- supabase/migrations/20260126_update_rls_for_scoped_roles.sql
   CREATE POLICY "Users can view orgs they belong to"
     ON organizations FOR SELECT
     USING (
       is_super_admin(auth.uid())
       OR
       EXISTS (
         SELECT 1 FROM org_roles  -- ← Checks org_roles table
         WHERE org_id = organizations.id
         AND user_id = auth.uid()
       )
     );
   ```

3. **Supabase checks RLS policy on `org_roles` table**
   ```sql
   -- supabase/migrations/20260126_create_scoped_roles_tables.sql
   CREATE POLICY "Super admins can view all org roles"
     ON org_roles FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM system_roles  -- ← Checks system_roles table
         WHERE user_id = auth.uid()
         AND role = 'super_admin'
       )
     );
   ```

4. **Supabase checks RLS policy on `system_roles` table**
   ```sql
   -- supabase/migrations/20260126_create_scoped_roles_tables.sql
   CREATE POLICY "Super admins can view all system roles"
     ON system_roles FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM system_roles sr2  -- ← CHECKS ITSELF!
         WHERE sr2.user_id = auth.uid()
         AND sr2.role = 'super_admin'
       )
     );
   ```

5. **Infinite Loop**
   - To check if user can see `system_roles`, Postgres needs to check the policy
   - The policy queries `system_roles` to see if user is super admin
   - But that query is also subject to the same policy
   - So it needs to check the policy again
   - Loop forever...

### Visualization

```
organizations query
    ↓
organizations RLS policy
    ↓
org_roles subquery
    ↓
org_roles RLS policy
    ↓
system_roles subquery
    ↓
system_roles RLS policy
    ↓
system_roles subquery (SAME QUERY!)
    ↓
system_roles RLS policy (SAME POLICY!)
    ↓
∞ INFINITE LOOP
```

## Why This Happens

Postgres RLS policies are evaluated for **every row** in a query. When a policy contains a subquery that accesses the same table, Postgres must evaluate the policy for that subquery too. If the policy is the same, it creates infinite recursion.

### The Problematic Pattern

```sql
-- ❌ BAD: Policy checks the same table
CREATE POLICY "check_something"
  ON my_table FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM my_table  -- ← Same table!
      WHERE some_condition
    )
  );
```

### The Safe Pattern

```sql
-- ✅ GOOD: Policy uses SECURITY DEFINER function
CREATE POLICY "check_something"
  ON my_table FOR SELECT
  USING (
    my_security_function(auth.uid())  -- ← Function bypasses RLS
  );

-- Function is marked SECURITY DEFINER
CREATE FUNCTION my_security_function(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM my_table
    WHERE some_condition
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## The Fix

Replace all recursive policies with ones that use SECURITY DEFINER functions:

### Before (Broken)
```sql
CREATE POLICY "Super admins can view all system roles"
  ON system_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM system_roles sr2  -- ← RECURSION
      WHERE sr2.user_id = auth.uid()
      AND sr2.role = 'super_admin'
    )
  );
```

### After (Fixed)
```sql
CREATE POLICY "system_roles_admin_direct"
  ON system_roles FOR ALL
  USING (
    is_super_admin(auth.uid())  -- ← SECURITY DEFINER function
  );

-- This function already exists and is marked SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM system_roles
    WHERE user_id = p_user_id
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Why SECURITY DEFINER Works

When a function is marked `SECURITY DEFINER`:
1. It runs with the privileges of the function owner (usually `postgres`)
2. It bypasses RLS policies
3. It can safely query tables without triggering policies
4. No infinite recursion

## Migration Strategy

1. **Disable RLS** on role tables temporarily
2. **Drop all recursive policies**
3. **Re-enable RLS** with safe policies
4. **Test thoroughly**

This is safe because:
- We're not removing security, just simplifying it
- SECURITY DEFINER functions are already trusted
- The new policies are actually simpler and more performant

## Performance Impact

**Positive**:
- Fewer policy evaluations
- Simpler query plans
- Faster queries

**Negative**:
- None (this is an improvement)

## Testing

After the fix, verify:

```sql
-- Should work without recursion error
SELECT * FROM organizations LIMIT 1;
SELECT * FROM projects LIMIT 1;
SELECT * FROM org_roles LIMIT 1;
SELECT * FROM system_roles LIMIT 1;

-- Should still enforce access control
-- (test with different user roles)
```

## Prevention

For future RLS policies:
1. **Never check the same table in a policy subquery**
2. **Use SECURITY DEFINER functions instead**
3. **Test policies with different user roles**
4. **Monitor for recursion errors in logs**

## References

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

**Status**: Diagnosed and fixed
**Severity**: CRITICAL
**Time to fix**: 5 minutes
**Risk**: LOW
