# Complete Access Request Workflow - Test Scenario

## ✅ **UPDATED WORKFLOW: Register Button Added**

### 🎯 **What's New:**
- ✅ **"لديك موافقة؟ سجل الآن"** button added to login page
- ✅ **"اذهب للتسجيل الآن"** button in success message  
- ✅ **RegisterForm** now checks approved emails automatically
- ✅ **Direct links** between all forms

---

## 🧪 **Complete Test Scenario**

### **Step 1: User Submits Access Request**
1. Go to `/login`
2. Click **"طلب حساب جديد"** (Request New Account)
3. Fill the form:
   - Email: `test-approved@example.com`
   - Name: `مستخدم تجريبي`
   - Phone: `+966501234567`
   - Department: `تقنية المعلومات`
   - Job Title: `موظف`
4. Submit → Should see success message with **"اذهب للتسجيل الآن"** button
5. **DON'T click the button yet** - let's approve first

### **Step 2: Admin Approves Request**
1. Login as admin
2. Go to **Settings > User Management > طلبات الوصول**
3. Approve the test request
4. Should see alert with:
   - Contact information
   - Register link: `http://localhost:3000/register`
   - Instructions for the user

### **Step 3A: User Registration (via Success Button)**
1. Go back to the access request success screen
2. Click **"اذهب للتسجيل الآن"**
3. Should go to `/register`
4. Should see: **"هناك 1 بريد معتمد يمكنه التسجيل"** (green alert)
5. Fill registration form:
   - Email: `test-approved@example.com` (same as request)
   - Password: Strong password
   - Confirm Password: Same password
6. Click **"إنشاء حساب"**
7. Should see success message
8. Check email for confirmation link

### **Step 3B: User Registration (via Login Page)**
Alternative path:
1. Go to `/login`
2. Click **"لديك موافقة؟ سجل الآن"** (green button)
3. Follow same registration steps as 3A

### **Step 4: Email Confirmation**
1. Check email for Supabase confirmation
2. Click the confirmation link
3. Should redirect to login page

### **Step 5: First Login**
1. Go to `/login`
2. Login with:
   - Email: `test-approved@example.com`
   - Password: [password you created]
3. Should login successfully
4. **Profile should auto-load** with data from access request!

---

## 🔍 **Verification Queries**

Run these in Supabase SQL Editor to verify each step:

```sql
-- 1. Check the access request was created
SELECT * FROM access_requests WHERE email = 'test-approved@example.com';

-- 2. Check it was approved and pending profile created
SELECT 
  ar.email, ar.status, ar.reviewed_at,
  pup.full_name_ar, pup.department, pup.used
FROM access_requests ar
LEFT JOIN pending_user_profiles pup ON ar.email = pup.email
WHERE ar.email = 'test-approved@example.com';

-- 3. Check user was created in auth
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'test-approved@example.com';

-- 4. Check profile was auto-created
SELECT 
  up.email, up.full_name_ar, up.department, up.is_active,
  pup.used
FROM user_profiles up
LEFT JOIN pending_user_profiles pup ON up.email = pup.email
WHERE up.email = 'test-approved@example.com';
```

---

## ✅ **Expected Results**

### **After Step 1:**
- ✅ Record in `access_requests` with `status = 'pending'`
- ✅ User sees success message with register button

### **After Step 2:** 
- ✅ `access_requests.status = 'approved'`
- ✅ Record in `pending_user_profiles` with `used = false`
- ✅ Admin gets contact info and register link

### **After Step 3:**
- ✅ RegisterForm shows "1 approved email" message
- ✅ User can successfully create account
- ✅ Record in `auth.users` created

### **After Step 4:**
- ✅ `auth.users.email_confirmed_at` is set
- ✅ User can login

### **After Step 5:**
- ✅ User logs in successfully
- ✅ Profile auto-created in `user_profiles`
- ✅ `pending_user_profiles.used = true`
- ✅ Profile data matches original access request

---

## 🎉 **Success Indicators**

1. **✅ Login form** shows register button
2. **✅ RegisterForm** detects approved emails
3. **✅ User can create account** with approved email
4. **✅ Profile auto-populates** on first login
5. **✅ Complete data flow** from request → approval → registration → login

**The workflow is now complete with all necessary buttons and links! 🚀**
