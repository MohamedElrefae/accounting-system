# Access Request System - Setup & Deployment Guide

## Overview
This system implements a complete user registration and access request workflow where:
1. New users request access through the login form
2. Admins get notifications about pending requests  
3. Admins can approve/reject requests and assign roles
4. Admin contacts approved users with instructions
5. Approved users use "Forgot Password" to create their account

## 🗄️ Database Setup

### Step 1: Create Access Requests Table
Run this SQL in your Supabase SQL Editor:

```sql
-- Create access_requests table
CREATE TABLE IF NOT EXISTS public.access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name_ar TEXT,
    phone TEXT,
    department TEXT,
    job_title TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    assigned_role TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for access_requests
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert new requests (for public access)
CREATE POLICY "Anyone can submit access requests" ON public.access_requests
    FOR INSERT WITH CHECK (true);

-- Allow users to read their own requests
CREATE POLICY "Users can view own requests" ON public.access_requests
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- Allow admins to view and update all requests
CREATE POLICY "Admins can manage access requests" ON public.access_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND (is_super_admin = true OR department = 'Admin')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for access_requests
CREATE TRIGGER update_access_requests_updated_at 
    BEFORE UPDATE ON public.access_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON public.access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON public.access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON public.access_requests(requested_at DESC);
```

### Step 2: Verify Table Creation
Run this verification query:

```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'access_requests'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

## ✅ Simple No-Email Setup

This system uses a simple approach that doesn't require any email service setup:
- When admin approves a request, they get contact information
- Admin contacts the user directly (phone/email)
- Admin instructs user to use "Forgot Password" to create account
- System automatically creates user profile from approved request data

## 🔧 Frontend Integration

The following components have been created and integrated:

1. **AccessRequestForm.tsx** - Form for new users to request access
2. **AccessRequestManagement.tsx** - Admin interface for managing requests
3. **Updated LoginForm.tsx** - Now includes "Request New Account" button
4. **accessRequestService.ts** - API service functions
5. **useAccessRequestNotifications.ts** - Hook for real-time notifications

## 📱️ **Access Location**

The access request management is now integrated as a tab in the User Management System:
- Navigate to **Settings > User Management**
- Click on the **"طلبات الوصول" (Access Requests)** tab

## 👥 User Permissions

Users who can manage access requests:
- Super admins (`is_super_admin = true`)
- Users in Admin department (`department = 'Admin'`)
- Users with admin role (`role = 'admin'`)

## 🔄 Complete Workflow

### For New Users:
1. Visit `/login`
2. Click "طلب حساب جديد" (Request New Account)
3. Fill out the access request form
4. Wait for approval

### For Admins:
1. Go to **Settings > User Management**
2. Click on **"طلبات الوصول" (Access Requests)** tab
3. View pending requests with real-time notifications
4. Approve/reject requests and assign roles
5. **System creates user account automatically** with temporary password
6. Contact approved user with login credentials

### For Approved Users:
1. Admin contacts you with approval notification
2. **Go to signup page**: Use the provided signup link
3. **Create account** with your approved email address
4. **Confirm email** from the verification link sent to you
5. **Login for first time** - your profile loads automatically!

## 🔐 Security Features

- **Row Level Security (RLS)** on access_requests table
- **Email validation** and duplicate prevention
- **Secure password reset flow** via Supabase auth
- **Permission-based admin access**
- **Audit trail** of who approved/rejected requests
- **Automatic profile creation** from approved request data

## 🎨 UI Features

- **Arabic RTL support** throughout the interface
- **Material-UI components** following your theme
- **Real-time notifications** for pending requests
- **Responsive design** for mobile and desktop
- **Loading states** and error handling

## 🧪 Testing

1. **Test Access Request Submission:**
   - Go to login page
   - Click "طلب حساب جديد"
   - Fill out form and submit
   - Check database for new request

2. **Test Admin Interface:**
   - Login as admin user  
   - Navigate to **Settings > User Management**
   - Click on **"طلبات الوصول" (Access Requests)** tab
   - Approve a pending request
   - Get contact instructions for the user

3. **Test New User Flow:**
   - Use "Forgot Password" with approved email
   - Create new password via reset link
   - Login with new credentials
   - Verify profile data loads automatically

## 🚨 Production Deployment

Before going to production:

1. **Test the complete workflow** with real users
2. **Set up admin notification system** for pending requests
3. **Monitor** access request volume
4. **Train admins** on the approval and user contact process
5. **Verify** Supabase email settings for password reset

## 📊 Monitoring

Track these metrics:
- Number of access requests per day
- Time to approval/rejection
- Successful user account creations
- Password reset completion rates

## 🔧 Customization

To customize the system:

1. **Departments**: Edit the `departments` array in `AccessRequestForm.tsx`
2. **Roles**: Modify the `roles` array in `AccessRequestManagement.tsx`
3. **Email Template**: Update the HTML template in `send-approval-email/index.ts`
4. **Permissions**: Adjust the permission checks in `accessRequestService.ts`

## 🆘 Troubleshooting

### Common Issues:

1. **"Access Denied" when accessing admin interface**
   - Check user has correct permissions
   - Verify RLS policies are set correctly

2. **Emails not sending**
   - Check Supabase function logs
   - Verify RESEND_API_KEY is set
   - Check email service quotas

3. **Database permission errors**
   - Ensure RLS policies are created
   - Check service role key permissions

4. **Password reset issues**
   - Verify Supabase auth is configured correctly
   - Check email redirect URLs

## 📝 Support

If you encounter issues:
1. Check browser console for errors
2. Review Supabase function logs
3. Verify database policies and permissions
4. Test email service integration
