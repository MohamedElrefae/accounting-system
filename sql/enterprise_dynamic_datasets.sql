-- ============================================================================
-- Enterprise Dynamic Dataset System
-- Fully dynamic - reads columns from actual database schema
-- No hardcoded column lists - automatically adapts to schema changes
-- ============================================================================

-- ============================================================================
-- 1. Enhanced Arabic Labels Function (Extended)
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
    WHEN 'transaction_entry_number' THEN 'رقم قيد المعاملة'
    WHEN 'transaction_date' THEN 'تاريخ المعاملة'
    WHEN 'transaction_description' THEN 'وصف المعاملة'
    WHEN 'transaction_is_posted' THEN 'المعاملة مرحلة'
    WHEN 'transaction_status' THEN 'حالة المعاملة'
    
    -- Account fields (enriched)
    WHEN 'debit_account_id' THEN 'معرف الحساب المدين'
    WHEN 'debit_account_code' THEN 'كود الحساب المدين'
    WHEN 'debit_account_name' THEN 'اسم الحساب المدين'
    WHEN 'debit_account_name_ar' THEN 'اسم الحساب المدين بالعربية'
    WHEN 'debit_account_category' THEN 'فئة الحساب المدين'
    WHEN 'credit_account_id' THEN 'معرف الحساب الدائن'
    WHEN 'credit_account_code' THEN 'كود الحساب الدائن'
    WHEN 'credit_account_name' THEN 'اسم الحساب الدائن'
    WHEN 'credit_account_name_ar' THEN 'اسم الحساب الدائن بالعربية'
    WHEN 'credit_account_category' THEN 'فئة الحساب الدائن'
    WHEN 'account_id' THEN 'معرف الحساب'
    WHEN 'account_code' THEN 'كود الحساب'
    WHEN 'account_name' THEN 'اسم الحساب'
    WHEN 'account_name_ar' THEN 'اسم الحساب بالعربية'
    WHEN 'account_category' THEN 'فئة الحساب'
    WHEN 'category' THEN 'الفئة'
    WHEN 'normal_balance' THEN 'الرصيد الطبيعي'
    WHEN 'level' THEN 'المستوى'
    WHEN 'parent_id' THEN 'معرف الأب'
    WHEN 'path' THEN 'المسار'
    WHEN 'allow_transactions' THEN 'يسمح بالمعاملات'
    WHEN 'is_postable' THEN 'قابل للترحيل'
    WHEN 'is_standard' THEN 'قياسي'
    
    -- Project fields (enriched)
    WHEN 'project_id' THEN 'معرف المشروع'
    WHEN 'project_code' THEN 'كود المشروع'
    WHEN 'project_name' THEN 'اسم المشروع'
    WHEN 'project_name_ar' THEN 'اسم المشروع بالعربية'
    WHEN 'start_date' THEN 'تاريخ البداية'
    WHEN 'end_date' THEN 'تاريخ النهاية'
    WHEN 'budget' THEN 'الميزانية'
    
    -- Work item fields (enriched)
    WHEN 'work_item_id' THEN 'معرف بند العمل'
    WHEN 'work_item_code' THEN 'كود بند العمل'
    WHEN 'work_item_name' THEN 'اسم بند العمل'
    WHEN 'work_item_name_ar' THEN 'اسم بند العمل بالعربية'
    WHEN 'unit_of_measure' THEN 'وحدة القياس'
    WHEN 'position' THEN 'الترتيب'
    
    -- Cost center fields (enriched)
    WHEN 'cost_center_id' THEN 'معرف مركز التكلفة'
    WHEN 'cost_center_code' THEN 'كود مركز التكلفة'
    WHEN 'cost_center_name' THEN 'اسم مركز التكلفة'
    WHEN 'cost_center_name_ar' THEN 'اسم مركز التكلفة بالعربية'
    
    -- Classification fields (enriched)
    WHEN 'classification_id' THEN 'معرف التصنيف'
    WHEN 'classification_code' THEN 'كود التصنيف'
    WHEN 'classification_name' THEN 'اسم التصنيف'
    WHEN 'classification_name_ar' THEN 'اسم التصنيف بالعربية'
    
    -- Expenses category fields (enriched)
    WHEN 'expenses_category_id' THEN 'معرف فئة المصروفات'
    WHEN 'expenses_category_code' THEN 'كود فئة المصروفات'
    WHEN 'expenses_category_name' THEN 'اسم فئة المصروفات'
    WHEN 'expenses_category_name_ar' THEN 'اسم فئة المصروفات بالعربية'
    
    -- Organization fields
    WHEN 'organization_id' THEN 'معرف المؤسسة'
    WHEN 'organization_name' THEN 'اسم المؤسسة'
    
    -- User fields (enriched)
    WHEN 'created_by_name' THEN 'اسم المنشئ'
    WHEN 'created_by_email' THEN 'بريد المنشئ'
    WHEN 'email' THEN 'البريد الإلكتروني'
    WHEN 'full_name' THEN 'الاسم الكامل'
    WHEN 'avatar_url' THEN 'صورة الملف الشخصي'
    WHEN 'role' THEN 'الدور'
    WHEN 'user_id' THEN 'معرف المستخدم'
    
    -- Fiscal fields
    WHEN 'fiscal_year_id' THEN 'معرف السنة المالية'
    WHEN 'period_number' THEN 'رقم الفترة'
    WHEN 'period_code' THEN 'كود الفترة'
    WHEN 'is_current' THEN 'الحالية'
    
    ELSE NULL
  END;
