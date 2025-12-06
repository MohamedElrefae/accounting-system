-- ============================================================================
-- Complete Reports System Fix v3
-- Run these statements ONE BY ONE in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Add 'key' column if missing
-- ============================================================================
ALTER TABLE report_datasets ADD COLUMN IF NOT EXISTS key TEXT;

-- Generate keys from names
UPDATE report_datasets 
SET key = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '_'), 'ا', 'a'), 'ي', 'y'))
WHERE key IS NULL;

-- ============================================================================
-- STEP 2: Add 'fields' column if missing
-- ============================================================================
ALTER TABLE report_datasets ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- STEP 3: Populate fields from allowed_fields (run AFTER step 2)
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
WHERE (fields IS NULL OR fields = '[]'::jsonb)
  AND allowed_fields IS NOT NULL 
  AND array_length(allowed_fields, 1) > 0;

-- ============================================================================
-- STEP 4: Create get_dataset_fields function
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
  SELECT allowed_fields INTO v_allowed_fields
  FROM report_datasets 
  WHERE id = p_dataset_id;
  
  IF v_allowed_fields IS NULL THEN
    RAISE EXCEPTION 'Dataset not found';
  END IF;
  
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
        WHEN 'debit_account_code' THEN 'كود الحساب المدين'
        WHEN 'debit_account_name' THEN 'اسم الحساب المدين'
        WHEN 'credit_account_code' THEN 'كود الحساب الدائن'
        WHEN 'credit_account_name' THEN 'اسم الحساب الدائن'
        WHEN 'work_item_code' THEN 'كود بند العمل'
        WHEN 'work_item_name' THEN 'اسم بند العمل'
        WHEN 'cost_center_code' THEN 'كود مركز التكلفة'
        WHEN 'cost_center_name' THEN 'اسم مركز التكلفة'
        WHEN 'reference_number' THEN 'رقم المرجع'
        WHEN 'notes' THEN 'الملاحظات'
        WHEN 'period_number' THEN 'رقم الفترة'
        WHEN 'email' THEN 'البريد الإلكتروني'
        WHEN 'full_name' THEN 'الاسم الكامل'
        WHEN 'role' THEN 'الدور'
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

GRANT EXECUTE ON FUNCTION get_dataset_fields(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dataset_fields(UUID) TO anon;

-- ============================================================================
-- STEP 5: Create report_definitions table
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

CREATE INDEX IF NOT EXISTS idx_report_definitions_user_id ON report_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_report_definitions_dataset_id ON report_definitions(dataset_id);

-- ============================================================================
-- STEP 6: Disable RLS
-- ============================================================================
ALTER TABLE report_datasets DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Verify
-- ============================================================================
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'report_datasets';
SELECT id, name, array_length(allowed_fields, 1) as field_count FROM report_datasets;
