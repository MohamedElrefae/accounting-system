# Enterprise Auth Phase 3: Detailed Tasks

**Phase 3 Focus:** Audit System Implementation & Verification

---

## Task 3.1: Audit Service Architecture Setup

### Objective
Establish the foundational audit service infrastructure for tracking all permission and role changes.

### Subtasks

**3.1.1 Create Audit Log Tables**
- Create `audit_logs` table with columns:
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key to auth.users)
  - `action` (TEXT: 'CREATE', 'UPDATE', 'DELETE')
  - `resource_type` (TEXT: 'role', 'permission', 'user_role', 'role_permission')
  - `resource_id` (UUID)
  - `old_values` (JSONB)
  - `new_values` (JSONB)
  - `timestamp` (TIMESTAMPTZ, default now())
  - `org_id` (UUID, for scoping)
  - `ip_address` (INET, optional)
  - `user_agent` (TEXT, optional)

**3.1.2 Create Audit Triggers**
- Trigger on `user_roles` table INSERT/UPDATE/DELETE
- Trigger on `role_permissions` table INSERT/UPDATE/DELETE
- Trigger on `roles` table UPDATE (name/description changes)
- Trigger on `permissions` table UPDATE (name/description changes)
- All triggers must capture old and new values

**3.1.3 Create Audit Retention Policy**
- Set retention period (default: 90 days for standard, 1 year for compliance)
- Create cleanup function to archive/delete old logs
- Schedule cleanup job (optional, can be manual)

### Deliverables
- [ ] `audit_logs` table created with proper indexes
- [ ] All audit triggers deployed and tested
- [ ] Retention policy documented and configurable
- [ ] SQL file: `supabase/migrations/20260125_create_audit_logs.sql`

### Testing
```sql
-- Verify audit logs capture changes
INSERT INTO roles (org_id, name) VALUES (...);
SELECT * FROM audit_logs WHERE resource_type = 'role' ORDER BY timestamp DESC LIMIT 1;
```

---

## Task 3.2: Audit Export & Reporting Functions

### Objective
Create RPC functions to export and analyze audit data for compliance and debugging.

### Subtasks

**3.2.1 Create Audit Export Function**
```sql
create_audit_export(
  org_id UUID,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  resource_type TEXT (optional),
  format TEXT ('json' | 'csv')
) RETURNS TABLE
```
- Filters audit logs by date range and org
- Supports optional resource type filtering
- Returns structured data for export
- Respects user permissions (org-scoped)

**3.2.2 Create Audit Summary Function**
```sql
get_audit_summary(
  org_id UUID,
  days INTEGER DEFAULT 30
) RETURNS TABLE
```
- Returns summary statistics:
  - Total changes by resource type
  - Changes by user
  - Changes by action type
  - Most active users
  - Most modified resources

**3.2.3 Create User Activity Timeline**
```sql
get_user_activity_timeline(
  org_id UUID,
  user_id UUID,
  limit INTEGER DEFAULT 100
) RETURNS TABLE
```
- Returns chronological list of user actions
- Includes resource details and changes
- Useful for debugging and compliance

### Deliverables
- [ ] Three RPC functions created and tested
- [ ] Functions respect org-scoped permissions
- [ ] SQL file: `supabase/migrations/20260125_create_audit_export_functions.sql`
- [ ] Example queries documented

### Testing
```sql
-- Test export function
SELECT * FROM create_audit_export(
  org_id := current_org_id,
  start_date := NOW() - INTERVAL '30 days',
  end_date := NOW(),
  format := 'json'
);
```

---

## Task 3.3: Audit UI Components

### Objective
Build React components to display and interact with audit data.

### Subtasks

**3.3.1 Create AuditLogs Component**
- File: `src/components/Audit/AuditLogs.tsx`
- Features:
  - Table display of audit logs
  - Sortable columns (timestamp, user, action, resource)
  - Filterable by date range, resource type, user
  - Pagination (50 items per page)
  - Expandable rows showing old/new values
  - Export button (JSON/CSV)

**3.3.2 Create AuditSummary Component**
- File: `src/components/Audit/AuditSummary.tsx`
- Features:
  - Summary statistics cards
  - Charts showing trends (changes over time)
  - Top users/resources
  - Quick filters for common views

