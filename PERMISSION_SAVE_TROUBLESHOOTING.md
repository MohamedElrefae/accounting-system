# 🔍 Permission Save Troubleshooting

## Issue: Permissions Not Saving

The WebSocket errors you're seeing are **NOT** the problem - those are just Supabase realtime connection issues (can be ignored for now).

The real issue is permissions aren't persisting. Let's debug step by step.

## 🧪 Step 1: Run Debug Script

**In Supabase SQL Editor, run:**
```sql
-- Copy from: sql/debug_permission_save.sql
```

**Look for these outputs:**
1. Function definition (should show the new version)
2. Test results showing BEFORE and AFTER counts
3. Whether it says "✅ SUCCESS" or "❌ FAILED"

## 🔍 Step 2: Check Browser Console

When you click "Save Permissions", open browser console (F12) and look for:

### What you SHOULD see:
```javascript
🔄 Saving permissions for role: X
📋 Permissions to save: [...]
✅ RPC Response: {success: true, permissions_assigned: X}
```

### What you might see instead:
```javascript
❌ RPC Error: {...}
// OR
⚠️ No logs at all
```

## 🎯 Step 3: Manual Test in Supabase

**Run this in Supabase SQL Editor:**

```sql
-- Replace 1 with an actual role ID from your system
SELECT save_role_permissions(
    1,  -- role_id
    ARRAY['users.read', 'users.create', 'roles.read']
);

-- Then check if it worked:
SELECT 
    r.name as role_name,
    p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.id = 1
ORDER BY p.name;
```

**Expected result:**
- Function returns: `{success: true, permissions_assigned: 3}`
- Query shows 3 permissions

## 🔧 Common Issues & Fixes

### Issue 1: Function Not Updated
**Symptom:** Debug script shows old function definition

**Fix:**
```sql
-- Re-run the fix
-- Copy entire content from: sql/fix_permission_sync_final.sql
```

### Issue 2: RLS Blocking Inserts
**Symptom:** Function returns success but no data in table

**Check:**
```sql
-- Check your current user
SELECT auth.uid(), auth.role();

-- Check if you're admin
SELECT r.name 
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = auth.uid();
```

**Fix:** Make sure you're logged in as super_admin or admin

### Issue 3: Permissions Don't Exist
**Symptom:** Function says "Permission not found"

**Check:**
```sql
-- List all available permissions
SELECT name FROM permissions ORDER BY name;

-- Check if the ones you're trying to assign exist
SELECT name FROM permissions 
WHERE name IN ('users.read', 'users.create', 'roles.read');
```

**Fix:** Use permission names that actually exist in your database

### Issue 4: Frontend Not Calling Function
**Symptom:** No console logs when clicking "Save"

**Check:** Open `src/pages/admin/EnterpriseRoleManagement.tsx` and look for:
```typescript
const handleSavePermissions = async () => {
  // Should have console.log or similar
  const { data, error } = await supabase.rpc('save_role_permissions', {
    p_role_id: selectedRole.id,
    p_permission_names: formData.permissions
  });
}
```

**Fix:** Make sure the function is actually being called

## 📊 Diagnostic Checklist

Run through these checks:

- [ ] **SQL Function Test**
  ```sql
  SELECT save_role_permissions(1, ARRAY['users.read']);
  ```
  Result: Should return `{success: true}`

- [ ] **Data Verification**
  ```sql
  SELECT COUNT(*) FROM role_permissions WHERE role_id = 1;
  ```
  Result: Should be > 0

- [ ] **Browser Console**
  - Open DevTools (F12)
  - Go to Console tab
  - Click "Save Permissions"
  - Look for RPC call logs

- [ ] **Network Tab**
  - Open DevTools (F12)
  - Go to Network tab
  - Filter by "save_role"
  - Click "Save Permissions"
  - Check if request is made
  - Check response

## 🚨 Emergency Fix

If nothing works, try this direct approach:

```sql
-- Manually assign permissions to a role
DO $$
DECLARE
    target_role_id INTEGER := 1; -- Change this to your role ID
    perm_id INTEGER;
BEGIN
    -- Clear existing
    DELETE FROM role_permissions WHERE role_id = target_role_id;
    
    -- Add permissions manually
    FOR perm_id IN (
        SELECT id FROM permissions 
        WHERE name IN ('users.read', 'users.create', 'roles.read')
    ) LOOP
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (target_role_id, perm_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Manually assigned % permissions', 
        (SELECT COUNT(*) FROM role_permissions WHERE role_id = target_role_id);
END;
$$;

-- Verify
SELECT 
    r.name as role_name,
    COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.id = 1
GROUP BY r.name;
```

## 📝 What to Report Back

Please run the debug script and tell me:

1. **Function Test Result:**
   - ✅ SUCCESS or ❌ FAILED?
   - Permissions BEFORE: ?
   - Permissions AFTER: ?

2. **Browser Console:**
   - Any errors?
   - Any RPC logs?

3. **Manual SQL Test:**
   - Did `SELECT save_role_permissions(...)` work?
   - Did data appear in `role_permissions` table?

4. **Your Role:**
   - What role are you logged in as?
   - Run: `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid();`

This will help me identify the exact issue!
