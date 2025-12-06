-- ============================================================================
-- ENTERPRISE REPORTS SETUP - Using SELECT * for flexibility
-- Run this single file in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Enriched Views (using SELECT * to avoid column mismatches)
-- ============================================================================

-- 1.1 transactions_enriched - المعاملات المالية الشاملة
DROP VIEW IF EXISTS transactions_enriched CASCADE;

CREATE OR REPLACE VIEW transactions_enriched AS
SELECT 
  t.*,
  
  -- Project (enriched)
  p.code AS project_code,
  p.name AS project_name,
  p.name_ar AS project_name_ar,
  
  -- Created By User (enriched)
  pr.full_name_ar AS created_by_name,
  pr.email AS created_by_email,
  
  -- Organization
  o.name AS organization_name

FROM transactions t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN user_profiles pr ON t.created_by = pr.id
LEFT JOIN organizations o ON t.org_id = o.id;

-- 1.2 transaction_lines_enriched - القيود التفصيلية الشاملة
DROP VIEW IF EXISTS transaction_lines_enriched CASCADE;

CREATE OR REPLACE VIEW transaction_lines_enriched AS
SELECT 
  tl.*,
  
  -- Parent Transaction (enriched)
  t.entry_number AS transaction_entry_number,
  t.entry_date AS transaction_date,
  t.description AS transaction_description,
  t.is_posted AS transaction_is_posted,
  t.status AS transaction_status,
  t.approval_status AS transaction_approval_status,
  
  -- Account (enriched)
  a.code AS account_code,
  a.name AS account_name,
  a.name_ar AS account_name_ar,
  a.category AS account_category,
  
  -- Project (enriched)
  p.code AS project_code,
  p.name AS project_name,
  p.name_ar AS project_name_ar,
  
  -- Classification (enriched)
  cl.code AS classification_code,
  cl.name AS classification_name,
  
  -- Work Item (enriched)
  wi.code AS work_item_code,
  wi.name AS work_item_name,
  wi.name_ar AS work_item_name_ar,
  
  -- Analysis Work Item (enriched)
  awi.code AS analysis_work_item_code,
  awi.name AS analysis_work_item_name,
  awi.name_ar AS analysis_work_item_name_ar,
  
  -- Cost Center (enriched)
  cc.code AS cost_center_code,
  cc.name AS cost_center_name,
  cc.name_ar AS cost_center_name_ar

FROM transaction_lines tl
LEFT JOIN transactions t ON tl.transaction_id = t.id
LEFT JOIN accounts a ON tl.account_id = a.id
LEFT JOIN projects p ON tl.project_id = p.id
LEFT JOIN transaction_classifications cl ON tl.classification_id = cl.id
LEFT JOIN work_items wi ON tl.work_item_id = wi.id
LEFT JOIN work_items awi ON tl.analysis_work_item_id = awi.id
LEFT JOIN cost_centers cc ON tl.cost_center_id = cc.id;

-- 1.3 transaction_line_items_enriched - تحليل سطور المعاملات الشامل
DROP VIEW IF EXISTS transaction_line_items_enriched CASCADE;

CREATE OR REPLACE VIEW transaction_line_items_enriched AS
SELECT 
  tli.*,
  
  -- Parent Transaction Line (enriched)
  tl.line_no AS parent_line_no,
  tl.debit_amount AS parent_debit_amount,
  tl.credit_amount AS parent_credit_amount,
  tl.description AS parent_line_description,
  tl.line_status AS parent_line_status,
  tl.account_id,
  
  -- Parent Transaction (enriched via transaction_line)
  t.id AS transaction_id,
  t.entry_number AS transaction_entry_number,
  t.entry_date AS transaction_date,
  t.description AS transaction_description,
  t.is_posted AS transaction_is_posted,
  t.status AS transaction_status,
  
  -- Account (from parent line)
  a.code AS account_code,
  a.name AS account_name,
  a.name_ar AS account_name_ar,
  
  -- Work Item (enriched)
  wi.code AS work_item_code,
  wi.name AS work_item_name,
  wi.name_ar AS work_item_name_ar,
  
  -- Analysis Work Item (enriched)
  awi.code AS analysis_work_item_code,
  awi.name AS analysis_work_item_name,
  awi.name_ar AS analysis_work_item_name_ar

