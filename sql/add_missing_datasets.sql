-- ============================================================================
-- Add Missing Datasets: المعاملات, القيود التفصيلية, تحليل سطور المعاملات
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Check existing datasets first
SELECT name, table_name FROM report_datasets ORDER BY name;

-- Add المعاملات (transactions) if not exists
INSERT INTO report_datasets (name, description, table_name, allowed_fields, is_active)
SELECT 
  'المعاملات', 
  'المعاملات المالية الأساسية', 
  'transactions', 
  ARRAY['id', 'entry_number', 'entry_date', 'description', 'amount', 'debit_account_id', 'credit_account_id', 'project_id', 'is_posted', 'status', 'classification_id', 'expenses_category_id', 'work_item_id', 'cost_center_id', 'created_at', 'updated_at', 'notes', 'reference_number', 'source_document', 'org_id', 'created_by'], 
  true
WHERE NOT EXISTS (
  SELECT 1 FROM report_datasets WHERE table_name = 'transactions'
);

-- Add القيود التفصيلية (transaction_lines) if not exists
INSERT INTO report_datasets (name, description, table_name, allowed_fields, is_active)
SELECT 
  'القيود التفصيلية', 
  'القيود المحاسبية التفصيلية لكل معاملة', 
  'transaction_lines', 
  ARRAY['id', 'transaction_id', 'line_number', 'account_id', 'debit_amount', 'credit_amount', 'description', 'work_item_id', 'cost_center_id', 'classification_id', 'expenses_category_id', 'project_id', 'status', 'created_at', 'updated_at', 'org_id'], 
  true
WHERE NOT EXISTS (
  SELECT 1 FROM report_datasets WHERE table_name = 'transaction_lines'
);

-- Add تحليل سطور المعاملات (transaction_line_items) if not exists
INSERT INTO report_datasets (name, description, table_name, allowed_fields, is_active)
SELECT 
  'تحليل سطور المعاملات', 
  'تحليل وتفاصيل سطور المعاملات المالية', 
  'transaction_line_items', 
  ARRAY['id', 'transaction_id', 'line_number', 'account_id', 'debit_amount', 'credit_amount', 'description', 'work_item_id', 'cost_center_id', 'classification_id', 'expenses_category_id', 'project_id', 'status', 'created_at', 'updated_at', 'org_id'], 
  true
WHERE NOT EXISTS (
  SELECT 1 FROM report_datasets WHERE table_name = 'transaction_line_items'
);

-- Refresh fields from actual table schemas
SELECT * FROM refresh_all_dataset_fields();

-- Verify final results
SELECT name, table_name, array_length(allowed_fields, 1) as field_count, is_active
FROM report_datasets
ORDER BY name;
