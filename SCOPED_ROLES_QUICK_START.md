# Scoped Roles Migration - Quick Start

**⚡ 5-Minute Overview**

---

## What Changed?

**Before:** User has ONE role everywhere  
**After:** User has DIFFERENT roles per org/project

---

## Why?

✅ More flexible  
✅ Better security  
✅ Industry standard (Salesforce, SAP, etc.)

---

## Deploy in 5 Steps

### 1. Backup
```bash
pg_dump your_db > backup.sql
```

### 2. Run Migrations
```bash
supabase db push
```

Or manually:
```bash
psql -f supabase/migrations/20260126_create_scoped_roles_tables.sql
psql -f supabase/migrations/20260126_migrate_to_scoped_roles_data.sql
psql -f supabase/migrations/20260126_update_rls_for_scoped_roles.sql
psql -f supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql
```

### 3. Verify
```sql
SELECT get_user_auth_data('YOUR_USER_ID');
```

### 4. Update Frontend
See `SCOPED_ROLES_MIGRATION_GUIDE.md` Phase 5

### 5. Test
- Super admin → Can access everything
- Org admin → Can manage their org only
- Accountant → Can manage transactions in their org

---

## New Tables

```sql
system_roles (user_id, role)
org_roles (user_id, org_id, role)
project_roles (user_id, project_id, role)
```

---

## New Roles

**System:** `super_admin`, `system_auditor`  
**Org:** `org_admin`, `org_manager`, `org_accountant`, `org_auditor`, `org_viewer`  
**Project:** `project_manager`, `project_contributor`, `project_viewer`

---

## Example

**Before:**
```
Ahmed: accountant (everywhere)
```

**After:**
```
Ahmed:
  - Company A: org_admin
  - Company B: org_viewer
```

---

## Files Created

1. `supabase/migrations/20260126_create_scoped_roles_tables.sql`
2. `supabase/migrations/20260126_migrate_to_scoped_roles_data.sql`
3. `supabase/migrations/20260126_update_rls_for_scoped_roles.sql`
4. `supabase/migrations/20260126_update_get_user_auth_data_for_scoped_roles.sql`
5. `SCOPED_ROLES_MIGRATION_GUIDE.md` (full guide)
6. `SCOPED_ROLES_IMPLEMENTATION_COMPLETE.md` (summary)

---

## Rollback

If needed:
1. Use compatibility views (already created)
2. Restore from backup
3. Keep both systems with feature flag

---

## Full Documentation

📖 **Complete Guide:** `SCOPED_ROLES_MIGRATION_GUIDE.md`  
📊 **Analysis:** `GLOBAL_VS_SCOPED_ROLES_ANALYSIS.md`  
🔒 **Security:** `SERVER_SIDE_RBAC_ENTERPRISE_BEST_PRACTICES.md`

---

**Status:** ✅ READY TO DEPLOY  
**Time:** 2-4 hours  
**Risk:** MEDIUM (backward compatible)
