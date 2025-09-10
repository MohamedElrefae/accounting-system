# Quick Test Guide for Access Request System

## ✅ Test Checklist

### 1. Test Access Request Submission
- [ ] Go to `/login`
- [ ] Click "طلب حساب جديد" (Request New Account)
- [ ] Fill out form with test data:
  - Email: test@example.com
  - Name: اختبار النظام
  - Phone: +966501234567
  - Department: تقنية المعلومات
  - Job Title: مطور
  - Message: طلب اختبار النظام
- [ ] Submit form
- [ ] Verify success message shows with instructions
- [ ] Check database: `SELECT * FROM access_requests WHERE email = 'test@example.com';`

### 2. Test Admin Interface
- [ ] Login as admin user
- [ ] Go to **Settings > User Management**
- [ ] Click on **"طلبات الوصول" (Access Requests)** tab
- [ ] Verify pending request appears
- [ ] Check notification badge shows count
- [ ] Click approve button
- [ ] Select role: "مستخدم عادي"
- [ ] Confirm approval
- [ ] Verify success alert shows with contact instructions
- [ ] Check database: `SELECT status FROM access_requests WHERE email = 'test@example.com';`

### 3. Test User Account Creation
- [ ] Go to `/login`
- [ ] Click "نسيت كلمة المرور؟"
- [ ] Enter test email: test@example.com
- [ ] Check for password reset email
- [ ] Click reset link in email
- [ ] Create new password
- [ ] Login with new credentials
- [ ] Verify profile loads automatically
- [ ] Check database: `SELECT * FROM user_profiles WHERE email = 'test@example.com';`

## 🔍 Database Verification Queries

```sql
-- Check access request was created
SELECT * FROM access_requests WHERE email = 'test@example.com';

-- Check request was approved
SELECT status, assigned_role, reviewed_at, reviewed_by 
FROM access_requests 
WHERE email = 'test@example.com' AND status = 'approved';

-- Check user profile was created automatically
SELECT id, email, full_name_ar, department, job_title, is_active 
FROM user_profiles 
WHERE email = 'test@example.com';

-- Check for any role assignments
SELECT ur.user_id, ur.role_name, up.email
FROM user_roles ur
JOIN user_profiles up ON ur.user_id = up.id
WHERE up.email = 'test@example.com';
```

## 🐛 Common Issues & Solutions

### Issue: "Access Denied" in admin interface
**Solution**: Check user permissions:
```sql
SELECT is_super_admin, department, role 
FROM user_profiles 
WHERE id = 'YOUR_USER_ID';
```

### Issue: Profile not created automatically
**Solution**: Check auth context logs and approved request data:
```sql
SELECT * FROM access_requests WHERE email = 'test@example.com' AND status = 'approved';
```

### Issue: Password reset not working
**Solution**: Verify Supabase email settings and check spam folder

## 📝 Success Criteria

- ✅ New users can submit access requests
- ✅ Admins get notifications for pending requests  
- ✅ Admins can approve/reject with role assignment
- ✅ Approved users can create accounts via password reset
- ✅ User profiles auto-populate from request data
- ✅ System is fully functional without email service setup
