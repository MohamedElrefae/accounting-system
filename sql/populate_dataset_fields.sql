-- ============================================================================
-- Populate report_datasets with proper fields JSONB
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First ensure the fields column exists
ALTER TABLE report_datasets ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb;

-- Update المعاملات المالية (Transactions)
UPDATE report_datasets
SET fields = '[
  {"key": "entry_number", "name": "entry_number", "label": "رقم القيد", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "entry_date", "name": "entry_date", "label": "تاريخ القيد", "type": "date", "filterable": true, "sortable": true, "groupable": true},
  {"key": "description", "name": "description", "label": "الوصف", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "amount", "name": "amount", "label": "المبلغ", "type": "number", "filterable": true, "sortable": true, "groupable": false},
  {"key": "debit_account_code", "name": "debit_account_code", "label": "كود الحساب المدين", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "debit_account_name", "name": "debit_account_name", "label": "اسم الحساب المدين", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "credit_account_code", "name": "credit_account_code", "label": "كود الحساب الدائن", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "credit_account_name", "name": "credit_account_name", "label": "اسم الحساب الدائن", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "project_name", "name": "project_name", "label": "اسم المشروع", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "work_item_code", "name": "work_item_code", "label": "كود بند العمل", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "work_item_name", "name": "work_item_name", "label": "اسم بند العمل", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "cost_center_code", "name": "cost_center_code", "label": "كود مركز التكلفة", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "cost_center_name", "name": "cost_center_name", "label": "اسم مركز التكلفة", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "classification_code", "name": "classification_code", "label": "كود التصنيف", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "classification_name", "name": "classification_name", "label": "اسم التصنيف", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "expenses_category_code", "name": "expenses_category_code", "label": "كود فئة المصروفات", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "expenses_category_name", "name": "expenses_category_name", "label": "اسم فئة المصروفات", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "organization_name", "name": "organization_name", "label": "اسم المؤسسة", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "is_posted", "name": "is_posted", "label": "مرحل", "type": "boolean", "filterable": true, "sortable": true, "groupable": true},
  {"key": "reference_number", "name": "reference_number", "label": "رقم المرجع", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "source_document", "name": "source_document", "label": "المستند المصدر", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "notes", "name": "notes", "label": "الملاحظات", "type": "text", "filterable": true, "sortable": false, "groupable": false},
  {"key": "created_at", "name": "created_at", "label": "تاريخ الإنشاء", "type": "date", "filterable": true, "sortable": true, "groupable": true}
]'::jsonb
WHERE name = 'المعاملات المالية';

-- Update الحسابات (Accounts)
UPDATE report_datasets
SET fields = '[
  {"key": "code", "name": "code", "label": "كود الحساب", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "name", "name": "name", "label": "اسم الحساب", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "name_ar", "name": "name_ar", "label": "الاسم بالعربية", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "level", "name": "level", "label": "المستوى", "type": "number", "filterable": true, "sortable": true, "groupable": true},
  {"key": "category", "name": "category", "label": "الفئة", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "status", "name": "status", "label": "الحالة", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "allow_transactions", "name": "allow_transactions", "label": "يسمح بالمعاملات", "type": "boolean", "filterable": true, "sortable": true, "groupable": true},
  {"key": "is_postable", "name": "is_postable", "label": "قابل للترحيل", "type": "boolean", "filterable": true, "sortable": true, "groupable": true},
  {"key": "normal_balance", "name": "normal_balance", "label": "الرصيد الطبيعي", "type": "text", "filterable": true, "sortable": true, "groupable": true}
]'::jsonb
WHERE name = 'الحسابات';

-- Update المشاريع (Projects)
UPDATE report_datasets
SET fields = '[
  {"key": "code", "name": "code", "label": "كود المشروع", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "name", "name": "name", "label": "اسم المشروع", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "name_ar", "name": "name_ar", "label": "الاسم بالعربية", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "status", "name": "status", "label": "حالة المشروع", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "start_date", "name": "start_date", "label": "تاريخ البداية", "type": "date", "filterable": true, "sortable": true, "groupable": true},
  {"key": "end_date", "name": "end_date", "label": "تاريخ النهاية", "type": "date", "filterable": true, "sortable": true, "groupable": true},
  {"key": "budget", "name": "budget", "label": "مبلغ الميزانية", "type": "number", "filterable": true, "sortable": true, "groupable": false},
  {"key": "created_at", "name": "created_at", "label": "تاريخ الإنشاء", "type": "date", "filterable": true, "sortable": true, "groupable": true}
]'::jsonb
WHERE name = 'المشاريع';

-- Update بنود العمل (Work Items)
UPDATE report_datasets
SET fields = '[
  {"key": "code", "name": "code", "label": "كود بند العمل", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "name", "name": "name", "label": "اسم بند العمل", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "name_ar", "name": "name_ar", "label": "الاسم بالعربية", "type": "text", "filterable": true, "sortable": true, "groupable": false},
  {"key": "description", "name": "description", "label": "الوصف", "type": "text", "filterable": true, "sortable": false, "groupable": false},
  {"key": "unit_of_measure", "name": "unit_of_measure", "label": "وحدة القياس", "type": "text", "filterable": true, "sortable": true, "groupable": true},
  {"key": "is_active", "name": "is_active", "label": "نشط", "type": "boolean", "filterable": true, "sortable": true, "groupable": true},
  {"key": "position", "name": "position", "label": "الترتيب", "type": "number", "filterable": true, "sortable": true, "groupable": false}
]'::jsonb
WHERE name = 'بنود العمل';

-- For any datasets that still have empty fields, generate from allowed_fields
UPDATE report_datasets
SET fields = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', field,
      'name', field,
      'label', field,
      'type', 'text',
      'filterable', true,
      'sortable', true,
      'groupable', true
    )
  )
  FROM unnest(allowed_fields) AS field
)
WHERE (fields IS NULL OR fields = '[]'::jsonb OR jsonb_array_length(fields) = 0)
  AND allowed_fields IS NOT NULL 
  AND array_length(allowed_fields, 1) > 0;

-- Verify the results
SELECT name, jsonb_array_length(fields) as field_count, array_length(allowed_fields, 1) as allowed_count
FROM report_datasets
ORDER BY name;
