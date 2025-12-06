-- ============================================================================
-- Complete Reports System Fix
-- Purpose: Fix all report-related tables and functions
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. Add missing 'key' column to report_datasets if needed
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_datasets' AND column_name = 'key'
  ) THEN
    ALTER TABLE report_datasets ADD COLUMN key TEXT;
    
    -- Generate keys from names (slugified)
    UPDATE report_datasets 
    SET key = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '_'), 'ا', 'a'), 'ي', 'y'))
    WHERE key IS NULL;
    
    -- Make key unique
    ALTER TABLE report_datasets ADD CONSTRAINT report_datasets_key_unique UNIQUE (key);
  END IF;
END $$;

-- ============================================================================
-- 2. Add missing 'fields' column (JSONB) if needed
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_datasets' AND column_name = 'fields'
  ) THEN
    ALTER TABLE report_datasets ADD COLUMN fields JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- 3. Populate fields from allowed_fields
-- ============================================================================
UPDATE report_datasets
SET fields = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', field,
      'label', field,
      'type', 'text',
      'filterable', true,
      'sortable', true,
      'groupable', true
    )
  )
  FROM unnest(allowed_fields) AS field
)
WHERE fields IS NULL OR fields = '[]'::jsonb;

-- ============================================================================
-- 4. Create or replace get_dataset_fields function
-- ============================================================================
CREATE OR REPLACE FUNCTION get_dataset_fields(p_dataset_id UUID)
RETURNS TABLE (
  key TEXT,
  label TEXT,
  type TEXT,
  filterable BOOLEAN,
  sortable BOOLEAN,
  groupable BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allowed_fields TEXT[];
BEGIN
  -- Get allowed fields from dataset
  SELECT allowed_fields INTO v_allowed_fields
  FROM report_datasets 
  WHERE id = p_dataset_id;
  
  IF v_allowed_fields IS NULL THEN
    RAISE EXCEPTION 'Dataset not found';
  END IF;
  
  -- Return fields with Arabic labels
  RETURN QUERY
  SELECT 
    f::TEXT AS key,
    COALESCE(
      CASE f
        WHEN 'id' THEN 'المعرف'
        WHEN 'entry_number' THEN 'رقم القيد'
        WHEN 'entry_date' THEN 'تاريخ القيد'
        WHEN 'description' THEN 'الوصف'
        WHEN 'amount' THEN 'المبلغ'
        WHEN 'code' THEN 'الكود'
        WHEN 'name' THEN 'الاسم'
        WHEN 'name_ar' THEN 'الاسم بالعربية'
        WHEN 'name_en' THEN 'الاسم بالإنجليزية'
        WHEN 'status' THEN 'الحالة'
        WHEN 'is_active' THEN 'نشط'
        WHEN 'is_posted' THEN 'مرحل'
        WHEN 'is_current' THEN 'الحالية'
        WHEN 'created_at' THEN 'تاريخ الإنشاء'
        WHEN 'updated_at' THEN 'تاريخ التحديث'
        WHEN 'start_date' THEN 'تاريخ البداية'
        WHEN 'end_date' THEN 'تاريخ النهاية'
        WHEN 'budget' THEN 'الميزانية'
        WHEN 'debit_amount' THEN 'المبلغ المدين'
        WHEN 'credit_amount' THEN 'المبلغ الدائن'
        WHEN 'balance' THEN 'الرصيد'
        WHEN 'level' THEN 'المستوى'
        WHEN 'category' THEN 'الفئة'
        WHEN 'normal_balance' THEN 'الرصيد الطبيعي'
        WHEN 'project_name' THEN 'اسم المشروع'
        WHEN 'project_id' THEN 'معرف المشروع'
        WHEN 'organization_name' THEN 'اسم المؤسسة'
        WHEN 'org_id' THEN 'معرف المؤسسة'
        WHEN 'debit_account_id' THEN 'معرف الحساب المدين'
        WHEN 'debit_account_code' THEN 'كود الحساب المدين'
        WHEN 'debit_account_name' THEN 'اسم الحساب المدين'
        WHEN 'credit_account_id' THEN 'معرف الحساب الدائن'
        WHEN 'credit_account_code' THEN 'كود الحساب الدائن'
        WHEN 'credit_account_name' THEN 'اسم الحساب الدائن'
        WHEN 'work_item_id' THEN 'معرف بند العمل'
        WHEN 'work_item_code' THEN 'كود بند العمل'
        WHEN 'work_item_name' THEN 'اسم بند العمل'
        WHEN 'cost_center_id' THEN 'معرف مركز التكلفة'
        WHEN 'cost_center_code' THEN 'كود مركز التكلفة'
        WHEN 'cost_center_name' THEN 'اسم مركز التكلفة'
        WHEN 'classification_id' THEN 'معرف التصنيف'
        WHEN 'classification_code' THEN 'كود التصنيف'
        WHEN 'classification_name' THEN 'اسم التصنيف'
        WHEN 'expenses_category_id' THEN 'معرف فئة المصروفات'
        WHEN 'expenses_category_code' THEN 'كود فئة المصروفات'
        WHEN 'expenses_category_name' THEN 'اسم فئة المصروفات'
        WHEN 'reference_number' THEN 'رقم المرجع'
        WHEN 'source_document' THEN 'المستند المصدر'
        WHEN 'notes' THEN 'الملاحظات'
        WHEN 'unit_of_measure' THEN 'وحدة القياس'
        WHEN 'position' THEN 'الترتيب'
        WHEN 'period_number' THEN 'رقم الفترة'
        WHEN 'period_code' THEN 'كود الفترة'
        WHEN 'fiscal_year_id' THEN 'معرف السنة المالية'
        WHEN 'account_id' THEN 'معرف الحساب'
        WHEN 'transaction_id' THEN 'معرف المعاملة'
        WHEN 'line_number' THEN 'رقم السطر'
        WHEN 'parent_id' THEN 'معرف الأب'
        WHEN 'path' THEN 'المسار'
        WHEN 'email' THEN 'البريد الإلكتروني'
        WHEN 'full_name' THEN 'الاسم الكامل'
        WHEN 'avatar_url' THEN 'صورة الملف الشخصي'
        WHEN 'role' THEN 'الدور'
        WHEN 'allow_transactions' THEN 'يسمح بالمعاملات'
        WHEN 'is_postable' THEN 'قابل للترحيل'
        WHEN 'is_standard' THEN 'قياسي'
        WHEN 'description_ar' THEN 'الوصف بالعربية'
        WHEN 'description_en' THEN 'الوصف بالإنجليزية'
        WHEN 'created_by' THEN 'أنشأه'
        ELSE f
      END,
      f
    )::TEXT AS label,
    'text'::TEXT AS type,
    true AS filterable,
    true AS sortable,
    true AS groupable
  FROM unnest(v_allowed_fields) AS f;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dataset_fields(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dataset_fields(UUID) TO anon;

-- ============================================================================
-- 5. Create report_definitions table if not exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  dataset_id UUID REFERENCES report_datasets(id) ON DELETE CASCADE,
  selected_fields TEXT[] DEFAULT '{}',
  filters JSONB DEFAULT '[]'::jsonb,
  sort_config JSONB DEFAULT NULL,
  group_config JSONB DEFAULT NULL,
  is_public BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_report_definitions_user_id ON report_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_dataset_id ON report_definitions(dataset_id);

-- ============================================================================
-- 6. Disable RLS on report_datasets for simplicity
-- ============================================================================
ALTER TABLE report_datasets DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. Verification queries
-- ============================================================================
SELECT 'report_datasets columns:' AS info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'report_datasets'
ORDER BY ordinal_position;

SELECT 'report_datasets data:' AS info;
SELECT id, name, table_name, array_length(allowed_fields, 1) as field_count
FROM report_datasets
ORDER BY name;

SELECT 'Testing get_dataset_fields:' AS info;
SELECT * FROM get_dataset_fields((SELECT id FROM report_datasets LIMIT 1)) LIMIT 5;
