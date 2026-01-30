# Scoped Roles Migration - Deployment Action Plan

**Date:** January 26, 2026  
**Status:** ✅ READY TO DEPLOY  
**Approach:** Clean (create structure, add data later)  
**Risk Level:** LOW  
**Estimated Time:** 1-2 hours

---

## 🎯 Current Status

### ✅ What's Complete
- Phase 1: Scoped roles tables created ✅
- Phase 2: Clean setup (empty tables) ✅
- Phase 3: RLS policies updated ✅
- Phase 4: Auth RPC function updated ✅
- Documentation complete ✅
- Data migration script ready ✅

### ⏳ What's Next
1. Deploy 4 migration phases to your database
2. Verify tables and functions created
3. Test with sample data (optional)
4. Add real data when ready
5. Update frontend hook (Phase 5)

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Read this document completely
- [ ] Backup your database
- [ ] Have Supabase credentials ready
- [ ] Test in development environment first

### Phase 1: Create Tables
- [ ] Run: `supabase/migrations/20260126_create_scoped_roles_tables.sql`
- [ ] Verify: Tables created (org_roles, project_roles, system_roles)
- [ ] Verify: RLS policies active
- [ ] Verify: Helper functions available

### Phase 2: Clean Setup
- [ ] Run: `supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql`
- [ ] Verify: No errors
- [ ] Verify: Tables are empty (as expected)

### Phase 3: Update RLS
- [ ] Run: `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`
- [ ] Verify: All RLS policies updated
- [ ] Verify: No conflicts with existing policies

### Phase 4: Update Auth RPC
- [ ] Run: `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`
- [ ] Verify: Function updated
- [ ] Test: Call function with test user

### Post-Deployment
- [ ] Verify all tables exist
- [ ] Verify RLS policies work
- [ ] Verify helper functions work
- [ ] Test with sample data (optional)

---

## 🚀 How to Deploy

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd your-project

# Push migrations to Supabase
supabase db push

# This will run all migrations in order
```

### Option 2: Manual Deployment via Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste each migration file in order:
   - Phase 1: `20260126_create_scoped_roles_tables.sql`
   - Phase 2: `20260126_migrate_to_scoped_roles_data_CLEAN.sql`
   - Phase 3: `20260126_update_rls_for_scoped_roles.sql`
   - Phase 4: `20260126_update_get_user_auth_data_for_scoped_roles.sql`
3. Run each one and verify success

### Option 3: Using psql (If Self-Hosted)

```bash
# Phase 1
psql -h your-host -U your-user -d your-db -f supabase/migrations/20260126_create_scoped_roles_tables.sql

# Phase 2
psql -h your-host -U your-user -d your-db -f supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql

# Phase 3
psql -h your-host -U your-user -d your-db -f supabase/migrations/20260126_update_rls_for_scoped_roles.sql

# Phase 4
psql -h your-host -U your-user -d your-db -f supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql
```

---

## ✅ Verification Queries

Run these after deployment to verify everything is working:

### 1. Check Tables Exist
```sql
-- Should return 3 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('org_roles', 'project_roles', 'system_roles')
ORDER BY table_name;
```

### 2. Check Tables Are Empty
```sql
SELECT 'org_roles' as table_name, COUNT(*) as count FROM org_roles
UNION ALL
SELECT 'project_roles', COUNT(*) FROM project_roles
UNION ALL
SELECT 'system_roles', COUNT(*) FROM system_roles;

-- Expected output:
-- org_roles | 0
-- project_roles | 0
-- system_roles | 0
```

### 3. Check RLS Policies
```sql
-- Should return multiple policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('org_roles', 'project_roles', 'system_roles')
ORDER BY tablename, policyname;
```

### 4. Check Helper Functions
```sql
-- Should return 5 functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'has_org_role',
  'has_project_role',
  'is_super_admin',
  'get_user_org_roles',
  'get_user_project_roles'
)
ORDER BY routine_name;
```

### 5. Test Auth RPC Function
```sql
-- Test with a real user ID
SELECT get_user_auth_data('YOUR_USER_ID'::UUID);

-- Should return JSON with:
-- - profile
-- - system_roles
-- - org_roles
-- - project_roles
-- - organizations
-- - projects
-- - default_org
```

---

## 🧪 Testing with Sample Data

### Option 1: Manual Test Data

```sql
-- Add a test super admin
INSERT INTO system_roles (user_id, role, created_by)
VALUES ('test-user-id', 'super_admin', 'test-user-id');

-- Add a test org role
INSERT INTO org_roles (user_id, org_id, role, can_access_all_projects, created_by)
VALUES ('test-user-id', 'test-org-id', 'org_admin', true, 'test-user-id');

