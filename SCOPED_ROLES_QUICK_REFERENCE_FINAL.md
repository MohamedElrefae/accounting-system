# Scoped Roles - Quick Reference Guide

**Date:** January 26, 2026  
**Status:** ✅ READY TO DEPLOY

---

## 🎯 What You Need to Know

### The Change
**Before:** Users have same role everywhere (global)  
**After:** Users have different roles per org/project (scoped)

### Example
```
Ahmed:
  - Org A: admin (full control)
  - Org B: viewer (read-only)
  - Project X: manager
  - Project Y: contributor
```

### Why?
- ✅ More flexible
- ✅ Better security
- ✅ Industry standard (Salesforce, Dynamics, SAP)
- ✅ Easier delegation

---

## 📋 Deployment Steps

### 1. Backup Database
```bash
pg_dump your_database > backup_$(date +%Y%m%d).sql
```

### 2. Run 4 Migrations (In Order)
```bash
# Option A: Using Supabase CLI
supabase db push

# Option B: Manual via Supabase Dashboard
# Copy/paste each file in SQL Editor and run
```

**Files to run (in order):**
1. `supabase/migrations/20260126_create_scoped_roles_tables.sql`
2. `supabase/migrations/20260126_migrate_to_scoped_roles_data_CLEAN.sql`
3. `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`
4. `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`

### 3. Verify Deployment
```sql
-- Check tables exist and are empty
SELECT COUNT(*) FROM org_roles;      -- Should be 0
SELECT COUNT(*) FROM project_roles;  -- Should be 0
SELECT COUNT(*) FROM system_roles;   -- Should be 0

-- Check functions work
SELECT has_org_role('user-id', 'org-id', 'org_admin');
SELECT is_super_admin('user-id');
```

### 4. Add Data (When Ready)
```bash
psql -f sql/add_scoped_roles_data_later.sql
```

### 5. Update Frontend (Phase 5)
- Update `src/hooks/useOptimizedAuth.ts`
- See `SCOPED_ROLES_MIGRATION_GUIDE.md` for code

---

## 🎯 New Tables

### org_roles
```sql
user_id UUID
org_id UUID
role TEXT -- org_admin, org_manager, org_accountant, org_auditor, org_viewer
can_access_all_projects BOOLEAN
```

### project_roles
```sql
user_id UUID
project_id UUID
role TEXT -- project_manager, project_contributor, project_viewer
```

### system_roles
```sql
user_id UUID
role TEXT -- super_admin, system_auditor
```

---

## 🔧 New Helper Functions

```sql
-- Check if user has role in org
has_org_role(user_id, org_id, role) → BOOLEAN

-- Check if user has role in project
has_project_role(user_id, project_id, role) → BOOLEAN

-- Check if user is super admin
is_super_admin(user_id) → BOOLEAN

-- Get user's roles in org
get_user_org_roles(user_id, org_id) → TABLE(role TEXT)

-- Get user's roles in project
get_user_project_roles(user_id, project_id) → TABLE(role TEXT)
```

---

## 📊 Role Mapping

### System Level
- `super_admin` - Full access everywhere
- `system_auditor` - Read-only everywhere

### Organization Level
- `org_admin` - Full control in org
- `org_manager` - Manage users/projects
- `org_accountant` - Manage transactions
- `org_auditor` - Read-only audit
- `org_viewer` - Read-only

### Project Level
- `project_manager` - Full control
- `project_contributor` - Create/edit
- `project_viewer` - Read-only

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Phase 1 migration runs without errors
- [ ] Phase 2 migration runs without errors
- [ ] Phase 3 migration runs without errors
- [ ] Phase 4 migration runs without errors
- [ ] `org_roles` table exists and is empty
- [ ] `project_roles` table exists and is empty
- [ ] `system_roles` table exists and is empty
- [ ] RLS policies are active
- [ ] Helper functions work
- [ ] Auth RPC function returns correct data

---

## 🧪 Test with Sample Data

```sql
-- Add test super admin
INSERT INTO system_roles (user_id, role, created_by)
VALUES ('test-user-id', 'super_admin', 'test-user-id');

-- Add test org role
INSERT INTO org_roles (user_id, org_id, role, can_access_all_projects, created_by)
VALUES ('test-user-id', 'test-org-id', 'org_admin', true, 'test-user-id');

-- Add test project role
INSERT INTO project_roles (user_id, project_id, role, created_by)
VALUES ('test-user-id', 'test-project-id', 'project_manager', 'test-user-id');

-- Verify
SELECT 'system' as scope, role FROM system_roles WHERE user_id = 'test-user-id'
UNION ALL
SELECT 'org:' || org_id, role FROM org_roles WHERE user_id = 'test-user-id'
UNION ALL
SELECT 'project:' || project_id, role FROM project_roles WHERE user_id = 'test-user-id';
```

---

## 🔄 Rollback

If something goes wrong:

```sql
-- Drop new tables
DROP TABLE IF EXISTS org_roles CASCADE;
DROP TABLE IF EXISTS project_roles CASCADE;
DROP TABLE IF EXISTS system_roles CASCADE;
```

Or restore from backup:
```bash
psql your_database < backup_YYYYMMDD.sql
```

---

## 📚 Documentation Files

- `SCOPED_ROLES_DEPLOYMENT_ACTION_PLAN.md` - Detailed deployment guide
- `SCOPED_ROLES_CLEAN_DEPLOYMENT.md` - Clean deployment approach
- `SCOPED_ROLES_MIGRATION_GUIDE.md` - Complete implementation guide
- `GLOBAL_VS_SCOPED_ROLES_ANALYSIS.md` - Architecture analysis
- `SERVER_SIDE_RBAC_ENTERPRISE_BEST_PRACTICES.md` - Security best practices

---

## 🚀 Timeline

- **Deployment:** 15-30 minutes
- **Verification:** 10-15 minutes
- **Sample Data Testing:** 15-30 minutes (optional)
- **Data Migration:** 5-10 minutes (when ready)
- **Frontend Update:** 1-2 hours (Phase 5)
- **Total:** 3-5 hours

---

## ⚠️ Important

- ✅ Tables created empty (no automatic data migration)
- ✅ You control when data is added
- ✅ Can test with sample data first
- ✅ Old tables remain (backward compatible)
- ✅ Easy to rollback if needed

---

## 🎯 Next Steps

1. **Read** `SCOPED_ROLES_DEPLOYMENT_ACTION_PLAN.md`
2. **Backup** your database
3. **Deploy** 4 migrations in order
4. **Verify** deployment success
5. **Test** with sample data (optional)
6. **Add** real data when ready
7. **Update** frontend (Phase 5)
8. **Deploy** to production

---

**Status:** ✅ READY TO DEPLOY  
**Risk:** LOW  
**Estimated Time:** 1-2 hours

**Ready to proceed?** Start with Step 1: Backup Database

</content>
