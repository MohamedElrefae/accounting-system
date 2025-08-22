# Warp AI Agent - Construction Accounting Authentication System Implementation

## 🎯 PROJECT OVERVIEW FOR AI AGENT

You are tasked with implementing a comprehensive authentication and authorization system for a construction company accounting web application. This system must include:

- **Frontend**: React 18 + Vite + Tailwind CSS with Arabic RTL support
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Key Features**: Role-based permissions, user management UI, Arabic language support, social login
- **Architecture**: Enterprise-grade security with audit logging and compliance features

## 📋 EXECUTION CHECKLIST

Execute these tasks in order:

- [ ] **Phase 1**: Project Setup & Environment Configuration
- [ ] **Phase 2**: Supabase Backend Configuration & Database Schema
- [ ] **Phase 3**: Authentication System Implementation
- [ ] **Phase 4**: Permission Management System
- [ ] **Phase 5**: Admin Dashboard & User Management UI
- [ ] **Phase 6**: Security & Validation Implementation
- [ ] **Phase 7**: Testing & Deployment Setup

---

## 🚀 PHASE 1: PROJECT SETUP & ENVIRONMENT CONFIGURATION

### Step 1.1: Initialize React + Vite Project

```bash
# Create new Vite React project
npm create vite@latest construction-auth-system -- --template react
cd construction-auth-system

# Install core dependencies
npm install @supabase/supabase-js@2.45.4
npm install react-router-dom@6.26.2
npm install @headlessui/react@1.7.19 @heroicons/react@2.0.18
npm install react-hook-form@7.52.2 yup@1.4.0 @hookform/resolvers@3.9.0
npm install react-toastify@10.0.5
npm install @tanstack/react-query@5.51.23
npm install lucide-react@0.439.0

# Install development dependencies
npm install -D tailwindcss@3.4.10 postcss@8.4.41 autoprefixer@10.4.20
npm install -D @types/node@22.5.4

# Initialize Tailwind CSS
npx tailwindcss init -p
```

### Step 1.2: Configure Environment Variables

Create `.env.local` file:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration
VITE_APP_NAME=نظام المحاسبة
VITE_APP_DESCRIPTION=نظام محاسبة متقدم للشركات

# Security Settings
VITE_ENABLE_MFA=true
VITE_SESSION_TIMEOUT=3600000
VITE_MAX_LOGIN_ATTEMPTS=3

# Features
VITE_ENABLE_SOCIAL_LOGIN=true
VITE_ENABLE_AUDIT_LOGGING=true
```

### Step 1.3: Configure Tailwind CSS

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'arabic': ['Amiri', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#64748b',
          600: '#475569',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### Step 1.4: Update Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:prod": "NODE_ENV=production vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext js,jsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

---

## 🗄️ PHASE 2: SUPABASE BACKEND CONFIGURATION

### Step 2.1: Create Database Schema

Execute these SQL commands in Supabase SQL Editor **in this exact order**:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles table (extends auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name_ar VARCHAR(200), -- Arabic full name
    phone VARCHAR(20),
    avatar_url TEXT,
    department VARCHAR(100),
    job_title VARCHAR(100),
    manager_id UUID REFERENCES public.user_profiles(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles table
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL, -- Arabic role name
    description TEXT,
    description_ar TEXT, -- Arabic description
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions table
CREATE TABLE public.permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    name_ar VARCHAR(100) NOT NULL, -- Arabic permission name
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    description_ar TEXT, -- Arabic description
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles assignment
CREATE TABLE public.user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.user_profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Role permissions mapping
CREATE TABLE public.role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Individual user permissions (overrides role permissions)
CREATE TABLE public.user_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES public.user_profiles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, permission_id)
);

-- Audit logs for compliance
CREATE TABLE public.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permission requests for approval workflow
CREATE TABLE public.permission_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    requested_permission_id INTEGER REFERENCES public.permissions(id),
    requested_role_id INTEGER REFERENCES public.roles(id),
    request_type VARCHAR(20) CHECK (request_type IN ('permission', 'role')),
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT
);

-- Rate limiting table
CREATE TABLE public.rate_limits (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX idx_user_profiles_department ON public.user_profiles (department);
CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles (role_id);
CREATE INDEX idx_permissions_resource ON public.permissions (resource);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at);
CREATE INDEX idx_rate_limits_identifier_action ON public.rate_limits (identifier, action, created_at);
```

