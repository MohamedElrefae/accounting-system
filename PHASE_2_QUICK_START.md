# Phase 2 Quick Start - Deploy Now

**Status**: Ready to Deploy  
**Time**: 2 hours for database, 4-6 hours for React components

---

## 1-Minute Summary

Phase 2 adds complete audit logging to the enterprise auth system. All infrastructure exists - we're just adding triggers, export functions, and retention policies.

**What's new**:
- Automatic audit logging for all role/permission changes
- Export audit logs to JSON/CSV
- Automatic cleanup of old logs (90 days)
- Ready for analytics dashboard

---

## Deploy in 4 Steps

### Step 1: Deploy Audit Triggers (5 min)

```
File: supabase/migrations/20260125_add_audit_triggers_for_roles.sql
Action: Copy entire file → Supabase SQL Editor → Execute
Result: 3 triggers created, audit logging active
```

### Step 2: Deploy Enhanced RPC Functions (5 min)

```
File: supabase/migrations/20260125_enhance_rpc_with_audit_logging.sql
Action: Copy entire file → Supabase SQL Editor → Execute
Result: 5 functions enhanced/created with audit logging
```

### Step 3: Deploy Export Functions (5 min)

```
File: supabase/migrations/20260125_create_audit_export_function.sql
Action: Copy entire file → Supabase SQL Editor → Execute
Result: 6 export/query functions created
```

### Step 4: Deploy Retention Policy (5 min)

```
File: supabase/migrations/20260125_add_audit_retention_policy.sql
Action: Copy entire file → Supabase SQL Editor → Execute
Result: Retention config table + cleanup functions created
```

---

## Verify Deployment

```sql
-- Check triggers
SELECT COUNT(*) FROM information_schema.triggers 
WHERE trigger_schema = 'public' AND trigger_name LIKE 'tr_audit%';
-- Expected: 3

-- Check functions
SELECT COUNT(*) FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'save_role_permissions', 'assign_role_to_user', 'revoke_role_from_user',
  'export_audit_logs_json', 'export_audit_logs_csv', 'get_audit_log_summary',
  'cleanup_old_audit_logs', 'set_audit_retention_policy'
);
-- Expected: 8+

-- Check retention config table
SELECT COUNT(*) FROM public.audit_retention_config;
-- Expected: 4+ (one per org)
```

---

## Run Tests

```
File: sql/test_phase_2_existing_functions.sql
Action: Copy entire file → Supabase SQL Editor → Execute
Result: 34 tests run, all should pass
```

---

## What Gets Logged

Every time someone:
- ✅ Assigns a role to a user
- ✅ Revokes a role from a user
- ✅ Assigns permissions to a role
- ✅ Revokes permissions from a role
- ✅ Assigns direct permissions to a user

**Logged to audit_logs**:
- Who did it (user_id)
- What org (org_id)
- What action (ROLE_ASSIGNED, PERMISSION_REVOKED, etc.)
- What table (user_roles, role_permissions, etc.)
- What record (record_id)
- Old values (before change)
- New values (after change)
- When (created_at)

---

## Export Audit Logs

```sql
-- Export as JSON
SELECT * FROM public.export_audit_logs_json(
  org_id := 'your-org-id'::uuid,
  p_date_from := NOW() - INTERVAL '7 days',
  p_date_to := NOW()
);

-- Export as CSV
SELECT * FROM public.export_audit_logs_csv(
  org_id := 'your-org-id'::uuid,
  p_date_from := NOW() - INTERVAL '7 days',
  p_date_to := NOW()
);

-- Get summary
SELECT * FROM public.get_audit_log_summary(
  org_id := 'your-org-id'::uuid
);
```

---

## Configure Retention

```sql
-- Set 90-day retention (default)
SELECT * FROM public.set_audit_retention_policy(
  p_org_id := 'your-org-id'::uuid,
  p_retention_days := 90,
  p_auto_delete := TRUE
);

-- Get current policy
SELECT * FROM public.get_audit_retention_policy(
  p_org_id := 'your-org-id'::uuid
);

-- Manual cleanup
SELECT * FROM public.cleanup_old_audit_logs(
  p_org_id := 'your-org-id'::uuid,
  p_retention_days := 90
);
```

