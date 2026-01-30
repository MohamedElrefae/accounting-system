# Phase 4: Developer Quick Reference

## Audit Logging API

### Log a Permission Change

```typescript
import { permissionAuditService } from '@/services/permissionAuditService';

await permissionAuditService.logPermissionChange(
  orgId,           // Organization ID
  'ASSIGN',        // Action: ASSIGN | REVOKE | MODIFY | CREATE | DELETE
  'role_permissions', // Resource type
  roleId,          // Resource ID
  null,            // Old value (null for new records)
  { permissions: [...] }, // New value
  'Assigned permissions to role' // Reason
);
```

### Get Audit Logs

```typescript
const logs = await permissionAuditService.getPermissionAuditLogs(
  orgId,
  {
    action: 'ASSIGN',
    resourceType: 'role_permissions',
    limit: 50,
    offset: 0
  }
);
```

### Get Statistics

```typescript
const stats = await permissionAuditService.getAuditStats(orgId);
// Returns: { totalChanges, changesThisWeek, changesThisMonth, topUsers, actionBreakdown }
```

### Export Logs

```typescript
const csv = await permissionAuditService.exportAuditLogs(orgId, filters);
// Returns CSV string ready for download
```

---

## React Hook Usage

```typescript
import { usePermissionAuditLogs } from '@/hooks/usePermissionAuditLogs';

const { logs, loading, error, refetch, hasMore, loadMore } = usePermissionAuditLogs(
  orgId,
  {
    action: 'ASSIGN',
    resourceType: 'role_permissions',
    limit: 50
  }
);
```

---

## UI Components

### View Audit Logs

Navigate to: **Admin → Audit Management → Permission Audit Tab**

Features:
- Statistics dashboard
- Filter by action type
- Filter by resource type
- View detailed logs
- Export to CSV

---

## Database Schema

### permission_audit_logs Table

```sql
- id (UUID, PK)
- org_id (UUID, FK)
- user_id (UUID, nullable)
- action (ENUM: ASSIGN, REVOKE, MODIFY, CREATE, DELETE)
- resource_type (TEXT)
- resource_id (TEXT, nullable)
- old_value (JSONB, nullable)
- new_value (JSONB, nullable)
- reason (TEXT, nullable)
- ip_address (INET, nullable)
- user_agent (TEXT, nullable)
- created_at (TIMESTAMP)
```

---

## Common Tasks

### Add Logging to New Permission Operation

1. Import service:
```typescript
import { permissionAuditService } from '@/services/permissionAuditService';
```

2. Get org ID:
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data: userOrgs } = await supabase
  .from('org_memberships')
  .select('org_id')
  .eq('user_id', user?.id)
  .limit(1)
  .single();
```

3. Log the change:
```typescript
await permissionAuditService.logPermissionChange(
  userOrgs.org_id,
  'ACTION_TYPE',
  'resource_type',
  resourceId,
  oldValue,
  newValue,
  'Description'
);
```

---

## Testing

### Manual Test Checklist

- [ ] Create role → Check CREATE logged
- [ ] Assign permissions → Check ASSIGN logged
- [ ] Modify permissions → Check MODIFY logged
- [ ] Delete role → Check DELETE logged
- [ ] View audit logs → Check UI displays
- [ ] Filter logs → Check filtering works
- [ ] Export logs → Check CSV generated

---

## Troubleshooting

### Logs Not Appearing

1. Check org_id is correct
2. Verify user has org_memberships entry
3. Check RLS policies allow access
4. Review browser console for errors

### Export Not Working

1. Verify logs exist
2. Check browser allows downloads
3. Verify CSV format is correct

### UI Not Loading

1. Check AuditManagement component
2. Verify usePermissionAuditLogs hook
3. Check org_id is provided
4. Review browser console

---

## Performance Tips

- Limit queries to 50-100 records
- Use filters to reduce result set
- Export in batches for large datasets
- Cache statistics for 5 minutes

---

## Security Notes

- All queries filtered by org_id
- RLS policies enforce access control
- User ID captured from auth context
- Logs are immutable (no delete)
- Timestamps in UTC

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/services/permissionAuditService.ts` | Core audit service |
| `src/hooks/usePermissionAuditLogs.ts` | React hook for logs |
| `src/pages/admin/AuditManagement.tsx` | UI component |
| `src/services/permissionSync.ts` | Permission operations |
| `src/components/EnhancedQuickPermissionAssignment.tsx` | Quick assignment |
| `src/pages/admin/EnterpriseRoleManagement.tsx` | Role management |

---

## Support

For issues or questions:
1. Check `PHASE_4_IMPLEMENTATION_SUMMARY.md`
2. Review `PHASE_4_STEP_4_5_COMPLETION_REPORT.md`
3. Consult `PHASE_4_PERMISSION_AUDIT_LOGGING.md`