-- Add a test project role
INSERT INTO project_roles (user_id, project_id, role, created_by)
VALUES ('test-user-id', 'test-project-id', 'project_manager', 'test-user-id');

-- Verify
SELECT 'system' as scope, role FROM system_roles WHERE user_id = 'test-user-id'
UNION ALL
SELECT 'org:' || org_id, role FROM org_roles WHERE user_id = 'test-user-id'
UNION ALL
SELECT 'project:' || project_id, role FROM project_roles WHERE user_id = 'test-user-id';
```

### Option 2: Add Real Data

When ready to add real data from your existing tables:

```bash
psql -f sql/add_scoped_roles_data_later.sql
```

This will:
- Add super admins from `user_profiles.is_super_admin`
- Add org roles from `org_memberships`
- Add project roles from `project_memberships`
- Handle org-level access to all projects

---

## 🎯 What Gets Created

### Tables
```
org_roles
├─ id (UUID)
├─ user_id (UUID) → auth.users
├─ org_id (UUID) → organizations
├─ role (TEXT) - org_admin, org_manager, org_accountant, org_auditor, org_viewer
├─ can_access_all_projects (BOOLEAN)
├─ created_at (TIMESTAMPTZ)
├─ updated_at (TIMESTAMPTZ)
└─ created_by (UUID)

project_roles
├─ id (UUID)
├─ user_id (UUID) → auth.users
├─ project_id (UUID) → projects
├─ role (TEXT) - project_manager, project_contributor, project_viewer
├─ created_at (TIMESTAMPTZ)
├─ updated_at (TIMESTAMPTZ)
└─ created_by (UUID)

system_roles
├─ id (UUID)
├─ user_id (UUID) → auth.users
├─ role (TEXT) - super_admin, system_auditor
├─ created_at (TIMESTAMPTZ)
├─ updated_at (TIMESTAMPTZ)
└─ created_by (UUID)
```

### RLS Policies
- ✅ Users can view their own roles
- ✅ Org admins can manage org roles
- ✅ Project managers can manage project roles
- ✅ Super admins can manage all roles

### Helper Functions
- ✅ `has_org_role(user_id, org_id, role)` - Check if user has role in org
- ✅ `has_project_role(user_id, project_id, role)` - Check if user has role in project
- ✅ `is_super_admin(user_id)` - Check if user is super admin
- ✅ `get_user_org_roles(user_id, org_id)` - Get user's roles in org
- ✅ `get_user_project_roles(user_id, project_id)` - Get user's roles in project

### Updated RPC Function
- ✅ `get_user_auth_data(user_id)` - Returns scoped roles + scope data

---

## 📊 Role Hierarchy

### System Level (Global)
```
super_admin
  ↓ Can do anything anywhere
  
system_auditor
  ↓ Can view anything anywhere
```

### Organization Level (Org-Scoped)
```
org_admin
  ↓ Full control in organization
  
org_manager
  ↓ Manage users and projects
  
org_accountant
  ↓ Manage transactions
  
org_auditor
  ↓ Read-only audit access
  
org_viewer
  ↓ Read-only access
```

### Project Level (Project-Scoped)
```
project_manager
  ↓ Full control in project
  
project_contributor
  ↓ Can create and edit
  
project_viewer
  ↓ Read-only access