END;
$$;

-- ============================================================================
-- 2. Dynamic Field Discovery Function (reads from actual schema)
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

  -- Query information_schema to get column info dynamically
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', column_name,
      'name', column_name,
      'label', COALESCE(get_arabic_label(column_name), column_name),
      'type', CASE 
        WHEN data_type IN ('integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision') THEN 'number'
        WHEN data_type IN ('date', 'timestamp', 'timestamp with time zone', 'timestamp without time zone') THEN 'date'
        WHEN data_type = 'boolean' THEN 'boolean'
        WHEN data_type = 'uuid' THEN 'uuid'
        ELSE 'text'
      END,
      'data_type', data_type,
      'filterable', true,
      'sortable', true,
      'groupable', CASE 
        WHEN data_type IN ('text', 'character varying', 'boolean', 'date') THEN true
        WHEN column_name LIKE '%_code' OR column_name LIKE '%_name%' OR column_name = 'status' THEN true
        ELSE false
      END,
      'is_id', column_name = 'id' OR column_name LIKE '%_id'
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
-- 3. Auto-Register Dataset Function
-- Registers a dataset and auto-discovers its fields
-- ============================================================================
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
  -- Get fields dynamically from the table schema
  v_fields := get_table_fields_dynamic(p_table_name);
  
  -- Extract field names for allowed_fields array
  SELECT array_agg(f->>'key')
  INTO v_allowed_fields
  FROM jsonb_array_elements(v_fields) AS f;
  
  -- Insert or update the dataset
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

-- ============================================================================
-- 4. Refresh All Datasets Function (re-reads schema for all)
-- ============================================================================
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
  FOR v_dataset IN 
    SELECT id, name, table_name as tbl
    FROM report_datasets
    WHERE table_name IS NOT NULL
  LOOP
    BEGIN
      -- Get fresh fields from schema
      v_fields := get_table_fields_dynamic(v_dataset.tbl);
      
      -- Extract field names
      SELECT array_agg(f->>'key')
      INTO v_allowed_fields
      FROM jsonb_array_elements(v_fields) AS f;
      
      -- Update the dataset
      UPDATE report_datasets
      SET fields = v_fields,
          allowed_fields = COALESCE(v_allowed_fields, ARRAY[]::TEXT[]),
          updated_at = NOW()
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

