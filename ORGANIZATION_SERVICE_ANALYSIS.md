# Organization Service Analysis Report for Next.js Migration

## Overview
This document provides a detailed analysis of the current organization management system to ensure seamless replication in Next.js. The system handles organization CRUD operations with comprehensive cascade deletion functionality and sophisticated UI/UX patterns.

## Architecture Overview

### Backend Services
- **Primary Service**: `src/services/organization.ts`
- **React Hooks**: `src/hooks/useOrganizations.ts`
- **Database Functions**: Supabase RPC functions in migrations
- **Components**: React components with CSS modules

### Database Schema
- **Main Table**: `public.organizations`
- **Related Tables**: `org_memberships`, user profiles
- **Security**: Row Level Security (RLS) with permission-based access

## Core Data Structure

### Organization Interface
```typescript
interface Organization {
  id: string;
  code: string;                    // Unique organization code
  name: string;                    // Primary name
  name_ar?: string;               // Arabic name
  description?: string;           // Optional description
  address?: string;               // Physical address
  phone?: string;                 // Contact phone
  email?: string;                 // Contact email
  website?: string;               // Website URL
  tax_number?: string;            // Tax registration
  registration_number?: string;    // Business registration
  logo_url?: string | null;       // Logo image
  is_active: boolean;             // Active status (replaces legacy 'status')
  parent_org_id?: string | null;  // Hierarchical support
  created_at: string;
  updated_at: string;
}
```

## Service Layer Functions

### Core CRUD Operations
1. **getOrganizations()**: Fetches active organizations with caching
2. **getOrganization(id)**: Fetches single organization
3. **createOrganization(input)**: Creates new organization
4. **updateOrganization(id, updates)**: Updates existing organization
5. **deleteOrganization(id)**: Simple delete (rarely used)
6. **deleteOrganizationCascade(id)**: **CRITICAL** - Deletes org and ALL related data
7. **purgeOrganizationData(id)**: Removes all data but keeps organization record

### Caching Strategy
- **Local Storage Cache**: 5-minute duration with automatic expiration
- **React Query Cache**: 10-minute stale time, 30-minute garbage collection
- **Cache Invalidation**: Automatic cache clearing on create/update/delete operations

## Critical Cascade Deletion Implementation

### deleteOrganizationCascade Function
This is the **most critical function** for your Next.js migration:

```typescript
export async function deleteOrganizationCascade(id: string): Promise<void> {
  const { error } = await supabase.rpc('org_delete_cascade', { p_id: id });
  if (error) throw error;
  clearOrganizationsCache();
}
```

**⚠️ IMPORTANT**: The current codebase calls `deleteOrganizationCascade()` but the actual SQL implementation is missing. You need to create this function in your Supabase instance. Below is the complete SQL implementation based on all tables that reference organizations:

### Complete org_delete_cascade SQL Implementation

