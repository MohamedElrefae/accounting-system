# 🔧 Roles & Permissions Sync Fix - Complete Solution

## 🎯 Problem Analysis

You're experiencing an issue where:
1. ✅ Success message appears in UI when assigning permissions to roles
2. ❌ Changes are NOT persisted in the database
3. ❌ UI doesn't reflect the actual database state after refresh

## 🔍 Root Causes Identified

### 1. **Database Function Issues**
- The `save_role_permissions` RPC function may have column mismatch issues
- Two versions exist with different column requirements (`granted_by`, `granted_at`)

### 2. **No Real-Time Sync**
- No Supabase realtime subscriptions for `role_permissions` table
- UI doesn't automatically refresh after database changes

### 3. **Stale Data in UI**
- After assignment, the UI shows cached/old data
- `loadRoles()` is called but may not properly refresh the permissions

### 4. **Multiple Services Not Coordinated**
- Auth service, route service, and permission service work independently
- No single source of truth for permission state

## 🛠️ Complete Fix Implementation

### Step 1: Fix Database Function (CRITICAL)

Run this SQL in your Supabase SQL Editor:

```sql
-- =====================================================================
-- CORRECTED: Drop and recreate save_role_permissions function
-- =====================================================================

DROP FUNCTION IF EXISTS save_role_permissions(INTEGER, TEXT[]);

CREATE OR REPLACE FUNCTION save_role_permissions(
    p_role_id INTEGER,
    p_permission_names TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    permission_id INTEGER;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
    errors TEXT[] := '{}';
    permission_name TEXT;
    existing_count INTEGER;
BEGIN
    -- Validate inputs
    IF p_role_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Role ID is required',
            'errors', ARRAY['Role ID cannot be null']
        );
    END IF;

    IF p_permission_names IS NULL THEN
        p_permission_names := ARRAY[]::TEXT[];
    END IF;

    -- Validate role exists
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_role_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Role not found',
            'role_id', p_role_id,
            'errors', ARRAY['Role with ID ' || p_role_id || ' does not exist']
        );
    END IF;

    -- Check existing permissions count before clearing
    SELECT COUNT(*) INTO existing_count 
    FROM role_permissions 
    WHERE role_id = p_role_id;

    RAISE NOTICE 'Role % had % existing permissions', p_role_id, existing_count;
    RAISE NOTICE 'Attempting to assign % new permissions', array_length(p_permission_names, 1);

    -- Clear existing permissions for this role
    DELETE FROM role_permissions WHERE role_id = p_role_id;
    RAISE NOTICE 'Cleared existing permissions for role %', p_role_id;

    -- If no permissions to assign, return success with empty permissions
    IF array_length(p_permission_names, 1) IS NULL OR array_length(p_permission_names, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'role_id', p_role_id,
            'permissions_assigned', 0,
            'errors_count', 0,
            'total_permissions', 0,
            'message', 'All permissions cleared for role'
        );
    END IF;

    -- Process each permission name and INSERT
    FOREACH permission_name IN ARRAY p_permission_names
    LOOP
        BEGIN
            -- Find permission by name
            SELECT id INTO permission_id
            FROM permissions
            WHERE name = permission_name;

            IF permission_id IS NULL THEN
                error_count := error_count + 1;
                errors := errors || ('Permission not found: ' || permission_name);
                RAISE NOTICE 'Permission not found: %', permission_name;
                CONTINUE;
            END IF;

            -- INSERT the role-permission mapping (basic structure)
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (p_role_id, permission_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;

            success_count := success_count + 1;
            RAISE NOTICE 'Successfully assigned permission: % (ID: %)', permission_name, permission_id;

        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                errors := errors || ('Error with ' || permission_name || ': ' || SQLERRM);
                RAISE NOTICE 'Error assigning permission %: %', permission_name, SQLERRM;
        END;
    END LOOP;

    -- Return detailed result
    RETURN jsonb_build_object(
        'success', success_count > 0 OR array_length(p_permission_names, 1) = 0,
        'role_id', p_role_id,
        'permissions_assigned', success_count,
        'errors_count', error_count,
        'total_permissions', array_length(p_permission_names, 1),
        'error_messages', errors,
        'message', 'Successfully assigned ' || success_count || ' permissions with ' || error_count || ' errors'
    );
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION save_role_permissions(INTEGER, TEXT[]) TO authenticated, service_role;

-- =====================================================================
-- Verification Query
-- =====================================================================

-- Test the function
DO $$
DECLARE
    test_role_id INTEGER;
    result JSONB;
    perm_count INTEGER;
BEGIN
    -- Get the first available role
    SELECT id INTO test_role_id FROM roles LIMIT 1;
    
    IF test_role_id IS NOT NULL THEN
        -- Test the function
        SELECT save_role_permissions(test_role_id, ARRAY['users.read', 'roles.read']) INTO result;
        
        RAISE NOTICE 'Test Result: %', result;
        
        -- Check if permissions were actually assigned
        SELECT COUNT(*) INTO perm_count 
        FROM role_permissions 
        WHERE role_id = test_role_id;
        
        IF perm_count > 0 THEN
            RAISE NOTICE '✅ SUCCESS: % permissions assigned to role %', perm_count, test_role_id;
        ELSE
            RAISE NOTICE '❌ ERROR: No permissions found for role %', test_role_id;
        END IF;
    END IF;
END;
$$;
```

