# Warp AI - Final Implementation Plan: Priority 1 Items Only
_Integration of Single-Entry Accounting with Existing Auth System + Arabic RTL + Simple Projects_

## 🎯 PROJECT CONTEXT

You are implementing the final integration phase of a construction company accounting system. The following components **already exist**:
- ✅ **Authentication system** (AuthProvider, useAuth, PermissionGuard, usePermissions)
- ✅ **Supabase backend** with RLS policies, audit logs, user management
- ✅ **Accounts tree UI page** with basic functionality
- ✅ **React + Vite + Tailwind CSS** setup with Arabic font support

**Your Task**: Enhance the existing system with single-entry accounting, Arabic RTL support, and simple project tracking. Follow this plan **exactly** - no deviations.

---

## 📋 EXECUTION CHECKLIST

Execute these phases **sequentially**. Do not proceed to the next phase until current phase is verified and working.

- [ ] **Phase 1**: Database Schema Enhancements (1 day)
- [ ] **Phase 2**: Core UI Integration & Arabic RTL (2-3 days)
- [ ] **Phase 3**: Transaction Management with Projects (2 days)
- [ ] **Phase 4**: Reporting & Balance Integration (2 days)
- [ ] **Phase 5**: Testing & Polish (1 day)

---

## 🗄️ PHASE 1: DATABASE SCHEMA ENHANCEMENTS

### Step 1.1: Enhance Existing Accounts Table
Execute this SQL in Supabase SQL Editor:

```sql
-- Add Arabic support to existing accounts table
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Add project support to accounts (for project-specific accounts)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS project_id UUID;

-- Ensure accounts table has org_id for multi-org support
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

-- Add ltree extension if not exists
CREATE EXTENSION IF NOT EXISTS ltree;

-- Ensure accounts has path column for tree structure
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS path ltree;

-- Update existing accounts with default Arabic names (replace existing data carefully)
UPDATE public.accounts 
SET name_ar = CASE 
  WHEN name LIKE '%Assets%' OR name LIKE '%Asset%' THEN 'الأصول'
  WHEN name LIKE '%Liabilities%' OR name LIKE '%Liability%' THEN 'الالتزامات'
  WHEN name LIKE '%Equity%' THEN 'حقوق الملكية'
  WHEN name LIKE '%Revenue%' OR name LIKE '%Income%' THEN 'الإيرادات'
  WHEN name LIKE '%Expense%' OR name LIKE '%Cost%' THEN 'المصروفات'
  WHEN name LIKE '%Cash%' THEN 'النقد'
  WHEN name LIKE '%Bank%' THEN 'البنك'
  WHEN name LIKE '%Equipment%' THEN 'المعدات'
  WHEN name LIKE '%Materials%' THEN 'المواد'
  ELSE name -- Keep original if no match
END
WHERE name_ar IS NULL;
```

### Step 1.2: Create Projects Table
```sql
-- Simple projects table (no cost centers yet)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    client_name VARCHAR(255),
    client_name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    start_date DATE,
    end_date DATE,
    contract_value BIGINT DEFAULT 0, -- In minor units (halalas)
    currency_code CHAR(3) DEFAULT 'SAR',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects (org_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_code ON public.projects (code);
```

### Step 1.3: Enhance Transactions Table
```sql
-- Enhance existing transactions table with required fields
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS source_document VARCHAR(255);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS notes_ar TEXT;

-- Ensure required columns exist
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS entry_number VARCHAR(50);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS entry_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS debit_account_id UUID REFERENCES public.accounts(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS credit_account_id UUID REFERENCES public.accounts(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_posted BOOLEAN DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_org_posted ON public.transactions (org_id, is_posted, posted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON public.transactions (org_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_transactions_project ON public.transactions (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_debit_account ON public.transactions (debit_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_credit_account ON public.transactions (credit_account_id);
```

