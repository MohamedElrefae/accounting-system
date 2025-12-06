-- ============================================================================
-- Report Datasets Seeding Script
-- Purpose: Create/recreate report_datasets table with proper schema
-- ============================================================================

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS report_datasets CASCADE;

-- Create table with all required columns
CREATE TABLE report_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  table_name TEXT NOT NULL,
  allowed_fields TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_report_datasets_is_active ON report_datasets(is_active);
CREATE INDEX idx_report_datasets_table_name ON report_datasets(table_name);

-- ============================================================================
-- Insert all datasets
-- ============================================================================

-- Dataset 1: المعاملات المالية
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'المعاملات المالية',
  'جميع المعاملات المالية مع تفاصيل الحسابات والمشاريع وبنود العمل ومراكز التكلفة',
  'v_transactions_enriched',
  ARRAY['id', 'entry_number', 'entry_date', 'description', 'amount', 
    'debit_account_id', 'debit_account_code', 'debit_account_name', 
    'credit_account_id', 'credit_account_code', 'credit_account_name', 
    'project_id', 'project_name', 'organization_name', 'is_posted',
    'classification_id', 'classification_code', 'classification_name', 
    'expenses_category_id', 'expenses_category_code', 'expenses_category_name', 
    'work_item_id', 'work_item_code', 'work_item_name', 
    'cost_center_id', 'cost_center_code', 'cost_center_name', 
    'created_at', 'updated_at', 'notes', 'reference_number', 'source_document']
);

-- Dataset 2: الحسابات
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'الحسابات',
  'دليل الحسابات مع التسلسل الهرمي',
  'accounts',
  ARRAY['id', 'code', 'name', 'name_ar', 'category', 'normal_balance', 
    'parent_id', 'level', 'path', 'status', 'description', 'description_ar', 
    'is_standard', 'allow_transactions', 'is_postable', 'org_id', 
    'created_at', 'updated_at']
);

-- Dataset 3: المشاريع
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'المشاريع',
  'قائمة المشاريع مع تفاصيل الميزانية والحالة',
  'projects',
  ARRAY['id', 'code', 'name', 'name_ar', 'description', 'status', 
    'start_date', 'end_date', 'budget', 'org_id', 
    'created_at', 'updated_at', 'created_by']
);

-- Dataset 4: بنود العمل
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'بنود العمل',
  'بنود العمل الخاصة بالمشاريع مع التسلسل الهرمي',
  'work_items',
  ARRAY['id', 'code', 'name', 'name_ar', 'description', 'unit_of_measure', 
    'is_active', 'position', 'parent_id', 'project_id', 'org_id', 
    'created_at', 'updated_at']
);

-- Dataset 5: مراكز التكلفة
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'مراكز التكلفة',
  'مراكز التكلفة مع التسلسل الهرمي والميزانيات',
  'cost_centers',
  ARRAY['id', 'code', 'name', 'name_ar', 'description', 'parent_id', 
    'is_active', 'budget', 'org_id', 'created_at', 'updated_at']
);

-- Dataset 6: التصنيفات
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'التصنيفات',
  'تصنيفات المعاملات المالية',
  'classifications',
  ARRAY['id', 'code', 'name', 'name_ar', 'description', 'parent_id', 
    'is_active', 'org_id', 'created_at', 'updated_at']
);

-- Dataset 7: فئات المصروفات
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'فئات المصروفات',
  'فئات المصروفات مع التسلسل الهرمي',
  'expenses_categories',
  ARRAY['id', 'code', 'name', 'name_ar', 'description', 'parent_id', 
    'is_active', 'org_id', 'created_at', 'updated_at']
);

-- Dataset 8: السنوات المالية
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'السنوات المالية',
  'السنوات المالية مع الفترات والحالة',
  'fiscal_years',
  ARRAY['id', 'name_en', 'name_ar', 'start_date', 'end_date', 'status', 
    'is_current', 'org_id', 'created_at', 'updated_at', 'created_by']
);

-- Dataset 9: الفترات المالية
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'الفترات المالية',
  'الفترات المالية ضمن السنوات المالية',
  'fiscal_periods',
  ARRAY['id', 'fiscal_year_id', 'period_number', 'period_code', 'name_en', 'name_ar',
    'start_date', 'end_date', 'status', 'is_current', 'org_id', 
    'created_at', 'updated_at', 'created_by']
);

-- Dataset 10: أرصدة الافتتاح
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'أرصدة الافتتاح',
  'أرصدة الافتتاح للحسابات في بداية السنة المالية',
  'opening_balance_imports',
  ARRAY['id', 'fiscal_year_id', 'account_id', 'debit_amount', 'credit_amount',
    'balance', 'notes', 'org_id', 'created_at', 'updated_at', 'created_by']
);

-- Dataset 11: سطور المعاملات
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'سطور المعاملات',
  'تفاصيل سطور المعاملات المالية',
  'transaction_line_items',
  ARRAY['id', 'transaction_id', 'line_number', 'account_id', 'debit_amount', 
    'credit_amount', 'description', 'project_id', 'work_item_id', 
    'cost_center_id', 'classification_id', 'expenses_category_id',
    'org_id', 'created_at', 'updated_at']
);

-- Dataset 12: المستخدمين
INSERT INTO report_datasets (name, description, table_name, allowed_fields) VALUES (
  'المستخدمين',
  'ملفات المستخدمين والصلاحيات',
  'profiles',
  ARRAY['id', 'email', 'full_name', 'avatar_url', 'role', 
    'is_active', 'created_at', 'updated_at']
);

-- ============================================================================
-- Enable RLS (optional - disable if causing issues)
-- ============================================================================
-- ALTER TABLE report_datasets ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read for authenticated" ON report_datasets FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- Verification
-- ============================================================================
SELECT name, table_name, array_length(allowed_fields, 1) as field_count 
FROM report_datasets 
ORDER BY name;