### Step 2: Create Permission Sync Service

Create `src/services/permissionSync.ts`:

```typescript
import { supabase } from '../utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PermissionChangeCallback {
  (event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any): void;
}

class PermissionSyncService {
  private channel: RealtimeChannel | null = null;
  private callbacks: Set<PermissionChangeCallback> = new Set();

  /**
   * Start listening to role_permissions changes
   */
  startSync() {
    if (this.channel) {
      console.warn('Permission sync already started');
      return;
    }

    this.channel = supabase
      .channel('role_permissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_permissions'
        },
        (payload) => {
          console.log('🔄 Permission change detected:', payload);
          this.notifyCallbacks(payload.eventType as any, payload);
        }
      )
      .subscribe((status) => {
        console.log('Permission sync status:', status);
      });
  }

  /**
   * Stop listening to changes
   */
  stopSync() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Subscribe to permission changes
   */
  subscribe(callback: PermissionChangeCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Notify all subscribers
   */
  private notifyCallbacks(event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
    this.callbacks.forEach(callback => {
      try {
        callback(event, payload);
      } catch (error) {
        console.error('Error in permission sync callback:', error);
      }
    });
  }

  /**
   * Force refresh permissions for a specific role
   */
  async refreshRolePermissions(roleId: number) {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select(`
          permission_id,
          permissions (name)
        `)
        .eq('role_id', roleId);

      if (error) throw error;

      return data?.map(rp => {
        const perm = rp.permissions as any;
        return Array.isArray(perm) ? perm[0]?.name : perm?.name;
      }).filter(Boolean) || [];
    } catch (error) {
      console.error('Error refreshing role permissions:', error);
      return [];
    }
  }

  /**
   * Verify permissions were saved correctly
   */
  async verifyPermissionsSaved(roleId: number, expectedPermissions: string[]) {
    const actualPermissions = await this.refreshRolePermissions(roleId);
    
    const missing = expectedPermissions.filter(p => !actualPermissions.includes(p));
    const extra = actualPermissions.filter(p => !expectedPermissions.includes(p));

    return {
      success: missing.length === 0 && extra.length === 0,
      actualCount: actualPermissions.length,
      expectedCount: expectedPermissions.length,
      missing,
      extra,
      actualPermissions
    };
  }
}

export const permissionSyncService = new PermissionSyncService();
```

### Step 3: Update EnterpriseRoleManagement Component

Update `src/pages/admin/EnterpriseRoleManagement.tsx`:

