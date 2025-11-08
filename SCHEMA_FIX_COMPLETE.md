# Database Schema Fix - Complete Solution

## 🎯 **Root Cause Identified:**

The code was looking for columns that don't exist in your actual database schema:
- ❌ Looking for: `user_roles.role_slug`, `user_roles.role_name`
- ✅ Actual schema: `user_roles.role_id` → `roles.id` (with `roles.name`)

## 📊 **Your Actual Database Schema:**

```sql
-- Roles table
CREATE TABLE public.roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(100) NOT NULL,
  description TEXT,
  description_ar TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (junction table)
CREATE TABLE public.user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  role_id INTEGER REFERENCES roles(id),
  assigned_by UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id)
);
```

## ✅ **Fixes Applied:**

### 1. **Updated Database Queries** (`databaseFix.ts`)
```typescript
// Before (incorrect):
.select('role_slug, role_name')  // These columns don't exist

// After (correct):
.select(`
  role_id,
  roles!inner (
    id,
    name,
    name_ar
  )
`)
```

### 2. **Fixed EnterpriseUserManagement** 
```typescript
// Now uses proper join with roles table
.select(`
  user_id,
  role_id,
  roles!inner (
    id,
    name,
    name_ar
  )
`)
```

### 3. **Role Name Mapping**
```typescript
// Maps database role names to app RoleSlug types
const roleMapping = {
  'super_admin': 'super_admin',
  'admin': 'admin',
  'manager': 'manager',
  'accountant': 'accountant',
  'auditor': 'auditor',
  'viewer': 'viewer'
};
```

## 🚀 **Setup Instructions:**

### 1. **Run the SQL Setup** (`SETUP_ROLES.sql`)
```sql
-- This will create the standard roles your app expects
INSERT INTO public.roles (name, name_ar, description, is_system_role) VALUES
('super_admin', 'مدير عام', 'Super Administrator', true),
('admin', 'مدير', 'Administrator', true),
('manager', 'مدير قسم', 'Manager', true),
('accountant', 'محاسب', 'Accountant', true),
('auditor', 'مراجع', 'Auditor', true),
('viewer', 'مستخدم', 'Viewer', true);
```

### 2. **Assign Your User as Super Admin**
```sql
-- First find your user ID:
SELECT id, email FROM public.user_profiles WHERE email = 'your-email@domain.com';

-- Then assign super_admin role (replace with your actual user ID):
INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active) 
SELECT 
  'your-user-id-here'::uuid,
  r.id,
  'your-user-id-here'::uuid,
  true
FROM public.roles r 
WHERE r.name = 'super_admin';
```

## 🧪 **Testing:**

1. **Restart dev server**: `npm run dev`
2. **Check console** - should be clean now
3. **Login** - should work without database errors
4. **Check user management** - should load users and roles
5. **Test permissions** - should work based on assigned roles

## 📊 **Expected Results:**

✅ **No more 400 Bad Request errors**  
✅ **No more "column does not exist" errors**  
✅ **User roles load correctly from database**  
✅ **EnterpriseUserManagement works without stack overflow**  
✅ **Proper role-based permissions**  

## 🔧 **Role Management:**

### **To assign roles to users:**
```sql
-- Assign accountant role to a user
INSERT INTO public.user_roles (user_id, role_id, assigned_by, is_active)
SELECT 
  'user-uuid-here'::uuid,
  r.id,
  'admin-user-uuid'::uuid,
  true
FROM public.roles r 
WHERE r.name = 'accountant';
```

### **To check user roles:**
```sql
SELECT 
  up.email,
  r.name as role,
  ur.is_active
FROM public.user_roles ur
JOIN public.user_profiles up ON up.id = ur.user_id
JOIN public.roles r ON r.id = ur.role_id
WHERE ur.is_active = true;
```

## 🎯 **Next Steps:**

1. **Run the setup SQL** to create standard roles
2. **Assign yourself super_admin role** 
3. **Test the application** - should work perfectly now
4. **Assign roles to other users** as needed

The database schema is now properly aligned with your application code! 🎉