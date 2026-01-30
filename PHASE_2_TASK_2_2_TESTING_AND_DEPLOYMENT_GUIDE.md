# Phase 2 Task 2.2 - Testing & Deployment Guide

## ✅ Implementation Status: COMPLETE

All code changes have been successfully implemented with no syntax errors:
- ✅ Migration file created: `supabase/migrations/20260126_phase_2_missing_getter_functions_fixed.sql`
- ✅ `validateProjectAccess()` added to `src/services/projects.ts`
- ✅ `ScopeProvider.tsx` updated with access validation
- ✅ All TypeScript diagnostics pass

---

## 🧪 Testing Checklist

### Phase 1: Development Testing (Local)

**1. Start Development Server**
```bash
npm run dev
```

**2. Test Organization Loading**
- [ ] App loads without errors
- [ ] Check browser console for any errors
- [ ] Verify organizations load in TopBar selector
- [ ] Verify first org auto-selects if no stored preference

**3. Test Project Filtering by Access**
- [ ] Switch to an organization
- [ ] Verify projects dropdown shows only accessible projects
- [ ] Check console logs: `[ScopeProvider] Loaded projects: X`
- [ ] Verify inaccessible projects are filtered out

**4. Test Project Access Validation**
- [ ] Select a project from dropdown
- [ ] Verify project switches successfully
- [ ] Check console: `[ScopeProvider] Restored project from storage`
- [ ] Verify project persists in localStorage

**5. Test Error Handling**
- [ ] Simulate network error (DevTools > Network > Offline)
- [ ] Verify error message displays
- [ ] Verify app doesn't crash
- [ ] Restore connection and verify auto-retry works

**6. Test localStorage Persistence**
- [ ] Select org and project
- [ ] Refresh page (F5)
- [ ] Verify org and project restore
- [ ] Clear localStorage and refresh
- [ ] Verify app resets to first org

### Phase 2: Staging Deployment

**1. Deploy Migration to Staging**
```bash
# Using Supabase CLI
supabase db push --linked
```

**2. Verify RPC Functions Exist**
```sql
-- Run in Supabase SQL Editor
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN (
  'get_user_roles',
  'get_role_permissions', 
  'get_user_permissions_filtered',
  'check_project_access'
)
ORDER BY routine_name;
```

Expected output: 4 functions

**3. Test RPC Functions**
```sql
-- Test get_user_roles
SELECT * FROM get_user_roles(auth.uid());

-- Test get_role_permissions (replace 1 with actual role_id)
SELECT * FROM get_role_permissions(1);

-- Test get_user_permissions_filtered
SELECT * FROM get_user_permissions_filtered();

-- Test check_project_access (replace with actual IDs)
SELECT * FROM check_project_access(
  'project-uuid-here'::uuid,
  'org-uuid-here'::uuid
);
```

**4. Deploy to Staging Environment**
```bash
# Build for staging
npm run build

# Deploy to staging (adjust command for your deployment)
# Example for Vercel:
vercel --prod --scope=your-scope
```

**5. Test in Staging**
- [ ] Repeat all Phase 1 tests in staging environment
- [ ] Test with multiple users if possible
- [ ] Verify project access restrictions work correctly
- [ ] Monitor console for any errors

### Phase 3: Production Deployment

**1. Pre-Production Checklist**
- [ ] All staging tests passed
- [ ] No console errors in staging
- [ ] Performance acceptable (< 100ms for project filtering)
- [ ] Backup database before deployment

**2. Deploy Migration to Production**
```bash
# Using Supabase CLI with production database
supabase db push --linked --db-url $PRODUCTION_DB_URL
```

**3. Verify Production Functions**
```sql
-- Same verification queries as staging
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN (
  'get_user_roles',
  'get_role_permissions', 
  'get_user_permissions_filtered',
  'check_project_access'
)
ORDER BY routine_name;
```

**4. Deploy Application to Production**
```bash
# Build for production
npm run build

# Deploy (adjust for your deployment platform)
vercel --prod
```

**5. Post-Deployment Verification**
- [ ] App loads without errors
- [ ] Organizations load correctly
- [ ] Projects filter by access
- [ ] No console errors
- [ ] Monitor error tracking (Sentry, etc.)

---

## 🔍 Debugging Guide

### Issue: Projects Not Filtering

**Symptoms**: All projects show regardless of access

**Debug Steps**:
1. Check browser console for errors
2. Verify RPC function exists:
   ```sql
   SELECT * FROM check_project_access('project-id'::uuid, 'org-id'::uuid);
   ```
3. Check if user has org membership:
   ```sql
   SELECT * FROM org_memberships 
   WHERE user_id = auth.uid() AND organization_id = 'org-id'::uuid;
   ```
4. Check user roles:
   ```sql
   SELECT * FROM get_user_roles(auth.uid());
   ```

### Issue: Project Access Validation Fails

**Symptoms**: "You do not have access to this project" error

**Debug Steps**:
1. Verify project exists in org:
   ```sql
   SELECT * FROM projects 
   WHERE id = 'project-id'::uuid 
   AND organization_id = 'org-id'::uuid;
   ```
2. Check user permissions:
   ```sql
   SELECT * FROM get_user_permissions_filtered();
   ```
3. Verify role has project permission:
   ```sql
   SELECT * FROM role_permissions rp
   JOIN permissions p ON rp.permission_id = p.id
   WHERE rp.role_id = 1 AND p.resource = 'project';
   ```

### Issue: localStorage Not Persisting

**Symptoms**: Org/project resets on page refresh

**Debug Steps**:
1. Check browser DevTools > Application > Storage > localStorage
2. Verify keys exist: `org_id`, `project_id`
3. Check for storage quota issues
4. Try clearing cache and refreshing

### Issue: Slow Project Loading

**Symptoms**: Projects take > 1 second to load

**Debug Steps**:
1. Check network tab in DevTools
2. Verify RPC function performance:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM check_project_access('project-id'::uuid, 'org-id'::uuid);
   ```
3. Check database indexes on org_memberships, user_roles, role_permissions
4. Consider caching results in React Query

---

## 📊 Performance Targets

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Load organizations | < 500ms | < 1s |
| Load projects for org | < 500ms | < 1s |
| Validate project access | < 50ms | < 100ms |
| Total scope initialization | < 1s | < 2s |

---

## 🚀 Rollback Plan

If issues occur in production:

**1. Immediate Rollback**
```bash
# Revert application to previous version
vercel rollback

# Or redeploy previous commit
git revert HEAD
npm run build
vercel --prod
```

**2. Database Rollback (if needed)**
```bash
# Supabase automatically maintains migration history
# To rollback migration:
supabase db reset  # WARNING: This resets entire database

# Or manually drop functions:
DROP FUNCTION IF EXISTS check_project_access(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_permissions_filtered();
DROP FUNCTION IF EXISTS get_role_permissions(int);
DROP FUNCTION IF EXISTS get_user_roles(uuid);
```

**3. Notify Users**
- Post status update
- Provide ETA for fix
- Monitor error tracking

---

## 📝 Sign-Off Checklist

- [ ] All Phase 1 tests passed
- [ ] All Phase 2 tests passed
- [ ] All Phase 3 tests passed
- [ ] Performance acceptable
- [ ] No console errors
- [ ] Rollback plan verified
- [ ] Team notified of deployment
- [ ] Monitoring configured

---

## 📞 Support

If issues occur:
1. Check debugging guide above
2. Review console logs
3. Check Supabase dashboard for function errors
4. Review recent commits for related changes
5. Contact team lead if unable to resolve