```typescript
// Add at the top with other imports
import { permissionSyncService } from '../../services/permissionSync';

// Inside the component, add useEffect for sync
useEffect(() => {
  // Start permission sync
  permissionSyncService.startSync();

  // Subscribe to changes
  const unsubscribe = permissionSyncService.subscribe((event, payload) => {
    console.log('Permission changed:', event, payload);
    // Reload roles when permissions change
    loadRoles();
  });

  return () => {
    unsubscribe();
    permissionSyncService.stopSync();
  };
}, []);

// Update handleSavePermissions function
const handleSavePermissions = async () => {
  if (!selectedRole) {
    alert('احفظ الدور أولاً قبل تعيين الصلاحيات');
    return;
  }

  try {
    setSavingPerms(true);

    console.log('🔄 Saving permissions for role:', selectedRole.id);
    console.log('📋 Permissions to save:', formData.permissions);

    const { data, error } = await supabase.rpc('save_role_permissions', {
      p_role_id: selectedRole.id,
      p_permission_names: formData.permissions
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      throw error;
    }

    console.log('✅ RPC Response:', data);

    // Verify the permissions were actually saved
    const verification = await permissionSyncService.verifyPermissionsSaved(
      selectedRole.id,
      formData.permissions
    );

    console.log('🔍 Verification result:', verification);

    if (!verification.success) {
      console.warn('⚠️ Verification failed:', {
        missing: verification.missing,
        extra: verification.extra
      });
      
      alert(
        `تحذير: تم حفظ ${verification.actualCount} من ${verification.expectedCount} صلاحية.\n` +
        (verification.missing.length > 0 ? `\nمفقودة: ${verification.missing.join(', ')}` : '') +
        (verification.extra.length > 0 ? `\nإضافية: ${verification.extra.join(', ')}` : '')
      );
    } else {
      alert(`✅ تم حفظ ${verification.actualCount} صلاحية بنجاح`);
    }

    // Force reload roles to get fresh data
    await loadRoles();
    
    // Update the form data with actual saved permissions
    setFormData(prev => ({
      ...prev,
      permissions: verification.actualPermissions
    }));

    // Close dialog only if verification succeeded
    if (verification.success) {
      setEditDialogOpen(false);
    }

  } catch (error: any) {
    console.error('❌ Error saving permissions:', error);
    alert('فشل حفظ الصلاحيات: ' + (error.message || 'خطأ غير معروف'));
  } finally {
    setSavingPerms(false);
  }
};
```

### Step 4: Update EnhancedQuickPermissionAssignment Component

Update `src/components/EnhancedQuickPermissionAssignment.tsx`:

```typescript
// Add import
import { permissionSyncService } from '../services/permissionSync';

// Update handleAssignPermissions function
const handleAssignPermissions = async () => {
  if (selectedRoleIds.length === 0) {
    alert('يرجى اختيار دور واحد على الأقل');
    return;
  }

  if (selectedPermissionNames.length === 0) {
    alert('يرجى اختيار صلاحية واحدة على الأقل');
    return;
  }

  try {
    setAssigning(true);
    const overallResult: AssignmentResult = {
      success: true,
      message: '',
      permissions_assigned: 0,
      errors_count: 0,
      total_permissions: 0
    };

    const verificationResults: any[] = [];

    // Assign permissions to each selected role
    for (const roleId of selectedRoleIds) {
      console.log(`🔄 Assigning permissions to role ${roleId}`);
      
      const { data, error } = await supabase.rpc('save_role_permissions', {
        p_role_id: roleId,
        p_permission_names: selectedPermissionNames
      });

      if (error) {
        console.error(`❌ Error assigning permissions to role ${roleId}:`, error);
        overallResult.success = false;
        overallResult.errors_count = (overallResult.errors_count || 0) + 1;
      } else {
        console.log(`✅ RPC Response for role ${roleId}:`, data);
        
        // Verify the assignment
        const verification = await permissionSyncService.verifyPermissionsSaved(
          roleId,
          selectedPermissionNames
        );
        
        verificationResults.push({
          roleId,
          verification
        });

        if (verification.success) {
          overallResult.permissions_assigned = (overallResult.permissions_assigned || 0) + verification.actualCount;
        } else {
          console.warn(`⚠️ Verification failed for role ${roleId}:`, verification);
          overallResult.errors_count = (overallResult.errors_count || 0) + 1;
        }
        
        overallResult.total_permissions = (overallResult.total_permissions || 0) + selectedPermissionNames.length;
      }
    }

    // Build detailed message
    const successfulRoles = verificationResults.filter(r => r.verification.success).length;
    overallResult.message = `تم تعيين الصلاحيات لـ ${successfulRoles} من ${selectedRoleIds.length} دور`;
    
    if (overallResult.errors_count && overallResult.errors_count > 0) {
      overallResult.message += ` (${overallResult.errors_count} خطأ)`;
    }

    setLastResult(overallResult);
    
    if (onAssignmentComplete) {
      onAssignmentComplete(overallResult);
    }
    
    if (onRefreshNeeded) {
      onRefreshNeeded();
    }

    // Clear selections after successful assignment
    if (overallResult.success && successfulRoles > 0) {
      setSelectedPermissionNames([]);
      if (!selectedRoleId) {
        setSelectedRoleIds([]);
      }
    }

  } catch (error) {
    console.error('❌ Error in permission assignment:', error);
    const errorResult: AssignmentResult = {
      success: false,
      message: 'فشل في تعيين الصلاحيات',
      errors_count: 1
    };
    setLastResult(errorResult);
    
    if (onAssignmentComplete) {
      onAssignmentComplete(errorResult);
    }
  } finally {
    setAssigning(false);
  }
};
```