```sql
-- ============================================
-- ORGANIZATION CASCADE DELETION FUNCTION
-- ============================================
-- This function deletes an organization and ALL related data
-- in the correct order to maintain foreign key constraints
-- ============================================

CREATE OR REPLACE FUNCTION public.org_delete_cascade(p_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name text;
  v_org_code text;
BEGIN
  -- Get organization info for logging
  SELECT code, name INTO v_org_code, v_org_name 
  FROM public.organizations WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found: %', p_id;
  END IF;

  -- Permission checks
  IF NOT (public.is_super_admin() OR public.has_permission(auth.uid(), 'org.manage')) THEN
    RAISE EXCEPTION 'Forbidden: insufficient permissions to delete organization';
  END IF;

  -- ============================================
  -- DELETE IN CORRECT ORDER (children first)
  -- ============================================
  
  -- 1. Document-related tables
  DELETE FROM public.document_associations da
  USING public.documents d
  WHERE d.org_id = p_id AND da.document_id = d.id;

  DELETE FROM public.document_versions dv
  USING public.documents d
  WHERE d.org_id = p_id AND dv.document_id = d.id;

  DELETE FROM public.documents WHERE org_id = p_id;

  -- 2. Approval-related tables
  DELETE FROM public.approval_actions aa
  USING public.approval_requests ar
  WHERE ar.org_id = p_id AND aa.request_id = ar.id;

  DELETE FROM public.approval_steps ast
  USING public.approval_workflows aw
  WHERE aw.org_id = p_id AND ast.workflow_id = aw.id;

  DELETE FROM public.approval_workflows WHERE org_id = p_id;
  DELETE FROM public.approval_requests WHERE org_id = p_id;

  -- 3. Transaction-related tables (most complex)
  -- Delete transaction line items first
  DELETE FROM public.transaction_line_items tli
  USING public.transaction_lines tl
  USING public.transactions t
  WHERE t.org_id = p_id AND tl.transaction_id = t.id AND tli.transaction_line_id = tl.id;

  -- Delete transaction line reviews
  DELETE FROM public.transaction_line_reviews tlr
  USING public.transaction_lines tl
  USING public.transactions t
  WHERE t.org_id = p_id AND tl.transaction_id = t.id AND tlr.transaction_line_id = tl.id;

  -- Delete transaction lines
  DELETE FROM public.transaction_lines tl
  USING public.transactions t
  WHERE t.org_id = p_id AND tl.transaction_id = t.id;

  -- Delete transaction audit logs
  DELETE FROM public.transaction_audit ta
  USING public.transactions t
  WHERE t.org_id = p_id AND ta.transaction_id = t.id;

  -- Delete transactions
  DELETE FROM public.transactions WHERE org_id = p_id;

  -- 4. Project-related tables
  DELETE FROM public.project_members WHERE project_id IN (
    SELECT id FROM public.projects WHERE org_id = p_id
  );
  
  DELETE FROM public.projects WHERE org_id = p_id;

  -- 5. Fiscal management tables
  DELETE FROM public.balance_reconciliations WHERE org_id = p_id;
  DELETE FROM public.opening_balance_validation_rules WHERE org_id = p_id;
  DELETE FROM public.opening_balances WHERE org_id = p_id;
  DELETE FROM public.opening_balance_imports WHERE org_id = p_id;
  DELETE FROM public.period_closing_checklists WHERE org_id = p_id;
  DELETE FROM public.fiscal_periods WHERE org_id = p_id;
  DELETE FROM public.fiscal_years WHERE org_id = p_id;

  -- 6. User management tables
  DELETE FROM public.org_memberships WHERE org_id = p_id;

  -- 7. System configuration tables
  DELETE FROM public.account_prefix_map WHERE org_id = p_id;
  DELETE FROM public.approved_emails WHERE org_id = p_id;
  DELETE FROM public.report_datasets WHERE org_id = p_id;
  DELETE FROM public.report_execution_logs WHERE org_id = p_id;

  -- 8. Audit logs for this organization
  DELETE FROM public.audit_logs WHERE org_id = p_id;

  -- 9. Finally, delete the organization itself
  DELETE FROM public.organizations WHERE id = p_id;

  -- Log the deletion
  RAISE NOTICE 'Organization "%" (%) and all related data deleted successfully', v_org_name, v_org_code;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.org_delete_cascade(uuid) TO authenticated;
```

### purgeOrganizationData Function
Alternative approach that preserves the organization record:

