# Accounting System Application Duplication Guide

## 📖 Reading Guide

**For Better Reading Experience:**
- **Desktop/Laptop**: Use your code editor or markdown viewer
- **Small Screen**: Use the Table of Contents below to jump to sections
- **Download**: Save this file as `app-duplication-guide.md` for offline reading
- **Print**: This guide is printer-friendly - use landscape orientation

## 📋 Table of Contents

1. [⚠️ Critical Warning](#critical-warning-synchronization-reality-check)
2. [🏗️ Project Architecture](#project-architecture-analysis)
3. [🎯 Strategy Options](#duplication-strategy-options)
4. [🚀 Option 2 Implementation (Recommended)](#implementation-guide---option-2-feature-branch---recommended-for-sync)
   - [Prerequisites](#prerequisites)
   - [Repository Setup](#phase-1-repository-setup)
   - [Environment Configuration](#phase-2-environment-configuration)
   - [Database Separation](#phase-3-database-environment-separation)
   - [Application Integration](#phase-4-application-integration)
   - [Development Workflow](#phase-5-development-workflow)
   - [Merge to Production](#phase-6-merge-back-to-production)
   - [Maintenance](#phase-7-maintenance-and-sync)
5. [🔧 Option 1 Implementation (Independent)](#implementation-guide---option-1-complete-clone)
6. [🛠️ Troubleshooting](#troubleshooting-guide)
7. [✅ Best Practices](#best-practices)
8. [📊 Assessment](#realistic-assessment-of-synchronization)

---

## Overview

This guide provides detailed instructions for replicating the existing accounting system application to create a separate development/testing environment without affecting the current production system. The original application is a React 19 + TypeScript + Vite frontend with Supabase backend integration.

## ⚠️ Critical Warning: Synchronization Reality Check

**Important**: While this guide covers various duplication strategies, you must understand the synchronization limitations:

### The Synchronization Problem

**Independent environments (separate Supabase projects) create significant sync challenges:**

1. **Database Schema Divergence**: Over time, schemas will become incompatible
2. **Data Inconsistency**: Development data ≠ Production data
3. **Manual Migration Required**: No automatic sync between separate Supabase projects
4. **API Contract Drift**: Backend changes may break frontend compatibility
5. **Merge Conflicts**: Code changes may conflict when attempting to sync back

### Realistic Sync Scenarios

**✅ What Actually Works:**
- Frontend-only changes (UI improvements, bug fixes)
- New features that don't require backend changes
- Configuration updates
- Small, isolated modifications

**❌ What's Extremely Difficult:**
- Database schema changes
- Breaking API changes
- Major architectural modifications
- Data-dependent features

### Better Alternatives for Sync-Heavy Development

If you need to regularly sync back to production, consider:

1. **Feature Branches** (same repo, same backend)
2. **Environment-based separation** (same Supabase project)
3. **Staging environment** with production data copies
4. **Local development** with production schema

**Recommendation**: Use complete independence only for experimentation and learning. For production features, use feature branches with the same backend.

## Project Architecture Analysis

### Current System Technology Stack
- **Frontend Framework**: React 19.1.1 with TypeScript 5.8.3
- **Build Tool**: Vite 7.1.2 with ESBuild
- **UI Library**: Material-UI (MUI) 7.3.1 with MUI X components
- **State Management**: Zustand 5.0.8 + React Query 5.85.5
- **Form Handling**: React Hook Form 7.62.0 + Yup validation
- **Backend**: Supabase 2.55.0 (PostgreSQL + Authentication)
- **Routing**: React Router DOM 7.8.1
- **Charts**: Recharts 3.1.2 + MUI X Charts
- **Export**: jsPDF 3.0.1 + XLSX 0.18.5

### Application Structure

```
accounting-system/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Common/         # Shared utilities (UnifiedCRUDForm, SearchableSelect)
│   │   ├── auth/           # Authentication components
│   │   ├── admin/          # User/role management
│   │   ├── layout/         # Dashboard layout, sidebar, topbar
│   │   └── security/       # Permission guards
│   ├── contexts/           # React contexts (Auth, Theme, Toast)
│   ├── hooks/             # Custom hooks (permissions, export, idle logout)
│   ├── pages/             # Route-level components
│   ├── services/          # Business logic and API clients
│   ├── store/             # Zustand global state
│   ├── utils/             # Helper functions (PDF, audit, Supabase)
│   └── types/             # TypeScript definitions
├── supabase/              # Database functions and migrations
└── database/migrations/   # SQL migration scripts
```

## Duplication Strategy Options

### Option 1: Complete Independent Clone
- **Use Case**: Learning, experimentation, proof-of-concepts
- **Isolation**: 100% independent from production
- **Database**: Separate Supabase project
- **Deployment**: Different domain/subdomain
- **❌ Sync Capability**: Very difficult - manual migration required
- **Best For**: When you don't plan to merge changes back

### Option 2: Feature Branch Development (Recommended for Sync)
- **Use Case**: Production feature development
- **Isolation**: Code-level isolation via Git branches
- **Database**: Same Supabase project with environment flags
- **Deployment**: Same infrastructure, different builds
- **✅ Sync Capability**: Easy - standard Git merge workflow
- **Best For**: When you need to merge changes back to production

### Option 3: Environment-Based Separation
- **Use Case**: Staging, testing, user acceptance
- **Isolation**: Database-level isolation via RLS and environment context
- **Database**: Same Supabase project, different schemas/data
- **Deployment**: Different build configuration
- **🔶 Sync Capability**: Moderate - requires careful environment management
- **Best For**: Testing production-like scenarios

### Option 4: Local Development with Production Schema
- **Use Case**: Daily development work
- **Isolation**: Local database with production schema
- **Database**: Local PostgreSQL or Supabase local development
- **Deployment**: Local only
- **✅ Sync Capability**: Excellent - same codebase, same schema
- **Best For**: Regular feature development

### Recommended Approach Based on Use Case

| Use Case | Recommended Option | Sync Difficulty | Safety |
|----------|-------------------|-----------------|--------|
| Learning/Experimentation | Option 1 (Independent) | Very Hard | Maximum |
| Feature Development | Option 2 (Feature Branch) | Easy | High |
| Staging/UAT | Option 3 (Environment-based) | Moderate | Medium |
| Daily Development | Option 4 (Local + Production Schema) | Easy | High |

## Implementation Guide - Option 2 (Feature Branch - Recommended for Sync)

### Prerequisites
- Access to existing accounting system repository
- Supabase project admin access
- Node.js 18+ installed
- Git configured

### Phase 1: Repository Setup

#### Step 1.1: Fork or Branch the Repository
```
# Option A: If you have access to original repo
cd /path/to/accounting-system
git checkout main
git pull origin main
git checkout -b development-environment

# Option B: If you need to fork
git clone https://github.com/your-org/accounting-system.git accounting-system-dev
cd accounting-system-dev
git checkout -b main-dev
```

#### Step 1.2: Install Dependencies
```
npm install

# Verify installation
npm run lint
npm run build
```

#### Step 1.3: Test Original Configuration
```
# Make sure original app works
npm run dev
# Visit http://localhost:3000 and verify login works
```

### Phase 2: Environment Configuration

#### Step 2.1: Create Development Environment File
Create `.env.development`:
```
# SAME Supabase project - different environment context
VITE_SUPABASE_URL=https://your-existing-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-existing-anon-key

# Environment identifier for data separation
VITE_APP_ENV=development
VITE_DATABASE_ENVIRONMENT=development

# App branding for development
VITE_APP_NAME="نظام المحاسبة - التطوير"
VITE_APP_DESCRIPTION="بيئة التطوير"

# Development-specific settings
VITE_ENABLE_DEBUG=true
VITE_ENABLE_DEVTOOLS=true
VITE_API_TIMEOUT=30000
VITE_LOG_LEVEL=debug

# Feature flags
VITE_ENABLE_EXPERIMENTAL_FEATURES=true
VITE_ENABLE_MOCK_DATA=true
VITE_ENABLE_AUDIT_LOGGING=false
```

#### Step 2.2: Update Package.json for Development
```
{
  "name": "accounting-system-dev",
  "version": "1.0.0-dev",
  "scripts": {
    "dev": "vite --mode development --port 3001",
    "dev:prod-like": "vite --mode production --port 3002",
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "preview:dev": "vite preview --port 3001",
    "sync:check": "node scripts/check-sync.js",
    "db:migrate": "node scripts/run-migrations.js"
  }
}
```

#### Step 2.3: Environment Detection Utility
```
// src/utils/environment.ts
export type Environment = 'production' | 'development' | 'staging' | 'testing';

export const getCurrentEnvironment = (): Environment => {
  const env = import.meta.env.VITE_APP_ENV as Environment;
  return env || 'production';
};

export const isDevelopment = () => getCurrentEnvironment() === 'development';
export const isProduction = () => getCurrentEnvironment() === 'production';

export const getEnvironmentConfig = () => {
  const env = getCurrentEnvironment();
  
  const configs = {
    production: {
      apiTimeout: 5000,
      enableLogging: false,
      enableDebug: false,
      mockData: false,
    },
    development: {
      apiTimeout: 30000,
      enableLogging: true,
      enableDebug: true,
      mockData: true,
    },
    staging: {
      apiTimeout: 10000,
      enableLogging: true,
      enableDebug: false,
      mockData: false,
    },
    testing: {
      apiTimeout: 15000,
      enableLogging: true,
      enableDebug: true,
      mockData: true,
    },
  };
  
  return configs[env];
};

// Environment context for Supabase
export const setSupabaseEnvironmentContext = async (supabase: any) => {
  const environment = getCurrentEnvironment();
  
  try {
    // Set environment context in database session
    const { error } = await supabase.rpc('set_config', {
      setting_name: 'app.current_environment',
      setting_value: environment,
      is_local: false
    });
    
    if (error) {
      console.warn('Failed to set environment context:', error);
    } else {
      console.log(`Environment context set to: ${environment}`);
    }
  } catch (err) {
    console.warn('Environment context not supported:', err);
  }
  
  return environment;
};
```

### Phase 3: Database Environment Separation

#### Step 3.1: Add Environment Columns (Run in Supabase SQL Editor)
```
-- Add environment column to main tables
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

ALTER TABLE permissions 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_environment ON accounts(environment);
CREATE INDEX IF NOT EXISTS idx_transactions_environment ON transactions(environment);
CREATE INDEX IF NOT EXISTS idx_user_profiles_environment ON user_profiles(environment);
```

#### Step 3.2: Create Environment Isolation Policies
```
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS environment_isolation_accounts ON accounts;
DROP POLICY IF EXISTS environment_isolation_transactions ON transactions;
DROP POLICY IF EXISTS environment_isolation_user_profiles ON user_profiles;

-- Create new environment-aware policies
CREATE POLICY environment_isolation_accounts ON accounts
FOR ALL TO authenticated
USING (
  environment = COALESCE(
    current_setting('app.current_environment', true), 
    'production'
  )
);

CREATE POLICY environment_isolation_transactions ON transactions
FOR ALL TO authenticated
USING (
  environment = COALESCE(
    current_setting('app.current_environment', true), 
    'production'
  )
);

CREATE POLICY environment_isolation_user_profiles ON user_profiles
FOR ALL TO authenticated
USING (
  environment = COALESCE(
    current_setting('app.current_environment', true), 
    'production'
  )
);

-- Enable RLS if not already enabled
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

#### Step 3.3: Create Development Data Set
```
-- Insert development accounts (copy of production structure)
INSERT INTO accounts (name, type, balance, environment) 
SELECT 
  name || ' (DEV)' as name,
  type,
  0.00 as balance,
  'development' as environment
FROM accounts 
WHERE environment = 'production'
ON CONFLICT DO NOTHING;

-- Create development user profile
INSERT INTO user_profiles (
  id, email, first_name, last_name, 
  is_active, environment
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev@example.com',
  'Developer',
  'User',
  true,
  'development'
) ON CONFLICT DO NOTHING;

-- Copy roles for development
INSERT INTO roles (name, name_ar, description, environment)
SELECT 
  name,
  name_ar,
  description || ' (Development)',
  'development'
FROM roles 
WHERE environment = 'production'
ON CONFLICT DO NOTHING;
```

### Phase 4: Application Integration

#### Step 4.1: Update Supabase Client
```
// src/utils/supabase.ts - Update the existing file
import { createClient } from '@supabase/supabase-js'
import { setSupabaseEnvironmentContext } from './environment'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Initialize environment context
setSupabaseEnvironmentContext(supabase).catch(console.warn);

// Enhanced database helpers with environment awareness
export const createRecord = async (table: string, data: any) => {
  const environment = import.meta.env.VITE_DATABASE_ENVIRONMENT || 'production';
  
  const { data: result, error } = await supabase
    .from(table)
    .insert({ ...data, environment })
    .select()
    .single();
    
  if (error) throw error;
  return result;
};

export const updateRecord = async (table: string, id: string, data: any) => {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return result;
};

export const deleteRecord = async (table: string, id: string) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// Environment-aware queries
export const queryRecords = async (table: string, filters: any = {}) => {
  let query = supabase.from(table).select('*');
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};
```

#### Step 4.2: Environment Indicator Component
```
// src/components/Common/EnvironmentBadge.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { getCurrentEnvironment, isDevelopment } from '../../utils/environment';

export const EnvironmentBadge: React.FC = () => {
  const environment = getCurrentEnvironment();
  
  if (environment === 'production') {
    return null; // Don't show badge in production
  }
  
  const getColor = () => {
    switch (environment) {
      case 'development': return 'warning';
      case 'staging': return 'info';
      case 'testing': return 'success';
      default: return 'default';
    }
  };
  
  const getLabel = () => {
    switch (environment) {
      case 'development': return 'تطوير';
      case 'staging': return 'اختبار';
      case 'testing': return 'فحص';
      default: return environment;
    }
  };
  
  return (
    <Chip 
      label={getLabel()}
      color={getColor() as any}
      size="small"
      variant="outlined"
      sx={{ 
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 9999,
        fontWeight: 'bold'
      }}
    />
  );
};
```

#### Step 4.3: Update Main App Component
```
// src/App.tsx - Add environment badge
import { EnvironmentBadge } from './components/Common/EnvironmentBadge';

const App: React.FC = () => {
  
  return (
    <Router>
      <EnvironmentBadge />
      {/* ... rest of your routes ... */}
    </Router>
  );
};
```

### Phase 5: Development Workflow

#### Step 5.1: Development Scripts
Create `scripts/dev-workflow.js`:
```
#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

const commands = {
  start: () => {
    console.log('🚀 Starting development environment...');
    execSync('npm run dev', { stdio: 'inherit' });
  },
  
  sync: () => {
    console.log('🔄 Syncing with main branch...');
    execSync('git fetch origin main', { stdio: 'inherit' });
    execSync('git merge origin/main', { stdio: 'inherit' });
    console.log('✅ Sync complete');
  },
  
  build: () => {
    console.log('🏗️  Building development version...');
    execSync('npm run build:dev', { stdio: 'inherit' });
    console.log('✅ Build complete');
  },
  
  migrate: () => {
    console.log('🗄️  Running database migrations...');
    // Add migration logic here
    console.log('✅ Migrations complete');
  }
};

const command = process.argv[2];
if (commands[command]) {
  commands[command]();
} else {
  console.log('Available commands: start, sync, build, migrate');
}
```

#### Step 5.2: Daily Development Process
```
# 1. Start development
node scripts/dev-workflow.js start

# 2. Make changes and test
# - Edit code
# - Test in browser at http://localhost:3001
# - Verify environment badge shows "تطوير"

# 3. Commit changes
git add .
git commit -m "feat: add new accounting feature"

# 4. Sync with main periodically
node scripts/dev-workflow.js sync

# 5. Build and test
node scripts/dev-workflow.js build
npm run preview:dev
```

### Phase 6: Merge Back to Production

#### Step 6.1: Pre-merge Testing
```
# 1. Test in production-like mode
VITE_APP_ENV=production npm run dev

# 2. Build production version
npm run build

# 3. Run all tests
npm run lint
npm run test  # if you have tests

# 4. Test key functionality
# - Login/logout
# - Create/edit accounts
# - Generate reports
# - Export functionality
```

#### Step 6.2: Merge Process
```
# 1. Ensure clean state
git status
git add .
git commit -m "final: ready for production merge"

# 2. Switch to main and merge
git checkout main
git pull origin main
git merge development-environment

# 3. Apply any database migrations to production
# (Run SQL scripts manually in Supabase production)

# 4. Deploy to production
git push origin main

# 5. Verify production deployment
# Check production URL and verify functionality
```

### Phase 7: Maintenance and Sync

#### Step 7.1: Regular Sync Schedule
```
# Daily sync (recommended)
git checkout development-environment
git fetch origin main
git merge origin/main

# Weekly full sync
git checkout main
git pull origin main
git checkout development-environment
git rebase main  # Use rebase for cleaner history
```

#### Step 7.2: Environment Data Management
```
-- Reset development data when needed
DELETE FROM transactions WHERE environment = 'development';
DELETE FROM accounts WHERE environment = 'development';

-- Refresh development data from production
INSERT INTO accounts (name, type, balance, environment)
SELECT name || ' (DEV)', type, 0.00, 'development'
FROM accounts WHERE environment = 'production';
```

### 🚀 Quick Start Summary for Option 2

**If you're in a hurry, here's the minimal setup:**

```bash
# 1. Create branch
git checkout -b development-environment

# 2. Create .env.development
echo 'VITE_APP_ENV=development' > .env.development
echo 'VITE_DATABASE_ENVIRONMENT=development' >> .env.development
echo 'VITE_SUPABASE_URL=your-existing-url' >> .env.development
echo 'VITE_SUPABASE_ANON_KEY=your-existing-key' >> .env.development

# 3. Add environment column to database (run in Supabase)
# ALTER TABLE accounts ADD COLUMN environment VARCHAR(20) DEFAULT 'production';
# ALTER TABLE transactions ADD COLUMN environment VARCHAR(20) DEFAULT 'production';

# 4. Start development
npm run dev -- --port 3001 --mode development
```

**Result**: You'll have a development environment that:
- ✅ Uses same codebase (easy sync)
- ✅ Separates development data from production
- ✅ Allows easy merge back to main branch
- ✅ Runs on port 3001 while production runs on 3000

## Implementation Guide - Option 1 (Complete Clone)

### Phase 1: Environment Setup

#### Step 1.1: Create New Project Directory
```bash
# Navigate to parent directory
cd /path/to/projects

# Clone the existing project
git clone /path/to/original/accounting-system accounting-system-dev
cd accounting-system-dev

# Initialize new git repository (optional)
rm -rf .git
git init
git add .
git commit -m "Initial clone of accounting system"
```

#### Step 1.2: Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Verify installation
npm run dev
```

#### Step 1.3: Create New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project: `accounting-system-dev`
3. Note the project URL and anon key
4. Set up database password

### Phase 2: Database Migration

#### Step 2.1: Export Current Database Schema
```
-- Connect to original Supabase project and export schema
-- Run in original Supabase SQL Editor

-- Get all tables structure
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Get all functions
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Get all RLS policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies;
```

#### Step 2.2: Set Up New Database Schema
Execute migration files in order:
```bash
# In new Supabase SQL Editor, run these files in sequence:
# 1. database-schema.sql (base tables)
# 2. src/database/migrations/*.sql (in numerical order)
# 3. supabase/*.sql (RLS and functions)
```

#### Step 2.3: Migrate Essential Data
```
-- Copy chart of accounts (modify as needed)
INSERT INTO accounts (name, type, balance) VALUES
  ('النقدية', 'asset', 0.00),
  ('البنك', 'asset', 0.00),
  ('العملاء', 'asset', 0.00),
  ('المخزون', 'asset', 0.00),
  ('الموردون', 'liability', 0.00),
  ('رأس المال', 'equity', 0.00),
  ('الإيرادات', 'revenue', 0.00),
  ('المصروفات', 'expense', 0.00);

-- Create default roles
INSERT INTO roles (name, name_ar, description) VALUES
  ('super_admin', 'مدير عام', 'Full system access'),
  ('admin', 'مدير', 'Administrative access'),
  ('accountant', 'محاسب', 'Accounting operations'),
  ('viewer', 'مراقب', 'Read-only access');

-- Set up permissions (copy from original system)
```

### Phase 3: Configuration Update

#### Step 3.1: Environment Variables
Create `.env.local` file:
```
# New Supabase Project Configuration
VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key

# App Configuration (modify as needed)
VITE_APP_NAME=نظام المحاسبة - التطوير
VITE_APP_DESCRIPTION=نسخة التطوير من نظام المحاسبة

# Feature Flags
VITE_ENABLE_MFA=false
VITE_ENABLE_AUDIT_LOGGING=true
VITE_ENABLE_SOCIAL_LOGIN=false

# Development Settings
VITE_SESSION_TIMEOUT=7200000
VITE_MAX_LOGIN_ATTEMPTS=5
```

#### Step 3.2: Update Package.json
```
{
  "name": "accounting-system-dev",
  "version": "0.0.0-dev",
  "private": true,
  "scripts": {
    "dev": "vite --port 3001",
    "build": "tsc -b && vite build",
    "build:dev": "NODE_ENV=development vite build",
    "preview": "vite preview --port 3001",
    "lint": "eslint ."
  }
}
```

#### Step 3.3: Update Vite Configuration
```
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
  },
  server: {
    port: 3001,  // Different port from original
    open: true,
  },
  preview: {
    port: 3001,
    open: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version + '-dev'),
  },
})
```

### Phase 4: Code Modifications

#### Step 4.1: Update Application Branding
```
// src/constants/app.ts
export const APP_CONFIG = {
  name: 'نظام المحاسبة - التطوير',
  version: '1.0.0-dev',
  environment: 'development',
  features: {
    audit: true,
    mfa: false,
    socialLogin: false,
  }
};
```

#### Step 4.2: Add Development Indicators
```
// src/components/layout/TopBar.tsx
// Add development badge
{process.env.NODE_ENV === 'development' && (
  <Chip 
    label="DEV" 
    color="warning" 
    size="small" 
    sx={{ mr: 2 }}
  />
)}
```

#### Step 4.3: Enhanced Error Handling
```
// src/utils/errorHandler.ts
export const handleError = (error: any, context?: string) => {
  console.error(`[DEV] ${context}:`, error);
  
  // Development-specific error reporting
  if (process.env.NODE_ENV === 'development') {
    // Log to console with stack trace
    console.trace(error);
  }
  
  // Original error handling logic...
};
```

### Phase 5: Database Testing & Validation

#### Step 5.1: Data Integrity Checks
```
-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public';

-- Verify functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Test sample data
SELECT * FROM accounts LIMIT 5;
SELECT * FROM roles;
```

#### Step 5.2: Authentication Testing
```
// Create test user via Supabase Auth dashboard
// Then verify in app:
const testLogin = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  });
  console.log('Login test:', { data, error });
};
```

### Phase 6: Development Workflow

#### Step 6.1: Development Scripts
```
# Start development server
npm run dev

# Build for testing
npm run build:dev

# Run linting
npm run lint

# Test database connectivity
npm run test:db
```

#### Step 6.2: Hot Module Replacement Configuration
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      overlay: true,
    },
  },
})
```

## Testing Strategy

### Component Testing
```
// src/components/__tests__/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import { LoginForm } from '../auth/LoginForm';

test('renders login form', () => {
  render(<LoginForm />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});
```

### Integration Testing
```
// src/utils/__tests__/supabase.test.ts
import { supabase } from '../supabase';

test('supabase connection', async () => {
  const { data, error } = await supabase.from('accounts').select('count');
  expect(error).toBeNull();
});
```

### User Flow Testing
1. **Authentication Flow**: Login → Dashboard → Navigation
2. **CRUD Operations**: Create account → Edit → Delete
3. **Permissions**: Role-based access control
4. **Data Export**: PDF/Excel generation

## Security Considerations

### Environment Isolation
- Separate Supabase projects prevent data leakage
- Different authentication realms
- Isolated user management
- Independent RLS policies

### Development Safety
```
// src/utils/devSafety.ts
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost';
};

export const requireDevelopment = (action: string) => {
  if (!isDevelopment()) {
    throw new Error(`${action} is only allowed in development`);
  }
};
```

### Data Sanitization
```
// Remove production data references
const sanitizeForDev = (data: any) => {
  if (isDevelopment()) {
    // Replace real names with test data
    return {
      ...data,
      email: data.email?.includes('@real-domain.com') 
        ? 'test@example.com' 
        : data.email
    };
  }
  return data;
};
```

## Deployment Options

### Option A: Local Development Only
```
# Run on different port
npm run dev -- --port 3001
```

### Option B: Staging Server
```
# Build for staging
npm run build:dev

# Deploy to staging server
rsync -av dist/ user@staging-server:/var/www/accounting-dev/
```

### Option C: Docker Development
```
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3001

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]
```

## Synchronization Challenges & Realistic Approaches

### ⚠️ Important Limitations of Independent Environments

While complete independence provides maximum safety, it introduces significant synchronization challenges:

#### Backend Synchronization Issues
1. **Schema Drift**: Database schemas will diverge over time
2. **Data Inconsistency**: Test data vs production data differences
3. **RLS Policy Conflicts**: Security rules may differ
4. **Function Versioning**: Stored procedures and triggers may be out of sync
5. **Migration Conflicts**: Different migration histories

#### Frontend Synchronization Challenges
1. **API Contract Changes**: Backend changes may break frontend
2. **Environment-Specific Code**: Development-only features
3. **Configuration Drift**: Different environment variables
4. **Dependency Versions**: Package updates in one environment

### Realistic Synchronization Strategies

#### Strategy 1: One-Way Sync (Production → Development)
**Best for**: Feature development and testing
**Limitations**: Cannot easily merge back to production

```
# Frontend sync
git remote add upstream /path/to/original/accounting-system
git fetch upstream main
git merge upstream/main  # Manual conflict resolution required

# Backend sync (manual process)
# 1. Export production schema
# 2. Compare with development
# 3. Apply differences manually
```

#### Strategy 2: Feature Branch Approach (Better for Sync)
**Best for**: Specific feature development with intent to merge back
**Process**:
```
# Create feature branch from main
git checkout -b feature/new-accounting-module

# Develop with same backend (different database)
# Use environment flags to separate data

# When ready, merge back to main
git checkout main
git merge feature/new-accounting-module
```

#### Strategy 3: Database Migration-Based Sync
**Best for**: Schema changes that need to go back to production

```
-- Create migration files for all changes
-- migration_001_add_new_table.sql
CREATE TABLE new_feature_table (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Apply same migration to both environments
```

### Recommended Hybrid Approach

For your accounting system, I recommend a **Modified Feature Branch Strategy**:

#### Setup:
1. **Shared Codebase**: Use Git branches, not separate repos
2. **Environment-Based Backend**: Same Supabase project with environment separation
3. **Configuration-Driven**: Use environment variables for differences

```
// src/config/environment.ts
export const ENV_CONFIG = {
  production: {
    supabaseUrl: 'https://prod-project.supabase.co',
    database: 'production',
    features: { audit: true, mfa: true }
  },
  development: {
    supabaseUrl: 'https://dev-project.supabase.co', 
    database: 'development',
    features: { audit: true, mfa: false }
  },
  testing: {
    supabaseUrl: 'https://prod-project.supabase.co',
    database: 'testing',  // Same project, different schema
    features: { audit: false, mfa: false }
  }
};
```

#### Database Schema with Environment Separation
```
-- Single Supabase project with environment schemas
CREATE SCHEMA IF NOT EXISTS production;
CREATE SCHEMA IF NOT EXISTS development;
CREATE SCHEMA IF NOT EXISTS testing;

-- Use RLS with environment context
CREATE POLICY environment_isolation ON accounts
FOR ALL TO authenticated
USING (environment = current_setting('app.environment'));
```

### Practical Sync Workflow

#### Daily Development Workflow
```
# 1. Start with latest main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/invoice-improvements

# 3. Set development environment
export VITE_APP_ENV=development
npm run dev

# 4. Develop and test
# 5. Create migration files for any schema changes

# 6. Test in staging environment
export VITE_APP_ENV=testing
npm run build && npm run preview

# 7. Merge back when ready
git checkout main
git merge feature/invoice-improvements
```

#### Database Change Management
```
-- Always create migration files
-- migrations/2024_01_15_add_invoice_status.sql
ALTER TABLE invoices ADD COLUMN status VARCHAR(50) DEFAULT 'draft';

-- Apply to development first
\i migrations/2024_01_15_add_invoice_status.sql

-- Test thoroughly, then apply to production
```

### Sync Automation Tools

#### Database Schema Sync Script
```
#!/bin/bash
# sync-database.sh

echo "Comparing database schemas..."

# Export both schemas
pg_dump --schema-only $PROD_DB > prod_schema.sql
pg_dump --schema-only $DEV_DB > dev_schema.sql

# Compare
diff prod_schema.sql dev_schema.sql > schema_diff.txt

if [ -s schema_diff.txt ]; then
  echo "Schema differences found:"
  cat schema_diff.txt
  echo "Manual review required."
else
  echo "Schemas are in sync."
fi
```

#### Code Sync Checker
```
// scripts/check-sync.ts
import { execSync } from 'child_process';

const checkSync = () => {
  try {
    // Check for uncommitted changes
    const status = execSync('git status --porcelain').toString();
    if (status) {
      console.warn('Uncommitted changes detected');
    }

    // Check if behind main
    const behind = execSync('git rev-list --count main..HEAD').toString();
    if (parseInt(behind) > 0) {
      console.warn(`Branch is ${behind} commits behind main`);
    }

    // Check for merge conflicts
    execSync('git merge-tree $(git merge-base main HEAD) main HEAD');
    console.log('✅ Ready for sync');
  } catch (error) {
    console.error('❌ Sync conflicts detected:', error.message);
  }
};
```

### Configuration Management
```
// src/config/environment.ts
export const getConfig = () => {
  const base = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const envOverrides = {
    development: {
      debug: true,
      apiTimeout: 10000,
      enableMocking: true,
    },
    production: {
      debug: false,
      apiTimeout: 5000,
      enableMocking: false,
    },
  };

  return {
    ...base,
    ...envOverrides[process.env.NODE_ENV as keyof typeof envOverrides],
  };
};
```

## Troubleshooting Guide

### Common Issues

#### Database Connection Errors
```
// Debug Supabase connection
const debugConnection = async () => {
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
  
  try {
    const { data, error } = await supabase.from('accounts').select('count');
    console.log('Connection test:', { data, error });
  } catch (e) {
    console.error('Connection failed:', e);
  }
};
```

#### Authentication Issues
```
// Check authentication state
const debugAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Current session:', session);
  
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user);
};
```

#### Permission Problems
```
// Debug RLS policies
const debugRLS = async () => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);
  
  console.log('RLS test:', { data, error });
};
```

### Development Tools
- **React DevTools**: Component debugging
- **Redux DevTools**: State management inspection
- **Supabase Dashboard**: Database management
- **Network Tab**: API call monitoring

## Best Practices

### Code Organization
1. Keep development-specific code in separate files
2. Use environment variables for configuration
3. Implement feature flags for experimental features
4. Maintain clear separation between environments

### Database Management
1. Always backup before schema changes
2. Use migrations for database updates
3. Test RLS policies thoroughly
4. Monitor query performance

### Version Control
1. Use descriptive commit messages
2. Create feature branches for major changes
3. Tag releases appropriately
4. Document breaking changes

## Conclusion

This duplication strategy provides a complete isolated development environment while maintaining the ability to sync with the original system. The approach ensures data safety, enables parallel development, and supports various testing scenarios without impacting the production system.

## Realistic Assessment of Synchronization

### ✅ What Works Well for Sync:
- **Frontend Code Changes**: Easy to merge via Git
- **Configuration Updates**: Environment-based settings
- **New Features**: Additive changes with feature flags
- **Bug Fixes**: Small, isolated changes

### ⚠️ Synchronization Challenges:
- **Database Schema Changes**: Manual migration required
- **Data Dependencies**: Production data vs test data
- **Environment-Specific Code**: Requires careful management
- **Breaking Changes**: May require coordination

### 🔄 Recommended Sync Strategy:

1. **Use Feature Branches**: Instead of completely separate repos
2. **Environment Variables**: For configuration differences
3. **Migration Files**: For all database changes
4. **Regular Syncs**: Daily pulls from main branch
5. **Staging Environment**: Test merges before production

### Key Trade-offs:
- **Complete Independence**: Maximum safety, difficult sync
- **Shared Codebase + Environment Separation**: Easier sync, some risk
- **Feature Branches**: Best balance of safety and sync capability

**Recommendation**: Use the Feature Branch approach with environment-based backend separation for your accounting system. This provides good isolation while maintaining practical synchronization capabilities.

---

# 🚀 STEP-BY-STEP IMPLEMENTATION GUIDE (Copy & Paste Ready)

## How This Guide Works

I provide structured implementation similar to Warp AI:
- 📋 **Step-by-step instructions**
- 💻 **Copy-paste code blocks**
- 🗄️ **SQL commands with copy buttons (conceptually)**
- ✅ **Verification commands**
- 🔍 **Troubleshooting for each step**

**Follow each step in order - don't skip ahead!**

---

## Step 1: Repository Setup

### 1.1 Create Development Branch

**Copy and paste this in your terminal:**

```bash
# Navigate to your project
cd C:\Users\melre\OneDrive\AI\04ACAPPV4\accounting-system

# Create and switch to development branch
git checkout -b development-environment

# Verify you're on the new branch
git branch --show-current
```

**Expected Output:**
```
development-environment
```

### 1.2 Backup Current State

**Copy and paste this:**

```bash
# Create backup of current state
git add .
git commit -m "backup: current state before development setup"

# Verify commit
git log --oneline -1
```

**Expected Output:**
```
[hash] backup: current state before development setup
```

---

## Step 2: Environment Configuration

### 2.1 Create Development Environment File

**Create file:** `.env.development`

**Copy this content:**

```env
# Development Environment Configuration
VITE_SUPABASE_URL=https://bgxknceshxxifwytalex.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJneGtuY2VzaHh4aWZ3eXRhbGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MTAyNTEsImV4cCI6MjA1MDk4NjI1MX0.gEHIGwQ7h3roZoB0IUe-68DWMcEVSjfFBZWG7bFJGEg

# Environment Settings
VITE_APP_ENVIRONMENT=development
VITE_DATABASE_ENVIRONMENT=development

# App Branding
VITE_APP_NAME="نظام المحاسبة - التطوير"
VITE_APP_DESCRIPTION="بيئة التطوير"

# Development Features
VITE_ENABLE_DEBUG=true
VITE_ENABLE_DEVTOOLS=true
VITE_ENABLE_EXPERIMENTAL_FEATURES=true
VITE_ENABLE_MOCK_DATA=true
VITE_ENABLE_AUDIT_LOGGING=false

# Performance Settings
VITE_API_TIMEOUT=30000
VITE_LOG_LEVEL=debug
```

### 2.2 Update Package.json Scripts

**Find this section in your `package.json`:**

```json
"scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
},
```

**Replace with this:**

```json
"scripts": {
    "dev": "vite",
    "dev:development": "vite --mode development --port 3001",
    "dev:staging": "vite --mode staging --port 3002", 
    "dev:testing": "vite --mode testing --port 3003",
    "build": "tsc -b && vite build",
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "lint": "eslint .",
    "preview": "vite preview",
    "preview:dev": "vite preview --port 3001"
},
```

### 2.3 Verify Environment Setup

**Test the new development server:**

```bash
# Start development server on port 3001
npm run dev:development
```

**Expected Output:**
```
  VITE v7.1.2  ready in XXX ms

  ➜  Local:   http://localhost:3001/
  ➜  Network: use --host to expose
```

**Stop the server (Ctrl+C) before continuing.**

---

## Step 3: Database Environment Separation

### 3.1 Add Environment Columns

**Go to Supabase SQL Editor and paste this:**

```sql
-- Step 3.1: Add environment columns to main tables
-- Copy and paste this entire block

-- Add environment column to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

-- Add environment column to transactions table  
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

-- Add environment column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

-- Add environment column to roles table
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

-- Add environment column to permissions table
ALTER TABLE permissions 
ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_accounts_environment ON accounts(environment);
CREATE INDEX IF NOT EXISTS idx_transactions_environment ON transactions(environment);
CREATE INDEX IF NOT EXISTS idx_user_profiles_environment ON user_profiles(environment);
CREATE INDEX IF NOT EXISTS idx_roles_environment ON roles(environment);
CREATE INDEX IF NOT EXISTS idx_permissions_environment ON permissions(environment);

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name IN ('accounts', 'transactions', 'user_profiles', 'roles', 'permissions')
AND column_name = 'environment'
ORDER BY table_name;
```

**Expected Output:**
```
column_name | data_type         | column_default
environment | character varying | 'production'::character varying
environment | character varying | 'production'::character varying
environment | character varying | 'production'::character varying
environment | character varying | 'production'::character varying
environment | character varying | 'production'::character varying
```

### 3.2 Create Environment Helper Function

**Paste this in Supabase SQL Editor:**

```sql
-- Step 3.2: Create environment context function
-- Copy and paste this entire block

-- Create function to set environment context
CREATE OR REPLACE FUNCTION set_environment_context(env_name text)
RETURNS text AS $$
BEGIN
  -- Set the environment in the session
  PERFORM set_config('app.current_environment', env_name, false);
  RETURN env_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current environment
CREATE OR REPLACE FUNCTION get_current_environment()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_environment', true), 
    'production'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the functions
SELECT set_environment_context('development');
SELECT get_current_environment();
```

**Expected Output:**
```
set_environment_context: development
get_current_environment: development
```

### 3.3 Create Environment Isolation Policies

**Paste this in Supabase SQL Editor:**

```sql
-- Step 3.3: Create RLS policies for environment isolation
-- Copy and paste this entire block

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS environment_isolation_accounts ON accounts;
DROP POLICY IF EXISTS environment_isolation_transactions ON transactions;
DROP POLICY IF EXISTS environment_isolation_user_profiles ON user_profiles;
DROP POLICY IF EXISTS environment_isolation_roles ON roles;
DROP POLICY IF EXISTS environment_isolation_permissions ON permissions;

-- Create environment isolation policy for accounts
CREATE POLICY environment_isolation_accounts ON accounts
FOR ALL TO authenticated
USING (
  environment = get_current_environment()
);

-- Create environment isolation policy for transactions
CREATE POLICY environment_isolation_transactions ON transactions
FOR ALL TO authenticated
USING (
  environment = get_current_environment()
);

-- Create environment isolation policy for user_profiles
CREATE POLICY environment_isolation_user_profiles ON user_profiles
FOR ALL TO authenticated
USING (
  environment = get_current_environment()
);

-- Create environment isolation policy for roles
CREATE POLICY environment_isolation_roles ON roles
FOR ALL TO authenticated
USING (
  environment = get_current_environment()
);

-- Create environment isolation policy for permissions
CREATE POLICY environment_isolation_permissions ON permissions
FOR ALL TO authenticated
USING (
  environment = get_current_environment()
);

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE policyname LIKE 'environment_isolation_%'
ORDER BY tablename;
```

**Expected Output:**
```
schemaname | tablename     | policyname                           | cmd
public     | accounts      | environment_isolation_accounts       | ALL
public     | permissions   | environment_isolation_permissions    | ALL
public     | roles         | environment_isolation_roles          | ALL
public     | transactions  | environment_isolation_transactions   | ALL
public     | user_profiles | environment_isolation_user_profiles  | ALL
```

### 3.4 Create Development Data Set

**Paste this in Supabase SQL Editor:**

```sql
-- Step 3.4: Create development data
-- Copy and paste this entire block

-- First, set environment to development for this session
SELECT set_environment_context('development');

-- Insert development accounts (copy structure from production)
INSERT INTO accounts (name, type, balance, environment, created_at) 
SELECT 
  name || ' (DEV)' as name,
  type,
  0.00 as balance,
  'development' as environment,
  NOW() as created_at
FROM accounts 
WHERE environment = 'production'
ON CONFLICT DO NOTHING;

-- Create development roles
INSERT INTO roles (name, name_ar, description, environment, created_at)
SELECT 
  name,
  name_ar,
  description || ' (Development)' as description,
  'development' as environment,
  NOW() as created_at
FROM roles 
WHERE environment = 'production'
ON CONFLICT DO NOTHING;

-- Create development permissions
INSERT INTO permissions (name, description, environment, created_at)
SELECT 
  name,
  description || ' (Development)' as description,
  'development' as environment,
  NOW() as created_at
FROM permissions 
WHERE environment = 'production'
ON CONFLICT DO NOTHING;

-- Verify development data was created
SELECT 'accounts' as table_name, COUNT(*) as count FROM accounts WHERE environment = 'development'
UNION ALL
SELECT 'roles' as table_name, COUNT(*) as count FROM roles WHERE environment = 'development'
UNION ALL
SELECT 'permissions' as table_name, COUNT(*) as count FROM permissions WHERE environment = 'development';
```

**Expected Output:**
```
table_name  | count
accounts    | [number of accounts copied]
roles       | [number of roles copied]
permissions | [number of permissions copied]
```

---

## Step 4: Application Integration

### 4.1 Create Environment Configuration File

**Create file:** `src/config/environments.ts`

**Copy this content:**

```typescript
// src/config/environments.ts
// Complete environment configuration system

export type EnvironmentType = 'production' | 'development' | 'staging' | 'testing';

export interface DatabaseConfig {
  context: string;
  enableMockData: boolean;
  enableDebugQueries: boolean;
  queryTimeout: number;
  maxConnections: number;
}

export interface FeatureFlags {
  enableAuditLogging: boolean;
  enableDebugPanel: boolean;
  enableExperimentalFeatures: boolean;
  enablePerformanceMonitoring: boolean;
  enableDataValidation: boolean;
  enableErrorReporting: boolean;
}

export interface UIConfig {
  showEnvironmentBadge: boolean;
  enableDevTools: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  theme: 'light' | 'dark' | 'auto';
  enableAnimations: boolean;
  enableTooltips: boolean;
}

export interface APIConfig {
  timeout: number;
  retries: number;
  enableRequestLogging: boolean;
  enableResponseCaching: boolean;
  rateLimitBypass: boolean;
}

export interface SecurityConfig {
  enableCSRFProtection: boolean;
  enableXSSProtection: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableTwoFactor: boolean;
}

export interface EnvironmentConfig {
  name: EnvironmentType;
  displayName: string;
  displayNameAr: string;
  description: string;
  color: string;
  database: DatabaseConfig;
  features: FeatureFlags;
  ui: UIConfig;
  api: APIConfig;
  security: SecurityConfig;
}

const environments: Record<EnvironmentType, EnvironmentConfig> = {
  production: {
    name: 'production',
    displayName: 'Accounting System',
    displayNameAr: 'نظام المحاسبة',
    description: 'Production environment',
    color: '#dc2626',
    database: {
      context: 'production',
      enableMockData: false,
      enableDebugQueries: false,
      queryTimeout: 5000,
      maxConnections: 20,
    },
    features: {
      enableAuditLogging: true,
      enableDebugPanel: false,
      enableExperimentalFeatures: false,
      enablePerformanceMonitoring: true,
      enableDataValidation: true,
      enableErrorReporting: true,
    },
    ui: {
      showEnvironmentBadge: false,
      enableDevTools: false,
      logLevel: 'error',
      theme: 'auto',
      enableAnimations: true,
      enableTooltips: true,
    },
    api: {
      timeout: 5000,
      retries: 3,
      enableRequestLogging: false,
      enableResponseCaching: true,
      rateLimitBypass: false,
    },
    security: {
      enableCSRFProtection: true,
      enableXSSProtection: true,
      sessionTimeout: 3600000, // 1 hour
      maxLoginAttempts: 3,
      enableTwoFactor: true,
    },
  },
  development: {
    name: 'development',
    displayName: 'Accounting System - Development', 
    displayNameAr: 'نظام المحاسبة - التطوير',
    description: 'Development environment',
    color: '#f59e0b',
    database: {
      context: 'development',
      enableMockData: true,
      enableDebugQueries: true,
      queryTimeout: 30000,
      maxConnections: 5,
    },
    features: {
      enableAuditLogging: false,
      enableDebugPanel: true,
      enableExperimentalFeatures: true,
      enablePerformanceMonitoring: false,
      enableDataValidation: true,
      enableErrorReporting: false,
    },
    ui: {
      showEnvironmentBadge: true,
      enableDevTools: true,
      logLevel: 'debug',
      theme: 'light',
      enableAnimations: false,
      enableTooltips: true,
    },
    api: {
      timeout: 30000,
      retries: 1,
      enableRequestLogging: true,
      enableResponseCaching: false,
      rateLimitBypass: true,
    },
    security: {
      enableCSRFProtection: false,
      enableXSSProtection: false,
      sessionTimeout: 7200000, // 2 hours
      maxLoginAttempts: 10,
      enableTwoFactor: false,
    },
  },
  staging: {
    name: 'staging',
    displayName: 'Accounting System - Staging',
    displayNameAr: 'نظام المحاسبة - الاختبار',
    description: 'Staging environment',
    color: '#3b82f6',
    database: {
      context: 'staging',
      enableMockData: false,
      enableDebugQueries: true,
      queryTimeout: 10000,
      maxConnections: 10,
    },
    features: {
      enableAuditLogging: true,
      enableDebugPanel: true,
      enableExperimentalFeatures: false,
      enablePerformanceMonitoring: true,
      enableDataValidation: true,
      enableErrorReporting: true,
    },
    ui: {
      showEnvironmentBadge: true,
      enableDevTools: true,
      logLevel: 'info',
      theme: 'auto',
      enableAnimations: true,
      enableTooltips: true,
    },
    api: {
      timeout: 10000,
      retries: 2,
      enableRequestLogging: true,
      enableResponseCaching: true,
      rateLimitBypass: false,
    },
    security: {
      enableCSRFProtection: true,
      enableXSSProtection: true,
      sessionTimeout: 3600000, // 1 hour
      maxLoginAttempts: 5,
      enableTwoFactor: false,
    },
  },
  testing: {
    name: 'testing',
    displayName: 'Accounting System - Testing',
    displayNameAr: 'نظام المحاسبة - الفحص',
    description: 'Testing environment',
    color: '#10b981',
    database: {
      context: 'testing',
      enableMockData: true,
      enableDebugQueries: true,
      queryTimeout: 15000,
      maxConnections: 5,
    },
    features: {
      enableAuditLogging: false,
      enableDebugPanel: true,
      enableExperimentalFeatures: true,
      enablePerformanceMonitoring: false,
      enableDataValidation: false,
      enableErrorReporting: false,
    },
    ui: {
      showEnvironmentBadge: true,
      enableDevTools: true,
      logLevel: 'debug',
      theme: 'light',
      enableAnimations: false,
      enableTooltips: false,
    },
    api: {
      timeout: 15000,
      retries: 1,
      enableRequestLogging: true,
      enableResponseCaching: false,
      rateLimitBypass: true,
    },
    security: {
      enableCSRFProtection: false,
      enableXSSProtection: false,
      sessionTimeout: 14400000, // 4 hours
      maxLoginAttempts: 100,
      enableTwoFactor: false,
    },
  },
};

// Environment utilities
export const getCurrentEnvironment = (): EnvironmentType => {
  const env = import.meta.env.VITE_APP_ENVIRONMENT as EnvironmentType;
  return env && env in environments ? env : 'production';
};

export const getEnvironmentConfig = (): EnvironmentConfig => {
  return environments[getCurrentEnvironment()];
};

export const isEnvironment = (env: EnvironmentType): boolean => {
  return getCurrentEnvironment() === env;
};

export const isDevelopment = () => isEnvironment('development');
export const isProduction = () => isEnvironment('production');
export const isStaging = () => isEnvironment('staging');
export const isTesting = () => isEnvironment('testing');

export const getEnvironmentColor = (): string => {
  return getEnvironmentConfig().color;
};

export const shouldShowFeature = (feature: keyof FeatureFlags): boolean => {
  return getEnvironmentConfig().features[feature];
};

export const getAPIConfig = (): APIConfig => {
  return getEnvironmentConfig().api;
};

export const getSecurityConfig = (): SecurityConfig => {
  return getEnvironmentConfig().security;
};

// Supabase environment context setter
export const setSupabaseEnvironmentContext = async (supabase: any) => {
  const environment = getCurrentEnvironment();
  
  try {
    const { error } = await supabase.rpc('set_environment_context', {
      env_name: environment
    });
    
    if (error) {
      console.warn('Failed to set environment context:', error);
    } else {
      console.log(`✅ Environment context set to: ${environment}`);
    }
  } catch (err) {
    console.warn('Environment context function not available:', err);
  }
  
  return environment;
};
```

### 4.2 Update Supabase Client

**Update file:** `src/utils/supabase.ts`

**Find the existing content and replace with this:**

```typescript
// src/utils/supabase.ts
// Enhanced Supabase client with environment awareness

import { createClient } from '@supabase/supabase-js'
import { setSupabaseEnvironmentContext, getCurrentEnvironment } from '../config/environments'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Initialize environment context
setSupabaseEnvironmentContext(supabase).catch(console.warn);

// Enhanced database helpers with environment awareness
export const createRecord = async (table: string, data: any) => {
  const environment = import.meta.env.VITE_DATABASE_ENVIRONMENT || getCurrentEnvironment();
  
  const { data: result, error } = await supabase
    .from(table)
    .insert({ ...data, environment })
    .select()
    .single();
    
  if (error) throw error;
  return result;
};

export const updateRecord = async (table: string, id: string, data: any) => {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return result;
};

export const deleteRecord = async (table: string, id: string) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// Environment-aware queries
export const queryRecords = async (table: string, filters: any = {}) => {
  let query = supabase.from(table).select('*');
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Database interfaces (keep existing ones)
export interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  environment?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  account_id: string;
  environment?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  environment?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  created_at?: string;
  updated_at?: string;
}
```

### 4.3 Create Environment Badge Component

**Create file:** `src/components/Common/EnvironmentBadge.tsx`

**Copy this content:**

```typescript
// src/components/Common/EnvironmentBadge.tsx
// Visual indicator for current environment

import React from 'react';
import { Chip } from '@mui/material';
import { getCurrentEnvironment, getEnvironmentConfig } from '../../config/environments';

export const EnvironmentBadge: React.FC = () => {
  const environment = getCurrentEnvironment();
  const config = getEnvironmentConfig();
  
  // Don't show badge in production
  if (environment === 'production') {
    return null;
  }
  
  const getColor = () => {
    switch (environment) {
      case 'development': return 'warning';
      case 'staging': return 'info';
      case 'testing': return 'success';
      default: return 'default';
    }
  };
  
  return (
    <Chip 
      label={config.displayNameAr.split(' - ')[1] || environment}
      color={getColor() as any}
      size="small"
      variant="outlined"
      sx={{ 
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 9999,
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(4px)'
      }}
    />
  );
};

export default EnvironmentBadge;
```

### 4.4 Update Main App Component

**Update file:** `src/App.tsx`

**Find the imports section and add:**

```typescript
// Add this import at the top
import EnvironmentBadge from './components/Common/EnvironmentBadge';
```

**Find the main return statement and add the badge:**

```typescript
// Add EnvironmentBadge as the first component in your Router
return (
  <Router>
    <EnvironmentBadge />
    {/* ... rest of your existing components ... */}
  </Router>
);
```

### 4.5 Verify Application Integration

**Test the development environment:**

```bash
# Start development server
npm run dev:development
```

**Open browser to:** `http://localhost:3001`

**Expected Results:**
- ✅ App loads without errors
- ✅ Environment badge shows "التطوير" in top-right corner
- ✅ Console shows: "✅ Environment context set to: development"
- ✅ Development data appears (accounts with "(DEV)" suffix)

---

## Step 5: Testing and Verification

### 5.1 Database Context Verification

**Paste this in Supabase SQL Editor:**

```sql
-- Step 5.1: Verify environment isolation works
-- Copy and paste this entire block

-- Test production context
SELECT set_environment_context('production');
SELECT 'Production Accounts:' as label, COUNT(*) as count FROM accounts;

-- Test development context  
SELECT set_environment_context('development');
SELECT 'Development Accounts:' as label, COUNT(*) as count FROM accounts;

-- Verify current environment function
SELECT get_current_environment() as current_env;

-- Test environment switching
SELECT set_environment_context('production');
SELECT * FROM accounts LIMIT 3;

SELECT set_environment_context('development');
SELECT * FROM accounts LIMIT 3;
```

**Expected Output:**
```
label                  | count
Production Accounts:   | [original count]
Development Accounts:  | [copied count]

current_env: development

[Production accounts listed]
[Development accounts with (DEV) suffix listed]
```

### 5.2 Frontend Environment Testing

**Open browser console on `http://localhost:3001` and paste:**

```javascript
// Test environment detection
console.log('Environment:', import.meta.env.VITE_APP_ENVIRONMENT);
console.log('Database Environment:', import.meta.env.VITE_DATABASE_ENVIRONMENT);
console.log('Debug Mode:', import.meta.env.VITE_ENABLE_DEBUG);

// Test Supabase connection
import { supabase } from './src/utils/supabase';
supabase.from('accounts').select('count').then(result => {
  console.log('Supabase test:', result);
});
```

**Expected Output:**
```
Environment: development
Database Environment: development
Debug Mode: true
Supabase test: {data: [...], error: null}
```

### 5.3 Component Integration Testing

**Check these elements in your browser:**

1. **Environment Badge**: Should show "التطوير" in top-right corner
2. **Console Messages**: Should see "✅ Environment context set to: development"
3. **Development Data**: Accounts should show "(DEV)" suffix
4. **Debug Features**: Console should show detailed logs

### 5.4 Multi-Environment Testing

**Test staging environment:**

```bash
# Stop current server (Ctrl+C)
# Start staging environment
npm run dev:staging
```

**Expected Results:**
- Runs on port 3002
- Badge shows "الاختبار" (staging in Arabic)
- Different environment context

---

## Step 6: Production Merge Preparation

### 6.1 Pre-Merge Testing

**Test production mode locally:**

```bash
# Build production version
npm run build

# Test production build
npm run preview
```

**Expected Results:**
- ✅ Build completes without errors
- ✅ No environment badge visible
- ✅ Production data appears
- ✅ All features work correctly

### 6.2 Commit Development Setup

**Commit your changes:**

```bash
# Add all new files
git add .

# Commit the development environment setup
git commit -m "feat: add multi-environment development setup

- Add environment configuration system
- Add database environment separation with RLS
- Add environment badge component
- Add development, staging, testing environments
- Update Supabase client with environment awareness
- Add development data isolation"

# Verify commit
git log --oneline -1
```

### 6.3 Merge Back to Main (When Ready)

**When you want to deploy to production:**

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge development environment
git merge development-environment

# Deploy to production
git push origin main
```

---

## Step 7: Daily Development Workflow

### 7.1 Start Development Session

**Copy this daily startup script:**

```bash
#!/bin/bash
# daily-dev.sh - Copy this to a file and run it daily

echo "🚀 Starting development session..."

# Navigate to project
cd "C:\Users\melre\OneDrive\AI\04ACAPPV4\accounting-system"

# Switch to development branch
git checkout development-environment

# Sync with main branch
git fetch origin main
git merge origin/main

# Start development server
npm run dev:development
```

### 7.2 Feature Development Process

**For each new feature:**

```bash
# Create feature branch from development
git checkout -b feature/new-invoice-module

# Make your changes
# Test in development environment

# Commit changes
git add .
git commit -m "feat: add invoice module"

# Merge back to development
git checkout development-environment
git merge feature/new-invoice-module

# Delete feature branch
git branch -d feature/new-invoice-module
```

### 7.3 Database Changes Workflow

**For database schema changes:**

1. **Create migration in development:**

```sql
-- Set to development environment
SELECT set_environment_context('development');

-- Make your changes
ALTER TABLE accounts ADD COLUMN new_field VARCHAR(50);

-- Test the changes
SELECT * FROM accounts LIMIT 1;
```

2. **Test thoroughly in development**
3. **When ready, apply to production:**

```sql
-- Set to production environment
SELECT set_environment_context('production');

-- Apply the same changes
ALTER TABLE accounts ADD COLUMN new_field VARCHAR(50);
```

---

## 🔧 Troubleshooting

### Issue: Environment badge not showing

**Check environment file:**

```bash
# Verify environment file exists
cat .env.development

# Check if environment is set correctly
echo $VITE_APP_ENVIRONMENT
```

**Fix:**

```bash
# Restart server with correct mode
npm run dev:development
```

### Issue: Database context not working

**Test in Supabase SQL Editor:**

```sql
-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('set_environment_context', 'get_current_environment');

-- Test functions
SELECT set_environment_context('development');
SELECT get_current_environment();
```

### Issue: RLS policies blocking data

**Check policies:**

```sql
-- Check if policies exist
SELECT tablename, policyname FROM pg_policies 
WHERE policyname LIKE 'environment_isolation_%';

-- Temporarily disable RLS for testing
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
-- Test your queries
-- Re-enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
```

### Issue: Port conflicts

**Kill processes on ports:**

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID [PID_NUMBER] /F

# Alternative: use different port
npm run dev:development -- --port 3004
```

---

## ✅ Verification Checklist

**Before proceeding to next step, verify:**

- [ ] ✅ Development branch created
- [ ] ✅ Environment files created
- [ ] ✅ Database environment columns added
- [ ] ✅ RLS policies working
- [ ] ✅ Development data created
- [ ] ✅ Environment badge visible
- [ ] ✅ Supabase context setting working
- [ ] ✅ Development server runs on port 3001
- [ ] ✅ Production build works
- [ ] ✅ Git commits successful

**Final Test - Multi-Environment:**

```bash
# Test all environments work
npm run dev:development  # Port 3001
npm run dev:staging      # Port 3002  
npm run dev:testing      # Port 3003
npm run dev              # Port 3000 (production mode)
```

---

## 🎉 Success!

You now have a complete multi-environment development setup with:

- ✅ **Environment Isolation**: Separate data contexts
- ✅ **Easy Synchronization**: Git-based workflow  
- ✅ **Visual Indicators**: Environment badges
- ✅ **Professional Workflow**: Multiple environments
- ✅ **Production Safety**: No risk to live data

**Next Steps:**
1. Start developing your features in the development environment
2. Use staging for testing
3. Merge back to main when ready for production
4. Enjoy clean, professional development workflow!

---

# 📥 DOWNLOADABLE OPTION 2 COMPLETE GUIDE

**Copy the content below this line to create your local `option-2-guide.md` file:**

```markdown
# Option 2: Feature Branch Development - Complete Implementation Guide

## 🎯 Overview
Create a development environment using Git branches + environment-based data separation for easy sync with production.

**Key Benefits:**
- ✅ Same codebase = easy Git merge workflow
- ✅ Data isolation = production safety
- ✅ Multiple environments (dev, staging, testing)
- ✅ Professional development workflow

---

## 📋 Quick Setup (5 minutes)

```bash
# 1. Create development branch
git checkout -b development

# 2. Create environment file
cat > .env.development << 'EOF'
VITE_SUPABASE_URL=https://your-existing-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-existing-anon-key
VITE_APP_ENVIRONMENT=development
VITE_DATABASE_CONTEXT=development
VITE_APP_NAME="نظام المحاسبة - التطوير"
VITE_ENABLE_DEBUG=true
VITE_DEV_PORT=3001
EOF

# 3. Add database environment column (run in Supabase SQL Editor)
# ALTER TABLE accounts ADD COLUMN environment VARCHAR(20) DEFAULT 'production';
# ALTER TABLE transactions ADD COLUMN environment VARCHAR(20) DEFAULT 'production';

# 4. Start development
npm run dev -- --port 3001 --mode development
```

---

## 🏗️ Phase 1: Environment Configuration

### Step 1.1: Create Environment System
```typescript
// src/config/environments.ts
export type EnvironmentType = 'production' | 'development' | 'staging' | 'testing';

export interface EnvironmentConfig {
  name: string;
  displayName: string;
  displayNameAr: string;
  color: string;
  database: {
    context: string;
    enableMockData: boolean;
    enableDebugQueries: boolean;
  };
  features: {
    enableDebugPanel: boolean;
    enableExperimentalFeatures: boolean;
  };
  ui: {
    showEnvironmentBadge: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

const environments: Record<EnvironmentType, EnvironmentConfig> = {
  production: {
    name: 'production',
    displayName: 'Accounting System',
    displayNameAr: 'نظام المحاسبة',
    color: '#22c55e',
    database: { context: 'production', enableMockData: false, enableDebugQueries: false },
    features: { enableDebugPanel: false, enableExperimentalFeatures: false },
    ui: { showEnvironmentBadge: false, logLevel: 'error' }
  },
  development: {
    name: 'development',
    displayName: 'Accounting System - Development',
    displayNameAr: 'نظام المحاسبة - التطوير',
    color: '#f59e0b',
    database: { context: 'development', enableMockData: true, enableDebugQueries: true },
    features: { enableDebugPanel: true, enableExperimentalFeatures: true },
    ui: { showEnvironmentBadge: true, logLevel: 'debug' }
  },
  staging: {
    name: 'staging',
    displayName: 'Accounting System - Staging',
    displayNameAr: 'نظام المحاسبة - الاختبار',
    color: '#3b82f6',
    database: { context: 'staging', enableMockData: false, enableDebugQueries: true },
    features: { enableDebugPanel: true, enableExperimentalFeatures: false },
    ui: { showEnvironmentBadge: true, logLevel: 'info' }
  },
  testing: {
    name: 'testing',
    displayName: 'Accounting System - Testing',
    displayNameAr: 'نظام المحاسبة - الفحص',
    color: '#10b981',
    database: { context: 'testing', enableMockData: true, enableDebugQueries: true },
    features: { enableDebugPanel: true, enableExperimentalFeatures: true },
    ui: { showEnvironmentBadge: true, logLevel: 'debug' }
  }
};

export const getCurrentEnvironment = (): EnvironmentType => {
  const env = import.meta.env.VITE_APP_ENVIRONMENT as EnvironmentType;
  return env && env in environments ? env : 'production';
};

export const getEnvironmentConfig = (): EnvironmentConfig => {
  return environments[getCurrentEnvironment()];
};

export const isDevelopment = () => getCurrentEnvironment() === 'development';
export const isProduction = () => getCurrentEnvironment() === 'production';
```

### Step 1.2: Environment Files
Create `.env.development`:
```env
# Development Environment
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_ENVIRONMENT=development
VITE_DATABASE_CONTEXT=development
VITE_APP_NAME="نظام المحاسبة - التطوير"
VITE_ENABLE_DEBUG=true
VITE_ENABLE_DEV_TOOLS=true
VITE_API_TIMEOUT=30000
VITE_SHOW_ENVIRONMENT_BADGE=true
VITE_LOG_LEVEL=debug
VITE_DEV_PORT=3001
```

Create `.env.staging`:
```env
# Staging Environment
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_ENVIRONMENT=staging
VITE_DATABASE_CONTEXT=staging
VITE_APP_NAME="نظام المحاسبة - الاختبار"
VITE_ENABLE_DEBUG=false
VITE_ENABLE_DEV_TOOLS=true
VITE_API_TIMEOUT=10000
VITE_SHOW_ENVIRONMENT_BADGE=true
VITE_LOG_LEVEL=info
VITE_DEV_PORT=3002
```

## 🏗️ Phase 2: Database Environment Separation

### Step 2.1: Add Environment Columns (Run in Supabase SQL Editor)
```sql
-- Add environment column to main tables
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS environment VARCHAR(20) DEFAULT 'production';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_environment ON accounts(environment);
CREATE INDEX IF NOT EXISTS idx_transactions_environment ON transactions(environment);
CREATE INDEX IF NOT EXISTS idx_user_profiles_environment ON user_profiles(environment);
CREATE INDEX IF NOT EXISTS idx_roles_environment ON roles(environment);
```

### Step 2.2: Environment Isolation Policies
```sql
-- Create environment-aware RLS policies
CREATE POLICY environment_isolation_accounts ON accounts
FOR ALL TO authenticated
USING (environment = COALESCE(current_setting('app.current_environment', true), 'production'));

CREATE POLICY environment_isolation_transactions ON transactions
FOR ALL TO authenticated
USING (environment = COALESCE(current_setting('app.current_environment', true), 'production'));

CREATE POLICY environment_isolation_user_profiles ON user_profiles
FOR ALL TO authenticated
USING (environment = COALESCE(current_setting('app.current_environment', true), 'production'));

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
```

### Step 2.3: Create Development Data
```sql
-- Copy accounts for development
INSERT INTO accounts (name, type, balance, environment) 
SELECT name || ' (DEV)', type, 0.00, 'development'
FROM accounts WHERE environment = 'production'
ON CONFLICT DO NOTHING;

-- Create development user profile
INSERT INTO user_profiles (id, email, first_name, last_name, is_active, environment) 
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@example.com', 'Developer', 'User', true, 'development')
ON CONFLICT DO NOTHING;

-- Copy roles for development
INSERT INTO roles (name, name_ar, description, environment)
SELECT name, name_ar, description || ' (Development)', 'development'
FROM roles WHERE environment = 'production'
ON CONFLICT DO NOTHING;
```

## 🏗️ Phase 3: Application Integration

### Step 3.1: Update Supabase Client
```typescript
// src/utils/supabase.ts - Add to existing file
import { getCurrentEnvironment } from '../config/environments';

// Set environment context on initialization
const setEnvironmentContext = async () => {
  const environment = getCurrentEnvironment();
  
  try {
    const { error } = await supabase.rpc('set_config', {
      setting_name: 'app.current_environment',
      setting_value: environment,
      is_local: false
    });
    
    if (error) {
      console.warn('Failed to set environment context:', error);
    } else {
      console.log(`Environment context set to: ${environment}`);
    }
  } catch (err) {
    console.warn('Environment context not supported:', err);
  }
};

// Call on app initialization
setEnvironmentContext();

// Enhanced database helpers with environment awareness
export const createRecord = async (table: string, data: any) => {
  const environment = import.meta.env.VITE_DATABASE_CONTEXT || 'production';
  
  const { data: result, error } = await supabase
    .from(table)
    .insert({ ...data, environment })
    .select()
    .single();
    
  if (error) throw error;
  return result;
};
```

### Step 3.2: Environment Badge Component
```typescript
// src/components/Common/EnvironmentBadge.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { getEnvironmentConfig, isProduction } from '../../config/environments';

export const EnvironmentBadge: React.FC = () => {
  const config = getEnvironmentConfig();
  
  if (isProduction()) return null;
  
  const getColor = () => {
    switch (config.name) {
      case 'development': return 'warning';
      case 'staging': return 'info';
      case 'testing': return 'success';
      default: return 'default';
    }
  };
  
  return (
    <Chip 
      label={config.displayNameAr.split(' - ')[1] || config.name}
      color={getColor() as any}
      size="small"
      variant="outlined"
      sx={{ 
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 9999,
        fontWeight: 'bold',
        backgroundColor: config.color + '20',
        borderColor: config.color
      }}
    />
  );
};
```

### Step 3.3: Update App.tsx
```typescript
// src/App.tsx - Add environment badge
import { EnvironmentBadge } from './components/Common/EnvironmentBadge';

const App: React.FC = () => {
  // ... existing code ...
  
  return (
    <Router>
      <EnvironmentBadge />
      {/* ... rest of your routes ... */}
    </Router>
  );
};
```

## 🏗️ Phase 4: Package.json Updates

```json
{
  "name": "accounting-system-dev",
  "version": "1.0.0-dev",
  "scripts": {
    "dev": "vite --mode development --port 3001",
    "dev:staging": "vite --mode staging --port 3002",
    "dev:testing": "vite --mode testing --port 3003",
    "dev:production": "vite --mode production --port 3000",
    "build": "tsc -b && vite build",
    "build:dev": "tsc -b && vite build --mode development",
    "build:staging": "tsc -b && vite build --mode staging",
    "preview:dev": "vite preview --port 3001",
    "preview:staging": "vite preview --port 3002",
    "lint": "eslint .",
    "sync:check": "git status && git diff --name-only main",
    "sync:pull": "git fetch origin main && git merge origin/main"
  }
}
```

---

## 🔄 Development Workflow

### Daily Development Process

```bash
# 1. Start development environment
npm run dev  # Runs on port 3001

# 2. Make changes and test
# - Edit code
# - Test in browser at http://localhost:3001
# - Verify environment badge shows "التطوير"

# 3. Commit frequently
git add .
git commit -m "feat: add new feature"

# 4. Sync with main (daily)
git fetch origin main
git merge origin/main

# 5. Build and test
npm run build:dev
npm run preview:dev
```

### Testing in Different Environments

```bash
# Test in development (full debugging)
npm run dev

# Test in staging (production-like)
npm run dev:staging

# Test in testing (automated testing)
npm run dev:testing

# Test production build locally
npm run dev:production
```

### Merge Back to Production

```bash
# 1. Sync with latest main
git fetch origin main
git merge origin/main

# 2. Test thoroughly
npm run build
npm run dev:production

# 3. Merge to main
git checkout main
git merge development
git push origin main

# 4. Apply database migrations to production (manual)
# Run any new SQL scripts in production Supabase
```

---

## 🛠️ Useful Scripts

### Environment Checker
```bash
# scripts/check-environment.sh
#!/bin/bash
echo "Current Environment: $(grep VITE_APP_ENVIRONMENT .env.development | cut -d= -f2)"
echo "Supabase URL: $(grep VITE_SUPABASE_URL .env.development | cut -d= -f2)"
echo "Development Port: $(grep VITE_DEV_PORT .env.development | cut -d= -f2)"
```

### Sync Checker
```bash
# scripts/sync-status.sh
#!/bin/bash
echo "=== SYNC STATUS ==="
echo "Current Branch: $(git branch --show-current)"
echo "Commits ahead of main: $(git rev-list --count main..HEAD)"
echo "Commits behind main: $(git rev-list --count HEAD..main)"
echo "Modified files: $(git diff --name-only | wc -l)"
echo "Staged files: $(git diff --cached --name-only | wc -l)"
```

### Database Reset
```sql
-- Reset development data when needed
DELETE FROM transactions WHERE environment = 'development';
DELETE FROM accounts WHERE environment = 'development';

-- Refresh development data from production
INSERT INTO accounts (name, type, balance, environment)
SELECT name || ' (DEV)', type, 0.00, 'development'
FROM accounts WHERE environment = 'production';
```

---

## 🔧 Troubleshooting

### Environment Badge Not Showing
1. Check environment variable: `echo $VITE_APP_ENVIRONMENT`
2. Verify EnvironmentBadge component is imported in App.tsx
3. Check browser console for errors

### Data Not Separated
1. Verify environment column exists: Check in Supabase dashboard
2. Check RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'accounts';`
3. Verify environment context is set: Check browser console logs

### Sync Issues
1. Check for merge conflicts: `git status`
2. Verify remote origin: `git remote -v`
3. Reset to clean state: `git reset --hard origin/main`

### Port Conflicts
1. Check running processes: `lsof -i :3001`
2. Kill existing process: `kill -9 <PID>`
3. Use different port: `npm run dev -- --port 3004`

---

## 🎯 Next Steps

1. **Review this guide** and understand each phase
2. **Test the quick setup** first to verify it works
3. **Implement full solution** phase by phase
4. **Create your first feature** using the development environment
5. **Practice the merge workflow** with a small change

---

## 📞 Support

### Common Commands Reference
```bash
# Environment commands
npm run dev                    # Development (port 3001)
npm run dev:staging           # Staging (port 3002)  
npm run dev:testing           # Testing (port 3003)
npm run dev:production        # Production mode (port 3000)

# Build commands
npm run build:dev             # Development build
npm run build:staging         # Staging build
npm run build                 # Production build

# Sync commands
npm run sync:check            # Check sync status
npm run sync:pull             # Pull from main branch

# Git workflow
git checkout development      # Switch to development
git merge main               # Merge latest main
git checkout main            # Switch to main
git merge development        # Merge development to main
```

### Environment Variables Reference
- `VITE_APP_ENVIRONMENT`: Sets the environment type
- `VITE_DATABASE_CONTEXT`: Controls data separation
- `VITE_DEV_PORT`: Development server port
- `VITE_SHOW_ENVIRONMENT_BADGE`: Shows/hides environment indicator
- `VITE_LOG_LEVEL`: Controls console logging level

This implementation provides a professional development environment that's easy to sync with production while maintaining complete data safety.
```

**End of downloadable content - save everything above this line as `option-2-guide.md`**

---

# 🚀 LIVE IMPLEMENTATION: Let's Start Option 2 Now!

## Step 1: Pre-Implementation Check

First, let's verify your current system state:

```bash
# Navigate to your accounting system directory
cd /path/to/your/accounting-system

# Check current status
echo "=== CURRENT SYSTEM STATUS ==="
echo "Current directory: $(pwd)"
echo "Git branch: $(git branch --show-current)"
echo "Git status: $(git status --porcelain | wc -l) files modified"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Check if environment files exist
echo "\n=== ENVIRONMENT FILES ==="
ls -la .env* 2>/dev/null || echo "No .env files found"

# Check package.json
echo "\n=== PROJECT INFO ==="
if [ -f package.json ]; then
    echo "Project name: $(cat package.json | grep '"name"' | cut -d'"' -f4)"
    echo "Current version: $(cat package.json | grep '"version"' | cut -d'"' -f4)"
else
    echo "❌ package.json not found"
fi
```

**Please run the above commands and share the output so I can guide you properly.**

## Step 2: Safety Backup (IMPORTANT)

Before we start, let's create a safety backup:

```bash
# Create backup branch with timestamp
BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup: $BACKUP_BRANCH"

# Ensure we're on main and create backup
git checkout main
git pull origin main  # Get latest changes
git checkout -b "$BACKUP_BRANCH"
git push origin "$BACKUP_BRANCH"

echo "✅ Backup created: $BACKUP_BRANCH"
echo "📝 To restore later: git checkout $BACKUP_BRANCH"

# Return to main
git checkout main
```

## Step 3: Quick Development Environment Setup

Now let's set up your development environment:

```bash
# Create development branch
git checkout -b development
echo "✅ Created development branch"

# Create .env.development file
cat > .env.development << 'EOF'
# Development Environment Configuration
# Replace with your actual Supabase credentials
VITE_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE

# Environment identification
VITE_APP_ENVIRONMENT=development
VITE_DATABASE_CONTEXT=development

# App configuration
VITE_APP_NAME="نظام المحاسبة - التطوير"
VITE_APP_DESCRIPTION="بيئة التطوير والتجريب"
VITE_APP_VERSION="1.0.0-dev"

# Development features
VITE_ENABLE_DEBUG=true
VITE_ENABLE_DEV_TOOLS=true
VITE_ENABLE_MOCK_DATA=true
VITE_ENABLE_EXPERIMENTAL_FEATURES=true

# UI configuration
VITE_SHOW_ENVIRONMENT_BADGE=true
VITE_LOG_LEVEL=debug
VITE_THEME_MODE=light

# Development server
VITE_DEV_PORT=3001
VITE_DEV_HOST=localhost
EOF

echo "✅ Created .env.development file"
```

## Step 4: Update Your Supabase Credentials

**You need to update the .env.development file with your actual Supabase credentials:**

1. Open `.env.development` in your editor
2. Replace `YOUR_SUPABASE_URL_HERE` with your actual Supabase URL
3. Replace `YOUR_SUPABASE_ANON_KEY_HERE` with your actual Supabase anon key

**To find your Supabase credentials:**
- Go to your Supabase dashboard
- Navigate to Settings → API
- Copy the Project URL and anon/public key

Or if you have an existing `.env.local`, copy from there:

```bash
# If you have existing credentials, copy them
if [ -f .env.local ]; then
    echo "Found existing credentials in .env.local:"
    grep "VITE_SUPABASE_" .env.local
    echo "\nPlease copy these values to .env.development"
else
    echo "No .env.local found. Please get credentials from Supabase dashboard."
fi
```

## Step 5: Test Basic Setup

```bash
# Test if the development environment works
echo "Testing development environment..."

# Start development server on port 3001
npm run dev -- --port 3001 --mode development
```

**Expected Result:**
- Development server should start on http://localhost:3001
- You should see your app running
- Check if there are any errors in the console

## Next Steps After Basic Setup

Once you've completed the above steps and confirmed the basic setup works, we'll proceed to:

1. **Database Environment Separation** - Add environment columns to your Supabase tables
2. **Environment Configuration System** - Create the TypeScript environment management
3. **Visual Environment Indicators** - Add badges to show which environment you're in
4. **Development Workflow** - Set up scripts for daily development

## Current Progress Checklist

- [ ] ✅ Ran pre-implementation check
- [ ] ✅ Created safety backup branch
- [ ] ✅ Created development branch
- [ ] ✅ Created .env.development file
- [ ] ✅ Updated Supabase credentials
- [ ] ✅ Tested basic development server

**Please complete the steps above and let me know:**
1. The output of the pre-implementation check
2. Whether the development server starts successfully on port 3001
3. Any errors you encounter

Then we'll continue with the next phases!

## 🎯 New Comprehensive Detailed Plan for Option 2

### 📋 Executive Summary
**Objective**: Create a professional development environment that shares the same codebase while maintaining complete data isolation and enabling seamless synchronization back to production.

**Key Benefits**:
- ✅ Same codebase = easy synchronization via Git
- ✅ Production data protection via environment isolation
- ✅ Professional development workflow with automation
- ✅ Multiple environment support (dev, staging, testing)
- ✅ Visual environment indicators and debugging tools

---

### 🏗️ Architecture Overview

```
graph TB
    subgraph "Git Repository"
        A[Main Branch - Production] 
        B[Development Branch]
        C[Feature Branches]
    end
    
    subgraph "Single Supabase Project"
        D[Production Data Context]
        E[Development Data Context] 
        F[Staging Data Context]
        G[Testing Data Context]
    end
    
    subgraph "Deployment Environments"
        H[Production Server :3000]
        I[Development Server :3001]
        J[Staging Server :3002]
    end
    
    A --> D
    A --> H
    B --> E
    B --> I
    C --> E
    C --> I
    
    D --> |RLS Policies| E
    E --> |RLS Policies| F
    F --> |RLS Policies| G
```

---

### 🎯 Phase 1: Project Assessment & Preparation

#### Step 1.1: Current System Analysis
```bash
# Navigate to your accounting system
cd /path/to/your/accounting-system

# Document current state
echo "=== CURRENT SYSTEM ANALYSIS ===" > analysis-report.md
echo "Date: $(date)" >> analysis-report.md
echo "Node Version: $(node --version)" >> analysis-report.md
echo "NPM Version: $(npm --version)" >> analysis-report.md
echo "" >> analysis-report.md

# Check package.json
echo "## Package Information" >> analysis-report.md
cat package.json | jq '.name, .version, .scripts' >> analysis-report.md

# Check environment variables
echo "## Current Environment Variables" >> analysis-report.md
ls .env* 2>/dev/null || echo "No .env files found" >> analysis-report.md

# Check Supabase configuration
echo "## Supabase Configuration" >> analysis-report.md
grep -E "VITE_SUPABASE_" .env.local 2>/dev/null | sed 's/=.*/=***/' >> analysis-report.md || echo "No Supabase config found" >> analysis-report.md

# Check database schema
echo "## Database Tables" >> analysis-report.md
echo "Run this in Supabase SQL Editor to get table list:" >> analysis-report.md
echo "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" >> analysis-report.md
```

#### Step 1.2: Backup & Safety Measures
```bash
# Create safety backup
git checkout main
git pull origin main

# Create backup branch
git checkout -b backup-$(date +%Y%m%d-%H%M%S)
git push origin backup-$(date +%Y%m%d-%H%M%S)

# Return to main
git checkout main

# Verify current functionality
npm install
npm run build
npm run dev &
DEV_PID=$!

# Test basic functionality (manual step)
echo "Please test the following in your browser at http://localhost:3000:"
echo "1. Login functionality"
echo "2. Navigate to accounts page"
echo "3. Create a test account"
echo "4. Generate a basic report"
echo "5. Export functionality"
echo ""
echo "Press Enter when testing is complete..."
read

# Stop development server
kill $DEV_PID
```

#### Step 1.3: Documentation Creation
```bash
# Create documentation directory
mkdir -p docs/development-setup

# Document current configuration
cat > docs/development-setup/original-config.md << 'EOF'
# Original System Configuration

## Environment Variables
- VITE_SUPABASE_URL: [Your Supabase URL]
- VITE_SUPABASE_ANON_KEY: [Your Anon Key]
- Other variables: [List any custom variables]

## Database Tables
- accounts
- transactions  
- user_profiles
- roles
- permissions
- [Add other tables as discovered]

## Key Features Tested
- ✅ User authentication
- ✅ Account management
- ✅ Transaction handling
- ✅ Report generation
- ✅ Data export

## Notes
[Add any important observations about the current system]
EOF
```

---

### 🎯 Phase 2: Advanced Environment Architecture

#### Step 2.1: Comprehensive Environment Configuration System
```
// src/config/environments.ts
export type EnvironmentType = 'production' | 'development' | 'staging' | 'testing';

export interface DatabaseConfig {
  context: string;
  enableMockData: boolean;
  enableDebugQueries: boolean;
  queryTimeout: number;
  maxConnections: number;
}

export interface FeatureFlags {
  enableAuditLogging: boolean;
  enableDebugPanel: boolean;
  enableExperimentalFeatures: boolean;
  enablePerformanceMonitoring: boolean;
  enableDataValidation: boolean;
  enableErrorReporting: boolean;
}

export interface UIConfig {
  showEnvironmentBadge: boolean;
  enableDevTools: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  theme: 'light' | 'dark' | 'auto';
  enableAnimations: boolean;
  enableTooltips: boolean;
}

export interface APIConfig {
  timeout: number;
  retries: number;
  enableRequestLogging: boolean;
  enableResponseCaching: boolean;
  rateLimitBypass: boolean;
}

export interface SecurityConfig {
  enableCSRFProtection: boolean;
  enableXSSProtection: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableTwoFactor: boolean;
}

export interface EnvironmentConfig {
  name: string;
  displayName: string;
  displayNameAr: string;
  description: string;
  color: string;
  database: DatabaseConfig;
  features: FeatureFlags;
  ui: UIConfig;
  api: APIConfig;
  security: SecurityConfig;
}

const environments: Record<EnvironmentType, EnvironmentConfig> = {
  production: {
    name: 'production',
    displayName: 'Accounting System',
    displayNameAr: 'نظام المحاسبة',
    description: 'Production environment',
    color: '#22c55e',
    database: {
      context: 'production',
      enableMockData: false,
      enableDebugQueries: false,
      queryTimeout: 5000,
      maxConnections: 20,
    },
    features: {
      enableAuditLogging: true,
      enableDebugPanel: false,
      enableExperimentalFeatures: false,
      enablePerformanceMonitoring: true,
      enableDataValidation: true,
      enableErrorReporting: true,
    },
    ui: {
      showEnvironmentBadge: false,
      enableDevTools: false,
      logLevel: 'error',
      theme: 'auto',
      enableAnimations: true,
      enableTooltips: true,
    },
    api: {
      timeout: 5000,
      retries: 3,
      enableRequestLogging: false,
      enableResponseCaching: true,
      rateLimitBypass: false,
    },
    security: {
      enableCSRFProtection: true,
      enableXSSProtection: true,
      sessionTimeout: 3600000, // 1 hour
      maxLoginAttempts: 3,
      enableTwoFactor: true,
    },
  },
  development: {
    name: 'development',
    displayName: 'Accounting System - Development',
    displayNameAr: 'نظام المحاسبة - التطوير',
    description: 'Development environment for feature development',
    color: '#f59e0b',
    database: {
      context: 'development',
      enableMockData: true,
      enableDebugQueries: true,
      queryTimeout: 30000,
      maxConnections: 5,
    },
    features: {
      enableAuditLogging: false,
      enableDebugPanel: true,
      enableExperimentalFeatures: true,
      enablePerformanceMonitoring: false,
      enableDataValidation: true,
      enableErrorReporting: false,
    },
    ui: {
      showEnvironmentBadge: true,
      enableDevTools: true,
      logLevel: 'debug',
      theme: 'light',
      enableAnimations: false,
      enableTooltips: true,
    },
    api: {
      timeout: 30000,
      retries: 1,
      enableRequestLogging: true,
      enableResponseCaching: false,
      rateLimitBypass: true,
    },
    security: {
      enableCSRFProtection: false,
      enableXSSProtection: false,
      sessionTimeout: 7200000, // 2 hours
      maxLoginAttempts: 10,
      enableTwoFactor: false,
    },
  },
  staging: {
    name: 'staging',
    displayName: 'Accounting System - Staging',
    displayNameAr: 'نظام المحاسبة - الاختبار',
    description: 'Staging environment for UAT and integration testing',
    color: '#3b82f6',
    database: {
      context: 'staging',
      enableMockData: false,
      enableDebugQueries: true,
      queryTimeout: 10000,
      maxConnections: 10,
    },
    features: {
      enableAuditLogging: true,
      enableDebugPanel: true,
      enableExperimentalFeatures: false,
      enablePerformanceMonitoring: true,
      enableDataValidation: true,
      enableErrorReporting: true,
    },
    ui: {
      showEnvironmentBadge: true,
      enableDevTools: true,
      logLevel: 'info',
      theme: 'auto',
      enableAnimations: true,
      enableTooltips: true,
    },
    api: {
      timeout: 10000,
      retries: 2,
      enableRequestLogging: true,
      enableResponseCaching: true,
      rateLimitBypass: false,
    },
    security: {
      enableCSRFProtection: true,
      enableXSSProtection: true,
      sessionTimeout: 3600000, // 1 hour
      maxLoginAttempts: 5,
      enableTwoFactor: false,
    },
  },
  testing: {
    name: 'testing',
    displayName: 'Accounting System - Testing',
    displayNameAr: 'نظام المحاسبة - الفحص',
    description: 'Testing environment for automated and manual testing',
    color: '#10b981',
    database: {
      context: 'testing',
      enableMockData: true,
      enableDebugQueries: true,
      queryTimeout: 15000,
      maxConnections: 5,
    },
    features: {
      enableAuditLogging: false,
      enableDebugPanel: true,
      enableExperimentalFeatures: true,
      enablePerformanceMonitoring: false,
      enableDataValidation: false,
      enableErrorReporting: false,
    },
    ui: {
      showEnvironmentBadge: true,
      enableDevTools: true,
      logLevel: 'debug',
      theme: 'light',
      enableAnimations: false,
      enableTooltips: false,
    },
    api: {
      timeout: 15000,
      retries: 1,
      enableRequestLogging: true,
      enableResponseCaching: false,
      rateLimitBypass: true,
    },
    security: {
      enableCSRFProtection: false,
      enableXSSProtection: false,
      sessionTimeout: 14400000, // 4 hours
      maxLoginAttempts: 100,
      enableTwoFactor: false,
    },
  },
};

// Environment utilities
export const getCurrentEnvironment = (): EnvironmentType => {
  const env = import.meta.env.VITE_APP_ENVIRONMENT as EnvironmentType;
  return env && env in environments ? env : 'production';
};

export const getEnvironmentConfig = (): EnvironmentConfig => {
  return environments[getCurrentEnvironment()];
};

export const isEnvironment = (env: EnvironmentType): boolean => {
  return getCurrentEnvironment() === env;
};

export const isDevelopment = () => isEnvironment('development');
export const isProduction = () => isEnvironment('production');
export const isStaging = () => isEnvironment('staging');
export const isTesting = () => isEnvironment('testing');

export const getEnvironmentColor = (): string => {
  return getEnvironmentConfig().color;
};

export const shouldShowFeature = (feature: keyof FeatureFlags): boolean => {
  return getEnvironmentConfig().features[feature];
};

export const getAPIConfig = (): APIConfig => {
  return getEnvironmentConfig().api;
};

export const getSecurityConfig = (): SecurityConfig => {
  return getEnvironmentConfig().security;
};
```

