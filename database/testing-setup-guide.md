# 🧪 Testing Environment Setup Guide

## Overview
This guide walks you through creating a complete isolated testing environment for client demonstrations without affecting production data.

---

## 🎯 Step 1: Create New Supabase Project for Testing

### 1.1 Create Testing Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Use these settings:
   - **Name:** `Accounting System - Testing`
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Same as your production (for consistency)
   - **Plan:** Free tier is fine for testing

### 1.2 Get Testing Database Credentials
After project creation, go to **Settings > Database** and note:
- **Host**
- **Database Name** 
- **Port**
- **User**
- **Password**

---

## 🗄️ Step 2: Set Up Database Schema

### 2.1 Run Schema Creation
1. Open Supabase SQL Editor in your testing project
2. Copy and paste the entire content from `database-schema-export.sql`
3. Execute the script
4. Verify all tables, functions, and policies are created

### 2.2 Run Seed Data
1. In the same SQL Editor
2. Copy and paste the entire content from `testing-seed-data.sql`
3. Execute the script
4. Verify data is inserted by running the verification queries at the end

---

## 🔐 Step 3: Create Test Users in Supabase Auth

### 3.1 Enable Email Authentication
1. Go to **Authentication > Settings**
2. Ensure **Email** provider is enabled
3. **Disable email confirmations** for testing (optional)

### 3.2 Create Test User Accounts
In **Authentication > Users**, create these users:

| Email | Password | Role to Assign |
|-------|----------|----------------|
| admin@test.com | TestAdmin123! | admin |
| manager@test.com | TestManager123! | manager |
| accountant@test.com | TestAccount123! | accountant |  
| clerk@test.com | TestClerk123! | clerk |
| viewer@test.com | TestViewer123! | viewer |

### 3.3 Assign Roles to Users
After creating users, run this SQL to assign roles:

```sql
-- Copy this block and run in SQL Editor after creating auth users
-- Replace the email with actual user emails from auth.users table

-- Get user IDs and assign roles
INSERT INTO user_roles (user_id, role_id)
SELECT 
    au.id as user_id,
    r.id as role_id
FROM auth.users au
CROSS JOIN roles r
WHERE (au.email = 'admin@test.com' AND r.name = 'admin')
   OR (au.email = 'manager@test.com' AND r.name = 'manager')
   OR (au.email = 'accountant@test.com' AND r.name = 'accountant')
   OR (au.email = 'clerk@test.com' AND r.name = 'clerk')
   OR (au.email = 'viewer@test.com' AND r.name = 'viewer')
ON CONFLICT (user_id, role_id) DO NOTHING;
```

---

## ⚙️ Step 4: Configure Frontend for Testing

### 4.1 Create Testing Environment File
Create `.env.testing` in your project root:

```env
# Testing Environment Variables
VITE_SUPABASE_URL=https://your-testing-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_testing_anon_key
VITE_ENVIRONMENT=testing
VITE_APP_TITLE=Accounting System (TEST)
```

### 4.2 Update Package.json Scripts
Add testing scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:test": "vite --mode testing",
    "build": "tsc && vite build",
    "build:test": "tsc && vite build --mode testing",
    "preview": "vite preview",
    "preview:test": "vite preview --mode testing"
  }
}
```

### 4.3 Update Environment Configuration
Ensure your app can read the testing environment variables in `src/lib/supabase.ts`:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const environment = import.meta.env.VITE_ENVIRONMENT || 'production'

// Add visual indicator for testing
if (environment === 'testing') {
  console.log('🧪 Running in TESTING mode')
}
```

---

## 🚀 Step 5: Deploy Testing Version

### 5.1 Option A: Separate Vercel Project (Recommended)
1. Create new Vercel project for testing:
   ```bash
   vercel --name accounting-system-test
   ```

2. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
   - `VITE_ENVIRONMENT=testing`
   - `VITE_APP_TITLE=Accounting System (TEST)`

3. Deploy testing branch:
   ```bash
   git checkout -b testing-environment
   git add .
   git commit -m "Add testing environment configuration"
   git push origin testing-environment
   vercel --prod
   ```

### 5.2 Option B: Vercel Preview Deployments
1. Use branch deployments with different env vars
2. Set up branch-specific environment variables in Vercel

---

## 🧪 Step 6: Test the Complete Setup

### 6.1 Verify Database
Run these verification queries in Supabase SQL Editor:

```sql
-- Copy and paste this verification block

-- Check all tables exist
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check sample data
SELECT 'Roles' as table_name, COUNT(*) as records FROM roles
UNION ALL
SELECT 'Permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'Role Permissions', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'Accounts', COUNT(*) FROM accounts
UNION ALL
SELECT 'Cost Centers', COUNT(*) FROM cost_centers
UNION ALL
SELECT 'Projects', COUNT(*) FROM projects;

-- Check role permission assignments
SELECT 
    r.name as role,
    COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY permission_count DESC;
```

### 6.2 Test User Authentication
1. Visit your testing URL
2. Try logging in with each test user
3. Verify permissions work correctly for each role
4. Test all major features

---

## 📋 Step 7: Client Testing Preparation

### 7.1 Create Testing Documentation
Prepare client testing guide with:
- Testing URL
- Test user credentials
- Feature walkthrough
- Expected behaviors for each role

### 7.2 Testing Scenarios
Create test scenarios for:
- **Admin Role:** Full system management
- **Manager Role:** Department operations
- **Accountant Role:** Financial transactions
- **Clerk Role:** Data entry tasks
- **Viewer Role:** Reports and viewing

---

## 🔧 Maintenance and Updates

### Keeping Testing in Sync
1. **Schema Changes:** Re-run schema export and update testing DB
2. **New Features:** Deploy to testing environment first
3. **Data Refresh:** Periodically refresh seed data if needed

### Monitoring Testing Environment
- Monitor Supabase usage to stay within limits
- Regular cleanup of test transactions if needed
- Update test user passwords periodically

---

## ✅ Success Checklist

- [ ] New Supabase testing project created
- [ ] Database schema deployed successfully
- [ ] Seed data inserted and verified
- [ ] Test users created in Supabase Auth
- [ ] User roles assigned correctly
- [ ] Frontend configured for testing environment
- [ ] Testing deployment live and accessible
- [ ] All user roles tested and working
- [ ] Client testing documentation prepared

---

## 🆘 Troubleshooting

### Common Issues:
1. **RLS Policies:** Ensure RLS policies allow test users to access data
2. **Environment Variables:** Double-check Supabase URL and keys
3. **CORS Issues:** Verify domain settings in Supabase
4. **Permission Errors:** Check role assignments and permission mappings

### Support Commands:
```sql
-- Check user role assignments
SELECT 
    au.email,
    r.name as role_name
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
ORDER BY au.email;

-- Reset user roles if needed
DELETE FROM user_roles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@test.com'
);
```

---

**🎉 Your isolated testing environment is ready for client demonstrations!**