```sql
CREATE OR REPLACE FUNCTION public.org_purge_data(p_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name text;
  v_org_code text;
BEGIN
  -- Get organization info for logging
  SELECT code, name INTO v_org_code, v_org_name 
  FROM public.organizations WHERE id = p_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found: %', p_id;
  END IF;

  -- Permission checks
  IF NOT (public.is_super_admin() OR public.has_permission(auth.uid(), 'org.manage')) THEN
    RAISE EXCEPTION 'Forbidden: insufficient permissions to purge organization data';
  END IF;

  -- ============================================
  -- PURGE ALL DATA BUT KEEP ORGANIZATION RECORD
  -- ============================================
  
  -- Execute all deletion steps EXCEPT the final organization deletion
  -- (Same steps as org_delete_cascade but without deleting the org itself)
  
  -- 1. Document-related tables
  DELETE FROM public.document_associations da
  USING public.documents d
  WHERE d.org_id = p_id AND da.document_id = d.id;

  DELETE FROM public.document_versions dv
  USING public.documents d
  WHERE d.org_id = p_id AND dv.document_id = d.id;

  DELETE FROM public.documents WHERE org_id = p_id;

  -- 2. Approval-related tables
  DELETE FROM public.approval_actions aa
  USING public.approval_requests ar
  WHERE ar.org_id = p_id AND aa.request_id = ar.id;

  DELETE FROM public.approval_steps ast
  USING public.approval_workflows aw
  WHERE aw.org_id = p_id AND ast.workflow_id = aw.id;

  DELETE FROM public.approval_workflows WHERE org_id = p_id;
  DELETE FROM public.approval_requests WHERE org_id = p_id;

  -- 3. Transaction-related tables
  DELETE FROM public.transaction_line_items tli
  USING public.transaction_lines tl
  USING public.transactions t
  WHERE t.org_id = p_id AND tl.transaction_id = t.id AND tli.transaction_line_id = tl.id;

  DELETE FROM public.transaction_line_reviews tlr
  USING public.transaction_lines tl
  USING public.transactions t
  WHERE t.org_id = p_id AND tl.transaction_id = t.id AND tlr.transaction_line_id = tl.id;

  DELETE FROM public.transaction_lines tl
  USING public.transactions t
  WHERE t.org_id = p_id AND tl.transaction_id = t.id;

  DELETE FROM public.transaction_audit ta
  USING public.transactions t
  WHERE t.org_id = p_id AND ta.transaction_id = t.id;

  DELETE FROM public.transactions WHERE org_id = p_id;

  -- 4. Project-related tables
  DELETE FROM public.project_members WHERE project_id IN (
    SELECT id FROM public.projects WHERE org_id = p_id
  );
  
  DELETE FROM public.projects WHERE org_id = p_id;

  -- 5. Fiscal management tables
  DELETE FROM public.balance_reconciliations WHERE org_id = p_id;
  DELETE FROM public.opening_balance_validation_rules WHERE org_id = p_id;
  DELETE FROM public.opening_balances WHERE org_id = p_id;
  DELETE FROM public.opening_balance_imports WHERE org_id = p_id;
  DELETE FROM public.period_closing_checklists WHERE org_id = p_id;
  DELETE FROM public.fiscal_periods WHERE org_id = p_id;
  DELETE FROM public.fiscal_years WHERE org_id = p_id;

  -- 6. User management tables
  DELETE FROM public.org_memberships WHERE org_id = p_id;

  -- 7. System configuration tables
  DELETE FROM public.account_prefix_map WHERE org_id = p_id;
  DELETE FROM public.approved_emails WHERE org_id = p_id;
  DELETE FROM public.report_datasets WHERE org_id = p_id;
  DELETE FROM public.report_execution_logs WHERE org_id = p_id;

  -- 8. Audit logs for this organization
  DELETE FROM public.audit_logs WHERE org_id = p_id;

  -- Log the purge
  RAISE NOTICE 'All data for organization "%" (%) purged successfully', v_org_name, v_org_code;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.org_purge_data(uuid) TO authenticated;
```

**⚠️ CRITICAL**: The current codebase calls these functions but they don't exist in the database. You MUST implement these SQL functions in your Supabase instance for the cascade deletion to work properly.

## UI/UX Analysis

### Design System
- **CSS Framework**: CSS Modules with custom properties
- **Theme System**: CSS custom properties for light/dark mode
- **Icons**: Lucide React icons
- **Language**: Full RTL/Arabic support

### Layout Structure
```css
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--background);
  color: var(--text);
  overflow: hidden;
}
```