### Step 1.4: Update Existing Functions with Arabic Support
```sql
-- Enhanced tree view with Arabic support
CREATE OR REPLACE VIEW public.v_accounts_tree_ui AS
SELECT
  a.org_id,
  a.id,
  a.code,
  a.name,
  a.name_ar,
  a.category,
  a.normal_balance,
  a.is_postable,
  a.status,
  a.parent_id,
  a.level,
  a.path::text AS path_text,
  a.project_id,
  p.name as project_name,
  p.name_ar as project_name_ar,
  EXISTS (SELECT 1 FROM public.accounts c WHERE c.parent_id = a.id AND c.status = 'active') AS has_active_children,
  EXISTS (SELECT 1 FROM public.accounts c WHERE c.parent_id = a.id) AS has_children,
  a.created_at,
  a.updated_at
FROM public.accounts a
LEFT JOIN public.projects p ON a.project_id = p.id;

-- Enhanced balance function with project support
CREATE OR REPLACE FUNCTION public.get_account_balances_current_tx_enhanced(
  p_org_id uuid,
  p_mode text DEFAULT 'posted',
  p_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  account_id uuid,
  code text,
  name text,
  name_ar text,
  normal_balance normal_side,
  debits_minor bigint,
  credits_minor bigint,
  balance_signed_minor bigint,
  balance_natural_minor bigint,
  project_id uuid,
  project_name text,
  project_name_ar text
)
LANGUAGE sql STABLE
AS $$
  WITH tx AS (
    SELECT *
    FROM public.transactions t
    WHERE t.org_id = p_org_id
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND (
        (p_mode = 'posted' AND t.is_posted = true) OR
        (p_mode = 'all')
      )
  ),
  debits AS (
    SELECT debit_account_id AS account_id, SUM(amount) AS debits_minor
    FROM tx
    GROUP BY debit_account_id
  ),
  credits AS (
    SELECT credit_account_id AS account_id, SUM(amount) AS credits_minor
    FROM tx
    GROUP BY credit_account_id
  ),
  totals AS (
    SELECT
      COALESCE(d.account_id, c.account_id) AS account_id,
      COALESCE(d.debits_minor, 0)  AS debits_minor,
      COALESCE(c.credits_minor, 0) AS credits_minor
    FROM debits d
    FULL OUTER JOIN credits c ON d.account_id = c.account_id
  )
  SELECT
    a.id,
    a.code,
    a.name,
    a.name_ar,
    a.normal_balance,
    COALESCE(t.debits_minor, 0)  AS debits_minor,
    COALESCE(t.credits_minor, 0) AS credits_minor,
    COALESCE(t.debits_minor, 0) - COALESCE(t.credits_minor, 0) AS balance_signed_minor,
    CASE
      WHEN a.normal_balance = 'debit'
        THEN COALESCE(t.debits_minor, 0) - COALESCE(t.credits_minor, 0)
      ELSE COALESCE(t.credits_minor, 0) - COALESCE(t.debits_minor, 0)
    END AS balance_natural_minor,
    a.project_id,
    p.name as project_name,
    p.name_ar as project_name_ar
  FROM public.accounts a
  LEFT JOIN totals t ON t.account_id = a.id
  LEFT JOIN public.projects p ON a.project_id = p.id
  WHERE a.org_id = p_org_id
  ORDER BY a.path;
$$;
```

### Step 1.5: Set Up RLS Policies
```sql
-- Enable RLS on new tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view projects in their org" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id  
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
        )
    );

CREATE POLICY "Managers can manage projects" ON public.projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('Super Admin', 'Manager')
            AND ur.is_active = true
        )
    );

-- Update transactions policies for project support
CREATE POLICY "Users can view transactions in their org" ON public.transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
        )
    );
```

### **Verification for Phase 1**
Run these queries to verify setup:
```sql
-- Test accounts tree view
SELECT * FROM public.v_accounts_tree_ui LIMIT 10;

-- Test projects table
SELECT COUNT(*) FROM public.projects;

-- Test enhanced balance function
SELECT * FROM public.get_account_balances_current_tx_enhanced(
    '00000000-0000-0000-0000-000000000001', 'all'
) LIMIT 5;
```

---

## 🖥️ PHASE 2: CORE UI INTEGRATION & ARABIC RTL

### Step 2.1: Update Global CSS for RTL Support
Update `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Enhanced Arabic Font Support */
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');

/* RTL Support */
[dir="rtl"] {
  text-align: right;
  font-family: 'Cairo', 'Amiri', sans-serif;
}

[dir="rtl"] input,
[dir="rtl"] textarea,
[dir="rtl"] select {
  text-align: right;
  direction: rtl;
}

[dir="rtl"] .tree-node {
  text-align: right;
  direction: rtl;
}

[dir="rtl"] .tree-expand-icon {
  float: right;
  margin-left: 8px;
  margin-right: 0;
}

/* Arabic Number Support */
[dir="rtl"] .arabic-numbers {
  font-family: 'Cairo', sans-serif;
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

/* Toast notifications RTL */
.Toastify__toast-container--top-right {
  right: 1em;
  left: auto;
}

.Toastify__toast--rtl {
  direction: rtl;
  text-align: right;
}

/* Table RTL support */
[dir="rtl"] table {
  direction: rtl;
}

[dir="rtl"] th,
[dir="rtl"] td {
  text-align: right;
}

/* Form elements RTL */
[dir="rtl"] .form-group {
  direction: rtl;
}

[dir="rtl"] .form-label {
  text-align: right;
  display: block;
}
```