FROM transaction_line_items tli
LEFT JOIN transaction_lines tl ON tli.transaction_line_id = tl.id
LEFT JOIN transactions t ON tl.transaction_id = t.id
LEFT JOIN accounts a ON tl.account_id = a.id
LEFT JOIN work_items wi ON tli.work_item_id = wi.id
LEFT JOIN work_items awi ON tli.analysis_work_item_id = awi.id;

-- Grant permissions on views
GRANT SELECT ON transactions_enriched TO authenticated;
GRANT SELECT ON transaction_lines_enriched TO authenticated;
GRANT SELECT ON transaction_line_items_enriched TO authenticated;

-- ============================================================================
-- STEP 2: Create Dynamic Functions
-- ============================================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS refresh_all_dataset_fields();
DROP FUNCTION IF EXISTS register_dataset(TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS get_table_fields_dynamic(TEXT);
DROP FUNCTION IF EXISTS get_arabic_label(TEXT);

-- 2.1 Arabic Labels Function
CREATE OR REPLACE FUNCTION get_arabic_label(p_column_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_column_name
    WHEN 'id' THEN 'المعرف'
    WHEN 'code' THEN 'الكود'
    WHEN 'name' THEN 'الاسم'
    WHEN 'name_ar' THEN 'الاسم بالعربية'
    WHEN 'description' THEN 'الوصف'
    WHEN 'description_ar' THEN 'الوصف بالعربية'
    WHEN 'status' THEN 'الحالة'
    WHEN 'is_active' THEN 'نشط'
    WHEN 'created_at' THEN 'تاريخ الإنشاء'
    WHEN 'updated_at' THEN 'تاريخ التحديث'
    WHEN 'created_by' THEN 'أنشأه'
    WHEN 'created_by_name' THEN 'اسم المنشئ'
    WHEN 'created_by_email' THEN 'بريد المنشئ'
    WHEN 'org_id' THEN 'معرف المؤسسة'
    WHEN 'organization_name' THEN 'اسم المؤسسة'
    WHEN 'entry_number' THEN 'رقم القيد'
    WHEN 'entry_date' THEN 'تاريخ القيد'
    WHEN 'amount' THEN 'المبلغ'
    WHEN 'debit_amount' THEN 'المبلغ المدين'
    WHEN 'credit_amount' THEN 'المبلغ الدائن'
    WHEN 'total_debits' THEN 'إجمالي المدين'
    WHEN 'total_credits' THEN 'إجمالي الدائن'
    WHEN 'is_posted' THEN 'مرحل'
    WHEN 'posted_at' THEN 'تاريخ الترحيل'
    WHEN 'reference_number' THEN 'رقم المرجع'
    WHEN 'notes' THEN 'الملاحظات'
    WHEN 'notes_ar' THEN 'الملاحظات بالعربية'
    WHEN 'transaction_id' THEN 'معرف المعاملة'
    WHEN 'line_no' THEN 'رقم السطر'
    WHEN 'line_number' THEN 'رقم السطر'
    WHEN 'transaction_entry_number' THEN 'رقم قيد المعاملة'
    WHEN 'transaction_date' THEN 'تاريخ المعاملة'
    WHEN 'transaction_description' THEN 'وصف المعاملة'
    WHEN 'transaction_is_posted' THEN 'المعاملة مرحلة'
    WHEN 'transaction_status' THEN 'حالة المعاملة'
    WHEN 'transaction_approval_status' THEN 'حالة اعتماد المعاملة'
    WHEN 'account_id' THEN 'معرف الحساب'
    WHEN 'account_code' THEN 'كود الحساب'
    WHEN 'account_name' THEN 'اسم الحساب'
    WHEN 'account_name_ar' THEN 'اسم الحساب بالعربية'
    WHEN 'account_category' THEN 'فئة الحساب'
    WHEN 'category' THEN 'الفئة'
    WHEN 'project_id' THEN 'معرف المشروع'
    WHEN 'project_code' THEN 'كود المشروع'
    WHEN 'project_name' THEN 'اسم المشروع'
    WHEN 'project_name_ar' THEN 'اسم المشروع بالعربية'
    WHEN 'work_item_id' THEN 'معرف بند العمل'
    WHEN 'work_item_code' THEN 'كود بند العمل'
    WHEN 'work_item_name' THEN 'اسم بند العمل'
    WHEN 'work_item_name_ar' THEN 'اسم بند العمل بالعربية'
    WHEN 'analysis_work_item_id' THEN 'معرف بند التحليل'
    WHEN 'analysis_work_item_code' THEN 'كود بند التحليل'
    WHEN 'analysis_work_item_name' THEN 'اسم بند التحليل'
    WHEN 'analysis_work_item_name_ar' THEN 'اسم بند التحليل بالعربية'
    WHEN 'cost_center_id' THEN 'معرف مركز التكلفة'
    WHEN 'cost_center_code' THEN 'كود مركز التكلفة'
    WHEN 'cost_center_name' THEN 'اسم مركز التكلفة'
    WHEN 'cost_center_name_ar' THEN 'اسم مركز التكلفة بالعربية'
    WHEN 'classification_id' THEN 'معرف التصنيف'
    WHEN 'classification_code' THEN 'كود التصنيف'
    WHEN 'classification_name' THEN 'اسم التصنيف'
    WHEN 'classification_name_ar' THEN 'اسم التصنيف بالعربية'
    WHEN 'approval_status' THEN 'حالة الاعتماد'
    WHEN 'line_status' THEN 'حالة السطر'
    WHEN 'quantity' THEN 'الكمية'
    WHEN 'percentage' THEN 'النسبة المئوية'
    WHEN 'unit_price' THEN 'سعر الوحدة'
    WHEN 'unit_of_measure' THEN 'وحدة القياس'
    WHEN 'total_amount' THEN 'المبلغ الإجمالي'
    WHEN 'item_code' THEN 'كود الصنف'
    WHEN 'item_name' THEN 'اسم الصنف'
    WHEN 'item_name_ar' THEN 'اسم الصنف بالعربية'
    WHEN 'email' THEN 'البريد الإلكتروني'
    WHEN 'full_name' THEN 'الاسم الكامل'
    WHEN 'fiscal_year_id' THEN 'معرف السنة المالية'
    WHEN 'period_number' THEN 'رقم الفترة'
    WHEN 'is_current' THEN 'الحالية'
    WHEN 'start_date' THEN 'تاريخ البداية'
    WHEN 'end_date' THEN 'تاريخ النهاية'
    WHEN 'budget' THEN 'الميزانية'
    ELSE NULL
  END;
END;
$$;

-- 2.2 Dynamic Field Discovery
CREATE OR REPLACE FUNCTION get_table_fields_dynamic(p_table_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fields JSONB := '[]'::jsonb;
  v_schema TEXT := 'public';
  v_table TEXT;
BEGIN
  IF p_table_name LIKE '%.%' THEN
    v_schema := split_part(p_table_name, '.', 1);
    v_table := split_part(p_table_name, '.', 2);
  ELSE
    v_table := p_table_name;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'key', column_name,
      'name', column_name,
      'label', COALESCE(get_arabic_label(column_name), column_name),
      'type', CASE 
        WHEN data_type IN ('integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision') THEN 'number'
        WHEN data_type IN ('date', 'timestamp', 'timestamp with time zone', 'timestamp without time zone') THEN 'date'
        WHEN data_type = 'boolean' THEN 'boolean'
        ELSE 'text'
      END,
      'filterable', true,
      'sortable', true,
      'groupable', column_name LIKE '%_code' OR column_name LIKE '%_name%' OR column_name = 'status' OR column_name = 'category' OR column_name LIKE '%_status'
    )
    ORDER BY ordinal_position
  )
  INTO v_fields
  FROM information_schema.columns
  WHERE table_schema = v_schema AND table_name = v_table;

  RETURN COALESCE(v_fields, '[]'::jsonb);
END;
$$;

-- 2.3 Register Dataset Function
CREATE OR REPLACE FUNCTION register_dataset(
  p_name TEXT,
  p_description TEXT,
  p_table_name TEXT,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dataset_id UUID;
  v_fields JSONB;
  v_allowed_fields TEXT[];
BEGIN
  v_fields := get_table_fields_dynamic(p_table_name);
  
  SELECT array_agg(f->>'key') INTO v_allowed_fields
  FROM jsonb_array_elements(v_fields) AS f;
  
  INSERT INTO report_datasets (name, description, table_name, allowed_fields, fields, is_active)
  VALUES (p_name, p_description, p_table_name, COALESCE(v_allowed_fields, ARRAY[]::TEXT[]), v_fields, p_is_active)
  ON CONFLICT (table_name) 
  DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    allowed_fields = EXCLUDED.allowed_fields,
    fields = EXCLUDED.fields,
    is_active = EXCLUDED.is_active,
    updated_at = NOW()
  RETURNING id INTO v_dataset_id;
  
  RETURN v_dataset_id;
END;
$$;

-- 2.4 Refresh All Datasets
CREATE OR REPLACE FUNCTION refresh_all_dataset_fields()
RETURNS TABLE(dataset_name TEXT, table_name TEXT, field_count INT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dataset RECORD;
  v_fields JSONB;
  v_allowed_fields TEXT[];
BEGIN
  FOR v_dataset IN SELECT id, name, rd.table_name as tbl FROM report_datasets rd WHERE rd.table_name IS NOT NULL
  LOOP
    BEGIN
      v_fields := get_table_fields_dynamic(v_dataset.tbl);
      SELECT array_agg(f->>'key') INTO v_allowed_fields FROM jsonb_array_elements(v_fields) AS f;
      
      UPDATE report_datasets
      SET fields = v_fields, allowed_fields = COALESCE(v_allowed_fields, ARRAY[]::TEXT[]), updated_at = NOW()
      WHERE id = v_dataset.id;
      
      dataset_name := v_dataset.name;
      table_name := v_dataset.tbl;
      field_count := jsonb_array_length(v_fields);
      status := 'OK';
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      dataset_name := v_dataset.name;
      table_name := v_dataset.tbl;
      field_count := 0;
      status := 'ERROR: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- Add unique constraint if not exists
DO $$
BEGIN
  ALTER TABLE report_datasets ADD CONSTRAINT report_datasets_table_name_key UNIQUE (table_name);
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_arabic_label(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_fields_dynamic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION register_dataset(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_all_dataset_fields() TO authenticated;

-- ============================================================================
-- STEP 3: Seed All Datasets (Dynamic)
-- ============================================================================
DELETE FROM report_datasets;

-- Enriched views (RECOMMENDED for reports)
SELECT register_dataset('المعاملات المالية الشاملة', 'جميع المعاملات مع أسماء المشاريع والمستخدمين', 'transactions_enriched');
SELECT register_dataset('القيود التفصيلية الشاملة', 'القيود المحاسبية مع أسماء الحسابات والمشاريع ومراكز التكلفة', 'transaction_lines_enriched');
SELECT register_dataset('تحليل سطور المعاملات الشامل', 'تحليل سطور المعاملات مع أسماء بنود العمل', 'transaction_line_items_enriched');

-- Raw tables
SELECT register_dataset('المعاملات', 'المعاملات المالية الأساسية', 'transactions');
SELECT register_dataset('القيود التفصيلية', 'القيود المحاسبية (بيانات خام)', 'transaction_lines');
SELECT register_dataset('تحليل سطور المعاملات', 'تحليل سطور المعاملات (بيانات خام)', 'transaction_line_items');

-- Other datasets
SELECT register_dataset('الحسابات', 'دليل الحسابات', 'accounts');
SELECT register_dataset('بنود العمل', 'بنود العمل', 'work_items');
SELECT register_dataset('التصنيفات', 'تصنيفات المعاملات', 'transaction_classifications');
SELECT register_dataset('المشاريع', 'قائمة المشاريع', 'projects');
SELECT register_dataset('الفترات المالية', 'الفترات المالية', 'fiscal_periods');
SELECT register_dataset('المستخدمين', 'بيانات المستخدمين', 'user_profiles');
SELECT register_dataset('مراكز التكلفة', 'مراكز التكلفة', 'cost_centers');
SELECT register_dataset('السنوات المالية', 'السنوات المالية', 'fiscal_years');
SELECT register_dataset('أرصدة الافتتاح', 'أرصدة الافتتاح', 'opening_balance_imports');

-- ============================================================================
-- STEP 4: Verify Results
-- ============================================================================
SELECT name, table_name, jsonb_array_length(fields) as field_count, is_active
FROM report_datasets
ORDER BY name;