---

## Files to Deploy

| File | Size | Time | Status |
|------|------|------|--------|
| 20260125_add_audit_triggers_for_roles.sql | 3KB | 5 min | ✅ Ready |
| 20260125_enhance_rpc_with_audit_logging.sql | 5KB | 5 min | ✅ Ready |
| 20260125_create_audit_export_function.sql | 6KB | 5 min | ✅ Ready |
| 20260125_add_audit_retention_policy.sql | 7KB | 5 min | ✅ Ready |
| test_phase_2_existing_functions.sql | 12KB | 10 min | ✅ Ready |

**Total**: 33KB, 30 minutes

---

## What's Next

After database deployment:

1. **Create AuditLogViewer.tsx** (1-2 hours)
   - Display audit logs in table
   - Filter by action, user, table, date
   - Export to CSV

2. **Create AuditAnalyticsDashboard.tsx** (2-3 hours)
   - Charts showing permission changes
   - Most active users
   - Permission trends

3. **Integrate into Admin Pages** (1 hour)
   - Add audit tabs to role/user management
   - Show audit trail for each role/user

---

## Rollback (If Needed)

```sql
-- Drop everything
DROP TRIGGER IF EXISTS tr_audit_user_roles_changes ON public.user_roles;
DROP TRIGGER IF EXISTS tr_audit_role_permissions_changes ON public.role_permissions;
DROP TRIGGER IF EXISTS tr_audit_user_permissions_changes ON public.user_permissions;
DROP FUNCTION IF EXISTS public.audit_user_roles_changes();
DROP FUNCTION IF EXISTS public.audit_role_permissions_changes();
DROP FUNCTION IF EXISTS public.audit_user_permissions_changes();
DROP FUNCTION IF EXISTS public.assign_role_to_user(UUID, INT, UUID);
DROP FUNCTION IF EXISTS public.revoke_role_from_user(UUID, INT, UUID);
DROP FUNCTION IF EXISTS public.export_audit_logs_json(UUID, TIMESTAMP, TIMESTAMP, TEXT);
DROP FUNCTION IF EXISTS public.export_audit_logs_csv(UUID, TIMESTAMP, TIMESTAMP, TEXT);
DROP FUNCTION IF EXISTS public.cleanup_old_audit_logs(UUID, INT);
DROP FUNCTION IF EXISTS public.set_audit_retention_policy(UUID, INT, BOOLEAN);
DROP TABLE IF EXISTS public.audit_retention_config;
```

---

## Success Checklist

- [ ] All 4 migrations deployed
- [ ] All triggers active
- [ ] All functions created
- [ ] Test suite passes
- [ ] Audit logs being created
- [ ] Export functions working
- [ ] Retention policy configured
- [ ] React components created
- [ ] Admin pages integrated
- [ ] End-to-end testing complete

---

## Support

**Issue**: Trigger not firing  
**Solution**: Check RLS policies, verify auth.uid() works

**Issue**: Export function returns empty  
**Solution**: Check org_id, verify audit logs exist

**Issue**: Retention cleanup not running  
**Solution**: Check auto_delete = TRUE, verify cron job

---

## Timeline

- **Now**: Deploy 4 migrations (30 min)
- **Today**: Run tests, verify (30 min)
- **Tomorrow**: Create React components (4-6 hours)
- **Day 3**: Integration & testing (2-3 hours)
- **Day 4-5**: Final testing & sign-off

**Total**: 3-5 days ✅

---

## Key Files

- `PHASE_2_REVISED_COMPLETION_PLAN.md` - Full plan
- `PHASE_2_IMPLEMENTATION_GUIDE.md` - Detailed steps
- `PHASE_2_EXECUTION_STATUS.md` - Current status
- `supabase/migrations/20260125_*.sql` - 4 migrations
- `sql/test_phase_2_existing_functions.sql` - Tests

---

**Ready to Deploy Phase 2!** 🚀

Start with Step 1 above.