### Step 2.2: Insert Initial Data

```sql
-- Insert default roles
INSERT INTO public.roles (name, name_ar, description, description_ar, is_system_role) VALUES
('Super Admin', 'مدير النظام', 'Full system access', 'وصول كامل للنظام', true),
('Manager', 'مدير', 'Department management and user administration', 'إدارة القسم وإدارة المستخدمين', true),
('Senior Accountant', 'محاسب أول', 'Full accounting access with limited admin functions', 'وصول كامل للمحاسبة مع وظائف إدارية محدودة', true),
('Accountant', 'محاسب', 'Standard accounting operations', 'العمليات المحاسبية القياسية', true),
('Supervisor', 'مشرف', 'Project oversight and team coordination', 'إشراف المشاريع وتنسيق الفريق', true),
('Viewer', 'مستعرض', 'Read-only access to reports and data', 'وصول للقراءة فقط للتقارير والبيانات', true);

-- Insert core permissions
INSERT INTO public.permissions (name, name_ar, resource, action, description, description_ar) VALUES
('users.create', 'إنشاء المستخدمين', 'users', 'create', 'Create new user accounts', 'إنشاء حسابات مستخدمين جديدة'),
('users.read', 'عرض المستخدمين', 'users', 'read', 'View user information', 'عرض معلومات المستخدمين'),
('users.update', 'تحديث المستخدمين', 'users', 'update', 'Modify user profiles', 'تعديل ملفات المستخدمين'),
('users.delete', 'حذف المستخدمين', 'users', 'delete', 'Delete user accounts', 'حذف حسابات المستخدمين'),
('roles.manage', 'إدارة الأدوار', 'roles', 'manage', 'Assign and modify user roles', 'تعيين وتعديل أدوار المستخدمين'),
('invoices.create', 'إنشاء الفواتير', 'invoices', 'create', 'Create new invoices', 'إنشاء فواتير جديدة'),
('invoices.read', 'عرض الفواتير', 'invoices', 'read', 'View invoice data', 'عرض بيانات الفواتير'),
('invoices.update', 'تحديث الفواتير', 'invoices', 'update', 'Modify existing invoices', 'تعديل الفواتير الموجودة'),
('invoices.delete', 'حذف الفواتير', 'invoices', 'delete', 'Delete invoices', 'حذف الفواتير'),
('expenses.create', 'إنشاء المصروفات', 'expenses', 'create', 'Record new expenses', 'تسجيل مصروفات جديدة'),
('expenses.read', 'عرض المصروفات', 'expenses', 'read', 'View expense records', 'عرض سجلات المصروفات'),
('expenses.update', 'تحديث المصروفات', 'expenses', 'update', 'Modify expense records', 'تعديل سجلات المصروفات'),
('expenses.delete', 'حذف المصروفات', 'expenses', 'delete', 'Delete expense records', 'حذف سجلات المصروفات'),
('reports.read', 'عرض التقارير', 'reports', 'read', 'View financial reports', 'عرض التقارير المالية'),
('reports.export', 'تصدير التقارير', 'reports', 'export', 'Export report data', 'تصدير بيانات التقارير'),
('payroll.read', 'عرض الرواتب', 'payroll', 'read', 'View payroll information', 'عرض معلومات الرواتب'),
('payroll.manage', 'إدارة الرواتب', 'payroll', 'manage', 'Manage payroll operations', 'إدارة عمليات الرواتب');

-- Assign permissions to roles
-- Super Admin gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 1, id FROM public.permissions;

-- Manager gets user management and most business permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 2, id FROM public.permissions WHERE name IN (
    'users.create', 'users.read', 'users.update', 'roles.manage',
    'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
    'expenses.create', 'expenses.read', 'expenses.update', 'expenses.delete',
    'reports.read', 'reports.export', 'payroll.read', 'payroll.manage'
);

-- Senior Accountant gets full accounting access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 3, id FROM public.permissions WHERE name IN (
    'users.read', 'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
    'expenses.create', 'expenses.read', 'expenses.update', 'expenses.delete',
    'reports.read', 'reports.export', 'payroll.read'
);

-- Regular Accountant gets standard permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 4, id FROM public.permissions WHERE name IN (
    'invoices.create', 'invoices.read', 'invoices.update',
    'expenses.create', 'expenses.read', 'expenses.update',
    'reports.read'
);

-- Supervisor gets project-related permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 5, id FROM public.permissions WHERE name IN (
    'users.read', 'expenses.read', 'reports.read'
);

-- Viewer gets read-only access
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 6, id FROM public.permissions WHERE name IN (
    'invoices.read', 'expenses.read', 'reports.read'
);
```

