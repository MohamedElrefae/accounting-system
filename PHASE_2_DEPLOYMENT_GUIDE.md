# Phase 2: Frontend Auth Integration - Deployment Guide

**Date:** January 26, 2026  
**Status:** ✅ READY TO DEPLOY  
**Estimated Time:** 30 minutes

---

## 🚀 Quick Deployment Steps

### Step 1: Deploy Database Migration (10 min)

**Option A: Supabase Dashboard (Recommended)**

1. Open Supabase Dashboard: https://app.supabase.com
2. Navigate to your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of:
   ```
   supabase/migrations/20260126_extend_get_user_auth_data_with_scope.sql
   ```
6. Paste into SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Verify success message

**Option B: Supabase CLI**

```bash
# Make sure you're logged in
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

**Verification:**

Run this query in SQL Editor to test:

```sql
-- Replace with a real user ID from your database
SELECT get_user_auth_data('your-user-id-here');
```

**Expected Result:**
```json
{
  "profile": { "id": "...", "email": "...", ... },
  "roles": ["accountant"],
  "organizations": ["org-1", "org-2"],
  "projects": ["proj-1", "proj-2", "proj-3"],
  "default_org": "org-1"
}
```

**If you see this, the migration is successful!** ✅

---

### Step 2: Deploy Frontend Code (10 min)

**Option A: Git Push (Vercel/Netlify)**

```bash
# Commit changes
git add .
git commit -m "feat: Add org/project scope validation to auth hook"
git push origin main

# Deployment will trigger automatically
```

**Option B: Manual Build**

```bash
# Build production bundle
npm run build

# Deploy to your hosting provider
# (Follow your provider's deployment instructions)
```

**Verification:**

1. Open your deployed app
2. Open DevTools Console (F12)
3. Login as a user
4. Look for log message:
   ```
   [Auth] Loaded scope data: { orgs: 2, projects: 5, defaultOrg: "org-1" }
   ```

**If you see this, the frontend is working!** ✅

---

### Step 3: Test with Different User Types (10 min)

**Test 1: Admin User**

1. Login as admin with `can_access_all_projects = true`
2. Open DevTools Console
3. Type:
   ```javascript
   // Get auth hook data
   const auth = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
   // Or just check console logs
   ```
4. Verify:
   - `userOrganizations` has their orgs
   - `userProjects` has ALL projects in org
   - No errors in console

**Test 2: Project Manager**

1. Login as PM with `can_access_all_projects = false`
2. Check console logs
3. Verify:
   - `userOrganizations` has their orgs
   - `userProjects` has ONLY assigned projects
   - No errors in console

**Test 3: New User**

1. Login as new user with no memberships
2. Check console logs
3. Verify:
   - `userOrganizations` is empty array `[]`
   - `userProjects` is empty array `[]`
   - No errors in console

---

## 🧪 Testing Validation Functions

### Test in Browser Console

After logging in, open DevTools Console and run:

```javascript
// Get the auth hook (this is a hack for testing)
// In production, use the hook in your React components

// Test belongsToOrg
console.log('Testing belongsToOrg...');
// Replace with real org ID
const testOrgId = 'your-org-id-here';
// This won't work directly in console, but you can test in a component

// Better: Add a test component temporarily
```

### Test in React Component

Create a temporary test component:

```typescript
// src/components/TestAuthScope.tsx
import { useOptimizedAuth } from '../hooks/useOptimizedAuth';

export function TestAuthScope() {
  const { 
    belongsToOrg, 
    canAccessProject,
    userOrganizations,
    userProjects,
    defaultOrgId
  } = useOptimizedAuth();
  
  return (
    <div style={{ padding: '20px', background: '#f0f0f0' }}>
      <h2>Auth Scope Test</h2>
      
      <h3>Scope Data:</h3>
      <pre>{JSON.stringify({
        userOrganizations,
        userProjects,
        defaultOrgId
      }, null, 2)}</pre>
      
      <h3>Validation Tests:</h3>
      <p>belongsToOrg('{userOrganizations[0]}'): {String(belongsToOrg(userOrganizations[0]))}</p>
      <p>belongsToOrg('fake-org-id'): {String(belongsToOrg('fake-org-id'))}</p>
      <p>canAccessProject('{userProjects[0]}'): {String(canAccessProject(userProjects[0]))}</p>
      <p>canAccessProject('fake-project-id'): {String(canAccessProject('fake-project-id'))}</p>
    </div>
  );
}
```

Add to your app temporarily:

```typescript
// src/App.tsx
import { TestAuthScope } from './components/TestAuthScope';