### Card Design & Hover Effects
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: var(--accent);
}
```

### Button Hover Effects
```css
.addButton:hover {
  background: var(--accent-primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(32, 118, 255, 0.3);
}

.deleteButton:hover {
  background: var(--error-strong);
  transform: translateY(-1px);
}
```

### Modal Design
- **Overlay**: Backdrop blur effect
- **Modal**: Rounded corners, elevated shadows
- **Form**: Grid layout with proper spacing
- **Validation**: Real-time form validation

## Key UI Components

### 1. Organization Card
- **Header**: Organization code, name, and status badge
- **Details**: Address, phone, email, tax number with icons
- **Actions**: Edit, "تفريغ البيانات" (Purge Data), "حذف" (Delete)
- **Status**: Active/Inactive badges with color coding

### 2. Action Buttons
```typescript
// Three action buttons per organization:
<button className={styles.editButton} onClick={() => handleEdit(org)}>
  <Edit size={16} />
  تعديل
</button>
<button className={styles.deleteButton} onClick={() => handlePurge(org)}>
  <Eraser size={16} />
  تفريغ البيانات
</button>
<button className={styles.deleteButton} onClick={() => handleDelete(org)}>
  <Trash2 size={16} />
  حذف
</button>
```

### 3. Confirmation Dialogs
**Delete Confirmation**:
```typescript
const warning = `تنبيه مهم:
سيتم حذف المؤسسة "${org.code} — ${org.name}" وجميع البيانات المرتبطة بها نهائيًا (مشاريع، إعدادات، المخزون، التقارير ...).
لا يمكن التراجع عن هذه العملية. هل تريد المتابعة؟`;
if (!window.confirm(warning)) return;
```

**Purge Confirmation**:
```typescript
const warning = `تنبيه مهم:
سيتم حذف جميع البيانات المرتبطة بالمؤسسة "${org.code} — ${org.name}" (مشاريع، إعدادات، المخزون، التقارير ...)، مع الإبقاء على سجل المؤسسة.
لا يمكن التراجع عن هذه العملية. هل تريد المتابعة؟`;
```

## Theme System & CSS Variables

### Color Scheme
```css
:root {
  --background: #ffffff;
  --surface: #f8fafc;
  --text: #1e293b;
  --muted_text: #64748b;
  --heading: #0f172a;
  --border: #e2e8f0;
  --accent: #2076ff;
  --accent-primary-hover: #1d4ed8;
  --error: #de3f3f;
  --error-strong: #b91c1c;
  --success: #21c197;
  --button_text: #ffffff;
  --field_bg: #ffffff;
  --hover-bg: #f1f5f9;
  --modal_bg: #ffffff;
}
```

### Dark Mode Support
```css
[data-theme='dark'] .modal {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

[data-theme='dark'] .card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

## Responsive Design

### Breakpoints
- **Desktop**: Full grid layout (2+ columns)
- **Tablet**: Adjusted spacing
- **Mobile**: Single column, stacked layout

### Mobile Adjustments
```css
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .headerContent {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .modalActions {
    flex-direction: column-reverse;
  }
}
```

## Performance Optimizations

### 1. Caching Strategy
- **Local Storage**: Instant initial load
- **React Query**: Background refetching
- **Cache Duration**: Optimized for rarely-changing org data

### 2. Loading States
- **Skeleton Loading**: Professional loading spinners
- **Optimistic Updates**: Immediate UI feedback
- **Error Boundaries**: Graceful error handling

### 3. Data Fetching
```typescript
// Direct REST query for performance
const { data, error } = await supabase
  .from('organizations')
  .select('id, code, name, name_ar, is_active, created_at')
  .eq('is_active', true)
  .order('code', { ascending: true })
  .limit(50);
```

## Security & Permissions

### Access Control
- **Super Admin**: Full access to all organizations
- **Organization Members**: Access to their organizations only
- **RLS Policies**: Database-level security

### Permission Checks
```typescript
// Service-level permission validation
IF NOT (public.is_super_admin() OR public.has_permission(auth.uid(), 'org.manage')) THEN
  RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
END IF;
```

## Critical Implementation Notes for Next.js

### 1. Cascade Deletion Logic
**You MUST implement the exact cascade deletion order**:
1. Delete organization memberships
2. Delete projects and related data
3. Delete transactions and transaction lines
4. Delete user permissions specific to org
5. Finally delete the organization

### 2. Error Handling
- Maintain exact Arabic error messages
- Preserve confirmation dialog text
- Keep the same toast notification patterns

### 3. UI Consistency
- **Card Hover**: `translateY(-2px)` with enhanced shadow
- **Button Hover**: `translateY(-1px)` with color transitions
- **Modal**: Backdrop blur and elevated shadows
- **Loading States**: Consistent spinner design

### 4. RTL/Arabic Support
- `dir="rtl"` on container
- Proper text alignment
- Icon positioning for RTL
- Arabic confirmation messages

### 5. Form Validation
- Code field: Required, max 20 characters
- Name field: Required
- Email field: Email validation
- Phone field: Tel validation
- Real-time validation feedback

## Migration Checklist

### Backend (Supabase)
- [ ] Ensure `org_delete_cascade` RPC function exists
- [ ] Ensure `org_purge_data` RPC function exists
- [ ] Verify RLS policies are in place
- [ ] Test cascade deletion order

### Frontend (Next.js)
- [ ] Implement identical card hover effects
- [ ] Replicate modal design with backdrop blur
- [ ] Use same color scheme and CSS variables
- [ ] Implement RTL/Arabic support
- [ ] Add confirmation dialogs with exact Arabic text
- [ ] Implement caching strategy (localStorage + React Query)
- [ ] Add loading states and error handling
- [ ] Ensure responsive design matches exactly

### Testing
- [ ] Test cascade deletion with sample data
- [ ] Verify all hover states and transitions
- [ ] Test RTL layout and text direction
- [ ] Validate form submissions and error handling
- [ ] Performance test with large datasets

## Conclusion

The current organization system is highly sophisticated with enterprise-grade features. The most critical aspect to replicate is the cascade deletion functionality, which must maintain the exact deletion order and user experience. The UI/UX patterns are well-established and should be replicated precisely to ensure users notice no difference between the current and Next.js applications.

The theme system, hover effects, and responsive design patterns are all well-documented above and should serve as a comprehensive guide for the Next.js migration team.