### Step 2.3: Create Database Functions

```sql
-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(user_id UUID, permission_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Check direct user permissions first
    SELECT COALESCE(up.granted, FALSE) INTO has_permission
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = $1 AND p.name = $2 AND (up.expires_at IS NULL OR up.expires_at > NOW());
    
    IF has_permission IS NOT NULL THEN
        RETURN has_permission;
    END IF;
    
    -- Check role-based permissions
    SELECT TRUE INTO has_permission
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = $1 
    AND p.name = $2 
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    LIMIT 1;
    
    RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions list
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TABLE(permission_name VARCHAR, permission_name_ar VARCHAR, resource VARCHAR, action VARCHAR) AS $$
BEGIN
    RETURN QUERY
    -- Direct user permissions
    SELECT DISTINCT p.name, p.name_ar, p.resource, p.action
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = $1 
    AND up.granted = TRUE
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
    
    UNION
    
    -- Role-based permissions
    SELECT DISTINCT p.name, p.name_ar, p.resource, p.action
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = $1 
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log user actions
CREATE OR REPLACE FUNCTION log_user_action(
    p_user_id UUID,
    p_action VARCHAR,
    p_resource_type VARCHAR DEFAULT NULL,
    p_resource_id VARCHAR DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        old_values, new_values, ip_address
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, 
        inet_client_addr()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2.4: Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Manager')
            AND ur.is_active = true
        )
    );

CREATE POLICY "Managers can create profiles" ON user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Manager')
            AND ur.is_active = true
        )
    );

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Manager')
            AND ur.is_active = true
        )
    );

-- Permission requests policies
CREATE POLICY "Users can create their own permission requests" ON permission_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own permission requests" ON permission_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view and update all permission requests" ON permission_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Manager')
            AND ur.is_active = true
        )
    );

-- Allow read access to roles and permissions for all authenticated users
CREATE POLICY "Authenticated users can view roles" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view permissions" ON permissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view role permissions" ON role_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to view their own roles and permissions
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their own permissions" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());
```

---

## 🔐 PHASE 3: AUTHENTICATION SYSTEM IMPLEMENTATION

### Step 3.1: Create Project Structure

Create the following directory structure:
```
src/
├── components/
│   ├── auth/
│   ├── admin/
│   ├── ui/
│   └── profile/
├── hooks/
├── lib/
├── pages/
├── context/
└── utils/
```

### Step 3.2: Supabase Configuration

Create `src/lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
  global: {
    headers: {
      'Accept-Language': 'ar,en;q=0.9'
    }
  }
})

// Helper functions
export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session?.user || null
}

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
```

### Step 3.3: Authentication Context

Create `src/context/AuthContext.jsx`:
```javascript
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getCurrentUser, getUserProfile } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadUserProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const getInitialSession = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        await loadUserProfile(currentUser.id)
      }
    } catch (error) {
      console.error('Error getting initial session:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProfile = async (userId) => {
    try {
      const userProfile = await getUserProfile(userId)
      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error

    // Create user profile
    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email,
          ...userData
        })
      if (profileError) throw profileError
    }

    return data
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refetchProfile: () => loadUserProfile(user?.id)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Step 3.4: Login Component (Arabic RTL Design)

Create `src/components/auth/LoginForm.jsx`:
```javascript
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-toastify'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'

const loginSchema = yup.object({
  email: yup
    .string()
    .email('البريد الإلكتروني غير صحيح')
    .required('البريد الإلكتروني مطلوب'),
  password: yup
    .string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .required('كلمة المرور مطلوبة')
})