```

---

## 🔄 Rollback Plan

If something goes wrong:

### Option 1: Drop New Tables
```sql
DROP TABLE IF EXISTS org_roles CASCADE;
DROP TABLE IF EXISTS project_roles CASCADE;
DROP TABLE IF EXISTS system_roles CASCADE;
```

### Option 2: Restore from Backup
```bash
# If you created a backup before deployment
psql your_database < backup_before_scoped_roles_YYYYMMDD.sql
```

### Option 3: Keep Both Systems
- Keep old tables (`user_roles`, `org_memberships`, `project_memberships`)
- Keep new tables (`org_roles`, `project_roles`, `system_roles`)
- Use feature flag to switch between them

---

## 📚 Files Reference

### Migration Files (Run in Order)
1. `supabase/migrations/20260126_create_scoped_roles_tables.sql` - Phase 1
2. `supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql` - Phase 2
3. `supabase/migrations/20260126_update_rls_for_scoped_roles.sql` - Phase 3
4. `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql` - Phase 4

### Data Migration (Run Later)
- `sql/add_scoped_roles_data_later.sql` - Add data when ready

### Documentation
- `SCOPED_ROLES_CLEAN_DEPLOYMENT.md` - Deployment guide
- `SCOPED_ROLES_MIGRATION_GUIDE.md` - Complete implementation guide
- `GLOBAL_VS_SCOPED_ROLES_ANALYSIS.md` - Architecture analysis
- `SERVER_SIDE_RBAC_ENTERPRISE_BEST_PRACTICES.md` - Security best practices

---

## 🎓 Next Steps After Deployment

### Step 1: Verify Deployment ✅
- Run verification queries above
- Check all tables and functions exist
- Test with sample data

### Step 2: Add Data (When Ready)
```bash
psql -f sql/add_scoped_roles_data_later.sql
```

### Step 3: Update Frontend (Phase 5)
- Update `src/hooks/useOptimizedAuth.ts`
- See `SCOPED_ROLES_MIGRATION_GUIDE.md` for details
- Add new permission functions
- Test thoroughly

### Step 4: Test Access Control
- Test with different user types
- Verify permissions work per org/project
- Check UI shows/hides correctly

### Step 5: Deploy to Production
- When confident, deploy to production
- Monitor for issues
- Keep rollback plan ready

---

## ⚠️ Important Notes

### Clean Approach
- ✅ Tables are created empty
- ✅ No automatic data migration
- ✅ You control when data is added
- ✅ Can test with sample data first

### Data Migration
- Run `sql/add_scoped_roles_data_later.sql` when ready
- This migrates data from old tables
- Default roles are assigned (you can customize)
- Handles org-level access to all projects

### Backward Compatibility
- Old tables (`user_roles`, `org_memberships`, `project_memberships`) remain
- Can keep both systems running
- Use feature flag to switch between them
- Allows gradual migration

### Performance
- Indexes created for fast queries
- RLS policies optimized
- Helper functions use SECURITY DEFINER
- Caching recommended for auth hook

---

## 🚀 Quick Start

### 1. Backup Database
```bash
# Create backup before migration
pg_dump your_database > backup_$(date +%Y%m%d).sql
```

### 2. Deploy Migrations
```bash
# Using Supabase CLI (recommended)
supabase db push

# Or manually run each migration file in order
```

### 3. Verify Deployment
```sql
-- Check tables exist
SELECT COUNT(*) FROM org_roles;
SELECT COUNT(*) FROM project_roles;
SELECT COUNT(*) FROM system_roles;

-- Check functions exist
SELECT has_org_role('user-id', 'org-id', 'org_admin');
SELECT is_super_admin('user-id');
```

### 4. Test with Sample Data (Optional)
```sql
-- Add test data
INSERT INTO system_roles (user_id, role, created_by)
VALUES ('test-user', 'super_admin', 'test-user');
```

### 5. Add Real Data (When Ready)
```bash
psql -f sql/add_scoped_roles_data_later.sql
```

### 6. Update Frontend (Phase 5)
- Update `src/hooks/useOptimizedAuth.ts`
- See migration guide for details

---

## 📞 Troubleshooting

### Error: "table org_roles already exists"
- Tables already created
- Skip Phase 1 and 2
- Continue with Phase 3

### Error: "RLS policy already exists"
- Policies already created
- Skip Phase 3
- Continue with Phase 4

### No data in tables
- This is expected!
- Run `sql/add_scoped_roles_data_later.sql` when ready

### Function not found
- Check Phase 1 migration ran successfully
- Verify helper functions created
- Run verification queries

### RLS policy not working
- Check Phase 3 migration ran successfully
- Verify policies created
- Test with specific user

---

## ✅ Success Criteria

### After Deployment
- [ ] All 4 migration phases run without errors
- [ ] Tables created: org_roles, project_roles, system_roles
- [ ] RLS policies active on all tables
- [ ] Helper functions available
- [ ] Auth RPC function updated
- [ ] Verification queries pass

### After Adding Data
- [ ] Data migrated from old tables
- [ ] Record counts correct
- [ ] Sample user has correct roles
- [ ] RLS policies work correctly
- [ ] Access control enforced

### After Frontend Update
- [ ] useOptimizedAuth hook updated
- [ ] New permission functions available
- [ ] UI shows/hides correctly
- [ ] No console errors
- [ ] All tests pass

---

## 🎯 Timeline

- **Phase 1-4 Deployment:** 15-30 minutes
- **Verification:** 10-15 minutes
- **Sample Data Testing:** 15-30 minutes (optional)
- **Data Migration:** 5-10 minutes (when ready)
- **Frontend Update:** 1-2 hours (Phase 5)
- **Testing:** 1-2 hours
- **Total:** 3-5 hours

---

## 📞 Support

If you encounter issues:

1. Check troubleshooting section above
2. Review verification queries
3. Check migration file syntax
4. Review documentation files
5. Check Supabase logs for errors

---

**Status:** ✅ READY TO DEPLOY  
**Approach:** Clean (no data migration)  
**Risk:** LOW  
**Estimated Time:** 1-2 hours for deployment + testing

**Next Action:** Run Phase 1 migration and verify success!

</content>