**3.3.3 Create UserActivityTimeline Component**
- File: `src/components/Audit/UserActivityTimeline.tsx`
- Features:
  - Vertical timeline of user actions
  - Color-coded by action type
  - Expandable details for each action
  - Search/filter by resource

### Deliverables
- [ ] Three React components created
- [ ] Components use hooks for data fetching
- [ ] Proper TypeScript types defined
- [ ] Responsive design (mobile-friendly)
- [ ] Files created in `src/components/Audit/`

---

## Task 3.4: Audit Management Page

### Objective
Create the main audit management interface accessible to admins.

### Subtasks

**3.4.1 Create AuditManagement Page**
- File: `src/pages/admin/AuditManagement.tsx`
- Layout:
  - Top: Summary statistics
  - Middle: Tabbed interface
    - Tab 1: Audit Logs (with filters)
    - Tab 2: User Activity
    - Tab 3: Compliance Reports
  - Bottom: Export options

**3.4.2 Add Route**
- Add to `src/routes/AdminRoutes.tsx`
- Path: `/admin/audit`
- Requires: `admin` or `audit_viewer` role

**3.4.3 Add Navigation**
- Add menu item to admin sidebar
- Icon: `FileText` or `BarChart3`
- Label: "Audit Logs"

### Deliverables
- [ ] AuditManagement page created
- [ ] Route added and accessible
- [ ] Navigation menu updated
- [ ] Page styled consistently with app theme

---

## Task 3.5: Audit Service Hooks

### Objective
Create custom hooks for audit data fetching and management.

### Subtasks

**3.5.1 Create useAuditLogs Hook**
- File: `src/hooks/useAuditLogs.ts`
- Features:
  - Fetch audit logs with filters
  - Pagination support
  - Sorting support
  - Real-time updates (optional)
  - Error handling

**3.5.2 Create useAuditSummary Hook**
- File: `src/hooks/useAuditSummary.ts`
- Features:
  - Fetch summary statistics
  - Configurable time range
  - Caching (5-minute TTL)

**3.5.3 Create useUserActivity Hook**
- File: `src/hooks/useUserActivity.ts`
- Features:
  - Fetch user activity timeline
  - Filter by user
  - Pagination

### Deliverables
- [ ] Three custom hooks created
- [ ] Proper TypeScript types
- [ ] Error handling and loading states
- [ ] Hooks tested with sample data

---

## Task 3.6: Audit Service Backend

### Objective
Create TypeScript service for audit operations.

### Subtasks

**3.6.1 Create auditService.ts**
- File: `src/services/auditService.ts`
- Functions:
  - `fetchAuditLogs(filters)` - Get audit logs
  - `fetchAuditSummary(orgId, days)` - Get summary
  - `fetchUserActivity(userId)` - Get user timeline
  - `exportAuditData(filters, format)` - Export data
  - `getAuditStats()` - Get statistics

**3.6.2 Create Audit Types**
- File: `src/types/audit.ts`
- Types:
  - `AuditLog`
  - `AuditSummary`
  - `UserActivity`
  - `AuditFilters`
  - `AuditExportOptions`

### Deliverables
- [ ] auditService.ts created with all functions
- [ ] audit.ts types file created
- [ ] Proper error handling
- [ ] JSDoc comments for all functions

---

## Task 3.7: Audit Data Verification

### Objective
Verify that audit system captures all required changes correctly.

### Subtasks

**3.7.1 Create Test Scenarios**
- Scenario 1: Create role → verify audit log
- Scenario 2: Update role → verify old/new values captured
- Scenario 3: Delete role → verify deletion logged
- Scenario 4: Assign permission → verify logged
- Scenario 5: Remove permission → verify logged
- Scenario 6: Assign user role → verify logged

**3.7.2 Run Verification Tests**
- Execute each scenario
- Verify audit logs contain correct data
- Verify timestamps are accurate
- Verify user_id is captured correctly
- Verify org_id is scoped correctly

**3.7.3 Test Export Functions**
- Export last 30 days of data
- Verify export format (JSON/CSV)
- Verify data completeness
- Verify filtering works

### Deliverables
- [ ] Test scenarios documented
- [ ] All tests passed
- [ ] Verification report created
- [ ] SQL file: `sql/verify_audit_system.sql`

---

