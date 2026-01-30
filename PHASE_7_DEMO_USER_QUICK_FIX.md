# Phase 7 - Demo User Quick Fix

**Status**: Ready to Apply ✅

---

## The Problem
Demo user has no organizations → empty dropdown → can't test

## The Solution
Run SQL script to create demo organizations

---

## Quick Fix (5 minutes)

### Step 1: Open Supabase
```
https://app.supabase.com
```

### Step 2: Go to SQL Editor
```
Select your project → SQL Editor
```

### Step 3: Copy & Run This SQL
```sql
-- Create demo organizations if they don't exist
INSERT INTO organizations (name, description, created_by)
SELECT 'Demo Organization 1', 'Sample organization for testing', 
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Demo Organization 1');

INSERT INTO organizations (name, description, created_by)
SELECT 'Demo Organization 2', 'Another sample organization', 
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Demo Organization 2');

-- Assign demo user to organizations
INSERT INTO org_memberships (user_id, org_id, role, created_by)
SELECT 
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1),
  id,
  'org_admin',
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
FROM organizations
WHERE name IN ('Demo Organization 1', 'Demo Organization 2')
AND NOT EXISTS (
  SELECT 1 FROM org_memberships 
  WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
  AND org_id = organizations.id
);

-- Create demo projects
INSERT INTO projects (name, org_id, description, created_by)
SELECT 
  'Demo Project 1',
  id,
  'Sample project for testing',
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
FROM organizations
WHERE name = 'Demo Organization 1'
AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Demo Project 1' AND org_id = organizations.id);

INSERT INTO projects (name, org_id, description, created_by)
SELECT 
  'Demo Project 2',
  id,
  'Another sample project',
  (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1)
FROM organizations
WHERE name = 'Demo Organization 2'
AND NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Demo Project 2' AND org_id = organizations.id);

-- Verify setup
SELECT 'Organizations' as type, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Org Memberships', COUNT(*) FROM org_memberships
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects;
```

### Step 4: Refresh Browser
```
Ctrl+Shift+R (hard refresh)
```

### Step 5: Test Again
```
1. Go to: http://localhost:3000/settings/user-management
2. Click Tab 5: "الأدوار المحدودة"
3. Click "Organization Roles" tab
4. Click "Add Role"
5. Expected: Organizations dropdown is populated
```

---

## What Changed in Code

### Better Error Messages
- Now shows helpful message if no organizations exist
- User knows what to do

### Smart Button Disabling
- Button disabled when no data available
- Can't click "Add" with empty dropdown

### Error Handling
- Supabase errors are caught and displayed
- Connection issues are visible

---

## Expected Result

### Before Fix
```
❌ Empty dropdown
❌ Can't select organization
❌ Silent failure
```

### After Fix
```
✅ Dropdown populated with organizations
✅ Can select organization
✅ Can add roles
✅ Clear error messages if issues
```

---

## If Still Not Working

### Check 1: Verify Organizations Exist
```sql
SELECT id, name FROM organizations LIMIT 10;
```

### Check 2: Verify Demo User Has Organizations
```sql
SELECT o.id, o.name, om.role
FROM organizations o
JOIN org_memberships om ON o.id = om.org_id
WHERE om.user_id = (SELECT id FROM user_profiles WHERE email = 'demo@example.com' LIMIT 1);
```

### Check 3: Browser Console
```
F12 → Console tab
Look for error messages
```

### Check 4: Hard Refresh
```
Ctrl+Shift+R
```

---

## Summary

**Time**: 5 minutes  
**Difficulty**: Easy  
**Result**: Demo user can now test scoped roles

1. Run SQL script in Supabase
2. Hard refresh browser
3. Test again

Done! ✅