### Step 2.2: Create Arabic Translation Hook
Create `src/hooks/useArabicTranslation.js`:

```javascript
import { useMemo } from 'react'

const translations = {
  // Accounts
  'accounts': 'الحسابات',
  'chart_of_accounts': 'دليل الحسابات',
  'account_code': 'رمز الحساب',
  'account_name': 'اسم الحساب',
  'parent_account': 'الحساب الأب',
  'account_type': 'نوع الحساب',
  'is_postable': 'قابل للترحيل',
  'balance': 'الرصيد',
  'debit': 'مدين',
  'credit': 'دائن',
  
  // Projects
  'projects': 'المشاريع',
  'project_code': 'رمز المشروع',
  'project_name': 'اسم المشروع',
  'client_name': 'اسم العميل',
  'start_date': 'تاريخ البداية',
  'end_date': 'تاريخ النهاية',
  'contract_value': 'قيمة العقد',
  'status': 'الحالة',
  
  // Transactions
  'transactions': 'العمليات المالية',
  'entry_number': 'رقم القيد',
  'entry_date': 'تاريخ القيد',
  'description': 'الوصف',
  'amount': 'المبلغ',
  'reference': 'المرجع',
  'posted': 'منشور',
  'draft': 'مسودة',
  
  // Actions
  'add': 'إضافة',
  'edit': 'تعديل',
  'delete': 'حذف',
  'save': 'حفظ',
  'cancel': 'إلغاء',
  'search': 'بحث',
  'filter': 'تصفية',
  'export': 'تصدير',
  'post': 'نشر',
  'unpost': 'إلغاء النشر',
  
  // Status
  'active': 'نشط',
  'inactive': 'غير نشط',
  'completed': 'مكتمل',
  'on_hold': 'متوقف',
  'cancelled': 'ملغي',
  
  // Account types
  'asset': 'أصول',
  'liability': 'التزامات',
  'equity': 'حقوق الملكية',
  'revenue': 'إيرادات',
  'expense': 'مصروفات',
  
  // Reports
  'trial_balance': 'ميزان المراجعة',
  'balance_sheet': 'الميزانية العمومية',
  'income_statement': 'قائمة الدخل',
  'project_report': 'تقرير المشروع',
  'all_transactions': 'جميع العمليات',
  'posted_only': 'المنشورة فقط',
  
  // Messages
  'loading': 'جاري التحميل...',
  'no_data': 'لا توجد بيانات',
  'error_occurred': 'حدث خطأ',
  'success': 'تم بنجاح',
  'confirm_delete': 'هل أنت متأكد من الحذف؟',
  'changes_saved': 'تم حفظ التغييرات',
  'operation_failed': 'فشلت العملية'
}

export const useArabicTranslation = () => {
  const t = useMemo(() => {
    return (key, fallback = key) => {
      return translations[key] || fallback
    }
  }, [])
  
  const formatAmount = (amount) => {
    if (typeof amount !== 'number') return '0.00'
    return (amount / 100).toLocaleString('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }
  
  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('ar-SA')
  }
  
  return { t, formatAmount, formatDate }
}
```

### Step 2.3: Enhance Existing Accounts Tree Component
Update your existing `src/components/admin/AccountsTree.jsx`:

```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useArabicTranslation } from '../../hooks/useArabicTranslation'
import { PermissionGuard } from '../auth/PermissionGuard'
import { toast } from 'react-toastify'
import { 
  ChevronRightIcon, 
  ChevronDownIcon,
  PlusIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

export const AccountsTree = () => {
  const { t, formatAmount } = useArabicTranslation()
  const [accounts, setAccounts] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [balanceMode, setBalanceMode] = useState('posted')
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)

  useEffect(() => {
    loadAccountsTree()
    loadProjects()
  }, [selectedProject, balanceMode])

  const loadAccountsTree = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_accounts_tree_ui')
        .select('*')
        .is('parent_id', null)
        .order('code')
      
      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error loading accounts tree:', error)
      toast.error(t('error_occurred'))
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, code, name, name_ar')
        .eq('status', 'active')
        .order('code')
      
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadChildAccounts = async (parentId) => {
    try {
      const { data, error } = await supabase
        .from('v_accounts_tree_ui')
        .select('*')
        .eq('parent_id', parentId)
        .order('code')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error loading child accounts:', error)
      return []
    }
  }

  const toggleNode = async (accountId) => {
    const newExpanded = new Set(expandedNodes)
    if (expandedNodes.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
      // Load children if not already loaded
      const children = await loadChildAccounts(accountId)
      // Update accounts state to include children
      setAccounts(prev => {
        const updated = [...prev]
        // Add children to the accounts array with proper parent reference
        children.forEach(child => {
          if (!updated.find(acc => acc.id === child.id)) {
            updated.push(child)
          }
        })
        return updated
      })
    }
    setExpandedNodes(newExpanded)
  }

  const renderAccountNode = (account, level = 0) => {
    const hasChildren = account.has_children || account.has_active_children
    const isExpanded = expandedNodes.has(account.id)
    const children = accounts.filter(acc => acc.parent_id === account.id)

    return (
      <div key={account.id} className="account-node">
        <div 
          className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer ${
            level > 0 ? 'mr-' + (level * 6) : ''
          }`}
          style={{ paddingRight: `${level * 24 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(account.id)}
              className="ml-2 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">
                  {account.code} - {account.name_ar || account.name}
                </span>
                {account.project_name_ar && (
                  <span className="mr-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {account.project_name_ar || account.project_name}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <PermissionGuard permission="accounts.update">
                  <button
                    onClick={() => {
                      setSelectedAccount(account)
                      setShowAddModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </PermissionGuard>
              </div>
            </div>
          </div>
        </div>
        
        {isExpanded && children.length > 0 && (
          <div className="children">
            {children.map(child => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const filteredAccounts = accounts.filter(account => 
    !account.parent_id && // Only root accounts for initial render
    (searchTerm === '' || 
     account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
     account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (account.name_ar && account.name_ar.includes(searchTerm)))
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="accounts-tree-container" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('chart_of_accounts')}
        </h1>
        <PermissionGuard permission="accounts.create">
          <button
            onClick={() => {
              setSelectedAccount(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            {t('add')} {t('accounts')}
          </button>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('search') + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Project Filter */}
        <div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('projects')} - الكل</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name_ar || project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Balance Mode */}
        <div>
          <select
            value={balanceMode}
            onChange={(e) => setBalanceMode(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="posted">{t('posted_only')}</option>
            <option value="all">{t('all_transactions')}</option>
          </select>
        </div>
      </div>

      {/* Accounts Tree */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('no_data')}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAccounts.map(account => renderAccountNode(account))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### **Verification for Phase 2**
- Arabic text displays correctly in RTL mode
- Tree navigation works with expand/collapse
- Search works in both Arabic and English
- Project filtering functions
- Balance mode selector works

---

## 💰 PHASE 3: TRANSACTION MANAGEMENT WITH PROJECTS

### Step 3.1: Create Transaction Form Component
Create `src/components/accounting/TransactionForm.jsx`:

```javascript
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useArabicTranslation } from '../../hooks/useArabicTranslation'
import { toast } from 'react-toastify'
import { XMarkIcon } from '@heroicons/react/24/outline'

const transactionSchema = yup.object({
  entry_date: yup.date().required('تاريخ القيد مطلوب'),
  debit_account_id: yup.string().required('الحساب المدين مطلوب'),
  credit_account_id: yup.string().required('الحساب الدائن مطلوب'),
  amount: yup.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر').required('المبلغ مطلوب'),
  description: yup.string().required('الوصف مطلوب'),
  description_ar: yup.string().required('الوصف بالعربية مطلوب')
})

export const TransactionForm = ({ transaction, onClose, onSave }) => {
  const { user } = useAuth()
  const { t, formatAmount } = useArabicTranslation()
  const [accounts, setAccounts] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm({
    resolver: yupResolver(transactionSchema),
    defaultValues: {
      entry_date: transaction?.entry_date || new Date().toISOString().split('T')[0],
      debit_account_id: transaction?.debit_account_id || '',
      credit_account_id: transaction?.credit_account_id || '',
      amount: transaction ? transaction.amount / 100 : 0, // Convert from minor units
      description: transaction?.description || '',
      description_ar: transaction?.description_ar || '',
      project_id: transaction?.project_id || '',
      reference_number: transaction?.reference_number || '',
      notes: transaction?.notes || '',
      notes_ar: transaction?.notes_ar || ''
    }
  })

  const debitAccountId = watch('debit_account_id')
  const creditAccountId = watch('credit_account_id')

  useEffect(() => {
    loadAccounts()
    loadProjects()
  }, [])

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name, name_ar, is_postable')
        .eq('status', 'active')
        .eq('is_postable', true)
        .order('code')
      
      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, code, name, name_ar')
        .eq('status', 'active')
        .order('code')
      
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const generateEntryNumber = async () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const prefix = `${year}${month}`
    
    const { data, error } = await supabase
      .from('transactions')
      .select('entry_number')
      .like('entry_number', `${prefix}%`)
      .order('entry_number', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error generating entry number:', error)
      return `${prefix}0001`
    }
    
    if (data.length === 0) {
      return `${prefix}0001`
    }
    
    const lastNumber = parseInt(data[0].entry_number.slice(-4))
    return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`
  }

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      // Validation: Debit and Credit accounts must be different
      if (data.debit_account_id === data.credit_account_id) {
        toast.error('الحساب المدين والحساب الدائن لا يمكن أن يكونا نفس الحساب')
        return
      }

      // Generate entry number if creating new transaction
      let entryNumber = transaction?.entry_number
      if (!entryNumber) {
        entryNumber = await generateEntryNumber()
      }

      const transactionData = {
        entry_number: entryNumber,
        entry_date: data.entry_date,
        debit_account_id: data.debit_account_id,
        credit_account_id: data.credit_account_id,
        amount: Math.round(data.amount * 100), // Convert to minor units
        description: data.description,
        description_ar: data.description_ar,
        project_id: data.project_id || null,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
        notes_ar: data.notes_ar || null,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }

      let result
      if (transaction) {
        // Update existing transaction
        result = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transaction.id)
          .select()
      } else {
        // Create new transaction
        result = await supabase
          .from('transactions')
          .insert([{
            ...transactionData,
            org_id: '00000000-0000-0000-0000-000000000001', // Replace with actual org_id
            is_posted: false,
            created_at: new Date().toISOString()
          }])
          .select()
      }

      if (result.error) throw result.error

      toast.success(transaction ? 'تم تحديث القيد بنجاح' : 'تم إنشاء القيد بنجاح')
      onSave && onSave(result.data[0])
      onClose()
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast.error('حدث خطأ أثناء حفظ القيد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {transaction ? t('edit') + ' ' + t('transactions') : t('add') + ' ' + t('transactions')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('entry_date')} *
              </label>
              <input
                {...register('entry_date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.entry_date && (
                <p className="text-red-500 text-sm mt-1">{errors.entry_date.message}</p>
              )}
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('projects')}
              </label>
              <select
                {...register('project_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">اختر المشروع</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name_ar || project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Debit Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('debit')} {t('accounts')} *
              </label>
              <select
                {...register('debit_account_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">اختر الحساب المدين</option>
                {accounts.map(account => (
                  <option 
                    key={account.id} 
                    value={account.id}
                    disabled={account.id === creditAccountId}
                  >
                    {account.code} - {account.name_ar || account.name}
                  </option>
                ))}
              </select>
              {errors.debit_account_id && (
                <p className="text-red-500 text-sm mt-1">{errors.debit_account_id.message}</p>
              )}
            </div>

            {/* Credit Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('credit')} {t('accounts')} *
              </label>
              <select
                {...register('credit_account_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">اختر الحساب الدائن</option>
                {accounts.map(account => (
                  <option 
                    key={account.id} 
                    value={account.id}
                    disabled={account.id === debitAccountId}
                  >
                    {account.code} - {account.name_ar || account.name}
                  </option>
                ))}
              </select>
              {errors.credit_account_id && (
                <p className="text-red-500 text-sm mt-1">{errors.credit_account_id.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('amount')} (ريال) *
              </label>
              <input
                {...register('amount')}
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('reference')}
              </label>
              <input
                {...register('reference_number')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description (English) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('description')} (English) *
              </label>
              <input
                {...register('description')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Description (Arabic) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('description')} (عربي) *
              </label>
              <input
                {...register('description_ar')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.description_ar && (
                <p className="text-red-500 text-sm mt-1">{errors.description_ar.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات
              </label>
              <textarea
                {...register('notes_ar')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {loading ? t('loading') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

### Step 3.2: Create Projects Management Component
Create `src/components/accounting/ProjectsManagement.jsx`:

```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useArabicTranslation } from '../../hooks/useArabicTranslation'
import { PermissionGuard } from '../auth/PermissionGuard'
import { toast } from 'react-toastify'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline'

export const ProjectsManagement = () => {
  const { user } = useAuth()
  const { t, formatAmount, formatDate } = useArabicTranslation()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('code')
      
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error(t('error_occurred'))
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => 
    project.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.name_ar?.includes(searchTerm) ||
    project.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">{t('projects')}</h1>
        <PermissionGuard permission="projects.create">
          <button
            onClick={() => {
              setSelectedProject(null)
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            {t('add')} {t('projects')}
          </button>
        </PermissionGuard>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t('search') + '...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Projects Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('project_code')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('project_name')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('client_name')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('contract_value')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                تواريخ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {project.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {project.name_ar || project.name}
                  </div>
                  {project.name_ar && project.name !== project.name_ar && (
                    <div className="text-sm text-gray-500">{project.name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {project.client_name_ar || project.client_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {project.contract_value ? formatAmount(project.contract_value) + ' ر.س' : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    project.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : project.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : project.status === 'on_hold'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {t(project.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{project.start_date ? formatDate(project.start_date) : '-'}</div>
                  <div>{project.end_date ? formatDate(project.end_date) : '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <PermissionGuard permission="projects.update">
                      <button
                        onClick={() => {
                          setSelectedProject(project)
                          setShowAddModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </PermissionGuard>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredProjects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {t('no_data')}
          </div>
        )}
      </div>
    </div>
  )
}
```

### **Verification for Phase 3**
- Transaction form creates valid entries
- Project selector works correctly
- Arabic validation messages display
- Entry numbers generate automatically
- Duplicate account validation works

---

## 📊 PHASE 4: REPORTING & BALANCE INTEGRATION

### Step 4.1: Create Trial Balance Component
Create `src/components/accounting/TrialBalance.jsx`:

```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useArabicTranslation } from '../../hooks/useArabicTranslation'
import { toast } from 'react-toastify'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'

export const TrialBalance = () => {
  const { t, formatAmount } = useArabicTranslation()
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [balanceMode, setBalanceMode] = useState('posted')
  const [selectedProject, setSelectedProject] = useState('')
  const [projects, setProjects] = useState([])

  useEffect(() => {
    loadTrialBalance()
    loadProjects()
  }, [balanceMode, selectedProject])

  const loadTrialBalance = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('get_trial_balance_current_tx', {
          p_org_id: '00000000-0000-0000-0000-000000000001',
          p_mode: balanceMode
        })
      
      if (error) throw error
      
      // Filter by project if selected
      let filteredData = data || []
      if (selectedProject) {
        // This would require modifying the RPC to accept project filter
        // For now, we'll load all and filter client-side
        filteredData = data.filter(balance => balance.project_id === selectedProject)
      }
      
      setBalances(filteredData)
    } catch (error) {
      console.error('Error loading trial balance:', error)
      toast.error(t('error_occurred'))
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, code, name, name_ar')
        .eq('status', 'active')
        .order('code')
      
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const calculateTotals = () => {
    const totalDebits = balances.reduce((sum, balance) => sum + (balance.debit_column_minor || 0), 0)
    const totalCredits = balances.reduce((sum, balance) => sum + (balance.credit_column_minor || 0), 0)
    return { totalDebits, totalCredits }
  }

  const exportToCSV = () => {
    const headers = ['رمز الحساب', 'اسم الحساب', 'مدين', 'دائن']
    const csvContent = [
      headers.join(','),
      ...balances.map(balance => [
        balance.code,
        `"${balance.name}"`,
        formatAmount(balance.debit_column_minor || 0),
        formatAmount(balance.credit_column_minor || 0)
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `trial_balance_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const { totalDebits, totalCredits } = calculateTotals()

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
        <h1 className="text-2xl font-bold text-gray-900">{t('trial_balance')}</h1>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          {t('export')}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Balance Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نوع الأرصدة
          </label>
          <select
            value={balanceMode}
            onChange={(e) => setBalanceMode(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="posted">{t('posted_only')}</option>
            <option value="all">{t('all_transactions')}</option>
          </select>
        </div>

        {/* Project Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('projects')}
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">جميع المشاريع</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name_ar || project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600">إجمالي المدين</div>
          <div className="text-2xl font-bold text-blue-900">
            {formatAmount(totalDebits)} ر.س
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600">إجمالي الدائن</div>
          <div className="text-2xl font-bold text-green-900">
            {formatAmount(totalCredits)} ر.س
          </div>
        </div>
      </div>

      {/* Balance Validation */}
      {totalDebits !== totalCredits && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="text-red-800">
            ⚠️ تحذير: الأرصدة غير متوازنة! الفرق: {formatAmount(Math.abs(totalDebits - totalCredits))} ر.س
          </div>
        </div>
      )}

      {/* Trial Balance Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                رمز الحساب
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                اسم الحساب
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                مدين (ر.س)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                دائن (ر.س)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {balances.map((balance) => (
              <tr key={balance.account_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {balance.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {balance.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 arabic-numbers">
                  {balance.debit_column_minor > 0 ? formatAmount(balance.debit_column_minor) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 arabic-numbers">
                  {balance.credit_column_minor > 0 ? formatAmount(balance.credit_column_minor) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan="2" className="px-6 py-4 text-sm font-bold text-gray-900">
                الإجمالي
              </td>
              <td className="px-6 py-4 text-sm font-bold text-gray-900 arabic-numbers">
                {formatAmount(totalDebits)}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-gray-900 arabic-numbers">
                {formatAmount(totalCredits)}
              </td>
            </tr>
          </tfoot>
        </table>
        
        {balances.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {t('no_data')}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Step 4.2: Create Transactions List Component
Create `src/components/accounting/TransactionsList.jsx`:

```javascript
import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useArabicTranslation } from '../../hooks/useArabicTranslation'
import { PermissionGuard } from '../auth/PermissionGuard'
import { TransactionForm } from './TransactionForm'
import { toast } from 'react-toastify'
import { 
  PlusIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline'

export const TransactionsList = () => {
  const { t, formatAmount, formatDate } = useArabicTranslation()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projects, setProjects] = useState([])
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  useEffect(() => {
    loadTransactions()
    loadProjects()
  }, [selectedProject, statusFilter])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('transactions')
        .select(`
          *,
          debit_account:accounts!debit_account_id(code, name, name_ar),
          credit_account:accounts!credit_account_id(code, name, name_ar),
          project:projects(code, name, name_ar)
        `)
        .order('entry_date', { ascending: false })
        .order('entry_number', { ascending: false })

      if (selectedProject) {
        query = query.eq('project_id', selectedProject)
      }

      if (statusFilter !== 'all') {
        query = query.eq('is_posted', statusFilter === 'posted')
      }

      const { data, error } = await query
      
      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
      toast.error(t('error_occurred'))
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, code, name, name_ar')
        .eq('status', 'active')
        .order('code')
      
      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const handlePostTransaction = async (transaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          is_posted: true,
          posted_at: new Date().toISOString()
        })
        .eq('id', transaction.id)

      if (error) throw error

      toast.success('تم نشر القيد بنجاح')
      loadTransactions()
    } catch (error) {
      console.error('Error posting transaction:', error)
      toast.error('حدث خطأ أثناء نشر القيد')
    }
  }

  const handleUnpostTransaction = async (transaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          is_posted: false,
          posted_at: null
        })
        .eq('id', transaction.id)

      if (error) throw error

      toast.success('تم إلغاء نشر القيد بنجاح')
      loadTransactions()
    } catch (error) {
      console.error('Error unposting transaction:', error)
      toast.error('حدث خطأ أثناء إلغاء نشر القيد')
    }
  }

  const filteredTransactions = transactions.filter(transaction => 
    searchTerm === '' || 
    transaction.entry_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description_ar?.includes(searchTerm) ||
    transaction.debit_account?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.credit_account?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">{t('transactions')}</h1>
        <PermissionGuard permission="transactions.create">
          <button
            onClick={() => {
              setSelectedTransaction(null)
              setShowTransactionForm(true)
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            {t('add')} {t('transactions')}
          </button>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('search') + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Project Filter */}
        <div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">جميع المشاريع</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name_ar || project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">جميع القيود</option>
            <option value="posted">{t('posted_only')}</option>
            <option value="draft">المسودات</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  رقم القيد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الوصف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحساب المدين
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحساب الدائن
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المشروع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.entry_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.entry_date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{transaction.description_ar || transaction.description}</div>
                    {transaction.reference_number && (
                      <div className="text-xs text-gray-500">مرجع: {transaction.reference_number}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.debit_account?.code} - {transaction.debit_account?.name_ar || transaction.debit_account?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.credit_account?.code} - {transaction.credit_account?.name_ar || transaction.credit_account?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 arabic-numbers">
                    {formatAmount(transaction.amount)} ر.س
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.project ? (
                      <>
                        {transaction.project.code} - {transaction.project.name_ar || transaction.project.name}
                      </>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.is_posted
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.is_posted ? t('posted') : t('draft')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {!transaction.is_posted && (
                        <>
                          <PermissionGuard permission="transactions.update">
                            <button
                              onClick={() => {
                                setSelectedTransaction(transaction)
                                setShowTransactionForm(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                          <PermissionGuard permission="transactions.post">
                            <button
                              onClick={() => handlePostTransaction(transaction)}
                              className="text-green-600 hover:text-green-900 transition-colors"
                              title="نشر القيد"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                          </PermissionGuard>
                        </>
                      )}
                      {transaction.is_posted && (
                        <PermissionGuard permission="transactions.unpost">
                          <button
                            onClick={() => handleUnpostTransaction(transaction)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="إلغاء نشر القيد"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {t('no_data')}
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          transaction={selectedTransaction}
          onClose={() => {
            setShowTransactionForm(false)
            setSelectedTransaction(null)
          }}
          onSave={() => {
            loadTransactions()
          }}
        />
      )}
    </div>
  )
}
```

### **Verification for Phase 4**
- Trial balance calculates correctly
- Export functionality works
- Transaction posting/unposting functions
- Project filtering in reports works
- Arabic amounts display correctly

---

## ✅ PHASE 5: TESTING & POLISH

### Step 5.1: Integration Testing
Run these tests:

1. **Create Account Hierarchy**:
   - Create parent account → child account
   - Verify tree display and breadcrumbs work

2. **Transaction Flow**:
   - Create draft transaction → verify in list
   - Post transaction → verify balance updates
   - Check trial balance totals

3. **Project Integration**:
   - Create project → assign to transaction
   - Filter by project in reports

4. **Arabic RTL**:
   - Verify all text displays RTL
   - Check Arabic number formatting
   - Test search in Arabic

### Step 5.2: Performance Optimization
```sql
-- Add any missing indexes based on usage
CREATE INDEX IF NOT EXISTS idx_transactions_entry_date ON public.transactions (entry_date);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status) WHERE status = 'active';
```

### Step 5.3: Final UI Polish
- Ensure all loading states work
- Verify error messages in Arabic
- Test mobile responsiveness
- Check permission guards function correctly

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Going Live:
- [ ] All database migrations executed successfully
- [ ] Arabic translations complete and tested
- [ ] Permission system integrated with existing auth
- [ ] All CRUD operations tested end-to-end
- [ ] Trial balance balances (debits = credits)
- [ ] Project filtering works in all components
- [ ] Mobile UI tested and responsive
- [ ] Error handling displays proper Arabic messages

### Success Criteria:
- ✅ Users can manage accounts tree with Arabic names
- ✅ Users can create/edit/post transactions
- ✅ Trial balance generates correctly with mode selector
- ✅ Project filtering works across all views
- ✅ All text displays properly in RTL Arabic
- ✅ System integrates seamlessly with existing auth

---

## 📋 POST-IMPLEMENTATION NOTES

**What This Implementation Provides:**
- Core single-entry accounting with Arabic RTL support
- Simple project tracking (foundation for cost centers later)
- Trial balance and basic reporting
- Transaction management with posting workflow
- Integration with existing authentication system

**Ready for Future Extensions:**
- Multi-currency support (database ready, UI can be added)
- Cost center allocation (can extend project system)
- Progress billing and retention (additional tables)
- Advanced reporting (build on existing RPC functions)
- Enterprise features (approval workflows, period closing)

**Follow this plan exactly** - each phase builds on the previous one. Test thoroughly at each verification point before proceeding. Report any issues immediately before continuing to next phase.