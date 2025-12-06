-- ============================================================================
-- Dynamic Dataset Fields - Reads schema from actual tables/views
-- This function automatically discovers fields from the database schema
-- ============================================================================

-- Ensure fields column exists
ALTER TABLE report_datasets ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- Function to get fields dynamically from table/view schema
-- ============================================================================
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
  -- Handle schema.table format
  IF p_table_name LIKE '%.%' THEN
    v_schema := split_part(p_table_name, '.', 1);
    v_table := split_part(p_table_name, '.', 2);
  ELSE
    v_table := p_table_name;
  END IF;

  -- Query information_schema to get column info
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
      'groupable', CASE 
        WHEN data_type IN ('text', 'character varying', 'boolean', 'date') THEN true
        ELSE false
      END
    )
    ORDER BY ordinal_position
  )
  INTO v_fields
  FROM information_schema.columns
  WHERE table_schema = v_schema
    AND table_name = v_table;

  RETURN COALESCE(v_fields, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- Helper function for Arabic labels (can be extended)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_arabic_label(p_column_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_column_name
    -- Common fields
    WHEN 'id' THEN 'المعرف'
    WHEN 'code' THEN 'الكود'
    WHEN 'name' THEN 'الاسم'
    WHEN 'name_ar' THEN 'الاسم بالعربية'
    WHEN 'name_en' THEN 'الاسم بالإنجليزية'
    WHEN 'description' THEN 'الوصف'
    WHEN 'description_ar' THEN 'الوصف بالعربية'
    WHEN 'status' THEN 'الحالة'
    WHEN 'is_active' THEN 'نشط'
    WHEN 'created_at' THEN 'تاريخ الإنشاء'
    WHEN 'updated_at' THEN 'تاريخ التحديث'
    WHEN 'created_by' THEN 'أنشأه'
    WHEN 'org_id' THEN 'معرف المؤسسة'
    
    -- Transaction fields
    WHEN 'entry_number' THEN 'رقم القيد'
    WHEN 'entry_date' THEN 'تاريخ القيد'
    WHEN 'amount' THEN 'المبلغ'
    WHEN 'debit_amount' THEN 'المبلغ المدين'
    WHEN 'credit_amount' THEN 'المبلغ الدائن'
    WHEN 'balance' THEN 'الرصيد'
    WHEN 'is_posted' THEN 'مرحل'
    WHEN 'reference_number' THEN 'رقم المرجع'
    WHEN 'source_document' THEN 'المستند المصدر'
    WHEN 'notes' THEN 'الملاحظات'
    WHEN 'transaction_id' THEN 'معرف المعاملة'
    WHEN 'line_number' THEN 'رقم السطر'
    
    -- Account fields
    WHEN 'debit_account_id' THEN 'معرف الحساب المدين'
    WHEN 'debit_account_code' THEN 'كود الحساب المدين'
    WHEN 'debit_account_name' THEN 'اسم الحساب المدين'
    WHEN 'credit_account_id' THEN 'معرف الحساب الدائن'
    WHEN 'credit_account_code' THEN 'كود الحساب الدائن'
    WHEN 'credit_account_name' THEN 'اسم الحساب الدائن'
    WHEN 'account_id' THEN 'معرف الحساب'
    WHEN 'account_code' THEN 'كود الحساب'
    WHEN 'account_name' THEN 'اسم الحساب'
    WHEN 'category' THEN 'الفئة'
    WHEN 'normal_balance' THEN 'الرصيد الطبيعي'
    WHEN 'level' THEN 'المستوى'
    WHEN 'parent_id' THEN 'معرف الأب'
    WHEN 'path' THEN 'المسار'
    WHEN 'allow_transactions' THEN 'يسمح بالمعاملات'
    WHEN 'is_postable' THEN 'قابل للترحيل'
    WHEN 'is_standard' THEN 'قياسي'
    
    -- Project fields
    WHEN 'project_id' THEN 'معرف المشروع'
    WHEN 'project_code' THEN 'كود المشروع'
    WHEN 'project_name' THEN 'اسم المشروع'
    WHEN 'start_date' THEN 'تاريخ البداية'
    WHEN 'end_date' THEN 'تاريخ النهاية'
    WHEN 'budget' THEN 'الميزانية'
    
    -- Work item fields
    WHEN 'work_item_id' THEN 'معرف بند العمل'
    WHEN 'work_item_code' THEN 'كود بند العمل'
    WHEN 'work_item_name' THEN 'اسم بند العمل'
    WHEN 'unit_of_measure' THEN 'وحدة القياس'
    WHEN 'position' THEN 'الترتيب'
    
    -- Cost center fields
    WHEN 'cost_center_id' THEN 'معرف مركز التكلفة'
    WHEN 'cost_center_code' THEN 'كود مركز التكلفة'
    WHEN 'cost_center_name' THEN 'اسم مركز التكلفة'
    
    -- Classification fields
    WHEN 'classification_id' THEN 'معرف التصنيف'
    WHEN 'classification_code' THEN 'كود التصنيف'
    WHEN 'classification_name' THEN 'اسم التصنيف'
    
    -- Expenses category fields
    WHEN 'expenses_category_id' THEN 'معرف فئة المصروفات'
    WHEN 'expenses_category_code' THEN 'كود فئة المصروفات'
    WHEN 'expenses_category_name' THEN 'اسم فئة المصروفات'
    
    -- Organization fields
    WHEN 'organization_id' THEN 'معرف المؤسسة'
    WHEN 'organization_name' THEN 'اسم المؤسسة'
    
    -- Fiscal fields
    WHEN 'fiscal_year_id' THEN 'معرف السنة المالية'
    WHEN 'period_number' THEN 'رقم الفترة'
    WHEN 'period_code' THEN 'كود الفترة'
    WHEN 'is_current' THEN 'الحالية'
    
    -- User fields
    WHEN 'email' THEN 'البريد الإلكتروني'
    WHEN 'full_name' THEN 'الاسم الكامل'
    WHEN 'avatar_url' THEN 'صورة الملف الشخصي'
    WHEN 'role' THEN 'الدور'
    WHEN 'user_id' THEN 'معرف المستخدم'
    
    ELSE NULL
  END;
END;
$$;

-- ============================================================================
-- Function to refresh fields for a specific dataset from its table schema
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_dataset_fields(p_dataset_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name TEXT;
  v_fields JSONB;
BEGIN
  -- Get the table name for this dataset
  SELECT table_name INTO v_table_name
  FROM report_datasets
  WHERE id = p_dataset_id;
  
  IF v_table_name IS NULL THEN
    RAISE EXCEPTION 'Dataset not found or has no table_name';
  END IF;
  
  -- Get fields dynamically from the table schema
  v_fields := get_table_fields_dynamic(v_table_name);
  
  -- Update the dataset with the new fields
  UPDATE report_datasets
  SET fields = v_fields,
      updated_at = NOW()
  WHERE id = p_dataset_id;
END;
$$;

-- ============================================================================
-- Function to refresh ALL dataset fields from their table schemas
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_all_dataset_fields()
RETURNS TABLE(dataset_name TEXT, field_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dataset RECORD;
BEGIN
  FOR v_dataset IN 
    SELECT id, name, table_name as tbl
    FROM report_datasets
    WHERE table_name IS NOT NULL
  LOOP
    BEGIN
      PERFORM refresh_dataset_fields(v_dataset.id);
      dataset_name := v_dataset.name;
      SELECT jsonb_array_length(fields) INTO field_count
      FROM report_datasets WHERE id = v_dataset.id;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      dataset_name := v_dataset.name || ' (ERROR: ' || SQLERRM || ')';
      field_count := 0;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- ============================================================================
-- Updated get_dataset_fields that uses dynamic schema reading
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
  v_fields JSONB;
  v_table_name TEXT;
BEGIN
  -- First try to get cached fields from the dataset
  SELECT rd.fields, rd.table_name
  INTO v_fields, v_table_name
  FROM report_datasets rd
  WHERE rd.id = p_dataset_id;
  
  -- If no cached fields or empty, get them dynamically
  IF v_fields IS NULL OR v_fields = '[]'::jsonb OR jsonb_array_length(v_fields) = 0 THEN
    IF v_table_name IS NOT NULL THEN
      v_fields := get_table_fields_dynamic(v_table_name);
      
      -- Cache the fields for future use
      UPDATE report_datasets
      SET fields = v_fields
      WHERE id = p_dataset_id;
    END IF;
  END IF;
  
  -- Return the fields
  IF v_fields IS NOT NULL AND jsonb_array_length(v_fields) > 0 THEN
    RETURN QUERY
    SELECT 
      (f->>'key')::TEXT,
      (f->>'label')::TEXT,
      (f->>'type')::TEXT,
      COALESCE((f->>'filterable')::BOOLEAN, true),
      COALESCE((f->>'sortable')::BOOLEAN, true),
      COALESCE((f->>'groupable')::BOOLEAN, false)
    FROM jsonb_array_elements(v_fields) AS f;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_table_fields_dynamic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_arabic_label(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dataset_fields(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_all_dataset_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION get_dataset_fields(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dataset_fields(UUID) TO anon;

-- ============================================================================
-- Run initial refresh for all datasets
-- ============================================================================
SELECT * FROM refresh_all_dataset_fields();
