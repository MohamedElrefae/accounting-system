-- ============================================================================
-- Seed All Report Datasets
-- Run this in Supabase SQL Editor to add all available datasets
-- ============================================================================

-- First, clear existing datasets to avoid duplicates
DELETE FROM report_datasets;

-- Insert all datasets with proper Arabic names and table mappings
INSERT INTO report_datasets (name, description, table_name, allowed_fields, is_active) VALUES

-- 1. المعاملات المالية الشاملة (Enriched Transactions View) - RECOMMENDED
('المعاملات المالية الشاملة', 'جميع المعاملات المالية مع أسماء الحسابات والمشاريع وبنود العمل ومراكز التكلفة', 'transactions_enriched', 
ARRAY['id', 'entry_number', 'entry_date', 'description', 'amount', 'notes', 'reference_number', 'source_document', 'is_posted', 'status', 'org_id', 'created_at', 'updated_at', 'created_by', 'debit_account_id', 'debit_account_code', 'debit_account_name', 'debit_account_name_ar', 'debit_account_category', 'credit_account_id', 'credit_account_code', 'credit_account_name', 'credit_account_name_ar', 'credit_account_category', 'project_id', 'project_code', 'project_name', 'project_name_ar', 'classification_id', 'classification_code', 'classification_name', 'classification_name_ar', 'expenses_category_id', 'expenses_category_code', 'expenses_category_name', 'expenses_category_name_ar', 'work_item_id', 'work_item_code', 'work_item_name', 'work_item_name_ar', 'cost_center_id', 'cost_center_code', 'cost_center_name', 'cost_center_name_ar', 'created_by_name', 'created_by_email', 'organization_name'], 
true),

-- 2. المعاملات (Basic Transactions)
('المعاملات', 'المعاملات المالية الأساسية', 'transactions', 
ARRAY['id', 'entry_number', 'entry_date', 'description', 'amount', 'debit_account_id', 'credit_account_id', 'project_id', 'is_posted', 'status', 'classification_id', 'expenses_category_id', 'work_item_id', 'cost_center_id', 'created_at', 'updated_at', 'notes', 'reference_number', 'source_document', 'org_id', 'created_by'], 
true),

-- 3. القيود التفصيلية الشاملة (Enriched Transaction Lines) - RECOMMENDED
('القيود التفصيلية الشاملة', 'القيود المحاسبية مع أسماء الحسابات والمشاريع ومراكز التكلفة', 'transaction_lines_enriched', 
ARRAY['id', 'transaction_id', 'line_number', 'debit_amount', 'credit_amount', 'description', 'status', 'org_id', 'created_at', 'updated_at', 'transaction_entry_number', 'transaction_date', 'transaction_description', 'transaction_is_posted', 'transaction_status', 'account_id', 'account_code', 'account_name', 'account_name_ar', 'account_category', 'project_id', 'project_code', 'project_name', 'project_name_ar', 'classification_id', 'classification_code', 'classification_name', 'classification_name_ar', 'expenses_category_id', 'expenses_category_code', 'expenses_category_name', 'expenses_category_name_ar', 'work_item_id', 'work_item_code', 'work_item_name', 'work_item_name_ar', 'cost_center_id', 'cost_center_code', 'cost_center_name', 'cost_center_name_ar'], 
true),

-- 4. تحليل سطور المعاملات الشامل (Enriched Transaction Line Items) - RECOMMENDED
('تحليل سطور المعاملات الشامل', 'تحليل سطور المعاملات مع أسماء الحسابات والمشاريع ومراكز التكلفة', 'transaction_line_items_enriched', 
ARRAY['id', 'transaction_id', 'line_number', 'debit_amount', 'credit_amount', 'description', 'status', 'org_id', 'created_at', 'updated_at', 'transaction_entry_number', 'transaction_date', 'transaction_description', 'transaction_is_posted', 'transaction_status', 'account_id', 'account_code', 'account_name', 'account_name_ar', 'account_category', 'project_id', 'project_code', 'project_name', 'project_name_ar', 'classification_id', 'classification_code', 'classification_name', 'classification_name_ar', 'expenses_category_id', 'expenses_category_code', 'expenses_category_name', 'expenses_category_name_ar', 'work_item_id', 'work_item_code', 'work_item_name', 'work_item_name_ar', 'cost_center_id', 'cost_center_code', 'cost_center_name', 'cost_center_name_ar'], 
true),