export const LoginForm = () => {
  const { signIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(loginSchema)
  })

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      await signIn(data.email, data.password)
      toast.success('تم تسجيل الدخول بنجاح')
    } catch (error) {
      toast.error(error.message === 'Invalid login credentials' 
        ? 'بيانات الدخول غير صحيحة' 
        : 'حدث خطأ أثناء تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
    } catch (error) {
      toast.error(`فشل تسجيل الدخول عبر ${provider}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4" dir="rtl">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            نظام المحاسبة
          </h1>
          <p className="text-gray-300 text-sm">
            نظام محاسبة متقدم للشركات
          </p>
        </div>

        {/* Social Login */}
        <div className="mb-6">
          <p className="text-gray-300 text-center text-sm mb-4">
            أو سجل الدخول باستخدام
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => handleSocialLogin('github')}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <span>GitHub</span>
            </button>
            <button
              onClick={() => handleSocialLogin('google')}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <span>جوجل</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                البريد الإلكتروني
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="mohamedelrefae81@gmail.com"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="space-y-3 text-center">
          <div className="flex justify-center gap-6 text-sm">
            <a href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
              تسجيل حساب جديد
            </a>
            <a href="/forgot-password" className="text-blue-400 hover:text-blue-300 transition-colors">
              نسيت كلمة المرور؟
            </a>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <a href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
              إنشاء حساب جديد
            </a>
            <a href="/support" className="text-blue-400 hover:text-blue-300 transition-colors">
              الدعم
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 🛡️ PHASE 4: PERMISSION MANAGEMENT SYSTEM

### Step 4.1: Permission Hook

Create `src/hooks/usePermissions.js`:
```javascript
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export const usePermissions = () => {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadUserPermissions()
    } else {
      setPermissions([])
      setLoading(false)
    }
  }, [user])

  const loadUserPermissions = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_permissions', { user_id: user.id })
      
      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      console.error('Error loading permissions:', error)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (permission) => {
    return permissions.some(p => p.permission_name === permission)
  }

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => hasPermission(permission))
  }

  const getPermissionsByResource = (resource) => {
    return permissions.filter(p => p.resource === resource)
  }

  const checkPermission = async (permission) => {
    if (!user) return false
    
    try {
      const { data, error } = await supabase
        .rpc('check_user_permission', { 
          user_id: user.id, 
          permission_name: permission 
        })
      
      if (error) throw error
      return data || false
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionsByResource,
    checkPermission,
    refetch: loadUserPermissions
  }
}
```

### Step 4.2: Permission Guard Component

Create `src/components/auth/PermissionGuard.jsx`:
```javascript
import React from 'react'
import { usePermissions } from '../../hooks/usePermissions'

export const PermissionGuard = ({ 
  permission, 
  permissions = [], 
  requireAll = false,
  children, 
  fallback = null,
  loading: customLoading = null 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  if (loading) {
    return customLoading || (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  return hasAccess ? children : fallback
}

// Higher-order component version
export const withPermission = (permission, fallback = null) => {
  return (Component) => {
    const WrappedComponent = (props) => (
      <PermissionGuard permission={permission} fallback={fallback}>
        <Component {...props} />
      </PermissionGuard>
    )
    
    WrappedComponent.displayName = `withPermission(${Component.displayName || Component.name})`
    return WrappedComponent
  }
}

// Hook version for conditional rendering
export const usePermissionCheck = (permission, permissions = [], requireAll = false) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions()

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions.length > 0) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  return { hasAccess, loading }
}
```

---

## 🎛️ PHASE 5: ADMIN DASHBOARD & USER MANAGEMENT UI

### Step 5.1: User Management Component

Create `src/components/admin/UserManagement.jsx`:
```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-toastify'
import { 
  PencilIcon, 
  TrashIcon, 
  UserPlusIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline'
import { PermissionGuard } from '../auth/PermissionGuard'
import { PermissionMatrix } from './PermissionMatrix'

export const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user_roles (
            roles (id, name, name_ar)
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('فشل في تحميل المستخدمين')
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')
      
      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('Error loading roles:', error)
    }
  }

  const handleRoleChange = async (userId, roleId) => {
    try {
      // Remove existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      // Add new role
      if (roleId) {
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: roleId,
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          })
        
        if (error) throw error
      }

      toast.success('تم تحديث دور المستخدم بنجاح')
      loadUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('فشل في تحديث دور المستخدم')
    }
  }

  const handleUserStatusToggle = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)
      
      if (error) throw error
      
      toast.success(`تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} المستخدم`)
      loadUsers()
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast.error('فشل في تغيير حالة المستخدم')
    }
  }

  const filteredUsers = users.filter(user => 
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
        <PermissionGuard permission="users.create">
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlusIcon className="w-5 h-5" />
            مستخدم جديد
          </button>
        </PermissionGuard>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="البحث عن المستخدمين..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                المستخدم
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                القسم
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الدور
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                آخر دخول
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div className="mr-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.department || 'غير محدد'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={user.user_roles?.[0]?.roles?.id || ''}
                    onChange={(e) => handleRoleChange(user.id, e.target.value || null)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!user.is_active}
                  >
                    <option value="">اختر الدور</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name_ar}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleUserStatusToggle(user.id, user.is_active)}
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    } transition-colors`}
                  >
                    {user.is_active ? 'نشط' : 'غير نشط'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_login 
                    ? new Date(user.last_login).toLocaleDateString('ar-SA')
                    : 'لم يسجل دخول بعد'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <PermissionGuard permission="users.update">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowUserModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="roles.manage">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowRoleModal(true)
                        }}
                        className="text-green-600 hover:text-green-900 transition-colors text-xs px-2 py-1 bg-green-50 rounded"
                      >
                        صلاحيات
                      </button>
                    </PermissionGuard>
                    <PermissionGuard permission="users.delete">
                      <button
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
                            // Handle user deletion
                          }
                        }}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </PermissionGuard>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            لا توجد مستخدمين
          </div>
        )}
      </div>

      {/* Permission Matrix Modal */}
      {showRoleModal && selectedUser && (
        <PermissionMatrix
          userId={selectedUser.id}
          onClose={() => {
            setShowRoleModal(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}
```