## Task 3.8: Audit UI Integration Testing

### Objective
Test audit UI components with real data.

### Subtasks

**3.8.1 Test AuditLogs Component**
- Load audit logs page
- Verify data displays correctly
- Test sorting (click column headers)
- Test filtering (date range, resource type)
- Test pagination
- Test expand/collapse rows
- Test export button

**3.8.2 Test AuditSummary Component**
- Verify statistics display
- Verify charts render
- Test time range selector
- Verify data accuracy

**3.8.3 Test UserActivityTimeline Component**
- Load user activity
- Verify timeline displays
- Test expand/collapse
- Test search/filter

### Deliverables
- [ ] All UI tests passed
- [ ] Screenshots of audit pages
- [ ] Test results documented
- [ ] File: `AUDIT_UI_TESTING_RESULTS.md`

---

## Task 3.9: Audit Documentation

### Objective
Create comprehensive documentation for audit system.

### Subtasks

**3.9.1 Create Audit System Guide**
- File: `AUDIT_SYSTEM_GUIDE.md`
- Sections:
  - Overview
  - Architecture
  - Database schema
  - RPC functions
  - UI components
  - Usage examples

**3.9.2 Create Admin Guide**
- File: `AUDIT_ADMIN_GUIDE.md`
- Sections:
  - How to access audit logs
  - How to filter/search
  - How to export data
  - How to interpret results
  - Compliance considerations

**3.9.3 Create Developer Guide**
- File: `AUDIT_DEVELOPER_GUIDE.md`
- Sections:
  - Architecture overview
  - Adding new audit triggers
  - Creating custom reports
  - Testing audit functionality

### Deliverables
- [ ] Three documentation files created
- [ ] Clear examples provided
- [ ] Screenshots included
- [ ] Troubleshooting section added

---

## Task 3.10: Phase 3 Verification & Sign-Off

### Objective
Verify all Phase 3 tasks completed and system ready for Phase 4.

### Subtasks

**3.10.1 Verification Checklist**
- [ ] All audit tables created
- [ ] All audit triggers deployed
- [ ] All RPC functions working
- [ ] All UI components created
- [ ] Audit page accessible
- [ ] All hooks working
- [ ] Service layer complete
- [ ] All tests passed
- [ ] Documentation complete

**3.10.2 Performance Testing**
- Test audit log queries with 10k+ records
- Verify query performance < 1 second
- Test export with large datasets
- Verify no memory leaks

**3.10.3 Security Review**
- Verify RLS policies on audit_logs
- Verify users can only see their org's logs
- Verify sensitive data not exposed
- Verify audit logs themselves are audited

**3.10.4 Create Phase 3 Completion Report**
- File: `PHASE_3_COMPLETION_REPORT.md`
- Include:
  - Tasks completed
  - Issues encountered and resolved
  - Performance metrics
  - Test results
  - Sign-off checklist

### Deliverables
- [ ] Verification checklist completed
- [ ] Performance tests passed
- [ ] Security review passed
- [ ] Phase 3 completion report created
- [ ] Ready for Phase 4

---

## Phase 3 Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| 3.1 - Audit Service Setup | 2 hours | Phase 2 complete |
| 3.2 - Export Functions | 2 hours | 3.1 complete |
| 3.3 - UI Components | 4 hours | 3.2 complete |
| 3.4 - Audit Page | 2 hours | 3.3 complete |
| 3.5 - Hooks | 2 hours | 3.4 complete |
| 3.6 - Service Layer | 2 hours | 3.5 complete |
| 3.7 - Data Verification | 2 hours | 3.6 complete |
| 3.8 - UI Testing | 3 hours | 3.7 complete |
| 3.9 - Documentation | 2 hours | 3.8 complete |
| 3.10 - Sign-Off | 1 hour | All tasks complete |

**Total: ~22 hours**

---

## Success Criteria

✅ All audit logs captured correctly
✅ Export functions working
✅ UI components functional
✅ Audit page accessible to admins
✅ All tests passing
✅ Documentation complete
✅ Performance acceptable
✅ Security verified
✅ Ready for Phase 4

---

## Next Phase (Phase 4)

Phase 4 will focus on:
- Permission audit logging (tracking who changed what)
- Compliance reporting
- Advanced analytics
- Integration with external audit systems