-- 5. القيود التفصيلية (Raw Transaction Lines)
('القيود التفصيلية', 'القيود المحاسبية التفصيلية (بيانات خام)', 'transaction_lines', 
ARRAY['id', 'transaction_id', 'line_number', 'account_id', 'debit_amount', 'credit_amount', 'description', 'work_item_id', 'cost_center_id', 'classification_id', 'expenses_category_id', 'project_id', 'status', 'created_at', 'updated_at', 'org_id'], 
true),

-- 6. تحليل سطور المعاملات (Raw Transaction Line Items)
('تحليل سطور المعاملات', 'تحليل سطور المعاملات (بيانات خام)', 'transaction_line_items', 
ARRAY['id', 'transaction_id', 'line_number', 'account_id', 'debit_amount', 'credit_amount', 'description', 'work_item_id', 'cost_center_id', 'classification_id', 'expenses_category_id', 'project_id', 'status', 'created_at', 'updated_at', 'org_id'], 
true),

-- 7. الحسابات (Accounts)
('الحسابات', 'دليل الحسابات مع التسلسل الهرمي', 'accounts', 
ARRAY['id', 'code', 'name', 'name_ar', 'category', 'normal_balance', 'parent_id', 'level', 'path', 'status', 'description', 'description_ar', 'is_standard', 'allow_transactions', 'is_postable', 'org_id', 'created_at', 'updated_at'], 
true),

-- 8. بنود العمل (Work Items)
('بنود العمل', 'بنود العمل الخاصة بالمشاريع مع التسلسل الهرمي', 'work_items', 
ARRAY['id', 'code', 'name', 'name_ar', 'description', 'unit_of_measure', 'is_active', 'position', 'parent_id', 'project_id', 'org_id', 'created_at', 'updated_at'], 
true),

-- 9. التصنيفات (Classifications)
('التصنيفات', 'تصنيفات المعاملات المالية', 'classifications', 
ARRAY['id', 'code', 'name', 'name_ar', 'description', 'is_active', 'parent_id', 'level', 'org_id', 'created_at', 'updated_at'], 
true),

-- 10. المشاريع (Projects)
('المشاريع', 'قائمة المشاريع مع تفاصيل الميزانية والحالة', 'projects', 
ARRAY['id', 'code', 'name', 'name_ar', 'description', 'status', 'start_date', 'end_date', 'budget', 'org_id', 'created_at', 'updated_at', 'created_by'], 
true),

-- 11. الفترات المالية (Fiscal Periods)
('الفترات المالية', 'الفترات المالية للسنوات المالية', 'fiscal_periods', 
ARRAY['id', 'fiscal_year_id', 'period_number', 'name', 'start_date', 'end_date', 'status', 'is_current', 'org_id', 'created_at', 'updated_at'], 
true),

-- 12. المستخدمين (Profiles/Users)
('المستخدمين', 'بيانات المستخدمين والملفات الشخصية', 'profiles', 
ARRAY['id', 'email', 'full_name', 'avatar_url', 'role', 'is_active', 'created_at', 'updated_at'], 
true),

-- 13. مراكز التكلفة (Cost Centers)
('مراكز التكلفة', 'مراكز التكلفة للمحاسبة التحليلية', 'cost_centers', 
ARRAY['id', 'code', 'name', 'name_ar', 'description', 'is_active', 'parent_id', 'level', 'org_id', 'created_at', 'updated_at'], 
true),

-- 14. فئات المصروفات (Expenses Categories)
('فئات المصروفات', 'فئات وتصنيفات المصروفات', 'expenses_categories', 
ARRAY['id', 'code', 'name', 'name_ar', 'description', 'is_active', 'parent_id', 'level', 'org_id', 'created_at', 'updated_at'], 
true),

-- 15. السنوات المالية (Fiscal Years)
('السنوات المالية', 'السنوات المالية وحالاتها', 'fiscal_years', 
ARRAY['id', 'name', 'start_date', 'end_date', 'status', 'is_current', 'org_id', 'created_at', 'updated_at'], 
true),

-- 16. أرصدة الافتتاح (Opening Balance Imports)
('أرصدة الافتتاح', 'سجلات استيراد أرصدة الافتتاح', 'opening_balance_imports', 
ARRAY['id', 'fiscal_year_id', 'account_id', 'debit_amount', 'credit_amount', 'description', 'status', 'org_id', 'created_at', 'updated_at'], 
true);

-- Now refresh fields from table schemas using the dynamic function
SELECT * FROM refresh_all_dataset_fields();

-- Verify the results
SELECT name, table_name, array_length(allowed_fields, 1) as field_count, is_active
FROM report_datasets
ORDER BY name;
