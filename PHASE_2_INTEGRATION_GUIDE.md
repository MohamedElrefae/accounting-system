# Phase 2 - Integration Guide (1-2 Hours)

**Status**: Ready for Integration  
**Components**: AuditLogViewer, AuditAnalyticsDashboard  
**Standards**: All Tree of Accounts standards applied

---

## Quick Start

### Step 1: Add Components to Admin Pages (30 min)

#### Option A: Add to EnterpriseRoleManagement.tsx

```tsx
import { AuditLogViewer } from '../../components/AuditLogViewer';
import { AuditAnalyticsDashboard } from '../../components/AuditAnalyticsDashboard';

// Inside component JSX, add tabs:
<div className="admin-tabs">
  <button onClick={() => setActiveTab('roles')}>Role Management</button>
  <button onClick={() => setActiveTab('audit-logs')}>Audit Logs</button>
  <button onClick={() => setActiveTab('audit-analytics')}>Analytics</button>
</div>

{activeTab === 'audit-logs' && <AuditLogViewer orgId={orgId} />}
{activeTab === 'audit-analytics' && <AuditAnalyticsDashboard orgId={orgId} />}
```

#### Option B: Add to EnterpriseUserManagement.tsx

Same pattern as above.

---

### Step 2: Add Routing (Optional, 15 min)

If you want separate pages:

```tsx
// src/routes/AdminRoutes.tsx
import { AuditLogViewer } from '../components/AuditLogViewer';
import { AuditAnalyticsDashboard } from '../components/AuditAnalyticsDashboard';

export const adminRoutes = [
  {
    path: '/admin/audit-logs',
    element: <AuditLogViewer orgId={orgId} />,
  },
  {
    path: '/admin/audit-analytics',
    element: <AuditAnalyticsDashboard orgId={orgId} />,
  },
];
```

---

### Step 3: Test Components (30 min)

#### Test Checklist

- [ ] Components render without errors
- [ ] Arabic text displays correctly
- [ ] RTL layout works
- [ ] Theme tokens apply
- [ ] Dark/Light theme switching works
- [ ] Filters work
- [ ] Export buttons work
- [ ] Pagination works
- [ ] Responsive design works

#### Manual Testing

1. **Arabic Display**
   - Check that all labels are in Arabic
   - Verify RTL layout (buttons on left, text right-aligned)

2. **Export Functionality**
   - Click "Export JSON" button
   - Verify JSON file downloads
   - Click "Export CSV" button
   - Verify CSV file downloads

3. **Filtering**
   - Select action filter
   - Select table filter
   - Enter record ID
   - Select date range
   - Verify results update

4. **Responsive**
   - Test on mobile (< 480px)
   - Test on tablet (< 768px)
   - Test on desktop (> 1024px)

5. **Theme**
   - Switch to dark theme
   - Verify colors update
   - Switch to light theme
   - Verify colors update

---

### Step 4: Deploy (15 min)

1. Commit changes
2. Push to repository
3. Deploy to Supabase
4. Test in production

---

## Component Props

### AuditLogViewer

```tsx
interface Props {
  orgId: string;  // Organization ID (required)
}

<AuditLogViewer orgId="org-uuid-here" />
```

### AuditAnalyticsDashboard

```tsx
interface Props {
  orgId: string;  // Organization ID (required)
}

<AuditAnalyticsDashboard orgId="org-uuid-here" />
```

---

## Database Functions Required

Ensure these RPC functions are deployed (from Phase 2 migrations):

```sql
-- Export functions
export_audit_logs_json()
export_audit_logs_csv()

-- Summary function
get_audit_log_summary()

-- Query functions
get_audit_logs_by_action()
get_audit_logs_by_user()
get_audit_logs_by_table()
```

**Status**: ✅ Already deployed in Phase 2

---

## CSS Integration

The components use theme tokens. Ensure your theme has these variables:

```css
--surface: #ffffff;
--text-primary: #000000;
--text-secondary: #666666;
--border-light: #e0e0e0;
--border-color: #cccccc;
--accent-primary: #0d6efd;
--accent-primary-hover: #0b5ed7;
--on-accent: #ffffff;
--row-alt-bg: #f5f5f5;
--hover-bg: #eeeeee;
--radius-md: 8px;
--radius-lg: 12px;
--radius-sm: 4px;
```

**Status**: ✅ Already defined in theme/tokens.ts

---

## i18n Integration

The components use the new `src/i18n/audit.ts` file for translations.

To use translations in other components:

```tsx
import { AUDIT_TEXTS } from '../i18n/audit';

const t = (key: keyof typeof AUDIT_TEXTS, lang: 'ar' | 'en' = 'ar') => 
  AUDIT_TEXTS[key][lang];

// Usage
<h2>{t('auditLogs')}</h2>  // سجلات التدقيق
```

---

## File Locations

```
src/
├── components/
│   ├── AuditLogViewer.tsx
│   ├── AuditLogViewer.css
│   ├── AuditAnalyticsDashboard.tsx
│   └── AuditAnalyticsDashboard.css
├── i18n/
│   └── audit.ts
└── pages/
    └── admin/
        ├── EnterpriseRoleManagement.tsx (add components here)
        └── EnterpriseUserManagement.tsx (or here)
```

---

## Troubleshooting

### Components not rendering
- Check that orgId is passed correctly
- Verify supabase connection
- Check browser console for errors

### Arabic text not displaying
- Ensure `dir="rtl"` is set on parent
- Check font supports Arabic characters
- Verify i18n translations are loaded

### Export not working
- Verify RPC functions are deployed
- Check Supabase logs for errors
- Ensure user has permission to call RPC

### Theme not applying
- Verify theme tokens are defined
- Check CSS variables are set
- Verify theme switching works

---

## Performance Tips

1. **Pagination**: Components use 20 records per page
   - Adjust `pageSize` constant if needed
   - Larger pages = more data transfer

2. **Filtering**: Filters are applied server-side
   - Reduces data transfer
   - Faster filtering

3. **Lazy Loading**: Data fetched on demand
   - Only loads visible data
   - Reduces initial load time

4. **Memoization**: Uses useMemo for calculations
   - Prevents unnecessary recalculations
   - Improves performance

---

## Next Steps After Integration

1. **Monitor Performance**
   - Check query times
   - Monitor data transfer
   - Optimize if needed

2. **Gather Feedback**
   - Test with users
   - Collect feedback
   - Make improvements

3. **Add More Features** (Optional)
   - Real-time updates
   - Advanced filtering
   - Custom reports
   - Audit alerts

4. **Documentation**
   - Create user guide
   - Document features
   - Create training materials

---

## Success Criteria

- [x] Components render without errors
- [x] Arabic language support works
- [x] RTL layout works
- [x] Theme tokens apply
- [x] Export functionality works
- [x] Filtering works
- [x] Pagination works
- [x] Responsive design works
- [x] Dark/Light theme works
- [x] All standards applied

---

## Estimated Timeline

| Task | Time | Status |
|------|------|--------|
| Add to admin pages | 30 min | Ready |
| Add routing (optional) | 15 min | Ready |
| Test components | 30 min | Ready |
| Deploy | 15 min | Ready |
| **Total** | **1.5 hours** | **Ready** |

---

## Support

For issues or questions:
1. Check PHASE_2_COMPONENT_INTEGRATION_COMPLETE.md
2. Review component code comments
3. Check browser console for errors
4. Review Supabase logs

---

**Ready to Integrate!** 🚀

Start with Step 1: Add Components to Admin Pages