// Add inside your app (after login)
<TestAuthScope />
```

**Expected Results:**
- ✅ `belongsToOrg(userOrganizations[0])` returns `true`
- ✅ `belongsToOrg('fake-org-id')` returns `false`
- ✅ `canAccessProject(userProjects[0])` returns `true`
- ✅ `canAccessProject('fake-project-id')` returns `false`

---

## 🐛 Troubleshooting

### Issue 1: RPC Returns Null

**Symptoms:**
- Console shows: `[Auth] Loaded scope data: { orgs: 0, projects: 0, defaultOrg: null }`
- User has org memberships in database

**Causes:**
1. Migration not deployed
2. User ID mismatch
3. Database permissions issue

**Solutions:**

1. **Verify migration deployed:**
   ```sql
   -- Check if function exists
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'get_user_auth_data';
   ```

2. **Test RPC directly:**
   ```sql
   -- Replace with real user ID
   SELECT get_user_auth_data('user-id-here');
   ```

3. **Check user memberships:**
   ```sql
   -- Replace with real user ID
   SELECT * FROM org_memberships WHERE user_id = 'user-id-here';
   SELECT * FROM project_memberships WHERE user_id = 'user-id-here';
   ```

### Issue 2: TypeScript Errors

**Symptoms:**
- Build fails with TypeScript errors
- IDE shows red squiggly lines

**Solutions:**

1. **Restart TypeScript server:**
   - VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
   - Or restart your IDE

2. **Check imports:**
   ```typescript
   import { useOptimizedAuth } from '../hooks/useOptimizedAuth';
   ```

3. **Verify types:**
   ```typescript
   const { 
     belongsToOrg,  // Should be (orgId: string) => boolean
     canAccessProject,  // Should be (projectId: string) => boolean
     userOrganizations,  // Should be string[]
     userProjects,  // Should be string[]
     defaultOrgId  // Should be string | null
   } = useOptimizedAuth();
   ```

### Issue 3: Cache Not Updating

**Symptoms:**
- Old data still showing after deployment
- Scope data is empty even after migration

**Solutions:**

1. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear localStorage in DevTools

2. **Bump cache version:**
   ```typescript
   // In src/hooks/useOptimizedAuth.ts
   const CACHE_VERSION = 'v3'; // Changed from 'v2'
   ```

3. **Force logout/login:**
   - Logout
   - Clear localStorage
   - Login again

### Issue 4: Performance Degradation

**Symptoms:**
- Auth load time > 1 second
- App feels slow after deployment

**Solutions:**

1. **Check RPC performance:**
   ```sql
   EXPLAIN ANALYZE
   SELECT get_user_auth_data('user-id-here');
   ```

2. **Add indexes:**
   ```sql
   CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id 
   ON org_memberships(user_id);
   
   CREATE INDEX IF NOT EXISTS idx_project_memberships_user_id 
   ON project_memberships(user_id);
   ```

3. **Monitor logs:**
   - Check Supabase logs for slow queries
   - Check browser DevTools Network tab

---

## 📊 Post-Deployment Checklist

### Immediate Checks (First 10 minutes)

- [ ] RPC function deployed successfully
- [ ] Frontend code deployed successfully
- [ ] No console errors on login
- [ ] Scope data appears in console logs
- [ ] Admin user sees all projects
- [ ] PM user sees only assigned projects
- [ ] New user sees empty arrays

### Short-Term Monitoring (First 24 hours)

- [ ] Monitor error rates in Sentry/logging
- [ ] Check auth load times in analytics
- [ ] Verify no increase in failed API calls
- [ ] Check user feedback for issues
- [ ] Monitor database query performance

### Long-Term Monitoring (First week)

- [ ] Verify cache hit rate is high (>80%)
- [ ] Check for any edge cases
- [ ] Gather user feedback
- [ ] Plan for org-scoped roles (if needed)
- [ ] Consider performance optimizations

---

## 🔄 Rollback Plan

If something goes wrong, here's how to rollback:

### Rollback Frontend

```bash
# Revert the commit
git revert HEAD
git push origin main

# Or deploy previous version
git checkout previous-commit-hash
git push origin main --force
```

### Rollback Database

**Option 1: Restore old function**

```sql
-- Drop new function
DROP FUNCTION IF EXISTS get_user_auth_data(UUID);

-- Recreate old function (without scope data)
CREATE OR REPLACE FUNCTION get_user_auth_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (SELECT row_to_json(up.*) FROM user_profiles up WHERE up.id = p_user_id),
    'roles', (SELECT array_agg(r.name) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = p_user_id)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Option 2: Keep new function, rollback frontend only**

The new RPC function is backward compatible - it just adds new fields. Old frontend code will ignore them.

---

## 📞 Support

### If You Need Help

1. **Check documentation:**
   - `PHASE_2_IMPLEMENTATION_COMPLETE.md`
   - `PHASE_2_VERIFICATION_RESULTS.md`
   - `PHASE_2_FRONTEND_AUTH_INTEGRATION_REVISED.md`

2. **Check logs:**
   - Browser DevTools Console
   - Supabase Logs
   - Application logs

3. **Test queries:**
   - Run SQL queries in Supabase SQL Editor
   - Check database data directly

4. **Contact team:**
   - Provide error messages
   - Provide user ID for testing
   - Provide browser/environment info

---

## ✅ Deployment Complete!

Once all checks pass, Phase 2 is complete! 🎉

**Next Steps:**
- Monitor for issues
- Gather user feedback
- Plan Phase 3 (Route Protection & UI Validation)
- Consider org-scoped roles enhancement

---

**Status:** ✅ READY TO DEPLOY  
**Estimated Time:** 30 minutes  
**Risk Level:** LOW (backward compatible)  
**Last Updated:** January 26, 2026