### Step 5.2: Permission Matrix Component

Create `src/components/admin/PermissionMatrix.jsx`:
```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-toastify'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'

export const PermissionMatrix = ({ userId, onClose }) => {
  const [permissions, setPermissions] = useState([])
  const [userPermissions, setUserPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (userId) {
      loadPermissionsData()
    }
  }, [userId])

  const loadPermissionsData = async () => {
    try {
      setLoading(true)
      
      // Load all permissions
      const { data: allPermissions, error: permError } = await supabase
        .from('permissions')
        .select('*')
        .order('resource, action')
      
      if (permError) throw permError

      // Load user's direct permissions
      const { data: userPerms, error: userPermError } = await supabase
        .from('user_permissions')
        .select('permission_id, granted')
        .eq('user_id', userId)
        .is('expires_at', null)
      
      if (userPermError) throw userPermError

      // Load user's role-based permissions
      const { data: rolePerms, error: rolePermError } = await supabase
        .from('user_roles')
        .select(`
          roles (
            role_permissions (
              permission_id
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('expires_at', null)
      
      if (rolePermError) throw rolePermError

      const rolePermissionIds = rolePerms.flatMap(ur => 
        ur.roles.role_permissions.map(rp => rp.permission_id)
      )

      setPermissions(allPermissions || [])
      setUserPermissions(userPerms || [])
      setRolePermissions(rolePermissionIds)
    } catch (error) {
      console.error('Error loading permissions data:', error)
      toast.error('فشل في تحميل بيانات الصلاحيات')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = async (permissionId, currentState) => {
    try {
      setSaving(true)

      if (currentState === null) {
        // Grant permission
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            permission_id: permissionId,
            granted: true,
            granted_by: (await supabase.auth.getUser()).data.user?.id
          })
        
        if (error) throw error
      } else if (currentState === true) {
        // Revoke permission
        const { error } = await supabase
          .from('user_permissions')
          .update({ granted: false })
          .eq('user_id', userId)
          .eq('permission_id', permissionId)
        
        if (error) throw error
      } else {
        // Remove override (back to role-based)
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission_id', permissionId)
        
        if (error) throw error
      }

      await loadPermissionsData()
      toast.success('تم تحديث الصلاحيات بنجاح')
    } catch (error) {
      console.error('Error updating permission:', error)
      toast.error('فشل في تحديث الصلاحية')
    } finally {
      setSaving(false)
    }
  }

  const getPermissionState = (permissionId) => {
    const userPerm = userPermissions.find(up => up.permission_id === permissionId)
    
    if (userPerm) {
      return userPerm.granted ? 'granted' : 'denied'
    }
    
    if (rolePermissions.includes(permissionId)) {
      return 'role-based'
    }
    
    return 'none'
  }

  const groupedPermissions = permissions.reduce((groups, permission) => {
    const { resource } = permission
    if (!groups[resource]) {
      groups[resource] = []
    }
    groups[resource].push(permission)
    return groups
  }, {})

  const getResourceNameAr = (resource) => {
    const resourceNames = {
      'users': 'المستخدمين',
      'roles': 'الأدوار',
      'invoices': 'الفواتير',
      'expenses': 'المصروفات',
      'reports': 'التقارير',
      'payroll': 'الرواتب'
    }
    return resourceNames[resource] || resource
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4">جاري تحميل الصلاحيات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">إدارة صلاحيات المستخدم</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>ممنوحة مباشرة</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>ممنوحة من الدور</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>مرفوضة</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                <span>غير محددة</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
              <div key={resource} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3">
                  <h3 className="font-medium text-gray-900">
                    {getResourceNameAr(resource)}
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {resourcePermissions.map((permission) => {
                    const state = getPermissionState(permission.id)
                    return (
                      <div key={permission.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <div className="font-medium text-gray-900">
                            {permission.name_ar}
                          </div>
                          <div className="text-sm text-gray-500">
                            {permission.description_ar}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePermissionToggle(
                              permission.id,
                              state === 'granted' ? true : null
                            )}
                            disabled={saving}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              state === 'granted'
                                ? 'bg-green-500 text-white'
                                : state === 'role-based'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-500 hover:bg-green-100'
                            }`}
                          >
                            {(state === 'granted' || state === 'role-based') && (
                              <CheckIcon className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handlePermissionToggle(
                              permission.id,
                              state === 'denied' ? false : false
                            )}
                            disabled={saving}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              state === 'denied'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-200 text-gray-500 hover:bg-red-100'
                            }`}
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 🔒 PHASE 6: SECURITY & VALIDATION IMPLEMENTATION

### Step 6.1: Input Validation

Create `src/lib/validations.js`:
```javascript
import * as yup from 'yup'

// Common validation rules
export const emailValidation = yup
  .string()
  .email('البريد الإلكتروني غير صحيح')
  .required('البريد الإلكتروني مطلوب')

export const passwordValidation = yup
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .matches(/[a-z]/, 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل')
  .matches(/[A-Z]/, 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل')
  .matches(/\d/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
  .matches(/[@$!%*?&]/, 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل')
  .required('كلمة المرور مطلوبة')

export const phoneValidation = yup
  .string()
  .matches(/^[0-9+\-\s()]*$/, 'رقم الهاتف غير صحيح')
  .min(10, 'رقم الهاتف قصير جداً')
  .max(20, 'رقم الهاتف طويل جداً')

// Schema for user registration
export const userRegistrationSchema = yup.object({
  firstName: yup
    .string()
    .min(2, 'الاسم الأول يجب أن يكون حرفين على الأقل')
    .max(50, 'الاسم الأول طويل جداً')
    .required('الاسم الأول مطلوب'),
  lastName: yup
    .string()
    .min(2, 'الاسم الأخير يجب أن يكون حرفين على الأقل')
    .max(50, 'الاسم الأخير طويل جداً')
    .required('الاسم الأخير مطلوب'),
  email: emailValidation,
  password: passwordValidation,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'كلمة المرور غير متطابقة')
    .required('تأكيد كلمة المرور مطلوب'),
  phone: phoneValidation.optional(),
  department: yup.string().max(100, 'القسم طويل جداً').optional(),
  jobTitle: yup.string().max(100, 'المسمى الوظيفي طويل جداً').optional()
})

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

// SQL injection prevention (additional layer)
export const isValidInput = (input) => {
  if (typeof input !== 'string') return true
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(--|\*\/|\/\*)/,
    /('|('')|;|%|_)/
  ]
  
  return !sqlPatterns.some(pattern => pattern.test(input))
}
```

### Step 6.2: Security Headers

Create `src/utils/security.js`:
```javascript
// Content Security Policy
export const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "https://apis.google.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "img-src": ["'self'", "data:", "https:"],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "connect-src": ["'self'", process.env.VITE_SUPABASE_URL],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"]
}

// XSS protection
export const sanitizeForXSS = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>\"']/g, (match) => {
      const escapeMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      }
      return escapeMap[match]
    })
}

// CSRF token generation
export const generateCSRFToken = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}
```

---

## 🧪 PHASE 7: TESTING & DEPLOYMENT SETUP

### Step 7.1: Main App Component

Create `src/App.jsx`:
```javascript
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginForm } from './components/auth/LoginForm'
import { UserManagement } from './components/admin/UserManagement'
import { PermissionGuard } from './components/auth/PermissionGuard'
import 'react-toastify/dist/ReactToastify.css'

const queryClient = new QueryClient()

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

// Dashboard Component
const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">لوحة التحكم</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <PermissionGuard permission="users.read">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">👥</span>
                      </div>
                    </div>
                    <div className="mr-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          إدارة المستخدمين
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          عرض وإدارة المستخدمين
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </PermissionGuard>
            
            <PermissionGuard permission="invoices.read">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">💰</span>
                      </div>
                    </div>
                    <div className="mr-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          الفواتير
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          إدارة الفواتير
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </PermissionGuard>
            
            <PermissionGuard permission="reports.read">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">📊</span>
                      </div>
                    </div>
                    <div className="mr-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          التقارير
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          عرض التقارير المالية
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </PermissionGuard>
          </div>
          
          <PermissionGuard permission="users.read">
            <UserManagement />
          </PermissionGuard>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
            
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              rtl={true}
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
```

### Step 7.2: CSS Configuration

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Arabic Font */
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');

/* RTL Support */
[dir="rtl"] {
  text-align: right;
}

[dir="rtl"] .rtl\:text-right {
  text-align: right;
}

[dir="rtl"] .rtl\:text-left {
  text-align: left;
}

/* Custom scrollbar for RTL */
[dir="rtl"] ::-webkit-scrollbar {
  width: 8px;
}

[dir="rtl"] ::-webkit-scrollbar-track {
  background: #f1f1f1;
}

[dir="rtl"] ::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

[dir="rtl"] ::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Loading animations */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Toast notifications RTL */
.Toastify__toast-container--top-right {
  right: 1em;
  left: auto;
}

.Toastify__toast--rtl {
  direction: rtl;
  text-align: right;
}

/* Form inputs RTL */
input[type="text"],
input[type="email"],
input[type="password"],
select,
textarea {
  direction: rtl;
  text-align: right;
}

/* Placeholder text alignment */
input::placeholder,
textarea::placeholder {
  text-align: right;
}

/* Button transitions */
button {
  transition: all 0.2s ease-in-out;
}

/* Focus states */
input:focus,
select:focus,
textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

### Step 7.3: Main Entry Point

Update `src/main.jsx`:
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Step 7.4: Build Configuration

Update `vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          forms: ['react-hook-form', 'yup'],
          ui: ['@headlessui/react', '@heroicons/react']
        }
      }
    }
  },
  preview: {
    port: 3000,
    host: true
  }
})
```

---

## 🚀 FINAL EXECUTION COMMANDS

### Commands to Run (Execute in order):

```bash
# 1. Install all dependencies
npm install

# 2. Start development server
npm run dev

# 3. For production build
npm run build

# 4. Preview production build
npm run preview
```

---

## ✅ VERIFICATION CHECKLIST

After completing all phases, verify:

- [ ] **Login page** displays in Arabic with RTL layout
- [ ] **Social login** buttons work (GitHub/Google)  
- [ ] **User registration** creates profile in database
- [ ] **Permission system** correctly restricts access
- [ ] **Admin dashboard** allows role/permission management
- [ ] **User management** interface works with Arabic labels
- [ ] **Permission matrix** allows granular control
- [ ] **Database functions** execute correctly
- [ ] **RLS policies** enforce security rules
- [ ] **Input validation** prevents malicious data
- [ ] **Audit logging** tracks user actions
- [ ] **Arabic text** displays properly throughout app

---

## 🎯 IMPORTANT NOTES FOR AI AGENT

1. **Execute phases sequentially** - Don't skip steps
2. **Test each component** after implementation
3. **Verify Arabic RTL** support in all UI components
4. **Check database** connections before proceeding
5. **Follow exact file** structure and naming
6. **Use provided code** exactly as written
7. **Configure environment** variables correctly
8. **Test permission system** thoroughly
9. **Verify all imports** are working
10. **Ensure responsive** design works on mobile

This implementation provides a complete, production-ready authentication system with Arabic language support, role-based permissions, and enterprise-grade security features specifically designed for construction company accounting needs.