-- ============================================================================
-- 5. Seed All Enterprise Datasets (Dynamic Registration)
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_enterprise_datasets()
RETURNS TABLE(dataset_name TEXT, table_name TEXT, field_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing datasets
  DELETE FROM report_datasets;
  
  -- Register all datasets dynamically
  -- The fields will be auto-discovered from the actual table/view schema
  
  -- 1. Enriched Transactions (RECOMMENDED)
  PERFORM register_dataset(
    'المعاملات المالية الشاملة',
    'جميع المعاملات المالية مع أسماء الحسابات والمشاريع وبنود العمل ومراكز التكلفة',
    'transactions_enriched'
  );
  
  -- 2. Basic Transactions
  PERFORM register_dataset(
    'المعاملات',
    'المعاملات المالية الأساسية',
    'transactions'
  );
  
  -- 3. Enriched Transaction Lines (RECOMMENDED)
  PERFORM register_dataset(
    'القيود التفصيلية الشاملة',
    'القيود المحاسبية مع أسماء الحسابات والمشاريع ومراكز التكلفة',
    'transaction_lines_enriched'
  );
  
  -- 4. Enriched Transaction Line Items (RECOMMENDED)
  PERFORM register_dataset(
    'تحليل سطور المعاملات الشامل',
    'تحليل سطور المعاملات مع أسماء الحسابات والمشاريع ومراكز التكلفة',
    'transaction_line_items_enriched'
  );
  
  -- 5. Raw Transaction Lines
  PERFORM register_dataset(
    'القيود التفصيلية',
    'القيود المحاسبية التفصيلية (بيانات خام)',
    'transaction_lines'
  );
  
  -- 6. Raw Transaction Line Items
  PERFORM register_dataset(
    'تحليل سطور المعاملات',
    'تحليل سطور المعاملات (بيانات خام)',
    'transaction_line_items'
  );
  
  -- 7. Accounts
  PERFORM register_dataset(
    'الحسابات',
    'دليل الحسابات مع التسلسل الهرمي',
    'accounts'
  );
  
  -- 8. Work Items
  PERFORM register_dataset(
    'بنود العمل',
    'بنود العمل الخاصة بالمشاريع مع التسلسل الهرمي',
    'work_items'
  );
  
  -- 9. Classifications
  PERFORM register_dataset(
    'التصنيفات',
    'تصنيفات المعاملات المالية',
    'classifications'
  );
  
  -- 10. Projects
  PERFORM register_dataset(
    'المشاريع',
    'قائمة المشاريع مع تفاصيل الميزانية والحالة',
    'projects'
  );
  
  -- 11. Fiscal Periods
  PERFORM register_dataset(
    'الفترات المالية',
    'الفترات المالية للسنوات المالية',
    'fiscal_periods'
  );
  
  -- 12. Profiles/Users
  PERFORM register_dataset(
    'المستخدمين',
    'بيانات المستخدمين والملفات الشخصية',
    'profiles'
  );
  
  -- 13. Cost Centers
  PERFORM register_dataset(
    'مراكز التكلفة',
    'مراكز التكلفة للمحاسبة التحليلية',
    'cost_centers'
  );
  
  -- 14. Expenses Categories
  PERFORM register_dataset(
    'فئات المصروفات',
    'فئات وتصنيفات المصروفات',
    'expenses_categories'
  );
  
  -- 15. Fiscal Years
  PERFORM register_dataset(
    'السنوات المالية',
    'السنوات المالية وحالاتها',
    'fiscal_years'
  );
  
  -- 16. Opening Balance Imports
  PERFORM register_dataset(
    'أرصدة الافتتاح',
    'سجلات استيراد أرصدة الافتتاح',
    'opening_balance_imports'
  );
  
  -- Return results
  RETURN QUERY
  SELECT 
    rd.name::TEXT,
    rd.table_name::TEXT,
    jsonb_array_length(rd.fields)::INT
  FROM report_datasets rd
  ORDER BY rd.name;
END;
$$;

-- ============================================================================
-- 6. Add unique constraint on table_name if not exists
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'report_datasets_table_name_key'
  ) THEN
    ALTER TABLE report_datasets ADD CONSTRAINT report_datasets_table_name_key UNIQUE (table_name);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Constraint might already exist or table structure different
  NULL;
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_arabic_label(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_fields_dynamic(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION register_dataset(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_all_dataset_fields() TO authenticated;
GRANT EXECUTE ON FUNCTION seed_enterprise_datasets() TO authenticated;

-- ============================================================================
-- USAGE:
-- 1. First run: SELECT * FROM seed_enterprise_datasets();
-- 2. To refresh after schema changes: SELECT * FROM refresh_all_dataset_fields();
-- 3. To add a new dataset: SELECT register_dataset('اسم', 'وصف', 'table_name');
-- ============================================================================