### Step 5: Enable Realtime on Supabase

In your Supabase Dashboard:

1. Go to **Database** → **Replication**
2. Find the `role_permissions` table
3. Enable replication for this table
4. Save changes

### Step 6: Add RLS Policies (if needed)

```sql
-- Enable RLS on role_permissions if not already enabled
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read role_permissions
CREATE POLICY "Allow authenticated users to read role_permissions"
ON role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Policy for service role to manage role_permissions
CREATE POLICY "Allow service role to manage role_permissions"
ON role_permissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for admins to manage role_permissions
CREATE POLICY "Allow admins to manage role_permissions"
ON role_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND (r.name ILIKE '%admin%' OR r.name ILIKE '%super%')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND (r.name ILIKE '%admin%' OR r.name ILIKE '%super%')
  )
);
```

## 🧪 Testing Checklist

### 1. Database Function Test
```sql
-- Run this in Supabase SQL Editor
SELECT save_role_permissions(
  1, -- Replace with actual role ID
  ARRAY['users.read', 'users.create', 'roles.read']
);

-- Verify the result
SELECT 
  r.name as role_name,
  p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = 1; -- Replace with actual role ID
```

### 2. UI Test
1. Open Role Management page
2. Edit a role
3. Assign some permissions
4. Click "Save Permissions"
5. Check console for logs:
   - `🔄 Saving permissions for role:`
   - `✅ RPC Response:`
   - `🔍 Verification result:`
6. Refresh the page
7. Verify permissions are still there

### 3. Real-time Sync Test
1. Open Role Management in two browser tabs
2. In Tab 1: Assign permissions to a role
3. In Tab 2: Watch for automatic refresh
4. Check console for: `Permission changed:`

## 🔍 Debugging Guide

### If permissions still don't save:

1. **Check Database Function**
```sql
-- Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'save_role_permissions';

-- Check function permissions
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'save_role_permissions';
```

2. **Check Table Structure**
```sql
-- Verify role_permissions table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'role_permissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
```

3. **Check RLS Policies**
```sql
-- List all policies on role_permissions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'role_permissions';
```

4. **Enable Detailed Logging**

In your browser console:
```javascript
// Enable verbose logging
localStorage.setItem('supabase.debug', 'true');

// Check permission sync
permissionSyncService.verifyPermissionsSaved(1, ['users.read']).then(console.log);
```

## 📊 Expected Behavior After Fix

### ✅ Success Indicators:
1. Console shows: `✅ RPC Response: {success: true, permissions_assigned: X}`
2. Console shows: `🔍 Verification result: {success: true, actualCount: X}`
3. Alert shows: `✅ تم حفظ X صلاحية بنجاح`
4. Permissions persist after page refresh
5. Real-time updates work across tabs

### ❌ Failure Indicators:
1. Console shows: `❌ RPC Error:`
2. Console shows: `⚠️ Verification failed:`
3. Alert shows: `تحذير: تم حفظ X من Y صلاحية`
4. Permissions disappear after refresh

## 🚀 Next Steps

1. **Deploy Database Changes**
   - Run the SQL script in Supabase
   - Verify function works with test query

2. **Deploy Frontend Changes**
   - Create `permissionSync.ts` service
   - Update components
   - Test in development

3. **Enable Realtime**
   - Enable replication in Supabase Dashboard
   - Test real-time sync

4. **Monitor & Verify**
   - Check browser console for logs
   - Verify permissions persist
   - Test across multiple tabs

## 📝 Summary

This solution provides:
- ✅ Fixed database function that properly saves permissions
- ✅ Real-time sync service for automatic UI updates
- ✅ Verification system to ensure data integrity
- ✅ Detailed logging for debugging
- ✅ Proper error handling and user feedback

The key improvements:
1. **Database function** now correctly inserts permissions (not deletes them)
2. **Verification system** confirms permissions were actually saved
3. **Real-time sync** keeps UI in sync with database
4. **Detailed logging** helps identify issues quickly
5. **Proper error handling** provides clear feedback to users
